-- Empyrean v2. Run once in a NEW Supabase project's SQL editor.
-- All client writes go through app_action; tables have read-only RLS policies.
begin;
create schema if not exists private;
revoke all on schema private from public;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 80)
);
create table public.campaigns (
  id uuid primary key default gen_random_uuid(), gm_id uuid not null references auth.users(id),
  name text not null check (length(trim(name)) between 1 and 120), description text not null default '',
  settings jsonb not null, catalog jsonb not null, revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.campaign_members (
  campaign_id uuid not null references public.campaigns on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('gm','player')), display_name text not null,
  joined_at timestamptz not null default now(), primary key(campaign_id, user_id)
);
create table public.characters (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  owner_id uuid not null references auth.users(id), name text not null default 'Unnamed character' check (length(trim(name)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft','active')), build jsonb not null,
  review jsonb, rules jsonb, merit numeric not null default 0 check (merit >= 0),
  sparks numeric not null default 0 check (sparks >= 0), spent numeric not null default 0,
  revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notes (
  id uuid primary key default gen_random_uuid(), campaign_id uuid references public.campaigns on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, title text not null check(length(trim(title)) between 1 and 160),
  body text not null default '' check(length(body) <= 50000), audience text not null check(audience in ('private','party','gm','player')),
  recipient_id uuid references auth.users(id), revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(campaign_id is not null or audience = 'private'), check(audience <> 'player' or recipient_id is not null)
);
create table public.items (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  owner_id uuid references auth.users(id), name text not null check(length(trim(name)) between 1 and 120),
  quantity integer not null check(quantity between 1 and 1000000000), details text not null default '', revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.maps (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  name text not null check(length(trim(name)) between 1 and 120), scale text not null check(scale in ('world','region','city','scene')),
  image_url text not null default '', storage_path text not null default '', visible boolean not null default false,
  grid integer not null default 12 check(grid between 0 and 100), revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(image_url = '' or image_url ~ '^https://')
);
create table public.markers (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  map_id uuid not null references public.maps on delete cascade, owner_id uuid references auth.users(id),
  character_id uuid references public.characters on delete set null, name text not null check(length(trim(name)) between 1 and 80),
  color text not null default '#2b9a91' check(color ~ '^#[a-fA-F0-9]{6}$'), x numeric not null default 50 check(x between 0 and 100),
  y numeric not null default 50 check(y between 0 and 100), hidden boolean not null default false, revision integer not null default 1,
  updated_at timestamptz not null default now()
);
create table public.invites (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  code text not null unique, expires_at timestamptz not null default now() + interval '7 days',
  uses integer not null default 0, max_uses integer not null default 50, revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.activity (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.campaigns on delete cascade,
  actor_name text not null, message text not null, created_at timestamptz not null default now()
);
create index members_user on public.campaign_members(user_id);
create index characters_campaign on public.characters(campaign_id);
create index notes_campaign on public.notes(campaign_id);
create index notes_owner on public.notes(owner_id);
create index items_campaign on public.items(campaign_id);
create index maps_campaign on public.maps(campaign_id);
create index markers_map on public.markers(map_id);
create index activity_campaign on public.activity(campaign_id, created_at desc);

create function private.is_member(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.campaign_members where campaign_id=cid and user_id=(select auth.uid()));
$$;
create function private.is_gm(cid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.campaigns where id=cid and gm_id=(select auth.uid()));
$$;
grant usage on schema private to authenticated;
grant execute on function private.is_member(uuid), private.is_gm(uuid) to authenticated;
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.notes enable row level security;
alter table public.items enable row level security;
alter table public.maps enable row level security;
alter table public.markers enable row level security;
alter table public.invites enable row level security;
alter table public.activity enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy campaigns_read on public.campaigns for select to authenticated using(private.is_member(id));
create policy members_read on public.campaign_members for select to authenticated using(private.is_member(campaign_id));
create policy characters_read on public.characters for select to authenticated using(private.is_member(campaign_id) and (owner_id=(select auth.uid()) or status='active' or private.is_gm(campaign_id)));
create policy notes_read on public.notes for select to authenticated using(owner_id=(select auth.uid()) or (private.is_member(campaign_id) and (audience='party' or (audience='gm' and private.is_gm(campaign_id)) or (audience='player' and recipient_id=(select auth.uid())))));
create policy items_read on public.items for select to authenticated using(private.is_member(campaign_id));
create policy maps_read on public.maps for select to authenticated using(private.is_member(campaign_id) and (visible or private.is_gm(campaign_id)));
create policy markers_read on public.markers for select to authenticated using(private.is_member(campaign_id) and (private.is_gm(campaign_id) or (not hidden and exists(select 1 from public.maps m where m.id=map_id and m.visible))));
create policy invites_read on public.invites for select to authenticated using(private.is_gm(campaign_id));
create policy activity_read on public.activity for select to authenticated using(private.is_member(campaign_id));
revoke all on public.profiles,public.campaigns,public.campaign_members,public.characters,public.notes,public.items,public.maps,public.markers,public.invites,public.activity from anon,authenticated;
grant select on public.profiles,public.campaigns,public.campaign_members,public.characters,public.notes,public.items,public.maps,public.markers,public.invites,public.activity to authenticated;

create function private.ensure(ok boolean, message text) returns void language plpgsql set search_path = '' as $$
begin if ok is distinct from true then raise exception '%', message using errcode='P0001'; end if; end;
$$;
create function private.num(v jsonb, label text, lo numeric default 0, hi numeric default 9007199254740991, whole boolean default false)
returns numeric language plpgsql immutable set search_path = '' as $$
declare n numeric;
begin
  perform private.ensure(jsonb_typeof(v)='number',label||' must be a number.'); n := (v#>>'{}')::numeric;
  perform private.ensure(n between lo and hi and (not whole or n=trunc(n)),label||' is outside the allowed range.'); return n;
end;
$$;
create function private.validate_settings(s jsonb) returns void language plpgsql set search_path = '' as $$
begin
  perform private.num(s->'startingMerit','Starting Merit'); perform private.num(s->'startingSparks','Starting Sparks');
  perform private.num(s->'attributeCap','Attribute cap',1,5,true); perform private.num(s->'skillCap','Skill cap',0,10,true);
  perform private.ensure(jsonb_typeof(s->'allowCustomBackground')='boolean' and jsonb_typeof(s->'allowBackgroundBypass')='boolean','Invalid background options.');
  perform private.ensure(jsonb_typeof(s->'backgroundFields')='array' and jsonb_array_length(s->'backgroundFields')<=20,'Invalid background fields.');
  perform private.ensure(not exists(select 1 from jsonb_array_elements(s->'backgroundFields') e where jsonb_typeof(e)<>'string' or length(trim(e#>>'{}')) not between 1 and 100),'Invalid background field label.');
  perform private.ensure((select count(*)=count(distinct value) from jsonb_array_elements(s->'backgroundFields')),'Duplicate background fields.');
end;
$$;
create function private.entry(cat jsonb, category text, eid text) returns jsonb language sql immutable set search_path = '' as $$
  select value from jsonb_array_elements(coalesce(cat->category,'[]')) where value->>'id'=eid limit 1;
$$;
create function private.available(e jsonb) returns boolean language sql immutable set search_path = '' as $$
  select e is not null and coalesce((e->>'enabled')::boolean,true);
$$;
create function private.validate_catalog(cat jsonb) returns void language plpgsql set search_path = '' as $$
declare category text; e jsonb; g jsonb; typ text; ref text;
begin
  foreach category in array array['lineages','backgrounds','skills','abilities'] loop
    perform private.ensure(jsonb_typeof(cat->category)='array' and jsonb_array_length(cat->category)<=500,'Invalid catalog: '||category);
    perform private.ensure((select count(*)=count(distinct value->>'id') from jsonb_array_elements(cat->category)),'Duplicate catalog IDs.');
    for e in select value from jsonb_array_elements(cat->category) loop
      perform private.ensure(e->>'id' ~ '^[a-zA-Z0-9_-]{1,80}$' and length(trim(e->>'name')) between 1 and 120,'Catalog entries require IDs and names.');
      perform private.ensure(e->'enabled' is null or jsonb_typeof(e->'enabled')='boolean','Invalid enabled flag.');
      if category='abilities' then perform private.num(e->'cost','Ability cost',1,99,true); end if;
      if category='skills' then perform private.ensure(e->'generic' is null or jsonb_typeof(e->'generic')='boolean','Invalid generic skill flag.'); end if;
      if category in ('lineages','backgrounds') then
        perform private.num(coalesce(e->'meritBonus','0'),'Merit bonus'); perform private.num(coalesce(e->'sparksBonus','0'),'Sparks bonus');
      end if;
      if category='lineages' then
        perform private.ensure(e->'ageRequired' is null or jsonb_typeof(e->'ageRequired')='boolean','Invalid age requirement.');
        perform private.ensure(jsonb_typeof(coalesce(e->'variants','[]'))='array' and jsonb_array_length(coalesce(e->'variants','[]'))<=100,'Invalid variants.');
        perform private.ensure((select count(*)=count(distinct value->>'id') from jsonb_array_elements(coalesce(e->'variants','[]'))),'Duplicate variant IDs.');
        for g in select value from jsonb_array_elements(coalesce(e->'variants','[]')) loop
          perform private.ensure(g->>'id' ~ '^[a-zA-Z0-9_-]{1,80}$' and length(trim(g->>'name')) between 1 and 120,'Variants require IDs and names.');
          perform private.num(coalesce(g->'meritBonus','0'),'Variant Merit bonus'); perform private.num(coalesce(g->'sparksBonus','0'),'Variant Sparks bonus');
          perform private.ensure(g->'enabled' is null or jsonb_typeof(g->'enabled')='boolean','Invalid variant availability.');
        end loop;
      end if;
      if category <> 'skills' then
        for g in select e union all select value from jsonb_array_elements(coalesce(e->'variants','[]')) loop
          foreach typ in array array['skills','abilities'] loop
            if category='abilities' and typ='abilities' then continue; end if;
            perform private.ensure(jsonb_typeof(coalesce(g->typ,'[]'))='array','Invalid content grants.');
            perform private.ensure((select count(*)=count(distinct value) from jsonb_array_elements(coalesce(g->typ,'[]'))),'Duplicate content grant.');
            for ref in select jsonb_array_elements_text(coalesce(g->typ,'[]')) loop
              perform private.ensure(private.entry(cat,typ,ref) is not null,'Unknown '||typ||' reference: '||ref);
            end loop;
          end loop;
        end loop;
      end if;
    end loop;
  end loop;
end;
$$;
create function private.build_info(settings jsonb, cat jsonb, b jsonb, review jsonb) returns jsonb language plpgsql set search_path = '' as $$
declare lin jsonb; variant jsonb; bg jsonb; g jsonb; grants jsonb; free_a jsonb := '[]'; skill_ids jsonb := '[]'; all_a jsonb;
  id text; rank numeric; ac numeric:=0; sc numeric:=0; bc numeric:=0; merit numeric; sparks numeric;
begin
  lin:=private.entry(cat,'lineages',b->>'lineageId');
  select value into variant from jsonb_array_elements(coalesce(lin->'variants','[]')) where value->>'id'=b->>'variantId';
  if b->'background'->>'kind'='preset' then bg:=private.entry(cat,'backgrounds',b->'background'->>'id');
  elsif b->'background'->>'kind'='custom' and review->>'status'='approved' then bg:=b->'background'; end if;
  grants:=jsonb_build_array(lin,variant,bg);
  merit:=(settings->>'startingMerit')::numeric; sparks:=(settings->>'startingSparks')::numeric;
  if b->'background'->>'kind'='bypass' then merit:=merit+5; sparks:=sparks+500; end if;
  for g in select value from jsonb_array_elements(grants) where value <> 'null'::jsonb loop
    merit:=merit+coalesce((g->>'meritBonus')::numeric,0); sparks:=sparks+coalesce((g->>'sparksBonus')::numeric,0);
    free_a:=free_a||coalesce(g->'abilities','[]'); skill_ids:=skill_ids||coalesce(g->'skills','[]');
  end loop;
  free_a:=coalesce((select jsonb_agg(a.aid) from jsonb_array_elements_text(free_a) as a(aid) where private.available(private.entry(cat,'abilities',a.aid))),'[]');
  all_a:=free_a||coalesce(b->'abilities','[]');
  skill_ids:=skill_ids||coalesce((select jsonb_agg(value->>'id') from jsonb_array_elements(cat->'skills') where coalesce((value->>'generic')::boolean,false) and private.available(value)),'[]');
  for id in select distinct jsonb_array_elements_text(all_a) loop skill_ids:=skill_ids||coalesce(private.entry(cat,'abilities',id)->'skills','[]'); end loop;
  for rank in select value::text::numeric from jsonb_each(b->'attributes') loop ac:=ac+rank*(rank+1)-2; end loop;
  for rank in select value::text::numeric from jsonb_each(b->'skills') loop sc:=sc+rank*(rank+1)/2; end loop;
  for id in select jsonb_array_elements_text(b->'abilities') loop if not free_a ? id then bc:=bc+coalesce((private.entry(cat,'abilities',id)->>'cost')::numeric,0); end if; end loop;
  return jsonb_build_object('merit',merit,'sparks',sparks,'spent',ac+sc+bc,'skills',skill_ids,'abilities',all_a,'freeAbilities',free_a);
end;
$$;
create function private.validate_build(settings jsonb, cat jsonb, b jsonb, review jsonb, finish boolean default false, active boolean default false)
returns jsonb language plpgsql set search_path = '' as $$
declare lin jsonb; bg jsonb; info jsonb; k text; v jsonb; typ text; id text; cap numeric;
begin
  perform private.ensure(jsonb_typeof(b)='object' and jsonb_typeof(b->'lineageId')='string' and jsonb_typeof(b->'variantId')='string','Invalid character build.');
  lin:=private.entry(cat,'lineages',b->>'lineageId');
  perform private.ensure(b->>'lineageId'='' or private.available(lin),'Choose an available lineage.');
  perform private.ensure(b->>'variantId'='' or exists(select 1 from jsonb_array_elements(coalesce(lin->'variants','[]')) where value->>'id'=b->>'variantId' and private.available(value)),'Choose an available variant.');
  if b->'ageYears' <> 'null'::jsonb then perform private.num(b->'ageYears','Age'); end if;
  perform private.ensure(b->>'ageCategory' in ('','young','medium','old'),'Choose a valid age category.');
  bg:=b->'background'; perform private.ensure(bg->>'kind' in ('none','preset','custom','bypass'),'Choose a background option.');
  if bg->>'kind'='preset' then perform private.ensure(private.available(private.entry(cat,'backgrounds',bg->>'id')),'Choose an available background.'); end if;
  if bg->>'kind'='bypass' then perform private.ensure((settings->>'allowBackgroundBypass')::boolean,'Background bypass is disabled.'); end if;
  if bg->>'kind'='custom' then
    perform private.ensure((settings->>'allowCustomBackground')::boolean,'Custom backgrounds are disabled.');
    perform private.ensure(length(trim(bg->>'name')) between 1 and 120,'Name the custom background.');
    for k in select jsonb_array_elements_text(settings->'backgroundFields') loop perform private.ensure(length(trim(bg->'answers'->>k))>0,'Custom background requires '||k); end loop;
    foreach typ in array array['skills','abilities'] loop
      perform private.ensure(jsonb_typeof(bg->typ)='array','Invalid custom background grants.');
      perform private.ensure((select count(*)=count(distinct value) from jsonb_array_elements(bg->typ)),'Duplicate custom background grants.');
      for id in select jsonb_array_elements_text(bg->typ) loop perform private.ensure(private.available(private.entry(cat,typ,id)),'Choose available '||typ); end loop;
    end loop;
    perform private.ensure(coalesce((bg->>'meritBonus')::numeric,0)=0 and coalesce((bg->>'sparksBonus')::numeric,0)=0,'Custom backgrounds cannot grant currency bonuses.');
  end if;
  perform private.ensure(jsonb_typeof(b->'attributes')='object' and (select count(*)=9 from jsonb_object_keys(b->'attributes')),'All nine attributes are required.');
  foreach k in array array['Power','Toughness','Reflex','Senses','Control','Mind','Will','Emotions','Spirit'] loop
    perform private.num(b->'attributes'->k,'Attribute',1,case when active then 5 else (settings->>'attributeCap')::numeric end,true);
  end loop;
  perform private.ensure(jsonb_typeof(b->'abilities')='array' and (select count(*)=count(distinct value) from jsonb_array_elements(b->'abilities')),'Choose unique abilities.');
  for id in select jsonb_array_elements_text(b->'abilities') loop perform private.ensure(private.available(private.entry(cat,'abilities',id)),'Choose available abilities.'); end loop;
  perform private.ensure(jsonb_typeof(b->'skills')='object','Invalid skills.');
  info:=private.build_info(settings,cat,b,review);
  for k,v in select * from jsonb_each(b->'skills') loop
    perform private.ensure(info->'skills' ? k and private.available(private.entry(cat,'skills',k)),'A purchased skill is no longer available. Refund it before changing its source.');
    perform private.num(v,'Skill',0,case when active then 10 else (settings->>'skillCap')::numeric end,true);
  end loop;
  if not active then perform private.ensure((info->>'spent')::numeric <= (info->>'merit')::numeric,'Not enough Merit.'); end if;
  if finish then
    perform private.ensure(lin is not null,'Select a lineage before finishing.');
    perform private.ensure(not exists(select 1 from jsonb_array_elements(coalesce(lin->'variants','[]')) where private.available(value)) or b->>'variantId'<>'','Select a lineage variant.');
    perform private.ensure(coalesce((lin->>'ageRequired')::boolean,true)=false or b->>'ageCategory'<>'','Choose an age category.');
    perform private.ensure(bg->>'kind'<>'none','Choose a background option.');
    perform private.ensure(bg->>'kind'<>'custom' or review->>'status'='approved','Your GM must approve the custom background first.');
  end if;
  return info;
end;
$$;

create function private.log(cid uuid, msg text) returns void language sql set search_path = '' as $$
  insert into public.activity(campaign_id,actor_name,message) values(cid,(select display_name from public.profiles where id=auth.uid()),msg);
$$;
create function private.lock_campaign(cid uuid, gm_only boolean default false) returns public.campaigns language plpgsql set search_path = '' as $$
declare c public.campaigns;
begin
  -- SHARE serializes rule changes with character completion without serializing different players.
  select * into c from public.campaigns where id=cid for share;
  perform private.ensure(c.id is not null and private.is_member(cid),'Campaign not found.');
  perform private.ensure(not gm_only or c.gm_id=auth.uid(),'Only the GM can do that.'); return c;
end;
$$;
create function public.app_snapshot() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where p.id=auth.uid()),
    'campaigns',coalesce((select jsonb_agg(c order by c.created_at desc) from public.campaigns c),'[]'),
    'members',coalesce((select jsonb_agg(m) from public.campaign_members m),'[]'),
    'characters',coalesce((select jsonb_agg(c order by c.created_at) from public.characters c),'[]'),
    'notes',coalesce((select jsonb_agg(n order by n.updated_at desc) from public.notes n),'[]'),
    'items',coalesce((select jsonb_agg(i order by i.name) from public.items i),'[]'),
    'maps',coalesce((select jsonb_agg(m order by m.created_at) from public.maps m),'[]'),
    'markers',coalesce((select jsonb_agg(m) from public.markers m),'[]'),
    'invites',coalesce((select jsonb_agg(i order by i.created_at desc) from public.invites i),'[]'),
    'activity',coalesce((select jsonb_agg(a) from (select * from public.activity order by created_at desc limit 100) a),'[]')
  ) where auth.uid() is not null;
$$;

create function public.app_action(p_action text, p_payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path = '' as $$
<<app_action>>
declare
  u uuid:=auth.uid(); p jsonb:=p_payload; c public.campaigns; ch public.characters; n public.notes;
  item public.items; mp public.maps; marker public.markers; inv public.invites;
  s jsonb; cat jsonb; b jsonb; review jsonb; info jsonb; old_info jsonb; category text; k text; v jsonb; original_cat jsonb; frozen_ids jsonb;
  merit numeric; sparks numeric; delta numeric; amount numeric; qty integer; owner uuid;
  result jsonb:='null'; cid uuid; finishing boolean; old_active boolean;
begin
  perform private.ensure(u is not null,'Sign in first.');
  perform private.ensure(jsonb_typeof(p)='object' and octet_length(p::text)<=1500000,'Invalid or oversized request.');
  insert into public.profiles(id,display_name) select u,left(coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),'Player'),80) from auth.users where id=u on conflict do nothing;
  if p_action='create_campaign' then
    s:=p->'settings'; perform private.validate_settings(s);
    insert into public.campaigns(gm_id,name,description,settings,catalog) values(u,trim(p->>'name'),coalesce(p->>'description',''),s,'{"lineages":[],"backgrounds":[],"skills":[],"abilities":[]}') returning * into c;
    insert into public.campaign_members(campaign_id,user_id,role,display_name) values(c.id,u,'gm',(select display_name from public.profiles where id=u));
    perform private.log(c.id,'Created the campaign.'); result:=to_jsonb(c);
  elsif p_action='update_campaign' then
    select * into c from public.campaigns where id=(p->>'id')::uuid for update;
    perform private.ensure(c.gm_id=u,'Only the GM can do that.'); perform private.ensure(c.revision=(p->>'revision')::integer,'This record changed on another device. Reload it before saving.');
    perform private.validate_settings(p->'settings'); perform private.validate_catalog(p->'catalog');
    update public.campaigns set name=trim(p->>'name'),description=coalesce(p->>'description',''),settings=p->'settings',catalog=p->'catalog',revision=revision+1,updated_at=now() where id=c.id returning * into c;
    perform private.log(c.id,'Updated campaign rules and content.'); result:=to_jsonb(c);
  elsif p_action='create_invite' then
    c:=private.lock_campaign((p->>'campaign_id')::uuid,true);
    insert into public.invites(campaign_id,code) values(c.id,replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')) returning * into inv; result:=to_jsonb(inv);
  elsif p_action='revoke_invite' then
    select * into inv from public.invites where id=(p->>'id')::uuid for update; c:=private.lock_campaign(inv.campaign_id,true);
    update public.invites set revoked=true where id=inv.id;
  elsif p_action='join_campaign' then
    select * into inv from public.invites where code=trim(p->>'code') for update;
    perform private.ensure(inv.id is not null and not inv.revoked and inv.expires_at>now() and inv.uses<inv.max_uses,'That invitation is invalid, expired, or full.');
    if not private.is_member(inv.campaign_id) then
      insert into public.campaign_members(campaign_id,user_id,role,display_name) values(inv.campaign_id,u,'player',(select display_name from public.profiles where id=u));
      update public.invites set uses=uses+1 where id=inv.id; perform private.log(inv.campaign_id,'Joined the campaign.');
    end if;
    result:=jsonb_build_object('campaign_id',inv.campaign_id);
  elsif p_action='create_character' then
    c:=private.lock_campaign((p->>'campaign_id')::uuid);
    b:='{"lineageId":"","variantId":"","ageYears":null,"ageCategory":"","background":{"kind":"none"},"attributes":{"Power":1,"Toughness":1,"Reflex":1,"Senses":1,"Control":1,"Mind":1,"Will":1,"Emotions":1,"Spirit":1},"skills":{},"abilities":[],"bio":{"height":"","weight":"","eyeColor":"","hairColor":"","oracleId":"","description":""}}';
    insert into public.characters(campaign_id,owner_id,build) values(c.id,u,b) returning * into ch; result:=to_jsonb(ch);
  elsif p_action in ('save_character','finish_character','review_background','award','spend_sparks') then
    -- Campaign lock is acquired before the character lock in every branch.
    select campaign_id into cid from public.characters where id=(p->>'id')::uuid;
    c:=private.lock_campaign(cid,p_action in ('review_background','award'));
    select * into ch from public.characters where id=(p->>'id')::uuid for update;
    perform private.ensure(ch.id is not null,'Character not found.');
    perform private.ensure(ch.revision=(p->>'revision')::integer,'This record changed on another device. Reload it before saving.');
    if p_action='review_background' then
      perform private.ensure(ch.status='draft' and ch.build->'background'->>'kind'='custom' and ch.review->>'status'='pending','No pending background to review.');
      perform private.ensure(p->>'decision' in ('approved','denied'),'Choose approve or deny.');
      review:=jsonb_build_object('status',p->>'decision','comment',coalesce(p->>'comment',''),'reviewed_at',now());
      perform private.validate_build(c.settings,c.catalog,ch.build,review);
      update public.characters set review=app_action.review,revision=revision+1,updated_at=now() where id=ch.id;
      perform private.log(c.id,initcap(p->>'decision')||' '||ch.name||'''s custom background.');
    elsif p_action='award' then
      perform private.ensure(ch.status='active','Finish creation before awarding currency.');
      merit:=private.num(p->'merit','Merit award'); sparks:=private.num(p->'sparks','Sparks award');
      perform private.ensure(merit+sparks>0,'Enter an award.');
      update public.characters set merit=characters.merit+app_action.merit,sparks=characters.sparks+app_action.sparks,revision=revision+1,updated_at=now() where id=ch.id;
      perform private.log(c.id,'Awarded '||ch.name||' '||merit||' Merit and '||sparks||' Sparks.');
    elsif p_action='spend_sparks' then
      perform private.ensure(ch.owner_id=u and ch.status='active','Only the owner of a finished character can spend Sparks.');
      amount:=private.num(p->'amount','Sparks to spend',0.0000000000000001); perform private.ensure(ch.sparks>=amount,'Not enough Sparks.');
      update public.characters set sparks=characters.sparks-amount,revision=revision+1,updated_at=now() where id=ch.id;
      perform private.log(c.id,ch.name||' spent '||amount||' Sparks'||case when coalesce(p->>'reason','')<>'' then ': '||left(p->>'reason',200) else '.' end);
    else
      perform private.ensure(ch.owner_id=u,'Only the character owner can edit this sheet.');
      finishing:=p_action='finish_character'; old_active:=ch.status='active';
      perform private.ensure(not finishing or not old_active,'Character creation is already finished.');
      b:=p->'build'; review:=ch.review;
      if ch.build->'background' is distinct from b->'background' then review:=case when b->'background'->>'kind'='custom' then '{"status":"pending","comment":""}'::jsonb else null end; end if;
      s:=c.settings; cat:=c.catalog;
      if old_active then
        s:=ch.rules->'settings'; original_cat:=ch.rules->'catalog'; cat:='{}';
        old_info:=private.build_info(s,original_cat,ch.build,ch.review);
        foreach category in array array['lineages','backgrounds','skills','abilities'] loop
          frozen_ids:=case category
            when 'lineages' then jsonb_build_array(ch.build->>'lineageId')
            when 'backgrounds' then case when ch.build->'background'->>'kind'='preset' then jsonb_build_array(ch.build->'background'->>'id') else '[]'::jsonb end
            when 'skills' then (old_info->'skills')||coalesce((select jsonb_agg(sk) from jsonb_object_keys(ch.build->'skills') as keys(sk)),'[]')
            else old_info->'abilities' end;
          cat:=jsonb_set(cat,array[category],
            coalesce((select jsonb_agg(e.value) from jsonb_array_elements(original_cat->category) e where frozen_ids ? (e.value->>'id')),'[]') ||
            coalesce((select jsonb_agg(e.value) from jsonb_array_elements(c.catalog->category) e where not (frozen_ids ? (e.value->>'id'))),'[]'));
        end loop;
        foreach k in array array['lineageId','variantId','ageYears','ageCategory','background'] loop perform private.ensure(ch.build->k = b->k,'Creation choices are locked after finishing.'); end loop;
        for k,v in select * from jsonb_each(ch.build->'attributes') loop perform private.ensure((b->'attributes'->>k)::numeric >= (v#>>'{}')::numeric,'Attributes cannot be refunded after creation.'); end loop;
        for k,v in select * from jsonb_each(ch.build->'skills') loop perform private.ensure(coalesce((b->'skills'->>k)::numeric,0)>=(v#>>'{}')::numeric,'Skills cannot be refunded after creation.'); end loop;
        perform private.ensure((b->'abilities') @> (ch.build->'abilities'),'Abilities cannot be refunded after creation.');
      end if;
      info:=private.validate_build(s,cat,b,review,finishing,old_active); merit:=ch.merit; sparks:=ch.sparks;
      if old_active then
        old_info:=private.build_info(s,cat,ch.build,ch.review); delta:=(info->>'spent')::numeric-(old_info->>'spent')::numeric;
        perform private.ensure(delta>=0 and ch.merit>=delta,'Not enough earned Merit.'); merit:=ch.merit-delta;
      end if;
      if finishing then
        perform private.ensure((info->>'merit')::numeric=(info->>'spent')::numeric or coalesce((p->>'discard')::boolean,false),'Are you sure? All unspent Merit will be lost.');
        merit:=0; sparks:=(info->>'sparks')::numeric; perform private.log(c.id,'Finished creating '||(p->>'name')||'.');
      end if;
      update public.characters set name=trim(p->>'name'),build=b,review=app_action.review,merit=app_action.merit,sparks=app_action.sparks,spent=(info->>'spent')::numeric,
        status=case when finishing then 'active' else ch.status end,rules=case when finishing then jsonb_build_object('settings',c.settings,'catalog',c.catalog) when old_active then jsonb_build_object('settings',s,'catalog',cat) else ch.rules end,
        revision=revision+1,updated_at=now() where id=ch.id returning * into ch; result:=to_jsonb(ch);
    end if;
  elsif p_action in ('save_note','delete_note') then
    if nullif(p->>'id','') is not null then
      select * into n from public.notes where id=(p->>'id')::uuid for update;
      perform private.ensure(n.owner_id=u,'Only the author can edit this note.');
      perform private.ensure(n.revision=(p->>'revision')::integer,'This record changed on another device. Reload it before saving.');
    end if;
    if p_action='delete_note' then delete from public.notes where id=n.id;
    else
      cid:=nullif(p->>'campaign_id','')::uuid; if cid is not null then c:=private.lock_campaign(cid); end if;
      perform private.ensure(p->>'audience' in ('private','party','gm','player') and (cid is not null or p->>'audience'='private'),'Choose a valid note audience.');
      owner:=case when p->>'audience'='player' then nullif(p->>'recipient_id','')::uuid else null end;
      perform private.ensure(p->>'audience'<>'player' or exists(select 1 from public.campaign_members where campaign_id=cid and user_id=owner),'Choose a campaign member.');
      if n.id is null then
        insert into public.notes(campaign_id,owner_id,title,body,audience,recipient_id) values(cid,u,trim(p->>'title'),p->>'body',p->>'audience',owner) returning * into n;
      else
        update public.notes set campaign_id=cid,title=trim(p->>'title'),body=p->>'body',audience=p->>'audience',recipient_id=owner,revision=revision+1,updated_at=now() where id=n.id returning * into n;
      end if; result:=to_jsonb(n);
    end if;
  elsif p_action in ('save_item','transfer_item','delete_item') then
    if nullif(p->>'id','') is not null then select * into item from public.items where id=(p->>'id')::uuid; end if;
    c:=private.lock_campaign(coalesce(item.campaign_id,(p->>'campaign_id')::uuid));
    if item.id is not null then
      select * into item from public.items where id=item.id for update;
      perform private.ensure(item.revision=(p->>'revision')::integer,'This record changed on another device. Reload it before saving.');
      perform private.ensure(item.owner_id is null or item.owner_id=u or c.gm_id=u,'Only the item owner or GM can change this item.');
    else perform private.ensure(p_action='save_item','Item not found.'); end if;
    if p_action='delete_item' then delete from public.items where id=item.id;
    elsif p_action='transfer_item' then
      owner:=nullif(p->>'owner_id','')::uuid;
      perform private.ensure(owner is null or exists(select 1 from public.campaign_members where campaign_id=c.id and user_id=owner),'Recipient is not in this campaign.');
      qty:=private.num(p->'quantity','Transfer quantity',1,item.quantity,true)::integer;
      if qty=item.quantity then update public.items set owner_id=owner,revision=revision+1,updated_at=now() where id=item.id;
      else
        update public.items set quantity=quantity-qty,revision=revision+1,updated_at=now() where id=item.id;
        insert into public.items(campaign_id,owner_id,name,quantity,details) values(c.id,owner,item.name,qty,item.details);
      end if;
      perform private.log(c.id,'Transferred '||qty||' × '||item.name||'.');
    else
      owner:=case when item.id is not null then item.owner_id else nullif(p->>'owner_id','')::uuid end;
      perform private.ensure(owner is null or (exists(select 1 from public.campaign_members where campaign_id=c.id and user_id=owner) and (owner=u or c.gm_id=u)),'Choose your inventory or the shared stash.');
      qty:=private.num(p->'quantity','Quantity',1,1000000000,true)::integer;
      if item.id is null then insert into public.items(campaign_id,owner_id,name,quantity,details) values(c.id,owner,trim(p->>'name'),qty,coalesce(p->>'details','')) returning * into item;
      else update public.items set name=trim(p->>'name'),quantity=qty,details=coalesce(p->>'details',''),revision=revision+1,updated_at=now() where id=item.id returning * into item; end if;
      result:=to_jsonb(item);
    end if;
  elsif p_action in ('save_map','delete_map') then
    if nullif(p->>'id','') is not null then select * into mp from public.maps where id=(p->>'id')::uuid; end if;
    c:=private.lock_campaign(coalesce(mp.campaign_id,(p->>'campaign_id')::uuid),true);
    if mp.id is not null then
      select * into mp from public.maps where id=mp.id for update;
      perform private.ensure(mp.revision=(p->>'revision')::integer,'This record changed on another device. Reload it before saving.');
    else perform private.ensure(p_action='save_map','Map not found.'); end if;
    if p_action='delete_map' then delete from public.maps where id=mp.id;
    else
      perform private.ensure(coalesce(p->>'storage_path','')='' or (p->>'storage_path') like c.id::text||'/%','Invalid map storage path.');
      if mp.id is null then
        insert into public.maps(campaign_id,name,scale,image_url,storage_path,visible,grid) values(c.id,trim(p->>'name'),p->>'scale',coalesce(p->>'image_url',''),coalesce(p->>'storage_path',''),(p->>'visible')::boolean,private.num(p->'grid','Grid',0,100,true)) returning * into mp;
      else
        update public.maps set name=trim(p->>'name'),scale=p->>'scale',image_url=coalesce(p->>'image_url',''),storage_path=coalesce(p->>'storage_path',''),visible=(p->>'visible')::boolean,grid=private.num(p->'grid','Grid',0,100,true),revision=revision+1,updated_at=now() where id=mp.id returning * into mp;
      end if; result:=to_jsonb(mp);
    end if;
  elsif p_action in ('save_marker','move_marker','delete_marker') then
    if nullif(p->>'id','') is not null then select * into marker from public.markers where id=(p->>'id')::uuid; end if;
    select * into mp from public.maps where id=coalesce(marker.map_id,(p->>'map_id')::uuid);
    c:=private.lock_campaign(mp.campaign_id);
    -- Serializes map hiding/deletion with marker movement.
    select * into mp from public.maps where id=mp.id for share;
    if marker.id is not null then
      select * into marker from public.markers where id=marker.id for update;
      perform private.ensure(marker.revision=(p->>'revision')::integer,'This record changed on another device. Reload it before saving.');
    else perform private.ensure(p_action='save_marker','Marker not found.'); end if;
    perform private.ensure(c.gm_id=u or (p_action='move_marker' and marker.owner_id=u and mp.visible and not marker.hidden),'Only the GM can manage markers; players can move their own visible markers.');
    if p_action='delete_marker' then delete from public.markers where id=marker.id;
    elsif p_action='move_marker' then update public.markers set x=private.num(p->'x','Position',0,100),y=private.num(p->'y','Position',0,100),revision=revision+1,updated_at=now() where id=marker.id;
    else
      owner:=nullif(p->>'owner_id','')::uuid;
      perform private.ensure(owner is null or exists(select 1 from public.campaign_members where campaign_id=c.id and user_id=owner),'Marker owner must be a campaign member.');
      perform private.ensure(nullif(p->>'character_id','') is null or exists(select 1 from public.characters where id=(p->>'character_id')::uuid and campaign_id=c.id and owner_id=owner),'Choose a character belonging to the marker owner.');
      if marker.id is null then
        insert into public.markers(campaign_id,map_id,owner_id,character_id,name,color,x,y,hidden) values(c.id,mp.id,owner,nullif(p->>'character_id','')::uuid,trim(p->>'name'),p->>'color',private.num(coalesce(p->'x','50'),'Position',0,100),private.num(coalesce(p->'y','50'),'Position',0,100),coalesce((p->>'hidden')::boolean,false)) returning * into marker;
      else
        update public.markers set owner_id=owner,character_id=nullif(p->>'character_id','')::uuid,name=trim(p->>'name'),color=p->>'color',hidden=coalesce((p->>'hidden')::boolean,false),revision=revision+1,updated_at=now() where id=marker.id returning * into marker;
      end if; result:=to_jsonb(marker);
    end if;
  elsif p_action='profile' then
    update public.profiles set display_name=trim(p->>'display_name') where id=u;
    update public.campaign_members set display_name=trim(p->>'display_name') where user_id=u;
  else raise exception 'Unknown action.';
  end if;
  return result;
end;
$$;

-- Create profiles at signup, including accounts awaiting email confirmation.
create function private.new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),'Player'),80)); return new;
end;
$$;
create trigger empyrean_new_user after insert on auth.users for each row execute function private.new_user();
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function private.is_member(uuid),private.is_gm(uuid) to authenticated;
revoke execute on function public.app_snapshot(),public.app_action(text,jsonb) from public,anon;
grant execute on function public.app_snapshot(),public.app_action(text,jsonb) to authenticated;
commit;
