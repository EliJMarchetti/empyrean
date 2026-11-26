import {readFile,writeFile} from 'node:fs/promises';
import {CARD_DEFAULTS,deck} from '../src/v2/awakening.js';
const path=new URL('../supabase/migrations/20261126022017_awakening_oracle.sql',import.meta.url);
const content=await readFile(path,'utf8');
const sql=`insert into private.awakening_config(version,cards) values ('${CARD_DEFAULTS.version}','${JSON.stringify(deck()).replaceAll("'","''")}'::jsonb);`;
const next=content.replace(/-- AWAKENING_CONFIG\n(?:insert into private\.awakening_config[^\n]*\n)?/,`-- AWAKENING_CONFIG\n${sql}\n`);
if(process.argv.includes('--check')){if(content!==next)throw Error('Awakening config snapshot is stale. Run node scripts/sync-awakening-config.mjs.');}else await writeFile(path,next);
