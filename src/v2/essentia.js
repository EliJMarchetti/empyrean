import { demand } from './rules.js';
const SCALE=1000000n;
// Storage precision is a safeguard, not a ruling on fractional Essentia in play.
export function essentia(value,{nullable=false}={}) {
  if(value===null&&nullable)return null;
  demand(typeof value==='string'&&/^(0|[1-9]\d{0,29})(\.\d{1,6})?$/.test(value),'Essentia must be a nonnegative decimal string below 10^30, with at most six decimal places.');
  return value;
}
const scaled=v=>{essentia(v);const [a,b='']=v.split('.');return BigInt(a)*SCALE+BigInt(b.padEnd(6,'0'));};
const decimal=v=>{const a=v/SCALE,b=String(v%SCALE).padStart(6,'0').replace(/0+$/,'');return String(a)+(b?'.'+b:'');};
export function magnitude(value) {
  const n=scaled(value);return n<SCALE?null:String(n/SCALE).length-1;
}
export function testResult(dice,attribute,skill,specialized=false) {
  demand(Array.isArray(dice)&&dice.length===2&&dice.every(d=>Number.isInteger(d)&&d>=1&&d<=6),'Roll two d6.');
  demand(Number.isInteger(attribute)&&attribute>=1&&attribute<=5,'Attribute must be 1–5.');
  demand(Number.isInteger(skill)&&skill<=10,'Invalid effective skill.');
  const result=dice[0]===dice[1]?dice[0]:dice[0]+dice[1],rawHits=dice.filter(d=>d<=attribute).length;
  return {result,success:result<=skill,rawHits,effectiveHits:rawHits*(specialized?2:1)};
}
export function efficiency(hits){demand(Number.isInteger(hits)&&hits>=0&&hits<=8,'Effective hits must be 0–8.');return Math.min(100,60+10*hits);}
export function conversionAmounts(acquired,hits){const n=scaled(acquired),output=n*BigInt(efficiency(hits))/100n;return {output:decimal(output),spillover:decimal(n-output)};}
export function requiredInput(output,percent){demand([60,70,80,90,100].includes(percent),'Use an established efficiency.');return decimal((scaled(output)*100n+BigInt(percent)-1n)/BigInt(percent));}
