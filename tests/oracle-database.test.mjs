import test from 'node:test';
import assert from 'node:assert/strict';
import {database,GM,PLAYER,OUTSIDER} from './database.mjs';
import {blankEstimate} from '../src/v2/oracle-core.js';
import {DEFAULT_SETTINGS} from '../src/v2/rules.js';

const asService=async(d,args)=>{await d.admin('reset role');await d.db.exec('set role service_role');return (await d.db.query('select public.oracle_provider($1,$2,$3,$4,$5::jsonb,$6,$7,$8::uuid[]) as result',args)).rows[0].result;};
test('Awakening and campaign Oracle enforce persistence, review authority, audit history and retrieval',async t=>{
  const d=await database();t.after(()=>d.close());
  const c=await d.action(GM,'create_campaign',{name:'Oracle A',settings:DEFAULT_SETTINGS}),other=await d.action(OUTSIDER,'create_campaign',{name:'Oracle B',settings:DEFAULT_SETTINGS});
  const invite=await d.action(GM,'create_invite',{campaign_id:c.id});await d.action(PLAYER,'join_campaign',{code:invite.code});
  const ch=await d.action(PLAYER,'create_character',{campaign_id:c.id});
  await t.test('Draws are idempotent, persisted, independently replenished and never client-supplied',async()=>{
    await assert.rejects(()=>d.action(GM,'awakening_draw',{character_id:ch.id,side:'input'}),/owner/);
    const input=await d.action(PLAYER,'awakening_draw',{character_id:ch.id,side:'input',cards:['red-joker']});
    assert.deepEqual(await d.action(PLAYER,'awakening_draw',{character_id:ch.id,side:'input'}),input);
    const both=await d.action(PLAYER,'awakening_draw',{character_id:ch.id,side:'output'});
    for(const side of ['input','output']){const {draws,options}=both[side];assert.equal(new Set(draws.map(c=>c.id)).size,draws.length);assert.equal(draws.length,1+2*draws.filter(c=>c.kind==='ace').length);assert.ok(options.every(c=>c.kind!=='ace'));}
    await assert.rejects(()=>d.action(PLAYER,'awakening_select',{character_id:ch.id,input:'made-up',output:both.output.options[0].id}),/only drawn/);
    const selected=await d.action(PLAYER,'awakening_select',{character_id:ch.id,input:both.input.options[0].id,output:both.output.options[0].id});assert.equal(selected.status,'selected');assert.equal(selected.selection.input.restriction,null);
    assert.deepEqual((await d.snapshot(PLAYER)).awakenings[0],selected);
    await assert.rejects(()=>d.action(PLAYER,'awakening_select',{character_id:ch.id,input:both.input.options[0].id,output:both.output.options[0].id}),/locked/);
    assert.equal((await d.snapshot(OUTSIDER)).awakenings.length,0);
    await assert.rejects(()=>d.as(PLAYER,"update public.awakenings set selection='{}'"),/permission denied/);
  });
  const client_id=crypto.randomUUID();let e=await d.action(PLAYER,'oracle_submit',{campaign_id:c.id,character_id:ch.id,request:'Sacrifice one hour of lifespan to learn monster habits',context:'Permanent sacrifice',client_id});
  await t.test('Submission is idempotent and private; provider failure keeps the original request',async()=>{
    assert.equal((await d.action(PLAYER,'oracle_submit',{campaign_id:c.id,request:e.request,client_id})).id,e.id);
    await assert.rejects(()=>d.action(OUTSIDER,'oracle_submit',{campaign_id:c.id,request:'Intrude',client_id:crypto.randomUUID()}),/Campaign not found/);
    await assert.rejects(()=>d.action(OUTSIDER,'oracle_submit',{campaign_id:other.id,character_id:ch.id,request:'Intrude',client_id:crypto.randomUUID()}),/authorized character/);
    await assert.rejects(()=>d.as(PLAYER,'select public.oracle_provider($1,$2,$3)',[e.id,PLAYER,'begin']),/permission denied/);
    let run=await asService(d,[e.id,PLAYER,'begin',null,null,null,null,[]]);
    await asService(d,[e.id,PLAYER,'fail',run.lease,null,null,'Provider unavailable',[]]);
    e=(await d.snapshot(PLAYER)).oracle_estimates[0];assert.equal(e.request,'Sacrifice one hour of lifespan to learn monster habits');assert.equal(e.provider_status,'failed');assert.equal(e.proposal,null);
    assert.equal((await d.snapshot(OUTSIDER)).oracle_estimates.length,0);
    assert.equal((await d.as(OUTSIDER,'select * from public.oracle_estimates')).rows.length,0);
  });
  const proposal=blankEstimate();Object.assign(proposal.input,{domain:'life',description:'Permanent sacrifice of remaining natural lifespan',quantity:'1',unit:'hour',essentia:'100',method:'adjudicated'});Object.assign(proposal.output,{domain:'information',description:'General monster habits',quantity:'1',unit:'species',essentia:'70',method:'adjudicated'});proposal.confidence='novel';
  await t.test('Only server role saves validated AI proposals; original independent prices survive GM edits',async()=>{
    const run=await asService(d,[e.id,PLAYER,'begin',null,null,null,null,[]]);
    const bad=structuredClone(proposal);bad.input.essentia='-1';await assert.rejects(()=>asService(d,[e.id,PLAYER,'finish',run.lease,JSON.stringify(bad),'test',null,[]]),/Invalid Essentia/);
    bad.input.essentia='30';bad.input.precedent_ids=[crypto.randomUUID()];await assert.rejects(()=>asService(d,[e.id,PLAYER,'finish',run.lease,JSON.stringify(bad),'test',null,[]]),/Unknown or inactive/);
    await asService(d,[e.id,PLAYER,'finish',run.lease,JSON.stringify(proposal),'test-model',null,[]]);
    e=(await d.snapshot(PLAYER)).oracle_estimates[0];assert.equal(e.proposal.input.essentia,'100');assert.equal(e.proposal.output.essentia,'70');
    const ruling=structuredClone(proposal);ruling.input.essentia='30';
    await assert.rejects(()=>d.action(PLAYER,'oracle_review',{id:e.id,revision:e.revision,decision:'approve',ruling,rationale:'Hijack'}),/Only the GM/);
    await d.action(GM,'oracle_review',{id:e.id,revision:e.revision,decision:'approve',ruling,rationale:'Test campaign-specific lifespan ruling; not a canonical rate.',details:{scope:'Permanent natural lifespan under equivalent circumstances',conditions:'One willing living subject',scaling:'linear',benchmark:true,tags:'lifespan,life'}});
    const snapshot=await d.snapshot(GM);assert.equal(snapshot.oracle_estimates[0].proposal.input.essentia,'100');assert.equal(snapshot.oracle_reviews[0].ruling.input.essentia,'30');assert.equal(snapshot.oracle_valuations.length,2);assert.equal(snapshot.oracle_valuations.find(v=>v.operation==='output').essentia,'70');
    await assert.rejects(()=>d.action(GM,'oracle_review',{id:e.id,revision:e.revision,decision:'deny',rationale:'stale'}),/changed/);
  });
  let next=await d.action(PLAYER,'oracle_submit',{campaign_id:c.id,request:'Use lifespan to create energy',client_id:crypto.randomUUID()});
  await t.test('Retrieval crosses discipline pairs, includes only active approvals and minimizes private data',async()=>{
    let ctx=(await d.as(PLAYER,'select public.oracle_ai_context($1) as ctx',[next.id])).rows[0].ctx;
    assert.equal(ctx.precedents.find(v=>v.operation==='input').essentia,'30');assert.ok(ctx.precedents.every(v=>v.status==='approved'));assert.equal(ctx.character,null);assert.ok(!JSON.stringify(ctx).includes('raw_user_meta_data'));
    await assert.rejects(()=>d.as(OUTSIDER,'select public.oracle_ai_context($1)',[next.id]),/not found/);
    const denied=await d.action(PLAYER,'oracle_submit',{campaign_id:c.id,request:'lifespan',client_id:crypto.randomUUID()});await d.action(GM,'oracle_review',{id:denied.id,revision:denied.revision,decision:'deny',rationale:'Insufficient scope'});
    assert.equal((await d.as(PLAYER,'select public.oracle_ai_context($1) as ctx',[next.id])).rows[0].ctx.precedents.length,ctx.precedents.length);
    const previous=ctx.precedents.find(v=>v.operation==='input'),ruling=blankEstimate();Object.assign(ruling.input,proposal.input,{essentia:'20'});
    await d.action(GM,'oracle_direct',{campaign_id:c.id,decision:'approve',ruling,rationale:'Superseding ruling',supersedes:previous.id,details:{scope:'Equivalent permanent lifespan'}});
    ctx=(await d.as(PLAYER,'select public.oracle_ai_context($1) as ctx',[next.id])).rows[0].ctx;assert.equal(ctx.precedents.find(v=>v.operation==='input').essentia,'20');assert.ok(!ctx.precedents.some(v=>v.id===previous.id));
    assert.equal((await d.snapshot(GM)).oracle_valuations.find(v=>v.id===previous.id).status,'superseded');
    await assert.rejects(()=>d.action(OUTSIDER,'oracle_direct',{campaign_id:c.id,decision:'approve',ruling,rationale:'No'}),/Campaign not found/);
    await assert.rejects(()=>d.as(PLAYER,"update public.oracle_valuations set essentia='999'"),/permission denied/);
  });
  await t.test('Unknown values stay null, manual review and clarification work without any provider',async()=>{
    const unknown=blankEstimate();await assert.rejects(()=>d.action(GM,'oracle_direct',{campaign_id:c.id,decision:'approve',ruling:unknown,rationale:'No values'}),/at least one/);
    const r=await d.action(GM,'oracle_review',{id:next.id,revision:next.revision,decision:'clarify',rationale:'How much lifespan?'});assert.equal(r.decision,'clarify');
    next=(await d.snapshot(PLAYER)).oracle_estimates.find(x=>x.id===next.id);assert.equal(next.status,'proposed');
    const ruling=blankEstimate();Object.assign(ruling.input,{domain:'life',description:'New scoped lifespan',essentia:'0',method:'adjudicated'});
    await d.action(GM,'oracle_review',{id:next.id,revision:next.revision,decision:'approve',ruling,rationale:'Explicit zero for this test condition.'});
    const rows=(await d.snapshot(PLAYER)).oracle_valuations.filter(v=>v.source_estimate_id===next.id);assert.equal(rows.length,1);assert.equal(rows[0].essentia,'0');
  });
});
