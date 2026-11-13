begin;

create table private.designer_draft (
  singleton boolean primary key default true check (singleton),
  catalog jsonb not null,
  base_revision integer not null,
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);
revoke all on private.designer_draft from public, anon, authenticated;

create function private.read_designer_draft() returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(d) from private.designer_draft d where singleton and private.is_game_designer();
$$;
revoke execute on function private.read_designer_draft() from public, anon, authenticated;
grant execute on function private.read_designer_draft() to authenticated;

create function private.designer_draft_action(action text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare published public.official_catalog; draft private.designer_draft; candidate jsonb; category text; entry jsonb; result jsonb;
begin
  if action not in ('save_catalog_draft', 'publish_catalog_draft', 'discard_catalog_draft') then
    return private.designer_action(action, p);
  end if;

  perform private.ensure(private.is_game_designer(), 'Only a game designer can change the catalog draft.');
  perform private.ensure(jsonb_typeof(p) = 'object' and octet_length(p::text) <= 1500000, 'Invalid or oversized request.');
  select * into published from public.official_catalog where singleton for update;
  select * into draft from private.designer_draft where singleton;
  perform private.ensure(draft.revision is not distinct from (p->>'draft_revision')::uuid,
    'The draft changed on another device. Reopen Designer Studio before editing.');

  if action = 'discard_catalog_draft' then
    delete from private.designer_draft where singleton;
    return null;
  end if;

  perform private.ensure(published.revision = (p->>'base_revision')::integer and (draft.revision is null or draft.base_revision = published.revision),
    'The published catalog has changed since this draft was created.');

  if action = 'publish_catalog_draft' then
    perform private.ensure(draft.revision is not null, 'Save a draft before publishing.');
    result := private.designer_action('publish_catalog', jsonb_build_object('catalog', draft.catalog, 'revision', published.revision));
    delete from private.designer_draft where singleton;
    return result;
  end if;

  candidate := p->'catalog';
  perform private.validate_catalog(candidate);
  foreach category in array array['lineages', 'backgrounds', 'skills', 'abilities'] loop
    for entry in select value from jsonb_array_elements(candidate->category) loop
      perform private.ensure(entry->>'id' like 'official-%', 'Official content needs an official ID.');
    end loop;
  end loop;
  insert into private.designer_draft(catalog, base_revision) values (candidate, published.revision)
    on conflict (singleton) do update set catalog = excluded.catalog, base_revision = excluded.base_revision,
      revision = gen_random_uuid(), updated_at = now()
    returning * into draft;
  return to_jsonb(draft);
end;
$$;
revoke execute on function private.designer_draft_action(text, jsonb) from public, anon, authenticated;
grant execute on function private.designer_draft_action(text, jsonb) to authenticated;

create or replace function public.app_action(p_action text, p_payload jsonb default '{}') returns jsonb
language sql security invoker set search_path = '' as $$
  select private.designer_draft_action(p_action, p_payload);
$$;
revoke execute on function private.designer_action(text, jsonb) from authenticated;

create or replace function public.app_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select private.campaign_snapshot() || jsonb_build_object(
    'official_catalog', (select to_jsonb(c) from public.official_catalog c where c.singleton),
    'can_design', private.is_game_designer(),
    'designer_draft', private.read_designer_draft()
  );
$$;
commit;
