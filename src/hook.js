/* Shofee - berjalan di dunia halaman (MAIN) pada document_start.
 * Membaca salinan respons API yang diminta halaman Shopee sendiri dan data awal di HTML; permintaan aktif hanya untuk
 * daftar produk toko, atas perintah content script dengan batas laju (lihat ALLOW di bawah). Mengekstrak data produk, lalu mengirimnya ke content script lewat window.postMessage. */
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
  // Halaman toko/pencarian/kategori: data produk halaman pertama sudah ada di HTML (mfe-initial-data), baca tanpa permintaan baru.
  function readInitialList() {
    try {
      if (!window.SpillApi || /-i\.\d+\.\d+|^\/product\//.test(location.pathname)) return;
      const el = document.querySelector('script[type="text/mfe-initial-data"]');
      if (!el || !el.textContent || el.textContent.length > 6e6) return;
      const cards = window.SpillApi.cards(JSON.parse(el.textContent));
      if (!cards.length) return;
      const msg = { __spill: 'api', path: 'ssr-list', cards: cards, pdp: null };
      queue.push(msg); window.postMessage(msg, location.origin);
    } catch (_) { /* abaikan */ }
  }
  const boot = () => { readInitial(); readInitialList(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // Permintaan aktif (eksperimen, dengan batas laju dari content script): hanya endpoint daftar produk toko yang diizinkan.
  const ALLOW = /^\/api\/v4\/search\/search_items\?[A-Za-z0-9_=&.%-]{1,300}$/;
  window.addEventListener('message', async (ev) => {
    const d = ev.data;
    if (ev.source !== window || !d || d.__spill !== 'fetch' || typeof d.url !== 'string' || !ALLOW.test(d.url)) return;
    const reply = (o) => window.postMessage(Object.assign({ __spill: 'fetch-res', id: d.id }, o), location.origin);
    try {
      const r = await window.fetch(d.url, { credentials: 'include', headers: { Accept: 'application/json' } });
      const t = await r.text();
      let n = 0, err = null;
      try { const j = JSON.parse(t); err = j && j.error ? String(j.error).slice(0, 40) : null; n = window.SpillApi ? window.SpillApi.cards(j).length : 0; } catch (_) { err = 'bukan JSON'; }
      reply({ status: r.status, n: n, err: err });
    } catch (e) { reply({ status: 0, n: 0, err: 'jaringan' }); }
  });

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
