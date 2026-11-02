/* Spill Toko - orkestrasi: scan halaman, auto-scroll, multi-halaman, kartu inline, modal analisa, export. */
(function () {
  'use strict';
  if (window.__spillTokoLoaded) return;
  window.__spillTokoLoaded = true;

  const P = SpillParser, S = SpillStore;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);

  let ui, inline, cancelled = false, busy = false, lastHref = location.href;
  let pageKeys = new Set();
  let allItems = [];
  let detail = null, competitors = [];
  let lic = { enabled: false, state: 'disabled', access: true };
  let licTimer = null;

  // ---------- lisensi ----------
  async function refreshLicense(force) {
    const was = lic.access, wasPending = !!lic.pending;
    try { lic = await SpillLicense.get(!!force); }
    catch (e) { lic = { enabled: true, state: 'offline', access: false, message: 'Lisensi tidak terbaca: ' + e.message }; }
    ui.setLicense(lic);
    inline.setLic(lic);
    if (wasPending && !lic.pending && lic.access) inline.closePlans();
    if (lic.pending && !licTimer) licTimer = setInterval(() => refreshLicense(true), 8000);
    if (!lic.pending && licTimer) { clearInterval(licTimer); licTimer = null; }
    await renderInline();
    if (lic.access && !was) scheduleInitialRender();
  }

  function guard() {
    if (lic.access) return true;
    ui.setStatus('Fitur terkunci. Masuk dengan Google (trial 3 hari gratis) atau pilih paket.', 'err');
    return false;
  }

  async function onLicense(act, plan) {
    if (act === 'plans') { inline.openPlans(); return; }
    if (act === 'refresh') { await refreshLicense(true); return; }
    inline.setLicenseUi({ busy: act === 'login' ? 'Menunggu login Google…' : act === 'checkout' ? 'Membuka pembayaran…' : null, error: null });
    try {
      if (act === 'login') await SpillLicense.login();
      else if (act === 'checkout') await SpillLicense.checkout(plan);
      else if (act === 'logout') await SpillLicense.logout();
      inline.setLicenseUi({ busy: null, error: null });
    } catch (e) { inline.setLicenseUi({ busy: null, error: e.message }); }
    await refreshLicense(true);
  }

  // ---------- util ----------
  const type = () => P.pageType(location);

  function sourceLabel() {
    const t = type();
    const u = new URL(location.href);
    if (t === 'search') return 'cari: ' + (u.searchParams.get('keyword') || '');
    if (t === 'shop') return 'toko: ' + location.pathname.replace(/^\//, '');
    if (t === 'category') return 'kategori: ' + location.pathname.replace(/^\//, '').slice(0, 40);
    return t;
  }

  const completeness = (r) => ['name', 'price', 'sold', 'rating', 'location', 'image'].filter((k) => r[k] != null && r[k] !== '').length;

  function collectInto(bag) {
    P.parseAll(document).forEach((r) => {
      const old = bag.get(r.key);
      if (!old || completeness(r) >= completeness(old)) bag.set(r.key, r);
    });
  }

  async function scrollThrough(onStep, maxMs) {
    window.scrollTo(0, 0);
    await sleep(500);
    const t0 = Date.now();
    let stable = 0;
    while (!cancelled && Date.now() - t0 < (maxMs || 25000)) {
      window.scrollBy(0, Math.round(window.innerHeight * 0.7));
      await sleep(rand(280, 450));
      if (onStep) onStep();
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      if (atBottom) { stable++; if (stable >= 3) break; await sleep(500); } else stable = 0;
    }
  }

  function shopIdFromPage() {
    const m = location.pathname.match(/^\/shop\/(\d+)/);
    if (m) return m[1];
    const count = {};
    document.querySelectorAll('a[href]').forEach((a) => {
      const ids = P.idsFromHref(a.getAttribute('href'));
      if (ids) count[ids.shopId] = (count[ids.shopId] || 0) + 1;
    });
    const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    return best ? best[0] : null;
  }

  // ---------- statistik agregat ----------
  function aggStats(items, months) {
    const a = { count: items.length, priceMin: Infinity, priceMax: 0, totalSold: 0, totalOmzet: 0, hasTotal: false, basisSold: 0, basisOmzet: 0,
      sold30: 0, omzet30: 0, have30: 0, cur: 0, prev: 0, omCur: 0, omPrev: 0, haveT: 0 };
    items.forEach((i) => {
      const mid = i.priceMax && i.price != null ? (i.price + i.priceMax) / 2 : i.price;
      if (i.price != null) { a.priceMin = Math.min(a.priceMin, i.price); a.priceMax = Math.max(a.priceMax, i.priceMax || i.price); }
      if (i.sold != null) {
        a.basisSold += i.sold; a.basisOmzet += i.omzet || 0;
        if (!i.soldMonthly) { a.totalSold += i.sold; a.totalOmzet += i.omzet || 0; a.hasTotal = true; }
      }
      const r = S.rate30(i);
      if (r) { a.sold30 += r.sold; a.omzet30 += r.omzet || 0; a.have30++; }
      const t = S.trend(i);
      if (t && mid != null) { a.cur += t.cur; a.prev += t.prev; a.omCur += t.cur * mid; a.omPrev += t.prev * mid; a.haveT++; }
    });
    if (a.priceMin === Infinity) a.priceMin = null;
    a.soldTrend = a.haveT && a.prev > 0 ? ((a.cur - a.prev) / a.prev) * 100 : null;
    a.omzetTrend = a.haveT && a.omPrev > 0 ? ((a.omCur - a.omPrev) / a.omPrev) * 100 : null;
    a.avgSold = months && a.hasTotal ? a.totalSold / months : null;
    a.avgOmzet = months && a.hasTotal ? a.totalOmzet / months : null;
    const withO = items.filter((i) => i.omzet != null).sort((x, y) => y.omzet - x.omzet);
    a.top = withO.slice(0, 10).map((i) => Object.assign({}, i, { share: a.basisOmzet ? (i.omzet / a.basisOmzet) * 100 : 0 }));
    a.top10share = a.basisOmzet ? (a.top.reduce((s, i) => s + i.omzet, 0) / a.basisOmzet) * 100 : null;
    const sorted = items.map((i) => i.sold).filter((x) => x != null).sort((x, y) => x - y);
    a.medianSold = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
    return a;
  }

  // produk yang termasuk "cakupan" halaman saat ini
  async function scopeItems(kind) {
    if (kind === 'shop') {
      const sid = shopIdFromPage();
      return sid ? allItems.filter((i) => i.shopId === sid) : [];
    }
    const src = sourceLabel();
    return allItems.filter((i) => i.source === src || pageKeys.has(i.key));
  }

  function enrich(items, shopNames) {
    const totalOm = items.reduce((s, i) => s + (i.omzet || 0), 0);
    return items.map((i) => {
      const r = S.rate30(i), t = S.trend(i);
      return Object.assign({}, i, {
        sold30: r ? r.sold : null, omzet30: r ? r.omzet : null,
        trendPct: t && t.prev > 0 ? ((t.cur - t.prev) / t.prev) * 100 : null,
        share: totalOm && i.omzet != null ? (i.omzet / totalOm) * 100 : null,
        shopName: i.shopName || (shopNames && shopNames[i.shopId]) || ''
      });
    });
  }

  let shopNameCache = {};
  const lastUpdated = (items) => items.reduce((m, i) => Math.max(m, i.lastSeen || 0), 0) || null;

  // ---------- kartu inline ----------
  async function renderInline() {
    if (!inline) return;
    const t = type();
    try {
      if (!lic.access && ['shop', 'search', 'category', 'product'].includes(t)) {
        inline.render({ kind: t === 'category' ? 'search' : t, locked: true, data: {} });
        return;
      }
      if (t === 'shop') {
        const sid = shopIdFromPage();
        let info = P.parseShopInfo(document);
        if (sid) {
          const saved = (await S.shop(sid)) || {};
          const fresh = info.products != null || info.followers != null;
          info = fresh ? Object.assign({}, saved, Object.fromEntries(Object.entries(info).filter(([, v]) => v != null && v !== ''))) : saved;
          if (fresh) await S.saveShop(sid, info);
          if (info.name) shopNameCache[sid] = info.name;
        }
        const items = await scopeItems('shop');
        const months = info.joinedMonths ? Math.max(1, info.joinedMonths) : null;
        inline.render({ kind: 'shop', data: { info: info, stats: items.length ? aggStats(items, months) : null, scanned: items.length, updatedAt: lastUpdated(items) } });
      } else if (t === 'search' || t === 'category') {
        const items = await scopeItems('search');
        inline.render({ kind: 'search', data: { stats: items.length ? aggStats(items) : null, updatedAt: lastUpdated(items) } });
      } else if (t === 'product') {
        const d = detail;
        if (!d || (d.price == null && !d.name)) return;
        const rec = allItems.find((i) => i.key === d.key);
        const tr = rec ? S.trend(rec) : null;
        inline.render({ kind: 'product', data: {
          detail: d, rate: rec ? S.rate30(rec) : null, trendPct: tr && tr.prev > 0 ? ((tr.cur - tr.prev) / tr.prev) * 100 : null,
          competitors: competitors, updatedAt: rec ? rec.lastSeen : null } });
      } else inline.hide();
      scheduleAutoAi();
    } catch (e) { console.warn('[Spill Toko] inline', e); }
  }

  // ---------- analisis AI (diproses server -> kenari.id) ----------
  const AI_KINDS = ['product', 'shop', 'search'];
  let aiRun = 0, aiTimer = null, aiDone = {}, aiCur = null;
  const pick = (o, keys) => { const r = {}; keys.forEach((k) => { if (o && o[k] != null && o[k] !== '' && !(typeof o[k] === 'number' && !isFinite(o[k]))) r[k] = o[k]; }); return r; };
  const r1 = (x) => (x == null || !isFinite(x) ? null : Math.round(x * 10) / 10);
  const slimItem = (i) => {
    const o = pick(i, ['name', 'price', 'priceMax', 'sold', 'soldPlus', 'soldMonthly', 'omzet', 'rating', 'location', 'favorit', 'shopName']);
    if (i.share != null) o.sharePct = r1(i.share);
    if (i.sold30 != null) o.sold30 = i.sold30;
    if (i.trendPct != null) o.trendPct = r1(i.trendPct);
    return o;
  };
  const STAT_KEYS = ['count', 'priceMin', 'priceMax', 'totalSold', 'totalOmzet', 'basisSold', 'basisOmzet', 'sold30', 'omzet30', 'soldTrend', 'omzetTrend', 'avgSold', 'avgOmzet', 'top10share', 'medianSold'];
  const slimStats = (a) => { const o = pick(a, STAT_KEYS); ['soldTrend', 'omzetTrend', 'top10share', 'avgSold', 'avgOmzet'].forEach((k) => { if (o[k] != null) o[k] = r1(o[k]); }); return o; };
  const hash32 = (str) => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + str.length; };

  // Susun data yang dikirim ke server. Mengembalikan null bila datanya belum cukup.
  async function buildAiData(kind) {
    if (kind === 'product') {
      const d = detail;
      if (!d || (d.price == null && !d.name)) return null;
      const rec = allItems.find((i) => i.key === d.key);
      const r = rec ? S.rate30(rec) : null, tr = rec ? S.trend(rec) : null;
      const data = {
        halaman: 'produk',
        produk: pick(d, ['name', 'price', 'priceMax', 'stock', 'rating', 'ratingCount', 'favorit', 'sold', 'soldPlus', 'soldMonthly', 'omzet', 'complaintPct', 'shopName']),
        bintang: d.stars || undefined,
        varian: (d.variants || []).map((v) => ({ nama: v.name, opsi: (v.options || []).slice(0, 12) })),
        tren30hari: r ? { terjual: r.sold, omzet: r.omzet, perubahanPct: tr && tr.prev > 0 ? r1(((tr.cur - tr.prev) / tr.prev) * 100) : null } : undefined,
        pesaing: (competitors || []).slice(0, 12).map(slimItem)
      };
      return { data: data, pageKey: 'product:' + (d.key || location.pathname), sig: hash32(JSON.stringify(data)) };
    }
    if (kind === 'shop') {
      const sid = shopIdFromPage();
      const items = await scopeItems('shop');
      if (!sid || items.length < 3) return null;
      const info = Object.assign({}, (await S.shop(sid)) || {}, Object.fromEntries(Object.entries(P.parseShopInfo(document)).filter(([, v]) => v != null && v !== '')));
      const months = info.joinedMonths ? Math.max(1, info.joinedMonths) : null;
      const top = enrich(items, shopNameCache).sort((a, b) => (b.omzet || 0) - (a.omzet || 0)).slice(0, 30).map(slimItem);
      const data = { halaman: 'toko', toko: pick(info, ['name', 'products', 'followers', 'rating', 'ratingCount', 'chatText', 'joined', 'joinedMonths']),
        produkTerscan: items.length, statistik: slimStats(aggStats(items, months)), produkTeratas: top };
      return { data: data, pageKey: 'shop:' + sid, sig: hash32(JSON.stringify(data)) };
    }
    const items = await scopeItems('search');
    if (items.length < 3) return null;
    const kw = new URL(location.href).searchParams.get('keyword') || location.pathname;
    const top = enrich(items, shopNameCache).sort((a, b) => (b.omzet || 0) - (a.omzet || 0)).slice(0, 40).map(slimItem);
    const data = { halaman: 'pencarian', kataKunci: kw, produkTerscan: items.length, statistik: slimStats(aggStats(items)), produkTeratas: top };
    return { data: data, pageKey: 'search:' + kw, sig: hash32(JSON.stringify(data)) };
  }

  async function runAi(kind, force, built) {
    if (!lic.access || !inline) return;
    const href = location.href, myRun = ++aiRun;
    const put = (st) => { if (href === location.href && myRun === aiRun) { aiCur = { kind: kind, st: st }; inline.setAi(kind, st); } };
    try {
      built = built || await buildAiData(kind);
      if (!built) { put({ status: 'nodata' }); return; }
      aiDone[built.pageKey] = built.sig;
      put({ status: 'loading' });
      const res = await SpillLicense.ai(kind, built.data, force);
      if (res.ai) { lic.ai = res.ai; inline.setLic(lic); }
      put({ status: 'ok', analysis: res.analysis, cached: res.cached, at: res.generatedAt });
    } catch (e) { put({ status: 'error', error: e.message }); }
  }

  const onAi = (kind, force) => { if (guard()) runAi(kind === 'category' ? 'search' : kind, !!force); };

  // Jalan otomatis begitu data selesai dibaca (bila diizinkan admin). Hasil yang sama persis diambil dari cache server tanpa memakai kuota.
  function scheduleAutoAi() {
    if (!lic.access || !lic.ai || !lic.ai.enabled || !lic.ai.auto || busy) return;
    if (aiTimer) return;   // sudah terjadwal: data terbaru dibaca saat timer berjalan
    aiTimer = setTimeout(async () => {
      aiTimer = null;
      if (busy) return;
      const t = type(), kind = t === 'category' ? 'search' : t;
      if (!AI_KINDS.includes(kind)) return;
      const built = await buildAiData(kind);
      if (!built || aiDone[built.pageKey] === built.sig) return;
      if (aiCur && aiCur.st.status === 'loading') return;
      runAi(kind, false, built);
    }, 2500);
  }

  function getRows(kind) {
    const t = kind === 'shop' ? 'shop' : 'search';
    const sid = shopIdFromPage();
    const src = sourceLabel();
    const items = t === 'shop' ? allItems.filter((i) => i.shopId === sid) : allItems.filter((i) => i.source === src || pageKeys.has(i.key));
    const names = Object.assign({}, shopNameCache);
    if (t === 'shop' && sid && !names[sid]) names[sid] = '';
    return { rows: enrich(items, names), updatedAt: lastUpdated(items) };
  }

  async function refresh() {
    const items = await S.items();
    allItems = Object.values(items);
    ui.setItems(allItems, pageKeys, S.delta);
    if (type() === 'shop') {
      const pageItems = allItems.filter((i) => pageKeys.has(i.key));
      ui.setShop({ info: P.parseShopInfo(document), summary: P.shopSummary(pageItems) });
    } else ui.setShop(null);
    await renderInline();
    inline && inline.refreshModal();
  }

  function setBusyAll(b, text) {
    busy = b;
    ui.setBusy(b);
    inline && inline.setBusy(b ? text || 'Memindai…' : null);
  }

  // ---------- scan ----------
  async function scanPage() {
    const bag = new Map();
    collectInto(bag);
    await scrollThrough(() => collectInto(bag));
    collectInto(bag);
    window.scrollTo(0, 0);
    const recs = Array.from(bag.values());
    if (recs.length) {
      const res = await S.upsert(recs, { source: sourceLabel() });
      recs.forEach((r) => pageKeys.add(r.key));
      await refresh();
      return { n: recs.length, res };
    }
    return { n: 0 };
  }

  async function onScan(silent) {
    if (busy) return 0;
    if (!guard()) return 0;
    if (P.isBlockedPage(location)) { ui.setStatus('Shopee meminta verifikasi/login. Selesaikan dulu secara manual.', 'err'); return 0; }
    cancelled = false; setBusyAll(true, 'Memindai…');
    ui.setStatus('Scroll & membaca produk…');
    let n = 0;
    try {
      const r = await scanPage();
      n = r.n;
      if (!n) ui.setStatus('Tidak ada kartu produk ditemukan di halaman ini. Pastikan halaman sudah selesai dimuat (dan sudah login jika diminta Shopee).', 'err');
      else ui.setStatus(`Selesai: ${n} produk dibaca (${r.res.added} baru, ${r.res.updated} diperbarui).`, 'ok');
    } catch (e) { ui.setStatus('Gagal scan: ' + e.message, 'err'); }
    setBusyAll(false);
    return n;
  }

  // ---------- multi-halaman (bertahan lewat reload halaman) ----------
  const send = (msg) => new Promise((res) => { try { chrome.runtime.sendMessage(msg, (r) => res(chrome.runtime.lastError ? null : r)); } catch (_) { res(null); } });
  const useWindow = async () => (await chrome.storage.local.get('scan_window')).scan_window !== false;
  let myTabId = null;

  async function startJob(job, url) {
    const base = Object.assign({ active: true, done: 0, found: 0, startedAt: Date.now() }, job);
    cancelled = false;
    if (await useWindow()) {
      // Scan berjalan di jendela popup terpisah; halaman ini tidak berpindah/bergulir.
      await S.setJob(Object.assign({}, base, { mode: 'window', returnUrl: null }));
      const r = await send({ type: 'spill-open-runner', url: url || location.href, screen: { w: screen.availWidth, h: screen.availHeight } });
      if (r && r.ok) { setBusyAll(true, 'Memindai di jendela lain…'); ui.setStatus('Scan berjalan di jendela terpisah (kanan bawah layar). Anda bisa tetap memakai halaman ini.'); return; }
      ui.setStatus('Jendela scan gagal dibuka — memindai langsung di tab ini.', 'err');
    }
    await S.setJob(base);
    sessionStorage.setItem('spill_owner', '1');
    if (url) { location.href = url; return; }
    await runJobStep();
  }

  async function onMulti(total) {
    if (busy) return;
    if (!guard()) return;
    if (!['search', 'category', 'shop'].includes(type())) { ui.setStatus('Multi-halaman hanya untuk hasil pencarian, kategori, atau halaman toko.', 'err'); return; }
    await startJob({ total: total, openModal: false });
  }

  async function onShopAnalyze(force) {
    if (busy) return;
    if (!guard()) return;
    const sid = shopIdFromPage();
    if (!sid) { ui.setStatus('ID toko belum terbaca — tunggu halaman selesai dimuat lalu coba lagi.', 'err'); return; }
    const info = P.parseShopInfo(document);
    const saved = (await S.shop(sid)) || {};
    const products = info.products || saved.products || 60;
    const total = Math.min(15, Math.max(1, Math.ceil(products / 30)));
    setBusyAll(true, 'Memindai…');
    await startJob({ total: total, kind: 'shop', shopId: sid, returnUrl: location.href, openModal: !force },
      `https://shopee.co.id/shop/${sid}/search?page=0&sortBy=sales`);
  }

  async function runJobStep() {
    const job = await S.getJob();
    if (!job || !job.active) return;
    const inWin = job.mode === 'window';
    const closeRunner = () => { if (inWin) send({ type: 'spill-close-runner' }); };
    if (P.isBlockedPage(location)) {
      job.active = false; job.blocked = true; await S.setJob(job);
      setBusyAll(false);
      ui.setStatus(`Berhenti: Shopee meminta verifikasi/login. Terkumpul ${job.found} produk. Selesaikan manual lalu scan lagi.`, 'err');
      if (inWin) send({ type: 'spill-show-runner' });   // bawa jendela ke depan agar captcha bisa diselesaikan
      return;
    }
    setBusyAll(true, `Memindai ${job.done + 1}/${job.total}…`);
    ui.setStatus(`Halaman ${job.done + 1} dari ${job.total}… (jangan tutup ${inWin ? 'jendela ini' : 'tab'})`);
    let n = 0;
    try { n = (await scanPage()).n; } catch (e) { ui.setStatus('Gagal: ' + e.message, 'err'); }
    const fresh = await S.getJob();
    if (!fresh || !fresh.active) { setBusyAll(false); closeRunner(); return; }   // dihentikan dari halaman asal
    job.done++; job.found = (job.found || 0) + n;
    if (cancelled || n === 0 || job.done >= job.total) {
      job.active = false; job.finished = !cancelled; await S.setJob(job);
      setBusyAll(false);
      ui.setStatus(cancelled ? `Dihentikan. ${job.found} produk terbaca.` : `Selesai ${job.done} halaman — ${job.found} produk terbaca.`, 'ok');
      if (inWin) { closeRunner(); return; }
      if (job.returnUrl && !cancelled) {
        sessionStorage.setItem('spill_open_modal', job.openModal ? '1' : '');
        location.href = job.returnUrl;
      } else if (job.openModal) inline.openModal();
      return;
    }
    await S.setJob(job);
    ui.setStatus(`Halaman ${job.done}/${job.total} selesai (${job.found} produk). Lanjut ke halaman berikut…`);
    await sleep(rand(2500, 4500)); // jeda acak agar tidak seperti bot
    if (cancelled) { job.active = false; await S.setJob(job); setBusyAll(false); closeRunner(); return; }
    location.href = P.nextPageUrl(location.href);
  }

  async function onStop() {
    cancelled = true;
    const job = await S.getJob();
    if (job) { job.active = false; await S.setJob(job); if (job.mode === 'window') send({ type: 'spill-close-runner' }); }
    ui.setStatus('Menghentikan…');
  }

  // ---------- detail produk ----------
  function readDetail() {
    detail = P.parseProductPage(document, location.href);
    competitors = enrich(P.parseAll(document).filter((r) => r.key !== detail.key)).sort((a, b) => (b.omzet || 0) - (a.omzet || 0)).slice(0, 10);
    ui.setDetail(detail);
    return detail;
  }

  async function saveDetail(source) {
    if (!detail || !detail.key || (detail.price == null && detail.sold == null)) return false;
    const recs = [Object.assign({}, detail)];
    await S.upsert(recs, { source: source || 'detail produk' });
    pageKeys.add(detail.key);
    return true;
  }

  async function readAndSave() {
    readDetail();
    await saveDetail();
    await refresh();
  }

  async function onAnalyze(kind) {
    if (!guard()) return;
    if (kind === 'product') return onProductAnalyze();
    if (kind === 'shop') {
      const sid = shopIdFromPage();
      const saved = sid ? ((await S.shop(sid)) || {}) : {};
      const info = P.parseShopInfo(document);
      const products = info.products || saved.products || 0;
      const have = allItems.filter((i) => i.shopId === sid).length;
      if (have && (!products || have >= products * 0.8)) { inline.openModal(); return; }
      return onShopAnalyze(false);
    }
    // search / category
    const have = (await scopeItems('search')).length;
    if (!have) { const n = await onScan(); if (!n) return; }
    inline.openModal();
  }

  async function onRefresh(kind, fromModal) {
    if (busy) return;
    if (!guard()) return;
    if (kind === 'product') return readAndSave();
    if (kind === 'shop') return onShopAnalyze(true);
    const n = await onScan();
    if (n && fromModal) inline.refreshModal();
  }

  async function onProductAnalyze() {
    if (busy) return;
    if (!guard()) return;
    cancelled = false; setBusyAll(true, 'Membaca…');
    ui.setStatus('Scroll untuk memuat varian, ulasan & produk serupa…');
    try {
      await scrollThrough(null, 12000);
      window.scrollTo(0, 0); await sleep(400);
      await readAndSave();
      ui.setStatus('Detail terbaca & disimpan.', 'ok');
    } catch (e) { ui.setStatus('Gagal: ' + e.message, 'err'); }
    setBusyAll(false);
  }

  async function onSaveDetail() {
    if (!guard()) return;
    readDetail();
    if (await saveDetail()) { await refresh(); ui.setStatus('Disimpan ke koleksi.', 'ok'); }
    else ui.setStatus('Detail belum terbaca / ID produk tidak ditemukan.', 'err');
  }

  // ---------- export ----------
  const COLS = [
    ['Nama', (i) => i.name], ['URL', (i) => i.url], ['ShopID', (i) => i.shopId], ['ItemID', (i) => i.itemId], ['Nama Toko', (i) => i.shopName],
    ['Harga', (i) => i.price], ['Harga Maks', (i) => i.priceMax], ['Terjual', (i) => i.sold],
    ['Periode Terjual', (i) => (i.sold == null ? '' : i.soldMonthly ? 'per bulan' : 'total')],
    ['Est. Omzet', (i) => (i.omzet == null ? '' : Math.round(i.omzet))],
    ['Terjual 30 hari', (i) => { const r = S.rate30(i); return r ? Math.round(r.sold) : ''; }],
    ['Omzet 30 hari', (i) => { const r = S.rate30(i); return r && r.omzet != null ? Math.round(r.omzet) : ''; }],
    ['Rating', (i) => i.rating], ['Jml Penilaian', (i) => i.ratingCount], ['Komplain %', (i) => i.complaintPct], ['Stok', (i) => i.stock], ['Wishlist', (i) => i.favorit],
    ['Lokasi', (i) => i.location], ['Diskon %', (i) => i.discount], ['Badge', (i) => (i.badges || []).join('|')],
    ['Δ Terjual', (i) => { const d = S.delta(i); return d ? d.d : ''; }],
    ['Sumber', (i) => i.source], ['Scan Terakhir', (i) => (i.lastSeen ? new Date(i.lastSeen).toISOString() : '')]
  ];

  const cell = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  function toCsv(list) {
    const head = COLS.map((c) => cell(c[0])).join(',');
    const rows = list.map((i) => COLS.map((c) => cell(c[1](i))).join(','));
    return 'sep=,\r\n' + head + '\r\n' + rows.join('\r\n');
  }

  function onExport(list) {
    if (!guard()) return;
    if (!list.length) { ui.setStatus('Tidak ada data untuk diexport.', 'err'); return; }
    const blob = new Blob(['﻿' + toCsv(list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'spill-toko-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    ui.setStatus(`${list.length} baris diexport ke CSV.`, 'ok');
  }

  async function onCopy(list) {
    if (!guard()) return;
    if (!list.length) { ui.setStatus('Tidak ada data untuk disalin.', 'err'); return; }
    const t = (v) => (v == null ? '' : String(v).replace(/[\t\r\n]+/g, ' '));
    const tsv = [COLS.map((c) => c[0]).join('\t')].concat(list.map((i) => COLS.map((c) => t(c[1](i))).join('\t'))).join('\n');
    try { await navigator.clipboard.writeText(tsv); ui.setStatus(`${list.length} baris disalin — tinggal paste di Google Sheets.`, 'ok'); }
    catch (e) { ui.setStatus('Gagal menyalin: ' + e.message, 'err'); }
  }

  async function onClear() {
    await S.clear(); pageKeys = new Set(); await refresh();
    ui.setStatus('Koleksi dihapus.', 'ok');
  }

  // ---------- init ----------
  function scheduleInitialRender() {
    // halaman Shopee dirender bertahap: coba beberapa kali sampai data terbaca
    let tries = 0;
    const tick = async () => {
      tries++;
      if (!lic.access) { await renderInline(); return; }
      const t = type();
      if (t === 'product') {
        readDetail();
        if (detail.price != null || tries >= 8) { await saveDetail(); await refresh(); if (detail.price != null) return; }
      } else await renderInline();
      if (tries < 8 && location.href === lastHref) setTimeout(tick, 1500);
    };
    setTimeout(tick, 2000);
  }

  function onUrlChange() {
    pageKeys = new Set();
    detail = null; competitors = [];
    aiRun++; aiDone = {}; aiCur = null; clearTimeout(aiTimer); inline.setAi(null);
    const t = type();
    ui.setPageType(t);
    ui.setDetail(null);
    if (!['shop', 'search', 'category', 'product'].includes(t)) inline.hide();
    refresh();
    scheduleInitialRender();
  }

  async function init() {
    ui = SpillUI.mount({ onScan: () => onScan(), onMulti, onStop, onAnalyze: onProductAnalyze, onSaveDetail, onExport, onCopy, onClear, onLicense });
    inline = SpillInline.create({
      onAnalyze, onRefresh, onAi, onPanel: () => ui.toggle(true), onMulti, onLicense,
      getRows: getRows, onDownload: (rows) => onExport(rows)
    });
    chrome.runtime.onMessage.addListener((msg) => { if (msg && msg.type === 'toggle') ui.toggle(); });
    ui.setPageType(type());
    await refreshLicense(false);
    await refresh();
    scheduleInitialRender();
    setInterval(() => refreshLicense(true), 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && lic.enabled && (lic.pending || !lic.access)) refreshLicense(true); });
    setInterval(() => { if (location.href !== lastHref) { lastHref = location.href; onUrlChange(); } }, 800);

    // identitas tab ini (untuk membedakan halaman asal vs jendela scan)
    const who = await send({ type: 'spill-whoami' });
    myTabId = who && who.tabId != null ? who.tabId : null;

    // halaman asal: ikuti progres job yang berjalan di jendela scan
    let lastSeen = '';
    chrome.storage.onChanged.addListener(async (ch, area) => {
      if (area !== 'local' || !ch.job) return;
      const j = ch.job.newValue;
      if (!j || j.mode !== 'window' || myTabId == null || j.originTabId !== myTabId) return;
      if (j.active) { setBusyAll(true, `Memindai ${Math.min(j.done + 1, j.total)}/${j.total} (jendela lain)…`); ui.setStatus(`Jendela scan: ${j.done}/${j.total} halaman, ${j.found || 0} produk terbaca.`); return; }
      const key = j.startedAt + ':' + (j.finished ? 'f' : j.blocked ? 'b' : 'x');
      if (key === lastSeen) return;
      lastSeen = key;
      setBusyAll(false);
      await refresh();
      if (j.finished) { ui.setStatus(`Selesai ${j.done} halaman — ${j.found} produk terbaca.`, 'ok'); if (j.openModal) inline.openModal(); }
      else if (j.blocked) ui.setStatus(`Shopee meminta verifikasi di jendela scan. Selesaikan di sana, lalu scan lagi. (${j.found} produk terbaca)`, 'err');
      else ui.setStatus(`Scan dihentikan${j.aborted ? ' (jendela scan ditutup)' : ''}. ${j.found || 0} produk terbaca.`, 'err');
    });

    // lanjutkan job multi-halaman setelah halaman baru termuat
    let job = await S.getJob();
    if (job && job.active && job.mode === 'window') {
      for (let i = 0; i < 6 && job.active && job.runnerTabId == null; i++) { await sleep(400); job = (await S.getJob()) || job; }
      if (job.active && myTabId != null && job.runnerTabId === myTabId && Date.now() - job.startedAt < 30 * 60 * 1000) {
        await sleep(2500);
        runJobStep();
      }
    } else if (job && job.active && sessionStorage.getItem('spill_owner') === '1' && Date.now() - job.startedAt < 30 * 60 * 1000) {
      await sleep(2500);
      runJobStep();
    } else if (sessionStorage.getItem('spill_open_modal') === '1') {
      sessionStorage.removeItem('spill_open_modal');
      await sleep(1500);
      await refresh();
      inline.openModal();
    } else sessionStorage.removeItem('spill_open_modal');
  }

  init();
})();
