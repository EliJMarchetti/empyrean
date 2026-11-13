-- Upgrade an existing Empyrean database after 001_campaigns.sql.
begin;

alter table public.characters
  add column claimable boolean not null default false,
  add column npc jsonb,
  add constraint npc_sheet_type check (npc is null or (status = 'draft' and not claimable));

alter table public.invites
  add column character_id uuid references public.characters on delete cascade,
  add column claimed_by uuid references auth.users on delete set null;
create index invites_campaign on public.invites(campaign_id);
create index invites_character on public.invites(character_id);
create index markers_character on public.markers(character_id);
create index markers_campaign on public.markers(campaign_id);

drop policy characters_read on public.characters;
create policy characters_read on public.characters for select to authenticated
using (private.is_member(campaign_id) and (
  private.is_gm(campaign_id) or (npc is null and not claimable and (owner_id = (select auth.uid()) or status = 'active'))
));

create table public.turn_orders (
  campaign_id uuid primary key references public.campaigns on delete cascade,
  entries jsonb not null,
  current_id uuid,
  round integer not null,
  revision integer not null default 1
);
create table public.clocks (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  segments integer not null check (segments between 2 and 12),
  filled integer not null check (filled between 0 and segments),
  visible boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now()
);
create index clocks_campaign on public.clocks(campaign_id);
create table public.table_rolls (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns on delete cascade,
  roller text not null,
  label text not null,
  sides integer not null,
  modifier integer not null,
  dice integer[] not null,
  total integer not null,
  created_at timestamptz not null default clock_timestamp()
);
create index table_rolls_recent on public.table_rolls(campaign_id, created_at desc, id desc);
create table public.campaign_upload_cleanup (
  campaign_id uuid primary key,
  gm_id uuid not null references auth.users on delete cascade,
  paths text[] not null
);
create index campaign_upload_cleanup_gm on public.campaign_upload_cleanup(gm_id);

alter table public.turn_orders enable row level security;
alter table public.clocks enable row level security;
alter table public.table_rolls enable row level security;
alter table public.campaign_upload_cleanup enable row level security;
create policy turn_orders_read on public.turn_orders for select to authenticated using (private.is_member(campaign_id));
create policy clocks_read on public.clocks for select to authenticated
using (private.is_member(campaign_id) and (visible or private.is_gm(campaign_id)));
create policy table_rolls_read on public.table_rolls for select to authenticated using (private.is_member(campaign_id));
create policy campaign_upload_cleanup_read on public.campaign_upload_cleanup for select to authenticated using (gm_id = (select auth.uid()));
revoke all on public.turn_orders, public.clocks, public.table_rolls, public.campaign_upload_cleanup from public, anon, authenticated;
grant select on public.turn_orders, public.clocks, public.table_rolls, public.campaign_upload_cleanup to authenticated;

