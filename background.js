// Spill Toko - service worker: buka panel, lisensi (login Google, status berlangganan, checkout Midtrans).
importScripts('src/config.js');

const CFG = self.SPILL_CONFIG;
const FILES = ['src/parser.js', 'src/store.js', 'src/license.js', 'src/ui.js', 'src/inline.js', 'src/content.js'];
const LS = chrome.storage.local;
const ENABLED = !!(CFG.API_BASE && CFG.GOOGLE_CLIENT_ID && CFG.LICENSE_PUBKEY);

// ---------- klik ikon -> buka/tutup panel ----------
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url || !/^https:\/\/shopee\.co\.id\//.test(tab.url)) {
    chrome.tabs.create({ url: 'https://shopee.co.id/' });
    return;
  }
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
  } catch (e) {
    // Tab dibuka sebelum extension terpasang -> suntik script manual.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: FILES });
      await new Promise((r) => setTimeout(r, 300));
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle' });
    } catch (err) {
      console.warn('[Spill Toko] gagal membuka panel', err);
    }
  }
});

// ---------- API ----------
async function api(route, opts) {
  opts = opts || {};
  const headers = { Accept: 'application/json' };
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const { lic_token } = await LS.get('lic_token');
    if (lic_token) headers.Authorization = 'Bearer ' + lic_token;
  }
  const res = await fetch(CFG.API_BASE + '?r=' + route, {
    method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  let json = null;
  try { json = await res.json(); } catch (e) { /* bukan JSON */ }
  return { status: res.status, json: json || {} };
}

// ---------- verifikasi tanda tangan lisensi (Ed25519) ----------
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function verifyLicense(lic) {
  if (!lic || !lic.payload || !lic.sig) return null;
  try {
    const key = await crypto.subtle.importKey('raw', b64(CFG.LICENSE_PUBKEY), { name: 'Ed25519' }, false, ['verify']);
    const ok = await crypto.subtle.verify('Ed25519', key, b64(lic.sig), new TextEncoder().encode(lic.payload));
    return ok ? JSON.parse(lic.payload) : null;
  } catch (e) {
    // Chrome lama tanpa Ed25519: terima payload dari server (HTTPS) apa adanya
    if (e && e.name === 'NotSupportedError') { try { return JSON.parse(lic.payload); } catch (_) { return null; } }
    return null;
  }
}

// ---------- status lisensi ----------
const FRESH_MS = 10 * 60 * 1000;

async function getState(force) {
  if (!ENABLED) {
    if (CFG.DEV_OPEN === true) return { enabled: false, state: 'disabled', access: true };   // hanya untuk pengembangan
    return { enabled: true, state: 'unconfigured', access: false, message: 'Extension belum dikonfigurasi (API, Google Client ID, LICENSE_PUBKEY). Hubungi penyedia.' };
  }
  const st = await LS.get(['lic_token', 'lic_cache', 'lic_pending']);
  if (!st.lic_token) return { enabled: true, state: 'signedout', access: false, plans: (st.lic_cache && st.lic_cache.plans) || null };

  let cache = st.lic_cache;
  if (force || !cache || !cache.ai || Date.now() - cache.fetchedAt > FRESH_MS) {
    try {
      const r = await api('me');
      if (r.status === 200 && r.json.license) {
        cache = { license: r.json.license, plans: r.json.plans, ai: r.json.ai || null, fetchedAt: Date.now() };
        await LS.set({ lic_cache: cache });
      } else if (r.status === 401) {
        await LS.remove(['lic_token', 'lic_cache', 'lic_pending']);
        return { enabled: true, state: 'signedout', access: false };
      }
    } catch (e) { /* offline: pakai cache */ }
  }
  if (!cache) return { enabled: true, state: 'offline', access: false, message: 'Tidak bisa menghubungi server lisensi. Periksa koneksi internet.' };

  const p = await verifyLicense(cache.license);
  if (!p) return { enabled: true, state: 'invalid', access: false, message: 'Lisensi tidak valid. Coba masuk ulang.' };
  const now = Math.floor(Date.now() / 1000);
  if (now > p.exp) return { enabled: true, state: 'offline', access: false, email: p.email, plans: cache.plans, message: 'Lisensi perlu diverifikasi ulang. Hubungkan internet lalu coba lagi.' };

  // pembayaran terdeteksi -> hentikan status "menunggu pembayaran"
  let pending = st.lic_pending && st.lic_pending.exp > Date.now() ? st.lic_pending : null;
  if (pending && ((p.plan === 'lifetime' && !pending.baseLifetime) || ((p.paid_until || 0) > (pending.basePaid || 0)))) {
    await LS.remove('lic_pending');
    pending = null;
  } else if (st.lic_pending && !pending) await LS.remove('lic_pending');

  const access = !!p.access && (p.until == null || now <= p.until);
  return {
    enabled: true, access, state: access ? (p.plan === 'monthly' ? 'active' : p.plan) : 'expired', plan: p.plan,
    email: p.email, name: p.name, picture: p.picture,
    until: p.until, trialEnd: p.trial_end, paidUntil: p.paid_until,
    daysLeft: p.until ? Math.max(0, Math.ceil((p.until - now) / 86400)) : null,
    plans: cache.plans, ai: cache.ai || null, pending: !!pending
  };
}

async function login() {
  let idToken, nonce = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())).replace(/-/g, '');
  if (CFG.DEV_ID_TOKEN) { idToken = CFG.DEV_ID_TOKEN; nonce = CFG.DEV_NONCE || nonce; }
  else {
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
      client_id: CFG.GOOGLE_CLIENT_ID, response_type: 'id_token', redirect_uri: chrome.identity.getRedirectURL(),
      scope: 'openid email profile', nonce: nonce, prompt: 'select_account'
    });
    const resp = await chrome.identity.launchWebAuthFlow({ url: url, interactive: true });
    idToken = new URLSearchParams(new URL(resp).hash.slice(1)).get('id_token');
    if (!idToken) throw new Error('Login Google dibatalkan');
  }
  const r = await api('auth', { method: 'POST', body: { id_token: idToken, nonce: nonce }, auth: false });
  if (r.status !== 200) throw new Error(r.json.error || 'Login gagal');
  await LS.set({ lic_token: r.json.token, lic_cache: { license: r.json.license, plans: r.json.plans, ai: r.json.ai || null, fetchedAt: Date.now() } });
  return getState(false);
}

