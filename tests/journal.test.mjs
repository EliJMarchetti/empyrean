import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database, GM, PLAYER, OUTSIDER } from './database.mjs';
import { DEFAULT_SETTINGS } from '../src/v2/rules.js';
import { noteLinkIndex, noteTags } from '../src/v2/journal.js';
import { applyAction, localSnapshot, seedDemo, DEMO_GM, DEMO_PLAYER } from '../src/v2/demo.js';

const OTHER = '00000000-0000-4000-8000-000000000004';

test('Journal migration preserves old notes and enforces sharing per campaign',async t=>{
  const d=await database({journal:false});t.after(()=>d.close());
  await d.admin('insert into auth.users(id) values ($1)',[OTHER]);
  const make=(owner,name)=>d.action(owner,'create_campaign',{name,settings:DEFAULT_SETTINGS});
  const join=async (owner,campaign,users)=>{
    const invite=await d.action(owner,'create_invite',{campaign_id:campaign.id});
    for(const user of users)await d.action(user,'join_campaign',{code:invite.code});
  };
  const first=await make(GM,'Relay'),second=await make(GM,'Station'),third=await make(GM,'Moon'),unrelated=await make(OUTSIDER,'Other world');
  await join(GM,first,[PLAYER,OTHER]);await join(GM,second,[PLAYER,OUTSIDER]);await join(GM,third,[OUTSIDER]);
  const original=await d.action(PLAYER,'save_note',{campaign_id:first.id,title:'Old party note',body:'Earlier',audience:'party'});
  const formerGm=await d.action(PLAYER,'save_note',{campaign_id:first.id,title:'Old message to GM',body:'Earlier',audience:'player',recipient_id:GM});
  await d.admin(await readFile(new URL('../supabase/migrations/005_linked_journal.sql',import.meta.url),'utf8'));
  const find=async(user,id)=>(await d.snapshot(user)).notes.find(n=>n.id===id);
  assert.equal((await find(GM,original.id)).all_players,true);
  assert.equal((await find(GM,formerGm.id)).share_gm,true);
  assert.ok(!await find(OTHER,formerGm.id));
  assert.ok(!await find(OUTSIDER,original.id));

  await assert.rejects(d.action(PLAYER,'set_campaign_setting',{id:first.id,revision:first.revision,setting_name:'Forgery'}),/Only the GM/);
  const grouped=await d.action(GM,'set_campaign_setting',{id:first.id,revision:first.revision,setting_name:'Meridian'});
  const setting=grouped.setting_id;
  for(const c of [second,third])await d.action(GM,'set_campaign_setting',{id:c.id,revision:c.revision,setting_id:setting});
  await assert.rejects(d.action(OUTSIDER,'set_campaign_setting',{id:unrelated.id,revision:unrelated.revision,setting_id:setting}),/one of your settings/);
  const payload={campaign_id:first.id,title:'A shared clue',body:'[[Old party note]] #relays',scope:'setting',shared_with:[OUTSIDER],share_gm:false,all_players:false};
  await assert.rejects(d.action(PLAYER,'save_note',{...payload,campaign_id:third.id}),/Campaign not found/);
  const note=await d.action(PLAYER,'save_note',payload);
  assert.equal(note.owner_id,PLAYER);
  await assert.rejects(d.action(PLAYER,'save_note',{id:note.id,revision:note.revision,title:note.title,body:note.body,audience:'private'}),/Reload the journal/);
  assert.deepEqual((await d.snapshot(OUTSIDER)).note_journals[note.id],[second.id]);
  assert.deepEqual((await d.snapshot(PLAYER)).note_journals[note.id].sort(),[first.id,second.id].sort());
  assert.ok(!await find(OTHER,note.id));
  assert.ok(!await find(GM,note.id));
  assert.equal((await d.as(GM,'select id from public.notes where id=$1',[note.id])).rows.length,0);
  assert.equal((await d.as(null,'select has_table_privilege(current_user,\'public.notes\',\'select\') as allowed')).rows[0].allowed,false);
  await assert.rejects(d.action(OUTSIDER,'save_note',{...payload,id:note.id,revision:note.revision}),/Only the author/);
  const changed=await d.action(PLAYER,'save_note',{...payload,id:note.id,revision:note.revision,share_gm:true,shared_with:[]});
  assert.ok(await find(GM,note.id));assert.ok(!await find(OUTSIDER,note.id));
  const broadcast=await d.action(PLAYER,'save_note',{...payload,id:note.id,revision:changed.revision,all_players:true,shared_with:[]});
  assert.ok(await find(OTHER,note.id));assert.ok(!await find(GM,note.id));
  assert.deepEqual((await d.snapshot(OUTSIDER)).note_journals[note.id],[second.id]);
  await assert.rejects(d.action(PLAYER,'save_note',{...payload,id:note.id,revision:changed.revision}),/changed on another device/);

  const worldPayload={...payload,id:note.id,revision:broadcast.revision,scope:'world',all_players:true,shared_with:[]};
  await assert.rejects(d.action(PLAYER,'save_note',worldPayload),/Confirm that the GM/);
  const world=await d.action(PLAYER,'save_note',{...worldPayload,transfer_to_gm:true});
  assert.equal(world.owner_id,GM);assert.equal(world.author_id,PLAYER);assert.equal(world.world_note,true);
  assert.deepEqual((await d.snapshot(OUTSIDER)).note_journals[note.id].sort(),[second.id,third.id].sort());
  await assert.rejects(d.action(PLAYER,'delete_note',{id:world.id,revision:world.revision}),/Only the author/);
  await d.action(GM,'delete_campaign',{id:first.id,revision:grouped.revision});
  assert.ok(await find(GM,world.id));assert.ok(!await find(GM,original.id));
  for(const c of [second,third])await d.action(GM,'delete_campaign',{id:c.id,revision:c.revision+1});
  const retained=await d.action(GM,'save_note',{id:world.id,revision:world.revision,scope:'world',title:'Retained world note',body:'Continues',all_players:true});
  assert.equal(retained.setting_id,setting);assert.equal(retained.author_id,PLAYER);
  assert.ok(!await find(OUTSIDER,world.id));
});

