-- Additive upgrade after 005_linked_journal.sql. Existing builds/catalogs are untouched.
begin;
create table private.awakening_config (version text primary key, cards jsonb not null);
-- Generated from src/v2/awakening.js by scripts/sync-awakening-config.mjs.
-- AWAKENING_CONFIG
insert into private.awakening_config(version,cards) values ('awakening-1','[{"id":"A-hearts","rank":"A","suit":"hearts","kind":"ace","domain":null},{"id":"2-hearts","rank":"2","suit":"hearts","kind":"restricted","domain":"mass"},{"id":"3-hearts","rank":"3","suit":"hearts","kind":"restricted","domain":"energy"},{"id":"4-hearts","rank":"4","suit":"hearts","kind":"restricted","domain":"time"},{"id":"5-hearts","rank":"5","suit":"hearts","kind":"restricted","domain":"space"},{"id":"6-hearts","rank":"6","suit":"hearts","kind":"restricted","domain":"information"},{"id":"7-hearts","rank":"7","suit":"hearts","kind":"restricted","domain":"entropy"},{"id":"8-hearts","rank":"8","suit":"hearts","kind":"restricted","domain":"life"},{"id":"9-hearts","rank":"9","suit":"hearts","kind":"restricted","domain":"chance"},{"id":"10-hearts","rank":"10","suit":"hearts","kind":"unrestricted","domain":"mass"},{"id":"J-hearts","rank":"J","suit":"hearts","kind":"unrestricted","domain":"time"},{"id":"Q-hearts","rank":"Q","suit":"hearts","kind":"unrestricted","domain":"information"},{"id":"K-hearts","rank":"K","suit":"hearts","kind":"unrestricted","domain":"life"},{"id":"A-diamonds","rank":"A","suit":"diamonds","kind":"ace","domain":null},{"id":"2-diamonds","rank":"2","suit":"diamonds","kind":"restricted","domain":"mass"},{"id":"3-diamonds","rank":"3","suit":"diamonds","kind":"restricted","domain":"energy"},{"id":"4-diamonds","rank":"4","suit":"diamonds","kind":"restricted","domain":"time"},{"id":"5-diamonds","rank":"5","suit":"diamonds","kind":"restricted","domain":"space"},{"id":"6-diamonds","rank":"6","suit":"diamonds","kind":"restricted","domain":"information"},{"id":"7-diamonds","rank":"7","suit":"diamonds","kind":"restricted","domain":"entropy"},{"id":"8-diamonds","rank":"8","suit":"diamonds","kind":"restricted","domain":"life"},{"id":"9-diamonds","rank":"9","suit":"diamonds","kind":"restricted","domain":"chance"},{"id":"10-diamonds","rank":"10","suit":"diamonds","kind":"unrestricted","domain":"mass"},{"id":"J-diamonds","rank":"J","suit":"diamonds","kind":"unrestricted","domain":"time"},{"id":"Q-diamonds","rank":"Q","suit":"diamonds","kind":"unrestricted","domain":"information"},{"id":"K-diamonds","rank":"K","suit":"diamonds","kind":"unrestricted","domain":"life"},{"id":"A-clubs","rank":"A","suit":"clubs","kind":"ace","domain":null},{"id":"2-clubs","rank":"2","suit":"clubs","kind":"restricted","domain":"mass"},{"id":"3-clubs","rank":"3","suit":"clubs","kind":"restricted","domain":"energy"},{"id":"4-clubs","rank":"4","suit":"clubs","kind":"restricted","domain":"time"},{"id":"5-clubs","rank":"5","suit":"clubs","kind":"restricted","domain":"space"},{"id":"6-clubs","rank":"6","suit":"clubs","kind":"restricted","domain":"information"},{"id":"7-clubs","rank":"7","suit":"clubs","kind":"restricted","domain":"entropy"},{"id":"8-clubs","rank":"8","suit":"clubs","kind":"restricted","domain":"life"},{"id":"9-clubs","rank":"9","suit":"clubs","kind":"restricted","domain":"chance"},{"id":"10-clubs","rank":"10","suit":"clubs","kind":"unrestricted","domain":"energy"},{"id":"J-clubs","rank":"J","suit":"clubs","kind":"unrestricted","domain":"space"},{"id":"Q-clubs","rank":"Q","suit":"clubs","kind":"unrestricted","domain":"entropy"},{"id":"K-clubs","rank":"K","suit":"clubs","kind":"unrestricted","domain":"chance"},{"id":"A-spades","rank":"A","suit":"spades","kind":"ace","domain":null},{"id":"2-spades","rank":"2","suit":"spades","kind":"restricted","domain":"mass"},{"id":"3-spades","rank":"3","suit":"spades","kind":"restricted","domain":"energy"},{"id":"4-spades","rank":"4","suit":"spades","kind":"restricted","domain":"time"},{"id":"5-spades","rank":"5","suit":"spades","kind":"restricted","domain":"space"},{"id":"6-spades","rank":"6","suit":"spades","kind":"restricted","domain":"information"},{"id":"7-spades","rank":"7","suit":"spades","kind":"restricted","domain":"entropy"},{"id":"8-spades","rank":"8","suit":"spades","kind":"restricted","domain":"life"},{"id":"9-spades","rank":"9","suit":"spades","kind":"restricted","domain":"chance"},{"id":"10-spades","rank":"10","suit":"spades","kind":"unrestricted","domain":"energy"},{"id":"J-spades","rank":"J","suit":"spades","kind":"unrestricted","domain":"space"},{"id":"Q-spades","rank":"Q","suit":"spades","kind":"unrestricted","domain":"entropy"},{"id":"K-spades","rank":"K","suit":"spades","kind":"unrestricted","domain":"chance"},{"id":"red-joker","rank":"joker","suit":"red","kind":"absolute","domain":"everything"},{"id":"black-joker","rank":"joker","suit":"black","kind":"absolute","domain":"nothing"}]'::jsonb);

