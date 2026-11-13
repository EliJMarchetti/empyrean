import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { database, GM, PLAYER, OUTSIDER } from './database.mjs';
import { blankBuild, DEFAULT_SETTINGS } from '../src/v2/rules.js';
import { applyAction, localSnapshot, sampleCatalog, seedDemo, DEMO_GM, DEMO_PLAYER } from '../src/v2/demo.js';
import { emptyTurnOrder, nextTurn, withoutTurn } from '../src/v2/table-tools.js';

test('GM tools migrate existing data and enforce campaign and sheet ownership', async t => {
  const d = await database({ gmTools: false });
  t.after(() => d.close());
  const create = name => d.action(GM, 'create_campaign', { name, settings: DEFAULT_SETTINGS });
  let campaign = await create('Relay World');
  campaign = await d.action(GM, 'update_campaign', { ...campaign, catalog: sampleCatalog() });
  const unrelated = await create('Another World');
  const originalInvite = await d.action(GM, 'create_invite', { campaign_id: campaign.id });
  await d.action(PLAYER, 'join_campaign', { code: originalInvite.code });
  const oldSheet = await d.action(PLAYER, 'create_character', { campaign_id: campaign.id });
  const personal = await d.action(PLAYER, 'save_note', { title: 'Personal', audience: 'private', body: 'Keep this' });
  await d.admin(await readFile(new URL('../supabase/migrations/002_gm_tools.sql', import.meta.url), 'utf8'));
  const campaignId = campaign.id;
  assert.equal((await d.snapshot(PLAYER)).characters[0].id, oldSheet.id);
  assert.equal((await d.snapshot(GM)).invites[0].id, originalInvite.id);

  let pregen, npc, map, token;
  await t.test('A finished prebuilt sheet is private until a single player claims it', async () => {
    await assert.rejects(d.action(PLAYER, 'create_pregen', { campaign_id: campaignId, name: 'Forged' }), /Only the GM/);
    pregen = await d.action(GM, 'create_pregen', { campaign_id: campaignId, name: 'Sealed Pilot' });
    const build = blankBuild();
    Object.assign(build, { lineageId: 'sample-android', background: { kind: 'bypass' } });
    pregen = await d.action(GM, 'finish_character', { id: pregen.id, revision: pregen.revision, name: pregen.name, build, discard: true });
    const snapshot = await d.snapshot(PLAYER);
    assert.ok(!snapshot.characters.some(ch => ch.id === pregen.id));
    assert.ok(!snapshot.activity.some(entry => entry.message.includes(pregen.name)));
    map = await d.action(GM, 'save_map', { campaign_id: campaignId, name: 'Relay', scale: 'scene', visible: true, grid: 8 });
    token = await d.action(GM, 'save_marker', { map_id: map.id, name: 'Pilot token', color: '#123456', owner_id: GM, character_id: pregen.id, hidden: true });
    const payload = { id: pregen.id, revision: pregen.revision };
    const old = await d.action(GM, 'create_character_invite', payload);
    const invite = await d.action(GM, 'create_character_invite', payload);
    assert.equal(invite.max_uses, 1);
    assert.ok(!(await d.snapshot(PLAYER)).invites.length);
    await assert.rejects(d.action(OUTSIDER, 'join_campaign', { code: old.code }), /invalid, expired/);
    await assert.rejects(d.action(GM, 'join_campaign', { code: invite.code }), /unavailable/);
    const claimed = await d.action(OUTSIDER, 'join_campaign', { code: invite.code });
    assert.deepEqual(claimed, { campaign_id: campaignId, character_id: pregen.id });
    assert.deepEqual(await d.action(OUTSIDER, 'join_campaign', { code: invite.code }), claimed);
    await assert.rejects(d.action(PLAYER, 'join_campaign', { code: invite.code }), /invalid, expired/);
    const owner = await d.snapshot(OUTSIDER);
    assert.equal(owner.characters.length, 1);
    assert.equal(owner.characters[0].owner_id, OUTSIDER);
    assert.equal(owner.characters[0].sparks, pregen.sparks);
    assert.deepEqual(owner.characters[0].build, pregen.build);
    assert.equal((await d.snapshot(GM)).markers.find(m => m.id === token.id).owner_id, OUTSIDER);
    assert.equal((await d.snapshot(GM)).invites.find(i => i.id === invite.id).uses, 1);
    assert.equal(owner.members.filter(m => m.user_id === OUTSIDER).length, 1);
    await assert.rejects(d.action(GM, 'assign_character', { ...payload, revision: owner.characters[0].revision, owner_id: PLAYER }), /Only an unassigned/);
  });

  await t.test('Direct assignment hands off a draft and revokes its claim link', async () => {
    const ch = await d.action(GM, 'create_pregen', { campaign_id: campaignId, name: 'Mechanic' });
    const payload = { id: ch.id, revision: ch.revision };
    const invite = await d.action(GM, 'create_character_invite', payload);
    await d.action(GM, 'assign_character', { ...payload, owner_id: PLAYER });
    await assert.rejects(d.action(OUTSIDER, 'join_campaign', { code: invite.code }), /invalid, expired/);
    assert.ok(!(await d.snapshot(OUTSIDER)).characters.some(other => other.id === ch.id));
    const draft = (await d.snapshot(PLAYER)).characters.find(other => other.id === ch.id);
    assert.equal(draft.status, 'draft');
    await d.action(PLAYER, 'save_character', { id: ch.id, revision: draft.revision, name: 'My Mechanic', build: draft.build });
    await assert.rejects(d.action(GM, 'delete_character', { id: ch.id, revision: draft.revision + 1 }), /Only the character owner/);
  });

  await t.test('NPC stats stay private while the GM publishes and moves the token', async () => {
    const sheet = { role: 'Watcher', description: 'Works the relay.', notes: 'Knows its override code.', stats: [{ label: 'Resolve', value: '4' }, { label: 'Gear', value: 'Signal jammer' }] };
    await assert.rejects(d.action(PLAYER, 'save_npc', { campaign_id: campaignId, name: 'Watcher', npc: sheet }), /Only the GM/);
    await assert.rejects(d.action(GM, 'save_npc', { campaign_id: campaignId, name: 'Watcher', npc: { ...sheet, stats: [{ label: '', value: '4' }] } }), /label and value/);
    npc = await d.action(GM, 'save_npc', { campaign_id: campaignId, name: 'Watcher', npc: sheet });
    npc = await d.action(GM, 'save_npc', { id: npc.id, revision: npc.revision, name: 'Relay Watcher', npc: sheet });
    assert.deepEqual(npc.npc, sheet);
    await assert.rejects(d.action(GM, 'create_character_invite', { id: npc.id, revision: npc.revision }), /NPC sheet/);
    let marker = await d.action(GM, 'save_marker', { map_id: map.id, name: 'Watcher', color: '#654321', owner_id: GM, character_id: npc.id, hidden: true });
    assert.ok(!(await d.snapshot(PLAYER)).markers.some(m => m.id === marker.id));
    marker = await d.action(GM, 'save_marker', { ...marker, hidden: false });
    await assert.rejects(d.action(PLAYER, 'move_marker', { id: marker.id, revision: marker.revision, x: 22, y: 35 }), /Only the GM/);
    await d.action(GM, 'move_marker', { id: marker.id, revision: marker.revision, x: 22, y: 35 });
    assert.equal((await d.snapshot(PLAYER)).markers.find(m => m.id === marker.id).x, 22);
    assert.equal((await d.as(PLAYER, 'select * from public.characters where id=$1', [npc.id])).rows.length, 0);
    await d.action(GM, 'delete_character', { id: npc.id, revision: npc.revision });
    assert.ok(!(await d.snapshot(PLAYER)).markers.some(m => m.id === marker.id));
  });

  await t.test('Turn order, clock visibility and shared dice stay inside the campaign', async () => {
    let turns = { ...emptyTurnOrder(campaignId), entries: [
      { id: crypto.randomUUID(), name: 'Pilot', score: 9 }, { id: crypto.randomUUID(), name: 'Watcher', score: -1 },
    ] };
    await assert.rejects(d.action(PLAYER, 'save_turn_order', turns), /Only the GM/);
    turns = await d.action(GM, 'save_turn_order', nextTurn(turns));
    assert.equal((await d.snapshot(PLAYER)).turn_orders[0].round, 1);
    await assert.rejects(d.action(GM, 'save_turn_order', { ...turns, revision: 0 }), /changed on another device/);
    turns = await d.action(GM, 'save_turn_order', nextTurn(turns));
    assert.equal(turns.current_id, turns.entries[1].id);
    turns = await d.action(GM, 'save_turn_order', withoutTurn(turns, turns.current_id));
    assert.equal(turns.round, 2);
    assert.equal(turns.current_id, turns.entries[0].id);
    turns = await d.action(GM, 'save_turn_order', withoutTurn(turns, turns.current_id));
    assert.equal(turns.round, 0);

    const clock = await d.action(GM, 'save_clock', { campaign_id: campaignId, name: 'Relay overload', segments: 4, filled: 2 });
    assert.equal((await d.snapshot(PLAYER)).clocks.length, 0);
    await assert.rejects(d.action(PLAYER, 'save_clock', { ...clock, visible: true }), /Only the GM/);
    await d.action(GM, 'save_clock', { ...clock, visible: true, filled: 3 });
    assert.equal((await d.snapshot(PLAYER)).clocks[0].filled, 3);
    await assert.rejects(d.action(GM, 'save_clock', { ...clock, filled: 4 }), /changed on another device/);
    await assert.rejects(d.action(PLAYER, 'roll_dice', { campaign_id: unrelated.id, count: 3, sides: 8, modifier: -2 }), /Campaign not found/);
    const roll = await d.action(PLAYER, 'roll_dice', { campaign_id: campaignId, count: 3, sides: 8, modifier: -2, label: 'Test relay' });
    assert.equal(roll.dice.length, 3);
    assert.ok(roll.dice.every(die => die >= 1 && die <= 8));
    assert.equal(roll.total, roll.dice.reduce((sum, die) => sum + die, -2));
    assert.deepEqual((await d.snapshot(GM)).table_rolls[0], roll);
  });

  await t.test('Only the owner can delete their sheet and only the GM can delete the campaign', async () => {
    const sheet = (await d.snapshot(OUTSIDER)).characters.find(ch => ch.id === pregen.id);
    await assert.rejects(d.action(PLAYER, 'delete_character', { id: sheet.id, revision: sheet.revision }), /Only the character owner/);
    await assert.rejects(d.action(OUTSIDER, 'delete_character', { id: sheet.id, revision: pregen.revision }), /changed on another device/);
    await d.action(OUTSIDER, 'delete_character', { id: sheet.id, revision: sheet.revision });
    assert.ok(!(await d.snapshot(GM)).markers.some(m => m.id === token.id));
    assert.ok(!(await d.snapshot(GM)).invites.some(i => i.character_id === pregen.id));
    await assert.rejects(d.action(PLAYER, 'delete_campaign', { id: campaignId, revision: campaign.revision }), /Only the GM/);
    await assert.rejects(d.action(GM, 'delete_campaign', { id: campaignId, revision: campaign.revision - 1 }), /changed on another device/);
    await d.action(GM, 'delete_campaign', { id: campaignId, revision: campaign.revision });
    const remaining = await d.snapshot(GM);
    assert.deepEqual(remaining.campaigns.map(c => c.id), [unrelated.id]);
    for (const collection of ['characters','maps','markers','invites','turn_orders','clocks','table_rolls']) assert.equal(remaining[collection].length, 0, collection);
    assert.deepEqual((await d.snapshot(PLAYER)).notes.map(note => note.id), [personal.id]);
    await assert.rejects(d.action(PLAYER, 'join_campaign', { code: originalInvite.code }), /invalid, expired/);
  });
});

