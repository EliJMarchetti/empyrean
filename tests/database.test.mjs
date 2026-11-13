import test from 'node:test';
import assert from 'node:assert/strict';
import { database, GM, PLAYER, OUTSIDER } from './database.mjs';
import { DEFAULT_SETTINGS, blankBuild, buildInfo } from '../src/v2/rules.js';
import { sampleCatalog } from '../src/v2/demo.js';

test('PostgreSQL campaign, character, sharing, and authorization workflows',async t=>{
  const d=await database();t.after(()=>d.close());
  let c=await d.action(GM,'create_campaign',{name:'Connected world',settings:{...DEFAULT_SETTINGS,attributeCap:2,skillCap:2}});
  c=await d.action(GM,'update_campaign',{...c,catalog:sampleCatalog()});
  const invite=await d.action(GM,'create_invite',{campaign_id:c.id});
  await d.action(PLAYER,'join_campaign',{code:invite.code});
  await d.action(PLAYER,'join_campaign',{code:invite.code});
  assert.equal((await d.snapshot(GM)).invites[0].uses,1,'Joining twice does not consume twice');

  await t.test('Membership and write permissions are enforced by PostgreSQL',async()=>{
    assert.equal((await d.snapshot(OUTSIDER)).campaigns.length,0);
    await assert.rejects(()=>d.action(PLAYER,'update_campaign',{...c,name:'Hijacked'}),/Only the GM/);
    await assert.rejects(()=>d.as(PLAYER,"update public.characters set merit=999"),/permission denied/);
    await assert.rejects(()=>d.as(PLAYER,'select private.validate_settings($1::jsonb)',[JSON.stringify(DEFAULT_SETTINGS)]),/permission denied/);
    await assert.rejects(()=>d.action(OUTSIDER,'create_character',{campaign_id:c.id}),/Campaign not found/);
    await assert.rejects(()=>d.action(null,'join_campaign',{code:invite.code}),/permission denied/);
  });
  let ch=await d.action(PLAYER,'create_character',{campaign_id:c.id});const b=blankBuild();
  Object.assign(b,{lineageId:'sample-terran',variantId:'planetborn',ageCategory:'medium',ageYears:25,background:{kind:'bypass'}});
  b.attributes.Power=2;b.skills.awareness=2;
  await t.test('Illegal builds, age omissions, caps, and budget tampering fail',async()=>{
    const invalid=structuredClone(b);invalid.attributes.Power=3;
    await assert.rejects(()=>d.action(PLAYER,'save_character',{id:ch.id,revision:1,name:'Sera',build:invalid}),/Attribute.*range/);
    const badSkill=structuredClone(b);badSkill.skills.navigation=1;
    await assert.rejects(()=>d.action(PLAYER,'save_character',{id:ch.id,revision:1,name:'Sera',build:badSkill}),/no longer available/);
    const badAge=structuredClone(b);badAge.ageCategory='';
    await assert.rejects(()=>d.action(PLAYER,'finish_character',{id:ch.id,revision:1,name:'Sera',build:badAge,discard:true}),/age category/);
    await assert.rejects(()=>d.action(PLAYER,'finish_character',{id:ch.id,revision:1,name:'Sera',build:b}),/unspent Merit/);
    const missing=structuredClone(b);delete missing.attributes.Spirit;
    await assert.rejects(()=>d.action(PLAYER,'save_character',{id:ch.id,revision:1,name:'Sera',build:missing}),/nine attributes/);
  });
  await t.test('Draft save persists across sessions and stays private from other players',async()=>{
    ch=await d.action(PLAYER,'save_character',{id:ch.id,revision:ch.revision,name:'Sera',build:b});
    await d.action(OUTSIDER,'join_campaign',{code:invite.code});
    assert.equal((await d.snapshot(OUTSIDER)).characters.length,0);
    assert.equal((await d.snapshot(GM)).characters[0].name,'Sera');
    assert.equal((await d.snapshot(PLAYER)).characters[0].spent,buildInfo(c,b).spent);
  });
  await t.test('Finish drops unspent Merit, releases creation caps, and prevents refunds',async()=>{
    ch=await d.action(PLAYER,'finish_character',{id:ch.id,revision:ch.revision,name:'Sera',build:b,discard:true});
    assert.equal(ch.merit,0);assert.equal(ch.sparks,4500);assert.equal(ch.status,'active');
    await assert.rejects(()=>d.action(PLAYER,'award',{id:ch.id,revision:ch.revision,merit:100,sparks:0}),/Only the GM/);
    await d.action(GM,'award',{id:ch.id,revision:ch.revision,merit:12,sparks:500});
    ch=(await d.snapshot(PLAYER)).characters[0];const advanced=structuredClone(ch.build);advanced.attributes.Power=3;advanced.skills.awareness=3;
    ch=await d.action(PLAYER,'save_character',{id:ch.id,revision:ch.revision,name:'Sera',build:advanced});
    assert.equal(ch.merit,3);assert.equal(ch.sparks,5000);
    const refund=structuredClone(ch.build);refund.attributes.Power=2;
    await assert.rejects(()=>d.action(PLAYER,'save_character',{id:ch.id,revision:ch.revision,name:'Sera',build:refund}),/refunded/);
    await assert.rejects(()=>d.action(PLAYER,'save_character',{id:ch.id,revision:1,name:'Sera',build:ch.build}),/another device/);
    await assert.rejects(()=>d.action(PLAYER,'spend_sparks',{id:ch.id,revision:ch.revision,amount:5001}),/Not enough Sparks/);
    await d.action(PLAYER,'spend_sparks',{id:ch.id,revision:ch.revision,amount:250,reason:'Equipment'});
    assert.equal((await d.snapshot(PLAYER)).characters[0].sparks,4750);
    assert.equal((await d.snapshot(OUTSIDER)).characters[0].id,ch.id,'Finalized sheets visible to party');
  });
  await t.test('Custom backgrounds require approval and changes invalidate approval',async()=>{
    let draft=await d.action(OUTSIDER,'create_character',{campaign_id:c.id});const build=blankBuild();build.lineageId='sample-android';build.background={kind:'custom',name:'Pilot',answers:Object.fromEntries(c.settings.backgroundFields.map(k=>[k,'A complete answer'])),skills:['navigation'],abilities:['navigator']};
    draft=await d.action(OUTSIDER,'save_character',{id:draft.id,revision:1,name:'Pilot',build});assert.equal(draft.review.status,'pending');
    await assert.rejects(()=>d.action(OUTSIDER,'review_background',{id:draft.id,revision:draft.revision,decision:'approved'}),/Only the GM/);
    await assert.rejects(()=>d.action(OUTSIDER,'finish_character',{id:draft.id,revision:draft.revision,name:'Pilot',build,discard:true}),/approve/);
    await d.action(GM,'review_background',{id:draft.id,revision:draft.revision,decision:'approved',comment:'Welcome aboard.'});
    draft=(await d.snapshot(OUTSIDER)).characters.find(x=>x.id===draft.id);assert.equal(draft.review.status,'approved');
    build.skills.navigation=1;
    draft=await d.action(OUTSIDER,'save_character',{id:draft.id,revision:draft.revision,name:'Pilot',build});
    build.background.name='Pilot changed';delete build.skills.navigation;
    draft=await d.action(OUTSIDER,'save_character',{id:draft.id,revision:draft.revision,name:'Pilot',build});assert.equal(draft.review.status,'pending');
  });
  await t.test('Private, party, GM, and direct notes have distinct read permissions',async()=>{
    for(const audience of ['private','party','gm','player'])await d.action(PLAYER,'save_note',{campaign_id:c.id,title:audience,body:'Note',audience,recipient_id:audience==='player'?OUTSIDER:null});
    await d.action(PLAYER,'save_note',{title:'Personal notebook',body:'Mine',audience:'private'});
    const gmNotes=(await d.snapshot(GM)).notes.map(n=>n.title),otherNotes=(await d.snapshot(OUTSIDER)).notes.map(n=>n.title);
    assert.deepEqual(gmNotes.sort(),['gm','party']);assert.deepEqual(otherNotes.sort(),['party','player']);
    assert.equal((await d.snapshot(PLAYER)).notes.length,5);
    const n=(await d.snapshot(GM)).notes[0];await assert.rejects(()=>d.action(GM,'delete_note',{id:n.id,revision:n.revision}),/Only the author/);
  });
  await t.test('Inventory transfers are atomic and ownership protected',async()=>{
    const i=await d.action(PLAYER,'save_item',{campaign_id:c.id,name:'Rations',quantity:5,owner_id:PLAYER});
    await assert.rejects(()=>d.action(OUTSIDER,'transfer_item',{id:i.id,revision:1,owner_id:OUTSIDER,quantity:1}),/owner or GM/);
    await d.action(PLAYER,'transfer_item',{id:i.id,revision:1,owner_id:OUTSIDER,quantity:2});
    const items=(await d.snapshot(GM)).items;assert.equal(items.reduce((a,i)=>a+i.quantity,0),5);assert.equal(items.find(i=>i.owner_id===OUTSIDER).quantity,2);
    await assert.rejects(()=>d.action(PLAYER,'transfer_item',{id:i.id,revision:1,owner_id:null,quantity:1}),/another device/);
  });
  await t.test('Hidden maps and markers never appear in player snapshots; own visible tokens move',async()=>{
    let map=await d.action(GM,'save_map',{campaign_id:c.id,name:'Secret map',scale:'scene',image_url:'https://example.com/map.png',visible:false,grid:12});
    const marker=await d.action(GM,'save_marker',{map_id:map.id,name:'Sera',color:'#123456',owner_id:PLAYER,character_id:ch.id,x:10,y:10});
    const secret=await d.action(GM,'save_marker',{map_id:map.id,name:'Secret',color:'#123456',hidden:true,x:70,y:70});
    assert.equal((await d.snapshot(PLAYER)).maps.length,0);assert.equal((await d.snapshot(PLAYER)).markers.length,0);
    await assert.rejects(()=>d.action(PLAYER,'move_marker',{id:marker.id,revision:1,x:20,y:20}),/Only the GM/);
    map=await d.action(GM,'save_map',{...map,visible:true});
    assert.equal((await d.snapshot(PLAYER)).maps.length,1);assert.equal((await d.snapshot(PLAYER)).markers.length,1);
    await assert.rejects(()=>d.action(OUTSIDER,'move_marker',{id:marker.id,revision:1,x:20,y:20}),/Only the GM/);
    await d.action(PLAYER,'move_marker',{id:marker.id,revision:1,x:20,y:20});
    assert.equal((await d.snapshot(GM)).markers.find(m=>m.id===marker.id).x,20);
    assert.ok(!(await d.snapshot(PLAYER)).markers.some(m=>m.id===secret.id));
  });
  await t.test('Expired or revoked invites stop new joins',async()=>{
    await d.action(GM,'revoke_invite',{id:invite.id});await assert.rejects(()=>d.action(OUTSIDER,'join_campaign',{code:invite.code}),/invalid, expired/);
  });
  await t.test('New purchases use current prices and keep their rules after later GM edits',async()=>{
    let current=(await d.snapshot(PLAYER)).characters.find(x=>x.id===ch.id);
    await d.action(GM,'award',{id:current.id,revision:current.revision,merit:30,sparks:0});
    c=(await d.snapshot(GM)).campaigns[0];const catalog=structuredClone(c.catalog);catalog.abilities.find(a=>a.id==='navigator').cost=9;
    c=await d.action(GM,'update_campaign',{...c,catalog});
    current=(await d.snapshot(PLAYER)).characters.find(x=>x.id===ch.id);let build=structuredClone(current.build);build.abilities.push('navigator');
    current=await d.action(PLAYER,'save_character',{id:current.id,revision:current.revision,name:current.name,build});
    const balance=current.merit;
    const edited=structuredClone(c.catalog);Object.assign(edited.abilities.find(a=>a.id==='navigator'),{cost:99,enabled:false,skills:[]});
    c=await d.action(GM,'update_campaign',{...c,catalog:edited});
    build.skills.navigation=1;
    current=await d.action(PLAYER,'save_character',{id:current.id,revision:current.revision,name:current.name,build});
    assert.equal(current.merit,balance-1);assert.equal(current.rules.catalog.abilities.find(a=>a.id==='navigator').cost,9);
    assert.deepEqual(current.rules.catalog.abilities.find(a=>a.id==='navigator').skills,['navigation']);
  });
});
