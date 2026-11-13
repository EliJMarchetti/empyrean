-- Shared catalog and account-based publishing for Designer Studio.
begin;

create table private.game_designers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
revoke all on private.game_designers from public, anon, authenticated;

create table public.official_catalog (
  singleton boolean primary key default true check (singleton),
  catalog jsonb not null default '{"lineages":[],"backgrounds":[],"skills":[],"abilities":[]}',
  revision integer not null default 1,
  updated_at timestamptz not null default now()
);
insert into public.official_catalog default values;
alter table public.official_catalog enable row level security;
create policy official_catalog_read on public.official_catalog for select to authenticated using (true);
revoke all on public.official_catalog from public, anon, authenticated;
grant select on public.official_catalog to authenticated;

create function private.is_game_designer() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.game_designers where user_id = auth.uid());
$$;
revoke execute on function private.is_game_designer() from public, anon, authenticated;
grant execute on function private.is_game_designer() to authenticated;

create function private.catalog_grants(entry jsonb, category text, published jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare kind text;
begin
  foreach kind in array array['skills', 'abilities'] loop
    if entry ? kind and category <> 'skills' and not (category = 'abilities' and kind = 'abilities') then
      entry := jsonb_set(entry, array[kind], coalesce((
        select jsonb_agg(ref.value order by ref.ordinality)
        from jsonb_array_elements(entry->kind) with ordinality ref(value, ordinality)
        where (ref.value #>> '{}') not like 'official-%' or exists (
          select 1 from jsonb_array_elements(published->kind) item where item->>'id' = (ref.value #>> '{}')
        )
      ), '[]'));
    end if;
  end loop;
  return entry;
end;
$$;

create function private.merge_official_catalog(local_catalog jsonb, published jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare merged jsonb := '{}'; category text; entry jsonb; records jsonb;
begin
  foreach category in array array['lineages', 'backgrounds', 'skills', 'abilities'] loop
    records := published->category;
    for entry in select value from jsonb_array_elements(local_catalog->category) loop
      continue when entry->>'id' like 'official-%';
      entry := private.catalog_grants(entry, category, published);
      if category = 'lineages' and entry ? 'variants' then
        entry := jsonb_set(entry, '{variants}', coalesce((
          select jsonb_agg(private.catalog_grants(variant.value, category, published) order by variant.ordinality)
          from jsonb_array_elements(entry->'variants') with ordinality variant(value, ordinality)
        ), '[]'));
      end if;
      records := records || jsonb_build_array(entry);
    end loop;
    merged := jsonb_set(merged, array[category], records);
  end loop;
  return merged;
end;
$$;
revoke execute on function private.catalog_grants(jsonb, text, jsonb), private.merge_official_catalog(jsonb, jsonb) from public, anon, authenticated;

create function private.apply_official_catalog() returns trigger
language plpgsql set search_path = '' as $$
declare published jsonb;
begin
  select catalog into published from public.official_catalog where singleton;
  new.catalog := private.merge_official_catalog(new.catalog, published);
  perform private.validate_catalog(new.catalog);
  return new;
end;
$$;
revoke execute on function private.apply_official_catalog() from public, anon, authenticated;
create trigger apply_official_catalog before insert or update of catalog on public.campaigns
for each row execute function private.apply_official_catalog();

alter function public.app_action(text, jsonb) set schema private;
alter function private.app_action(text, jsonb) rename to campaign_action;
revoke execute on function private.campaign_action(text, jsonb) from public, anon, authenticated;

create function private.designer_action(action text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare published public.official_catalog; category text; entry jsonb; candidate jsonb;
begin
  perform private.ensure(auth.uid() is not null, 'Sign in first.');
  perform private.ensure(jsonb_typeof(p) = 'object' and octet_length(p::text) <= 1500000, 'Invalid or oversized request.');
  if action = 'publish_catalog' then
    perform private.ensure(private.is_game_designer(), 'Only a game designer can publish official content.');
    select * into published from public.official_catalog where singleton for update;
    perform private.ensure(published.revision = (p->>'revision')::integer, 'The official catalog changed on another device. Reload before publishing.');
    candidate := p->'catalog';
    perform private.validate_catalog(candidate);
    foreach category in array array['lineages', 'backgrounds', 'skills', 'abilities'] loop
      for entry in select value from jsonb_array_elements(candidate->category) loop
        perform private.ensure(entry->>'id' like 'official-%', 'Official content needs an official ID.');
      end loop;
    end loop;
    update public.official_catalog set catalog = candidate, revision = revision + 1, updated_at = now()
      where singleton returning * into published;
    -- Keep published entries and references consistent with the same revision across campaigns.
    update public.campaigns c set catalog = private.merge_official_catalog(c.catalog, candidate), revision = c.revision + 1, updated_at = now()
      where c.catalog is distinct from private.merge_official_catalog(c.catalog, candidate);
    return to_jsonb(published);
  end if;
  if action in ('create_campaign', 'update_campaign') then
    select * into published from public.official_catalog where singleton for share;
    if action = 'update_campaign' then
      perform private.validate_catalog(p->'catalog');
      p := jsonb_set(p, '{catalog}', private.merge_official_catalog(p->'catalog', published.catalog));
    end if;
  end if;
  return private.campaign_action(action, p);
end;
$$;
revoke execute on function private.designer_action(text, jsonb) from public, anon, authenticated;
grant execute on function private.designer_action(text, jsonb) to authenticated;

create function public.app_action(p_action text, p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$
  select private.designer_action(p_action, p_payload);
$$;
revoke execute on function public.app_action(text, jsonb) from public, anon, authenticated;
grant execute on function public.app_action(text, jsonb) to authenticated;

alter function public.app_snapshot() set schema private;
alter function private.app_snapshot() rename to campaign_snapshot;
revoke execute on function private.campaign_snapshot() from public, anon, authenticated;
grant execute on function private.campaign_snapshot() to authenticated;

create function public.app_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.campaign_snapshot() || jsonb_build_object(
    'official_catalog', (select to_jsonb(c) from public.official_catalog c where c.singleton),
    'can_design', private.is_game_designer()
  );
$$;
revoke execute on function public.app_snapshot() from public, anon, authenticated;
grant execute on function public.app_snapshot() to authenticated;
commit;
