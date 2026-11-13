const wikiPattern = /\[\[([^\]\n]+)\]\]/g;
const tagPattern = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;
const normalize = text => text.trim().toLowerCase();

export function noteLinkIndex(notes) {
  const byId = new Map(notes.map(note => [note.id, note]));
  const byTitle = new Map();
  for (const note of notes) {
    const title = normalize(note.title);
    byTitle.set(title, byTitle.has(title) ? null : note);
  }
  return body => Array.from(body.matchAll(wikiPattern), match => {
    const [target, ...alias] = match[1].split('|');
    const key=target.trim();
    const note = byId.get(key) || byTitle.get(normalize(target));
    const fallback=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(key)?'Unavailable note':key;
    return { index: match.index, length: match[0].length, id: note?.id, label: note?.title || alias.join('|').trim() || fallback };
  });
}

export function noteTags(body) {
  return [...new Set(Array.from(body.matchAll(tagPattern), match => normalize(match[1])))];
}

export function noteSharing(note, campaign) {
  if ('scope' in note || 'share_gm' in note) return note;
  return {
    share_gm: ['gm', 'party'].includes(note.audience) || (note.audience === 'player' && note.recipient_id === campaign?.gm_id),
    all_players: note.audience === 'party',
    shared_with: note.audience === 'player' && note.recipient_id && note.recipient_id !== campaign?.gm_id ? [note.recipient_id] : [],
  };
}
