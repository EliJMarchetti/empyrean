import { demand } from './rules.js';

const SESSION_KEY = 'empyrean.v2.session';
const timeout = 18000;
export function configured() {
  const c = window.EMPYREAN_CONFIG || {};
  return Boolean(c.supabaseUrl && c.supabasePublishableKey);
}
export class CloudStore {
  constructor() {
    const config = window.EMPYREAN_CONFIG;
    demand(/^https:\/\/[^/]+$/.test(config.supabaseUrl.replace(/\/$/, '')), 'Supabase URL must be an HTTPS project URL.');
    demand(!config.supabasePublishableKey.startsWith('sb_secret_'), 'Use the public publishable key, never a secret key.');
    this.url = config.supabaseUrl.replace(/\/$/, ''); this.key = config.supabasePublishableKey;
    try { this.session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { this.session = null; }
    this.signed = new Map();
  }
  saveSession(session) { this.session = session?.access_token ? { ...session, expires_at: session.expires_at || Math.floor(Date.now() / 1000) + session.expires_in } : null; if (this.session) localStorage.setItem(SESSION_KEY, JSON.stringify(this.session)); else localStorage.removeItem(SESSION_KEY); }
  async request(path, { method = 'GET', body, auth = true, raw = false, headers = {}, retry = true } = {}) {
    if (auth) await this.refresh();
    let response;
    try {
      response = await fetch(this.url + path, { method, headers: { apikey: this.key, ...(auth && this.session ? { Authorization: `Bearer ${this.session.access_token}` } : {}), ...(raw ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(timeout) });
    } catch { throw Error('Could not reach the campaign server. Check your connection and reload before retrying.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (auth && response.status === 401 && retry && this.session?.refresh_token) { await this.refresh(true); return this.request(path, { method, body, auth, raw, headers, retry: false }); }
      throw Error(data.msg || data.message || data.error_description || data.error || `Server error (${response.status}).`);
    }
    return data;
  }
  async refresh(force = false) {
    if (!this.session) throw Error('Sign in to continue.');
    if (!force && this.session.expires_at > Date.now() / 1000 + 60) return;
    if (!this.refreshing) {
      this.refreshing = (async () => {
        // Another tab may already have rotated the refresh token.
        const latest = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (latest?.expires_at > Date.now() / 1000 + 60 && !force) { this.session = latest; return; }
        if (latest?.refresh_token) this.session = latest;
        const data = await this.request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', auth: false, body: { refresh_token: this.session.refresh_token } }); this.saveSession(data);
      })().finally(() => { this.refreshing = null; });
    }
    await this.refreshing;
  }
  async signIn(email, password) { const data = await this.request('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } }); this.saveSession(data); return data; }
  async signUp(email, password, displayName) { const data = await this.request('/auth/v1/signup?redirect_to=' + encodeURIComponent(this.redirectUrl()), { method: 'POST', auth: false, body: { email, password, data: { display_name: displayName } } }); if (data.access_token) this.saveSession(data); return data; }
  redirectUrl() { const url = new URL(location.href); url.hash = ''; url.search = ''; return url.href; }
  async recover(email) { return this.request('/auth/v1/recover?redirect_to=' + encodeURIComponent(this.redirectUrl()), { method: 'POST', auth: false, body: { email } }); }
  async updatePassword(password) { return this.request('/auth/v1/user', { method: 'PUT', body: { password } }); }
  async consumeRedirect() {
    const hash = new URLSearchParams(location.hash.slice(1));
    if (hash.get('error_description')) { const message = hash.get('error_description'); history.replaceState(null, '', location.pathname + location.search); throw Error(message); }
    if (!hash.get('access_token')) return false;
    const session = { access_token: hash.get('access_token'), refresh_token: hash.get('refresh_token'), expires_in: Number(hash.get('expires_in') || 3600) };
    this.saveSession(session);
    const user = await this.request('/auth/v1/user'); this.saveSession({ ...this.session, user });
    history.replaceState(null, '', location.pathname + location.search);
    return hash.get('type') === 'recovery';
  }
  async signOut() { try { if (this.session) await this.request('/auth/v1/logout', { method: 'POST' }); } catch { /* Local sign-out must also work without a connection. */ } finally { this.saveSession(null); this.signed.clear(); } }
  async snapshot() { return this.request('/rest/v1/rpc/app_snapshot', { method: 'POST', body: {} }); }
  async action(action, payload) { return this.request('/rest/v1/rpc/app_action', { method: 'POST', body: { p_action: action, p_payload: payload } }); }
  subscribe(callback) {
    let active = true;
    const poll = async () => { if (active && document.visibilityState !== 'hidden') await callback(); };
    const timer = setInterval(poll, 5000);
    const listener = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', listener); window.addEventListener('online', poll);
    return () => { active = false; clearInterval(timer); document.removeEventListener('visibilitychange', listener); window.removeEventListener('online', poll); };
  }
  async upload(file, campaignId) {
    demand(file.size <= 10 * 1024 * 1024, 'Maps must be smaller than 10 MB.');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
    demand(ext, 'Choose a PNG, JPEG, WebP, or GIF image.');
    const path = `${campaignId}/${crypto.randomUUID()}.${ext}`;
    await this.request('/storage/v1/object/campaign-maps/' + path, { method: 'POST', body: file, raw: true, headers: { 'Content-Type': file.type } });
    return { image_url: '', storage_path: path };
  }
  async removeUploads(paths) {
    for (let offset = 0; offset < paths.length; offset += 100) {
      const batch = paths.slice(offset, offset + 100);
      await this.request('/storage/v1/object/campaign-maps', { method: 'DELETE', body: { prefixes: batch } });
      batch.forEach(path => this.signed.delete(path));
    }
  }
  async removeUpload(path) { if (path) await this.removeUploads([path]); }
  async mapUrl(map) {
    if (!map.storage_path) return map.image_url;
    const cached = this.signed.get(map.storage_path);
    if (cached?.expires > Date.now()) return cached.url;
    const data = await this.request('/storage/v1/object/sign/campaign-maps/' + map.storage_path, { method: 'POST', body: { expiresIn: 3600 } });
    const url = this.url + '/storage/v1' + data.signedURL;
    this.signed.set(map.storage_path, { url, expires: Date.now() + 3300000 });
    return url;
  }
}