async function checkout(plan) {
  const before = await verifyLicense((await LS.get('lic_cache')).lic_cache?.license);
  const r = await api('checkout', { method: 'POST', body: { plan: plan } });
  if (r.status !== 200 || !r.json.redirect_url) throw new Error(r.json.error || 'Gagal membuat pembayaran');
  await LS.set({ lic_pending: { exp: Date.now() + 30 * 60 * 1000, basePaid: (before && before.paid_until) || 0, baseLifetime: before && before.plan === 'lifetime' } });
  await chrome.tabs.create({ url: r.json.redirect_url });
  return getState(false);
}

// ---------- analisis AI (server meneruskan ke kenari.id; API key tidak pernah ada di extension) ----------
async function aiAnalyze(kind, data, force) {
  if (!ENABLED) throw new Error('Analisis AI membutuhkan server lisensi (belum diatur).');
  const r = await api('ai/analyze', { method: 'POST', body: { kind: kind, data: data, force: !!force } });
  if (r.status === 401) { await LS.remove(['lic_token', 'lic_cache', 'lic_pending']); throw new Error('Sesi berakhir, silakan masuk ulang.'); }
  if (r.status === 402) { await getState(true); throw new Error(r.json.error || 'Langganan berakhir.'); }
  if (r.status !== 200 || !r.json.analysis) throw new Error(r.json.error || 'Analisis AI gagal (HTTP ' + r.status + ')');
  const st = await LS.get('lic_cache');
  if (st.lic_cache && r.json.ai) { st.lic_cache.ai = r.json.ai; await LS.set({ lic_cache: st.lic_cache }); }
  return { analysis: r.json.analysis, cached: !!r.json.cached, generatedAt: r.json.generated_at, ai: r.json.ai || null };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string' || msg.type.indexOf('lic:') !== 0) return false;
  (async () => {
    try {
      if (msg.type === 'lic:get') return sendResponse(await getState(!!msg.force));
      if (msg.type === 'lic:login') return sendResponse(await login());
      if (msg.type === 'lic:logout') { await LS.remove(['lic_token', 'lic_cache', 'lic_pending']); return sendResponse(await getState(false)); }
      if (msg.type === 'lic:checkout') return sendResponse(await checkout(msg.plan));
      if (msg.type === 'lic:ai') return sendResponse(await aiAnalyze(msg.kind, msg.data, msg.force));
      sendResponse({ error: 'unknown' });
    } catch (e) { sendResponse({ error: (e && e.message) || String(e) }); }
  })();
  return true;
});


// ---------- scan di jendela terpisah ----------
// Halaman yang sedang dilihat pengguna tidak berpindah/bergulir: scan berjalan di jendela popup kecil
// yang dibuat di sini, lalu ditutup otomatis setelah selesai.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type === 'spill-whoami') { sendResponse({ tabId: sender.tab ? sender.tab.id : null }); return; }
  if (msg.type === 'spill-open-runner') {
    (async () => {
      try {
        if (!/^https:\/\/shopee\.co\.id\//.test(msg.url || '')) throw new Error('url');
        const sw = (msg.screen && msg.screen.w) || 1366, sh = (msg.screen && msg.screen.h) || 768;
        const W = 780, H = 600;
        const win = await chrome.windows.create({ url: msg.url, type: 'popup', focused: true, width: W, height: H, left: Math.max(0, sw - W - 10), top: Math.max(0, sh - H - 10) });
        const tab = win.tabs && win.tabs[0];
        const { job } = await LS.get('job');
        if (!job) throw new Error('job');
        job.runnerTabId = tab ? tab.id : null;
        job.runnerWindowId = win.id;
        job.originTabId = sender.tab ? sender.tab.id : null;
        await LS.set({ job });
        sendResponse({ ok: true });
      } catch (e) { sendResponse({ ok: false, error: String(e && e.message || e) }); }
    })();
    return true;
  }
  if (msg.type === 'spill-close-runner' || msg.type === 'spill-show-runner') {
    (async () => {
      const { job } = await LS.get('job');
      const id = job && job.runnerWindowId;
      if (id != null) {
        try {
          if (msg.type === 'spill-close-runner') await chrome.windows.remove(id);
          else await chrome.windows.update(id, { focused: true, drawAttention: true });
        } catch (_) { /* jendela sudah tertutup */ }
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
});

// Pengguna menutup jendela scan sebelum selesai -> hentikan job agar tampilan di halaman asal tidak menggantung.
chrome.windows.onRemoved.addListener(async (id) => {
  const { job } = await LS.get('job');
  if (job && job.mode === 'window' && job.runnerWindowId === id && job.active) {
    job.active = false; job.aborted = true;
    await LS.set({ job });
  }
});
