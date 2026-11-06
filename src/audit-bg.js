/* Marketplace Audit - service worker: buka tab Shopee latar belakang, terima hasil dari collector, kirim ke server, tutup tab.
 * Sesi Shopee tidak pernah meninggalkan browser: yang dikirim hanya payload data publik toko/produk + token sekali pakai. */
(function () {
  'use strict';
  const SS = chrome.storage.session || chrome.storage.local;
  let watchdog = null;
  const site = () => new URL(self.SPILL_CONFIG.SITE_URL).origin;
  const TARGET = /^https:\/\/shopee\.co\.id\/(product\/\d+\/\d+|shop\/\d+|[A-Za-z0-9._]{2,40})$/;

  async function getJob() { return (await SS.get('audit_job')).audit_job || null; }
  async function setJob(j) { if (j) await SS.set({ audit_job: j }); else await SS.remove('audit_job'); }

  async function finish(job, body) {
    clearTimeout(watchdog);
    await setJob(null);
    try { if (job.tabId != null) await chrome.tabs.remove(job.tabId); } catch (_) { /* tab sudah ditutup */ }
    try {
      await fetch(job.api + '/audit/scans/' + job.scanId + '/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Audit-Token': job.token, Accept: 'application/json' }, body: JSON.stringify(body)
      });
    } catch (_) { /* server tidak terjangkau: halaman audit akan menampilkan batas waktu */ }
  }

  async function start(msg, sender) {
    const old = await getJob();
    if (old) { try { if (old.tabId != null) await chrome.tabs.remove(old.tabId); } catch (_) { /* abaikan */ } await setJob(null); }
    const t = msg.target || {};
    const ok = sender.tab && sender.url && new URL(sender.url).origin === site() && /^\/audit/.test(new URL(sender.url).pathname)
      && msg.api === site() + '/api' && Number.isInteger(msg.scanId) && /^[A-Za-z0-9]{40}$/.test(String(msg.token))
      && (t.kind === 'product' || t.kind === 'shop') && TARGET.test(String(t.url));
    if (!ok) return;
    const tab = await chrome.tabs.create({ url: t.url + '#ts-audit', active: false, windowId: sender.tab.windowId });
    const job = { scanId: msg.scanId, token: msg.token, api: msg.api, kind: t.kind, tabId: tab.id, startedAt: Date.now() };
    await setJob(job);
    watchdog = setTimeout(async () => { const j = await getJob(); if (j && j.scanId === job.scanId) finish(j, { status: 'error', message: 'Waktu habis saat mengumpulkan data dari Shopee.' }); }, 100000);
  }

  chrome.runtime.onMessage.addListener((msg, sender, send) => {
    if (!msg || typeof msg.type !== 'string' || msg.type.indexOf('audit:') !== 0) return false;
    (async () => {
      const job = await getJob();
      if (msg.type === 'audit:start') { await start(msg, sender); return send({ ok: true }); }
      if (msg.type === 'audit:cancel') { if (job) { clearTimeout(watchdog); await setJob(null); try { await chrome.tabs.remove(job.tabId); } catch (_) { /* abaikan */ } } return send({ ok: true }); }
      // dari collector: hanya dari tab yang kita buka
      if (!job || !sender.tab || sender.tab.id !== job.tabId) return send(null);
      if (msg.type === 'audit:hello') return send({ kind: job.kind });
      if (msg.type === 'audit:result') {
        const st = msg.status === 'ok' ? 'ok' : (msg.status === 'needs_login' ? 'needs_login' : 'error');
        await finish(job, Object.assign({ status: st, message: String(msg.message || '').slice(0, 200) }, st === 'ok' && msg.payload && typeof msg.payload === 'object' ? msg.payload : {}));
        return send({ ok: true });
      }
      send(null);
    })().catch(() => send(null));
    return true;
  });
})();