create table public.awakenings (
  character_id uuid primary key references public.characters on delete cascade,
  campaign_id uuid not null references public.campaigns on delete cascade,
  status text not null default 'drawing' check(status in ('drawing','selected')),
  generation_method text not null default 'cards', ruleset_version text not null,
  input jsonb, output jsonb, selection jsonb,
  created_at timestamptz not null default now()
);
create table public.oracle_rules (
  campaign_id uuid primary key references public.campaigns on delete cascade,
  rules text not null check(length(rules)<=6000), revision integer not null default 1
);
create table public.oracle_estimates (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  requester_id uuid not null references auth.users, character_id uuid references public.characters on delete set null,
  client_id uuid not null, request text not null check(length(trim(request)) between 1 and 6000),
  context text not null default '' check(length(context)<=4000), proposal jsonb,
  provider_status text not null default 'manual' check(provider_status in ('manual','running','ready','failed')),
  provider_error text, model text, estimator_version text, retrieved_ids uuid[] not null default '{}',
  status text not null default 'proposed' check(status in ('proposed','approved','denied','withdrawn')),
  revision integer not null default 1, created_at timestamptz not null default now(),
  provider_started_at timestamptz, provider_attempts integer not null default 0, provider_lease uuid,
  unique(requester_id,client_id)
);
create table public.oracle_reviews (
  id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.campaigns on delete cascade,
  estimate_id uuid references public.oracle_estimates on delete cascade,reviewer_id uuid not null references auth.users,
  decision text not null check(decision in ('approve','deny','clarify')),ruling jsonb,rationale text not null,
  details jsonb not null default '{}',created_at timestamptz not null default now()
);
create table public.oracle_valuations (
  id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.campaigns on delete cascade,
  operation text not null check(operation in ('input','output')),domain text not null,
  description text not null,quantity text,unit text,essentia numeric not null,lower numeric,upper numeric,
  conditions text not null default '',scope text not null default '',scaling text not null default 'none' check(scaling in ('none','linear')),
  tags text[] not null default '{}',benchmark boolean not null default false,rationale text not null,
  approver_id uuid not null references auth.users,approved_at timestamptz not null default now(),
  source_estimate_id uuid references public.oracle_estimates on delete set null,review_id uuid not null references public.oracle_reviews,
  status text not null default 'approved' check(status in ('approved','superseded')),
  supersedes uuid references public.oracle_valuations,
  check(domain in ('mass','energy','time','space','information','entropy','life','chance','everything','nothing')),
  check(essentia>=0 and essentia<1e30 and scale(essentia)<=6),
  check(lower is null or (lower>=0 and lower<=essentia and scale(lower)<=6)),
  check(upper is null or (upper>=essentia and upper<1e30 and scale(upper)<=6))
);
create index awakenings_campaign on public.awakenings(campaign_id);
create index oracle_estimates_campaign on public.oracle_estimates(campaign_id,status,created_at desc);
create index oracle_estimates_requester on public.oracle_estimates(requester_id);
create index oracle_estimates_character on public.oracle_estimates(character_id);
create index oracle_valuations_lookup on public.oracle_valuations(campaign_id,status,domain,operation);
create index oracle_reviews_campaign on public.oracle_reviews(campaign_id,estimate_id);