test('Device preview enforces independent visibility and world ownership',()=>{
  const db=seedDemo(),c=db.campaigns[0];
  const act=(user,action,p)=>applyAction(db,user,action,p);
  act(DEMO_GM,'set_campaign_setting',{id:c.id,revision:c.revision,setting_name:'Meridian'});
  const payload={campaign_id:c.id,title:'Preview note',body:'',scope:'setting',share_gm:false,all_players:false,shared_with:[]};
  const note=act(DEMO_PLAYER,'save_note',payload);
  assert.ok(!localSnapshot(db,DEMO_GM).notes.some(n=>n.id===note.id));
  const world=act(DEMO_PLAYER,'save_note',{...payload,id:note.id,revision:note.revision,scope:'world',transfer_to_gm:true});
  assert.ok(!localSnapshot(db,DEMO_PLAYER).notes.some(n=>n.id===world.id));
  assert.deepEqual(localSnapshot(db,DEMO_GM).note_journals[world.id],[c.id]);
});

test('Wikilinks resolve by visible title or stable ID, and tags normalize',()=>{
  const id='00000000-0000-4000-8000-000000000001';
  const body=`[[A Relay]] and [[${id}]] and [[Forbidden]] #Signal #signal #crew-2`;
  const links=noteLinkIndex([{id,title:'A Relay'}])(body);
  assert.deepEqual(links.map(link=>link.id),[id,id,undefined]);
  assert.equal(noteLinkIndex([])(body)[1].label,'Unavailable note');
  assert.equal(noteLinkIndex([{id,title:'New title'}])(body)[1].label,'New title');
  assert.deepEqual(noteTags(body),['signal','crew-2']);
});
