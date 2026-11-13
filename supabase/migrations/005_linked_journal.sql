begin;

create table public.campaign_settings (
  id uuid primary key default gen_random_uuid(),
  gm_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 120),
  unique(id, gm_id)
);
create index campaign_settings_gm on public.campaign_settings(gm_id);
alter table public.campaigns add column setting_id uuid;
alter table public.campaigns add foreign key (setting_id, gm_id) references public.campaign_settings(id, gm_id);
create index campaigns_setting on public.campaigns(setting_id) where setting_id is not null;

alter table public.campaign_settings enable row level security;
revoke all on public.campaign_settings from public, anon, authenticated;
grant select on public.campaign_settings to authenticated;
create policy settings_read on public.campaign_settings for select to authenticated using (
  gm_id = (select auth.uid()) or exists (
    select 1 from public.campaigns c where c.setting_id = campaign_settings.id and private.is_member(c.id)
  )
);

alter table public.notes
  add column setting_id uuid references public.campaign_settings(id),
  add column author_id uuid references auth.users(id) on delete set null,
  add column share_gm boolean not null default false,
  add column all_players boolean not null default false,
  add column shared_with uuid[] not null default '{}',
  add column world_note boolean not null default false,
  add check (campaign_id is null or setting_id is null),
  add check (not world_note or setting_id is not null);
create index notes_setting on public.notes(setting_id) where setting_id is not null;

update public.notes n set author_id = n.owner_id,
  share_gm = n.audience in ('gm','party') or (n.audience = 'player' and n.recipient_id = c.gm_id),
  all_players = n.audience = 'party',
  shared_with = case when n.audience = 'player' and n.recipient_id <> c.gm_id then array[n.recipient_id] else '{}'::uuid[] end
from public.campaigns c where c.id = n.campaign_id;
update public.notes set author_id = owner_id where campaign_id is null;

create function private.note_journals(owner uuid, campaign uuid, setting uuid, gm_visible boolean, players_visible boolean, recipients uuid[])
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(c.id order by c.id), '{}'::uuid[])
  from public.campaign_members viewer
  join public.campaigns c on c.id = viewer.campaign_id
  join public.campaign_members author on author.campaign_id = c.id and author.user_id = owner
  where viewer.user_id = (select auth.uid()) and (c.id = campaign or c.setting_id = setting)
    and (viewer.user_id = owner or case when viewer.user_id = c.gm_id then gm_visible
      else players_visible or viewer.user_id = any(recipients) end);
$$;
revoke execute on function private.note_journals(uuid,uuid,uuid,boolean,boolean,uuid[]) from public, anon, authenticated;
grant execute on function private.note_journals(uuid,uuid,uuid,boolean,boolean,uuid[]) to authenticated;

drop policy notes_read on public.notes;
create policy notes_read on public.notes for select to authenticated using (
  owner_id = (select auth.uid()) or cardinality(private.note_journals(owner_id,campaign_id,setting_id,share_gm,all_players,shared_with)) > 0
);

create function private.journal_action(action text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); n public.notes; c public.campaigns; s public.campaign_settings;
  nid uuid; context_id uuid; old_campaign uuid; setting uuid; owner uuid; scope text;
  gm_visible boolean; players_visible boolean; is_world boolean; recipients uuid[]; former_recipient uuid;
  setting_name text; legacy_audience text;
