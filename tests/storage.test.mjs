import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database,GM,PLAYER,OUTSIDER } from './database.mjs';
import { DEFAULT_SETTINGS } from '../src/v2/rules.js';

test('Map Storage policies authorize uploads and respect map publication',async t=>{
  const d=await database({ storage: true });t.after(()=>d.close());
  await d.admin(await readFile(new URL('../supabase/storage.sql',import.meta.url),'utf8')); // An existing install can re-run the policy setup.
  const c=await d.action(GM,'create_campaign',{name:'World',settings:DEFAULT_SETTINGS});const inv=await d.action(GM,'create_invite',{campaign_id:c.id});await d.action(PLAYER,'join_campaign',{code:inv.code});
  const path=c.id+'/test.png';
  await assert.rejects(()=>d.as(PLAYER,"insert into storage.objects(bucket_id,name) values('campaign-maps',$1)",[path]),/row-level security/);
  await d.as(GM,"insert into storage.objects(bucket_id,name) values('campaign-maps',$1)",[path]);
  assert.equal((await d.as(GM,'select * from storage.objects')).rows.length,1,'GM can manage an upload before its map record exists');
  let mp=await d.action(GM,'save_map',{campaign_id:c.id,name:'Map',scale:'region',storage_path:path,visible:false,grid:0});
  assert.equal((await d.as(PLAYER,'select * from storage.objects')).rows.length,0);
  assert.equal((await d.as(GM,'select * from storage.objects')).rows.length,1);
  mp=await d.action(GM,'save_map',{...mp,visible:true});
  assert.equal((await d.as(PLAYER,'select * from storage.objects')).rows.length,1);
  assert.equal((await d.as(OUTSIDER,'select * from storage.objects')).rows.length,0);
  await d.as(PLAYER,'delete from storage.objects');assert.equal((await d.as(GM,'select * from storage.objects')).rows.length,1);
  const orphan=c.id+'/replaced.png';
  await d.as(GM,"insert into storage.objects(bucket_id,name) values('campaign-maps',$1)",[orphan]);
  await d.action(GM,'delete_campaign',{id:c.id,revision:c.revision});
  assert.equal((await d.snapshot(PLAYER)).maps.length,0);
  assert.equal((await d.snapshot(PLAYER)).campaign_upload_cleanup.length,0);
  assert.deepEqual((await d.snapshot(GM)).campaign_upload_cleanup[0].paths,[orphan,path]);
  await assert.rejects(d.as(GM,"insert into storage.objects(bucket_id,name) values('campaign-maps',$1)",[c.id+'/late.png']),/row-level security/);
  await d.action(GM,'finish_campaign_cleanup',{campaign_id:c.id});
  assert.equal((await d.snapshot(GM)).campaign_upload_cleanup.length,1);
  await d.as(PLAYER,'delete from storage.objects');
  assert.equal((await d.as(GM,'select * from storage.objects')).rows.length,2);
  await d.as(GM,'delete from storage.objects');
  await d.action(PLAYER,'finish_campaign_cleanup',{campaign_id:c.id});
  assert.equal((await d.snapshot(GM)).campaign_upload_cleanup.length,1);
  await d.action(GM,'finish_campaign_cleanup',{campaign_id:c.id});
  assert.equal((await d.snapshot(GM)).campaign_upload_cleanup.length,0);
});
