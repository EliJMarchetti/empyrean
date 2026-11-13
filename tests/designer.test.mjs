import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database, GM, PLAYER, OUTSIDER } from './database.mjs';
import { blankBuild, DEFAULT_SETTINGS } from '../src/v2/rules.js';
import { removeCatalogEntry } from '../src/v2/catalog.js';

test('Designer publishing updates every campaign and protects finished character rules', async t => {
  const d = await database({ designer: false });
  t.after(() => d.close());
  const create = (owner, name) => d.action(owner, 'create_campaign', { name, settings: DEFAULT_SETTINGS });
  const existing = await create(PLAYER, 'Existing campaign');
  await d.admin(await readFile(new URL('../supabase/migrations/003_designer_studio.sql', import.meta.url), 'utf8'));
  await d.admin('insert into private.game_designers(user_id) values ($1)', [GM]);
  assert.equal((await d.snapshot(GM)).can_design, true);
  assert.equal((await d.snapshot(PLAYER)).can_design, false);
  const catalog = {
    lineages: [{ id: 'official-voyager', name: 'Voyager', ageRequired: false, variants: [{ id: 'orbital', name: 'Orbital', skills: ['official-piloting'] }] }],
    backgrounds: [{ id: 'official-courier', name: 'Courier', abilities: ['official-star-chart'] }],
    skills: [{ id: 'official-piloting', name: 'Piloting', generic: true }],
    abilities: [{ id: 'official-star-chart', name: 'Star Chart', cost: 4, skills: ['official-piloting'] }],
  };
  await assert.rejects(d.action(PLAYER, 'publish_catalog', { revision: 1, catalog }), /Only a game designer/);
  await assert.rejects(d.as(PLAYER, 'update public.official_catalog set catalog = \'{}\''), /permission denied/);
  await assert.rejects(d.as(PLAYER, 'insert into private.game_designers(user_id) values ($1)', [PLAYER]), /permission denied/);
  await assert.rejects(d.as(null, 'select * from public.official_catalog'), /permission denied/);
  const published = await d.action(GM, 'publish_catalog', { revision: 1, catalog });
  assert.equal(published.revision, 2);
  assert.deepEqual((await d.snapshot(OUTSIDER)).official_catalog.catalog, catalog);
  assert.deepEqual((await d.snapshot(PLAYER)).campaigns[0].catalog, catalog);
  assert.deepEqual((await create(OUTSIDER, 'Future campaign')).catalog, catalog);
  const campaign = (await d.snapshot(PLAYER)).campaigns[0];
  assert.equal(campaign.revision, existing.revision + 1);
  const local = structuredClone(campaign.catalog);
  local.lineages[0].name = 'Overridden name';
  local.backgrounds.push({ id: 'local-crew', name: 'Local Crew', abilities: ['official-star-chart'] });
  const updated = await d.action(PLAYER, 'update_campaign', { ...campaign, catalog: local });
  assert.equal(updated.catalog.lineages[0].name, 'Voyager');
  assert.equal(updated.catalog.backgrounds[1].name, 'Local Crew');

  const draft = await d.action(PLAYER, 'create_character', { campaign_id: existing.id });
  const build = blankBuild();
  Object.assign(build, { lineageId: 'official-voyager', variantId: 'orbital', background: { kind: 'preset', id: 'official-courier' } });
  build.skills['official-piloting'] = 1;
  const sheet = await d.action(PLAYER, 'finish_character', { id: draft.id, revision: draft.revision, name: 'Courier', build, discard: true });

  const changed = removeCatalogEntry(catalog, 'abilities', 'official-star-chart');
  changed.lineages[0].name = 'World Voyager';
  changed.skills.push({ id: 'official-mapping', name: 'Mapping', generic: true });
  await assert.rejects(d.action(GM, 'publish_catalog', { revision: 1, catalog: changed }), /another device/);
  await d.action(GM, 'publish_catalog', { revision: published.revision, catalog: changed });
  const current = (await d.snapshot(PLAYER)).campaigns[0];
  assert.equal(current.catalog.lineages[0].name, 'World Voyager');
  assert.equal(current.catalog.abilities.length, 0);
  assert.deepEqual(current.catalog.backgrounds.find(entry => entry.id === 'local-crew').abilities, []);
  assert.deepEqual(current.catalog.backgrounds.find(entry => entry.id === 'official-courier').abilities, []);
  const advanced = await d.action(PLAYER, 'save_character', { id: sheet.id, revision: sheet.revision, name: sheet.name, build });
  assert.equal(advanced.rules.catalog.lineages[0].name, 'Voyager');
  assert.equal(advanced.rules.catalog.abilities[0].name, 'Star Chart');
  assert.ok(advanced.rules.catalog.skills.some(skill => skill.id === 'official-mapping'));
});
