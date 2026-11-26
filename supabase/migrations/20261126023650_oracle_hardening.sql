-- Follow-up: minimize character context and require meaningful approved descriptions.
begin;
alter table private.awakening_config enable row level security;
alter table public.oracle_valuations add constraint oracle_description_required check(length(trim(description)) between 1 and 2000);

create or replace function public.oracle_ai_context(estimate_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare e public.oracle_estimates;c public.campaigns;ch public.characters;a public.awakenings;refs jsonb;skills jsonb;
begin
  select * into e from public.oracle_estimates where id=estimate_id;
  if e.id is null then raise exception 'Request not found.';end if;
  if e.status<>'proposed' then raise exception 'This request has already been reviewed.';end if;
  select * into c from public.campaigns where id=e.campaign_id;
  if e.character_id is not null then
    select * into ch from public.characters where id=e.character_id;
    select * into a from public.awakenings where character_id=ch.id;
    select coalesce(jsonb_agg(s),'[]') into skills from jsonb_array_elements(coalesce(ch.rules->'catalog'->'skills',c.catalog->'skills','[]')) s where ch.build->'skills' ? (s->>'id');
  end if;
  select coalesce(jsonb_agg((to_jsonb(matches)-'approver_id')||jsonb_build_object('essentia',matches.essentia::text,'lower',matches.lower::text,'upper',matches.upper::text)),'[]') into refs from (
    select v.* from public.oracle_valuations v
    where v.campaign_id=e.campaign_id and v.status='approved' and exists(
      select 1 from regexp_split_to_table(lower(e.request||' '||e.context),'[^a-z0-9]+') w
      where length(w)>=3 and position(w in lower(v.domain||' '||v.description||' '||v.conditions||' '||v.scope||' '||array_to_string(v.tags,' ')))>0
    )
    order by (select count(*) from regexp_split_to_table(lower(e.request||' '||e.context),'[^a-z0-9]+') w where length(w)>=3 and position(w in lower(v.domain||' '||v.description||' '||v.conditions||' '||v.scope||' '||array_to_string(v.tags,' ')))>0) desc,v.approved_at desc limit 12
  ) matches;
  return jsonb_build_object('estimate_id',e.id,'campaign_id',e.campaign_id,'requester_id',e.requester_id,'request',e.request,'context',e.context,
    'campaign_rules',(select rules from public.oracle_rules where campaign_id=c.id),
    'character',case when ch.id is null then null else jsonb_build_object('awakening',to_jsonb(a),'attributes',ch.build->'attributes','skills',ch.build->'skills','skill_definitions',skills) end,
    'precedents',refs);
end;
$$;
commit;
