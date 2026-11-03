/* Spill Toko - penyimpanan koleksi produk (chrome.storage.local) + state job multi-halaman. */
(function (root) {
  'use strict';

  const Store = {
    async items() {
      const o = await chrome.storage.local.get('items');
      return o.items || {};
    },

    // Gabungkan hasil scan baru ke koleksi. Riwayat jumlah terjual (hist) dipakai untuk kolom Δ.
    async upsert(records, meta) {
      const items = await Store.items();
      const now = Date.now();
      let added = 0, updated = 0;
      records.forEach(function (r) {
        const old = items[r.key];
        const hist = (old && old.hist) ? old.hist.slice() : [];
        if (r.sold != null) {
          const last = hist[hist.length - 1];
          if (!last || last.sold !== r.sold || last.m !== r.soldMonthly) {
            hist.push({ t: now, sold: r.sold, m: !!r.soldMonthly });
            if (hist.length > 20) hist.shift();
          }
        }
        const merged = Object.assign({}, old || {});
        Object.keys(r).forEach(function (k) {
          if (r[k] !== undefined && r[k] !== null && r[k] !== '') merged[k] = r[k];
        });
        merged.hist = hist;
        merged.firstSeen = (old && old.firstSeen) || now;
        merged.lastSeen = now;
        merged.source = (meta && meta.source) || (old && old.source) || '';
        items[r.key] = merged;
        if (old) updated++; else added++;
      });
      await chrome.storage.local.set({ items: items });
      return { added: added, updated: updated, total: Object.keys(items).length };
    },

    async clear() { await chrome.storage.local.remove('items'); },

    async getJob() { const o = await chrome.storage.local.get('job'); return o.job || null; },
    async setJob(job) { await chrome.storage.local.set({ job: job }); },
    async clearJob() { await chrome.storage.local.remove('job'); },

    async shop(id) { const o = await chrome.storage.local.get('shops'); return (o.shops || {})[id] || null; },
    async saveShop(id, info) {
      const o = await chrome.storage.local.get('shops');
      const shops = o.shops || {};
      const merged = Object.assign({}, shops[id] || {});
      Object.keys(info).forEach(function (k) { if (info[k] != null && info[k] !== '') merged[k] = info[k]; });
      shops[id] = merged;
      await chrome.storage.local.set({ shops: shops });
    },

    // estimasi penjualan 30 hari dari riwayat scan (atau angka "/bulan" bila Shopee menampilkannya)
    rate30(item) {
      if (item.sold == null) return null;
      const mid = item.priceMax && item.price != null ? (item.price + item.priceMax) / 2 : item.price;
      if (item.soldMonthly) return { sold: item.sold, omzet: mid != null ? item.sold * mid : null };
      const h = item.hist || [];
      const est = function () { const e = item.est30; return e ? { sold: e.sold, omzet: e.omzet, est: true, sample: e.sample, recent: e.recent } : null; };
      if (!h.length) return est();
      const end = item.lastSeen || h[h.length - 1].t;
      const cutoff = end - 30 * 864e5;
      let b = h[0];
      h.forEach(function (e) { if (e.t <= cutoff) b = e; });
      const cur = h[h.length - 1];
      const days = (end - b.t) / 864e5;
      if (days < 0.5 || b.m !== cur.m) return est();
      const sold = Math.max(0, (cur.sold - b.sold) / days * 30);
      return { sold: sold, omzet: mid != null ? sold * mid : null };
    },

    // laju terjual interval terakhir vs interval sebelumnya (butuh >=3 titik riwayat)
    trend(item) {
      const h = item.hist || [];
      const n = h.length;
      if (n < 3) return null;
      const c = h[n - 1], p = h[n - 2], q = h[n - 3];
      if (c.m !== p.m || p.m !== q.m) return null;
      const cur = (c.sold - p.sold) / Math.max(0.5, (c.t - p.t) / 864e5);
      const prev = (p.sold - q.sold) / Math.max(0.5, (p.t - q.t) / 864e5);
      return { cur: cur, prev: prev };
    },

    // selisih terjual antara dua scan terakhir yang berbeda
    delta(item) {
      const h = item.hist || [];
      if (h.length < 2) return null;
      const a = h[h.length - 1], b = h[h.length - 2];
      if (a.m !== b.m) return null;
      return { d: a.sold - b.sold, days: (a.t - b.t) / 864e5 };
    }
  };

  root.SpillStore = Store;
})(typeof self !== 'undefined' ? self : this);
