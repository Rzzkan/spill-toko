/* Spill Toko - parser DOM Shopee.
 * Tidak bergantung pada class CSS (Shopee mengacak nama class). Strategi: cari link produk
 * (…-i.{shopId}.{itemId}) lalu baca teks kartunya dengan regex. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SpillParser = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const getText = (el) => (el && (el.innerText != null ? el.innerText : el.textContent)) || '';

  // ---------- angka ----------
  // "1,2RB" -> 1200 | "5" "jt" -> 5.000.000 | "1.234" -> 1234
  function parseCount(num, suffix) {
    if (num == null || num === '') return null;
    const s = String(num).trim();
    const suf = (suffix || '').toLowerCase();
    if (suf === 'rb' || suf === 'k' || suf === 'jt' || suf === 'm') {
      const mult = suf === 'jt' || suf === 'm' ? 1e6 : 1e3;
      const v = parseFloat(s.replace(',', '.'));
      return isNaN(v) ? null : Math.round(v * mult);
    }
    const v = parseInt(s.replace(/[.,]/g, ''), 10);
    return isNaN(v) ? null : v;
  }

  function parseRupiah(num, suffix) {
    if (!num) return null;
    if (suffix) return parseCount(num, suffix);
    const v = parseInt(String(num).replace(/[^\d]/g, ''), 10);
    return isNaN(v) ? null : v;
  }

  function extractPrices(text) {
    const re = /Rp\s*(\d[\d.,]*)\s*(rb|jt)?\b/gi;
    const out = [];
    let m;
    while ((m = re.exec(text))) {
      const v = parseRupiah(m[1], m[2]);
      if (v != null) out.push(v);
    }
    return out;
  }

  function priceFromText(text) {
    const range = text.match(/Rp\s*(\d[\d.,]*)\s*[-–—]\s*(?:Rp\s*)?(\d[\d.,]*)/i);
    if (range) {
      const min = parseRupiah(range[1]);
      const max = parseRupiah(range[2]);
      return { price: min, priceMax: max != null && min != null && max > min ? max : null };
    }
    const all = extractPrices(text);
    if (!all.length) return { price: null, priceMax: null };
    return { price: Math.min.apply(null, all), priceMax: null };
  }

  // Angka & kata "terjual" harus satu baris (jangan menyambar angka harga di baris sebelumnya).
  const SOLD_A = /(?<![\d.,])(?<!Rp[ \t\u00a0]?)(\d[\d.,]*)[ \t\u00a0]*(rb|jt|k)?[ \t\u00a0]*(\+)?[ \t\u00a0]*terjual([ \t\u00a0]*\/[ \t\u00a0]*bulan)?/i;
  // satuan (RB/JT) boleh berada di elemen terpisah dari kata "terjual"
  const SOLD_A2 = /(?<![\d.,])(?<!Rp[ \t\u00a0]?)(\d[\d.,]*)[ \t\u00a0]*(rb|jt|k)[ \t\u00a0]*(\+)?\s*terjual(\s*\/\s*bulan)?/i;
  const SOLD_B = /terjual[ \t\u00a0]*(?:\/\s*bulan)?\s*:?\s*(\d[\d.,]*)\s*(rb|jt|k)?\s*(\+)?(\s*\/\s*bulan)?/i;

  function parseSold(text) {
    let m = text.match(SOLD_A) || text.match(SOLD_A2);
    if (m) return { sold: parseCount(m[1], m[2]), plus: !!m[3], monthly: !!m[4] };
    m = text.match(SOLD_B);
    if (m) return { sold: parseCount(m[1], m[2]), plus: !!m[3], monthly: /bulan/i.test(m[0]) };
    return { sold: null, plus: false, monthly: false };
  }

  // ---------- URL ----------
  function idsFromHref(h) {
    if (!h) return null;
    let m = h.match(/-i\.(\d+)\.(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };
    m = h.match(/\/product\/(\d+)\/(\d+)/);
    if (m) return { shopId: m[1], itemId: m[2] };
    return null;
  }

  const RESERVED = new Set(['', 'search', 'cart', 'user', 'buyer', 'verify', 'mall', 'flash_sale', 'daily_discover',
    'm', 'shopee-pay', 'legal', 'docs', 'oauth', 'welcome', 'cb', 'shop', 'product', 'live', 'video']);

  function pageType(loc) {
    const p = loc.pathname || '/';
    if (/-i\.\d+\.\d+/.test(p) || /^\/product\/\d+\/\d+/.test(p)) return 'product';
    if (p.startsWith('/search')) return 'search';
    if (/-cat\.\d+/.test(p) || /^\/mall\/.+/.test(p)) return 'category';
    if (/^\/shop\/\d+/.test(p)) return 'shop';
    const first = p.split('/').filter(Boolean)[0] || '';
    if (/^\/[A-Za-z0-9_.\-]+\/?$/.test(p) && !RESERVED.has(first.toLowerCase())) return 'shop';
    if (p === '/' ) return 'home';
    return 'other';
  }

  function nextPageUrl(href) {
    const u = new URL(href);
    const page = parseInt(u.searchParams.get('page') || '0', 10) || 0;
    u.searchParams.set('page', String(page + 1));
    return u.toString();
  }

  function isBlockedPage(loc) {
    return /\/verify\/|\/buyer\/login|\/captcha/i.test(loc.pathname || '');
  }

  // ---------- kartu produk (hasil pencarian / halaman toko / kategori) ----------
  function midPrice(lo, hi) { return hi != null && lo != null ? (lo + hi) / 2 : lo; }

  function keyOf(ids) { return ids.shopId + '.' + ids.itemId; }

  function findCards(rootEl) {
    const doc = rootEl.ownerDocument || rootEl;
    const scope = rootEl.querySelectorAll ? rootEl : doc;
    const anchors = Array.prototype.slice.call(scope.querySelectorAll('a[href]'));
    const map = new Map();
    anchors.forEach(function (a) {
      const ids = idsFromHref(a.getAttribute('href'));
      if (!ids) return;
      const k = keyOf(ids);
      if (!map.has(k)) map.set(k, { ids: ids, first: a });
    });
    const result = [];
    map.forEach(function (entry, k) {
      let el = entry.first;
      for (let depth = 0; depth < 6; depth++) {
        const p = el.parentElement;
        if (!p || p === doc.body || p === doc.documentElement) break;
        const others = Array.prototype.some.call(p.querySelectorAll('a[href]'), function (x) {
          const i = idsFromHref(x.getAttribute('href'));
          return i && keyOf(i) !== k;
        });
        if (others) break;
        if ((p.textContent || '').length > 900) break;
        el = p;
      }
      result.push({ ids: entry.ids, card: el, href: entry.first.getAttribute('href') });
    });
    return result;
  }

  // Shopee sering memisahkan "Rp" dan angkanya ke elemen berbeda -> innerText memberi baris "Rp" lalu "150.000".
  function mergeRp(lines) {
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/^Rp\.?$/i.test(l) && i + 1 < lines.length && /^\d/.test(lines[i + 1])) { out.push('Rp' + lines[i + 1]); i++; continue; }
      out.push(l);
    }
    // rentang harga: "Rp120.000" / "-" / "Rp180.000" -> satu baris
    for (let i = 1; i + 1 < out.length; i++) {
      if (/^[-–—]$/.test(out[i]) && /^Rp/i.test(out[i - 1]) && /^(Rp)?\d/i.test(out[i + 1])) { out.splice(i - 1, 3, out[i - 1] + ' - ' + out[i + 1]); i--; }
    }
    return out;
  }

  function textNodes(el) {
    const out = [];
    const doc = el.ownerDocument;
    const w = doc.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    let n;
    while ((n = w.nextNode())) { const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim(); if (t) out.push(t); }
    return out;
  }

  const LOC_BLOCK = /^(STAR|MALL|COD|XTRA|CHOICE|OFF|DISKON|TERJUAL)|ONGKIR|PROMO|TERLARIS|REKOMENDASI|IKLAN|CASHBACK|VOUCHER/;
  const NOT_NAME = /^(rp\s*\d|star\+?$|mall$|cod$|iklan$|ad$|xtra$|gratis ongkir|cashback|voucher|terlaris|pilihan|termurah|bayar di tempat)/i;

  function parseCard(card, ids) {
    const text = getText(card);
    const lines = mergeRp(text.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean));

    const priceLines = lines.filter(function (l) {
      return /Rp/i.test(l) && !/diskon|cashback|voucher|ongkir|hemat|koin|\boff\b/i.test(l);
    });
    let pr = priceFromText(priceLines.join('\n'));
    if (pr.price == null) {
      // cadangan: baca per node teks (tahan terhadap "Rp" & angka di elemen/ node terpisah, atau di dalam elemen tersembunyi dari innerText)
      const nodes = textNodes(card);
      const alt = priceFromText(mergeRp(nodes).filter(function (l) { return /Rp/i.test(l) && !/diskon|cashback|voucher|ongkir|hemat|koin|\boff\b/i.test(l); }).join('\n'));
      if (alt.price != null) pr = alt;
    }
    const sd = parseSold(lines.join('\n'));

    const ratingLine = lines.find(function (l) { return /^[0-5][.,]\d{1,2}$/.test(l); });
    const rating = ratingLine ? parseFloat(ratingLine.replace(',', '.')) : null;
    const discLine = lines.find(function (l) { return /^-?\d{1,2}%(\s*off)?$/i.test(l); });
    const discount = discLine ? parseInt(discLine.replace(/[^\d]/g, ''), 10) : null;

    let location = lines.find(function (l) {
      return l.length >= 4 && l.length <= 40 && !/\d/.test(l) && l === l.toUpperCase() &&
        /[A-Z]{3}/.test(l) && !LOC_BLOCK.test(l);
    });
    if (!location) location = lines.find(function (l) { return /^(Kota|Kab\.?|Kabupaten|DKI|Jakarta|Luar Negeri)\b/i.test(l) && l.length < 40; });

    const nameCands = lines.filter(function (l) {
      return !NOT_NAME.test(l) && !/terjual/i.test(l) && l !== ratingLine && l !== discLine && l !== location && l.length > 3;
    });
    let name = nameCands.sort(function (a, b) { return b.length - a.length; })[0] || '';
    if (name.length < 10) {
      const imgAlt = Array.prototype.map.call(card.querySelectorAll('img[alt]'), function (i) { return (i.getAttribute('alt') || '').trim(); })
        .find(function (a) { return a.length > 5 && !/^(flag|star|mall|icon|logo)/i.test(a); });
      if (imgAlt) name = imgAlt;
    }

    let image = '';
    const imgs = Array.prototype.slice.call(card.querySelectorAll('img'));
    for (let i = 0; i < imgs.length; i++) {
      const src = imgs[i].currentSrc || imgs[i].getAttribute('src') || '';
      if (src && !/^data:|\.svg(\?|$)/i.test(src) && /^https?:/.test(src)) { image = src; break; }
    }

    const badges = [];
    if (/\bMall\b/i.test(text)) badges.push('Mall');
    if (/\bStar\+?\b/i.test(text)) badges.push('Star');
    if (/\bCOD\b/.test(text)) badges.push('COD');
    if (/gratis ongkir/i.test(text)) badges.push('Gratis Ongkir');

    return {
      key: keyOf(ids), shopId: ids.shopId, itemId: ids.itemId,
      url: 'https://shopee.co.id/product/' + ids.shopId + '/' + ids.itemId,
      name: name, image: image,
      price: pr.price, priceMax: pr.priceMax,
      sold: sd.sold, soldMonthly: sd.monthly, soldPlus: sd.plus,
      omzet: pr.price != null && sd.sold != null ? midPrice(pr.price, pr.priceMax) * sd.sold : null,
      rating: rating, location: location || '', discount: discount, badges: badges
    };
  }

  function parseAll(rootEl) {
    return findCards(rootEl || document).map(function (c) { return parseCard(c.card, c.ids); })
      .filter(function (r) { return r.name || r.price != null; });
  }

  // ---------- halaman detail produk ----------
  function readLd(doc) {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (let i = 0; i < scripts.length; i++) {
      try {
        const j = JSON.parse(scripts[i].textContent);
        const arr = Array.isArray(j) ? j : (j['@graph'] || [j]);
        const p = arr.find(function (x) { return x && /Product/i.test([].concat(x['@type'] || []).join(',')); });
        if (p) return p;
      } catch (e) { /* abaikan */ }
    }
    return null;
  }

  function leaves(doc) {
    return Array.prototype.filter.call(doc.querySelectorAll('div,span,p,h1,h2,h3,label,button,a,li'), function (el) {
      return el.children.length === 0 && getText(el).trim();
    });
  }

  const GROUP_LABELS = /^(variasi|varian|warna|ukuran|size|pilihan|model|tipe|motif)\s*:?$/i;

  function parseProductPage(doc, href) {
    const ids = idsFromHref(href) || idsFromHref(doc.location ? doc.location.href : '') || {};
    const raw = getText(doc.body);
    const flat = raw.replace(/\s+/g, ' ');
    const ld = readLd(doc);
    const lf = leaves(doc);

    // nama
    let name = '';
    const h1 = doc.querySelector('h1');
    if (h1) name = getText(h1).trim();
    if (!name && ld && ld.name) name = String(ld.name);
    if (!name) name = (doc.title || '').replace(/\s*\|\s*Shopee.*$/i, '').trim();

    // harga
    let price = null, priceMax = null;
    if (ld && ld.offers) {
      const o = Array.isArray(ld.offers) ? ld.offers[0] : ld.offers;
      const lo = parseFloat(o.lowPrice != null ? o.lowPrice : o.price);
      const hi = parseFloat(o.highPrice);
      if (!isNaN(lo)) price = Math.round(lo);
      if (!isNaN(hi) && hi > lo) priceMax = Math.round(hi);
    }
    if (price == null) {
      const PRICE_LEAF = /^Rp\s?\d[\d.,]*(\s*[-–]\s*(Rp\s?)?\d[\d.,]*)?$/i;
      const first = lf.find(function (el) { return PRICE_LEAF.test(getText(el).trim()); });
      if (first) {
        // harga coret + harga aktif biasanya bersaudara di blok kecil yang sama
        let box = first.parentElement;
        for (let up = 0; up < 3 && box && box.parentElement && getText(box.parentElement).length < 120; up++) box = box.parentElement;
        const group = lf.filter(function (el) { return box && box.contains(el) && PRICE_LEAF.test(getText(el).trim()); });
        const parsed = (group.length ? group : [first]).map(function (el) { return priceFromText(getText(el).trim()); });
        const best = parsed.reduce(function (a, b) { return b.price != null && (a.price == null || b.price < a.price) ? b : a; }, parsed[0]);
        price = best.price; priceMax = best.priceMax;
      } else {
        // "Rp" dan angka di elemen terpisah -> cari dari teks halaman bagian atas
        const fb = priceFromText(flat.slice(0, 6000));
        price = fb.price; priceMax = fb.priceMax;
      }
    }

    // terjual
    const sd = parseSold(flat);

    // rating & jumlah penilaian
    let rating = null, ratingCount = null;
    const rm = flat.match(/(\d[.,]\d)\s+(\d[\d.,]*)\s*(rb|jt)?\s*Penilaian/i);
    if (rm) { rating = parseFloat(rm[1].replace(',', '.')); ratingCount = parseCount(rm[2], rm[3]); }
    else if (ld && ld.aggregateRating) {
      rating = parseFloat(ld.aggregateRating.ratingValue) || null;
      ratingCount = parseInt(ld.aggregateRating.ratingCount || ld.aggregateRating.reviewCount, 10) || null;
    }

    // stok
    let stock = null;
    const sm = flat.match(/(?:Stok|Tersisa)\s*:?\s*(\d[\d.]*)/i) || flat.match(/(\d[\d.]*)\s+(?:buah\s+)?(?:tersisa|tersedia)/i);
    if (sm) stock = parseCount(sm[1]);
    let favorit = null;
    const fm = flat.match(/Favorit\s*\(\s*(\d[\d.,]*)\s*(rb|jt)?\s*\)/i);
    if (fm) favorit = parseCount(fm[1], fm[2]);

    // distribusi bintang (muncul setelah bagian ulasan termuat)
    const stars = { 1: null, 2: null, 3: null, 4: null, 5: null };
    const sre = /(?:Bintang\s*(\d)|(\d)\s*Bintang)\s*\(\s*(\d[\d.,]*)\s*(rb|jt)?\s*\)/gi;
    let sm2, foundStars = 0;
    while ((sm2 = sre.exec(flat))) {
      const n = parseInt(sm2[1] || sm2[2], 10);
      if (n >= 1 && n <= 5 && stars[n] == null) { stars[n] = parseCount(sm2[3], sm2[4]); foundStars++; }
    }
    let complaintPct = null;
    if (foundStars >= 3) {
      const total = [1, 2, 3, 4, 5].reduce(function (s, n) { return s + (stars[n] || 0); }, 0);
      if (total > 0) complaintPct = Math.round((((stars[1] || 0) + (stars[2] || 0)) / total) * 1000) / 10;
    }

    // varian (hanya nama pilihan; Shopee tidak menampilkan penjualan per varian di halaman)
    const variants = [];
    lf.forEach(function (el) {
      const t = getText(el).trim();
      if (!GROUP_LABELS.test(t)) return;
      let c = el.parentElement;
      for (let up = 0; up < 3 && c; up++, c = c.parentElement) {
        const opts = Array.prototype.map.call(c.querySelectorAll('button,[role="button"]'), function (b) { return getText(b).trim(); })
          .filter(function (x) { return x && x.length < 60; });
        if (opts.length) {
          const name2 = t.replace(/:$/, '');
          if (!variants.some(function (v) { return v.name === name2; })) {
            variants.push({ name: name2, options: Array.from(new Set(opts)) });
          }
          break;
        }
      }
    });

    // toko
    let shopName = '', shopUrl = '';
    const visit = lf.find(function (el) { return /^(Kunjungi Toko|Lihat Toko)$/i.test(getText(el).trim()); });
    if (visit) {
      const a = visit.closest('a');
      if (a) shopUrl = a.href || a.getAttribute('href') || '';
      let c = visit.parentElement;
      for (let up = 0; up < 4 && c && !shopName; up++, c = c.parentElement) {
        const first = getText(c).split(/\n+/).map(function (s) { return s.trim(); })
          .find(function (s) { return s && !/^(chat sekarang|kunjungi toko|lihat toko|online|aktif|\d)/i.test(s) && s.length < 60; });
        if (first) shopName = first;
      }
    }

    return {
      key: ids.shopId ? keyOf(ids) : '', shopId: ids.shopId || '', itemId: ids.itemId || '',
      url: ids.shopId ? 'https://shopee.co.id/product/' + ids.shopId + '/' + ids.itemId : href,
      name: name, price: price, priceMax: priceMax,
      sold: sd.sold, soldMonthly: sd.monthly, soldPlus: sd.plus,
      omzet: price != null && sd.sold != null ? midPrice(price, priceMax) * sd.sold : null,
      rating: rating, ratingCount: ratingCount, stock: stock, favorit: favorit,
      stars: foundStars ? stars : null, complaintPct: complaintPct,
      variants: variants, shopName: shopName, shopUrl: shopUrl,
      image: (function () {
        const og = doc.querySelector('meta[property="og:image"]');
        return og ? og.getAttribute('content') : (ld && ld.image ? [].concat(ld.image)[0] : '');
      })()
    };
  }

  // ---------- halaman toko ----------
  function parseShopInfo(doc) {
    const flat = getText(doc.body).replace(/\s+/g, ' ');
    const h1 = doc.querySelector('h1');
    let name = h1 ? getText(h1).trim() : '';
    if (!name) name = (doc.title || '').replace(/\s*\|\s*Shopee.*$/i, '').replace(/^Jual\s+/i, '').trim();
    const g = function (re, f) { const m = flat.match(re); return m ? f(m) : null; };
    const joined = g(/Bergabung\s*:?\s*(\d+\s*(?:Tahun|Bulan|Minggu|Hari|Jam)\s*Lalu)/i, function (m) { return m[1]; });
    let joinedMonths = null;
    if (joined) {
      const n = parseInt(joined, 10);
      joinedMonths = /tahun/i.test(joined) ? n * 12 : /bulan/i.test(joined) ? n : /minggu/i.test(joined) ? n / 4.3 : n / 30;
    }
    return {
      name: name,
      products: g(/Produk\s*:?\s*(\d[\d.,]*)/i, function (m) { return parseCount(m[1]); }),
      followers: g(/Pengikut\s*:?\s*(\d[\d.,]*)\s*(rb|jt)?/i, function (m) { return parseCount(m[1], m[2]); }),
      followersText: g(/Pengikut\s*:?\s*(\d[\d.,]*\s*(?:rb|jt)?)/i, function (m) { return m[1].trim(); }),
      rating: g(/(?:Penilaian|Rating)\s*:?\s*(\d[.,]\d)/i, function (m) { return parseFloat(m[1].replace(',', '.')); }),
      ratingCountText: g(/(?:Penilaian|Rating)\s*:?\s*\d[.,]\d\s*\(\s*(\d[\d.,]*\s*(?:rb|jt)?)\s*Penilaian/i, function (m) { return m[1].trim(); }),
      chatPerf: g(/Performa Chat\s*:?\s*(\d+)\s*%/i, function (m) { return parseInt(m[1], 10); }),
      chatText: g(/Performa Chat\s*:?\s*(\d+\s*%(?:\s*\([^)]*\))?)/i, function (m) { return m[1]; }),
      joined: joined, joinedMonths: joinedMonths
    };
  }

  function shopSummary(items) {
    const withOmzet = items.filter(function (i) { return i.omzet != null; });
    const totalOmzet = withOmzet.reduce(function (s, i) { return s + i.omzet; }, 0);
    const totalSold = items.reduce(function (s, i) { return s + (i.sold || 0); }, 0);
    const top = withOmzet.slice().sort(function (a, b) { return b.omzet - a.omzet; }).slice(0, 5)
      .map(function (i) { return { key: i.key, name: i.name, omzet: i.omzet, share: totalOmzet ? i.omzet / totalOmzet : 0 }; });
    return { count: items.length, totalOmzet: totalOmzet, totalSold: totalSold, top: top };
  }

  // Diagnosa untuk developer: struktur HTML 3 kartu pertama + hasil parse (tanpa data pribadi).
  // Ulasan yang tampil di halaman produk: tanggal ("2026-04-19 08:42") + total penilaian (jumlah per bintang).
  function parseReviews(doc) {
    const text = getText(doc.body);
    const seen = {}, out = [];
    const re = /([^\n]{2,40})\n\s*(20\d\d)-(\d\d)-(\d\d)(?:\s+(\d\d):(\d\d))?/g;
    let m;
    while ((m = re.exec(text))) {
      const t = new Date(+m[2], +m[3] - 1, +m[4], +(m[5] || 12), +(m[6] || 0)).getTime();
      const id = m[1].trim() + '|' + t;
      if (!seen[id] && !isNaN(t)) { seen[id] = 1; out.push(t); }
    }
    let total = 0;
    const sm = text.match(/Semua\s*((?:\d\s*Bintang\s*\(\s*[\d.,]+\s*\)\s*){1,5})/i);
    if (sm) sm[1].replace(/\(\s*([\d.,]+)\s*\)/g, function (x, n) { total += parseInt(String(n).replace(/[.,]/g, ''), 10) || 0; return x; });
    return { dates: out, total: total };
  }

  // Estimasi penjualan 30 hari dari sebaran tanggal ulasan (kasar; ulasan hanya sampel).
  function estimate30(dates, ratingTotal, soldTotal, price, priceMax, now) {
    if (!dates || dates.length < 6 || !ratingTotal || !soldTotal) return null;
    const cutoff = (now || Date.now()) - 30 * 864e5;
    const k = dates.filter(function (t) { return t >= cutoff; }).length;
    const ratio = Math.min(1, ratingTotal / soldTotal);          // porsi pembeli yang menulis penilaian
    const share = (k + 0.5) / (dates.length + 1);                  // smoothing: sampel kecil tidak langsung 0 / 100%
    const sold = Math.round(ratingTotal * share / Math.max(0.05, ratio));
    const mid = priceMax && price != null ? (price + priceMax) / 2 : price;
    return { sold: sold, omzet: mid != null ? sold * mid : null, sample: dates.length, recent: k, ratings: ratingTotal, at: now || Date.now() };
  }

  function diagnose(doc) {
    const cards = findCards(doc).slice(0, 3);
    return {
      title: doc.title, blocked: !!(doc.location && isBlockedPage(doc.location)), bodyText: ((doc.body && doc.body.innerText) || '').slice(0, 700),
      anchorTotal: doc.querySelectorAll('a[href]').length,
      productAnchors: Array.prototype.slice.call(doc.querySelectorAll('a[href*="-i."]')).slice(0, 8).map(function (a) { return a.getAttribute('href').slice(0, 90); }),
      sampleHrefs: Array.prototype.slice.call(doc.querySelectorAll('a[href]')).slice(0, 12).map(function (a) { return a.getAttribute('href').slice(0, 90); }),
      url: (doc.location && doc.location.href) || '', ua: (doc.defaultView && doc.defaultView.navigator.userAgent) || '', cardCount: findCards(doc).length,
      cards: cards.map(function (c) {
        const clone = c.card.cloneNode(true);
        clone.querySelectorAll('*').forEach(function (e) {
          Array.prototype.slice.call(e.attributes).forEach(function (a) {
            if (a.name === 'style' || a.name === 'srcset' || a.name.indexOf('data-') === 0 && a.name !== 'data-testid') e.removeAttribute(a.name);
            else if ((a.name === 'src' || a.name === 'href') && a.value.length > 70) e.setAttribute(a.name, a.value.slice(0, 70) + '…');
            else if (a.name === 'class' && a.value.length > 60) e.setAttribute('class', a.value.slice(0, 60));
          });
        });
        return {
          href: c.href, innerText: getText(c.card).slice(0, 600), textNodes: textNodes(c.card).slice(0, 40),
          parsed: parseCard(c.card, c.ids), html: clone.outerHTML.slice(0, 3500)
        };
      })
    };
  }

  return {
    parseReviews: parseReviews, estimate30: estimate30, diagnose: diagnose, parseCount: parseCount, parseRupiah: parseRupiah, parseSold: parseSold, priceFromText: priceFromText,
    idsFromHref: idsFromHref, pageType: pageType, nextPageUrl: nextPageUrl, isBlockedPage: isBlockedPage,
    findCards: findCards, parseCard: parseCard, parseAll: parseAll,
    parseProductPage: parseProductPage, parseShopInfo: parseShopInfo, shopSummary: shopSummary
  };
});
