/* Spill Toko - panel UI (Shadow DOM supaya CSS Shopee tidak bentrok). */
(function (root) {
  'use strict';

  const nf = new Intl.NumberFormat('id-ID');
  const fmtInt = (n) => (n == null ? '–' : nf.format(Math.round(n)));
  function fmtRp(n) {
    if (n == null) return '–';
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace('.', ',') + ' jt';
    return 'Rp ' + nf.format(Math.round(n));
  }
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TYPE_LABEL = { search: 'Hasil pencarian', category: 'Kategori', shop: 'Halaman toko', product: 'Detail produk', home: 'Beranda', other: 'Halaman lain' };

  const CSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
  .panel{--bg:#fff;--fg:#1c1c1e;--mut:#6b7280;--line:#e5e7eb;--card:#f8f8fa;--acc:#ee4d2d;--accfg:#fff;--ok:#16a34a;--bad:#dc2626;
    position:fixed;top:0;right:0;height:100vh;width:min(560px,100vw);background:var(--bg);color:var(--fg);
    box-shadow:-6px 0 24px rgba(0,0,0,.18);display:flex;flex-direction:column;font-size:13px;z-index:2147483647}
  @media (prefers-color-scheme:dark){.panel{--bg:#17181c;--fg:#ececf0;--mut:#9aa0ac;--line:#2b2d34;--card:#202228}}
  .panel[hidden],[hidden]{display:none!important}
  header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--acc);color:#fff}
  header b{font-size:15px}header .sub{opacity:.9;font-size:12px;flex:1}
  header button{background:transparent;border:0;color:#fff;font-size:18px;cursor:pointer}
  .body{flex:1;overflow:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px}
  section{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px}
  .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
  button{font-size:12px;padding:6px 10px;border-radius:8px;border:1px solid var(--line);background:var(--bg);color:var(--fg);cursor:pointer}
  button:hover{border-color:var(--acc)}button.pri{background:var(--acc);color:var(--accfg);border-color:var(--acc);font-weight:600}
  button.danger{color:var(--bad)}button:disabled{opacity:.5;cursor:default}
  input,select{font-size:12px;padding:5px 7px;border-radius:7px;border:1px solid var(--line);background:var(--bg);color:var(--fg);min-width:0}
  input[type=number]{width:92px}input.q{flex:1;min-width:120px}
  .opt{display:flex;align-items:center;gap:6px;font-size:12px;color:#555;margin-top:8px;cursor:pointer}
  .status{margin-top:6px;color:var(--mut);font-size:12px;min-height:16px}.status.err{color:var(--bad)}.status.ok{color:var(--ok)}
  .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
  .stat{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px}
  .stat small{display:block;color:var(--mut);font-size:10px}.stat b{font-size:13px}
  .bars{display:flex;gap:4px;align-items:flex-end;height:54px;margin-top:6px}
  .bar{flex:1;background:var(--acc);opacity:.85;border-radius:3px 3px 0 0;position:relative;min-height:2px}
  .bar span{position:absolute;bottom:-14px;left:0;right:0;text-align:center;font-size:9px;color:var(--mut);white-space:nowrap}
  .barcap{font-size:10px;color:var(--mut);margin:0 0 16px}
  .tabs{display:flex;gap:4px}.tabs button{flex:1}.tabs button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
  .wrap{overflow:auto;border:1px solid var(--line);border-radius:8px;max-height:46vh;background:var(--bg)}
  table{border-collapse:collapse;width:100%;font-size:12px}
  th,td{padding:5px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
  th{position:sticky;top:0;background:var(--card);cursor:pointer;white-space:nowrap;user-select:none;z-index:1}
  td.n,th.n{text-align:right;white-space:nowrap}
  td img{width:36px;height:36px;object-fit:cover;border-radius:5px;display:block}
  td a{color:var(--fg);text-decoration:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  td a:hover{color:var(--acc)}.meta{color:var(--mut);font-size:10px}
  .up{color:var(--ok);font-weight:600}.empty{padding:18px;text-align:center;color:var(--mut)}
  .kv{display:grid;grid-template-columns:110px 1fr;gap:3px 8px;font-size:12px}.kv span:nth-child(odd){color:var(--mut)}
  .chip{display:inline-block;background:var(--bg);border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin:2px 3px 0 0;font-size:11px}
  .top{margin:4px 0 0;padding-left:16px}.top li{margin:2px 0}
  .lic{display:flex;align-items:center;gap:8px;padding:7px 12px;background:var(--card);border-bottom:1px solid var(--line);font-size:12px}
  .lic span{flex:1}.lic .em{color:var(--mut)}
  .panel.locked .body,.panel.locked footer{display:none}
  .ver{margin-left:6px;font-size:10px;font-weight:600;color:var(--mut);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:1px 6px}
  .lockmsg{padding:28px 18px;text-align:center;color:var(--mut);font-size:13px;line-height:1.5}
  .lockmsg b{display:block;color:var(--fg);font-size:15px;margin-bottom:6px}
  footer{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px;border-top:1px solid var(--line)}
  footer .sp{flex:1;color:var(--mut);font-size:11px}
  h4{margin:0 0 6px;font-size:12px}
  .fab{position:fixed;right:0;top:45%;background:var(--acc,#ee4d2d);color:#fff;border:0;border-radius:10px 0 0 10px;
    padding:10px 8px;writing-mode:vertical-rl;font-weight:700;font-size:12px;cursor:pointer;box-shadow:-2px 2px 10px rgba(0,0,0,.25);z-index:2147483646}
  .fab[hidden]{display:none}
  `;

  const HTML = `
  <button class="fab" id="fab" title="Buka Spill Toko">🔍 SPILL TOKO</button>
  <aside class="panel" id="panel" hidden>
    <header><b>Spill Toko</b><small class="ver" id="pver"></small><span class="sub" id="ptype"></span><button id="close" title="Tutup">✕</button></header>
    <div class="lic" id="lic" hidden></div>
    <div class="lockmsg" id="lockmsg" hidden><b>Fitur terkunci</b>Masuk dengan akun Google dan aktifkan trial atau langganan untuk memakai Spill Toko.</div>
    <div class="body">
      <section>
        <div class="row">
          <button class="pri" id="btnScan">Scan halaman ini</button>
          <span>atau</span>
          <input type="number" id="pages" min="1" max="20" value="3" title="Jumlah halaman">
          <button id="btnMulti">Scan multi-halaman</button>
          <button id="btnStop" class="danger" hidden>Stop</button>
        </div>
        <label class="opt" title="Scan berjalan di tab latar belakang yang menutup sendiri; halaman yang sedang Anda lihat tidak ikut berpindah atau bergulir."><input type="checkbox" id="bgMode" checked> Scan di tab latar belakang</label>
        <div class="status" id="status">Buka halaman pencarian, kategori, atau toko Shopee, lalu klik Scan.</div>
      </section>
      <section id="detail" hidden></section>
      <section id="shopcard" hidden></section>
      <section>
        <div class="stats" id="stats"></div>
        <div id="chart"></div>
      </section>
      <section>
        <div class="tabs"><button id="tabP" class="on">Produk</button><button id="tabS">Toko</button></div>
        <div class="row" style="margin-top:8px">
          <input class="q" id="fq" placeholder="Cari nama / lokasi…">
          <select id="scope"><option value="all">Semua koleksi</option><option value="page">Halaman ini saja</option></select>
        </div>
        <div class="row" style="margin-top:6px">
          <input type="number" id="fSold" placeholder="Min terjual">
          <input type="number" id="fPmin" placeholder="Harga min">
          <input type="number" id="fPmax" placeholder="Harga maks">
          <input type="number" id="fOm" placeholder="Min omzet">
        </div>
      </section>
      <div class="wrap"><table><thead id="thead"></thead><tbody id="tbody"></tbody></table></div>
    </div>
    <footer>
      <button class="pri" id="btnCsv">Export CSV</button>
      <button id="btnCopy">Salin (Sheets)</button>
      <button id="btnClear" class="danger">Hapus koleksi</button>
      <button id="btnDiag" title="Salin struktur halaman untuk developer (membantu memperbaiki pembacaan data)">Salin diagnosa</button>
      <span class="sp" id="count"></span>
    </footer>
  </aside>`;

  function mount(h) {
    const host = document.createElement('div');
    host.id = 'spill-toko-host';
    host.style.cssText = 'position:fixed;top:0;right:0;width:0;height:0;z-index:2147483647;';
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = '<style>' + CSS + '</style>' + HTML;
    document.documentElement.appendChild(host);
    const $ = (id) => sr.getElementById(id);

    const state = {
      items: [], pageKeys: new Set(), tab: 'produk', scope: 'all', sort: { key: 'omzet', dir: -1 },
      f: { q: '', minSold: null, minP: null, maxP: null, minOm: null }, detail: null, shop: null, pageType: 'other'
    };

    const num = (el) => (el.value === '' ? null : Number(el.value));

    function visible() {
      let arr = state.items;
      if (state.scope === 'page') arr = arr.filter((i) => state.pageKeys.has(i.key));
      const f = state.f, q = f.q.trim().toLowerCase();
      arr = arr.filter((i) =>
        (!q || (i.name || '').toLowerCase().includes(q) || (i.location || '').toLowerCase().includes(q)) &&
        (f.minSold == null || (i.sold || 0) >= f.minSold) &&
        (f.minP == null || (i.price != null && i.price >= f.minP)) &&
        (f.maxP == null || (i.price != null && i.price <= f.maxP)) &&
        (f.minOm == null || (i.omzet || 0) >= f.minOm));
      const { key, dir } = state.sort;
      const val = (i) => (key === 'delta' ? (i._d ? i._d.d : null) : i[key]);
      return arr.slice().sort((a, b) => {
        const va = val(a), vb = val(b);
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return typeof va === 'string' ? va.localeCompare(vb) * dir : (va - vb) * dir;
      });
    }

    function renderStats(arr) {
      const prices = arr.map((i) => i.price).filter((x) => x != null).sort((a, b) => a - b);
      const med = prices.length ? prices[Math.floor(prices.length / 2)] : null;
      const avg = prices.length ? prices.reduce((s, x) => s + x, 0) / prices.length : null;
      const sold = arr.reduce((s, i) => s + (i.sold || 0), 0);
      const om = arr.reduce((s, i) => s + (i.omzet || 0), 0);
      $('stats').innerHTML = [['Produk', fmtInt(arr.length)], ['Total terjual', fmtInt(sold)], ['Est. omzet', fmtRp(om)],
        ['Harga median', fmtRp(med)], ['Harga rata-rata', fmtRp(avg)]]
        .slice(0, 4).map(([k, v]) => `<div class="stat"><small>${k}</small><b>${v}</b></div>`).join('');

      // omzet per rentang harga (5 kelompok berisi jumlah produk sama)
      const withP = arr.filter((i) => i.price != null && i.omzet != null).sort((a, b) => a.price - b.price);
      if (withP.length < 10) { $('chart').innerHTML = ''; return; }
      const nb = 5, size = Math.ceil(withP.length / nb), buckets = [];
      for (let b = 0; b < nb; b++) {
        const part = withP.slice(b * size, (b + 1) * size);
        if (!part.length) continue;
        buckets.push({ lo: part[0].price, hi: part[part.length - 1].price, om: part.reduce((s, i) => s + i.omzet, 0) });
      }
      const mx = Math.max.apply(null, buckets.map((b) => b.om)) || 1;
      $('chart').innerHTML = '<div class="barcap" style="margin-top:8px">Est. omzet per rentang harga</div><div class="bars">' +
        buckets.map((b) => `<div class="bar" style="height:${Math.max(4, (b.om / mx) * 100)}%" title="${fmtRp(b.om)}"><span>${fmtRp(b.lo).replace('Rp ', '')}–${fmtRp(b.hi).replace('Rp ', '')}</span></div>`).join('') + '</div><div style="height:14px"></div>';
    }

    function header(cols) {
      return '<tr>' + cols.map((c) => `<th ${c.key ? `data-k="${c.key}"` : ''} class="${c.n ? 'n' : ''}">${c.t}${state.sort.key === c.key ? (state.sort.dir < 0 ? ' ▼' : ' ▲') : ''}</th>`).join('') + '</tr>';
    }

    function renderProducts(arr) {
      $('thead').innerHTML = header([{ t: '#' }, { t: '' }, { t: 'Produk', key: 'name' }, { t: 'Harga', key: 'price', n: 1 },
        { t: 'Terjual', key: 'sold', n: 1 }, { t: 'Est. omzet', key: 'omzet', n: 1 }, { t: '★', key: 'rating', n: 1 }, { t: 'Δ', key: 'delta', n: 1 }]);
      if (!arr.length) { $('tbody').innerHTML = '<tr><td colspan="8" class="empty">Belum ada data. Klik “Scan halaman ini”.</td></tr>'; return; }
      $('tbody').innerHTML = arr.slice(0, 300).map((i, idx) => {
        const d = i._d;
        const dTxt = d ? `<span class="${d.d > 0 ? 'up' : ''}" title="selama ${d.days.toFixed(1)} hari">${d.d > 0 ? '+' : ''}${fmtInt(d.d)}</span>` : '–';
        const price = i.price == null ? '–' : fmtRp(i.price) + (i.priceMax ? '<div class="meta">s/d ' + fmtRp(i.priceMax) + '</div>' : '');
        return `<tr><td>${idx + 1}</td><td>${i.image ? `<img loading="lazy" src="${esc(i.image)}">` : ''}</td>
          <td><a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a><div class="meta">${esc(i.location)}${i.badges && i.badges.length ? ' • ' + esc(i.badges.join(', ')) : ''}${i.discount ? ' • -' + i.discount + '%' : ''}</div></td>
          <td class="n">${price}</td>
          <td class="n">${fmtInt(i.sold)}${i.soldPlus ? '+' : ''}${i.soldMonthly ? '<div class="meta">/bulan</div>' : ''}</td>
          <td class="n"><b>${fmtRp(i.omzet)}</b></td><td class="n">${i.rating != null ? i.rating.toFixed(1) : '–'}</td><td class="n">${dTxt}</td></tr>`;
      }).join('');
    }

    function renderShops(arr) {
      $('thead').innerHTML = header([{ t: '#' }, { t: 'Toko (ID)' }, { t: 'Produk', n: 1 }, { t: 'Terjual', n: 1 }, { t: 'Est. omzet', n: 1 }, { t: 'Porsi', n: 1 }]);
      const g = new Map();
      arr.forEach((i) => {
        const s = g.get(i.shopId) || { shopId: i.shopId, n: 0, sold: 0, om: 0 };
        s.n++; s.sold += i.sold || 0; s.om += i.omzet || 0; g.set(i.shopId, s);
      });
      const rows = Array.from(g.values()).sort((a, b) => b.om - a.om);
      const tot = rows.reduce((s, r) => s + r.om, 0) || 1;
      $('tbody').innerHTML = rows.length ? rows.slice(0, 300).map((r, idx) =>
        `<tr><td>${idx + 1}</td><td><a href="https://shopee.co.id/shop/${esc(r.shopId)}" target="_blank" rel="noopener">Toko ${esc(r.shopId)}</a></td>
        <td class="n">${fmtInt(r.n)}</td><td class="n">${fmtInt(r.sold)}</td><td class="n"><b>${fmtRp(r.om)}</b></td><td class="n">${Math.round((r.om / tot) * 100)}%</td></tr>`).join('')
        : '<tr><td colspan="6" class="empty">Belum ada data.</td></tr>';
    }

    function renderDetail() {
      const d = state.detail, el = $('detail');
      if (state.pageType !== 'product') { el.hidden = true; return; }
      el.hidden = false;
      let h = '<h4>Detail produk</h4>';
      if (!d) h += '<div class="meta">Membaca halaman…</div>';
      else {
        const st = d.stars ? [5, 4, 3, 2, 1].map((n) => `${n}★ ${fmtInt(d.stars[n])}`).join(' · ') : 'belum termuat (klik Analisa)';
        h += `<div class="kv">
          <span>Nama</span><span>${esc(d.name)}</span>
          <span>Harga</span><span>${fmtRp(d.price)}${d.priceMax ? ' – ' + fmtRp(d.priceMax) : ''}</span>
          <span>Terjual</span><span>${fmtInt(d.sold)}${d.soldPlus ? '+' : ''}${d.soldMonthly ? ' /bulan' : ' (total)'}</span>
          <span>Est. omzet</span><span><b>${fmtRp(d.omzet)}</b></span>
          <span>Rating</span><span>${d.rating != null ? d.rating.toFixed(1) : '–'} (${fmtInt(d.ratingCount)} penilaian)</span>
          <span>Stok</span><span>${fmtInt(d.stock)}</span>
          <span>Distribusi bintang</span><span>${st}</span>
          <span>Komplain (★1–2)</span><span>${d.complaintPct != null ? d.complaintPct + '%' : '–'}</span>
          <span>Toko</span><span>${d.shopUrl ? `<a href="${esc(d.shopUrl)}" target="_blank" style="color:inherit">${esc(d.shopName || 'Lihat toko')}</a>` : esc(d.shopName || '–')}</span>
        </div>`;
        if (d.variants && d.variants.length) {
          h += d.variants.map((v) => `<div style="margin-top:6px"><span class="meta">${esc(v.name)}</span><br>${v.options.map((o) => `<span class="chip">${esc(o)}</span>`).join('')}</div>`).join('');
        }
      }
      h += '<div class="row" style="margin-top:8px"><button class="pri" id="btnAnalyze">Analisa detail (scroll &amp; baca ulasan)</button><button id="btnSaveDetail">Simpan ke koleksi</button></div>';
      el.innerHTML = h;
      el.querySelector('#btnAnalyze').onclick = () => h2.onAnalyze();
      el.querySelector('#btnSaveDetail').onclick = () => h2.onSaveDetail();
    }

    function renderShopCard() {
      const el = $('shopcard');
      if (state.pageType !== 'shop' || !state.shop) { el.hidden = true; return; }
      el.hidden = false;
      const { info, summary } = state.shop;
      let h = `<h4>Riset toko: ${esc(info.name || '')}</h4><div class="kv">
        <span>Produk (di toko)</span><span>${fmtInt(info.products)}</span>
        <span>Pengikut</span><span>${fmtInt(info.followers)}</span>
        <span>Rating toko</span><span>${info.rating != null ? info.rating.toFixed(1) : '–'}</span>
        <span>Performa chat</span><span>${info.chatPerf != null ? info.chatPerf + '%' : '–'}</span>
        <span>Bergabung</span><span>${esc(info.joined || '–')}</span>
        <span>Produk ter-scan</span><span>${fmtInt(summary.count)}</span>
        <span>Total terjual</span><span>${fmtInt(summary.totalSold)}</span>
        <span>Est. omzet (ter-scan)</span><span><b>${fmtRp(summary.totalOmzet)}</b></span></div>`;
      if (summary.top.length) {
        h += '<h4 style="margin-top:8px">Produk andalan</h4><ol class="top">' +
          summary.top.map((t) => `<li>${esc((t.name || '').slice(0, 60))} — <b>${fmtRp(t.omzet)}</b> (${Math.round(t.share * 100)}%)</li>`).join('') + '</ol>';
      }
      el.innerHTML = h;
    }

    function render() {
      const arr = visible();
      renderStats(arr);
      if (state.tab === 'produk') renderProducts(arr); else renderShops(arr);
      $('count').textContent = `${fmtInt(arr.length)} ditampilkan • ${fmtInt(state.items.length)} tersimpan`;
      $('tabP').classList.toggle('on', state.tab === 'produk');
      $('tabS').classList.toggle('on', state.tab === 'toko');
      $('ptype').textContent = TYPE_LABEL[state.pageType] || '';
      renderDetail();
      renderShopCard();
    }

    // ---- events ----
    const h2 = h;
    try { const mf = chrome.runtime.getManifest(); $('pver').textContent = 'v' + mf.version; $('pver').title = mf.version_name || mf.version; } catch (_) { /* tanpa manifest */ }
    $('lic').onclick = (e) => { const b = e.target.closest('[data-l]'); if (b) h.onLicense(b.dataset.l); };
    $('fab').onclick = () => api.toggle(true);
    $('close').onclick = () => api.toggle(false);
    $('btnScan').onclick = () => h.onScan();
    $('btnMulti').onclick = () => h.onMulti(Math.max(1, Math.min(20, Number($('pages').value) || 1)));
    $('btnStop').onclick = () => h.onStop();
    try {
      chrome.storage.local.get('scan_window').then((o) => { $('bgMode').checked = o.scan_window !== false; });
      $('bgMode').onchange = (e) => { chrome.storage.local.set({ scan_window: !!e.target.checked }); };
    } catch (_) { /* tanpa storage */ }
    $('btnCsv').onclick = () => h.onExport(visible());
    $('btnCopy').onclick = () => h.onCopy(visible());
    $('btnDiag').onclick = () => h.onDiag && h.onDiag();
    $('btnClear').onclick = () => { if (confirm('Hapus semua koleksi tersimpan?')) h.onClear(); };
    $('tabP').onclick = () => { state.tab = 'produk'; render(); };
    $('tabS').onclick = () => { state.tab = 'toko'; render(); };
    $('scope').onchange = (e) => { state.scope = e.target.value; render(); };
    [['fq', 'q', (el) => el.value], ['fSold', 'minSold', num], ['fPmin', 'minP', num], ['fPmax', 'maxP', num], ['fOm', 'minOm', num]]
      .forEach(([id, k, get]) => { $(id).oninput = (e) => { state.f[k] = get(e.target); render(); }; });
    $('thead').onclick = (e) => {
      const th = e.target.closest('th[data-k]');
      if (!th) return;
      const k = th.dataset.k;
      state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === 'name' ? 1 : -1) };
      render();
    };

    const api = {
      toggle(show) {
        const p = $('panel');
        const open = show == null ? p.hidden : show;
        p.hidden = !open;
        $('fab').hidden = open;
      },
      setLicense(L) {
        const el = $('lic');
        const locked = !!(L && L.enabled && !L.access);
        $('panel').classList.toggle('locked', locked);
        $('lockmsg').hidden = !locked;
        if (!L || !L.enabled) { el.hidden = true; return; }
        el.hidden = false;
        const btn = (a, t, pri) => `<button class="${pri ? 'pri' : ''}" data-l="${a}">${t}</button>`;
        let t = '', b = '';
        if (L.state === 'signedout') { t = 'Masuk dengan Google untuk memakai extension (trial 3 hari gratis)'; b = btn('login', 'Masuk dengan Google', 1); }
        else if (L.state === 'trial') { t = `Trial · ${L.daysLeft} hari lagi`; b = btn('plans', 'Upgrade', 1) + btn('logout', 'Keluar'); }
        else if (L.state === 'active') { t = `Aktif · ${L.daysLeft} hari lagi`; b = btn('plans', 'Perpanjang') + btn('logout', 'Keluar'); }
        else if (L.state === 'lifetime') { t = 'Lifetime ★'; b = btn('logout', 'Keluar'); }
        else if (L.state === 'unconfigured') { t = esc(L.message); b = ''; }
        else if (L.state === 'expired') { t = 'Masa aktif berakhir'; b = btn('plans', 'Pilih paket', 1) + btn('logout', 'Keluar'); }
        else { t = esc(L.message || 'Lisensi belum terverifikasi'); b = btn('refresh', 'Coba lagi'); }
        el.innerHTML = `<span>${t}${L.email ? ' <i class="em">· ' + esc(L.email) + '</i>' : ''}</span>${b}`;
      },
      setStatus(msg, kind) { const s = $('status'); s.textContent = msg; s.className = 'status' + (kind ? ' ' + kind : ''); },
      setBusy(b) {
        $('btnScan').disabled = b; $('btnMulti').disabled = b; $('btnStop').hidden = !b;
      },
      setPageType(t) { state.pageType = t; render(); },
      setItems(list, pageKeys, deltaFn) {
        state.items = list.map((i) => Object.assign({}, i, { _d: deltaFn(i) }));
        state.pageKeys = pageKeys;
        render();
      },
      setDetail(d) { state.detail = d; renderDetail(); },
      setShop(s) { state.shop = s; renderShopCard(); },
      getVisible: visible
    };
    render();
    return api;
  }

  root.SpillUI = { mount: mount, fmtRp: fmtRp, fmtInt: fmtInt };
})(typeof self !== 'undefined' ? self : this);