-- Storage files are removed by the Storage API after the database deletion commits.
create function private.lock_map_upload(cid text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or cid is null or cid !~ '^[a-f0-9-]{36}$' then return false; end if;
  perform 1 from public.campaigns where id::text = cid and gm_id = auth.uid() for key share;
  return found;
end;
$$;
revoke execute on function private.lock_map_upload(text) from public, anon, authenticated;
grant execute on function private.lock_map_upload(text) to authenticated;

create function private.campaign_upload_paths(cid uuid) returns text[]
language plpgsql set search_path = '' as $$
declare paths text[];
begin
  if to_regclass('storage.objects') is null then return array[]::text[]; end if;
  select coalesce(array_agg(name order by name), array[]::text[]) into paths
    from storage.objects where bucket_id = 'campaign-maps' and name like cid::text || '/%';
  return paths;
end;
$$;
revoke execute on function private.campaign_upload_paths(uuid) from public, anon, authenticated;

-- Keep the existing character advancement, map, journal and inventory implementation.
alter function public.app_action(text, jsonb) set schema private;
alter function private.app_action(text, jsonb) rename to legacy_action;
revoke execute on function private.legacy_action(text, jsonb) from public, anon, authenticated;

create or replace function private.log(cid uuid, msg text) returns void
language sql set search_path = '' as $$
  insert into public.activity(campaign_id,actor_name,message)
  select cid, display_name, msg from public.profiles
  where id = auth.uid() and current_setting('empyrean.private_character', true) is distinct from 'on';
$$;

create function private.gm_tools_action(action text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); cid uuid; rid uuid; target uuid; c public.campaigns; ch public.characters;
  inv public.invites; clk public.clocks; turns public.turn_orders; roll public.table_rolls;
  paths text[]; result jsonb; stat jsonb; entry jsonb; entries jsonb; current_id uuid;
  round_number integer; die_count integer; die_sides integer; bonus integer; rolled integer[];
begin
  perform private.ensure(u is not null, 'Sign in first.');
  perform private.ensure(jsonb_typeof(p) = 'object' and octet_length(p::text) <= 1500000, 'Invalid or oversized request.');

  if action = 'delete_campaign' then
    select * into c from public.campaigns where id = (p->>'id')::uuid and gm_id = u for update;
    perform private.ensure(c.id is not null, 'Only the GM can delete this campaign.');
    perform private.ensure(c.revision = (p->>'revision')::integer, 'This campaign changed on another device. Reload it before deleting.');
    paths := private.campaign_upload_paths(c.id);
    if cardinality(paths) > 0 then
      insert into public.campaign_upload_cleanup(campaign_id, gm_id, paths) values (c.id, u, paths);
    end if;
    delete from public.campaigns where id = c.id;
    return null;
  end if;

  if action = 'finish_campaign_cleanup' then
    cid := (p->>'campaign_id')::uuid;
    if cardinality(private.campaign_upload_paths(cid)) = 0 then
      delete from public.campaign_upload_cleanup where campaign_id = cid and gm_id = u;
    end if;
    return null;
  end if;

  if action = 'join_campaign' then
    select campaign_id into cid from public.invites where code = trim(p->>'code');
    perform 1 from public.campaigns where id = cid for share;
    perform private.ensure(found, 'That invitation is invalid, expired, or full.');
    select * into inv from public.invites where code = trim(p->>'code');
    if inv.character_id is not null then
      -- Character ownership and all invites for this sheet share the same lock.
      select * into ch from public.characters where id = inv.character_id for update;
      select * into inv from public.invites where id = inv.id for update;
    else
      select * into inv from public.invites where id = inv.id for update;
    end if;
    if inv.character_id is not null and inv.claimed_by = u and ch.owner_id = u then
      return jsonb_build_object('campaign_id', cid, 'character_id', ch.id);
    end if;
    perform private.ensure(inv.id is not null and not inv.revoked and inv.expires_at > now() and inv.uses < inv.max_uses,
      'That invitation is invalid, expired, or full.');
    if inv.character_id is not null then
      perform private.ensure(ch.claimable and ch.owner_id <> u, 'This character is unavailable to claim from this account.');
    end if;
    insert into public.profiles(id, display_name) values (u, 'Player') on conflict do nothing;
    insert into public.campaign_members(campaign_id, user_id, role, display_name)
      select cid, u, 'player', display_name from public.profiles where id = u on conflict do nothing;
    if found then
      perform private.log(cid, 'Joined the campaign.');
      if inv.character_id is null then update public.invites set uses = uses + 1 where id = inv.id; end if;
    end if;
    if inv.character_id is null then return jsonb_build_object('campaign_id', cid); end if;
    target := u;

  elsif action in ('create_character_invite', 'assign_character', 'delete_character', 'save_character', 'finish_character', 'review_background', 'award', 'spend_sparks') then
    rid := (p->>'id')::uuid;
    select campaign_id into cid from public.characters where id = rid;
    c := private.lock_campaign(cid, action in ('create_character_invite', 'assign_character', 'review_background', 'award'));
    select * into ch from public.characters where id = rid for update;
    perform private.ensure(ch.id is not null, 'Character not found.');
    perform private.ensure(ch.revision = (p->>'revision')::integer, 'This record changed on another device. Reload it before saving.');

    if action = 'delete_character' then
      perform private.ensure(ch.owner_id = u, 'Only the character owner can delete this sheet.');
      delete from public.markers where character_id = ch.id;
      delete from public.characters where id = ch.id;
      return null;
    end if;
    perform private.ensure(ch.npc is null, 'Use the NPC sheet to edit this character.');
    if action in ('create_character_invite', 'assign_character') then
      perform private.ensure(ch.claimable, 'Only an unassigned character can be given to a player.');
      if action = 'create_character_invite' then
        update public.invites set revoked = true where character_id = ch.id and not revoked;
        insert into public.invites(campaign_id, character_id, code, max_uses)
          values (cid, ch.id, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''), 1)
          returning * into inv;
        return to_jsonb(inv);
      end if;
      target := (p->>'owner_id')::uuid;
      perform private.ensure(target <> u and exists (select 1 from public.campaign_members where campaign_id = cid and user_id = target),
        'Choose a player in this campaign.');
    else
      if ch.claimable then perform set_config('empyrean.private_character', 'on', true); end if;
      result := private.legacy_action(action, p);
      if ch.claimable then perform set_config('empyrean.private_character', '', true); end if;
      return result;
    end if;

  elsif action = 'revoke_invite' then
    rid := (p->>'id')::uuid;
    select * into inv from public.invites where id = rid;
    c := private.lock_campaign(inv.campaign_id, true);
    if inv.character_id is not null then perform 1 from public.characters where id = inv.character_id for update; end if;
    update public.invites set revoked = true where id = rid;
    return null;

  elsif action = 'create_pregen' then
    c := private.lock_campaign((p->>'campaign_id')::uuid, true);
    result := private.legacy_action('create_character', p);
    update public.characters set claimable = true, name = trim(p->>'name')
      where id = (result->>'id')::uuid returning * into ch;
    return to_jsonb(ch);

  elsif action = 'save_npc' then
    rid := nullif(p->>'id', '')::uuid;
    if rid is not null then select campaign_id into cid from public.characters where id = rid; end if;
    c := private.lock_campaign(case when rid is null then (p->>'campaign_id')::uuid else cid end, true);
    perform private.ensure(jsonb_typeof(p->'npc') = 'object' and jsonb_typeof(p->'npc'->'stats') = 'array', 'Enter an NPC sheet.');
    perform private.ensure(jsonb_array_length(p->'npc'->'stats') <= 20 and length(coalesce(p->'npc'->>'role', '')) <= 120
      and length(coalesce(p->'npc'->>'description', '')) <= 10000 and length(coalesce(p->'npc'->>'notes', '')) <= 10000,
      'NPC sheet is too large.');
    for stat in select value from jsonb_array_elements(p->'npc'->'stats') loop
      perform private.ensure(jsonb_typeof(stat) = 'object' and jsonb_typeof(stat->'label') = 'string' and jsonb_typeof(stat->'value') = 'string'
        and length(trim(stat->>'label')) between 1 and 60 and length(trim(stat->>'value')) between 1 and 120,
        'Each stat needs a label and value.');
    end loop;
    if rid is null then
      insert into public.characters(campaign_id, owner_id, name, build, npc)
        values (c.id, u, trim(p->>'name'), '{}', p->'npc') returning * into ch;
    else
      select * into ch from public.characters where id = rid for update;
      perform private.ensure(ch.npc is not null, 'NPC not found.');
      perform private.ensure(ch.revision = (p->>'revision')::integer, 'This record changed on another device. Reload it before saving.');
      update public.characters set name = trim(p->>'name'), npc = p->'npc', revision = revision + 1, updated_at = now()
        where id = rid returning * into ch;
    end if;
    return to_jsonb(ch);

  elsif action = 'save_marker' and nullif(p->>'character_id', '') is not null then
    rid := (p->>'character_id')::uuid;
    select campaign_id into cid from public.characters where id = rid;
    c := private.lock_campaign(cid, true);
    select * into ch from public.characters where id = rid for share;
    perform private.ensure(ch.id is not null and ch.owner_id = (p->>'owner_id')::uuid, 'Choose a character belonging to the marker owner.');
    return private.legacy_action(action, p);

  elsif action in ('save_note', 'delete_note') then
    -- Lock campaigns before the note, including when a note changes scope.
    perform 1 from public.campaigns where id in (
      nullif(p->>'campaign_id', '')::uuid,
      (select campaign_id from public.notes where id = nullif(p->>'id', '')::uuid and owner_id = u)
    ) and private.is_member(id) order by id for share;
    return private.legacy_action(action, p);

  elsif action = 'save_turn_order' then
    c := private.lock_campaign((p->>'campaign_id')::uuid, true);
    entries := p->'entries'; current_id := nullif(p->>'current_id', '')::uuid;
    round_number := private.num(p->'round', 'Round', 0, 1000000, true);
    perform private.ensure(jsonb_typeof(entries) = 'array', 'Enter a turn order.');
    perform private.ensure(jsonb_array_length(entries) <= 60, 'A turn order can hold up to 60 entries.');
    for entry in select value from jsonb_array_elements(entries) loop
      perform private.ensure((entry->>'id')::uuid is not null and length(trim(entry->>'name')) between 1 and 120, 'Each turn needs a name.');
      perform private.num(entry->'score', 'Initiative', -9999, 9999, true);
    end loop;
    perform private.ensure(jsonb_array_length(entries) = (select count(distinct (value->>'id')::uuid) from jsonb_array_elements(entries)), 'Turn entries must be distinct.');
    perform private.ensure((current_id is null and round_number = 0) or (round_number > 0 and
      exists (select 1 from jsonb_array_elements(entries) where (value->>'id')::uuid = current_id)), 'Choose a valid current turn.');
    if (p->>'revision')::integer = 0 then
      insert into public.turn_orders(campaign_id, entries, current_id, round) values (c.id, entries, current_id, round_number)
        on conflict do nothing returning * into turns;
    else
      update public.turn_orders set entries = p->'entries', current_id = nullif(p->>'current_id', '')::uuid, round = round_number, revision = revision + 1
        where campaign_id = c.id and revision = (p->>'revision')::integer returning * into turns;
    end if;
    perform private.ensure(turns.campaign_id is not null, 'Turn order changed on another device. Reload it before saving.');
    return to_jsonb(turns);

  elsif action in ('save_clock', 'delete_clock') then
    rid := nullif(p->>'id', '')::uuid;
    if rid is not null then select campaign_id into cid from public.clocks where id = rid; end if;
    c := private.lock_campaign(case when rid is null then (p->>'campaign_id')::uuid else cid end, true);
    if rid is not null then
      select * into clk from public.clocks where id = rid for update;
      perform private.ensure(clk.revision = (p->>'revision')::integer, 'This clock changed on another device. Reload it before saving.');
    end if;
    if action = 'delete_clock' then
      delete from public.clocks where id = rid;
      return null;
    end if;
    if rid is null then
      insert into public.clocks(campaign_id, name, segments, filled, visible)
        values (c.id, trim(p->>'name'), private.num(p->'segments', 'Segments', 2, 12, true), private.num(p->'filled', 'Filled segments', 0, 12, true), coalesce((p->>'visible')::boolean, false))
        returning * into clk;
    else
      update public.clocks set name = trim(p->>'name'), segments = private.num(p->'segments', 'Segments', 2, 12, true),
        filled = private.num(p->'filled', 'Filled segments', 0, 12, true), visible = coalesce((p->>'visible')::boolean, false), revision = revision + 1
        where id = rid returning * into clk;
    end if;
    return to_jsonb(clk);

  elsif action = 'roll_dice' then
    c := private.lock_campaign((p->>'campaign_id')::uuid);
    die_count := private.num(p->'count', 'Dice count', 1, 30, true);
    die_sides := private.num(p->'sides', 'Die sides', 2, 100, true);
    bonus := private.num(p->'modifier', 'Modifier', -999, 999, true);
    -- Serialize pruning within each campaign while allowing other tools to save.
    perform pg_advisory_xact_lock(hashtextextended(c.id::text, 761));
    rolled := array(select floor(random() * die_sides)::integer + 1 from generate_series(1, die_count));
    insert into public.table_rolls(campaign_id, roller, label, sides, modifier, dice, total)
      values (c.id, (select display_name from public.profiles where id = u), left(coalesce(trim(p->>'label'), ''), 120),
        die_sides, bonus, rolled, bonus + (select sum(die) from unnest(rolled) die)) returning * into roll;
    delete from public.table_rolls where id in (
      select id from public.table_rolls where campaign_id = c.id order by created_at desc, id desc offset 30
    );
    return to_jsonb(roll);
  else
    return private.legacy_action(action, p);
  end if;

  -- A claim or a direct assignment transfers the same sheet and all its linked tokens.
  update public.characters set owner_id = target, claimable = false, revision = revision + 1, updated_at = now() where id = ch.id;
  update public.markers set owner_id = target, revision = revision + 1, updated_at = now() where character_id = ch.id;
  update public.invites set revoked = true where character_id = ch.id and id is distinct from inv.id;
  if inv.id is not null then update public.invites set claimed_by = u, uses = 1 where id = inv.id; end if;
  return jsonb_build_object('campaign_id', cid, 'character_id', ch.id);
