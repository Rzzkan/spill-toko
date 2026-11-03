/* Spill Toko - berjalan di dunia halaman (MAIN) pada document_start.
 * Hanya MEMBACA salinan respons API yang sudah diminta halaman Shopee sendiri (tidak membuat permintaan baru),
 * mengekstrak data produk, lalu mengirimnya ke content script lewat window.postMessage. */
(function () {
  'use strict';
  if (window.__spillHook) return;
  window.__spillHook = 1;
  const API = /\/api\/v4\//;
  const queue = [];
  // content script (dunia terisolasi) memberi tanda siap -> kirim ulang semua yang sudah tertangkap
  window.addEventListener('message', (ev) => {
    if (ev.source === window && ev.data && ev.data.__spill === 'ready') queue.forEach((m) => window.postMessage(m, location.origin));
  });
  const PATH = (u) => { try { return new URL(u, location.href).pathname; } catch (_) { return ''; } };

  function handle(url, text) {
    try {
      if (!API.test(url) || !text || text.length > 8e6 || !window.SpillApi) return;
      const path = PATH(url);
      const json = JSON.parse(text);
      const cards = window.SpillApi.cards(json);
      const pdp = /pdp\/get_pc/.test(path) ? window.SpillApi.pdp(json) : null;
      if (cards.length || pdp) {
        const msg = { __spill: 'api', path: path, cards: cards, pdp: pdp };
        queue.push(msg); if (queue.length > 60) queue.shift();   // content script baru aktif setelah halaman dimuat -> simpan dulu
        window.postMessage(msg, location.origin);
      }
    } catch (_) { /* jangan pernah mengganggu halaman */ }
  }

  // Halaman produk memuat datanya langsung di HTML (<script type="text/mfe-initial-data">), tanpa permintaan API terpisah.
  // Dibaca dari DOM saja (tidak ada permintaan baru ke server). Stok di sana hanya pratinjau (dibatasi), jadi tidak dipakai.
  function readInitial() {
    try {
      if (!window.SpillApi) return;
      const el = document.querySelector('script[type="text/mfe-initial-data"]');
      if (!el || !el.textContent || el.textContent.length > 6e6) return;
      const st = JSON.parse(el.textContent).initialState;
      const map = st && st.DOMAIN_PDP && st.DOMAIN_PDP.data && st.DOMAIN_PDP.data.PDP_BFF_DATA && st.DOMAIN_PDP.data.PDP_BFF_DATA.cachedMap;
      if (!map) return;
      const m = /-i\.(\d+)\.(\d+)/.exec(location.pathname) || /\/product\/(\d+)\/(\d+)/.exec(location.pathname);
      const entry = m && map[m[1] + '/' + m[2]];
      const pdp = entry ? window.SpillApi.pdp({ data: entry }) : null;
      if (!pdp) return;
      pdp.stock = null; pdp.variantSales = null; pdp.soldExact = null;
      const msg = { __spill: 'api', path: 'ssr', cards: [], pdp: pdp };
      queue.push(msg);
      window.postMessage(msg, location.origin);
    } catch (_) { /* abaikan */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', readInitial); else readInitial();

  const of = window.fetch;
  if (typeof of === 'function') {
    window.fetch = function () {
      const p = of.apply(this, arguments);
      try {
        const a = arguments[0];
        const url = String((a && a.url) || a);
        if (API.test(url)) p.then((r) => { if (r && r.ok) r.clone().text().then((t) => handle(url, t)).catch(() => {}); }).catch(() => {});
      } catch (_) { /* abaikan */ }
      return p;
    };
  }

  const xo = XMLHttpRequest.prototype.open, xs = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { try { this.__spillUrl = String(u); } catch (_) { /* abaikan */ } return xo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    try {
      if (this.__spillUrl && API.test(this.__spillUrl)) {
        this.addEventListener('load', () => {
          try { if (this.status === 200 && (this.responseType === '' || this.responseType === 'text')) handle(this.__spillUrl, this.responseText); } catch (_) { /* abaikan */ }
        });
      }
    } catch (_) { /* abaikan */ }
    return xs.apply(this, arguments);
  };
})();
