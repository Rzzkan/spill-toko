/* Marketplace Audit - content script (dunia terisolasi), document_start, hanya di tab audit yang dibuka extension.
 * Menunggu halaman Shopee memuat datanya, meminta salinan dari audit-hook.js, mengubahnya jadi payload (audit-parse.js),
 * lalu melapor ke service worker. Bila Shopee mengalihkan ke halaman login, melapor "needs_login". Tidak menyentuh kata sandi/cookie. */
(function () {
  'use strict';
  let on = false;
  try { if (/ts-audit/.test(location.hash)) sessionStorage.setItem('ts_audit', '1'); on = sessionStorage.getItem('ts_audit') === '1'; } catch (_) { /* abaikan */ }
  if (!on || !window.SpillAudit) return;

  const LOGIN = /^\/(buyer\/login|user\/login|login)\b/;
  const VERIFY = /^\/verify\//;
  const MAX_MS = 75000;
  let finished = false, job = null;
  const t0 = Date.now();

  function report(status, message, payload) {
    if (finished) return;
    finished = true;
    try { chrome.runtime.sendMessage({ type: 'audit:result', status: status, message: message || '', payload: payload || {} }); } catch (_) { /* abaikan */ }
  }

  // cadangan dari DOM bila JSON tidak memuat: panjang deskripsi & jumlah foto
  function domExtras() {
    const o = {};
    try {
      const heads = Array.from(document.querySelectorAll('h2, h3, div, section')).filter((e) => e.children.length === 0 && /^deskripsi produk$/i.test((e.textContent || '').trim()));
      if (heads[0]) {
        let box = heads[0].parentElement;
        for (let i = 0; i < 3 && box && (box.textContent || '').length < 60; i++) box = box.parentElement;
        const len = box ? (box.textContent || '').replace(/Deskripsi Produk/i, '').trim().length : 0;
        if (len > 0) o.description_len = len;
      }
    } catch (_) { /* abaikan */ }
    return o;
  }

  function pull() {
    return new Promise((res) => {
      const t = setTimeout(() => { window.removeEventListener('message', h); res(null); }, 1200);
      const h = (ev) => { if (ev.source === window && ev.data && ev.data.__ts === 'data') { clearTimeout(t); window.removeEventListener('message', h); res(ev.data); } };
      window.addEventListener('message', h);
      window.postMessage({ __ts: 'pull' }, location.origin);
    });
  }

  function build(d) {
    const A = window.SpillAudit;
    if (job.kind === 'product') {
      const json = d.pdp || (d.pdpData ? { data: d.pdpData } : null);
      return json ? A.product(json, domExtras()) : null;
    }
    return d.shop ? A.shop(d.shop, d.cards) : null;
  }

  async function loop() {
    while (!finished) {
      const el = Date.now() - t0;
      if (LOGIN.test(location.pathname)) return report('needs_login', 'Belum login Shopee');
      if (VERIFY.test(location.pathname)) return report('error', 'Shopee meminta verifikasi (captcha). Buka Shopee di tab biasa, selesaikan verifikasi, lalu ulangi audit.');
      if (document.readyState !== 'loading') {
        const d = await pull();
        const out = d && build(d);
        const ready = out && (job.kind === 'product' ? out.product && out.product.name : (out.shop && out.shop.name && (out.products.length > 0 || el > 15000)));
        if (ready) {
          if (job.kind === 'product' && el < 4000) { await new Promise((r) => setTimeout(r, 2500)); continue; }   // beri waktu DOM (deskripsi) selesai dirender
          return report('ok', '', window.SpillAudit.compact(job.kind === 'product' ? build(await pull() || d) : out));
        }
      }
      if (el > 25000 && document.querySelector('input[type="password"], input[name="loginKey"]')) return report('needs_login', 'Belum login Shopee');
      if (el > MAX_MS) return report('error', 'Data tidak ditemukan di halaman Shopee. Pastikan tautan benar dan kamu sudah login, lalu coba lagi.');
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  chrome.runtime.sendMessage({ type: 'audit:hello' }, (j) => {
    void chrome.runtime.lastError;
    if (!j || (j.kind !== 'product' && j.kind !== 'shop')) return;
    job = j;
    loop();
  });
})();
