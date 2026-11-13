export const CONTENT_TYPES = {
  lineages: { title: 'Lineages', singular: 'lineage', icon: 'users' },
  backgrounds: { title: 'Backgrounds', singular: 'background', icon: 'book' },
  skills: { title: 'Skills', singular: 'skill', icon: 'book' },
  abilities: { title: 'Abilities & features', singular: 'ability', icon: 'spark' },
};

export const isOfficial = id => id?.startsWith('official-');

export function removeCatalogEntry(catalog, category, id) {
  const next = structuredClone(catalog);
  next[category] = next[category].filter(entry => entry.id !== id);
  if (category === 'skills' || category === 'abilities') {
    for (const entries of Object.values(next)) {
      for (const entry of entries.flatMap(entry => [entry, ...(entry.variants || [])])) {
        if (entry[category]) entry[category] = entry[category].filter(ref => ref !== id);
      }
    }
  }
  return next;
}
