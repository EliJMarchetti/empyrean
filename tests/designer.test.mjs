import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
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

test('The original tracker imports into a persistent designer-only draft', async t => {
  const d = await database();
  t.after(() => d.close());
  const imported = JSON.parse(execFileSync(process.execPath, ['scripts/import-original-catalog.mjs'], { encoding: 'utf8' }));
  assert.equal(imported.lineages.length, 9);
  assert.equal(imported.skills.filter(skill => skill.generic).length, 18);
  assert.deepEqual(imported.backgrounds.map(background => background.name), ['Cyber-Infiltrator','Paratrooper','Energy Weaponsmith','Conscript']);
  assert.ok(imported.lineages.find(lineage => lineage.name === 'Exo').variants.some(variant => variant.name === 'Mars' && variant.abilities.length));
  assert.ok(imported.lineages.find(lineage => lineage.name === 'Aberrant').variants.some(variant => variant.name === 'Thermal Vision' && variant.abilities.length));
  assert.ok(imported.abilities.some(ability => ability.name === 'Company Transit' && ability.description.startsWith('You can get free passage')));
  assert.ok(imported.abilities.some(ability => ability.name === 'Time' && ability.group === 'Tekhne' && !ability.enabled));
  assert.ok(imported.skills.some(skill => skill.name === 'Hacking' && !skill.generic));

  const world = await d.action(PLAYER, 'create_campaign', { name: 'Player world', settings: DEFAULT_SETTINGS });
  const payload = { base_revision: 1, draft_revision: null, catalog: imported };
  await d.admin('insert into private.game_designers(user_id) values ($1)', [GM]);
  await assert.rejects(d.action(PLAYER, 'save_catalog_draft', payload), /Only a game designer/);
  const saved = await d.action(GM, 'save_catalog_draft', payload);
  const player = await d.snapshot(PLAYER);
  assert.equal(player.designer_draft, null);
  assert.equal(player.official_catalog.catalog.skills.length, 0);
  assert.equal(player.campaigns[0].catalog.lineages.length, 0);
  assert.deepEqual((await d.snapshot(GM)).designer_draft.catalog, imported);
  await assert.rejects(d.as(PLAYER, 'select * from private.designer_draft'), /permission denied/);
  await assert.rejects(d.action(GM, 'save_catalog_draft', payload), /draft changed/);
  await assert.rejects(d.action(PLAYER, 'publish_catalog_draft', { ...payload, draft_revision: saved.revision }), /Only a game designer/);
  const edited = structuredClone(imported);
  edited.lineages[0].name = 'Terran revised';
  const next = await d.action(GM, 'save_catalog_draft', { ...payload, catalog: edited, draft_revision: saved.revision });
  await assert.rejects(d.action(GM, 'discard_catalog_draft', { draft_revision: saved.revision }), /draft changed/);
  const published = await d.action(GM, 'publish_catalog_draft', { ...payload, draft_revision: next.revision });
  assert.equal(published.revision, 2);
  assert.equal((await d.snapshot(GM)).designer_draft, null);
  const current = await d.snapshot(PLAYER);
  assert.equal(current.campaigns[0].id, world.id);
  assert.equal(current.campaigns[0].catalog.lineages[0].name, 'Terran revised');
  const abandoned = await d.action(GM, 'save_catalog_draft', { catalog: imported, base_revision: 2 });
  await d.action(GM, 'discard_catalog_draft', { draft_revision: abandoned.revision });
  assert.equal((await d.snapshot(GM)).designer_draft, null);
  assert.equal((await d.snapshot(PLAYER)).official_catalog.revision, 2);
});
