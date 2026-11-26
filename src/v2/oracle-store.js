import { CARD_DEFAULTS, createSide, selectAwakening } from './awakening.js';
import { blankEstimate, validateEstimate } from './oracle-core.js';
import { demand, clone } from './rules.js';

export function oracleSnapshot(db,userId,campaigns,characters){
  const member=id=>campaigns.some(c=>c.id===id),gm=id=>campaigns.some(c=>c.id===id&&c.gm_id===userId);
  return {
    awakenings:(db.awakenings||[]).filter(a=>characters.some(c=>c.id===a.character_id)),
    oracle_estimates:(db.oracle_estimates||[]).filter(e=>member(e.campaign_id)&&(e.requester_id===userId||gm(e.campaign_id))),
    oracle_valuations:(db.oracle_valuations||[]).filter(v=>member(v.campaign_id)),
    oracle_reviews:(db.oracle_reviews||[]).filter(v=>member(v.campaign_id)&&(gm(v.campaign_id)||(db.oracle_estimates||[]).some(e=>e.id===v.estimate_id&&e.requester_id===userId))),
    oracle_rules:(db.oracle_rules||[]).filter(v=>member(v.campaign_id)),
  };
}
export function oracleAction(db,userId,action,p){
  if(!action.startsWith('awakening_')&&!action.startsWith('oracle_'))return undefined;
  for(const k of ['awakenings','oracle_estimates','oracle_valuations','oracle_reviews','oracle_rules'])db[k]??=[];
  const campaign=id=>{const c=db.campaigns.find(c=>c.id===id&&db.members.some(m=>m.campaign_id===id&&m.user_id===userId));demand(c,'Campaign not found.');return c;};
  const gm=c=>demand(c.gm_id===userId,'Only the GM can do that.');
  const now=()=>new Date().toISOString(),id=()=>crypto.randomUUID();
  if(action.startsWith('awakening_')){
    const ch=db.characters.find(c=>c.id===p.character_id);demand(ch,'Character not found.');campaign(ch.campaign_id);demand(ch.owner_id===userId&&!ch.npc,'Only the character owner can resolve awakening.');
    let a=db.awakenings.find(a=>a.character_id===ch.id);
    if(action==='awakening_draw'){
      demand(['input','output'].includes(p.side),'Choose an awakening side.');
      if(!a){a={character_id:ch.id,campaign_id:ch.campaign_id,status:'drawing',generation_method:'cards',ruleset_version:CARD_DEFAULTS.version,input:null,output:null,selection:null};db.awakenings.push(a);}
      if(!a[p.side]){demand(a.status!=='selected','Awakening choices are locked.');a[p.side]=createSide();}
      return clone(a);
    }
    demand(action==='awakening_select'&&a,'Draw affinities first.');Object.assign(a,selectAwakening(a,p.input,p.output));return clone(a);
  }
  const existing=p.id?db.oracle_estimates.find(e=>e.id===p.id):null;
  const c=campaign(existing?.campaign_id||p.campaign_id);
  if(action==='oracle_submit'){
    demand(typeof p.request==='string'&&p.request.trim().length>0&&p.request.length<=6000,'Describe an action in at most 6,000 characters.');
    demand(typeof(p.context||'')==='string'&&(p.context||'').length<=4000,'Context is too long.');
    if(p.character_id)demand(db.characters.some(ch=>ch.id===p.character_id&&ch.campaign_id===c.id&&!ch.npc&&(ch.owner_id===userId||c.gm_id===userId)),'Choose an authorized character.');
    if(p.client_id){const found=db.oracle_estimates.find(e=>e.requester_id===userId&&e.client_id===p.client_id);if(found)return clone(found);}
    const e={id:id(),campaign_id:c.id,requester_id:userId,client_id:p.client_id||id(),character_id:p.character_id||null,request:p.request.trim(),context:p.context||'',proposal:null,provider_status:'manual',provider_error:null,status:'proposed',revision:1,created_at:now(),model:null};db.oracle_estimates.push(e);return clone(e);
  }
  if(action==='oracle_rules'){
    gm(c);demand(typeof p.rules==='string'&&p.rules.length<=6000,'Campaign instructions are too long.');
    const r=db.oracle_rules.find(r=>r.campaign_id===c.id);if(r)demand(r.revision===p.revision,'Instructions changed; reload.');
    const next={campaign_id:c.id,rules:p.rules,revision:(r?.revision||0)+1};if(r)Object.assign(r,next);else db.oracle_rules.push(next);return next;
  }
  if(action==='oracle_review'||action==='oracle_direct'){
    gm(c);if(existing)demand(existing.status==='proposed'&&existing.revision===p.revision,'This request has already changed.');
    demand(action==='oracle_direct'||existing,'Request not found.');
    demand(['approve','deny','clarify'].includes(p.decision),'Choose a review decision.');
    demand(typeof p.rationale==='string'&&p.rationale.length<=2000,'Enter a concise rationale.');
    const proposal=p.ruling||blankEstimate(),approved=p.decision==='approve';
    if(approved){validateEstimate(proposal,db.oracle_valuations.filter(v=>v.campaign_id===c.id));demand(['input','output'].some(k=>proposal[k].essentia!==null),'Approve at least one known value.');}
    const details=p.details||{};
    demand(['conditions','scope','tags'].every(k=>typeof(details[k]||'')==='string'&&(details[k]||'').length<=2000)&&['none','linear'].includes(details.scaling||'none')&&(details.benchmark===undefined||typeof details.benchmark==='boolean'),'Invalid ruling scope.');
    const review={id:id(),campaign_id:c.id,estimate_id:existing?.id||null,reviewer_id:userId,decision:p.decision,ruling:approved?clone(proposal):null,rationale:p.rationale,details,created_at:now()};db.oracle_reviews.push(review);
    if(approved)for(const operation of ['input','output']){
      const side=proposal[operation];if(side.essentia===null)continue;
      const previous=p.supersedes?db.oracle_valuations.find(v=>v.id===p.supersedes&&v.campaign_id===c.id&&v.status==='approved'):null;
      if(p.supersedes)demand(previous&&previous.operation===operation,'Supersession must replace the same operation.');
      if(previous)previous.status='superseded';
      db.oracle_valuations.push({id:id(),campaign_id:c.id,operation,...clone(side),conditions:details.conditions||'',scope:details.scope||'',scaling:details.scaling||'none',tags:(details.tags||'').split(',').map(t=>t.trim()).filter(Boolean),benchmark:!!details.benchmark,rationale:p.rationale,approver_id:userId,approved_at:now(),source_estimate_id:existing?.id||null,review_id:review.id,status:'approved',supersedes:previous?.id||null});
    }
    if(existing){existing.status=approved?'approved':p.decision==='deny'?'denied':'proposed';existing.revision++;}
    return clone(review);
  }
  throw Error('Unknown Oracle action.');
}
