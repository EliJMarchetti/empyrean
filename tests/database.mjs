import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

export const GM='00000000-0000-4000-8000-000000000001';
export const PLAYER='00000000-0000-4000-8000-000000000002';
export const OUTSIDER='00000000-0000-4000-8000-000000000003';
export async function database({ gmTools = true, designer = gmTools, drafts = designer, journal = drafts, storage = false } = {}) {
  const db=new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin;
    create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
  `);
  await db.exec(await readFile(new URL('../supabase/migrations/001_campaigns.sql',import.meta.url),'utf8'));
  if (gmTools) await db.exec(await readFile(new URL('../supabase/migrations/002_gm_tools.sql',import.meta.url),'utf8'));
  if (designer) await db.exec(await readFile(new URL('../supabase/migrations/003_designer_studio.sql',import.meta.url),'utf8'));
  if (drafts) await db.exec(await readFile(new URL('../supabase/migrations/004_designer_drafts.sql',import.meta.url),'utf8'));
  if (journal) await db.exec(await readFile(new URL('../supabase/migrations/005_linked_journal.sql',import.meta.url),'utf8'));
  if (storage) {
    // Emulate the Supabase-owned tables used by our storage policies.
    await db.exec(`create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(p text) returns text[] language sql immutable as $$ select (string_to_array(p,'/'))[1:array_length(string_to_array(p,'/'),1)-1] $$;
      grant usage on schema storage to authenticated; grant select,insert,delete on storage.objects to authenticated;
    `);
    await db.exec(await readFile(new URL('../supabase/storage.sql',import.meta.url),'utf8'));
  }
  for(const [id,name] of [[GM,'Game Master'],[PLAYER,'Player One'],[OUTSIDER,'Another Player']])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,JSON.stringify({display_name:name})]);
  async function as(user,sql,params=[]) {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
    await db.exec('set role '+(user?'authenticated':'anon'));
    return db.query(sql,params);
  }
  return {
    db, as,
    async action(user,action,payload={}){return (await as(user,'select public.app_action($1,$2::jsonb) as result',[action,JSON.stringify(payload)])).rows[0].result;},
    async snapshot(user){return (await as(user,'select public.app_snapshot() as result')).rows[0].result;},
    async admin(sql,params=[]){await db.exec('reset role');return params.length?db.query(sql,params):db.exec(sql);},
    close:()=>db.close(),
  };
}