alter table public.awakenings enable row level security;
alter table public.oracle_rules enable row level security;
alter table public.oracle_estimates enable row level security;
alter table public.oracle_reviews enable row level security;
alter table public.oracle_valuations enable row level security;
create policy awakenings_read on public.awakenings for select to authenticated using (private.is_member(campaign_id) and exists(select 1 from public.characters ch where ch.id=character_id));
create policy oracle_rules_read on public.oracle_rules for select to authenticated using(private.is_member(campaign_id));
create policy oracle_estimates_read on public.oracle_estimates for select to authenticated using(private.is_member(campaign_id) and (requester_id=(select auth.uid()) or private.is_gm(campaign_id)));
create policy oracle_reviews_read on public.oracle_reviews for select to authenticated using(private.is_member(campaign_id) and (private.is_gm(campaign_id) or exists(select 1 from public.oracle_estimates e where e.id=estimate_id and e.requester_id=(select auth.uid()))));
create policy oracle_valuations_read on public.oracle_valuations for select to authenticated using(private.is_member(campaign_id));
revoke all on private.awakening_config from public,anon,authenticated;
revoke all on public.awakenings,public.oracle_rules,public.oracle_estimates,public.oracle_reviews,public.oracle_valuations from anon,authenticated;
grant select on public.awakenings,public.oracle_rules,public.oracle_estimates,public.oracle_reviews,public.oracle_valuations to authenticated;

create function private.draw_affinity(cards jsonb) returns jsonb language plpgsql volatile set search_path='' as $$
declare remaining jsonb:=cards; history jsonb:='[]'; opts jsonb:='[]'; pending integer:=1; pos integer; card jsonb;
begin
  while pending>0 loop
    perform private.ensure(jsonb_array_length(remaining)>0,'Awakening deck exhausted.');
    pos:=floor(random()*jsonb_array_length(remaining))::integer;
    card:=remaining->pos;remaining:=remaining-pos;history:=history||jsonb_build_array(card);pending:=pending-1;
    if card->>'kind'='ace' then pending:=pending+2;else opts:=opts||jsonb_build_array(card);end if;
  end loop;
  return jsonb_build_object('draws',history,'options',opts);
end;
$$;

