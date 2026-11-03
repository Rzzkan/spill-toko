/* Shofee - penyimpanan koleksi produk (chrome.storage.local) + state job multi-halaman. */
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
      records.forEach(function (r0) {
        const old = items[r0.key];
        let r = r0;
        // data dari API Shopee (angka pasti) tidak ditimpa angka tampilan yang dibulatkan dari DOM
        if (r0.via === 'api') { r = Object.assign({}, r0, { apiAt: now }); if (r.api30 != null) r.api30At = now; }
        else if (old && old.apiAt && old.sold > 0 && now - old.apiAt < 6 * 36e5) {
          r = Object.assign({}, r0);
          ['sold', 'soldMonthly', 'soldPlus', 'omzet', 'price', 'priceMax'].forEach(function (k) { delete r[k]; });
        }
        const hist = (old && old.hist) ? old.hist.slice() : [];
        if (r.sold != null) {
          const last = hist[hist.length - 1];
          if (!last || last.sold !== r.sold || last.m !== r.soldMonthly) {
            hist.push({ t: now, sold: r.sold, m: !!r.soldMonthly, x: r0.via === 'api' });
            if (hist.length > 20) hist.shift();
          }
        }
        // snapshot terjual-30-hari pasti (maks 1 per ~20 jam) untuk trend lokal
        const mh = (old && old.mh) ? old.mh.slice() : [];
        if (r0.via === 'api' && r0.api30 != null && (!mh.length || now - mh[mh.length - 1].t > 20 * 36e5)) { mh.push({ t: now, m: r0.api30 }); if (mh.length > 14) mh.shift(); }
        const merged = Object.assign({}, old || {});
        Object.keys(r).forEach(function (k) {
          if (r[k] !== undefined && r[k] !== null && r[k] !== '') merged[k] = r[k];
        });
        merged.hist = hist;
        merged.mh = mh;
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
    rate30(item, fbMonths) {
      if (item.sold == null) return null;
      const mid0 = item.priceMax && item.price != null ? (item.price + item.priceMax) / 2 : item.price;
      // api30=0 padahal total terjual >0 = Shopee tidak mengirim angka bulanan (bukan benar-benar nol) -> pakai estimasi
      if (item.api30 != null && !(item.api30 === 0 && item.sold > 0)) return { sold: item.api30, omzet: mid0 != null ? item.api30 * mid0 : null, api: true };
      const mid = item.priceMax && item.price != null ? (item.price + item.priceMax) / 2 : item.price;
      if (item.soldMonthly) return { sold: item.sold, omzet: mid != null ? item.sold * mid : null };
      const h = (item.hist || []).filter(function (e) { return e.x; });   // hanya angka pasti dari API (angka DOM dibulatkan)
      const est = function () {
        const e = item.est30;
        if (e) return { sold: e.sold, omzet: e.omzet, est: true, sample: e.sample, recent: e.recent };
        // cadangan: rata-rata per bulan sejak produk dibuat (atau sejak toko bergabung) agar tidak tampil 0
        if (!(item.sold > 0)) return null;
        let mo = item.ctime ? (Date.now() / 1000 - item.ctime) / (30 * 86400) : (fbMonths || 0);
        if (!(mo > 0)) return null;
        mo = Math.max(1, mo);
        const sold = item.sold / mo;
        return { sold: sold, omzet: mid != null ? sold * mid : null, est: true, life: true };
      };
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
    // simpan nilai ~30 hari lalu dari server: { 'shop.item': {m, s, d} }
    async setPrev(map) {
      const items = await Store.items();
      let n = 0;
      Object.keys(map || {}).forEach(function (k) {
        const v = map[k];
        if (items[k] && v && typeof v.m === 'number') { items[k].prev30 = { m: v.m, d: v.d || null, at: Date.now() }; n++; }
      });
      if (n) await chrome.storage.local.set({ items: items });
      return n;
    },
    // total terjual pasti terakhir dari server (pengguna lain / Anda): { 'shop.item': {s, m, d} }
    async setLast(map) {
      const items = await Store.items();
      let n = 0;
      Object.keys(map || {}).forEach(function (k) {
        const v = map[k];
        if (items[k] && v && typeof v.s === 'number') { items[k].last = { s: v.s, m: typeof v.m === 'number' ? v.m : null, d: v.d || null, at: Date.now() }; n++; }
      });
      if (n) await chrome.storage.local.set({ items: items });
      return n;
    },
    // pembanding 30 hari lalu: snapshot lokal (20-45 hari) lebih dulu, lalu dari server
    prevMonth(item) {
      const now = Date.now();
      let best = null;
      (item.mh || []).forEach(function (e) {
        const d = (now - e.t) / 864e5;
        if (d >= 20 && d <= 45 && (!best || Math.abs(d - 30) < Math.abs(best.d - 30))) best = { d: d, m: e.m };
      });
      if (best) return best.m;
      return item.prev30 && typeof item.prev30.m === 'number' ? item.prev30.m : null;
    },
    trend(item) {
      if (item.api30 != null) {
        const pm = Store.prevMonth(item);
        if (pm != null && pm > 0) return { cur: item.api30, prev: pm };
      }
      const h = (item.hist || []).filter(function (e) { return e.x; });
      const n = h.length;
      if (n < 3) return null;
      const c = h[n - 1], p = h[n - 2], q = h[n - 3];
      if (c.m !== p.m || p.m !== q.m) return null;
      if (c.sold < p.sold || p.sold < q.sold) return null;
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
