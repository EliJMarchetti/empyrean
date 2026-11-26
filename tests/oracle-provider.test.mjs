import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOracle} from '../supabase/functions/oracle/handler.js';
import {blankEstimate} from '../src/v2/oracle-core.js';

const id=crypto.randomUUID(),caller=crypto.randomUUID(),lease=crypto.randomUUID();
const config={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'public',SUPABASE_SERVICE_ROLE_KEY:'server-only',ORACLE_ALLOWED_ORIGINS:'https://goodlands.space',OPENAI_API_KEY:'provider-only',ORACLE_MODEL:'configured-model'};
const env=k=>config[k]||'';
const req=()=>new Request('https://example.supabase.co/functions/v1/oracle',{method:'POST',headers:{Origin:'https://goodlands.space',Authorization:'Bearer user-session'},body:JSON.stringify({id})});
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json'}});
test('Provider uses caller RLS, no tools, structured output, server-only credentials and original request context',async()=>{
  const calls=[],proposal=blankEstimate();proposal.input.domain='life';proposal.output.domain='information';
  const fetcher=async(url,options={})=>{calls.push({url,options});
    if(url.endsWith('/auth/v1/user'))return json({id:caller});
    if(url.endsWith('/oracle_ai_context'))return json({request:'Lifespan for knowledge',precedents:[],character:null});
    if(url.endsWith('/oracle_provider')){const b=JSON.parse(options.body);if(b.operation==='begin')return json({lease});assert.equal(b.operation,'finish');assert.deepEqual(b.proposal,proposal);return json({saved:true});}
    assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(options.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.tools,undefined);assert.equal(body.model,'configured-model');assert.equal(body.reasoning,undefined,'Do not add model-family parameters to arbitrary overrides.');assert.match(body.input,/Lifespan/);return json({status:'completed',model:'configured-model',output:[{content:[{type:'output_text',text:JSON.stringify(proposal)}]}]});
  };
  const response=await handleOracle(req(),env,fetcher);assert.equal(response.status,200);assert.deepEqual(await response.json(),{id,saved:true});
  assert.equal(calls.find(c=>c.url.endsWith('/oracle_ai_context')).options.headers.Authorization,'Bearer user-session');
  assert.equal(calls.find(c=>c.url.endsWith('/oracle_provider')).options.headers.Authorization,'Bearer server-only');
});
test('The default model and GPT-6.2 overrides use low reasoning with a portable strict schema',async()=>{
  for(const override of ['', 'gpt-6.2-astra']){
    const expectedModel=override||'gpt-6.2-sol',proposal=blankEstimate();let providerCalled=false;
    const response=await handleOracle(req(),k=>k==='ORACLE_MODEL'?override:env(k),async(url,options={})=>{
      if(url.endsWith('/auth/v1/user'))return json({id:caller});
      if(url.endsWith('/oracle_ai_context'))return json({precedents:[]});
      if(url.endsWith('/oracle_provider')){const b=JSON.parse(options.body);if(b.operation==='begin')return json({lease});assert.equal(b.operation,'finish');assert.equal(b.model,expectedModel);return json({saved:true});}
      assert.equal(url,'https://api.openai.com/v1/responses');providerCalled=true;
      const body=JSON.parse(options.body),format=body.text.format;
      assert.equal(body.model,expectedModel);assert.deepEqual(body.reasoning,{effort:'low'});assert.equal(body.max_output_tokens,4500);
      assert.equal(format.strict,true);assert.equal(format.schema.additionalProperties,false);
      assert.ok(!JSON.stringify(format.schema).includes('"maxLength"'),'Application-only length limits are not sent to the provider schema dialect.');
      assert.equal(format.schema.properties.input.properties.precedent_ids.maxItems,12);
      assert.equal(format.schema.properties.input.properties.precedent_ids.items.format,'uuid');
      assert.match(format.schema.properties.input.properties.essentia.anyOf[0].pattern,/0,29/);
      return json({status:'completed',model:expectedModel,output:[{content:[{type:'output_text',text:JSON.stringify(proposal)}]}]});
    });
    assert.equal(providerCalled,true);assert.equal(response.status,200);
  }
});
test('Missing configuration preserves manual request and never fabricates an estimate',async()=>{
  const response=await handleOracle(req(),k=>k==='OPENAI_API_KEY'?'':env(k),async url=>{if(url.endsWith('/auth/v1/user'))return json({id:caller});assert.ok(url.endsWith('/oracle_ai_context'));return json({precedents:[]});});
  assert.equal(response.status,503);assert.match((await response.json()).error,/saved for manual/);
});
test('Provider errors, refusals, malformed values and fake citations are safely recorded as failures',async()=>{
  for(const kind of ['provider','refusal','bad-number','fake-reference','oversized-text','incomplete']){
    let failed=false;
    const fetcher=async(url,options={})=>{
      if(url.endsWith('/auth/v1/user'))return json({id:caller});
      if(url.endsWith('/oracle_ai_context'))return json({precedents:[]});
      if(url.endsWith('/oracle_provider')){const b=JSON.parse(options.body);if(b.operation==='begin')return json({lease});assert.equal(b.operation,'fail');assert.equal(b.lease,lease);failed=true;return json({saved:true});}
      if(kind==='provider')return json({error:'unavailable'},503);
      const p=blankEstimate();if(kind==='bad-number')p.input.essentia=-50;if(kind==='fake-reference')p.input.precedent_ids=[crypto.randomUUID()];if(kind==='oversized-text')p.summary='x'.repeat(2001);
      return json({status:kind==='incomplete'?'incomplete':'completed',...(kind==='incomplete'?{incomplete_details:{reason:'max_output_tokens'}}:{}),output:[{content:kind==='refusal'?[{type:'refusal',refusal:'Cannot estimate'}]:[{type:'output_text',text:JSON.stringify(p)}]}]});
    };
    const response=await handleOracle(req(),env,fetcher);assert.equal(response.status,400,kind);assert.equal(failed,true,kind);
  }
});
test('Unauthorized callers and other origins never reach AI or service-role mutations',async()=>{
  let calls=0;
  const response=await handleOracle(req(),env,async()=>{calls++;return json({},401);});assert.equal(response.status,401);assert.equal(calls,1);
  const evil=new Request('https://example.supabase.co/functions/v1/oracle',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'});
  assert.equal((await handleOracle(evil,env,()=>{throw Error('Unexpected');})).status,403);
});
