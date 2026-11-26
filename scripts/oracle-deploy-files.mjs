import {readFile} from 'node:fs/promises';
// Package the same canonical modules for MCP deployment; no duplicated rule source.
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const files=[{name:'index.ts',content:await read('supabase/functions/oracle/index.ts')},{name:'handler.js',content:(await read('supabase/functions/oracle/handler.js')).replace('../../../src/v2/oracle-core.js','./shared/oracle-core.js')}];
for(const name of ['oracle-core.js','awakening.js','essentia.js','rules.js'])files.push({name:'shared/'+name,content:await read('src/v2/'+name)});
process.stdout.write(JSON.stringify(files));
