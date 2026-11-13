import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { emptyCatalog, validateCatalog } from '../src/v2/rules.js';

const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const content = JSON.parse(await readFile(new URL('../data/empyrean-system-content.json', import.meta.url), 'utf8'));
const definitions = ['SECTION_TEMPLATES', 'LINEAGE_OPTIONS', 'LINEAGE_FEATURE_CATEGORY_BY_LINEAGE', 'AUGMENT_OPTIONS'];
const originals = Object.fromEntries(definitions.map(name => {
  const declaration = source.match(new RegExp(`^(?:const|let) ${name} = ([\\s\\S]*?^[\\]\\}]);`, 'm'));
  if (!declaration) throw new Error(`Missing original tracker definition ${name}.`);
  return [name, runInNewContext(`(${declaration[1]})`, {}, { timeout: 1000 })];
}));

const catalog = emptyCatalog();
const slug = name => name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const id = (type, key) => `official-original-${type}-${slug(key)}`;
const byName = new Map();
function skill(name, generic = false, group = 'Specializations') {
  const key = slug(name);
  if (!byName.has(key)) {
    const entry = { id: id('skill', key), name, generic, group };
    byName.set(key, entry);
    catalog.skills.push(entry);
  }
  return byName.get(key).id;
}

function ability(record, type, group, { includeBlank = false, enabled = true } = {}) {
  const text = (record.ability || '').trim();
  if (!text && !includeBlank && !record.specializations?.length) return [];
  const match = /^([^:\n]{1,80}):\s+([\s\S]+)$/.exec(text);
  const entry = {
    id: id(type, record.key), name: match?.[1] || record.label, description: match?.[2] || text,
    cost: 1, enabled, group,
    skills: (record.specializations || []).map(name => skill(name)),
  };
  catalog.abilities.push(entry);
  return [entry.id];
}

for (const section of originals.SECTION_TEMPLATES) {
  for (const name of section.skills) skill(name, true, section.title);
}

const lineageGroups = {
  homeworlds: 'Homeworlds', naturalAugments: 'Natural augments', hybridAnimals: 'Hybrid animals',
  bioAugments: 'Bio-augments', radioAugments: 'Radio-augments', protocols: 'Protocols',
  configurations: 'Configurations', mechAugments: 'Mech-augments',
};
const importedAugments = new Set();
for (const lineage of originals.LINEAGE_OPTIONS) {
  const entry = { id: id('lineage', lineage.key), name: lineage.label, ageRequired: true, skills: lineage.specializations.map(name => skill(name)), variants: [] };
  const category = lineage.key === 'exo' ? 'homeworlds' : originals.LINEAGE_FEATURE_CATEGORY_BY_LINEAGE[lineage.key];
  for (const record of content[category] || []) {
    if (record.key !== 'custom') importedAugments.add(record.key);
    entry.variants.push({ id: slug(record.key), name: record.label, skills: (record.specializations || []).map(name => skill(name)), abilities: ability(record, category, lineageGroups[category]) });
  }
  catalog.lineages.push(entry);
}

for (const record of content.backgrounds) {
  if (record.key === 'custom') continue; // Custom backgrounds already use the campaign's built-in form.
  const grants = ability({ ...record, specializations: [] }, 'background', 'Background features');
  if (grants.length && !record.ability.includes(':')) catalog.abilities.at(-1).name += ' feature';
  catalog.backgrounds.push({ id: id('background', record.key), name: record.label, skills: record.specializations.map(name => skill(name)), abilities: grants });
}

for (const record of content.corporateTies) ability(record, 'corporation', 'Corporate ties', { includeBlank: true });
for (const record of originals.AUGMENT_OPTIONS) {
  if (!importedAugments.has(record.key)) ability(record, 'augment', 'Augments', { includeBlank: record.key === 'custom', enabled: record.key !== 'custom' });
}
for (const [category, group] of [['tekhne', 'Tekhne'], ['arkhemetry', 'Arkhemetry'], ['cosmoglossiaAbilities', 'Cosmoglossia']]) {
  for (const record of content[category] || []) {
    if (category === 'cosmoglossiaAbilities' && !record.ability?.trim() && /^[CMYKWRGB](?:-[CMYKWRGB]){2}$/.test(record.label)) continue;
    ability(record, category, group, { includeBlank: true, enabled: Boolean(record.ability?.trim()) });
  }
}

validateCatalog(catalog);
console.log(JSON.stringify(catalog));
