import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
for (const dir of ['src/v2', 'scripts', 'tests','supabase/functions/oracle']) {
  for (const file of await readdir(resolve(root, dir))) {
    if (!/\.(m?js)$/.test(file)) continue;
    const result = spawnSync(process.execPath, ['--check', resolve(root, dir, file)], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
const config=spawnSync(process.execPath,[resolve(root,'scripts/sync-awakening-config.mjs'),'--check'],{stdio:'inherit'});
if(config.status!==0)process.exit(config.status||1);
console.log('JavaScript syntax checks passed.');
