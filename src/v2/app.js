import { ATTRIBUTES, AGE_CATEGORIES, DEFAULT_SETTINGS, clone, demand, buildInfo, validateBuild, validateCatalog, settingsFrom, characterRules, checkAdvancement, emptyCatalog } from './rules.js';
import { DemoStore, DEMO_GM, DEMO_PLAYER } from './demo.js';
import { CloudStore, configured } from './cloud.js';
import { icon } from './icons.js';
import { emptyTurnOrder, nextTurn, withoutTurn, rollValues } from './table-tools.js';
import { CONTENT_TYPES, isOfficial, removeCatalogEntry } from './catalog.js';

const root = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = n => String(n || '?').split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const fmt = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n || 0);
const date = d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const checked = value => value ? 'checked' : '';
const selected = (a, b) => a === b ? 'selected' : '';
const btn = (label, action, glyph = '', cls = '', attrs = '') => `<button type="button" class="btn ${cls}" data-action="${action}" ${attrs}>${glyph ? icon(glyph) : ''}${esc(label)}</button>`;
const ibtn = (label, action, glyph, attrs = '') => `<button type="button" class="icon-btn ${action==='menu'?'mobile-menu':''}" data-action="${action}" title="${esc(label)}" aria-label="${esc(label)}" ${attrs}>${icon(glyph)}</button>`;
const pill = (label, tone = '') => `<span class="pill ${tone}">${esc(label)}</span>`;
const avatar = (name, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
const empty = (title, text, action = '', glyph = 'compass') => `<div class="empty">${icon(glyph)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
const field = (label, name, value = '', type = 'text', extra = '') => `<label>${esc(label)}<input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}/></label>`;
const area = (label, name, value = '', extra = '') => `<label>${esc(label)}<textarea name="${esc(name)}" ${extra}>${esc(value)}</textarea></label>`;
const options = (entries, value, blank = '') => `${blank ? `<option value="">${esc(blank)}</option>` : ''}${entries.map(e => `<option value="${esc(e.id ?? e)}" ${selected(e.id ?? e, value)}>${esc(e.name ?? e)}</option>`).join('')}`;
const pick = (label, name, entries, value, blank = '', extra = '') => `<label>${esc(label)}<select name="${name}" aria-label="${esc(label)}" ${extra}>${options(entries, value, blank)}</select></label>`;
const check = (label, name, value) => `<label class="check-label"><input name="${name}" type="checkbox" ${checked(value)}/>${esc(label)}</label>`;
const uid = () => store?.userId || store?.session?.user?.id || data?.profile?.id;
const previewUser = () => localStorage.getItem('empyrean.previewRole') === 'player' ? DEMO_PLAYER : DEMO_GM;
let store, data, unsubscribe, syncing = null, toastTimer, modalHandler, modalPreviousFocus;
const ui = { filter: 'all', editor: null, settingsTab: 'rules', settingsDraft: null, studioTab: 'lineages', studioDraft: null, modal: false, auth: 'signin', mapId: '', mapZoom: 1, mobile: false, lastSync: null, offline: false, saving: false, refreshPending: false };
const campaignOf = id => data?.campaigns.find(c => c.id === id);
const membersOf = id => data?.members.filter(m => m.campaign_id === id) || [];
const charactersOf = id => data?.characters.filter(c => c.campaign_id === id) || [];
const partyOf = id => charactersOf(id).filter(ch => !ch.npc && !ch.claimable);
const turnsOf = id => data.turn_orders?.find(t => t.campaign_id === id) || emptyTurnOrder(id);
const canEditCharacter = ch => ch.owner_id === uid();
const characterPath = ch => pathFor(ch.campaign_id, 'character/' + ch.id);
const recordAttr = id => `data-id="${esc(id)}"`;
const isGm = c => c?.gm_id === uid();
const ownerName = id => data?.members.find(m => m.user_id === id)?.display_name || (id === uid() ? data?.profile?.display_name : 'Player');
const isDemo = () => store instanceof DemoStore;
const pathFor = (id, tab = 'overview') => `#/campaign/${id}/${tab}`;
const link = (label, path, glyph = '', cls = '') => `<a href="${esc(path)}" class="btn ${cls}">${glyph ? icon(glyph) : ''}${esc(label)}</a>`;
function route() {
  const raw = location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
  const url = new URL(raw, 'https://empyrean.local'); const seg = url.pathname.split('/').filter(Boolean);
  return { page: seg[0] || 'home', campaignId: seg[1], tab: seg[2] || 'overview', recordId: seg[3], query: url.searchParams };
}
function navigate(path) {
  if (!guardDirty()) return;
  ui.editor = null; ui.settingsDraft = null; ui.studioDraft = null; ui.mobile = false;
  if (location.hash === path) render(); else location.hash = path;
}
function hasUnsavedChanges() { return ui.editor?.dirty || ui.settingsDraft?.dirty || ui.studioDraft?.dirty; }
function guardDirty() { return !hasUnsavedChanges() || confirm('Discard your unsaved changes?'); }
function toast(message, error = false) {
  const el = document.querySelector('#toast'); el.textContent = message; el.className = 'show' + (error ? ' error' : ''); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.className = '', error ? 8000 : 4000);
}
function status() {
  document.querySelectorAll('[data-sync]').forEach(el => { el.textContent = ui.offline ? 'Connection lost' : ui.saving ? 'Saving…' : isDemo() ? 'Saved on this device' : ui.lastSync ? 'Connected · syncs every 5s' : 'Connecting…'; el.classList.toggle('offline', ui.offline); });
  const main=root.querySelector('main.main'),banner=main?.querySelector(':scope > .notice.error');
  if(ui.offline&&main&&!banner)main.querySelector('.topbar')?.insertAdjacentHTML('afterend','<div class="notice error" role="alert">Connection lost. Reconnect and reload before retrying a save.</div>');
  if(!ui.offline)banner?.remove();
}
async function refresh({ renderPage = true, quiet = false } = {}) {
  if (syncing) { await syncing; if (quiet) return; }
  const activeStore=store;
  const task=(async()=>{
    try {
      const next = await activeStore.snapshot(); demand(next, 'Your session has expired. Sign in again.');
      if(activeStore!==store)return;
      if (!next.profile && !isDemo()) { await store.action('profile', { display_name: store.session.user?.user_metadata?.display_name || 'Player' }); next.profile = { id: store.session.user?.id, display_name: store.session.user?.user_metadata?.display_name || 'Player' }; }
      ui.refreshPending ||= JSON.stringify(data) !== JSON.stringify(next);
      data = next; ui.lastSync = Date.now(); ui.offline = false;
      if (renderPage && (!quiet || (ui.refreshPending && !ui.modal && !hasUnsavedChanges() && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) && !dragging))) render();
      status();
    } catch (e) { ui.offline = true; status(); if (!quiet) throw e; }
  })();
  syncing=task;
  try{await task;}finally{if(syncing===task)syncing=null;}
}
async function command(action, payload) {
  demand(!ui.saving, 'Wait for the current save to finish.'); ui.saving = true; status();
  try { const result = await store.action(action, payload); try{await refresh({ renderPage: false });}catch{throw Error('Your change reached the server, but the updated records could not be loaded. Reconnect and reload before editing again.');} return result; }
  finally { ui.saving = false; status(); }
}
async function start(nextStore) {
  unsubscribe?.(); store = nextStore;
  await refresh(); unsubscribe = store.subscribe(() => refresh({ quiet: true }));
  const pending = localStorage.getItem('empyrean.pendingInvite');
  if (pending) joinModal(pending, localStorage.getItem('empyrean.pendingInviteType') === 'character');
}
function brand() { return '<a class="brand" href="#/"><img src="./src/assets/empyrean-mark.svg" alt=""/><div><strong>EMPYREAN</strong><small>THE CAMPAIGN COMPANION</small></div></a>'; }
function navItem(label, glyph, href, active) { return `<a class="nav-item ${active ? 'active' : ''}" href="${esc(href)}">${icon(glyph)}${esc(label)}</a>`; }
function shell(content, c = null) {
  const r = route(); const tabLabels = { overview: 'Overview', characters: 'Characters', character: 'Character sheet', world: 'World & table', session: 'Session tools', journal: 'Campaign journal', inventory: 'Inventory', settings: 'Campaign settings' };
  return `<div class="layout ${ui.mobile ? 'nav-open' : ''}"><button class="mobile-shade" aria-label="Close navigation" data-action="menu"></button><aside class="sidebar">${brand()}<div class="nav-caption">Workspace</div>${navItem('My campaigns', 'grid', '#/', r.page === 'home')}${navItem('Personal notebook', 'book', '#/notebook', r.page === 'notebook')}${!isDemo() ? navItem('Official library', 'book', '#/library', r.page === 'library') : ''}${data.can_design ? navItem('Designer Studio', 'edit', '#/designer', r.page === 'designer') : ''}${c ? `<div class="nav-caption">Current campaign</div><div class="campaign-nav-name">${esc(c.name)}</div>${[['Overview', 'compass', 'overview'], ['Characters', 'users', 'characters'], ['World & table', 'map', 'world'], ['Session tools', 'dice', 'session'], ['Journal', 'book', 'journal'], ['Inventory', 'box', 'inventory'], ...(isGm(c) ? [['Campaign settings', 'settings', 'settings']] : [])].map(([l,g,t]) => navItem(l,g,pathFor(c.id,t),r.tab === t || (r.tab === 'character' && t === 'characters'))).join('')}` : `<div class="nav-caption">At the table</div><button class="nav-item" data-action="join">${icon('link')}Join a campaign</button><button class="nav-item" data-action="create-campaign">${icon('plus')}Create a campaign</button>`}<div class="sidebar-bottom"><div class="table-status"><strong>${isDemo() ? 'Local preview' : 'Your table, connected'}</strong>${isDemo() ? 'Example content · device only' : '<span class="status-dot"></span>Campaigns saved to your account'}</div><button class="profile-button" data-action="profile">${avatar(data.profile?.display_name)}<div class="grow"><strong>${esc(data.profile?.display_name || 'Player')}</strong><small>${isDemo() ? (uid() === DEMO_GM ? 'Preview as game master' : 'Preview as player') : 'Personal account'}</small></div>${icon('settings')}</button></div></aside><main class="main"><header class="topbar"><div class="row">${ibtn('Open navigation', 'menu', 'menu', 'class="mobile-menu"')}<div class="breadcrumb"><a href="#/">Workspace</a>${icon('chevron')}${c ? `<a href="${pathFor(c.id)}">${esc(c.name)}</a>${icon('chevron')}<strong>${esc(tabLabels[r.tab] || 'Overview')}</strong>` : `<strong>${{notebook:'Personal notebook',library:'Official library',designer:'Designer Studio'}[r.page] || 'My campaigns'}</strong>`}</div></div><div class="row">${isDemo() ? '<span class="preview-label">LOCAL PREVIEW</span>' : ''}<span class="sync-label" data-sync></span></div></header>${ui.offline ? '<div class="notice error" role="alert">Connection lost. Changes cannot be saved until the server is reachable.</div>' : ''}<div class="page ${r.tab === 'world' ? 'world-page' : ''}">${content}</div></main></div>`;
}
function heading(eyebrow, title, subtitle, actions = '') { return `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${actions ? `<div class="actions">${actions}</div>` : ''}</div>`; }
function render() {
  if (!data) return;
  ui.refreshPending = false;
  const r = route(); let c = r.page === 'campaign' ? campaignOf(r.campaignId) : null; let html;
  if (r.page === 'campaign' && !c) html = empty('Campaign not available', 'Join with a valid invitation or return to your campaigns.', link('My campaigns', '#/', 'back'));
  else if (r.page === 'notebook') html = renderNotes(null);
  else if (r.page === 'library') html = renderLibrary(false);
  else if (r.page === 'designer') html = data.can_design ? renderLibrary(true) : empty('Designer access required', 'Sign in with an account that has the Game Designer role.', link('Open official library','#/library','book'),'lock');
  else if (c) {
    if (r.tab === 'characters') html = renderCharacters(c);
    else if (r.tab === 'character') html = renderCharacter(c, r.recordId, r.query.has('edit'));
    else if (r.tab === 'journal') html = renderNotes(c);
    else if (r.tab === 'inventory') html = renderInventory(c);
    else if (r.tab === 'world') html = renderWorld(c);
    else if (r.tab === 'session') html = renderSession(c);
    else if (r.tab === 'settings' && isGm(c)) html = renderSettings(c);
    else html = renderOverview(c);
  } else html = renderHome();
  root.innerHTML = shell(html, c); status();
  document.title = `${c?.name || ({notebook:'Notebook',library:'Official library',designer:'Designer Studio'}[r.page] || 'My campaigns')} | Empyrean`;
  if (r.tab === 'world' && c) loadMapImage(c);
}
function renderHome() {
  const campaigns = data.campaigns.filter(c => ui.filter === 'all' || (ui.filter === 'gm') === isGm(c));
  return `${heading('Your workspace', 'Every world starts here.', 'Your campaigns, characters, and stories. All in one place.', btn('Join campaign','join','link') + btn('Create campaign','create-campaign','plus','primary'))}${campaignCleanupNotices()}<div class="stat-strip">${[['compass',data.campaigns.length,'Active campaigns'],['users',data.characters.filter(ch=>ch.owner_id===uid()&&!ch.npc&&!ch.claimable).length,'Your characters'],['map',data.maps.length,'Saved maps']].map(([g,n,l])=>`<div class="stat"><span class="stat-icon">${icon(g)}</span><div><strong>${n.toString().padStart(2,'0')}</strong><small>${l}</small></div></div>`).join('')}</div><div class="section-heading"><h2>Your campaigns</h2><small>${data.campaigns.length} ${data.campaigns.length===1?'world':'worlds'} to return to</small></div><div class="filter-tabs" role="group" aria-label="Filter campaigns">${[['all','All campaigns'],['gm','Running'],['player','Playing']].map(([v,l])=>`<button type="button" data-action="filter" data-value="${v}" class="${ui.filter===v?'active':''}">${l}</button>`).join('')}</div><div class="campaign-grid">${campaigns.map(renderCampaignCard).join('')}<button class="campaign-create" data-action="create-campaign"><span class="campaign-create-inner"><span class="create-icon">${icon('plus')}</span><h3>Make room for a new world</h3><p>Create a campaign and invite your party.</p></span></button></div><div class="below-grid"><section><div class="section-heading"><h2>At your table</h2>${icon('clock')}</div>${renderActivity(data.activity.slice(0,5))}</section><section><div class="section-heading"><h2>Your characters</h2><small>Ready when you are</small></div>${data.characters.filter(c=>c.owner_id===uid()&&!c.npc&&!c.claimable).slice(0,3).map(ch=>`<a class="roster-row" href="${pathFor(ch.campaign_id,'character/'+ch.id)}">${avatar(ch.name)}<div class="grow"><h3>${esc(ch.name)}</h3><small>${esc(campaignOf(ch.campaign_id)?.name)}</small></div>${pill(ch.status==='draft'?'In creation':'Ready',ch.status==='draft'?'amber':'')}${icon('chevron')}</a>`).join('') || `<p class="muted" style="font-size:12px;padding:12px 0">Join a campaign to create your first character.</p>`}</section></div>`;
}
function campaignCleanupNotices() {
  return (data.campaign_upload_cleanup || []).map(job=>`<div class="notice cleanup-notice"><p>A deleted campaign still has uploaded map files to remove.</p>${btn('Retry map cleanup','retry-upload-cleanup','cloud','small',recordAttr(job.campaign_id))}</div>`).join('');
}
function renderLibrary(studio) {
  const published = data.official_catalog || { catalog: emptyCatalog(), revision: 0 };
  if (studio && (!ui.studioDraft || (!ui.studioDraft.dirty && ui.studioDraft.revision !== published.revision))) {
    ui.studioDraft = { ...clone(published), dirty: false };
  }
  const draft = studio ? ui.studioDraft : published;
  const category = ui.studioTab;
  const type = CONTENT_TYPES[category];
  const attrs = `data-kind="${category}"`;
  const entries = studio ? draft.catalog[category] : draft.catalog[category].filter(entry => entry.enabled !== false);
  const stale = draft.revision !== published.revision;
  const add = studio ? btn(`Add ${type.singular}`, 'add-content', 'plus', 'primary', attrs) : '';
  const actions = studio ? link('View published library','#/library','book') : data.can_design ? link('Designer Studio','#/designer','edit') : '';
  return `${heading('Workspace', studio?'Designer Studio':'Official library', studio?'Create, edit, and publish game content for every campaign.':'Game content published by the Empyrean designer.', actions)}
    ${stale ? `<div class="notice error">The published catalog changed while you were editing. ${btn('Reload catalog','reload-studio','','small')}</div>` : ''}
    <div class="settings-tabs library-tabs" role="group" aria-label="Content categories">${Object.entries(CONTENT_TYPES).map(([key,value])=>`<button class="${key===category?'active':''}" data-action="studio-tab" data-value="${key}" aria-pressed="${key===category}">${value.title}</button>`).join('')}</div>
    <div class="section-heading"><h2>${type.title}</h2>${add}</div>
    ${entries.length ? `<div class="library-grid">${entries.map(entry=>renderLibraryEntry(draft.catalog,category,entry,studio)).join('')}</div>` : empty('Nothing here yet',studio?'Add an entry and publish the catalog when it’s ready.':'Published content in this category will appear here.','',type.icon)}
    ${studio ? `<div class="save-bar"><p class="${draft.dirty?'dirty-badge':''}">${draft.dirty?'Unpublished changes':'Catalog up to date'}</p>${btn('Publish catalog','publish-studio','check','primary',draft.dirty&&!stale?'':'disabled')}</div>` : ''}`;
}
function renderLibraryEntry(catalog,category,entry,studio) {
  const attrs=`data-kind="${category}" ${recordAttr(entry.id)}`;
  const grants = ['skills','abilities'].flatMap(kind=>kind===category?[]:(entry[kind]||[]).map(id=>catalog[kind].find(item=>item.id===id)?.name).filter(Boolean));
  const details = [category==='abilities'?`${entry.cost} Merit`:'',entry.generic&&category==='skills'?'General skill':'',entry.meritBonus?`+${fmt(entry.meritBonus)} starting Merit`:'',entry.sparksBonus?`+${fmt(entry.sparksBonus)} starting Sparks`:'',...grants].filter(Boolean);
  const variants = entry.variants?.filter(variant=>studio||variant.enabled!==false).map(variant=>variant.name);
  return `<article class="panel library-card"><div class="row"><span class="stat-icon">${icon(CONTENT_TYPES[category].icon)}</span><h3 class="grow">${esc(entry.name)}</h3>${studio&&entry.enabled===false?pill('Hidden','gray'):''}</div>
    ${entry.description?`<div class="text-content">${esc(entry.description)}</div>`:''}
    ${details.length?`<div class="actions">${details.map(detail=>pill(detail,'gray')).join('')}</div>`:''}
    ${variants?.length?`<p class="muted">Variants · ${esc(variants.join(', '))}</p>`:''}
    ${studio?`<div class="library-card-actions actions">${btn('Edit','edit-content','edit','small',attrs)}${btn('Delete','delete-official','trash','small danger',attrs)}</div>`:''}</article>`;
}
function deleteOfficialModal(category,id) {
  const draft=ui.studioDraft;
  const entry=draft.catalog[category].find(entry=>entry.id===id);
  openModal(`Delete ${entry.name}?`,'<p>Publishing this deletion will remove the entry and its grants from campaign catalogs. Finished characters retain their saved rules.</p>',()=>{
    draft.catalog=removeCatalogEntry(draft.catalog,category,id);
    draft.dirty=true;closeModal();render();
  },'Delete from draft','',false,true);
}
function renderCampaignCard(c, i) {
  const members = membersOf(c.id); const ch = partyOf(c.id); const map = data.maps.find(m=>m.campaign_id===c.id && m.image_url && !m.storage_path);
  const image = map?.image_url || './src/assets/meridian-outpost.svg';
  return `<a class="campaign-card" href="${pathFor(c.id)}"><div class="campaign-art"><img src="${esc(image)}" alt="" loading="lazy"/>${pill(isGm(c)?'GAME MASTER':'PLAYER')}<span class="art-index">CAMPAIGN / ${String(i+1).padStart(2,'0')}</span></div><div class="campaign-card-body"><h3>${esc(c.name)}</h3><p>${esc(c.description || 'A new world, waiting for its story.')}</p><div class="campaign-card-footer"><div class="row"><span>${members.slice(0,3).map(m=>avatar(m.display_name)).join('')}</span><span style="margin-left:7px">${members.length} at the table</span></div><span>${ch.length} ${ch.length===1?'character':'characters'}</span>${icon('arrow')}</div></div></a>`;
}
function renderActivity(list) { return list.length ? list.map(a=>`<div class="activity-row"><span class="activity-dot"></span><div class="grow"><strong>${esc(a.actor_name)}</strong><p>${esc(a.message)}</p></div><small>${date(a.created_at)}</small></div>`).join('') : '<p class="muted" style="font-size:12px;padding:15px 0">Campaign milestones will appear here.</p>'; }
function renderOverview(c) {
  const chars=partyOf(c.id); const mine=chars.filter(ch=>ch.owner_id===uid()); const pending=charactersOf(c.id).filter(ch=>ch.review?.status==='pending');
  return `${heading('Campaign / Overview',c.name,c.description, isGm(c)?btn('Invite players','invite','link','primary',`data-id="${c.id}"`):btn(mine.length?'New character':'Create your character','new-character','plus','primary',`data-id="${c.id}"`))}<div class="campaign-banner"><div><div class="eyebrow">${isGm(c)?'Your world. Their story.':'Welcome to the table.'}</div><h2>${isGm(c)?'The next chapter is yours to shape.':'A place in a bigger story.'}</h2><p>${isGm(c)?'Gather your party and bring the world to life.':mine.length?'Return to your character or explore the world.':'Your campaign is ready for a new character.'}</p><div class="summary-numbers"><span><strong>${membersOf(c.id).length}</strong>Members</span><span><strong>${chars.length}</strong>Characters</span><span><strong>${data.maps.filter(m=>m.campaign_id===c.id).length}</strong>Maps</span></div></div>${link('Open world & table',pathFor(c.id,'world'),'arrow')}</div>${!c.catalog.lineages.length && isGm(c)?`<div class="notice" style="margin-bottom:25px">Add the new edition’s lineages and skills before your players begin. ${link('Manage campaign content',pathFor(c.id,'settings'),'arrow','small')}</div>`:''}<div class="two-col"><div class="stack">${isGm(c)&&pending.length?`<section><div class="section-heading"><h2>Awaiting your review</h2>${pill(pending.length+' pending','amber')}</div>${pending.map(ch=>`<div class="pending-card"><h3>${esc(ch.build.background.name)}</h3><p>${esc(ch.name)} · ${esc(ownerName(ch.owner_id))}</p>${btn('Review background','review','eye','small',`data-id="${ch.id}"`)}</div>`).join('')}</section>`:''}<section><div class="section-heading"><h2>The party</h2>${link('All characters',pathFor(c.id,'characters'),'arrow','text small')}</div>${chars.length?`<div class="character-list">${chars.map(ch=>renderCharacterCard(c,ch)).join('')}</div>`:empty('The party is taking shape','Invite players to begin character creation.',isGm(c)?btn('Invite players','invite','link','small',`data-id="${c.id}"`):btn('Create character','new-character','plus','small',`data-id="${c.id}"`),'users')}</section><section><div class="section-heading"><h2>Recent activity</h2></div>${renderActivity(data.activity.filter(a=>a.campaign_id===c.id).slice(0,6))}</section></div><div class="stack"><section class="panel"><div class="section-heading"><h2>At the table</h2>${pill('CAMPAIGN')}</div>${membersOf(c.id).map(m=>`<div class="roster-row">${avatar(m.display_name)}<div class="grow"><h3>${esc(m.display_name)}${m.user_id===uid()?' <small>(you)</small>':''}</h3><small>${m.role==='gm'?'Game master':'Player'}</small></div>${m.role==='gm'?icon('compass'):''}</div>`).join('')}</section><section class="panel"><div class="section-heading"><h2>Starting parameters</h2>${icon('settings')}</div><div class="rule-summary"><div class="metric"><strong>${fmt(c.settings.startingMerit)}</strong><small>Merit</small></div><div class="metric"><strong>${fmt(c.settings.startingSparks)}</strong><small>Sparks</small></div></div><p class="muted" style="font-size:11px">Creation maximums: Attributes ${c.settings.attributeCap} · Skills ${c.settings.skillCap}</p>${isGm(c)?link('Edit campaign rules',pathFor(c.id,'settings'),'arrow','text small'):''}</section></div></div>`;
}
function renderCharacterCard(c,ch) {
  const lineage = ch.npc ? null : characterRules(c,ch).catalog.lineages.find(l=>l.id===ch.build.lineageId);
  const detail = ch.npc ? ch.npc.role || 'GM controlled' : `${lineage?.name || 'Lineage not selected'} · ${ch.claimable ? 'Awaiting a player' : ownerName(ch.owner_id)}`;
  return `<a href="${characterPath(ch)}" class="character-card">${avatar(ch.name,ch.npc?'large npc-avatar':'large')}<div class="grow"><h3>${esc(ch.name)}</h3><small>${esc(detail)}</small></div>${ch.npc?pill('GM only','amber'):pill(ch.status==='draft'?'In creation':'Active',ch.status==='draft'?'amber':'')}${icon('chevron')}</a>`;
}
function renderCharacters(c) {
  const chars = charactersOf(c.id), party = partyOf(c.id), gm = isGm(c), attrs = recordAttr(c.id);
  const create = btn('New character','new-character','plus','primary',attrs);
  const pregen = btn('Build for a player','new-pregen','users','',attrs);
  const npc = btn('New NPC','new-npc','plus','',attrs);
  const group = (title, entries, copy, action = '') => `<section><div class="section-heading"><h2>${title}</h2></div><div class="character-list">${entries.map(ch=>renderCharacterCard(c,ch)).join('') || empty(copy[0],copy[1],action,'users')}</div></section>`;
  return `${heading('Campaign / Characters','Characters','',create+(gm?pregen+npc:''))}<div class="character-workspace ${gm?'has-gm-roster':''}">${group('Party',party,['No characters yet','Create a character using this campaign’s starting rules.'])}${gm?`<aside class="stack">${group('Unassigned sheets',chars.filter(ch=>ch.claimable),['No unassigned sheets','Build a sheet to give to a player.'],pregen)}${group('NPC roster',chars.filter(ch=>ch.npc),['No NPCs yet','Create a GM-controlled sheet with custom stats.'],npc)}</aside>`:''}</div>`;
}
function characterManagement(ch) {
  if (!canEditCharacter(ch)) return '';
  const attrs = recordAttr(ch.id);
  return (ch.claimable ? btn('Assign character','assign-character','link','primary',attrs) : '') + btn(ch.npc?'Delete NPC':'Delete character','delete-character','trash','danger',attrs);
}
function renderNpc(c,ch) {
  const npc = ch.npc;
  const actions = btn('Edit NPC','edit-npc','edit','primary',recordAttr(ch.id)) + btn('Place on map','npc-to-map','pin','',recordAttr(ch.id)) + characterManagement(ch);
  const detail = (label, value) => value ? `<section class="panel"><h2>${label}</h2><div class="text-content">${esc(value)}</div></section>` : '';
  return `${heading('Campaign / NPC sheet',ch.name,npc.role,actions)}<div class="npc-summary">${avatar(ch.name,'large npc-avatar')}<div><strong>GM-controlled NPC</strong><p class="muted">The sheet is GM only. You choose which tokens players can see.</p></div></div><div class="sheet-sections npc-sheet"><section class="panel"><h2>Stats</h2>${npc.stats.length?`<dl class="npc-stats">${npc.stats.map(({label,value})=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:'<p class="muted">Add stats in Edit NPC.</p>'}</section><aside class="stack">${detail('Description',npc.description)}${detail('GM notes',npc.notes)}${link('Back to characters',pathFor(c.id,'characters'),'back','text')}</aside></div>`;
}

function editorFor(ch) {
  if (!ui.editor || ui.editor.id!==ch.id) ui.editor={id:ch.id,build:clone(ch.build),name:ch.name,revision:ch.revision,step:0,dirty:false};
  return ui.editor;
}
function renderCharacter(c,id,editing) {
  const ch=data.characters.find(ch=>ch.id===id && ch.campaign_id===c.id);
  if(!ch) return empty('Character not available','Drafts are visible to their owner and GM.',link('Back to characters',pathFor(c.id,'characters'),'back'));
  if(ch.npc) return renderNpc(c,ch);
  if(canEditCharacter(ch) && (ch.status==='draft'||editing)) return renderCreation(c,ch);
  return renderSheet(c,ch);
}
function renderCreation(c,ch) {
  const ed=editorFor(ch), b=ed.build, rules=characterRules(c,ch), active=ch.status==='active';
  const review=JSON.stringify(b.background)===JSON.stringify(ch.build.background)?ch.review:null;
  const info=buildInfo(rules,b,review); const oldInfo=buildInfo(rules,ch.build,ch.review); const remaining=active?ch.merit-(info.spent-oldInfo.spent):info.merit-info.spent;
  const steps=active?['Advancement','Identity']:['Lineage','Background','Merit','Identity','Review'];
  const title=active?`Advance ${ch.name}`:ch.claimable?`Build ${ed.name}`:'Make this character yours.';
  const step=ed.step; let panel;
  if(active) panel=step===0?renderMerit(rules,ch,ed,info,remaining,true):renderIdentity(ed);
  else if(step===0) panel=renderLineage(rules,ed);
  else if(step===1) panel=renderBackground(rules,ch,ed);
  else if(step===2) panel=renderMerit(rules,ch,ed,info,remaining,false);
  else if(step===3) panel=renderIdentity(ed);
  else panel=renderCreationReview(rules,ch,ed,info,review);
  return `${heading(active?'Character / Advancement':'Character / Creation',title,active?'Earned Merit can be spent on attributes, skills, and abilities.':c.name,link('Back to characters',pathFor(c.id,'characters'),'back')+characterManagement(ch))}<div class="steps" role="group" aria-label="Character creation steps">${steps.map((s,i)=>`<button class="step ${i===step?'active':''}" data-action="step" data-value="${i}"><b>${i+1}</b>${s}</button>`).join('')}</div>${ed.revision!==ch.revision?'<div class="notice error" style="margin-bottom:20px">This sheet changed on another device. Reload the saved sheet before saving your edits. '+btn('Reload saved sheet','reload-character','','small')+'</div>':''}<div class="creation-grid"><div><div id="creation-error" class="modal-error" role="alert"></div>${panel}</div><aside class="budget-panel"><div><div class="eyebrow">${active?'Earned Merit':'Creation budget'}</div><div class="remaining" style="${remaining<0?'color:var(--red)':''}">${fmt(remaining)}</div><small>Merit remaining</small></div><div><div class="budget-row"><span>Attributes</span><strong>${fmt(info.attributeCost)}</strong></div><div class="budget-row"><span>Skills</span><strong>${fmt(info.skillCost)}</strong></div><div class="budget-row"><span>Abilities</span><strong>${fmt(info.abilityCost)}</strong></div><div class="budget-row total"><span>${active?'Available before edits':'Total Merit'}</span><strong>${fmt(active?ch.merit:info.merit)}</strong></div><div class="budget-row"><span>Sparks</span><strong>${fmt(active?ch.sparks:info.sparks)}</strong></div></div><p class="subtle">${active?'Attributes: maximum 5. Skills: maximum 10.':'Creation maximums\nAttributes '+c.settings.attributeCap+' · Skills '+c.settings.skillCap+'\nUnspent Merit is lost when creation is finished.'}</p></aside></div><div class="save-bar"><p class="${ed.dirty?'dirty-badge':''}">${ed.dirty?'Unsaved changes':'Draft saved'}${ch.review?.status==='pending'?' · Background awaiting GM review':''}</p><div class="actions">${btn(active?'Save advancement':'Save draft','save-character','','',`data-id="${ch.id}"`)}${step>0?btn('Back','step','back','',`data-value="${step-1}"`):''}${step<steps.length-1?btn('Continue','step','arrow','primary',`data-value="${step+1}"`):btn(active?'Save & return':'Finish Character Creation',active?'save-return':'finish-character','check','primary',`data-id="${ch.id}"`)}</div></div>`;
}
function renderLineage(c,ed) {
  const b=ed.build, lin=c.catalog.lineages.find(l=>l.id===b.lineageId); const lineages=c.catalog.lineages.filter(l=>l.enabled!==false);
  return `<section class="form-section"><div class="section-heading"><h2>Choose a lineage</h2><small>01 / Origins</small></div>${lineages.length?`<div class="option-grid">${lineages.map(l=>`<button class="option ${l.id===b.lineageId?'active':''}" data-action="lineage" data-id="${esc(l.id)}"><h3>${esc(l.name)}</h3><p>${esc(l.description || '')}</p>${l.skills?.length?pill(l.skills.length+' skill unlock'+(l.skills.length===1?'':'s'),'gray'):''}</button>`).join('')}</div>`:empty('No lineages available','Your GM needs to add a lineage in campaign settings.',isGm(c)?link('Manage content',pathFor(c.id,'settings'),'settings','small'):'')}<div class="form-grid">${lin?.variants?.some(v=>v.enabled!==false)?`<label class="full">Variant<select data-build="variantId">${options(lin.variants.filter(v=>v.enabled!==false),b.variantId,'Select a variant')}</select></label>`:''}<label>Age category${lin?.ageRequired===false?' (optional)':' *'}<select data-build="ageCategory">${options(AGE_CATEGORIES,b.ageCategory,'Select age category')}</select></label><label>Age in years (optional)<input data-build="ageYears" type="number" min="0" step="any" value="${esc(b.ageYears??'')}"/></label></div>${lin?`<div class="notice success">${esc(lin.name)}${lin.skills?.length?' · Skills: '+esc(lin.skills.map(id=>c.catalog.skills.find(s=>s.id===id)?.name||id).join(', ')):''}${lin.abilities?.length?' · Abilities: '+esc(lin.abilities.map(id=>c.catalog.abilities.find(a=>a.id===id)?.name||id).join(', ')):''}</div>`:''}</section>`;
}
function renderBackground(c,ch,ed) {
  const b=ed.build.background;
  return `<section class="form-section"><div class="section-heading"><h2>Where your story began</h2><small>02 / Background</small></div><div class="option-grid">${c.catalog.backgrounds.filter(e=>e.enabled!==false).map(bg=>`<button class="option ${b.kind==='preset'&&b.id===bg.id?'active':''}" data-action="background" data-id="${esc(bg.id)}"><h3>${esc(bg.name)}</h3><p>${esc(bg.description||'')}</p></button>`).join('')}${c.settings.allowCustomBackground?`<button class="option ${b.kind==='custom'?'active':''}" data-action="custom-background"><h3>Custom background</h3><p>Build your own. Requires GM approval.</p>${b.kind==='custom'?pill(ch.review?.status||'Not submitted',ch.review?.status==='approved'?'':'amber'):''}</button>`:''}${c.settings.allowBackgroundBypass?`<button class="option ${b.kind==='bypass'?'active':''}" data-action="bypass-background"><h3>Forge your own path</h3><p>Bypass a background.</p>${pill('+5 Merit · +500 Sparks')}</button>`:''}</div>${!c.catalog.backgrounds.length?'<p class="muted" style="font-size:11px">Preset backgrounds will appear here as your GM adds them.</p>':''}${b.kind==='custom'?`<div class="panel"><div class="section-heading"><h3>${esc(b.name)}</h3>${btn('Edit configuration','custom-background','edit','small')}</div>${ch.review?`<div class="notice ${ch.review.status==='approved'?'success':ch.review.status==='denied'?'error':''}">${esc(ch.review.status==='pending'?'Awaiting GM approval':ch.review.status==='approved'?'Approved by the GM':'Denied by the GM')}${ch.review.comment?': '+esc(ch.review.comment):''}</div>`:'<div class="notice">Save your draft to submit this background for GM review.</div>'}${Object.entries(b.answers||{}).map(([k,v])=>`<p style="font-size:12px;margin-top:12px"><strong>${esc(k)}</strong><br/>${esc(v)}</p>`).join('')}</div>`:''}</section>`;
}
function rankCell(label,rank,kind,id,cap,remaining,active,original=0) {
  const cost=kind==='attribute'?2*(rank+1):rank+1;
  return `<div class="rank-cell"><h3>${esc(label)}</h3><div class="rank-control"><button type="button" data-action="rank" data-kind="${kind}" data-id="${esc(id)}" data-value="-1" aria-label="Decrease ${esc(label)}" ${rank<=(active?original:kind==='attribute'?1:0)?'disabled':''}>${icon('minus')}</button><strong>${rank}</strong><button type="button" data-action="rank" data-kind="${kind}" data-id="${esc(id)}" data-value="1" aria-label="Increase ${esc(label)}" ${rank>=cap||remaining<cost?'disabled':''}>${icon('plus')}</button></div><small>${rank>=cap?'Maximum '+cap:'Next: '+cost+' Merit'}</small></div>`;
}
function renderMerit(c,ch,ed,info,remaining,active) {
  const b=ed.build; const skills=c.catalog.skills.filter(s=>(info.skills.includes(s.id)&&s.enabled!==false)||(b.skills[s.id]||0)>0);
  for(const id of Object.keys(b.skills))if(!skills.some(s=>s.id===id))skills.push({id,name:id,enabled:false});
  const skillRows=skills.map(s=>{
    const available=info.skills.includes(s.id)&&s.enabled!==false;
    const cap=available?(active?10:c.settings.skillCap):0;
    const rank=b.skills[s.id]||0;
    const caption=available?`${s.generic?'General skill':'Unlocked'} · ${rank>=cap?'Maximum reached':'Next: '+(rank+1)+' Merit'}`:'Source unavailable · refund ranks to continue';
    const controls=rankCell(s.name,rank,'skill',s.id,cap,remaining,active,ch.build.skills[s.id]||0)
      .replace(/^<div class="rank-cell">.*?<div class="rank-control">/,'<div class="rank-control">')
      .replace(/<small>.*?<\/small><\/div>$/,'');
    return `<div class="skill-row"><div><h3>${esc(s.name)}</h3><small>${esc(caption)}</small></div>${controls}</div>`;
  }).join('');
  const abilities=c.catalog.abilities.filter(a=>a.enabled!==false||b.abilities.includes(a.id)).map(a=>{
    const free=info.freeAbilities.includes(a.id),owned=free||b.abilities.includes(a.id);
    const locked=(owned&&active&&ch.build.abilities.includes(a.id))||(!owned&&(remaining<a.cost||a.enabled===false));
    const grants=a.skills?.length?' · Unlocks '+esc(a.skills.map(id=>c.catalog.skills.find(s=>s.id===id)?.name||id).join(', ')):'';
    return `<div class="ability-row"><span class="stat-icon">${icon('spark')}</span><div class="grow"><h3>${esc(a.name)}${a.enabled===false?' '+pill('Disabled','gray'):''}</h3><p>${esc(a.description||'')}${grants}</p></div>${free?pill('Granted'):btn(owned?'Selected':a.cost+' Merit','ability',owned?'check':'plus','small',`data-id="${esc(a.id)}" ${locked?'disabled':''}`)}</div>`;
  }).join('');
  return `<section class="form-section"><div class="section-heading"><h2>Attributes</h2><small>Each new rank costs 2 × its value</small></div><div class="rank-grid">${ATTRIBUTES.map(n=>rankCell(n,b.attributes[n],'attribute',n,active?5:c.settings.attributeCap,remaining,active,ch.build.attributes[n])).join('')}</div></section>
    <section class="form-section"><div class="section-heading"><h2>Skills</h2><small>Each new rank costs its value</small></div>${skills.length?`<div class="content-list">${skillRows}</div>`:empty('No unlocked skills','Skills are unlocked by campaign rules, lineage, background, and abilities.')}</section>
    <section class="form-section"><div class="section-heading"><h2>Abilities</h2><small>Merit cost varies</small></div>${abilities||'<p class="muted" style="font-size:12px">Your GM can add abilities in campaign settings.</p>'}</section>`;
}
function renderIdentity(ed) { const b=ed.build; return `<section class="form-section"><div class="section-heading"><h2>A name. A life. A story.</h2></div><div class="form-grid"><label class="full">Character name *<input data-character-name value="${esc(ed.name==='Unnamed character'?'':ed.name)}" maxlength="120" required/></label>${[['Height','height'],['Weight','weight'],['Eye color','eyeColor'],['Hair color','hairColor'],['Oracle ID','oracleId']].map(([l,k])=>`<label>${l}<input data-bio="${k}" value="${esc(b.bio?.[k]||'')}" maxlength="200"/></label>`).join('')}<label class="full">Appearance & story<textarea data-bio="description" maxlength="10000" rows="6">${esc(b.bio?.description||'')}</textarea></label></div></section>`; }
function renderCreationReview(c,ch,ed,info,review) { const b=ed.build; const lin=c.catalog.lineages.find(l=>l.id===b.lineageId); const bg=b.background.kind==='bypass'?'No background · +5 Merit / +500 Sparks':b.background.kind==='custom'?b.background.name:c.catalog.backgrounds.find(g=>g.id===b.background.id)?.name; let error=''; try {validateBuild(c,b,{finish:true,review});demand(ed.name.trim()&&ed.name!=='Unnamed character','Enter a character name.');}catch(e){error=e.message;} return `<section class="form-section"><h2>Ready for the first chapter?</h2>${error?`<div class="notice error">${esc(error)}</div>`:'<div class="notice success">Your character meets the campaign’s creation rules.</div>'}<div class="panel"><h2 style="margin-bottom:20px">${esc(ed.name)}</h2><dl class="review-grid">${[['Lineage',lin?.name||'Not selected'],['Variant',lin?.variants?.find(v=>v.id===b.variantId)?.name||'None'],['Age',b.ageCategory+(b.ageYears!==null?' · '+b.ageYears+' years':'')||'Not set'],['Background',bg||'Not selected'],['Merit spent',fmt(info.spent)+' / '+fmt(info.merit)],['Starting Sparks',fmt(info.sparks)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div><div class="notice">Finishing locks creation choices and ends refunds. Any remaining creation Merit will be discarded.</div></section>`; }

function renderSheet(c,ch) {
  const rules=characterRules(c,ch),b=ch.build,info=buildInfo(rules,b,ch.review); const mine=ch.owner_id===uid();
  const lin=rules.catalog.lineages.find(l=>l.id===b.lineageId); const bg=b.background.kind==='custom'?b.background.name:b.background.kind==='bypass'?'Independent':rules.catalog.backgrounds.find(g=>g.id===b.background.id)?.name;
  const actions=(mine&&ch.status==='active'?link('Spend Merit',pathFor(c.id,'character/'+ch.id)+'?edit=1','plus'):'')+(isGm(c)&&ch.status==='active'?btn('Award Merit / Sparks','award','spark','primary',`data-id="${ch.id}"`):'')+(ch.claimable?'':btn('Share sheet','share-sheet','link','',recordAttr(ch.id)))+characterManagement(ch);
  return `${heading('Campaign / Character sheet',ch.status==='draft'?'Character in progress':'Character sheet','',actions)}<div class="sheet-banner">${avatar(ch.name)}<div class="grow"><h1>${esc(ch.name)}</h1><p>${esc(lin?.name||'Lineage not selected')} · ${esc(bg||'Background not selected')} · ${esc(ch.claimable?'Unassigned':ownerName(ch.owner_id))}</p></div><div class="sheet-currency"><div><strong>${fmt(ch.status==='draft'?info.merit-info.spent:ch.merit)}</strong><small>${ch.status==='draft'?'Creation Merit':'Unspent Merit'}</small></div><div><strong>${fmt(ch.status==='draft'?info.sparks:ch.sparks)}</strong><small>Sparks ${mine&&ch.status==='active'?btn('Spend','spend-sparks','','small',`data-id="${ch.id}"`):''}</small></div></div></div>${ch.status==='draft'?'<div class="notice" style="margin-bottom:25px">Draft character. Only the player and GM can view this sheet.</div>':''}${isGm(c)&&ch.review?.status==='pending'?`<div class="pending-card"><h3>Custom background awaiting review</h3><p>${esc(b.background.name)}</p>${btn('Review background','review','eye','small',`data-id="${ch.id}"`)}</div>`:''}<div class="sheet-sections"><div class="stack"><section><div class="section-heading"><h2>Attributes</h2>${btn('Dice roller','roll','dice','small')}</div><div class="sheet-attrs">${ATTRIBUTES.map(n=>`<div class="sheet-attr"><small>${n}</small><strong>${b.attributes[n]}</strong><button type="button" data-action="roll" data-value="${b.attributes[n]}" aria-label="Roll ${n}" title="Roll ${n}">${icon('dice')}</button></div>`).join('')}</div></section><section><div class="section-heading"><h2>Skills</h2><small>Unlocked skills appear at rank 0</small></div><div class="content-list">${rules.catalog.skills.filter(s=>info.skills.includes(s.id)).map(s=>`<div class="skill-row"><span>${esc(s.name)}</span><strong>${b.skills[s.id]||0}</strong></div>`).join('')||'<div style="padding:20px" class="muted">No skills unlocked.</div>'}</div></section><section><div class="section-heading"><h2>Abilities</h2></div>${info.abilities.map(id=>{const a=rules.catalog.abilities.find(a=>a.id===id);return a?`<div class="ability-row">${icon('spark')}<div><h3>${esc(a.name)}</h3><p>${esc(a.description||'')}</p></div>${info.freeAbilities.includes(id)?pill('Granted','gray'):''}</div>`:'';}).join('')||'<p class="muted" style="font-size:12px">No abilities acquired.</p>'}</section></div><aside class="stack"><section class="panel"><div class="section-heading"><h2>Identity</h2>${mine?link('Edit',pathFor(c.id,'character/'+ch.id)+'?edit=1','edit','text small'):''}</div><dl class="review-grid">${[['Lineage',lin?.name||''],['Variant',lin?.variants?.find(v=>v.id===b.variantId)?.name||''],['Age category',b.ageCategory],['Years',b.ageYears??''],['Height',b.bio?.height],['Weight',b.bio?.weight],['Eye color',b.bio?.eyeColor],['Hair color',b.bio?.hairColor],['Oracle ID',b.bio?.oracleId]].filter(([,v])=>v!==''&&v!==undefined).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>${b.bio?.description?`<section class="panel"><h3 style="margin-bottom:15px">Appearance & story</h3><div class="text-content">${esc(b.bio.description)}</div></section>`:''}<section class="panel"><h3 style="margin-bottom:12px">At the table</h3><div class="stack" style="gap:8px">${link('World & table',pathFor(c.id,'world'),'map','text small')}${link('Inventory',pathFor(c.id,'inventory'),'box','text small')}${link('Campaign journal',pathFor(c.id,'journal'),'book','text small')}</div></section></aside></div>`;
}
function audienceLabel(note) { if(note.audience==='player')return 'To '+ownerName(note.recipient_id); return {private:'Private',party:'Whole party',gm:'You & GM'}[note.audience]||'Private'; }
function renderNotes(c) {
  const notes=data.notes.filter(n=>n.campaign_id===(c?.id||null));
  return `${heading(c?'Campaign / Journal':'Your workspace',c?'The campaign journal.':'A notebook of your own.',c?'Shared discoveries, private thoughts, and conversations with your GM.':'Personal notes stay with your account.',btn('New note','new-note','plus','primary',`data-campaign="${c?.id||''}"`))}${notes.length?`<div class="notes-grid">${notes.map(n=>`<article class="note-card"><div class="row between"><span class="eyebrow" style="margin:0">${esc(audienceLabel(n))}</span>${n.owner_id===uid()?ibtn('Edit note','edit-note','edit',`data-id="${n.id}"`):''}</div><h3>${esc(n.title)}</h3><div class="text-content">${esc(n.body)}</div><div class="note-footer row between"><span>${esc(ownerName(n.owner_id))}</span><span>Updated ${date(n.updated_at)}</span></div></article>`).join('')}</div>`:empty(c?'A story waiting to be written':'Your thoughts have a home','Create a note to get started.',btn('Write a note','new-note','plus','primary',`data-campaign="${c?.id||''}"`),'book')}`;
}
function renderInventory(c) {
  const items=data.items.filter(i=>i.campaign_id===c.id);
  return `${heading('Campaign / Inventory','What the party carries.','Personal equipment and a shared campaign stash.',btn('Add item','new-item','plus','primary',`data-id="${c.id}"`))}${items.length?`<div class="table-wrap"><table><thead><tr><th>Item</th><th>Quantity</th><th>Held by</th><th><span class="hidden">Actions</span></th></tr></thead><tbody>${items.map(i=>`<tr><td><strong>${esc(i.name)}</strong><p>${esc(i.details)}</p></td><td>${i.quantity}</td><td>${i.owner_id?esc(ownerName(i.owner_id)):pill('Party stash','gray')}</td><td>${!i.owner_id||i.owner_id===uid()||isGm(c)?`<div class="actions">${ibtn('Edit item','edit-item','edit',`data-id="${i.id}"`)}${btn('Transfer','transfer-item','arrow','small',`data-id="${i.id}"`)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`:empty('The stash is empty','Add equipment, supplies, and discoveries.',btn('Add item','new-item','plus','primary',`data-id="${c.id}"`),'box')}`;
}
function currentMap(c) { const maps=data.maps.filter(m=>m.campaign_id===c.id); const q=route().query.get('map'); const id=q||ui.mapId; return maps.find(m=>m.id===id)||maps[0]; }
function selectMap(id) {
  ui.mapId=id;ui.mapZoom=1;
  const params=route().query;
  params.set('map',id);
  history.replaceState(null,'',pathFor(route().campaignId,'world')+'?'+params);
  render();
}
function markerSheetLink(marker) {
  const ch=data.characters.find(ch=>ch.id===marker.character_id);
  return ch ? `<a class="icon-btn" href="${characterPath(ch)}" title="Open ${esc(ch.name)} sheet" aria-label="Open ${esc(ch.name)} sheet">${icon('book')}</a>` : '';
}
function renderWorld(c) {
  const maps=data.maps.filter(m=>m.campaign_id===c.id),mp=currentMap(c); const gm=isGm(c); const markers=data.markers.filter(m=>m.map_id===mp?.id);
  return `${heading('Campaign / World & table','A world worth exploring.',mp?`${mp.scale.charAt(0).toUpperCase()+mp.scale.slice(1)} map · ${mp.name}`:'Maps, places, and the party’s position.',(gm?btn('Add map','new-map','plus','primary',`data-id="${c.id}"`):'')+btn('Copy table link','share-world','link','',`data-id="${c.id}"`))}${mp?`<div class="map-bar"><select data-map-select aria-label="Choose campaign map">${options(maps,mp.id)}</select><div class="actions">${pill(mp.visible?'Visible to party':'GM only',mp.visible?'':'amber')}${ibtn('Zoom out','zoom-out','minus')}${btn(Math.round(ui.mapZoom*100)+'%','zoom-reset','','small')}${ibtn('Zoom in','zoom-in','plus')}${gm?ibtn('Edit map','edit-map','settings',`data-id="${mp.id}"`):''}${gm?btn('Add marker','new-marker','pin','small',recordAttr(mp.id))+btn('Place NPC','place-npc','users','small',recordAttr(mp.id)):''}</div></div><div class="world-layout"><div><div class="map-viewport"><div class="map-canvas" data-map-canvas data-map-id="${mp.id}" style="width:${ui.mapZoom*100}%;--cell:${mp.grid?100/mp.grid:100}%"><img data-map-image alt="${esc(mp.name)}" src="${esc(mp.image_url||'./src/assets/meridian-outpost.svg')}"/>${mp.grid?'<div class="map-grid"></div>':''}${markers.map(m=>`<button type="button" class="marker ${(gm||m.owner_id===uid())?'movable':''} ${m.hidden?'hidden-marker':''}" data-marker="${m.id}" style="left:${m.x}%;top:${m.y}%;--marker:${esc(m.color)}" aria-label="${esc(m.name)}${m.hidden?' (GM only)':''}" title="${esc(m.name)}${gm?' · Click to edit':''}">${esc(initials(m.name))}<span>${esc(m.name)}</span></button>`).join('')}</div></div><div class="map-key">${icon('pin')}<span>${markers.length} ${markers.length===1?'marker':'markers'}</span><span>${mp.grid?mp.grid+' grid columns':'Grid off'}</span>${gm?'<span>GM view</span>':''}</div></div><aside class="map-side panel"><h3>On this map</h3><div class="marker-list">${markers.map(m=>`<div class="marker-list-row"><span class="token-dot" style="--marker:${esc(m.color)}"></span><span class="grow">${esc(m.name)}</span>${markerSheetLink(m)}${m.hidden?icon('lock'):''}${gm?ibtn('Edit '+m.name,'edit-marker','edit',`data-id="${m.id}"`):''}</div>`).join('')||'<small>No markers placed.</small>'}</div>${gm?btn('Add marker','new-marker','plus','small',`data-id="${mp.id}"`):''}<hr/><h3>Saved maps</h3>${maps.map(m=>`<button class="btn text small" data-action="select-map" data-id="${m.id}">${icon('map')}${esc(m.name)}</button>`).join('')}</aside></div>`:empty('Your world is waiting',gm?'Add a map image or a blank grid and place your first markers.':'Your GM has not shared any maps yet.',gm?btn('Add map','new-map','plus','primary',`data-id="${c.id}"`):'','map')}`;
}
async function loadMapImage(c) {
  const mp=currentMap(c); if(!mp)return;
  try {const url=await store.mapUrl(mp); const img=document.querySelector(`[data-map-id="${mp.id}"] [data-map-image]`);if(img&&url){img.src=url;img.onload=()=>{const canvas=img.closest('[data-map-canvas]');if(canvas)canvas.style.aspectRatio=img.naturalWidth+'/'+img.naturalHeight;};}else if(img&&!url){img.removeAttribute('src');img.style.visibility='hidden';}}
  catch(e){toast(e.message,true);}
}
function renderSettings(c) {
  if(!ui.settingsDraft||ui.settingsDraft.id!==c.id)ui.settingsDraft={...clone(c),dirty:false};
  const draft=ui.settingsDraft; const s=draft.settings; const tab=ui.settingsTab;
  const rules=`<section class="panel form-section"><h3>Campaign details</h3><div class="form-grid"><label class="full">Campaign name<input data-settings="name" value="${esc(draft.name)}" maxlength="120" required/></label><label class="full">Description<textarea data-settings="description" maxlength="5000">${esc(draft.description)}</textarea></label></div><h3>Character creation</h3><div class="form-grid">${[['Starting Merit','startingMerit',0,'any'],['Starting Sparks','startingSparks',0,'any'],['Maximum Attribute at creation','attributeCap',1,1],['Maximum Skill at creation','skillCap',0,1]].map(([l,k,min,step])=>`<label>${l}<input data-rule="${k}" type="number" min="${min}" step="${step}" ${k==='attributeCap'?'max="5"':k==='skillCap'?'max="10"':''} value="${s[k]}"/></label>`).join('')}</div><label class="check-label"><input data-rule="allowCustomBackground" type="checkbox" ${checked(s.allowCustomBackground)}/>Allow custom backgrounds with GM approval</label><label class="check-label"><input data-rule="allowBackgroundBypass" type="checkbox" ${checked(s.allowBackgroundBypass)}/>Allow background bypass (+5 Merit, +500 Sparks)</label><label>Required custom background fields (one per line)<textarea data-rule="backgroundFields" rows="4">${esc(s.backgroundFields.join('\n'))}</textarea></label><p class="muted" style="font-size:11px">These campaign caps apply during creation. Finished characters use the normal maximums of Attribute 5 and Skill 10.</p></section>`;
  let content=rules;
  if(tab!=='rules'){
    content=renderCampaignCatalog(draft.catalog,tab);
  }
  return `${heading('Campaign / Settings','The rules of your world.','Starting values, creation limits, and campaign content.',btn('Manage invitations','invite','link','',`data-id="${c.id}"`))}${isDemo()?'<div class="notice" style="margin-bottom:20px">This preview campaign includes example content. New campaigns start with an empty catalog for the new edition.</div>':''}${draft.revision!==c.revision?'<div class="notice error">Settings changed on another device. Reload before saving. '+btn('Reload settings','reload-settings','','small')+'</div>':''}<div class="settings-tabs" role="group" aria-label="Campaign settings sections">${[['rules','Rules'],['lineages','Lineages'],['backgrounds','Backgrounds'],['skills','Skills'],['abilities','Abilities']].map(([k,l])=>`<button class="${tab===k?'active':''}" data-action="settings-tab" data-value="${k}">${l}${k==='rules'?'':' · '+draft.catalog[k].length}</button>`).join('')}</div>${content}<div class="save-bar"><p class="${draft.dirty?'dirty-badge':''}">${draft.dirty?'Unsaved changes':'Campaign settings saved'}</p><div class="actions">${btn('Save campaign settings','save-settings','check','primary')}</div></div>${tab==='rules'?campaignDanger(c):''}`;
}
function renderCampaignCatalog(catalog,category) {
  const type=CONTENT_TYPES[category];
  const add=btn(`Add ${type.singular}`,'add-content','plus','primary',`data-kind="${category}"`);
  const entries=catalog[category];
  return `<div class="section-heading"><h2>${type.title}</h2>${add}</div>${entries.length?`<div class="content-list">${entries.map(entry=>{
    const official=isOfficial(entry.id),attrs=`data-kind="${category}" ${recordAttr(entry.id)}`;
    const details=category==='skills'?(entry.generic?'General skill':'Unlocked by content'):entry.description;
    return `<div class="content-row ${entry.enabled===false?'disabled':''}"><span class="stat-icon">${icon(type.icon)}</span><div class="grow"><h3>${esc(entry.name)} ${official?pill('Official'):''} ${entry.enabled===false?pill('Disabled','gray'):''}</h3><p>${category==='abilities'?`${entry.cost} Merit · `:''}${esc(details||'')}${entry.variants?.length?` · ${entry.variants.length} variants`:''}</p></div><div class="actions">${official?'':btn(entry.enabled===false?'Enable':'Disable','toggle-content','','small',attrs)+ibtn(`Edit ${entry.name}`,'edit-content','edit',attrs)}</div></div>`;
  }).join('')}</div>`:empty(`No ${category} yet`,'Add campaign content for your players to choose from.',add,'book')}`;
}

function openModal(title,body,submit,label='Save',extra='',wide=false,destructive=false) {
  if(!ui.modal)modalPreviousFocus=document.activeElement;
  ui.modal=true;modalHandler=submit;
  modalRoot.innerHTML=`<div class="modal-backdrop"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><h2 id="modal-title">${esc(title)}</h2>${ibtn('Close dialog','close-modal','close')}</div><div class="modal-error" id="modal-error" role="alert"></div><form id="modal-form">${body}<footer class="modal-foot">${extra}${btn('Cancel','close-modal')}${submit?`<button class="btn ${destructive?'danger':'primary'}" type="submit">${esc(label)}</button>`:''}</footer></form></section></div>`;
  (modalRoot.querySelector('input:not([type=hidden]),textarea,select') || modalRoot.querySelector('.modal-head button'))?.focus();
}
function closeModal() {ui.modal=false;modalRoot.innerHTML='';modalHandler=null;modalPreviousFocus?.focus();}
function createCampaignModal() {
  openModal('Start a new campaign',`<div class="form-grid">${field('Campaign name','name','','text','required maxlength="120" class="full"')}${area('Description','description','','maxlength="5000"')}${field('Starting Merit','startingMerit',50,'number','min="0" step="any" required')}${field('Starting Sparks','startingSparks',4000,'number','min="0" step="any" required')}${field('Maximum Attribute at creation','attributeCap',5,'number','min="1" max="5" step="1" required')}${field('Maximum Skill at creation','skillCap',10,'number','min="0" max="10" step="1" required')}</div>`,async(form)=>{
    const f=new FormData(form);const c=await command('create_campaign',{name:f.get('name'),description:f.get('description'),settings:settingsFrom({...DEFAULT_SETTINGS,startingMerit:Number(f.get('startingMerit')),startingSparks:Number(f.get('startingSparks')),attributeCap:Number(f.get('attributeCap')),skillCap:Number(f.get('skillCap'))})});
    closeModal();navigate(pathFor(c.id));toast('Campaign created. Add your lineages and skills in campaign settings.');
  },'Create campaign');
}
function joinModal(code='', claiming=false) {
  const hint = claiming ? '<p class="muted">Accept to join the campaign and take ownership of the GM’s character sheet.</p>' : '';
  openModal(claiming?'Claim your character':'Join a campaign',`${isDemo()?'<div class="notice">Local preview invitations work only in this browser. Cloud invitations connect separate accounts and devices.</div>':''}${hint}${area('Invitation link or code','code',code,'required rows="3"')}`,async(form)=>{
    let code=String(new FormData(form).get('code')).trim();try{code=new URL(code).searchParams.get('invite')||code;}catch{}
    const result=await command('join_campaign',{code});
    const mine=partyOf(result.campaign_id).find(ch=>ch.owner_id===uid());
    const characterId=result.character_id || mine?.id || (await command('create_character',{campaign_id:result.campaign_id})).id;
    localStorage.removeItem('empyrean.pendingInvite');localStorage.removeItem('empyrean.pendingInviteType');closeModal();
    navigate(pathFor(result.campaign_id,'character/'+characterId));toast(result.character_id?'Character claimed. The sheet is yours.':'Welcome to the campaign.');
  },claiming?'Accept character':'Join & create character');
}
function inviteLink(invite) {
  const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('invite',invite.code);
  if(invite.character_id)url.searchParams.set('type','character');
  return url.href;
}
function activeInvites() { return data.invites.filter(i=>!i.revoked && i.uses<i.max_uses && new Date(i.expires_at)>new Date()); }
function inviteRow(invite, details, revokeAction='revoke-invite') {
  const attrs = recordAttr(invite.id);
  return `<div class="invite-row"><div class="code">${esc(inviteLink(invite))}</div><div class="row between wrap"><small>${esc(details)}</small><div class="actions">${btn('Copy link','copy-invite','copy','small',attrs)}${btn('Revoke',revokeAction,'','small danger',attrs)}</div></div></div>`;
}
function inviteModal(id) {
  const invites=activeInvites().filter(i=>i.campaign_id===id&&!i.character_id);
  openModal('Invite your party',`${isDemo()?'<div class="notice">Local preview · these links work only with this browser’s preview data.</div>':''}<p class="muted" style="font-size:12px">Invitations expire after 7 days and allow up to 50 players to join.</p><div>${invites.map(i=>inviteRow(i,`${i.uses} / ${i.max_uses} joined · expires ${date(i.expires_at)}`)).join('')||'<p class="muted" style="font-size:12px;margin-top:20px">No active invitation links.</p>'}</div>`,async()=>{await command('create_invite',{campaign_id:id});inviteModal(id);},'Create invitation link');
}
function pregenModal(campaignId) {
  openModal('Build for a player', `<div class="form-section"><p>Build a draft or finish the sheet before giving it to a player.</p>${field('Character name','name','','text','required maxlength="120"')}</div>`, async form=>{
    const ch=await command('create_pregen',{campaign_id:campaignId,name:new FormData(form).get('name')});
    closeModal();navigate(characterPath(ch));
  }, 'Open character builder');
}
function assignModal(id) {
  const ch=data.characters.find(ch=>ch.id===id);
  demand(ch?.claimable, 'This character has already been assigned.');
  const invite=activeInvites().find(i=>i.character_id===id);
  const players=membersOf(ch.campaign_id).filter(m=>m.user_id!==uid()).map(m=>({id:m.user_id,name:m.display_name}));
  openModal(`Assign ${ch.name}`, `<div class="form-section"><p>Send a single-use link or assign the sheet to a player already in the campaign. Either way, the player takes ownership of the sheet and its linked tokens.</p>${invite?inviteRow(invite,`Single use · expires ${date(invite.expires_at)}`,'revoke-character-invite'):''}${players.length?pick('Give to a campaign member','owner_id',players,'','Choose a player'):''}</div>`, async form=>{
    const owner=new FormData(form).get('owner_id');
    if(owner){
      await command('assign_character',{id,revision:ch.revision,owner_id:owner});
      closeModal();navigate(pathFor(ch.campaign_id,'characters'));toast('Character assigned.');
    }else{
      await command('create_character_invite',{id,revision:ch.revision});assignModal(id);
    }
  }, invite?'Replace character link':'Create character link');
  const picker=modalRoot.querySelector('[name="owner_id"]');
  picker?.addEventListener('change',()=>{
    modalRoot.querySelector('button[type="submit"]').textContent=picker.value?'Assign to player':invite?'Replace character link':'Create character link';
  });
}
function deleteCharacterModal(id) {
  const ch=data.characters.find(ch=>ch.id===id);
  const label=ch.npc?'Delete NPC':'Delete character';
  openModal(`${label}?`, `<div class="notice error">Permanently delete <strong>${esc(ch.name)}</strong> and all tokens linked to this sheet?</div>`, async()=>{
    await command('delete_character',{id,revision:ch.revision});
    ui.editor=null;closeModal();navigate(pathFor(ch.campaign_id,'characters'));toast(ch.npc?'NPC deleted.':'Character deleted.');
  }, label, '', false, true);
}
function campaignDanger(c) {
  return `<section class="panel campaign-danger"><div class="grow"><h2>Delete campaign</h2><p>Permanently remove this campaign and its data for everyone at the table.</p></div>${btn('Delete campaign','delete-campaign','trash','danger',recordAttr(c.id))}</section>`;
}
function deleteCampaignModal(c) {
  openModal('Delete campaign?', `<div class="notice error">This permanently removes the campaign, its characters, maps, and campaign journal for everyone at the table.</div>${field('Type the campaign name to confirm','campaign_name','','text','required autocomplete="off"')}`, async form=>{
    demand(new FormData(form).get('campaign_name')===c.name,'Enter the campaign name exactly as shown in settings.');
    await command('delete_campaign',{id:c.id,revision:c.revision});
    ui.settingsDraft=null;closeModal();navigate('#/');toast('Campaign deleted.');
    if(data.campaign_upload_cleanup?.some(job=>job.campaign_id===c.id))await cleanupUploads(c.id);
  }, 'Delete campaign', '', false, true);
}
async function cleanupUploads(id) {
  const job=data.campaign_upload_cleanup?.find(job=>job.campaign_id===id);
  if(!job)return;
  await store.removeUploads(job.paths);
  await command('finish_campaign_cleanup',{campaign_id:id});
  render();
  demand(!data.campaign_upload_cleanup?.some(job=>job.campaign_id===id),'Some uploaded map files remain. Retry map cleanup from My campaigns.');
}
function npcModal(campaignId,id) {
  const ch=data.characters.find(ch=>ch.id===id),npc=ch?.npc;
  openModal(ch?'Edit NPC':'Create NPC', `<div class="form-section"><div class="form-grid">${field('Name','name',ch?.name,'text','required maxlength="120"')}${field('Role','role',npc?.role,'text','maxlength="120" placeholder="e.g. Relay keeper"')}</div>${area('Description','description',npc?.description,'maxlength="10000" rows="3"')}<div class="stack npc-stat-editor"><h3>Custom stats</h3><div data-npc-stats>${(npc?.stats || []).map(npcStatFields).join('')}</div>${btn('Add stat','add-npc-stat','plus','small')}</div>${area('GM notes','notes',npc?.notes,'maxlength="10000" rows="3"')}</div>`,async form=>{
    const f=new FormData(form);
    const values=f.getAll('stat_value');
    const stats=f.getAll('stat_label').map((label,i)=>({label:label.trim(),value:values[i].trim()}));
    const saved=await command('save_npc',{id,revision:ch?.revision,campaign_id:campaignId,name:f.get('name'),npc:{role:f.get('role').trim(),description:f.get('description'),notes:f.get('notes'),stats}});
    closeModal();navigate(characterPath(saved));toast('NPC saved.');
  }, 'Save NPC', '', true);
}
function npcStatFields(stat = {}) {
  return `<div class="npc-stat-fields">${field('Stat label','stat_label',stat.label,'text','maxlength="60" required')}${field('Stat value','stat_value',stat.value,'text','maxlength="120" required')}${ibtn('Remove stat','remove-npc-stat','trash')}</div>`;
}
function grantChecks(cat,type,values=[],prefix=type) {return `<div class="checkbox-list">${cat[type].filter(e=>e.enabled!==false||values.includes(e.id)).map(e=>`<label class="check-label"><input type="checkbox" name="${prefix}" value="${esc(e.id)}" ${checked(values.includes(e.id))}/>${esc(e.name)}</label>`).join('')||'<small>No '+type+' in this campaign.</small>'}</div>`;}
function customBackgroundModal() {
  const ed=ui.editor,c=campaignOf(route().campaignId),old=ed.build.background.kind==='custom'?ed.build.background:{name:'',description:'',answers:{},skills:[],abilities:[]};
  openModal('Custom background',`<div class="form-section">${field('Background name','name',old.name,'text','required maxlength="120"')}${area('Description','description',old.description||'','maxlength="5000"')}${c.settings.backgroundFields.map((name,i)=>area(name+' *','answer-'+i,old.answers?.[name]||'','required maxlength="5000"')).join('')}<label>Requested skill unlocks</label>${grantChecks(c.catalog,'skills',old.skills)}<label>Requested granted abilities</label>${grantChecks(c.catalog,'abilities',old.abilities)}</div>`,async(form)=>{
    const f=new FormData(form);const bg={kind:'custom',name:String(f.get('name')).trim(),description:String(f.get('description')),answers:Object.fromEntries(c.settings.backgroundFields.map((name,i)=>[name,String(f.get('answer-'+i))])),skills:f.getAll('skills'),abilities:f.getAll('abilities')};
    ed.build.background=bg;ed.dirty=true;closeModal();render();toast('Configuration added. Save draft to send it for GM review.');
  },'Use this configuration','',true);
}
function reviewModal(id) {
  const ch=data.characters.find(ch=>ch.id===id),bg=ch.build.background,c=campaignOf(ch.campaign_id);
  openModal('Review custom background',`<div class="form-section"><div><h3>${esc(bg.name)}</h3><small>${esc(ch.name)} · ${esc(ownerName(ch.owner_id))}</small></div>${bg.description?`<p class="text-content">${esc(bg.description)}</p>`:''}${Object.entries(bg.answers||{}).map(([k,v])=>`<div><div class="eyebrow">${esc(k)}</div><p class="text-content">${esc(v)}</p></div>`).join('')}<p style="font-size:12px"><strong>Skill unlocks:</strong> ${esc(bg.skills.map(id=>c.catalog.skills.find(s=>s.id===id)?.name||id).join(', ')||'None')}<br/><strong>Granted abilities:</strong> ${esc(bg.abilities.map(id=>c.catalog.abilities.find(a=>a.id===id)?.name||id).join(', ')||'None')}</p>${pick('Decision','decision',[{id:'approved',name:'Approve'},{id:'denied',name:'Deny'}],'approved')}${area('Feedback (optional)','comment','','maxlength="5000"')}</div>`,async(form)=>{const f=new FormData(form);await command('review_background',{id:ch.id,revision:ch.revision,decision:f.get('decision'),comment:f.get('comment')});closeModal();render();toast('Background review saved.');},'Save decision','',true);
}
function noteModal(campaignId,id) {
  const n=data.notes.find(n=>n.id===id);const c=campaignId?campaignOf(campaignId):null;
  openModal(n?'Edit note':'New note',`<div class="form-section">${field('Title','title',n?.title||'','text','required maxlength="160"')}${area('Note','body',n?.body||'','rows="9" maxlength="50000"')}${c?`${pick('Visible to','audience',[{id:'private',name:'Only me'},{id:'party',name:'Whole party'},{id:'gm',name:'Me and the GM'},{id:'player',name:'Me and one member'}],n?.audience||'private')}${pick('Recipient (for one-member notes)','recipient_id',membersOf(c.id).filter(m=>m.user_id!==uid()).map(m=>({id:m.user_id,name:m.display_name})),n?.recipient_id||'','Select a member')}`:'<input name="audience" type="hidden" value="private"/>'}</div>`,async(form)=>{const f=new FormData(form);await command('save_note',{id:n?.id,revision:n?.revision,campaign_id:c?.id||null,title:f.get('title'),body:f.get('body'),audience:f.get('audience'),recipient_id:f.get('recipient_id')||null});closeModal();render();toast('Note saved.');},'Save note',n?btn('Delete','delete-note','trash','danger',`data-id="${n.id}"`):'',true);
}
function itemModal(campaignId,id) {
  const i=data.items.find(i=>i.id===id),c=campaignOf(campaignId);const owners=[{id:'',name:'Party stash'},...membersOf(c.id).filter(m=>isGm(c)||m.user_id===uid()).map(m=>({id:m.user_id,name:m.display_name}))];
  openModal(i?'Edit item':'Add item',`<div class="form-section">${field('Item name','name',i?.name||'','text','required maxlength="120"')}${field('Quantity','quantity',i?.quantity||1,'number','required min="1" max="1000000000" step="1"')}${!i?pick('Held by','owner_id',owners,uid()):''}${area('Details','details',i?.details||'','maxlength="5000"')}</div>`,async(form)=>{const f=new FormData(form);await command('save_item',{id:i?.id,revision:i?.revision,campaign_id:c.id,name:f.get('name'),quantity:Number(f.get('quantity')),owner_id:f.get('owner_id')||null,details:f.get('details')});closeModal();render();toast('Inventory saved.');},'Save item',i?btn('Delete','delete-item','trash','danger',`data-id="${i.id}"`):'');
}
function transferModal(id) {
  const i=data.items.find(i=>i.id===id);openModal('Transfer '+i.name,`<div class="form-section">${pick('Recipient','owner_id',[{id:'',name:'Party stash'},...membersOf(i.campaign_id).map(m=>({id:m.user_id,name:m.display_name}))],i.owner_id||'')}${field('Quantity','quantity',i.quantity,'number',`required min="1" max="${i.quantity}" step="1"`)}</div>`,async(form)=>{const f=new FormData(form);await command('transfer_item',{id:i.id,revision:i.revision,owner_id:f.get('owner_id')||null,quantity:Number(f.get('quantity'))});closeModal();render();toast('Item transferred.');},'Transfer');
}
function awardModal(id) {const ch=data.characters.find(ch=>ch.id===id);openModal('Award '+ch.name,`<div class="form-grid">${field('Merit','merit',0,'number','min="0" step="any" required')}${field('Sparks','sparks',0,'number','min="0" step="any" required')}</div>`,async(form)=>{const f=new FormData(form);await command('award',{id:ch.id,revision:ch.revision,merit:Number(f.get('merit')),sparks:Number(f.get('sparks'))});closeModal();render();toast('Award added to the character.');},'Grant award');}
function spendModal(id) {const ch=data.characters.find(ch=>ch.id===id);openModal('Spend Sparks',`<div class="form-section"><p class="muted" style="font-size:12px">${fmt(ch.sparks)} Sparks available</p>${field('Sparks to spend','amount','','number',`min="0.0001" max="${ch.sparks}" step="any" required`)}${field('Reason (optional)','reason','','text','maxlength="200"')}</div>`,async(form)=>{const f=new FormData(form);await command('spend_sparks',{id:ch.id,revision:ch.revision,amount:Number(f.get('amount')),reason:f.get('reason')});closeModal();render();toast('Sparks spent.');},'Spend Sparks');}

function mapModal(campaignId,id) {
  const mp=data.maps.find(m=>m.id===id);const c=campaignOf(campaignId);
  openModal(mp?'Edit map':'Add a map',`<div class="form-section"><div class="form-grid">${field('Map name','name',mp?.name||'','text','required maxlength="120"')}${pick('Scale','scale',['world','region','city','scene'],mp?.scale||'scene')}${field('HTTPS image URL (optional)','image_url',mp?.storage_path?'':mp?.image_url||'','text','placeholder="https://…"')}${field('Grid columns (0 for no grid)','grid',mp?.grid??12,'number','min="0" max="100" step="1" required')}</div><label>Upload image (optional)<input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"/></label>${mp?.storage_path?'<small>A map image is already uploaded. A new upload or URL will replace it.</small>':''}${check('Visible to players','visible',mp?.visible??false)}</div>`,async(form)=>{
    const f=new FormData(form);let image={image_url:String(f.get('image_url')).trim(),storage_path:mp?.storage_path||''};const file=f.get('image');let uploaded=false;
    if(image.image_url&&image.image_url!==mp?.image_url)image.storage_path='';
    if(file?.size){image=await store.upload(file,c.id);uploaded=true;}
    try{await command('save_map',{id:mp?.id,revision:mp?.revision,campaign_id:c.id,name:f.get('name'),scale:f.get('scale'),grid:Number(f.get('grid')),visible:f.has('visible'),...image});}
    catch(e){if(uploaded&&image.storage_path)await store.removeUpload(image.storage_path).catch(()=>{});throw e;}
    closeModal();render();toast('Map saved.');
  },'Save map',mp?btn('Delete map','delete-map','trash','danger',`data-id="${mp.id}"`):'');
}
function npcMapModal({ campaignId, mapId, characterId }) {
  const npcs=charactersOf(campaignId).filter(ch=>ch.npc),maps=data.maps.filter(map=>map.campaign_id===campaignId);
  if(!npcs.length || !maps.length){
    const action=npcs.length?btn('Add map','new-map','plus','primary',recordAttr(campaignId)):btn('New NPC','new-npc','plus','primary',recordAttr(campaignId));
    openModal('Place an NPC',`<p>${npcs.length?'Add a campaign map to place this NPC.':'Create an NPC sheet before placing its token.'}</p>`,null,'',action);
    return;
  }
  openModal('Place an NPC',`<div class="form-section"><div class="form-grid">${pick('NPC','character_id',npcs,characterId || npcs[0].id)}${pick('Map','map_id',maps,mapId || maps[0].id)}${field('Token name (optional)','name','','text','maxlength="80"')}${field('Color','color','#ad7745','color')}</div>${check('Hidden from players','hidden',true)}</div>`,async form=>{
    const f=new FormData(form),ch=npcs.find(ch=>ch.id===f.get('character_id')),selectedMap=f.get('map_id');
    await command('save_marker',{map_id:selectedMap,character_id:ch.id,owner_id:ch.owner_id,name:f.get('name').trim()||ch.name.slice(0,80),color:f.get('color'),hidden:f.has('hidden'),x:50,y:50});
    closeModal();ui.mapId=selectedMap;ui.mapZoom=1;
    navigate(pathFor(campaignId,'world')+'?map='+selectedMap);toast('NPC token placed at the center of the map.');
  },'Place NPC');
}
function markerModal(mapId,id) {
  const m=data.markers.find(m=>m.id===id),mp=data.maps.find(mp=>mp.id===mapId);const chars=charactersOf(mp.campaign_id);
  openModal(m?'Edit marker':'Place a marker',`<div class="form-section"><div class="form-grid">${field('Marker name','name',m?.name||'','text','required maxlength="80"')}${field('Color','color',m?.color||'#2b9a91','color')}${pick('Player owner','owner_id',[{id:'',name:'GM / generic marker'},...membersOf(mp.campaign_id).map(u=>({id:u.user_id,name:u.display_name}))],m?.owner_id||'')}${pick('Linked character (optional)','character_id',[{id:'',name:'No character'},...chars.map(ch=>({id:ch.id,name:ch.name}))],m?.character_id||'')}</div>${check('Hidden from players','hidden',m?.hidden||false)}</div>`,async(form)=>{const f=new FormData(form);const charId=f.get('character_id')||null;const char=chars.find(ch=>ch.id===charId);const owner=char?char.owner_id:f.get('owner_id')||null;await command('save_marker',{id:m?.id,revision:m?.revision,map_id:mp.id,name:f.get('name'),color:f.get('color'),owner_id:owner,character_id:charId,hidden:f.has('hidden'),x:m?.x??50,y:m?.y??50});closeModal();render();toast('Marker saved.');},'Save marker',m?btn('Delete marker','delete-marker','trash','danger',`data-id="${m.id}"`):'');
}
let contentContext;
function readContent(form,kind,base) {
  const f=new FormData(form);const e={...clone(base),name:String(f.get('name')).trim(),description:String(f.get('description')||''),enabled:f.has('enabled')};
  if(kind==='skills')e.generic=f.has('generic');
  else {e.skills=f.getAll('skills');if(kind!=='abilities'){e.abilities=f.getAll('abilities');e.meritBonus=Number(f.get('meritBonus')||0);e.sparksBonus=Number(f.get('sparksBonus')||0);}else e.cost=Number(f.get('cost'));}
  if(kind==='lineages'){
    e.ageRequired=f.has('ageRequired');e.variants=(base.variants||[]).map((v,i)=>({...v,name:String(f.get(`v-name-${i}`)||'').trim(),skills:f.getAll(`v-skills-${i}`),abilities:f.getAll(`v-abilities-${i}`),meritBonus:Number(f.get(`v-merit-${i}`)||0),sparksBonus:Number(f.get(`v-sparks-${i}`)||0),enabled:f.has(`v-enabled-${i}`)}));
  }
  return e;
}
function contentModal(kind,id,entry) {
  const studio=route().page==='designer';
  const cat=(studio?ui.studioDraft:ui.settingsDraft).catalog;
  const e=entry||cat[kind].find(e=>e.id===id)||{id:(studio?'official-':'')+crypto.randomUUID(),name:'',description:'',enabled:true,skills:[],abilities:[],cost:4,meritBonus:0,sparksBonus:0,ageRequired:true,variants:[]};
  contentContext={kind,id,entry:e};
  const variants=kind==='lineages'?`<div class="form-section"><div class="section-heading"><h3>Lineage variants</h3>${btn('Add variant','add-variant','plus','small')}</div>${(e.variants||[]).map((v,i)=>`<div class="variant-editor"><div class="row between"><h3>Variant ${i+1}</h3>${ibtn('Remove variant','remove-variant','trash',`data-index="${i}"`)}</div><div class="form-grid" style="margin:14px 0">${field('Variant name',`v-name-${i}`,v.name,'text','required maxlength="120"')}${check('Available',`v-enabled-${i}`,v.enabled!==false)}${field('Additional Merit',`v-merit-${i}`,v.meritBonus||0,'number','min="0" step="any"')}${field('Additional Sparks',`v-sparks-${i}`,v.sparksBonus||0,'number','min="0" step="any"')}</div><label style="margin:14px 0 8px">Skill unlocks</label>${grantChecks(cat,'skills',v.skills,`v-skills-${i}`)}<label style="margin:14px 0 8px">Granted abilities</label>${grantChecks(cat,'abilities',v.abilities,`v-abilities-${i}`)}</div>`).join('')}</div>`:'';
  openModal((id?'Edit ':'Add ')+CONTENT_TYPES[kind].singular,`<div class="form-section">${field('Name','name',e.name,'text','required maxlength="120"')}${area('Description','description',e.description||'','maxlength="5000"')}${check('Available to players','enabled',e.enabled!==false)}${kind==='skills'?check('General skill (available to every character)','generic',e.generic):`${kind==='abilities'?field('Merit cost','cost',e.cost,'number','required min="1" max="99" step="1"'):''}<label>Skill unlocks</label>${grantChecks(cat,'skills',e.skills)}${kind!=='abilities'?`<label>Granted abilities</label>${grantChecks(cat,'abilities',e.abilities)}<div class="form-grid">${field('Additional starting Merit','meritBonus',e.meritBonus||0,'number','min="0" step="any" required')}${field('Additional starting Sparks','sparksBonus',e.sparksBonus||0,'number','min="0" step="any" required')}</div>`:''}`}${kind==='lineages'?check('Age category required','ageRequired',e.ageRequired!==false):''}</div>${variants}`,async(form)=>{
    const draft=studio?ui.studioDraft:ui.settingsDraft;
    const updated=readContent(form,kind,contentContext.entry);
    draft.catalog[kind]=id?draft.catalog[kind].map(entry=>entry.id===id?updated:entry):[...draft.catalog[kind],updated];
    draft.dirty=true;closeModal();render();
  },studio?'Save to draft':'Apply to campaign','',true);
}
function profileModal() {
  openModal('Your account',`<div class="form-section">${field('Display name','display_name',data.profile?.display_name||'','text','required maxlength="80"')}${isDemo()?`<div class="notice">Local preview data is saved only in this browser. The included characters and rules are examples.</div><div class="actions">${btn(uid()===DEMO_GM?'Preview as player':'Preview as GM','switch-preview','users')}${btn('Exit preview','exit-preview','logout')}</div>`:`<p class="muted" style="font-size:12px">${esc(store.session?.user?.email||'')}</p><div class="actions">${btn('Change password','change-password','lock')}${btn('Sign out','signout','logout')}</div>`}</div>`,async(form)=>{await command('profile',{display_name:new FormData(form).get('display_name')});closeModal();render();toast('Profile saved.');},'Save profile');
}
function passwordModal() {openModal('Set a new password',field('New password','password','','password','required minlength="10" autocomplete="new-password"'),async(form)=>{await store.updatePassword(new FormData(form).get('password'));closeModal();toast('Password updated.');},'Update password');}
function diceNotation({dice,sides,modifier}) {
  return `${dice.length}d${sides}${modifier ? (modifier>0?'+':'')+modifier : ''}`;
}
function rollModal(defaultCount=1, share=false) {
  const campaignId=route().campaignId;
  openModal('Dice roller',`<div class="form-section"><div class="form-grid">${field('Number of dice','count',defaultCount,'number','min="1" max="30" required step="1"')}${field('Die sides','sides',6,'number','min="2" max="100" step="1" required')}${field('Modifier','modifier',0,'number','min="-999" max="999" step="1" required')}${campaignId?field('Roll label (optional)','label','','text','maxlength="120"'):''}</div>${campaignId?check('Share with the campaign','share',share):''}</div><div id="roll-result" aria-live="polite"></div>`,async form=>{
    const f=new FormData(form),count=Number(f.get('count')),sides=Number(f.get('sides')),modifier=Number(f.get('modifier'));
    const shared=campaignId && f.has('share');
    const result=shared?await command('roll_dice',{campaign_id:campaignId,count,sides,modifier,label:f.get('label')}):rollValues(count,sides,modifier);
    if(shared)render();
    const panel=modalRoot.querySelector('#roll-result');
    if(panel)panel.innerHTML=`<div class="die-result">${result.total}</div><div class="die-values">${result.dice.map(n=>`<span class="die">${n}</span>`).join('')}</div><p class="roll-caption">${diceNotation(result)} · ${shared?'Shared with campaign':'Private roll'}</p>`;
  },'Roll dice');
}
function renderSession(c) {
  const turns=turnsOf(c.id),gm=isGm(c),attrs=recordAttr(c.id);
  const clocks=(data.clocks||[]).filter(clock=>clock.campaign_id===c.id);
  const rolls=(data.table_rolls||[]).filter(roll=>roll.campaign_id===c.id);
  const addTurn=gm?btn('Add participant','add-turn','plus','small',attrs):'';
  const addClock=gm?btn('New clock','new-clock','plus','small',attrs):'';
  const turnRows=turns.entries.map(entry=>{
    const current=turns.current_id===entry.id;
    return `<li class="turn-row ${current?'current-turn':''}" ${current?'aria-current="step"':''}><strong class="turn-score" title="Initiative ${entry.score}">${entry.score}</strong><span class="grow">${esc(entry.name)}</span>${current?pill('Current turn'):''}${gm?ibtn('Edit '+entry.name,'edit-turn','edit',recordAttr(entry.id)):''}</li>`;
  }).join('');
  return `${heading('Campaign / Session tools','Session tools','Track turns, advance clocks, and roll dice with the table.',btn('Roll dice','table-roll','dice','primary'))}<div class="session-layout"><div class="stack"><section class="panel session-panel"><div class="section-heading"><h2>Turn order</h2>${addTurn}</div>${turnRows?`<div class="turn-status"><strong>${turns.round?'Round '+turns.round:'Ready to start'}</strong>${gm?`<div class="actions">${turns.round?btn('Reset rounds','reset-turns','','small',attrs):''}${btn(turns.round?'Next turn':'Start turns','next-turn','arrow','primary small',attrs)}</div>`:''}</div><ol class="turn-list">${turnRows}</ol>`:`<p class="muted">${gm?'Add participants with initiative scores. Highest goes first.':'No turn order has been set.'}</p>`}</section><section class="panel session-panel"><div class="section-heading"><h2>Progress clocks</h2>${addClock}</div>${clocks.length?`<div class="clock-grid">${clocks.map(clock=>renderClock(clock,gm)).join('')}</div>`:`<p class="muted">${gm?'Track a goal, threat, or countdown in segments.':'No progress clocks have been shared.'}</p>`}</section></div><aside class="panel session-panel"><div class="section-heading"><h2>Shared rolls</h2>${icon('dice')}</div>${rolls.length?`<ul class="roll-history">${rolls.map(r=>`<li><div class="grow"><strong>${esc(r.label||diceNotation(r))}</strong><small>${esc(r.roller)} · ${diceNotation(r)}</small><small>Dice ${r.dice.join(', ')}</small></div><span class="roll-total" aria-label="Total ${r.total}">${r.total}</span></li>`).join('')}</ul>`:'<p class="muted">Shared dice rolls will appear here.</p>'}</aside></div>`;
}
function renderClock(clock,gm) {
  const attrs=recordAttr(clock.id);
  const segments=Array.from({length:clock.segments},(_,i)=>`<span class="${i<clock.filled?'filled':''}"></span>`).join('');
  return `<article class="clock-card"><div class="row between"><h3>${esc(clock.name)}</h3>${gm?ibtn('Edit '+clock.name,'edit-clock','edit',attrs):''}</div><div class="clock-segments" role="progressbar" aria-label="${esc(clock.name)}" aria-valuenow="${clock.filled}" aria-valuemin="0" aria-valuemax="${clock.segments}">${segments}</div><div class="row between wrap"><small>${clock.filled} / ${clock.segments}${gm&&!clock.visible?' · GM only':''}</small>${gm?`<div class="actions">${ibtn('Reduce '+clock.name,'tick-clock','minus',attrs+` data-delta="-1" ${clock.filled===0?'disabled':''}`)}${ibtn('Advance '+clock.name,'tick-clock','plus',attrs+` data-delta="1" ${clock.filled===clock.segments?'disabled':''}`)}</div>`:''}</div></article>`;
}
async function saveTurns(turns) {
  await command('save_turn_order',turns);
  render();
}
function turnModal(c,id) {
  const turns=turnsOf(c.id),entry=turns.entries.find(entry=>entry.id===id);
  const roster=charactersOf(c.id).filter(ch=>!ch.claimable).map(ch=>({id:ch.id,name:ch.name}));
  openModal(entry?'Edit participant':'Add participant',`<div class="form-section">${!entry&&roster.length?pick('Fill from roster','roster',roster,'','Choose a character or NPC'):''}${field('Participant name','name',entry?.name,'text','required maxlength="120"')}${field('Initiative score','score',entry?.score??0,'number','min="-9999" max="9999" step="1" required')}</div>`,async form=>{
    const f=new FormData(form);
    const next={id:entry?.id||crypto.randomUUID(),name:f.get('name').trim(),score:Number(f.get('score'))};
    const entries=entry?turns.entries.map(row=>row.id===id?next:row):[...turns.entries,next];
    entries.sort((a,b)=>b.score-a.score);
    await saveTurns({...turns,entries});closeModal();
  },'Save participant',entry?btn('Remove','remove-turn','trash','danger',recordAttr(entry.id)):'');
  modalRoot.querySelector('[name="roster"]')?.addEventListener('change',event=>{
    modalRoot.querySelector('[name="name"]').value=roster.find(ch=>ch.id===event.target.value)?.name||'';
  });
}
function clockModal(c,id) {
  const clock=data.clocks?.find(clock=>clock.id===id);
  openModal(clock?'Edit clock':'Create progress clock',`<div class="form-section">${field('Clock name','name',clock?.name,'text','required maxlength="120"')}<div class="form-grid">${field('Total segments','segments',clock?.segments??6,'number','min="2" max="12" step="1" required')}${field('Filled segments','filled',clock?.filled??0,'number','min="0" max="12" step="1" required')}</div>${check('Visible to players','visible',clock?.visible??false)}</div>`,async form=>{
    const f=new FormData(form),segments=Number(f.get('segments')),filled=Number(f.get('filled'));
    demand(filled<=segments,'Filled segments cannot exceed total segments.');
    await command('save_clock',{id,revision:clock?.revision,campaign_id:c.id,name:f.get('name'),segments,filled,visible:f.has('visible')});
    closeModal();render();
  },'Save clock',clock?btn('Delete clock','delete-clock','trash','danger',recordAttr(clock.id)):'');
}
async function saveCharacter(finish=false,returnToSheet=false,discard=false) {
  const ed=ui.editor,ch=data.characters.find(c=>c.id===ed.id),c=campaignOf(ch.campaign_id),rules=characterRules(c,ch);
  const review=JSON.stringify(ed.build.background)===JSON.stringify(ch.build.background)?ch.review:null;
  if(finish)demand(ed.name.trim()&&ed.name!=='Unnamed character','Enter a character name on the Identity step.');
  const info=validateBuild(rules,ed.build,{finish,review,active:ch.status==='active'});
  if(ch.status==='active')checkAdvancement(ch.build,ed.build);
  if(finish&&info.merit>info.spent&&!discard){
    openModal('Finish character creation?',`<div class="notice">Are you sure? All unspent Merit will be lost.</div><p style="font-size:12px">${fmt(info.merit-info.spent)} Merit will be discarded. Creation choices will be locked, and future purchases cannot be refunded.</p>`,async()=>{await saveCharacter(true,true,true);closeModal();},'Finish & discard Merit');return;
  }
  const result=await command(finish?'finish_character':'save_character',{id:ch.id,revision:ed.revision,name:ed.name.trim()||'Unnamed character',build:ed.build,discard});
  ed.revision=result.revision;ed.dirty=false;
  if(finish||returnToSheet){ui.editor=null;navigate(pathFor(c.id,'character/'+ch.id));}else render();
  toast(finish?'Character complete. Welcome to the campaign.':ch.status==='active'?'Advancement saved.':'Draft saved.');
}
async function copyText(text) {
  try{await navigator.clipboard.writeText(text);toast('Link copied.');}
  catch{openModal('Copy this link',area('Link','link',text,'readonly rows="4"'),null);}
}

async function handleAction(el) {
  const a=el.dataset.action,id=el.dataset.id,r=route(),c=campaignOf(r.campaignId);
  if(a==='menu'){ui.mobile=!ui.mobile;document.querySelector('.layout')?.classList.toggle('nav-open',ui.mobile);}
  else if(a==='filter'){ui.filter=el.dataset.value;render();}
  else if(a==='create-campaign')createCampaignModal();
  else if(a==='join')joinModal();
  else if(a==='invite')inviteModal(id);
  else if(a==='copy-invite')await copyText(inviteLink(data.invites.find(i=>i.id===id)));
  else if(a==='revoke-invite'){const inv=data.invites.find(i=>i.id===id);await command('revoke_invite',{id});inviteModal(inv.campaign_id);}
  else if(a==='revoke-character-invite'){const inv=data.invites.find(i=>i.id===id);await command('revoke_invite',{id});assignModal(inv.character_id);}
  else if(a==='new-pregen')pregenModal(id);
  else if(a==='assign-character'){
    if(ui.editor?.dirty)await saveCharacter();
    assignModal(id);
  }
  else if(a==='delete-character')deleteCharacterModal(id);
  else if(a==='delete-campaign')deleteCampaignModal(campaignOf(id));
  else if(a==='retry-upload-cleanup')await cleanupUploads(id);
  else if(a==='new-npc')npcModal(id);
  else if(a==='edit-npc')npcModal(c.id,id);
  else if(a==='add-npc-stat'){
    const group=modalRoot.querySelector('[data-npc-stats]');
    demand(group.children.length<20,'An NPC sheet can hold up to 20 stats.');
    group.insertAdjacentHTML('beforeend',npcStatFields());group.lastElementChild.querySelector('input').focus();
  }
  else if(a==='remove-npc-stat'){
    el.closest('.npc-stat-fields').remove();modalRoot.querySelector('[data-action="add-npc-stat"]').focus();
  }
  else if(a==='place-npc')npcMapModal({campaignId:c.id,mapId:id});
  else if(a==='npc-to-map')npcMapModal({campaignId:c.id,characterId:id});
  else if(a==='table-roll')rollModal(1,true);
  else if(a==='add-turn'||a==='edit-turn')turnModal(c,a==='edit-turn'?id:null);
  else if(a==='next-turn')await saveTurns(nextTurn(turnsOf(c.id)));
  else if(a==='reset-turns')await saveTurns({...turnsOf(c.id),current_id:null,round:0});
  else if(a==='remove-turn'){await saveTurns(withoutTurn(turnsOf(c.id),id));closeModal();}
  else if(a==='new-clock'||a==='edit-clock')clockModal(c,a==='edit-clock'?id:null);
  else if(a==='tick-clock'){
    const clock=data.clocks.find(clock=>clock.id===id);
    await command('save_clock',{...clock,filled:clock.filled+Number(el.dataset.delta)});render();
  }
  else if(a==='delete-clock'){
    const clock=data.clocks.find(clock=>clock.id===id);
    await command('delete_clock',{id,revision:clock.revision});closeModal();render();
  }
  else if(a==='new-character'){if(!guardDirty())return;const ch=await command('create_character',{campaign_id:id});navigate(pathFor(id,'character/'+ch.id));}
  else if(a==='step'){ui.editor.step=Number(el.dataset.value);render();window.scrollTo({top:0,behavior:'instant'});}
  else if(['lineage','background','bypass-background'].includes(a)){
    const ed=ui.editor,previous=clone(ed.build);
    if(a==='lineage'){ed.build.lineageId=id;ed.build.variantId='';}
    if(a==='background')ed.build.background={kind:'preset',id};
    if(a==='bypass-background')ed.build.background={kind:'bypass'};
    // Remove only zero-rank skills when their source changes. Paid ranks need an explicit refund.
    Object.entries(ed.build.skills).forEach(([key,rank])=>{if(!rank)delete ed.build.skills[key];});
    try{validateBuild(c,ed.build,{review:null});}catch(e){ed.build=previous;throw e;}
    ed.dirty=true;render();
  } else if(a==='custom-background')customBackgroundModal();
  else if(a==='rank'){
    const ed=ui.editor,kind=el.dataset.kind,id=el.dataset.id,delta=Number(el.dataset.value);const obj=kind==='attribute'?ed.build.attributes:ed.build.skills;obj[id]=(obj[id]??(kind==='attribute'?1:0))+delta;if(kind==='skill'&&!obj[id])delete obj[id];ed.dirty=true;render();
  }else if(a==='ability'){
    const ed=ui.editor,previous=clone(ed.build);if(ed.build.abilities.includes(id))ed.build.abilities=ed.build.abilities.filter(a=>a!==id);else ed.build.abilities.push(id);
    const ch=data.characters.find(ch=>ch.id===ed.id);try{validateBuild(characterRules(c,ch),ed.build,{review:ch.review,active:ch.status==='active'});}catch(e){ed.build=previous;throw e;}ed.dirty=true;render();
  }else if(a==='save-character'||a==='save-return')await saveCharacter(false,a==='save-return');
  else if(a==='finish-character')await saveCharacter(true);
  else if(a==='reload-character'){if(!guardDirty())return;ui.editor=null;render();}
  else if(a==='share-sheet'){const ch=data.characters.find(ch=>ch.id===id);const url=new URL(location.href);url.search='';url.hash=pathFor(ch.campaign_id,'character/'+ch.id).slice(1);await copyText(url.href);}
  else if(a==='review')reviewModal(id);
  else if(a==='award')awardModal(id);
  else if(a==='spend-sparks')spendModal(id);
  else if(a==='new-note')noteModal(el.dataset.campaign||null);
  else if(a==='edit-note'){const n=data.notes.find(n=>n.id===id);noteModal(n.campaign_id,id);}
  else if(a==='delete-note'){const n=data.notes.find(n=>n.id===id);if(confirm('Delete this note?')){await command('delete_note',{id,revision:n.revision});closeModal();render();}}
  else if(a==='new-item')itemModal(id);
  else if(a==='edit-item'){const i=data.items.find(i=>i.id===id);itemModal(i.campaign_id,id);}
  else if(a==='delete-item'){const i=data.items.find(i=>i.id===id);if(confirm('Delete this item?')){await command('delete_item',{id,revision:i.revision});closeModal();render();}}
  else if(a==='transfer-item')transferModal(id);
  else if(a==='new-map')mapModal(id);
  else if(a==='edit-map'){const m=data.maps.find(m=>m.id===id);mapModal(m.campaign_id,id);}
  else if(a==='delete-map'){const m=data.maps.find(m=>m.id===id);if(confirm('Delete this map and its markers?')){await command('delete_map',{id,revision:m.revision});closeModal();ui.mapId='';render();}}
  else if(a==='new-marker')markerModal(id);
  else if(a==='edit-marker'){const m=data.markers.find(m=>m.id===id);markerModal(m.map_id,id);}
  else if(a==='delete-marker'){const m=data.markers.find(m=>m.id===id);await command('delete_marker',{id,revision:m.revision});closeModal();render();}
  else if(a==='select-map')selectMap(id);
  else if(a==='zoom-in'||a==='zoom-out'||a==='zoom-reset'){ui.mapZoom=a==='zoom-reset'?1:Math.max(1,Math.min(3,ui.mapZoom+(a==='zoom-in'?.25:-.25)));render();}
  else if(a==='share-world'){const mp=currentMap(c);const url=new URL(location.href);url.search='';url.hash=pathFor(c.id,'world').slice(1)+(mp?'?map='+mp.id:'');await copyText(url.href);}
  else if(a==='settings-tab'){ui.settingsTab=el.dataset.value;render();}
  else if(a==='studio-tab'){ui.studioTab=el.dataset.value;render();}
  else if(a==='reload-studio'){if(!guardDirty())return;ui.studioDraft=null;render();}
  else if(a==='delete-official')deleteOfficialModal(el.dataset.kind,id);
  else if(a==='publish-studio'){
    const draft=ui.studioDraft;
    validateCatalog(draft.catalog);
    await command('publish_catalog',{catalog:draft.catalog,revision:draft.revision});
    ui.studioDraft=null;render();toast('Official catalog published.');
  }
  else if(a==='reload-settings'){if(!guardDirty())return;ui.settingsDraft=null;render();}
  else if(a==='save-settings'){
    const draft=ui.settingsDraft;draft.settings=settingsFrom(draft.settings);await command('update_campaign',{id:draft.id,revision:draft.revision,name:draft.name,description:draft.description,settings:draft.settings,catalog:draft.catalog});ui.settingsDraft=null;render();toast('Campaign rules and content saved.');
  }else if(a==='add-content'||a==='edit-content')contentModal(el.dataset.kind,id);
  else if(a==='toggle-content'){const e=ui.settingsDraft.catalog[el.dataset.kind].find(e=>e.id===id);e.enabled=e.enabled===false;ui.settingsDraft.dirty=true;render();}
  else if(a==='add-variant'||a==='remove-variant'){
    const ctx=contentContext;const draft=readContent(document.querySelector('#modal-form'),ctx.kind,ctx.entry);if(a==='add-variant')draft.variants.push({id:crypto.randomUUID(),name:'',skills:[],abilities:[],meritBonus:0,sparksBonus:0,enabled:true});else draft.variants.splice(Number(el.dataset.index),1);contentModal(ctx.kind,ctx.id,draft);
  }else if(a==='close-modal')closeModal();
  else if(a==='profile')profileModal();
  else if(a==='switch-preview'){
    if(!guardDirty())return;
    localStorage.setItem('empyrean.previewRole',uid()===DEMO_GM?'player':'gm');
    closeModal();ui.editor=null;ui.settingsDraft=null;ui.mapId='';await start(new DemoStore(previewUser()));navigate('#/');
  }
  else if(a==='exit-preview'){if(!guardDirty())return;unsubscribe?.();closeModal();store=null;data=null;localStorage.removeItem('empyrean.previewMode');ui.editor=null;ui.settingsDraft=null;configured()?renderAuth():renderLocalIntro();}
  else if(a==='signout'){if(!guardDirty())return;await store.signOut();unsubscribe?.();closeModal();data=null;store=null;ui.editor=null;ui.settingsDraft=null;ui.studioDraft=null;renderAuth();}
  else if(a==='change-password')passwordModal();
  else if(a==='roll')rollModal(Number(el.dataset.value)||1);
  else if(a==='enter-preview'){localStorage.setItem('empyrean.previewMode','1');await start(new DemoStore(previewUser()));}
  else if(a==='auth-mode'){ui.auth=el.dataset.value;renderAuth();}
  else if(a==='retry-connection')await boot();
}

document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');if(!el||el.disabled)return;e.preventDefault();
  try{await handleAction(el);}catch(error){const target=ui.modal?document.querySelector('#modal-error'):document.querySelector('#creation-error');if(target){target.textContent=error.message;target.scrollIntoView({block:'nearest'});}else toast(error.message,true);}
});
document.addEventListener('click',e=>{
  const anchor=e.target.closest('a[href^="#/"]');if(!anchor||e.metaKey||e.ctrlKey||e.shiftKey)return;
  if(anchor.getAttribute('href')===location.hash)return;
  e.preventDefault();navigate(anchor.getAttribute('href'));
});
document.addEventListener('input',e=>{
  const el=e.target;const ed=ui.editor;
  if(el.matches('[data-character-name]')&&ed){ed.name=el.value;ed.dirty=true;}
  else if(el.dataset.bio&&ed){ed.build.bio??={};ed.build.bio[el.dataset.bio]=el.value;ed.dirty=true;}
  else if(el.dataset.build&&ed){ed.build[el.dataset.build]=el.dataset.build==='ageYears'?(el.value===''?null:Number(el.value)):el.value;ed.dirty=true;}
  else if(el.dataset.settings){ui.settingsDraft[el.dataset.settings]=el.value;ui.settingsDraft.dirty=true;}
  else if(el.dataset.rule){const k=el.dataset.rule;ui.settingsDraft.settings[k]=el.type==='checkbox'?el.checked:k==='backgroundFields'?el.value.split('\n').map(x=>x.trim()).filter(Boolean):Number(el.value);ui.settingsDraft.dirty=true;}
  document.querySelector('.save-bar p')?.classList.add('dirty-badge');const p=document.querySelector('.save-bar p');if(p&&(ed?.dirty||ui.settingsDraft?.dirty))p.textContent='Unsaved changes';
});
document.addEventListener('change',e=>{if(e.target.matches('[data-map-select]'))selectMap(e.target.value);});
document.addEventListener('submit',async e=>{
  if(e.target.id==='auth-form'){e.preventDefault();await submitAuth(e.target);return;}
  if(e.target.id!=='modal-form'||!modalHandler)return;e.preventDefault();const submit=e.submitter;submit.disabled=true;
  try{await modalHandler(e.target);}catch(error){const target=document.querySelector('#modal-error');if(target)target.textContent=error.message;else toast(error.message,true);}finally{if(submit.isConnected)submit.disabled=false;}
});
document.addEventListener('keydown',e=>{
  if(!ui.modal){
    const token=e.target.closest('[data-marker]');
    if(token&&['Enter',' '].includes(e.key)){
      const marker=data.markers.find(m=>m.id===token.dataset.marker);
      if(marker&&isGm(campaignOf(marker.campaign_id))){e.preventDefault();markerModal(marker.map_id,marker.id);}
    }
    return;
  }
  if(e.key==='Escape'){e.preventDefault();closeModal();return;}
  if(e.key==='Tab'){
    const items=[...modalRoot.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type=hidden]),select,textarea,a[href]')];const first=items[0],last=items.at(-1);
    if(e.shiftKey&&document.activeElement===first){last?.focus();e.preventDefault();}else if(!e.shiftKey&&document.activeElement===last){first?.focus();e.preventDefault();}
  }
});
window.addEventListener('hashchange',()=>{ui.mobile=false;const r=route();if(ui.editor&&r.recordId!==ui.editor.id)ui.editor=null;if(ui.settingsDraft&&(r.campaignId!==ui.settingsDraft.id||r.tab!=='settings'))ui.settingsDraft=null;if(r.page!=='designer')ui.studioDraft=null;render();});
window.addEventListener('beforeunload',e=>{if(hasUnsavedChanges()){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',async e=>{
  if(e.key!=='empyrean.v2.session'||!(store instanceof CloudStore))return;
  let session;try{session=JSON.parse(e.newValue||'null');}catch{return;}
  if(session?.user?.id&&session.user.id===store.session?.user?.id){store.session=session;return;}
  unsubscribe?.();data=null;ui.editor=null;ui.settingsDraft=null;ui.studioDraft=null;closeModal();
  if(session){try{await start(new CloudStore());}catch(error){renderAuth(error.message,true);}}
  else{store.saveSession(null);store=null;renderAuth();}
});

let dragging=null;
document.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-marker]');if(!el||!el.classList.contains('movable')||e.button!==0)return;
  const marker=data.markers.find(m=>m.id===el.dataset.marker);const canvas=el.closest('[data-map-canvas]');
  dragging={el,marker:clone(marker),canvas,startX:e.clientX,startY:e.clientY,moved:false,x:marker.x,y:marker.y,pointerId:e.pointerId};el.setPointerCapture(e.pointerId);e.preventDefault();
});
document.addEventListener('pointermove',e=>{
  if(!dragging||e.pointerId!==dragging.pointerId)return;const d=dragging;const rect=d.canvas.getBoundingClientRect();
  if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>4)d.moved=true;if(!d.moved)return;
  d.x=Math.max(1,Math.min(99,(e.clientX-rect.left)/rect.width*100));d.y=Math.max(1,Math.min(99,(e.clientY-rect.top)/rect.height*100));d.el.style.left=d.x+'%';d.el.style.top=d.y+'%';
});
document.addEventListener('pointerup',async e=>{
  if(!dragging||e.pointerId!==dragging.pointerId)return;const d=dragging;dragging=null;
  if(d.moved){try{await command('move_marker',{id:d.marker.id,revision:d.marker.revision,x:d.x,y:d.y});render();}catch(error){render();toast(error.message,true);}}
  else if(isGm(campaignOf(d.marker.campaign_id)))markerModal(d.marker.map_id,d.marker.id);
});
document.addEventListener('pointercancel',()=>{if(dragging){dragging=null;render();}});

