import { demand } from './rules.js';

export const RULESET = 'awakening-1';
export const DOMAINS = Object.freeze([
  ['mass','Mass','Arkhe','metry','Physical matter and composition.'],
  ['energy','Energy','Dyna','vis','Physical energy and energetic transfers.'],
  ['time','Time','Chrono','mora','Consume duration to accelerate; produce duration to slow.'],
  ['space','Space','Topo','locus','Spatial extension, distance, and geometry.'],
  ['information','Information','Lexo','noesis','Encoded patterns, knowledge, and memories.'],
  ['entropy','Entropy','Entro','phthora','Thermodynamic entropy and physical organization.'],
  ['life','Life','Bio','thesis','Vitality and biological animation.'],
  ['chance','Chance','Tycho','alea','Likelihood of specified possible outcomes.'],
  ['everything','Everything','Omni','genesis','Any ordinary domain on this side; excludes Nothing.'],
  ['nothing','Nothing','Chao','cide','Genuine creation or annihilation; limits require GM adjudication.'],
].map(([id,name,prefix,suffix,description],i)=>Object.freeze({id,name,prefix,suffix,description,classification:i<8?'ordinary':'absolute',status:'established'})));
export const domain = id => DOMAINS.find(d=>d.id===id);
export function discipline(input,output) {
  demand(domain(input)&&domain(output),'Choose valid domains.');
  return domain(input).prefix+domain(output).suffix;
}
// Working, configurable assignments. Suits intentionally have no restriction meaning.
export const CARD_DEFAULTS = Object.freeze({
  version:RULESET, status:'provisional', recursiveAces:true,
  restricted:{2:'mass',3:'energy',4:'time',5:'space',6:'information',7:'entropy',8:'life',9:'chance'},
  unrestricted:{'10-hearts':'mass','10-diamonds':'mass','10-clubs':'energy','10-spades':'energy','J-hearts':'time','J-diamonds':'time','J-clubs':'space','J-spades':'space','Q-hearts':'information','Q-diamonds':'information','Q-clubs':'entropy','Q-spades':'entropy','K-hearts':'life','K-diamonds':'life','K-clubs':'chance','K-spades':'chance'},
});
export function deck(config=CARD_DEFAULTS) {
  return ['hearts','diamonds','clubs','spades'].flatMap(suit=>['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(rank=>{
    const id=rank+'-'+suit, ace=rank==='A';
    return {id,rank,suit,kind:ace?'ace':Number(rank)<=9?'restricted':'unrestricted',domain:ace?null:config.restricted[rank]||config.unrestricted[id]};
  })).concat([{id:'red-joker',rank:'joker',suit:'red',kind:'absolute',domain:'everything'},{id:'black-joker',rank:'joker',suit:'black',kind:'absolute',domain:'nothing'}]);
}
export function cardName(card) {
  if(card.rank==='joker')return card.suit==='red'?'Red Joker':'Black Joker';
  return ({A:'Ace',J:'Jack',Q:'Queen',K:'King'}[card.rank]||card.rank)+' of '+card.suit[0].toUpperCase()+card.suit.slice(1);
}
export function randomIndex(size) {
  const limit=2**32-(2**32%size), buffer=new Uint32Array(1);
  do{crypto.getRandomValues(buffer);}while(buffer[0]>=limit);
  return buffer[0]%size;
}
// Policies can later supply predetermined affinities without using the card generator.
export function resolveDraw(cards,choose=randomIndex,{recursiveAces=true}={}) {
  const remaining=[...cards],draws=[];let pending=1;
  while(pending>0){demand(remaining.length,'Awakening deck exhausted.');const [card]=remaining.splice(choose(remaining.length),1);draws.push(card);pending--;if(card.kind==='ace'&&(recursiveAces||draws.length===1))pending+=2;}
  return {draws,options:draws.filter(c=>c.kind!=='ace')};
}
export function createSide(policy={method:'cards'},config=CARD_DEFAULTS) {
  demand(policy.method==='cards','This affinity policy is not configured yet.');
  return resolveDraw(deck(config),randomIndex,config);
}
export function selectAwakening(record,input,output) {
  demand(record.input&&record.output,'Resolve both sides before selecting.');
  const a=record.input.options.find(c=>c.id===input),b=record.output.options.find(c=>c.id===output);
  demand(a&&b,'Select only drawn affinity options.');
  demand(record.status!=='selected','Awakening choices are already locked.');
  return {...record,status:'selected',selection:{input:{...a,restriction:null,specializations:[]},output:{...b,restriction:null,specializations:[]}}};
}
