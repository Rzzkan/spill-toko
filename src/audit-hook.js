/* Marketplace Audit - dunia halaman (MAIN), document_start, hanya di tab yang dibuka extension untuk audit (penanda #ts-audit).
 * Menyimpan salinan respons API Shopee yang diminta halaman sendiri (detail produk, detail toko, daftar produk) di memori tab ini,
 * lalu menyerahkannya ke audit-collect.js saat diminta lewat window.postMessage. Tidak membuat permintaan sendiri, tidak membaca cookie. */
(function () {
  'use strict';
  if (window.__tsAuditHook) return;
  window.__tsAuditHook = 1;
  let armed = false;
  try { if (/ts-audit/.test(location.hash)) sessionStorage.setItem('ts_audit', '1'); armed = sessionStorage.getItem('ts_audit') === '1'; } catch (_) { /* abaikan */ }
  if (!armed) return;

  const buf = { pdp: null, shop: null, cards: new Map() };
  const path = (u) => { try { return new URL(u, location.href).pathname; } catch (_) { return ''; } };

  function handle(url, text) {
    try {
      if (!text || text.length > 6e6 || !/\/api\/v4\//.test(url)) return;
      const p = path(url);
      const json = JSON.parse(text);
      if (/\/pdp\/get_pc$/.test(p)) buf.pdp = json;
      else if (/\/shop\/get_shop_detail$/.test(p)) buf.shop = json;
      if (window.SpillApi) window.SpillApi.cards(json).forEach((c) => { if (buf.cards.size < 80) buf.cards.set(c.key, c); });
    } catch (_) { /* jangan pernah mengganggu halaman */ }
  }
  const fo = window.fetch;
  if (typeof fo === 'function') {
    window.fetch = function (input) {
      const p = fo.apply(this, arguments);
      try {
        const u = typeof input === 'string' ? input : (input && input.url) || '';
        if (/\/api\/v4\//.test(u)) p.then((r) => { try { r.clone().text().then((t) => handle(u, t)).catch(() => {}); } catch (_) { /* abaikan */ } }).catch(() => {});
      } catch (_) { /* abaikan */ }
      return p;
    };
  }
  const xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { try { this.__tsUrl = String(u); } catch (_) { /* abaikan */ } return xo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    try {
      if (this.__tsUrl && /\/api\/v4\//.test(this.__tsUrl)) this.addEventListener('load', () => { try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) handle(this.__tsUrl, this.responseText); } catch (_) { /* abaikan */ } });
    } catch (_) { /* abaikan */ }
    return xs.apply(this, arguments);
  };

  // Data awal di HTML (tanpa permintaan baru): detail produk & kartu produk halaman toko.
  function readSsr() {
    const out = { pdpData: null, cards: [] };
    try {
      const el = document.querySelector('script[type="text/mfe-initial-data"]');
      if (!el || !el.textContent || el.textContent.length > 6e6) return out;
      const j = JSON.parse(el.textContent);
      const map = j && j.initialState && j.initialState.DOMAIN_PDP && j.initialState.DOMAIN_PDP.data && j.initialState.DOMAIN_PDP.data.PDP_BFF_DATA && j.initialState.DOMAIN_PDP.data.PDP_BFF_DATA.cachedMap;
      const m = /-i\.(\d+)\.(\d+)/.exec(location.pathname) || /\/product\/(\d+)\/(\d+)/.exec(location.pathname);
      if (map && m && map[m[1] + '/' + m[2]]) out.pdpData = map[m[1] + '/' + m[2]];
      if (window.SpillApi) out.cards = window.SpillApi.cards(j).slice(0, 60);
    } catch (_) { /* abaikan */ }
    return out;
  }

  window.addEventListener('message', (ev) => {
    if (ev.source !== window || !ev.data || ev.data.__ts !== 'pull') return;
    const ssr = readSsr();
    window.postMessage({ __ts: 'data', pdp: buf.pdp, shop: buf.shop, pdpData: ssr.pdpData, cards: Array.from(buf.cards.values()).concat(ssr.cards).slice(0, 80) }, location.origin);
  });
})();