begin
  if action not in ('set_campaign_setting', 'save_note', 'delete_note') then
    return private.designer_draft_action(action, p);
  end if;
  perform private.ensure(u is not null, 'Sign in first.');
  perform private.ensure(jsonb_typeof(p) = 'object' and octet_length(p::text) <= 1500000, 'Invalid or oversized request.');

  if action = 'set_campaign_setting' then
    select * into c from public.campaigns where id = (p->>'id')::uuid and gm_id = u for update;
    perform private.ensure(c.id is not null, 'Only the GM can set the campaign setting.');
    perform private.ensure(c.revision = (p->>'revision')::integer, 'This campaign changed on another device. Reload before saving.');
    setting := nullif(p->>'setting_id','')::uuid;
    setting_name := nullif(trim(p->>'setting_name'),'');
    if setting_name is not null then
      insert into public.campaign_settings(gm_id,name) values (u,setting_name) returning * into s;
      setting := s.id;
    elsif setting is not null then
      perform private.ensure(exists(select 1 from public.campaign_settings where id = setting and gm_id = u), 'Choose one of your settings.');
    end if;
    update public.campaigns set setting_id = setting, revision = revision + 1, updated_at = now() where id = c.id returning * into c;
    return to_jsonb(c);
  end if;

  nid := nullif(p->>'id','')::uuid;
  context_id := nullif(p->>'campaign_id','')::uuid;
  scope := coalesce(p->>'scope', case when context_id is null then 'personal' else 'campaign' end);
  if nid is not null then
    select campaign_id into old_campaign from public.notes where id = nid and owner_id = u;
  end if;
  -- Campaign deletion cascades to single-campaign notes, so lock campaigns before notes.
  perform 1 from public.campaigns where id in (old_campaign,context_id) and private.is_member(id) order by id for share;
  if nid is not null then
    select * into n from public.notes where id = nid and owner_id = u for update;
    perform private.ensure(n.id is not null, 'Only the author can edit this note.');
    perform private.ensure(n.revision = (p->>'revision')::integer, 'This note changed on another device. Reload before saving.');
  end if;
  if action = 'delete_note' then
    perform private.ensure(n.id is not null, 'Note not found.');
    delete from public.notes where id = n.id;
    return null;
  end if;
  perform private.ensure(n.setting_id is null or p ? 'scope', 'Reload the journal before editing a setting note.');

  perform private.ensure(scope in ('personal','campaign','setting','world'), 'Choose a valid note scope.');
  if scope <> 'personal' then
    if context_id is not null then
      c := private.lock_campaign(context_id);
    else
      perform private.ensure(n.setting_id is not null and scope = case when n.world_note then 'world' else 'setting' end,
        'Choose a campaign for this note.');
      select * into s from public.campaign_settings where id = n.setting_id;
      c.setting_id := s.id;
      c.gm_id := s.gm_id;
    end if;
  end if;
  if scope in ('setting','world') then
    perform private.ensure(c.setting_id is not null, 'Choose a campaign with a setting.');
    setting := c.setting_id;
  end if;
  is_world := scope = 'world';
  if is_world and c.gm_id <> u then
    perform private.ensure(coalesce((p->>'transfer_to_gm')::boolean,false), 'Confirm that the GM will take ownership of the world note.');
  end if;
  owner := case when is_world then c.gm_id else u end;

  if p ? 'scope' then
    perform private.ensure(jsonb_typeof(coalesce(p->'shared_with','[]')) = 'array', 'Choose valid player recipients.');
    recipients := array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p->'shared_with','[]')) order by value::uuid);
    gm_visible := coalesce((p->>'share_gm')::boolean,false);
    players_visible := coalesce((p->>'all_players')::boolean,false);
  else
    -- Existing clients can still send a single audience while refreshing to the new UI.
    legacy_audience := p->>'audience';
    perform private.ensure(legacy_audience in ('private','party','gm','player') and (context_id is not null or legacy_audience = 'private'), 'Choose a valid note audience.');
    former_recipient := nullif(p->>'recipient_id','')::uuid;
    gm_visible := legacy_audience in ('gm','party') or coalesce(legacy_audience = 'player' and former_recipient = c.gm_id,false);
    players_visible := legacy_audience = 'party';
    recipients := case when legacy_audience = 'player' and former_recipient is distinct from c.gm_id then array[former_recipient] else '{}'::uuid[] end;
  end if;
  if scope = 'personal' then
    gm_visible := false; players_visible := false; recipients := '{}';
  else
    perform private.ensure(context_id is null and recipients <@ n.shared_with or not exists (
      select 1 from unnest(recipients) recipient where not exists (
        select 1 from public.campaign_members player
        join public.campaigns journal on journal.id = player.campaign_id
        join public.campaign_members contributor on contributor.campaign_id = journal.id and contributor.user_id = owner
        where player.user_id = recipient and player.role = 'player'
          and (case when setting is null then journal.id = c.id else journal.setting_id = setting end)
      )
    ), 'Choose players in the linked campaigns.');
  end if;
  if scope <> 'campaign' then context_id := null; end if;
  perform private.ensure(jsonb_typeof(p->'title') = 'string' and jsonb_typeof(p->'body') = 'string', 'Enter a title and note text.');

  if n.id is null then
    insert into public.notes(owner_id,author_id,campaign_id,setting_id,title,body,audience,share_gm,all_players,shared_with,world_note)
      values (owner,u,context_id,setting,trim(p->>'title'),p->>'body','private',gm_visible,players_visible,recipients,is_world) returning * into n;
  else
    update public.notes set owner_id = owner, campaign_id = context_id, setting_id = setting,
      title = trim(p->>'title'), body = p->>'body', audience = 'private', recipient_id = null,
      share_gm = gm_visible, all_players = players_visible, shared_with = recipients, world_note = is_world,
      revision = revision + 1, updated_at = now() where id = n.id returning * into n;
  end if;
  return to_jsonb(n);
end;
$$;
revoke execute on function private.journal_action(text,jsonb) from public, anon, authenticated;
grant execute on function private.journal_action(text,jsonb) to authenticated;

create or replace function public.app_action(p_action text, p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$
  select private.journal_action(p_action, p_payload);
$$;
revoke execute on function private.designer_draft_action(text,jsonb) from authenticated;

alter function public.app_snapshot() set schema private;
alter function private.app_snapshot() rename to workspace_snapshot;
revoke execute on function private.workspace_snapshot() from public, anon, authenticated;
grant execute on function private.workspace_snapshot() to authenticated;

create function public.app_snapshot() returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.workspace_snapshot() || jsonb_build_object(
    'campaign_settings', coalesce((select jsonb_agg(s order by s.name,s.id) from public.campaign_settings s), '[]'),
    'note_journals', coalesce((select jsonb_object_agg(n.id,private.note_journals(n.owner_id,n.campaign_id,n.setting_id,n.share_gm,n.all_players,n.shared_with))
      from public.notes n where n.setting_id is not null), '{}')
  );
$$;
revoke execute on function public.app_snapshot() from public, anon, authenticated;
grant execute on function public.app_snapshot() to authenticated;
commit;