create function private.validate_oracle_side(s jsonb,cid uuid,operation text) returns void language plpgsql set search_path='' as $$
declare k text; v text; ref text;
begin
  perform private.ensure(jsonb_typeof(s)='object','Invalid valuation side.');
  perform private.ensure((select count(*)=9 from jsonb_object_keys(s)) and s ?& array['domain','description','quantity','unit','essentia','lower','upper','method','precedent_ids'],'Invalid valuation fields.');
  perform private.ensure(s->'domain'='null' or s->>'domain' in ('mass','energy','time','space','information','entropy','life','chance','everything','nothing'),'Invalid domain.');
  perform private.ensure(jsonb_typeof(s->'description')='string' and length(s->>'description')<=2000,'Invalid description.');
  foreach k in array array['quantity','unit'] loop
    perform private.ensure(s->k='null' or (jsonb_typeof(s->k)='string' and length(s->>k)<=2000),'Invalid measurement.');
  end loop;
  foreach k in array array['essentia','lower','upper'] loop
    perform private.ensure(s->k='null' or (jsonb_typeof(s->k)='string' and s->>k ~ '^(0|[1-9][0-9]{0,29})(\.[0-9]{1,6})?$'),'Invalid Essentia decimal.');
  end loop;
  perform private.ensure(s->'essentia'='null' or s->'domain'<>'null','A value needs a domain.');
  if s->'lower'<>'null' and s->'upper'<>'null' then perform private.ensure((s->>'lower')::numeric<=(s->>'upper')::numeric,'Invalid valuation bounds.');end if;
  if s->'essentia'<>'null' then
    perform private.ensure((s->'lower'='null' or (s->>'essentia')::numeric>=(s->>'lower')::numeric) and (s->'upper'='null' or (s->>'essentia')::numeric<=(s->>'upper')::numeric),'Value outside range.');
  end if;
  perform private.ensure(s->>'method' in ('approved','comparative','adjudicated','undetermined'),'Invalid valuation method.');
  perform private.ensure(jsonb_typeof(s->'precedent_ids')='array' and jsonb_array_length(s->'precedent_ids')<=12,'Invalid precedent list.');
  for ref in select jsonb_array_elements_text(s->'precedent_ids') loop
    perform private.ensure(exists(select 1 from public.oracle_valuations v where v.id=ref::uuid and v.campaign_id=cid and v.status='approved' and v.operation=validate_oracle_side.operation and v.domain=s->>'domain'),'Unknown or inactive precedent.');
  end loop;
  perform private.ensure(s->>'method'<>'approved' or jsonb_array_length(s->'precedent_ids')>0,'An approved calculation needs a precedent.');