function renderLocalIntro() {
  root.innerHTML=`<main class="local-intro"><section class="local-intro-inner"><div class="local-intro-art">${brand()}</div><div class="local-intro-copy"><div class="eyebrow">A new chapter</div><h1>Your world. Your party. One table.</h1><p>The campaign workspace is ready to explore. Connect a Supabase project to enable personal accounts and sharing across devices.</p><div class="notice">Cloud connection has not been configured. The local preview saves to this browser only and includes example game content.</div><div class="actions">${btn('Explore local preview','enter-preview','arrow','primary')}<a href="./SETUP.md" target="_blank" rel="noopener">Cloud setup instructions</a></div></div></section></main>`;
}
function renderAuth(message='',error=false) {
  const mode=ui.auth;
  const titles={signin:'Welcome to the table.',signup:'A place for your stories.',recover:'Find your way back.'};
  root.innerHTML=`<main class="auth-page"><section class="auth-art">${brand()}<div class="auth-visual"></div><div class="auth-quote"><div class="eyebrow" style="color:#a9c19d">The campaign companion</div><h1>Every world starts with a few people.</h1><p>Gather your party. Make something worth remembering.</p></div></section><section class="auth-form-area"><div class="auth-form"><div class="eyebrow">Empyrean</div><h1>${titles[mode]}</h1><p>${mode==='signin'?'Sign in to your campaigns and characters.':mode==='signup'?'Create an account to run or join a campaign.':'We’ll send a link to reset your password.'}</p><div id="auth-message" class="${message?'notice'+(error?' error':' success'):''}" role="status">${esc(message)}</div><form id="auth-form">${mode==='signup'?field('Display name','display_name','','text','required maxlength="80" autocomplete="name"'):''}${field('Email','email','','email','required autocomplete="email"')}${mode!=='recover'?field('Password','password','','password',`required minlength="${mode==='signup'?10:1}" autocomplete="${mode==='signup'?'new-password':'current-password'}"`):''}<button type="submit" class="btn primary">${mode==='signin'?'Sign in':mode==='signup'?'Create account':'Send reset link'}${icon('arrow')}</button></form><div class="auth-switch">${mode==='signin'?`New here? <button data-action="auth-mode" data-value="signup">Create an account</button><br/><br/><button data-action="auth-mode" data-value="recover">Forgot password?</button>`:`<button data-action="auth-mode" data-value="signin">Back to sign in</button>`}</div><div class="preview-choice">${btn('Explore local preview','enter-preview','compass')}</div></div></section></main>`;
}
async function submitAuth(form) {
  const f=new FormData(form),button=form.querySelector('button[type=submit]');button.disabled=true;
  try{
    if(!(store instanceof CloudStore))store=new CloudStore();
    if(ui.auth==='recover'){await store.recover(String(f.get('email')).trim());renderAuth('If that email has an account, a reset link is on its way.');}
    else if(ui.auth==='signup'){await store.signUp(String(f.get('email')).trim(),f.get('password'),String(f.get('display_name')).trim());if(store.session)await start(store);else{ui.auth='signin';renderAuth('Check your email to confirm your account, then sign in.');}}
    else{await store.signIn(String(f.get('email')).trim(),f.get('password'));localStorage.removeItem('empyrean.previewMode');await start(store);}
  }catch(e){const el=document.querySelector('#auth-message');if(el){el.className='notice error';el.textContent=e.message;}else toast(e.message,true);}
  finally{if(button.isConnected)button.disabled=false;}
}
async function boot() {
  const params=new URLSearchParams(location.search),invite=params.get('invite');
  if(['share','dev','developer','gm','gm-toolkit','campaigns'].some(key=>params.has(key))||['#gm','#developer'].includes(location.hash)){
    const legacy=new URL('./legacy.html',location.href);
    legacy.search=location.search;legacy.hash=location.hash;
    location.replace(legacy.href);
    return;
  }
  if(invite){
    localStorage.setItem('empyrean.pendingInvite',invite);
    localStorage.setItem('empyrean.pendingInviteType',params.get('type')||'campaign');
    history.replaceState(null,'',location.pathname+location.hash);
  }
  if(configured()){
    try{
      const cloud=new CloudStore();const recovery=await cloud.consumeRedirect();
      if(cloud.session){await start(cloud);if(recovery)passwordModal();}
      else if(localStorage.getItem('empyrean.previewMode'))await start(new DemoStore(previewUser()));
      else renderAuth();
    }catch(e){root.innerHTML=`<main class="local-intro"><div class="local-intro-copy panel"><h1>Could not open your campaigns.</h1><p>${esc(e.message)}</p>${btn('Try again','retry-connection','cloud')}${btn('Sign in','auth-mode','logout','', 'data-value="signin"')}</div></main>`;}
  }else if(localStorage.getItem('empyrean.previewMode'))await start(new DemoStore(previewUser()));
  else renderLocalIntro();
}
boot().catch(e=>{root.innerHTML=`<div class="page"><h1>Could not open Empyrean</h1><p>${esc(e.message)}</p></div>`;});
