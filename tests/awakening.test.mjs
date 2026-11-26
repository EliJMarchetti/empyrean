import test from 'node:test';
import assert from 'node:assert/strict';
import {DOMAINS,discipline,deck,resolveDraw,selectAwakening,CARD_DEFAULTS} from '../src/v2/awakening.js';
import {testResult,efficiency,conversionAmounts,magnitude,requiredInput,essentia} from '../src/v2/essentia.js';
import {blankEstimate,validateEstimate,compatibility,retrievePrecedents,precedentConflicts,estimateMath} from '../src/v2/oracle-core.js';
import {seedDemo,applyAction,localSnapshot,DEMO_GM as GM,DEMO_PLAYER as PLAYER} from '../src/v2/demo.js';

test('Canonical names and complete awakening deck match the working specification',()=>{
  assert.equal(DOMAINS.length,10);const names=DOMAINS.flatMap(i=>DOMAINS.map(o=>discipline(i.id,o.id)));
  assert.equal(new Set(names).size,100);assert.ok(names.every(n=>!/mancy|mancer/i.test(n)));
  for(const [i,o,name] of [['mass','mass','Arkhemetry'],['mass','energy','Arkhevis'],['energy','mass','Dynametry'],['time','entropy','Chronophthora'],['life','information','Bionoesis'],['everything','nothing','Omnicide'],['nothing','everything','Chaogenesis'],['nothing','nothing','Chaocide']])assert.equal(discipline(i,o),name);
  const cards=deck();assert.equal(cards.length,54);assert.equal(new Set(cards.map(c=>c.id)).size,54);
  for(const [kind,n] of [['ace',4],['restricted',32],['unrestricted',16],['absolute',2]])assert.equal(cards.filter(c=>c.kind===kind).length,n);
  for(const d of DOMAINS.slice(0,8)){assert.equal(cards.filter(c=>c.domain===d.id&&c.kind==='restricted').length,4);assert.equal(cards.filter(c=>c.domain===d.id&&c.kind==='unrestricted').length,2);}
  assert.equal(cards.find(c=>c.id==='red-joker').domain,'everything');assert.equal(cards.find(c=>c.id==='black-joker').domain,'nothing');
});
test('Recursive Aces retain every option with no replacement and reject undrawn choices',()=>{
  const ids=['A-hearts','2-clubs','A-spades','J-diamonds','black-joker'];
  const cards=deck(),ordered=[...ids.map(id=>cards.find(c=>c.id===id)),...cards.filter(c=>!ids.includes(c.id))];
  const input=resolveDraw(ordered,()=>0);assert.deepEqual(input.draws.map(c=>c.id),ids);assert.equal(input.options.length,3);assert.equal(new Set(input.draws.map(c=>c.id)).size,5);
  const output=resolveDraw(ordered,()=>0);assert.deepEqual(input,output,'Each side receives a fresh full deck.');
  const record={input,output,status:'drawing'};assert.throws(()=>selectAwakening(record,'3-clubs','J-diamonds'),/only drawn/);
  const result=selectAwakening(record,'2-clubs','J-diamonds');assert.equal(result.selection.input.suit,'clubs');assert.equal(result.selection.input.restriction,null);assert.throws(()=>selectAwakening(result,'2-clubs','J-diamonds'),/locked/);
  assert.equal(CARD_DEFAULTS.status,'provisional');
});
test('Two-d6 mechanics, specialization, efficiency, exact arithmetic and magnitude boundaries',()=>{
  for(const [dice,n] of [[[1,1],1],[[5,5],5],[[6,6],6],[[5,6],11]])assert.equal(testResult(dice,3,5).result,n);
  assert.equal(testResult([1,1],1,1).rawHits,2);assert.equal(testResult([1,1],1,1,true).effectiveHits,4);
  for(let hits=0;hits<=8;hits++)assert.equal(efficiency(hits),Math.min(100,60+10*hits));
  assert.deepEqual(conversionAmounts('1000',3),{output:'900',spillover:'100'});
  assert.deepEqual(conversionAmounts('999999999999999999999999999999',4),{output:'999999999999999999999999999999',spillover:'0'});
  for(let p=0;p<29;p++){assert.equal(magnitude('1'+'0'.repeat(p)),p);if(p)assert.equal(magnitude('9'.repeat(p)),p-1);}
  assert.equal(magnitude('0.1'),null);assert.equal(magnitude('0'),null);
  assert.equal(requiredInput('900',90),'1000');assert.equal(requiredInput('900',60),'1500');assert.equal(requiredInput('1',60),'1.666667');
  assert.throws(()=>essentia('1e100'));assert.throws(()=>essentia(123));assert.throws(()=>essentia('-1'));assert.throws(()=>essentia('0'.repeat(100)));assert.equal(essentia(null,{nullable:true}),null);
});
test('Structured estimates reject malformed values/references and check awakening separately',()=>{
  const v=blankEstimate();assert.equal(validateEstimate(v).input.essentia,null);
  const invalid=structuredClone(v);invalid.input.essentia=0;assert.throws(()=>validateEstimate(invalid));
  invalid.input.essentia='9999999999999999999999999999999';assert.throws(()=>validateEstimate(invalid));
  invalid.input.essentia='10';invalid.input.domain='life';invalid.input.lower='20';assert.throws(()=>validateEstimate(invalid));
  invalid.input.lower=null;invalid.input.precedent_ids=[crypto.randomUUID()];assert.throws(()=>validateEstimate(invalid));
  v.input.domain='life';v.output.domain='information';
  const a={status:'selected',selection:{input:{domain:'life',kind:'unrestricted'},output:{domain:'information',kind:'unrestricted'}}};assert.equal(compatibility(a,v).status,'compatible');
  a.selection.input.domain='mass';assert.equal(compatibility(a,v).status,'incompatible');a.selection.input.domain='everything';assert.equal(compatibility(a,v).status,'requires_review');
  v.input.domain='nothing';assert.equal(compatibility(a,v).status,'incompatible');
  v.output.essentia='900';assert.deepEqual(estimateMath(v),{requiresAdjudication:true,inputMagnitude:null,outputMagnitude:null,requirements:[]});
});
test('Preview saves draws, manual rulings, revisions and campaign-scoped independent precedents',()=>{
  const db=seedDemo(),campaign=db.campaigns[0],ch=db.characters[0];
  const draw=applyAction(db,PLAYER,'awakening_draw',{character_id:ch.id,side:'input'});
  assert.deepEqual(applyAction(db,PLAYER,'awakening_draw',{character_id:ch.id,side:'input'}),draw);
  applyAction(db,PLAYER,'awakening_draw',{character_id:ch.id,side:'output'});
  const a=db.awakenings[0];applyAction(db,PLAYER,'awakening_select',{character_id:ch.id,input:a.input.options[0].id,output:a.output.options[0].id});
  assert.equal(localSnapshot(db,PLAYER).awakenings[0].status,'selected');
  const e=applyAction(db,PLAYER,'oracle_submit',{campaign_id:campaign.id,request:'Sacrifice lifespan for knowledge',client_id:crypto.randomUUID()});
  const ruling=blankEstimate();Object.assign(ruling.input,{domain:'life',description:'Sacrificed lifespan',quantity:'1',unit:'hour',essentia:'30',method:'adjudicated'});
  assert.throws(()=>applyAction(db,PLAYER,'oracle_review',{id:e.id,revision:1,decision:'approve',ruling,rationale:'No'}),/Only the GM/);
  applyAction(db,GM,'oracle_review',{id:e.id,revision:1,decision:'approve',ruling,rationale:'Campaign example; no canonical value implied.',details:{scope:'Same lifespan conditions',scaling:'linear'}});
  assert.equal(db.oracle_estimates[0].proposal,null);assert.equal(db.oracle_valuations[0].essentia,'30');
  assert.equal(retrievePrecedents(db.oracle_valuations,campaign.id,'lifespan')[0].operation,'input');assert.equal(retrievePrecedents(db.oracle_valuations,crypto.randomUUID(),'lifespan').length,0);
  const old=db.oracle_valuations[0];ruling.input.essentia='20';applyAction(db,GM,'oracle_direct',{campaign_id:campaign.id,decision:'approve',ruling,rationale:'Revision',supersedes:old.id});
  assert.equal(old.status,'superseded');assert.equal(retrievePrecedents(db.oracle_valuations,campaign.id,'lifespan')[0].essentia,'20');
});
test('Conflicting equivalent approvals surface for GM resolution without averaging',()=>{
  const record={campaign_id:'a',operation:'input',domain:'life',description:'Lifespan',quantity:'1',unit:'hour',conditions:'Permanent',scope:'Natural lifespan',scaling:'linear',status:'approved',essentia:'30'};
  assert.equal(precedentConflicts([record,{...record,essentia:'30.0'}]).length,0);
  const conflict=precedentConflicts([record,{...record,essentia:'20'},{...record,status:'superseded',essentia:'100'}]);assert.equal(conflict.length,1);assert.deepEqual(conflict[0].map(p=>p.essentia),['30','20']);
  assert.equal(precedentConflicts([record,{...record,campaign_id:'b',essentia:'20'}]).length,0);
});
