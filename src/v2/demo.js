import { ATTRIBUTES, DEFAULT_SETTINGS, blankBuild, clone, settingsFrom, emptyCatalog, validateCatalog, validateBuild, buildInfo, checkAdvancement, characterRules, assertRevision, demand, number, canReadNote } from './rules.js';
import { validateTurnOrder, validateNpc, rollValues } from './table-tools.js';

const KEY = 'empyrean.v2.preview';
export const DEMO_GM = '00000000-0000-4000-8000-000000000001';
export const DEMO_PLAYER = '00000000-0000-4000-8000-000000000002';
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const stamp = row => ({ ...row, revision: (row.revision || 0) + 1, updated_at: now() });
export function sampleCatalog() {
  return {
    lineages: [
      { id: 'sample-terran', name: 'Terran', description: 'Preview lineage. Replace these example mechanics with your campaign rules.', ageRequired: true, skills: ['survival'], abilities: [], variants: [{ id: 'planetborn', name: 'Planetborn', skills: [] }, { id: 'stationborn', name: 'Stationborn', skills: ['technology'] }] },
      { id: 'sample-android', name: 'Android', description: 'Preview lineage with no required age category.', ageRequired: false, skills: ['technology'], abilities: [], variants: [] },
    ],
    backgrounds: [{ id: 'sample-scout', name: 'Frontier Scout', description: 'Example background for testing the creation flow.', skills: ['navigation', 'survival'], abilities: ['fieldcraft'] }],
    skills: [
      { id: 'awareness', name: 'Awareness', generic: true }, { id: 'athletics', name: 'Athletics', generic: true },
      { id: 'composure', name: 'Composure', generic: true }, { id: 'persuasion', name: 'Persuasion', generic: true },
      { id: 'survival', name: 'Survival' }, { id: 'technology', name: 'Technology' }, { id: 'navigation', name: 'Navigation' },
    ],
    abilities: [
      { id: 'fieldcraft', name: 'Fieldcraft', cost: 4, description: 'Example ability. Unlocks Survival.', skills: ['survival'] },
      { id: 'navigator', name: 'Navigator', cost: 6, description: 'Example ability. Unlocks Navigation.', skills: ['navigation'] },
      { id: 'technician', name: 'Technician', cost: 5, description: 'Example ability. Unlocks Technology.', skills: ['technology'] },
    ],
  };
}
export function seedDemo() {
  const campaignId = '10000000-0000-4000-8000-000000000001';
  const characterId = '20000000-0000-4000-8000-000000000001';
  const mapId = '30000000-0000-4000-8000-000000000001';
  const campaign = { id: campaignId, gm_id: DEMO_GM, name: 'The Far Meridian', description: 'An expedition beyond the charted worlds.', settings: clone(DEFAULT_SETTINGS), catalog: sampleCatalog(), revision: 1, created_at: now(), updated_at: now() };
  const build = blankBuild();
  Object.assign(build, { lineageId: 'sample-terran', variantId: 'stationborn', ageCategory: 'medium', ageYears: 32, background: { kind: 'preset', id: 'sample-scout' }, attributes: { ...build.attributes, Reflex: 3, Senses: 3, Mind: 2 }, skills: { awareness: 2, navigation: 2 }, abilities: ['technician'] });
  build.bio = { height: '178 cm', weight: '73 kg', eyeColor: 'Hazel', hairColor: 'Black', oracleId: 'OR-7042', description: 'A cartographer searching for the routes that vanished.' };
  return {
    profiles: [{ id: DEMO_GM, display_name: 'Alex Morgan' }, { id: DEMO_PLAYER, display_name: 'Rowan Ellis' }],
    campaigns: [campaign],
    members: [{ campaign_id: campaignId, user_id: DEMO_GM, role: 'gm', display_name: 'Alex Morgan', joined_at: now() }, { campaign_id: campaignId, user_id: DEMO_PLAYER, role: 'player', display_name: 'Rowan Ellis', joined_at: now() }],
    characters: [{ id: characterId, campaign_id: campaignId, owner_id: DEMO_PLAYER, name: 'Sera Voss', status: 'active', build, review: null, rules: { settings: clone(campaign.settings), catalog: clone(campaign.catalog) }, merit: 8, sparks: 4360, spent: buildInfo(campaign, build).spent, revision: 1, created_at: now(), updated_at: now() }],
    notes: [{ id: uuid(), campaign_id: campaignId, owner_id: DEMO_GM, audience: 'party', recipient_id: null, title: 'Beyond the relay', body: 'The last transmission came from the eastern ridge.\n\nFind the survey team. Recover the relay archive. Decide who gets to hear it.', revision: 1, created_at: now(), updated_at: now() }],
    items: [{ id: uuid(), campaign_id: campaignId, owner_id: null, name: 'Survey kit', quantity: 2, details: 'Rangefinder, sample canisters, and a portable beacon.', revision: 1, created_at: now(), updated_at: now() }, { id: uuid(), campaign_id: campaignId, owner_id: DEMO_PLAYER, name: 'Field journal', quantity: 1, details: 'Handwritten charts of the Meridian.', revision: 1, created_at: now(), updated_at: now() }],
    maps: [{ id: mapId, campaign_id: campaignId, name: 'Meridian Outpost', scale: 'scene', image_url: './src/assets/meridian-outpost.svg', storage_path: '', visible: true, grid: 12, revision: 1, created_at: now(), updated_at: now() }],
    markers: [{ id: uuid(), campaign_id: campaignId, map_id: mapId, owner_id: DEMO_PLAYER, character_id: characterId, name: 'Sera', color: '#2b9a91', x: 35, y: 57, hidden: false, revision: 1 }, { id: uuid(), campaign_id: campaignId, map_id: mapId, owner_id: null, character_id: null, name: 'Relay', color: '#d19b44', x: 72, y: 33, hidden: false, revision: 1 }],
    invites: [], activity: [{ id: uuid(), campaign_id: campaignId, actor_name: 'Alex Morgan', message: 'Opened the Meridian Outpost to the party.', created_at: now() }],
  };
}
export function localSnapshot(db, userId) {
  const campaigns = db.campaigns.filter(c => db.members.some(m => m.campaign_id === c.id && m.user_id === userId));
  const belongs = id => campaigns.some(c => c.id === id);
  const isGm = id => campaigns.find(c => c.id === id)?.gm_id === userId;
  return clone({
    profile: db.profiles.find(p => p.id === userId), campaigns,
    members: db.members.filter(m => belongs(m.campaign_id)),
    characters: db.characters.filter(c => belongs(c.campaign_id) && (isGm(c.campaign_id) || (!c.npc && !c.claimable && (c.owner_id === userId || c.status === 'active')))),
    notes: db.notes.filter(n => (!n.campaign_id || belongs(n.campaign_id)) && canReadNote(n, userId, campaigns.find(c => c.id === n.campaign_id))),
    items: db.items.filter(i => belongs(i.campaign_id)),
    maps: db.maps.filter(m => belongs(m.campaign_id) && (m.visible || isGm(m.campaign_id))),
    markers: db.markers.filter(m => belongs(m.campaign_id) && (isGm(m.campaign_id) || (!m.hidden && db.maps.some(map => map.id === m.map_id && map.visible)))),
    invites: db.invites.filter(i => isGm(i.campaign_id)), activity: db.activity.filter(a => belongs(a.campaign_id)).slice(-100).reverse(),
    turn_orders: (db.turn_orders || []).filter(t => belongs(t.campaign_id)),
    clocks: (db.clocks || []).filter(c => belongs(c.campaign_id) && (c.visible || isGm(c.campaign_id))),
    table_rolls: (db.table_rolls || []).filter(r => belongs(r.campaign_id)),
    campaign_upload_cleanup: [],
  });
}
// The preview mirrors the database commands. It deliberately never impersonates a cloud account.
export function applyAction(db, userId, action, p) {
  demand(db.profiles.some(u => u.id === userId), 'Sign in first.');
  const member = id => db.members.some(m => m.campaign_id === id && m.user_id === userId);
  const campaign = id => { const c = db.campaigns.find(c => c.id === id); demand(c && member(id), 'Campaign not found.'); return c; };
  const gm = id => { const c = campaign(id); demand(c.gm_id === userId, 'Only the GM can do that.'); return c; };
  const row = (table, id) => { const r = db[table].find(r => r.id === id); demand(r, 'Record not found.'); return r; };
  const log = (id, message) => db.activity.push({ id: uuid(), campaign_id: id, actor_name: db.profiles.find(u => u.id === userId).display_name, message, created_at: now() });
  const inviteFor = (campaignId, characterId = null) => {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
    const invite = { id: uuid(), campaign_id: campaignId, character_id: characterId, code, expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), max_uses: characterId ? 1 : 50, uses: 0, revoked: false, created_at: now() };
    db.invites.push(invite);
    return invite;
  };
  const assign = (ch, owner, claimedInvite = null) => {
    Object.assign(ch, stamp({ ...ch, owner_id: owner, claimable: false }));
    db.markers.filter(m => m.character_id === ch.id).forEach(m => Object.assign(m, stamp({ ...m, owner_id: owner })));
    db.invites.filter(i => i.character_id === ch.id && i !== claimedInvite).forEach(i => i.revoked = true);
    if (claimedInvite) Object.assign(claimedInvite, { uses: 1, claimed_by: owner });
    return { campaign_id: ch.campaign_id, character_id: ch.id };
  };
  let result = null;
  if (action === 'create_campaign') {
    demand(p.name?.trim() && p.name.length <= 120, 'Name your campaign.');
    const c = { id: uuid(), gm_id: userId, name: p.name.trim(), description: String(p.description || ''), settings: settingsFrom(p.settings), catalog: emptyCatalog(), revision: 1, created_at: now(), updated_at: now() };
    db.campaigns.push(c); db.members.push({ campaign_id: c.id, user_id: userId, role: 'gm', display_name: db.profiles.find(u => u.id === userId).display_name, joined_at: now() }); log(c.id, 'Created the campaign.'); result = c;
  } else if (action === 'update_campaign') {
    const c = gm(p.id); assertRevision(c, p); demand(p.name?.trim() && p.name.length <= 120, 'Name your campaign.');
    Object.assign(c, stamp({ ...c, name: p.name.trim(), description: p.description || '', settings: settingsFrom(p.settings), catalog: validateCatalog(p.catalog) })); log(c.id, 'Updated campaign rules and content.'); result = c;
  } else if (action === 'delete_campaign') {
    const c = gm(p.id); assertRevision(c, p);
    db.campaigns = db.campaigns.filter(other => other.id !== c.id);
    for (const table of ['members', 'characters', 'notes', 'items', 'maps', 'markers', 'invites', 'activity', 'turn_orders', 'clocks', 'table_rolls']) {
      if (db[table]) db[table] = db[table].filter(record => record.campaign_id !== c.id);
    }
  } else if (action === 'create_invite') {
    gm(p.campaign_id);
    result = inviteFor(p.campaign_id);
  } else if (action === 'create_character_invite' || action === 'assign_character') {
    const ch = row('characters', p.id); gm(ch.campaign_id); assertRevision(ch, p);
    demand(ch.claimable && !ch.npc, 'Only an unassigned character can be given to a player.');
    if (action === 'create_character_invite') {
      db.invites.filter(i => i.character_id === ch.id).forEach(i => i.revoked = true);
      result = inviteFor(ch.campaign_id, ch.id);
    } else {
      demand(p.owner_id !== userId && db.members.some(m => m.campaign_id === ch.campaign_id && m.user_id === p.owner_id), 'Choose a player in this campaign.');
      result = assign(ch, p.owner_id);
    }
  } else if (action === 'revoke_invite') {
    const i = row('invites', p.id); gm(i.campaign_id); i.revoked = true;
  } else if (action === 'join_campaign') {
    const i = db.invites.find(i => i.code === p.code?.trim());
    const ch = i?.character_id && db.characters.find(ch => ch.id === i.character_id);
    if (ch && i.claimed_by === userId && ch.owner_id === userId) return { campaign_id: i.campaign_id, character_id: ch.id };
    demand(i && !i.revoked && new Date(i.expires_at) > new Date() && i.uses < i.max_uses, 'That invitation is invalid, expired, or full.');
    demand(!i.character_id || (ch?.claimable && ch.owner_id !== userId), 'This character is unavailable to claim from this account.');
    if (!member(i.campaign_id)) { db.members.push({ campaign_id: i.campaign_id, user_id: userId, role: 'player', display_name: db.profiles.find(u => u.id === userId).display_name, joined_at: now() }); if (!ch) i.uses++; log(i.campaign_id, 'Joined the campaign.'); }
    result = ch ? assign(ch, userId, i) : { campaign_id: i.campaign_id };
  } else if (action === 'create_character' || action === 'create_pregen') {
    const claimable = action === 'create_pregen';
    if (claimable) { gm(p.campaign_id); demand(p.name?.trim() && p.name.trim().length <= 120, 'Enter a character name.'); }
    else campaign(p.campaign_id);
    const character = { id: uuid(), campaign_id: p.campaign_id, owner_id: userId, name: claimable ? p.name.trim() : 'Unnamed character', claimable, status: 'draft', build: blankBuild(), review: null, rules: null, merit: 0, sparks: 0, spent: 0, revision: 1, created_at: now(), updated_at: now() };
    db.characters.push(character); result = character;
  } else if (action === 'save_npc') {
    const ch = p.id ? row('characters', p.id) : null;
    const c = gm(ch?.campaign_id || p.campaign_id);
    if (ch) { demand(ch.npc, 'NPC not found.'); assertRevision(ch, p); }
    demand(p.name?.trim() && p.name.trim().length <= 120, 'Enter an NPC name.');
    validateNpc(p.npc);
    const next = stamp({ ...(ch || { id: uuid(), campaign_id: c.id, owner_id: userId, status: 'draft', build: {}, created_at: now() }), name: p.name.trim(), npc: clone(p.npc) });
    if (ch) Object.assign(ch, next); else db.characters.push(next);
    result = next;
  } else if (action === 'delete_character') {
    const ch = row('characters', p.id); campaign(ch.campaign_id); assertRevision(ch, p);
    demand(ch.owner_id === userId, 'Only the character owner can delete this sheet.');
    db.characters = db.characters.filter(record => record.id !== ch.id);
    db.markers = db.markers.filter(record => record.character_id !== ch.id);
    db.invites = db.invites.filter(record => record.character_id !== ch.id);
  } else if (action === 'save_character' || action === 'finish_character') {
    const ch = row('characters', p.id); const c = campaign(ch.campaign_id); demand(ch.owner_id === userId, 'Only the character owner can edit this sheet.'); assertRevision(ch, p);
    demand(!ch.npc, 'Use the NPC sheet to edit this character.');
    demand(p.name?.trim() && p.name.length <= 120, 'Enter a character name.');
    const finish = action === 'finish_character'; demand(!finish || ch.status === 'draft', 'Character creation is already finished.');
    const changedBg = JSON.stringify(ch.build.background) !== JSON.stringify(p.build.background);
    const review = changedBg ? (p.build.background.kind === 'custom' ? { status: 'pending', comment: '' } : null) : ch.review;
    const rules = characterRules(c, ch);
    const info = validateBuild(rules, p.build, { finish, review, active: ch.status === 'active' });
    if (ch.status === 'active') {
      checkAdvancement(ch.build, p.build);
      const delta = info.spent - buildInfo(rules, ch.build, ch.review).spent;
      demand(delta >= 0 && ch.merit >= delta, 'Not enough earned Merit.'); ch.merit -= delta;
      ch.rules = { settings: clone(rules.settings), catalog: clone(rules.catalog) };
    }
    if (finish) {
      demand(info.merit === info.spent || p.discard === true, 'Are you sure? All unspent Merit will be lost.');
      ch.status = 'active'; ch.merit = 0; ch.sparks = info.sparks; ch.rules = { settings: clone(c.settings), catalog: clone(c.catalog) }; if (!ch.claimable) log(c.id, `Finished creating ${p.name}.`);
    }
    Object.assign(ch, stamp({ ...ch, name: p.name.trim(), build: clone(p.build), review, spent: info.spent })); result = ch;
  } else if (action === 'review_background') {
    const ch = row('characters', p.id); const c = gm(ch.campaign_id); assertRevision(ch, p); demand(ch.status === 'draft' && ch.build.background.kind === 'custom' && ch.review?.status === 'pending', 'No pending background to review.');
    demand(['approved', 'denied'].includes(p.decision), 'Choose approve or deny.');
    const review = { status: p.decision, comment: String(p.comment || ''), reviewed_at: now() };
    validateBuild(c, ch.build, { review }); Object.assign(ch, stamp({ ...ch, review })); if (!ch.claimable) log(c.id, `${p.decision === 'approved' ? 'Approved' : 'Denied'} ${ch.name}'s custom background.`);
  } else if (action === 'award') {
    const ch = row('characters', p.id); gm(ch.campaign_id); assertRevision(ch, p); demand(ch.status === 'active', 'Finish creation before awarding currency.');
    const merit = number(p.merit, 'Merit award'); const sparks = number(p.sparks, 'Sparks award'); demand(merit + sparks > 0, 'Enter an award.'); Object.assign(ch, stamp({ ...ch, merit: ch.merit + merit, sparks: ch.sparks + sparks })); if (!ch.claimable) log(ch.campaign_id, `Awarded ${ch.name} ${merit} Merit and ${sparks} Sparks.`);
  } else if (action === 'spend_sparks') {
    const ch = row('characters', p.id); campaign(ch.campaign_id); demand(ch.owner_id === userId && ch.status === 'active', 'Only the owner of a finished character can spend Sparks.'); assertRevision(ch, p);
    const amount = number(p.amount, 'Sparks to spend', Number.MIN_VALUE); demand(ch.sparks >= amount, 'Not enough Sparks.'); Object.assign(ch, stamp({ ...ch, sparks: ch.sparks - amount })); if (!ch.claimable) log(ch.campaign_id, `${ch.name} spent ${amount} Sparks${p.reason ? ': ' + String(p.reason).slice(0, 200) : '.'}`);
  } else if (action === 'save_note' || action === 'delete_note') {
    const n = p.id ? row('notes', p.id) : null;
    if (n) { demand(n.owner_id === userId, 'Only the author can edit this note.'); assertRevision(n, p); }
    if (action === 'delete_note') db.notes = db.notes.filter(x => x.id !== n.id);
    else {
      if (p.campaign_id) campaign(p.campaign_id);
      demand(['private', 'party', 'gm', 'player'].includes(p.audience) && (p.campaign_id || p.audience === 'private'), 'Choose a valid note audience.');
      demand(p.audience !== 'player' || db.members.some(m => m.campaign_id === p.campaign_id && m.user_id === p.recipient_id), 'Choose a campaign member.');
      demand(p.title?.trim() && p.title.length <= 160 && typeof p.body === 'string' && p.body.length <= 50000, 'Enter a title and a note of up to 50,000 characters.');
      const next = stamp({ id: n?.id || uuid(), created_at: n?.created_at || now(), revision: n?.revision || 0, owner_id: userId, campaign_id: p.campaign_id || null, title: p.title.trim(), body: p.body, audience: p.audience, recipient_id: p.audience === 'player' ? p.recipient_id : null });
      if (n) Object.assign(n, next); else db.notes.push(next); result = next;
    }
  } else if (['save_item', 'transfer_item', 'delete_item'].includes(action)) {
    const i = p.id ? row('items', p.id) : null;
    const c = campaign(i?.campaign_id || p.campaign_id);
    if (i) { assertRevision(i, p); demand(i.owner_id === null || i.owner_id === userId || c.gm_id === userId, 'Only the item owner or GM can change this item.'); }
    if (action === 'delete_item') db.items = db.items.filter(x => x.id !== i.id);
    else if (action === 'transfer_item') {
      demand(!p.owner_id || db.members.some(m => m.campaign_id === c.id && m.user_id === p.owner_id), 'Recipient is not in this campaign.');
      const qty = number(p.quantity, 'Transfer quantity', 1, i.quantity, true);
      if (qty === i.quantity) Object.assign(i, stamp({ ...i, owner_id: p.owner_id || null }));
      else { Object.assign(i, stamp({ ...i, quantity: i.quantity - qty })); db.items.push(stamp({ ...i, id: uuid(), revision: 0, quantity: qty, owner_id: p.owner_id || null })); }
      log(c.id, `Transferred ${qty} × ${i.name}.`);
    } else {
      demand(p.name?.trim() && p.name.length <= 120, 'Name the item.');
      const owner = i ? i.owner_id : p.owner_id || null;
      demand(!owner || (db.members.some(m => m.campaign_id === c.id && m.user_id === owner) && (owner === userId || c.gm_id === userId)), 'Choose your inventory or the shared stash.');
      const next = stamp({ id: i?.id || uuid(), campaign_id: c.id, owner_id: owner, name: p.name.trim(), quantity: number(p.quantity, 'Quantity', 1, 1000000000, true), details: String(p.details || ''), created_at: i?.created_at || now(), revision: i?.revision || 0 });
      if (i) Object.assign(i, next); else db.items.push(next); result = next;
    }
  } else if (action === 'save_map' || action === 'delete_map') {
    const m = p.id ? row('maps', p.id) : null; const c = gm(m?.campaign_id || p.campaign_id); if (m) assertRevision(m, p);
    if (action === 'delete_map') { db.maps = db.maps.filter(x => x.id !== m.id); db.markers = db.markers.filter(x => x.map_id !== m.id); }
    else {
      demand(p.name?.trim() && p.name.length <= 120, 'Name the map.'); demand(['world', 'region', 'city', 'scene'].includes(p.scale), 'Choose a map scale.');
      demand(!p.image_url || /^https:\/\//i.test(p.image_url) || p.image_url.startsWith('data:image/') || p.image_url === './src/assets/meridian-outpost.svg', 'Use an HTTPS image URL or upload an image.');
      const next = stamp({ id: m?.id || uuid(), campaign_id: c.id, name: p.name.trim(), scale: p.scale, image_url: p.image_url || '', storage_path: p.storage_path || '', visible: Boolean(p.visible), grid: number(p.grid, 'Grid divisions', 0, 100, true), revision: m?.revision || 0, created_at: m?.created_at || now() });
      if (m) Object.assign(m, next); else db.maps.push(next); result = next;
    }
  } else if (['save_marker', 'move_marker', 'delete_marker'].includes(action)) {
    const m = p.id ? row('markers', p.id) : null; const map = row('maps', m?.map_id || p.map_id); const c = campaign(map.campaign_id);
    demand(c.gm_id === userId || (action === 'move_marker' && m?.owner_id === userId && map.visible && !m.hidden), 'Only the GM can manage markers; players can move their own visible markers.');
    if (m) assertRevision(m, p);
    if (action === 'delete_marker') db.markers = db.markers.filter(x => x.id !== m.id);
    else if (action === 'move_marker') Object.assign(m, stamp({ ...m, x: number(p.x, 'Position', 0, 100), y: number(p.y, 'Position', 0, 100) }));
    else {
      demand(p.name?.trim() && p.name.length <= 80 && /^#[a-fA-F0-9]{6}$/.test(p.color), 'Enter a marker name and color.');
      demand(!p.owner_id || db.members.some(x => x.campaign_id === c.id && x.user_id === p.owner_id), 'Marker owner must be a member.');
      demand(!p.character_id || db.characters.some(x => x.id === p.character_id && x.campaign_id === c.id && x.owner_id === p.owner_id), 'Choose a character belonging to the marker owner.');
      const next = stamp({ id: m?.id || uuid(), map_id: map.id, campaign_id: c.id, owner_id: p.owner_id || null, character_id: p.character_id || null, name: p.name.trim(), color: p.color, x: number(p.x ?? 50, 'Position', 0, 100), y: number(p.y ?? 50, 'Position', 0, 100), hidden: Boolean(p.hidden), revision: m?.revision || 0 });
      if (m) Object.assign(m, next); else db.markers.push(next); result = next;
    }
  } else if (action === 'save_turn_order') {
    const c = gm(p.campaign_id);
    db.turn_orders ??= [];
    const existing = db.turn_orders.find(t => t.campaign_id === c.id);
    assertRevision(existing || { revision: 0 }, p);
    validateTurnOrder(p);
    result = { campaign_id: c.id, entries: clone(p.entries), current_id: p.current_id || null, round: p.round, revision: p.revision + 1 };
    if (existing) Object.assign(existing, result); else db.turn_orders.push(result);
  } else if (action === 'save_clock' || action === 'delete_clock') {
    db.clocks ??= [];
    const clock = p.id ? row('clocks', p.id) : null;
    const c = gm(clock?.campaign_id || p.campaign_id);
    if (clock) assertRevision(clock, p);
    if (action === 'delete_clock') db.clocks = db.clocks.filter(record => record.id !== clock.id);
    else {
      demand(p.name?.trim() && p.name.trim().length <= 120, 'Name the clock.');
      const segments = number(p.segments, 'Segments', 2, 12, true);
      const filled = number(p.filled, 'Filled segments', 0, segments, true);
      result = stamp({ id: clock?.id || uuid(), campaign_id: c.id, name: p.name.trim(), segments, filled, visible: Boolean(p.visible), revision: clock?.revision || 0, created_at: clock?.created_at || now() });
      if (clock) Object.assign(clock, result); else db.clocks.push(result);
    }
  } else if (action === 'roll_dice') {
    const c = campaign(p.campaign_id);
    result = { id: uuid(), campaign_id: c.id, roller: db.profiles.find(u => u.id === userId).display_name, label: String(p.label || '').trim().slice(0, 120), created_at: now(), ...rollValues(p.count, p.sides, p.modifier) };
    let count = 0;
    db.table_rolls = [result, ...(db.table_rolls || [])].filter(roll => roll.campaign_id !== c.id || ++count <= 30);
  } else if (action === 'profile') {
    demand(p.display_name?.trim() && p.display_name.length <= 80, 'Enter a display name.'); db.profiles.find(x => x.id === userId).display_name = p.display_name.trim(); db.members.filter(m => m.user_id === userId).forEach(m => m.display_name = p.display_name.trim());
  } else throw Error('Unknown action.');
  return clone(result);
}
export class DemoStore {
  constructor(userId = DEMO_GM) { this.userId = userId; this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null; }
  read() { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); const db = seedDemo(); localStorage.setItem(KEY, JSON.stringify(db)); return db; }
  async snapshot() { return localSnapshot(this.read(), this.userId); }
  async action(action, payload) {
    const perform = () => { const db = this.read(); const result = applyAction(db, this.userId, action, payload); localStorage.setItem(KEY, JSON.stringify(db)); this.channel?.postMessage('changed'); return result; };
    return navigator.locks ? navigator.locks.request(KEY, perform) : perform();
  }
  subscribe(callback) { if (this.channel) this.channel.onmessage = callback; const listener = e => { if (e.key === KEY) callback(); }; window.addEventListener('storage', listener); return () => { this.channel?.close(); window.removeEventListener('storage', listener); }; }
  async upload(file) { demand(file.size <= 2 * 1024 * 1024, 'Preview images are limited to 2 MB. Cloud maps support 10 MB.'); return { image_url: await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }), storage_path: '' }; }
  async mapUrl(map) { return map.image_url; }
}