end;
$$;

revoke execute on function private.gm_tools_action(text, jsonb) from public, anon, authenticated;
grant execute on function private.gm_tools_action(text, jsonb) to authenticated;

create function public.app_action(p_action text, p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$
  select private.gm_tools_action(p_action, p_payload);
$$;
revoke execute on function public.app_action(text, jsonb) from public, anon, authenticated;
grant execute on function public.app_action(text, jsonb) to authenticated;

alter function public.app_snapshot() set schema private;
alter function private.app_snapshot() rename to base_snapshot;
revoke execute on function private.base_snapshot() from public, anon, authenticated;
grant execute on function private.base_snapshot() to authenticated;

create function public.app_snapshot() returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.base_snapshot() || jsonb_build_object(
    'turn_orders', coalesce((select jsonb_agg(t order by t.campaign_id) from public.turn_orders t), '[]'),
    'clocks', coalesce((select jsonb_agg(c order by c.created_at, c.id) from public.clocks c), '[]'),
    'table_rolls', coalesce((select jsonb_agg(r order by r.created_at desc, r.id desc) from public.table_rolls r), '[]'),
    'campaign_upload_cleanup', coalesce((select jsonb_agg(c order by c.campaign_id) from public.campaign_upload_cleanup c), '[]')
  );
$$;
revoke execute on function public.app_snapshot() from public, anon, authenticated;
grant execute on function public.app_snapshot() to authenticated;
commit;