test('Older device previews support GM tools and preserve personal notes when campaigns are deleted', () => {
  const db = seedDemo(), campaign = db.campaigns[0], map = db.maps[0];
  const gm = (action, payload) => applyAction(db, DEMO_GM, action, payload);
  const player = (action, payload) => applyAction(db, DEMO_PLAYER, action, payload);
  const pregen = gm('create_pregen', { campaign_id: campaign.id, name: 'Preview Scout' });
  const invite = gm('create_character_invite', pregen);
  assert.equal(player('join_campaign', { code: invite.code }).character_id, pregen.id);
  const owner = localSnapshot(db, DEMO_PLAYER).characters.find(ch => ch.id === pregen.id);
  player('delete_character', owner);
  assert.ok(!localSnapshot(db, DEMO_GM).invites.length);
  const npc = gm('save_npc', { campaign_id: campaign.id, name: 'Preview Watcher', npc: { role: '', description: '', notes: 'Secret', stats: [] } });
  const marker = gm('save_marker', { map_id: map.id, name: npc.name, owner_id: DEMO_GM, character_id: npc.id, color: '#123456' });
  assert.ok(localSnapshot(db, DEMO_PLAYER).markers.some(m => m.id === marker.id));
  assert.ok(!localSnapshot(db, DEMO_PLAYER).characters.some(ch => ch.id === npc.id));
  const turns = { ...emptyTurnOrder(campaign.id), entries: [{ id: crypto.randomUUID(), name: 'Preview Watcher', score: 1 }] };
  gm('save_turn_order', nextTurn(turns));
  gm('save_clock', { campaign_id: campaign.id, name: 'Secret clock', segments: 4, filled: 1 });
  player('roll_dice', { campaign_id: campaign.id, count: 1, sides: 6, modifier: 0 });
  assert.equal(localSnapshot(db, DEMO_PLAYER).clocks.length, 0);
  assert.equal(localSnapshot(db, DEMO_GM).table_rolls.length, 1);
  const personal = player('save_note', { title: 'Personal', body: 'Mine', audience: 'private' });
  gm('delete_campaign', campaign);
  assert.equal(localSnapshot(db, DEMO_PLAYER).campaigns.length, 0);
  assert.deepEqual(localSnapshot(db, DEMO_PLAYER).notes.map(note => note.id), [personal.id]);
});
