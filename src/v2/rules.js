export const ATTRIBUTES = ['Power', 'Toughness', 'Reflex', 'Senses', 'Control', 'Mind', 'Will', 'Emotions', 'Spirit'];
export const AGE_CATEGORIES = ['young', 'medium', 'old'];
export const DEFAULT_SETTINGS = {
  startingMerit: 50, startingSparks: 4000, attributeCap: 5, skillCap: 10,
  allowCustomBackground: true, allowBackgroundBypass: true,
  backgroundFields: ['Origin', 'Training', 'Connections', 'Defining experience'],
};
export const emptyCatalog = () => ({ lineages: [], backgrounds: [], skills: [], abilities: [] });
export const clone = value => structuredClone(value);
export function demand(condition, message) { if (!condition) throw new Error(message); }
export function number(value, label, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false) {
  const n = Number(value);
  demand(value !== '' && value !== null && Number.isFinite(n) && n >= min && n <= max && (!integer || Number.isInteger(n)), `${label} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
  return n;
}
export function settingsFrom(raw = {}) {
  const s = { ...DEFAULT_SETTINGS, ...raw };
  s.startingMerit = number(s.startingMerit, 'Starting Merit');
  s.startingSparks = number(s.startingSparks, 'Starting Sparks');
  s.attributeCap = number(s.attributeCap, 'Creation attribute maximum', 1, 5, true);
  s.skillCap = number(s.skillCap, 'Creation skill maximum', 0, 10, true);
  demand(typeof s.allowCustomBackground === 'boolean' && typeof s.allowBackgroundBypass === 'boolean', 'Background options must be true or false.');
  demand(Array.isArray(s.backgroundFields) && s.backgroundFields.length <= 20 && s.backgroundFields.every(x => typeof x === 'string' && x.trim() && x.length <= 100) && new Set(s.backgroundFields).size === s.backgroundFields.length, 'Background fields must be unique, nonempty labels (up to 20).');
  return s;
}
export function validateCatalog(catalog) {
  for (const key of ['lineages', 'backgrounds', 'skills', 'abilities']) {
    demand(Array.isArray(catalog[key]) && catalog[key].length <= 500, `Invalid ${key} catalog.`);
    const ids = new Set();
    for (const entry of catalog[key]) {
      demand(/^[a-zA-Z0-9_-]{1,80}$/.test(entry.id) && !ids.has(entry.id), `Each ${key} entry needs a unique ID.`);
      demand(typeof entry.name === 'string' && entry.name.trim() && entry.name.length <= 120, `Each ${key} entry needs a name.`);
      demand(entry.enabled === undefined || typeof entry.enabled === 'boolean', 'Enabled must be true or false.');
      ids.add(entry.id);
      if (key === 'abilities') number(entry.cost, 'Ability cost', 1, 99, true);
      if (key === 'lineages' || key === 'backgrounds') {
        number(entry.meritBonus ?? 0, 'Merit bonus'); number(entry.sparksBonus ?? 0, 'Sparks bonus');
        if (key === 'lineages') {
          demand(entry.ageRequired === undefined || typeof entry.ageRequired === 'boolean', 'Age requirement must be true or false.');
          const variants = entry.variants || [];
          demand(Array.isArray(variants) && variants.length <= 100, 'Invalid lineage variants.');
          const variantIds = new Set();
          for (const v of variants) {
            demand(/^[a-zA-Z0-9_-]{1,80}$/.test(v.id) && !variantIds.has(v.id) && typeof v.name === 'string' && v.name.trim() && v.name.length <= 120, 'Variants need unique IDs and names.');
            variantIds.add(v.id);
            number(v.meritBonus ?? 0, 'Variant Merit bonus'); number(v.sparksBonus ?? 0, 'Variant Sparks bonus');
          }
        }
      }
    }
  }
  for (const category of ['lineages', 'backgrounds', 'abilities']) {
    for (const entry of catalog[category].flatMap(e => [e, ...(e.variants || [])])) {
      for (const type of ['skills', 'abilities']) {
        if (category === 'abilities' && type === 'abilities') continue;
        demand(entry[type] === undefined || (Array.isArray(entry[type]) && new Set(entry[type]).size === entry[type].length && entry[type].every(id => catalog[type].some(e => e.id === id))), `Unknown or duplicate ${type} reference in ${entry.name}.`);
      }
    }
  }
  return catalog;
}
export function blankBuild() {
  return { lineageId: '', variantId: '', ageYears: null, ageCategory: '', background: { kind: 'none' }, attributes: Object.fromEntries(ATTRIBUTES.map(n => [n, 1])), skills: {}, abilities: [], bio: { height: '', weight: '', eyeColor: '', hairColor: '', oracleId: '', description: '' } };
}
const enabled = e => e && e.enabled !== false;
export function sources(campaign, build, review = null) {
  const cat = campaign.catalog;
  const lineage = cat.lineages.find(e => e.id === build.lineageId);
  const variant = lineage?.variants?.find(e => e.id === build.variantId);
  let background;
  if (build.background.kind === 'preset') background = cat.backgrounds.find(e => e.id === build.background.id);
  if (build.background.kind === 'custom' && review?.status === 'approved') background = build.background;
  return [lineage, variant, background].filter(Boolean);
}
export function buildInfo(campaign, build, review = null) {
  const cat = campaign.catalog;
  const grants = sources(campaign, build, review);
  const freeAbilities = new Set(grants.flatMap(g => g.abilities || []).filter(id => enabled(cat.abilities.find(a => a.id === id))));
  const abilities = [...new Set([...freeAbilities, ...build.abilities])];
  const skills = new Set(cat.skills.filter(e => e.generic && enabled(e)).map(e => e.id));
  grants.forEach(g => (g.skills || []).forEach(id => skills.add(id)));
  abilities.forEach(id => (cat.abilities.find(e => e.id === id)?.skills || []).forEach(s => skills.add(s)));
  const bypass = build.background.kind === 'bypass';
  const merit = campaign.settings.startingMerit + (bypass ? 5 : 0) + grants.reduce((n, g) => n + Number(g.meritBonus || 0), 0);
  const sparks = campaign.settings.startingSparks + (bypass ? 500 : 0) + grants.reduce((n, g) => n + Number(g.sparksBonus || 0), 0);
  const attributeCost = Object.values(build.attributes).reduce((n, rank) => n + rank * (rank + 1) - 2, 0);
  const skillCost = Object.values(build.skills).reduce((n, rank) => n + rank * (rank + 1) / 2, 0);
  const abilityCost = build.abilities.reduce((n, id) => n + (freeAbilities.has(id) ? 0 : Number(cat.abilities.find(a => a.id === id)?.cost || 0)), 0);
  return { merit, sparks, spent: attributeCost + skillCost + abilityCost, attributeCost, skillCost, abilityCost, skills: [...skills], abilities, freeAbilities: [...freeAbilities] };
}
export function validateBuild(campaign, build, { finish = false, review = null, active = false } = {}) {
  demand(build && typeof build === 'object', 'Invalid character build.');
  const { catalog: cat, settings: s } = campaign;
  demand(typeof build.lineageId === 'string' && typeof build.variantId === 'string', 'Invalid lineage.');
  const lineage = cat.lineages.find(e => e.id === build.lineageId);
  demand(!build.lineageId || enabled(lineage), 'Choose an available lineage.');
  demand(!build.variantId || enabled(lineage?.variants?.find(e => e.id === build.variantId)), 'Choose an available lineage variant.');
  if (build.ageYears !== null) number(build.ageYears, 'Age in years');
  demand(build.ageCategory === '' || AGE_CATEGORIES.includes(build.ageCategory), 'Choose a valid age category.');
  const bg = build.background;
  demand(bg && ['none', 'preset', 'custom', 'bypass'].includes(bg.kind), 'Choose a background option.');
  if (bg.kind === 'preset') demand(enabled(cat.backgrounds.find(e => e.id === bg.id)), 'Choose an available background.');
  if (bg.kind === 'bypass') demand(s.allowBackgroundBypass, 'Background bypass is disabled.');
  if (bg.kind === 'custom') {
    demand(s.allowCustomBackground, 'Custom backgrounds are disabled.');
    demand(typeof bg.name === 'string' && bg.name.trim() && bg.name.length <= 120, 'Name the custom background.');
    for (const field of s.backgroundFields) demand(typeof bg.answers?.[field] === 'string' && bg.answers[field].trim(), `Custom background requires ${field}.`);
    for (const type of ['skills', 'abilities']) demand(Array.isArray(bg[type]) && new Set(bg[type]).size === bg[type].length && bg[type].every(id => enabled(cat[type].find(e => e.id === id))), `Select available ${type} for the custom background.`);
    demand(!Number(bg.meritBonus || 0) && !Number(bg.sparksBonus || 0), 'Custom backgrounds cannot set their own currency bonuses.');
  }
  demand(build.attributes && Object.keys(build.attributes).length === ATTRIBUTES.length && ATTRIBUTES.every(n => Object.hasOwn(build.attributes, n)), 'All nine attributes are required.');
  for (const rank of Object.values(build.attributes)) number(rank, 'Attribute', 1, active ? 5 : s.attributeCap, true);
  demand(build.skills && typeof build.skills === 'object' && !Array.isArray(build.skills), 'Invalid skills.');
  demand(Array.isArray(build.abilities) && new Set(build.abilities).size === build.abilities.length && build.abilities.every(id => enabled(cat.abilities.find(e => e.id === id))), 'Select available, unique abilities.');
  const info = buildInfo(campaign, build, review);
  for (const [id, rank] of Object.entries(build.skills)) {
    demand(info.skills.includes(id) && enabled(cat.skills.find(e => e.id === id)), 'A purchased skill is no longer available. Refund it before changing its source.');
    number(rank, 'Skill', 0, active ? 10 : s.skillCap, true);
  }
  if (!active) demand(info.spent <= info.merit, 'Not enough Merit.');
  if (finish) {
    demand(lineage, 'Select a lineage before finishing.');
    demand(!(lineage.variants || []).some(enabled) || build.variantId, 'Select a lineage variant.');
    demand(lineage.ageRequired === false || build.ageCategory, 'Choose an age category.');
    demand(bg.kind !== 'none', 'Select a background, submit a custom background, or choose the bonus.');
    demand(bg.kind !== 'custom' || review?.status === 'approved', 'Your GM must approve the custom background first.');
  }
  return info;
}
export function checkAdvancement(oldBuild, nextBuild) {
  for (const key of ['lineageId', 'variantId', 'ageYears', 'ageCategory', 'background']) demand(JSON.stringify(oldBuild[key]) === JSON.stringify(nextBuild[key]), 'Creation choices are locked after finishing.');
  for (const key of ATTRIBUTES) demand(nextBuild.attributes[key] >= oldBuild.attributes[key], 'Attributes cannot be refunded after creation.');
  for (const [key, rank] of Object.entries(oldBuild.skills)) demand((nextBuild.skills[key] ?? 0) >= rank, 'Skills cannot be refunded after creation.');
  demand(oldBuild.abilities.every(id => nextBuild.abilities.includes(id)), 'Abilities cannot be refunded after creation.');
}
export function characterRules(campaign, character) {
  if (character.status !== 'active' || !character.rules) return campaign;
  const original = character.rules.catalog;
  const info = buildInfo({ ...campaign, ...character.rules }, character.build, character.review);
  const frozen = {
    lineages: new Set([character.build.lineageId]),
    backgrounds: new Set(character.build.background.kind === 'preset' ? [character.build.background.id] : []),
    skills: new Set([...info.skills, ...Object.keys(character.build.skills)]),
    abilities: new Set(info.abilities),
  };
  const catalog = {};
  for (const key of ['lineages', 'backgrounds', 'skills', 'abilities']) {
    catalog[key] = [...original[key].filter(e => frozen[key].has(e.id)), ...campaign.catalog[key].filter(e => !frozen[key].has(e.id))].map(clone);
  }
  return { ...campaign, settings: character.rules.settings, catalog };
}
export function assertRevision(row, payload) { demand(row.revision === payload.revision, 'This record changed on another device. Reload it before saving.'); }
export function canReadNote(note, userId, campaign) {
  if (note.owner_id === userId) return true;
  if (!campaign) return false;
  return note.audience === 'party' || (note.audience === 'gm' && campaign.gm_id === userId) || (note.audience === 'player' && note.recipient_id === userId);
}
