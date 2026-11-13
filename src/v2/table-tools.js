import { demand, number } from './rules.js';

export const emptyTurnOrder = campaignId => ({ campaign_id: campaignId, entries: [], current_id: null, round: 0, revision: 0 });

export function nextTurn(turns) {
  if (!turns.entries.length) return turns;
  const index = turns.entries.findIndex(entry => entry.id === turns.current_id);
  const next = (index + 1) % turns.entries.length;
  return { ...turns, current_id: turns.entries[next].id, round: turns.round + (next === 0 ? 1 : 0) };
}

export function withoutTurn(turns, id) {
  const next = id === turns.current_id ? nextTurn(turns) : turns;
  const entries = turns.entries.filter(entry => entry.id !== id);
  return { ...next, entries, ...(entries.length ? {} : { current_id: null, round: 0 }) };
}

export function validateTurnOrder(turns) {
  demand(Array.isArray(turns.entries) && turns.entries.length <= 60, 'A turn order can hold up to 60 entries.');
  const ids = new Set();
  for (const entry of turns.entries) {
    demand(entry.id && !ids.has(entry.id), 'Turn entries must be distinct.');
    demand(typeof entry.name === 'string' && entry.name.trim() && entry.name.trim().length <= 120, 'Each turn needs a name.');
    number(entry.score, 'Initiative', -9999, 9999, true);
    ids.add(entry.id);
  }
  number(turns.round, 'Round', 0, 1000000, true);
  demand(turns.current_id ? turns.round > 0 && ids.has(turns.current_id) : turns.round === 0, 'Choose a valid current turn.');
}

export function validateNpc(npc) {
  demand(npc && Array.isArray(npc.stats) && npc.stats.length <= 20, 'An NPC sheet can hold up to 20 stats.');
  for (const [key, limit] of [['role', 120], ['description', 10000], ['notes', 10000]]) {
    demand(typeof npc[key] === 'string' && npc[key].length <= limit, 'NPC sheet is too large.');
  }
  for (const { label, value } of npc.stats) {
    demand(typeof label === 'string' && label.trim() && label.trim().length <= 60 && typeof value === 'string' && value.trim() && value.trim().length <= 120,
      'Each stat needs a label and value.');
  }
}

export function rollValues(count, sides, modifier) {
  number(count, 'Dice count', 1, 30, true);
  number(sides, 'Die sides', 2, 100, true);
  number(modifier, 'Modifier', -999, 999, true);
  const ceiling = Math.floor(4294967296 / sides) * sides;
  const buffer = new Uint32Array(1);
  const dice = Array.from({ length: count }, () => {
    do { crypto.getRandomValues(buffer); } while (buffer[0] >= ceiling);
    return buffer[0] % sides + 1;
  });
  return { dice, sides, modifier, total: dice.reduce((sum, die) => sum + die, modifier) };
}
