// No SDK or browser secrets. Auth and RLS use the application's existing REST conventions.
import { ESTIMATE_SCHEMA, ORACLE_SYSTEM, validateEstimate, precedentConflicts } from '../../../src/v2/oracle-core.js';

const reply=(body,status,headers)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
export async function handleOracle(req,env,fetch=globalThis.fetch){
  const origins=()=>(env('ORACLE_ALLOWED_ORIGINS')||'https://goodlands.space,https://www.goodlands.space,https://elijmarchetti.github.io').split(',').map(s=>s.trim()).filter(Boolean);
  const origin=req.headers.get('origin')||'',allowed=origins();
  const headers={'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0]||'https://goodlands.space','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
  if(origin&&!allowed.includes(origin))return reply({error:'Origin is not configured for Oracle.'},403,headers);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'Use POST.'},405,headers);
  const url=env('SUPABASE_URL'),key=env('SUPABASE_ANON_KEY'),secret=env('SUPABASE_SERVICE_ROLE_KEY');
  const authorization=req.headers.get('Authorization')||'';
  let id,caller,lease;
  const rpc=async(name,body,server=false)=>{
    const response=await fetch(`${url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:server?secret:key,Authorization:server?`Bearer ${secret}`:authorization,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
    const data=await response.json();if(!response.ok)throw Error(data.message||'Oracle database request failed.');return data;
  };
  try{
    if(!authorization.startsWith('Bearer '))return reply({error:'Sign in first.'},401,headers);
    const auth=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:authorization},signal:AbortSignal.timeout(10000)});
    if(!auth.ok)return reply({error:'Sign in again to continue.'},401,headers);
    caller=(await auth.json()).id;
    const raw=await req.text();if(raw.length>1000)throw Error('Invalid request size.');
    id=JSON.parse(raw).id;if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw Error('Invalid request identifier.');
    const context=await rpc('oracle_ai_context',{estimate_id:id});
    context.conflicts=precedentConflicts(context.precedents).map(group=>group.map(p=>p.id));
    if(!env('OPENAI_API_KEY')||!env('ORACLE_MODEL'))return reply({error:'AI is not configured. Your request is saved for manual GM review.'},503,headers);
    lease=(await rpc('oracle_provider',{estimate_id:id,caller,operation:'begin'},true)).lease;
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env('OPENAI_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:env('ORACLE_MODEL'),store:false,instructions:ORACLE_SYSTEM,input:JSON.stringify(context),max_output_tokens:4500,text:{format:{type:'json_schema',name:'essentia_estimate',strict:true,schema:ESTIMATE_SCHEMA}}}),signal:AbortSignal.timeout(40000)});
    if(!response.ok)throw Error('AI provider unavailable. Your request remains saved for manual GM review.');
    const result=await response.json();
    if(result.status!=='completed')throw Error('AI did not complete a valid estimate. Manual GM review is available.');
    const text=result.output?.flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
    const proposal=validateEstimate(JSON.parse(text),context.precedents);
    await rpc('oracle_provider',{estimate_id:id,caller,operation:'finish',lease,proposal,model:result.model,refs:context.precedents.map(p=>p.id)},true);
    return reply({id,saved:true},200,headers);
  }catch(error){
    const message=error instanceof Error?error.message:'Estimator could not complete this request.';
    if(lease&&id&&caller)try{await rpc('oracle_provider',{estimate_id:id,caller,operation:'fail',lease,error:'The estimator could not complete a valid response. Your original request is preserved; manual GM review is available.'},true);}catch{/* A concurrent review or expired lease must not be overwritten. */}
    return reply({error:message},400,headers);
  }
}
