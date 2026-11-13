import test from 'node:test';
import assert from 'node:assert/strict';
import { blankBuild, buildInfo, validateBuild, DEFAULT_SETTINGS, settingsFrom } from '../src/v2/rules.js';
import { seedDemo, applyAction, localSnapshot, DEMO_GM as GM, DEMO_PLAYER as PLAYER } from '../src/v2/demo.js';

test('Cumulative attribute and skill costs match the stated rank-by-rank prices',()=>{
  const c=seedDemo().campaigns[0],b=blankBuild();
  assert.equal(buildInfo(c,b).spent,0);
  b.attributes.Power=2;assert.equal(buildInfo(c,b).spent,4);
  b.attributes.Power=3;assert.equal(buildInfo(c,b).spent,10);
  b.attributes.Power=5;assert.equal(buildInfo(c,b).spent,28);
  b.skills.awareness=6;assert.equal(buildInfo(c,b).skillCost,21);
});
test('Only campaign-granted skills are purchasable; zero-rank grants are listed',()=>{
  const c=seedDemo().campaigns[0],b=blankBuild();
  assert.ok(!buildInfo(c,b).skills.includes('navigation'));
  b.abilities=['navigator'];assert.ok(buildInfo(c,b).skills.includes('navigation'));
  b.skills.navigation=1;validateBuild(c,b);
  b.abilities=[];assert.throws(()=>validateBuild(c,b),/no longer available/);
});
test('All budgets accept decimals, creation caps remain integral and bounded',()=>{
  assert.equal(settingsFrom({...DEFAULT_SETTINGS,startingMerit:12.5,startingSparks:12345.5}).startingSparks,12345.5);
  assert.throws(()=>settingsFrom({...DEFAULT_SETTINGS,attributeCap:6}));
  assert.throws(()=>settingsFrom({...DEFAULT_SETTINGS,skillCap:2.5}));
});
test('Finish discards remaining Merit and grants the bypass Sparks bonus; refunds are blocked',()=>{
  const db=seedDemo(),c=db.campaigns[0];c.settings.attributeCap=2;
  let ch=applyAction(db,PLAYER,'create_character',{campaign_id:c.id});
  const b=blankBuild();Object.assign(b,{lineageId:'sample-android',background:{kind:'bypass'}});b.attributes.Power=2;
  assert.throws(()=>applyAction(db,PLAYER,'finish_character',{id:ch.id,revision:1,name:'New Character',build:b}),/unspent Merit/);
  ch=applyAction(db,PLAYER,'finish_character',{id:ch.id,revision:1,name:'New Character',build:b,discard:true});
  assert.equal(ch.merit,0);assert.equal(ch.sparks,4500);
  applyAction(db,GM,'award',{id:ch.id,revision:ch.revision,merit:6,sparks:0});
  const row=db.characters.find(x=>x.id===ch.id),advanced=structuredClone(row.build);advanced.attributes.Power=3;
  ch=applyAction(db,PLAYER,'save_character',{id:row.id,revision:row.revision,name:row.name,build:advanced});
  assert.equal(ch.merit,0);advanced.attributes.Power=2;
  assert.throws(()=>applyAction(db,PLAYER,'save_character',{id:ch.id,revision:ch.revision,name:ch.name,build:advanced}),/refunded/);
});
test('Private notes stay private, direct notes reach their recipient, stale transfers fail',()=>{
  const db=seedDemo(),cid=db.campaigns[0].id;
  applyAction(db,PLAYER,'save_note',{campaign_id:cid,title:'Secret',body:'Private thought',audience:'private'});
  applyAction(db,PLAYER,'save_note',{campaign_id:cid,title:'For GM',body:'Question',audience:'gm'});
  assert.ok(!localSnapshot(db,GM).notes.some(n=>n.title==='Secret'));
  assert.ok(localSnapshot(db,GM).notes.some(n=>n.title==='For GM'));
  const item=db.items.find(i=>i.owner_id===null);
  applyAction(db,PLAYER,'transfer_item',{id:item.id,revision:item.revision,quantity:1,owner_id:PLAYER});
  assert.throws(()=>applyAction(db,PLAYER,'transfer_item',{id:item.id,revision:1,quantity:1,owner_id:PLAYER}),/another device/);
});
