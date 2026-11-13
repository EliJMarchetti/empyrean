import { cp, mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'dist');
await mkdir(out,{recursive:true});
for(const file of ['legacy.html','src/main.js','src/styles.css','data/empyrean-system-content.json']){
  await unlink(resolve(out,file)).catch(error=>{if(error.code!=='ENOENT')throw error;});
}
for(const file of ['index.html','config.js','SETUP.md','robots.txt','editor.html','designer/index.html']){
  await cp(resolve(root,file),resolve(out,file));
}
await cp(resolve(root,'src/v2'),resolve(out,'src/v2'),{recursive:true});
await cp(resolve(root,'src/assets'),resolve(out,'src/assets'),{recursive:true});
// Repository variables contain PUBLIC values only.
if(process.env.SUPABASE_URL||process.env.SUPABASE_PUBLISHABLE_KEY){
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)throw Error('Set both Supabase repository variables.');
  if(process.env.SUPABASE_PUBLISHABLE_KEY.startsWith('sb_secret_'))throw Error('Never publish a Supabase secret key.');
  await writeFile(resolve(out,'config.js'),'window.EMPYREAN_CONFIG = '+JSON.stringify({supabaseUrl:process.env.SUPABASE_URL,supabasePublishableKey:process.env.SUPABASE_PUBLISHABLE_KEY},null,2)+';\n');
}
await writeFile(resolve(out,'.nojekyll'),'');
console.log('Static site prepared in dist/.');