end;
$$;
create function private.validate_oracle_estimate(v jsonb,cid uuid) returns void language plpgsql set search_path='' as $$
declare k text; item jsonb;
begin
  perform private.ensure(jsonb_typeof(v)='object' and octet_length(v::text)<=30000,'Invalid or oversized estimate.');
  perform private.ensure((select count(*)=8 from jsonb_object_keys(v)) and v ?& array['summary','input','output','assumptions','questions','warnings','confidence','justification'],'Invalid estimate fields.');
  foreach k in array array['summary','justification'] loop perform private.ensure(jsonb_typeof(v->k)='string' and length(v->>k)<=2000,'Invalid estimate text.');end loop;
  foreach k in array array['assumptions','questions','warnings'] loop
    perform private.ensure(jsonb_typeof(v->k)='array' and jsonb_array_length(v->k)<=20,'Invalid estimate list.');
    for item in select value from jsonb_array_elements(v->k) loop perform private.ensure(jsonb_typeof(item)='string' and length(item#>>'{}')<=2000,'Invalid estimate list text.');end loop;
  end loop;
  perform private.ensure(v->>'confidence' in ('exact','close','partial','novel','unresolved'),'Invalid confidence.');
  perform private.validate_oracle_side(v->'input',cid,'input');perform private.validate_oracle_side(v->'output',cid,'output');
end;
$$;

create function private.oracle_action(action text,p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();c public.campaigns;ch public.characters;a public.awakenings;e public.oracle_estimates;r public.oracle_reviews;
  old public.oracle_valuations; cid uuid; side text; cfg private.awakening_config; choice jsonb; sel jsonb; v jsonb; d jsonb; k text; prior public.oracle_rules;
begin
  if action not like 'awakening_%' and action not like 'oracle_%' then return private.journal_action(action,p);end if;
  perform private.ensure(u is not null,'Sign in first.');
  perform private.ensure(jsonb_typeof(p)='object' and octet_length(p::text)<=50000,'Invalid or oversized request.');
  if action like 'awakening_%' then
    select * into ch from public.characters where id=(p->>'character_id')::uuid;
    c:=private.lock_campaign(ch.campaign_id);
    select * into ch from public.characters where id=(p->>'character_id')::uuid for update;
    perform private.ensure(ch.owner_id=u and ch.npc is null,'Only the character owner can resolve awakening.');
    select * into a from public.awakenings where character_id=ch.id for update;
    if action='awakening_draw' then
      side:=p->>'side';perform private.ensure(side in ('input','output'),'Choose an awakening side.');
      if a.character_id is null then
        select * into cfg from private.awakening_config order by version desc limit 1;
        insert into public.awakenings(character_id,campaign_id,ruleset_version) values(ch.id,ch.campaign_id,cfg.version) returning * into a;
      else select * into cfg from private.awakening_config where version=a.ruleset_version;end if;
      if (side='input' and a.input is null) or (side='output' and a.output is null) then
        perform private.ensure(a.status='drawing','Awakening is locked.');v:=private.draw_affinity(cfg.cards);
        update public.awakenings set input=case when side='input' then v else input end,output=case when side='output' then v else output end where character_id=ch.id returning * into a;
      end if;
    elsif action='awakening_select' then
      perform private.ensure(a.status='drawing' and a.input is not null and a.output is not null,'Resolve both sides before final selection. Awakening may already be locked.');
      sel:='{}';
      foreach side in array array['input','output'] loop
        select value into choice from jsonb_array_elements(case when side='input' then a.input else a.output end->'options') where value->>'id'=p->>side;
        perform private.ensure(choice is not null,'Select only drawn affinity options.');
        sel:=sel||jsonb_build_object(side,choice||jsonb_build_object('restriction',null,'specializations','[]'::jsonb));
      end loop;
      update public.awakenings set status='selected',selection=sel where character_id=ch.id returning * into a;
    else raise exception 'Unknown awakening action.';end if;
    return to_jsonb(a);
  end if;
  if nullif(p->>'id','') is not null then
    select * into e from public.oracle_estimates where id=(p->>'id')::uuid for update;
    perform private.ensure(e.id is not null,'Request not found.');cid:=e.campaign_id;
  else cid:=(p->>'campaign_id')::uuid;end if;
  c:=private.lock_campaign(cid);
  if action='oracle_submit' then
    perform private.ensure(jsonb_typeof(p->'request')='string' and jsonb_typeof(coalesce(p->'context','""'))='string','Invalid request text.');
    if nullif(p->>'character_id','') is not null then
      perform private.ensure(exists(select 1 from public.characters x where x.id=(p->>'character_id')::uuid and x.campaign_id=cid and x.npc is null and (x.owner_id=u or c.gm_id=u)),'Choose an authorized character.');
    end if;
    insert into public.oracle_estimates(campaign_id,requester_id,character_id,client_id,request,context)
      values(cid,u,nullif(p->>'character_id','')::uuid,(p->>'client_id')::uuid,trim(p->>'request'),coalesce(p->>'context',''))
      on conflict(requester_id,client_id) do nothing returning * into e;
    if e.id is null then select * into e from public.oracle_estimates where requester_id=u and client_id=(p->>'client_id')::uuid;perform private.ensure(e.campaign_id=cid,'Request key belongs to another campaign.');end if;
    return to_jsonb(e);
  end if;
  perform private.ensure(c.gm_id=u,'Only the GM can do that.');
  if action='oracle_rules' then
    select * into prior from public.oracle_rules where campaign_id=cid for update;
    perform private.ensure(prior.campaign_id is null or prior.revision=(p->>'revision')::integer,'Instructions changed; reload.');
    insert into public.oracle_rules(campaign_id,rules) values(cid,p->>'rules') on conflict(campaign_id) do update set rules=excluded.rules,revision=oracle_rules.revision+1 returning * into prior;return to_jsonb(prior);
  end if;
  perform private.ensure(action in ('oracle_review','oracle_direct'),'Unknown Oracle action.');
  perform private.ensure(action='oracle_direct' or e.id is not null,'Request not found.');
  if e.id is not null then
    perform private.ensure(e.status='proposed' and e.revision=(p->>'revision')::integer and (e.provider_status<>'running' or e.provider_started_at<now()-interval '2 minutes'),'Request changed or AI is still running. Reload before reviewing.');
    if e.provider_status='running' then update public.oracle_estimates set provider_status='failed',provider_lease=null,provider_error='Estimator timed out; manual review is available.' where id=e.id;end if;
  end if;
  perform private.ensure(p->>'decision' in ('approve','deny','clarify'),'Choose a review decision.');
  perform private.ensure(jsonb_typeof(p->'rationale')='string' and length(p->>'rationale')<=2000,'Enter a concise rationale.');
  d:=coalesce(p->'details','{}');
  foreach k in array array['conditions','scope','tags'] loop perform private.ensure(jsonb_typeof(coalesce(d->k,'""'))='string' and length(coalesce(d->>k,''))<=2000,'Invalid ruling scope.');end loop;
  perform private.ensure(coalesce(d->>'scaling','none') in ('none','linear') and jsonb_typeof(coalesce(d->'benchmark','false'))='boolean','Invalid scaling or benchmark.');
  if p->>'decision'='approve' then
    v:=p->'ruling';perform private.validate_oracle_estimate(v,cid);
    perform private.ensure(v->'input'->'essentia'<>'null' or v->'output'->'essentia'<>'null','Approve at least one known value.');
    if nullif(p->>'supersedes','') is not null then
      select * into old from public.oracle_valuations where id=(p->>'supersedes')::uuid and campaign_id=cid for update;
      perform private.ensure(old.status='approved' and v->old.operation->'essentia'<>'null' and v->(case when old.operation='input' then 'output' else 'input' end)->'essentia'='null','Replace only the superseded operation.');
      update public.oracle_valuations set status='superseded' where id=old.id;
    end if;
  end if;
  insert into public.oracle_reviews(campaign_id,estimate_id,reviewer_id,decision,ruling,rationale,details)
    values(cid,e.id,u,p->>'decision',v,p->>'rationale',d) returning * into r;
  if p->>'decision'='approve' then
    foreach side in array array['input','output'] loop
      choice:=v->side;
      if choice->'essentia'='null' then continue;end if;
      insert into public.oracle_valuations(campaign_id,operation,domain,description,quantity,unit,essentia,lower,upper,conditions,scope,scaling,tags,benchmark,rationale,approver_id,source_estimate_id,review_id,supersedes)
        values(cid,side,choice->>'domain',choice->>'description',choice->>'quantity',choice->>'unit',(choice->>'essentia')::numeric,(choice->>'lower')::numeric,(choice->>'upper')::numeric,coalesce(d->>'conditions',''),coalesce(d->>'scope',''),coalesce(d->>'scaling','none'),string_to_array(coalesce(d->>'tags',''),','),coalesce((d->>'benchmark')::boolean,false),p->>'rationale',u,e.id,r.id,old.id);
    end loop;
  end if;
  if e.id is not null then update public.oracle_estimates set status=case p->>'decision' when 'approve' then 'approved' when 'deny' then 'denied' else 'proposed' end,revision=revision+1 where id=e.id;end if;
  return to_jsonb(r);
end;
$$;
revoke execute on function private.draw_affinity(jsonb),private.validate_oracle_side(jsonb,uuid,text),private.validate_oracle_estimate(jsonb,uuid),private.oracle_action(text,jsonb) from public,anon,authenticated;
grant execute on function private.oracle_action(text,jsonb) to authenticated;
create or replace function public.app_action(p_action text,p_payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.oracle_action(p_action,p_payload);$$;
revoke execute on function private.journal_action(text,jsonb) from authenticated;

alter function public.app_snapshot() set schema private;
alter function private.app_snapshot() rename to journal_snapshot;
revoke execute on function private.journal_snapshot() from public,anon,authenticated;
grant execute on function private.journal_snapshot() to authenticated;
create function public.app_snapshot() returns jsonb language sql stable security invoker set search_path='' as $$
 select private.journal_snapshot() || jsonb_build_object(
  'awakenings',coalesce((select jsonb_agg(a) from public.awakenings a),'[]'),
  'oracle_rules',coalesce((select jsonb_agg(r) from public.oracle_rules r),'[]'),
  'oracle_estimates',coalesce((select jsonb_agg(e) from public.oracle_estimates e),'[]'),
  'oracle_reviews',coalesce((select jsonb_agg(r) from public.oracle_reviews r),'[]'),
  'oracle_valuations',coalesce((select jsonb_agg(to_jsonb(v)||jsonb_build_object('essentia',v.essentia::text,'lower',v.lower::text,'upper',v.upper::text)) from public.oracle_valuations v),'[]'));
$$;
revoke execute on function public.app_snapshot() from public,anon;
grant execute on function public.app_snapshot() to authenticated;

-- The AI context uses caller RLS, never an unrestricted service snapshot.
create function public.oracle_ai_context(estimate_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare e public.oracle_estimates;c public.campaigns;ch public.characters;a public.awakenings;refs jsonb;
begin
  select * into e from public.oracle_estimates where id=estimate_id;
  if e.id is null then raise exception 'Request not found.';end if;
  if e.status<>'proposed' then raise exception 'This request has already been reviewed.';end if;
  select * into c from public.campaigns where id=e.campaign_id;
  if e.character_id is not null then select * into ch from public.characters where id=e.character_id;select * into a from public.awakenings where character_id=ch.id;end if;
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
    'character',case when ch.id is null then null else jsonb_build_object('awakening',to_jsonb(a),'attributes',ch.build->'attributes','skills',ch.build->'skills','skill_definitions',coalesce(ch.rules->'catalog'->'skills',c.catalog->'skills')) end,
    'precedents',refs);
end;
$$;
revoke execute on function public.oracle_ai_context(uuid) from public,anon;
grant execute on function public.oracle_ai_context(uuid) to authenticated;

create function private.oracle_provider(estimate_id uuid,caller uuid,operation text,lease uuid default null,proposal jsonb default null,model text default null,error text default null,refs uuid[] default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.oracle_estimates; token uuid;
begin
  select * into e from public.oracle_estimates where id=estimate_id for update;
  perform private.ensure(e.id is not null and exists(select 1 from public.campaign_members where campaign_id=e.campaign_id and user_id=caller) and (e.requester_id=caller or exists(select 1 from public.campaigns where id=e.campaign_id and gm_id=caller)),'Request not found.');
  perform private.ensure(e.status='proposed','Request has already been reviewed.');
  if operation='begin' then
    perform private.ensure(e.proposal is null and e.provider_attempts<3 and (e.provider_status<>'running' or e.provider_started_at<now()-interval '2 minutes'),'An estimate is already available, running, or has exhausted retries.');
    -- Serialize per-user rate checks without locking unrelated campaigns.
    perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
    perform private.ensure((select coalesce(sum(provider_attempts),0)<5 from public.oracle_estimates where requester_id=caller and provider_started_at>now()-interval '1 minute'),'Too many estimates; try again in a minute.');
    token:=gen_random_uuid();
    update public.oracle_estimates set provider_status='running',provider_started_at=now(),provider_attempts=provider_attempts+1,provider_lease=token,provider_error=null where id=e.id;
    return jsonb_build_object('lease',token);
  end if;
  perform private.ensure(e.provider_lease=lease and e.provider_status='running','Estimator lease expired.');
  if operation='finish' then
    perform private.validate_oracle_estimate(proposal,e.campaign_id);
    perform private.ensure(not exists(select 1 from jsonb_array_elements_text((proposal->'input'->'precedent_ids')||(proposal->'output'->'precedent_ids')) ref where not ref::uuid=any(refs)),'Unsupplied precedent reference.');
    update public.oracle_estimates set proposal=oracle_provider.proposal,provider_status='ready',model=left(oracle_provider.model,100),estimator_version='oracle-1',retrieved_ids=refs,provider_lease=null,revision=revision+1 where id=e.id;
  elsif operation='fail' then
    update public.oracle_estimates set provider_status='failed',provider_error=left(oracle_provider.error,500),provider_lease=null,revision=revision+1 where id=e.id;
  else raise exception 'Invalid provider operation.';end if;
  return jsonb_build_object('saved',true);
end;
$$;
revoke execute on function private.oracle_provider(uuid,uuid,text,uuid,jsonb,text,text,uuid[]) from public,anon,authenticated;
-- This wrapper can only be invoked by the server credential; browsers cannot save AI output.
create function public.oracle_provider(estimate_id uuid,caller uuid,operation text,lease uuid default null,proposal jsonb default null,model text default null,error text default null,refs uuid[] default '{}') returns jsonb
language sql security invoker set search_path='' as $$select private.oracle_provider(estimate_id,caller,operation,lease,proposal,model,error,refs);$$;
revoke execute on function public.oracle_provider(uuid,uuid,text,uuid,jsonb,text,text,uuid[]) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.oracle_provider(uuid,uuid,text,uuid,jsonb,text,text,uuid[]),public.oracle_provider(uuid,uuid,text,uuid,jsonb,text,text,uuid[]) to service_role;
commit;
