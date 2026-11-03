/* Spill Toko - kartu inline (halaman toko / produk / pencarian) + modal "Analisa Detail".
 * Dipasang ke halaman Shopee lewat Shadow DOM agar CSS Shopee tidak bentrok. */
(function (root) {
  'use strict';

  const nf = new Intl.NumberFormat('id-ID');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const two = (n) => String(n).padStart(2, '0');
  const fmtDate = (t) => { if (!t) return '–'; const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`; };
  const full = (n) => (n == null ? '–' : 'Rp ' + nf.format(Math.round(n)));
  const cnt = (n) => (n == null ? '–' : nf.format(Math.round(n)));
  function short(n) {
    if (n == null) return '–';
    if (n >= 1e9) return 'Rp ' + (n / 1e9).toFixed(2).replace('.', ',') + ' M';
    if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(2).replace('.', ',') + ' jt';
    if (n >= 1e5) return 'Rp ' + Math.round(n / 1e3) + ' rb';
    return 'Rp ' + nf.format(Math.round(n));
  }
  const pctTxt = (p) => (p == null ? '' : ` (${p >= 0 ? '+' : '-'}${Math.abs(p).toFixed(1).replace('.', ',')}%)`);
  const trendTxt = (p) => (p == null ? '–' : `${p >= 0 ? '↑' : '↓'} (${Math.abs(p).toFixed(1).replace('.', ',')}%)`);
  const rangeTxt = (lo, hi) => (lo == null ? '–' : hi && hi !== lo ? `${short(lo)} - ${short(hi)}` : short(lo));
  const ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ee4d2d" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';

  let VER = '';
  try { VER = 'v' + chrome.runtime.getManifest().version; } catch (_) { /* di luar extension */ }

  const CSS = `
  :host{all:initial;display:block}
  *{box-sizing:border-box;font-family:Roboto,"Helvetica Neue",Arial,sans-serif}
  .card{background:#fff;border:1px solid #e8e8e8;border-radius:6px;padding:0 14px 14px;color:#222;font-size:14px;margin:10px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}
  .head{display:flex;align-items:center;gap:4px;padding:10px 0;flex-wrap:wrap}
  .ver{font-size:10px;font-weight:600;color:#888;background:#f3f3f3;border-radius:8px;padding:1px 6px;margin-left:4px;align-self:center}
  .logo{display:flex;align-items:center;gap:6px;font-weight:700;font-size:17px;margin-right:12px;color:#111}
  .logo small{font-weight:400;color:#888;font-size:14px}
  .tab{padding:9px 15px;border-radius:8px;color:#555;cursor:pointer;background:transparent;border:0;font-size:14px}
  .tab:hover{color:#ee4d2d}.tab.on{background:#f3f3f3;color:#ee4d2d}
  .upd{margin-left:auto;color:#777;font-size:13px}.upd a{color:#1a73e8;text-decoration:underline;cursor:pointer;margin-left:4px}
  .body{background:#f7f7f7;border-radius:4px;padding:18px 8px}
  .metrics{display:flex;align-items:center;flex-wrap:wrap;row-gap:14px}
  .m{flex:1;min-width:140px;text-align:center;padding:2px 10px;border-left:1px solid #e3e3e3}.m:first-child{border-left:0}
  .m b{display:block;font-size:15px;margin-bottom:10px;color:#111}.m span{font-size:15px;color:#333}.m .sub{display:block;margin-top:6px;font-size:11.5px;line-height:1.4;color:#8a8a8a}
  .m.lv b{order:2;font-weight:400;margin:10px 0 0}.m.lv{display:flex;flex-direction:column}.m.lv span{order:1;font-weight:600}
  .act{width:170px;text-align:center;flex:none;border-left:1px solid #e3e3e3;padding:4px 10px}
  .btn{background:#d9541e;color:#fff;border:0;border-radius:4px;padding:11px 20px;font-size:15px;cursor:pointer;position:relative}
  .btn:hover{background:#c24a18}.btn:disabled{opacity:.7;cursor:default}
  .btn .dot{position:absolute;top:-5px;right:-5px;width:12px;height:12px;border-radius:50%;background:#f5222d}
  .lnk{display:block;margin-top:8px;font-size:12px;color:#1a73e8;cursor:pointer;text-decoration:underline;background:none;border:0;width:100%}
  .prog{margin:2px 0 10px;padding:10px 14px;border-radius:8px;background:#fff7f4;border:1px solid #fbd5c9;font-size:12.5px;color:#444}.prog .pt{display:flex;justify-content:space-between;gap:12px;align-items:center}.prog a{color:#1a73e8;cursor:pointer;text-decoration:underline;white-space:nowrap}.prog .pb{margin-top:8px;height:6px;border-radius:99px;background:#f3d9d0;overflow:hidden}.prog .pb i{display:block;height:100%;border-radius:99px;background:#ee4d2d;transition:width .4s}.prog.run .pb i{background-image:linear-gradient(45deg,rgba(255,255,255,.35) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.35) 50%,rgba(255,255,255,.35) 75%,transparent 75%);background-size:16px 16px;animation:pgs 1s linear infinite}.prog.err{background:#fff4f4;border-color:#f3c4c4}@keyframes pgs{to{background-position:16px 0}}
  .note{margin-top:10px;font-size:12px;color:#888;line-height:1.5}.note a{color:#1a73e8;cursor:pointer;text-decoration:underline}
  .sec{margin:0 14px 14px}.sec h5{margin:0 0 8px;font-size:14px;color:#111}
  .r{display:flex;padding:5px 0;font-size:14px}.r>span:first-child{width:34%;color:#333;flex:none}.r>span:last-child{flex:1;color:#222}
  .r a{color:#1a73e8}
  .comp{padding:4px 0}.cc{display:flex;gap:12px;align-items:center;padding:8px 4px}.cc img,.ci{width:58px;height:58px;border-radius:4px;object-fit:cover;background:#eee;flex:none}.cb{min-width:0;flex:1}.ct{display:block;font-weight:600;color:#111;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs{color:#374151;margin:2px 0}.sb{font-style:normal;background:#ee4d2d;color:#fff;border-radius:2px;padding:0 4px;font-size:10px;margin-right:6px}.cm{display:flex;gap:16px;flex-wrap:wrap;color:#374151}
  .chip{display:inline-block;background:#fff;border:1px solid #ddd;border-radius:999px;padding:2px 10px;margin:2px 4px 2px 0;font-size:12px}
  .bar{display:flex;align-items:center;gap:8px;margin:5px 0;font-size:13px}.bar i{display:block;height:10px;background:#f7b500;border-radius:3px}
  .bar u{width:46px;text-decoration:none;flex:none}.bar em{font-style:normal;color:#666;margin-left:4px}
  table{border-collapse:collapse;width:100%;font-size:13px;background:#fff}
  th,td{padding:7px 8px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}
  th{background:#fafafa;font-weight:600;white-space:nowrap}td.n,th.n{text-align:right;white-space:nowrap}
  td img{width:34px;height:34px;object-fit:cover;border-radius:4px;display:block}
  td a{color:#222;text-decoration:none}td a:hover{color:#ee4d2d}
  .pn{display:flex;gap:8px;align-items:center}
  .tw{overflow:auto;max-height:420px;border:1px solid #eee;border-radius:4px;margin:0 0 4px}
  .empty{padding:14px;text-align:center;color:#888}
  .bdg{margin-left:auto;margin-right:12px;background:#fff3ef;color:#ee4d2d;border:1px solid #ffd2c6;border-radius:99px;padding:4px 12px;font-size:12px;cursor:pointer}
  .bdg+.upd{margin-left:0}.bdg.ok{background:#eefbf1;color:#1b8a3b;border-color:#c9ecd2;cursor:default}
  .pw{padding:22px 14px 18px;text-align:center}.pw h3{margin:0 0 6px;font-size:18px;color:#111}.pw p{margin:0 0 16px;color:#666;font-size:14px}
  .gbtn{display:inline-flex;align-items:center;gap:10px;background:#fff;border:1px solid #dadce0;border-radius:6px;padding:11px 20px;font-size:15px;cursor:pointer;color:#222}
  .gbtn:hover{background:#f7f8f8}.gbtn:disabled{opacity:.6;cursor:default}
  .plans{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin:6px 0 4px}
  .pl{border:1.5px solid #e5e5e5;border-radius:10px;padding:16px 20px;width:240px;background:#fff;text-align:center}.pl.hot{border-color:#ee4d2d;box-shadow:0 4px 16px rgba(238,77,45,.12)}
  .pl b{display:block;font-size:22px;margin:4px 0;color:#111}.pl small{color:#777}.pl ul{list-style:none;padding:0;margin:10px 0 14px;text-align:left;font-size:13px;color:#444}.pl li:before{content:"✓ ";color:#ee4d2d}
  .pw .meta{margin-top:14px;font-size:12px;color:#888}.pw .meta a{color:#1a73e8;cursor:pointer;text-decoration:underline;margin-left:8px}
  .pw .wait{margin-top:12px;font-size:13px;color:#555}.pw .wait a{color:#1a73e8;cursor:pointer;text-decoration:underline}
  .err{color:#d32f2f;font-size:13px;margin-top:10px}
  
  .ai{padding:4px 14px 12px}.ai h5{margin:14px 0 6px;font-size:14px;color:#111}
  .aihd{display:flex;gap:14px;align-items:center;margin:10px 0 4px}.aihd p{margin:4px 0 0;font-size:14px;line-height:1.5;color:#333}
  .sc{flex:none;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:var(--c);
    background:conic-gradient(var(--c) calc(var(--p)*1%),#eee 0);position:relative}
  .sc::before{content:"";position:absolute;inset:6px;background:#fff;border-radius:50%}.sc span{position:relative}
  .lb{font-size:15px}
  .ai ul{margin:0;padding-left:18px;font-size:14px;line-height:1.6}
  .cols{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}@media(max-width:900px){.cols{grid-template-columns:1fr}}
  .rec{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid #eee;border-radius:6px;margin-bottom:6px;background:#fff}
  .rec small{display:block;color:#777;margin-top:2px;line-height:1.4}
  .pr{flex:none;font-size:11px;padding:2px 8px;border-radius:99px;text-transform:uppercase;font-weight:700;margin-top:1px}
  .pr.tinggi{background:#fde2e2;color:#c0392b}.pr.sedang{background:#fff3cd;color:#9a6b00}.pr.rendah{background:#e8f0fe;color:#1a56db}
  .kw{cursor:pointer}.kw:hover{border-color:#ee4d2d;color:#ee4d2d}
  .jd{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed #eee;font-size:14px}
  .jd a{flex:none;color:#1a73e8;cursor:pointer;font-size:12px}
  .aimeta{margin-top:14px;font-size:12px;color:#888;display:flex;gap:10px;flex-wrap:wrap;align-items:center}.aimeta a{color:#1a73e8;cursor:pointer;text-decoration:underline}
  .spin{display:inline-block;width:16px;height:16px;border:2px solid #ddd;border-top-color:#ee4d2d;border-radius:50%;animation:sp 0.8s linear infinite;vertical-align:-3px;margin-right:8px}
  @keyframes sp{to{transform:rotate(360deg)}}
  .tab.ai{color:#6d28d9}.tab .dt{display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;margin-left:5px}
  .aiempty{padding:34px 14px;text-align:center;color:#777;line-height:1.6}.aiempty .btn{margin-top:10px}
`;

  const MCSS = `
  :host{all:initial}
  *{box-sizing:border-box;font-family:Roboto,"Helvetica Neue",Arial,sans-serif}
  [hidden]{display:none!important}
  .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:2147483646;display:flex;align-items:center;justify-content:center}
  .md{background:#fff;width:min(1900px,96vw);height:96vh;border-radius:4px;display:flex;flex-direction:column;color:#222;font-size:14px;overflow:hidden}
  .mh{display:flex;align-items:center;gap:12px;padding:16px 22px;border-bottom:1px solid #eee}
  .lg{display:flex;align-items:center;gap:6px;font-weight:700;font-size:20px;padding-right:12px;border-right:1px solid #ddd}
  .ttl{font-size:16px;font-weight:600}.upd{margin-left:auto;color:#777}.upd a{color:#1a73e8;text-decoration:underline;cursor:pointer;margin-left:4px}
  .x{background:none;border:0;font-size:26px;cursor:pointer;color:#111;margin-left:14px}
  .tb{display:flex;align-items:center;gap:10px;padding:14px 22px;border-bottom:1px solid #eee;flex-wrap:wrap}
  .tb b{font-size:15px}
  button.g,select{background:#efefef;border:0;border-radius:6px;padding:11px 16px;font-size:14px;cursor:pointer;color:#222}
  button.g:hover{background:#e4e4e4}button.g.on{background:#ffe9e2;color:#ee4d2d}
  .sp{flex:1}.seg{display:flex;background:#efefef;border-radius:8px;padding:4px}
  .seg button{border:0;background:transparent;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:14px}.seg button.on{background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.15)}
  .fl{display:flex;gap:8px;padding:10px 22px;background:#fafafa;border-bottom:1px solid #eee;flex-wrap:wrap}
  .fl input{padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;width:150px}
  .ct{flex:1;overflow:auto;background:#f4f4f6;padding:18px 22px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:18px}
  .gc{background:#fff;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}
  .gh{display:flex;gap:16px;padding:20px 20px 12px;align-items:center}
  .gh img{width:120px;height:120px;object-fit:cover;border-radius:4px;flex:none;background:#eee}
  .gh a{font-weight:700;font-size:15px;line-height:1.35;color:#111;text-decoration:none;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
  .gb{margin:0 10px 12px;background:#fafafa;border-radius:4px;padding:10px 14px}
  .gb h6{display:flex;align-items:center;gap:8px;margin:12px 0 4px;font-size:13px;font-weight:400;color:#666}
  .gb h6:after{content:"";flex:1;height:1px;background:#e2e2e2}
  .kv{display:flex;padding:3px 0;font-size:14px}.kv span:first-child{width:46%;flex:none}.kv.b span:first-child{font-weight:700}
  .kv span:last-child{flex:1;word-break:break-word}
  .star{background:#ee4d2d;color:#fff;font-size:11px;padding:1px 5px;border-radius:2px;margin-right:4px}
  .tbl{background:#fff;border:1px solid #e6e6e6;overflow:auto}
  table{border-collapse:collapse;width:100%;font-size:14px}
  th,td{padding:12px 14px;border-bottom:1px solid #eee;text-align:left;vertical-align:middle}
  th{position:sticky;top:0;background:#fff;font-weight:700;cursor:pointer;white-space:nowrap;border-right:1px solid #f0f0f0;z-index:1}
  th.s{background:#e8f0fe;color:#1a56db}td.s{background:#f1f6ff}
  td.n,th.n{text-align:right;white-space:nowrap}
  td img{width:46px;height:46px;object-fit:cover;border-radius:4px;flex:none}
  .pn{display:flex;gap:12px;align-items:center;min-width:300px}.pn a{font-weight:600;color:#111;text-decoration:none}
  .more{display:block;margin:16px auto;padding:10px 24px;border:0;border-radius:6px;background:#ee4d2d;color:#fff;cursor:pointer;font-size:14px}
  .empty{padding:50px;text-align:center;color:#888}
  .busy{padding:30px;text-align:center;color:#666}
  `;

  const SORTS = [['omzet', 'Est. Omset'], ['sold', 'Terjual'], ['omzet30', 'Omset 30 hari'], ['sold30', 'Terjual 30 hari'],
    ['share', '% Market Share'], ['price', 'Harga'], ['rating', 'Rating'], ['favorit', 'Wishlist']];

  function create(h) {
    // ---------- kartu inline ----------
    const host = document.createElement('div');
    host.id = 'spill-inline-host';
    const sr = host.attachShadow({ mode: 'open' });
    sr.innerHTML = '<style>' + CSS + '</style><div id="card"></div>';
    const cardEl = sr.getElementById('card');
    let prog = null, payload = null, placedKind = null, busyText = null, L = null, plansOpen = false, lbusy = null, lerr = null;
    const tabs = { shop: 'ringkasan', search: 'ringkasan', product: 'transaksi' };
    let compAll = false;

    const leaf = (re, maxTop) => Array.prototype.find.call(document.querySelectorAll('div,span,a,li,p,h1,h2,h3,section'), (el) =>
      el.children.length === 0 && re.test((el.textContent || '').trim()) && (!maxTop || el.getBoundingClientRect().top + window.scrollY < maxTop));
    const climb = (el, minW) => { while (el.parentElement && el.parentElement !== document.body && el.offsetWidth < minW) el = el.parentElement; return el; };

    function findAnchor(kind) {
      if (kind === 'shop') {
        const l = leaf(/^Halaman Utama$/i) || leaf(/^Produk$/i);
        if (l) return { el: climb(l, 900), pos: 'afterend' };
      } else if (kind === 'product') {
        const l = leaf(/^Rp\s?\d[\d.,]*(\s*[-–]\s*Rp\s?\d[\d.,]*)?$/i, 1500);
        if (l) return { el: climb(l, 520), pos: 'afterend' };
      } else if (kind === 'search') {
        const l = leaf(/^Urutkan$/i);
        if (l) return { el: climb(l, 700), pos: 'beforebegin' };
        const a = Array.prototype.find.call(document.querySelectorAll('a[href]'), (x) => /-i\.\d+\.\d+/.test(x.getAttribute('href')));
        if (a) return { el: climb(a, 700), pos: 'beforebegin' };
      }
      return null;
    }

    // Kartu harus selalu selebar kontainer & berada DI BAWAH anchor (bukan terjepit di kolom samping
    // saat induknya flex/grid baris, seperti pada layout profil toko Shopee).
    const HOST_CSS = 'display:block;width:100%;max-width:none;min-width:0;box-sizing:border-box;grid-column:1/-1;flex:0 0 100%;align-self:stretch;clear:both;';
    function misplaced(anchor, pos) {
      const hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      if (!hr.width || !ar.width) return false;
      const beside = hr.left >= ar.right - 10 || hr.right <= ar.left + 10;
      const narrow = hr.width < ar.width * 0.8;
      const wrongSide = pos === 'afterend' ? hr.top < ar.bottom - 8 : hr.bottom > ar.top + 8;
      return beside || narrow || wrongSide;
    }

    function place() {
      if (!payload) return;
      const a = findAnchor(payload.kind);
      if (!a) return false;
      host.style.cssText = HOST_CSS;
      let anchor = a.el;
      anchor.insertAdjacentElement(a.pos, host);
      for (let i = 0; i < 4 && anchor.parentElement && anchor.parentElement !== document.body && anchor.parentElement !== document.documentElement && misplaced(anchor, a.pos); i++) {
        anchor = anchor.parentElement;
        anchor.insertAdjacentElement(a.pos, host);
      }
      placedKind = payload.kind;
      fitWidth(a.el);
      return true;
    }

    // Halaman toko: samakan lebar kartu dengan kontainer konten Shopee (tab Halaman Utama/Produk/...), seperti Tokpee.
    let fitRef = null;
    function fitWidth(ref) {
      if (ref) fitRef = ref;
      if (!host || !fitRef || !payload || payload.kind !== 'shop') return;
      const r = fitRef.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      if (r.width < 600 || r.width > vw - 8) { host.style.cssText = HOST_CSS; return; }
      const w = Math.min(Math.round(r.width + 22), vw - 24);   // sedikit lebih lebar dari bar tab, sama seperti kartu Tokpee
      host.style.cssText = HOST_CSS.replace('width:100%;', 'width:' + w + 'px;').replace('flex:0 0 100%;', 'flex:0 0 ' + w + 'px;') + 'margin:12px auto;';
    }
    window.addEventListener('resize', () => fitWidth());

    setInterval(() => { if (payload && !host.isConnected) place(); }, 1500);

    // ---------- badan kartu ----------
    const metrics = (m, extra) => '<div class="metrics">' + m.map((x) => `<div class="m${extra ? ' lv' : ''}"><b>${esc(x[0])}</b><span>${esc(x[1])}</span>${x[2] ? '<small class="sub">' + esc(x[2]) + '</small>' : ''}</div>`).join('');

    function actCol(label) {
      const busy = !!busyText;
      return `<div class="act"><button class="btn" data-act="analyze" ${busy ? 'disabled' : ''}>${esc(busy ? busyText : label)}<i class="dot"></i></button></div></div>`;
    }

    function topTable(rows, titleCol) {
      if (!rows || !rows.length) return '<div class="empty">Belum ada data. Klik tombol Analisa untuk memindai produk.</div>';
      return `<div class="tw"><table><thead><tr><th>#</th><th>${titleCol || 'Produk'}</th><th class="n">Harga</th><th class="n">Terjual</th><th class="n">Est. omset</th><th class="n">Porsi</th></tr></thead><tbody>` +
        rows.map((r, i) => `<tr><td>${i + 1}</td><td><div class="pn">${r.image ? `<img src="${esc(r.image)}">` : ''}<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc((r.name || '').slice(0, 90))}</a></div></td>
        <td class="n">${r.price == null ? '–' : short(r.price)}</td><td class="n">${cnt(r.sold)}${r.soldPlus ? '+' : ''}${r.soldMonthly ? ' /bln' : ''}</td><td class="n"><b>${short(r.omzet)}</b></td><td class="n">${r.share != null ? r.share.toFixed(1).replace('.', ',') + '%' : '–'}</td></tr>`).join('') + '</tbody></table></div>';
    }

    function aggMetrics(d, tab, scopeLabel) {
      const s = d.stats;
      if (tab === 'ringkasan') {
        const has30 = s && s.have30;
        const sub = (trend) => {
          if (!has30) return '';
          const parts = [];
          if (trend != null) parts.push((trend >= 0 ? '▲ ' : '▼ ') + Math.abs(trend).toFixed(1).replace('.', ',') + '% vs bulan lalu');
          if (s.have30 < s.count) parts.push(s.have30 + ' dari ' + s.count + ' produk');
          if (s.est30n) parts.push(s.est30n + ' estimasi');
          return parts.join(' · ');
        };
        return [['Rentang Harga', s ? rangeTxt(s.priceMin, s.priceMax) : '–'],
          [has30 ? 'Terjual 30 hari' : 'Terjual (sesuai tampilan)', s ? cnt(has30 ? s.sold30 : s.basisSold) : '–', s ? sub(s.soldTrend) : ''],
          [has30 ? 'Omset 30 hari' : 'Omset (sesuai tampilan)', s ? full(has30 ? s.omzet30 : s.basisOmzet) : '–', s ? sub(s.omzetTrend) : '']];
      }
      return null;
    }

    function shopBody(d) {
      const t = tabs.shop, s = d.stats, i = d.info || {};
      let m;
      if (t === 'andalan') return '<div class="body">' + topTable(s ? s.top : []) + '<div class="note"><a data-act="analyze">Analisa Detail</a> untuk tabel lengkap seluruh produk toko.</div></div>';
      if (t === 'ringkasan') m = aggMetrics(d, 'ringkasan');
      else if (t === 'omset') m = [['Total Omset', s && s.hasTotal ? full(s.totalOmzet) : '–'], ['Rata2 Omset / bln', s && s.avgOmzet != null ? full(s.avgOmzet) : '–'],
        ['Omset 30 hari', s && s.have30 ? full(s.omzet30) : '–'], ['Trend (Omset)', s ? trendTxt(s.omzetTrend) : '–']];
      else if (t === 'volume') m = [['Total Terjual', s && s.hasTotal ? cnt(s.totalSold) : '–'], ['Rata2 Terjual / bln', s && s.avgSold != null ? cnt(s.avgSold) : '–'],
        ['Terjual 30 hari', s && s.have30 ? cnt(s.sold30) : '–'], ['Trend (Terjual)', s ? trendTxt(s.soldTrend) : '–']];
      else m = [['Bergabung', i.joined || '–'], ['Produk', cnt(i.products)], ['Pengikut', i.followersText || cnt(i.followers)],
        ['Nilai Ulasan', i.rating != null ? `★ ${i.rating.toFixed(1)}${i.ratingCountText ? ' (' + i.ratingCountText + ')' : ''}` : '–'], ['Kec. Balas Chat', i.chatText || '–']];
      const notAct = t === 'info' ? '' : actCol('Analisa Detail');
      const body = '<div class="body">' + metrics(m) + (t === 'info' ? '</div>' : notAct);
      let note;
      if (!s) note = 'Belum ada data produk toko ini. Klik <b>Analisa Detail</b> untuk memindai semua produk toko (beberapa halaman, butuh ± 10–30 detik).';
      else {
        const total = i.products;
        note = `Berdasarkan ${cnt(d.scanned)}${total ? ' dari ' + cnt(total) : ''} produk ter-scan${total && d.scanned < total * 0.9 ? ' — klik Analisa Detail untuk melengkapi' : ''}. Jumlah terjual dibulatkan Shopee sehingga omset adalah <b>estimasi</b>; data 30 hari menjadi akurat setelah scan ulang di hari berbeda.`;
      }
      return body + '</div><div class="note">' + note + ' <a data-act="panel">Buka tabel samping</a>' + (!prog || prog.state !== 'run' ? ' · <a data-act="staged">Scan semua produk toko (bertahap, di latar belakang)</a>' : '') + '</div>';
    }

    function searchBody(d) {
      const t = tabs.search, s = d.stats;
      let m;
      if (t === 'ringkasan') m = aggMetrics(d, 'ringkasan');
      else if (t === 'market') m = [['Total Omset (tampilan)', s ? full(s.basisOmzet) : '–'], ['Rata2 Omset / Produk', s && s.count ? full(s.basisOmzet / s.count) : '–'],
        ['Top 10 Produk', s && s.top10share != null ? s.top10share.toFixed(1).replace('.', ',') + '% dari omset' : '–']];
      else m = [['Total Terjual (tampilan)', s ? cnt(s.basisSold) : '–'], ['Rata2 Terjual / Produk', s && s.count ? cnt(s.basisSold / s.count) : '–'],
        ['Median Terjual', s ? cnt(s.medianSold) : '–']];
      const note = s ? `Berdasarkan ${cnt(s.count)} produk ter-scan dari pencarian ini. Estimasi dari angka terjual yang tampil di Shopee. <a data-act="multi">Scan 3 halaman</a> untuk sampel lebih besar.`
        : 'Belum ada data. Klik <b>Analisa Detail</b> untuk memindai halaman ini (atau <a data-act="multi">scan 3 halaman</a>).';
      return '<div class="body">' + metrics(m, true) + actCol('Analisa Detail') + '</div><div class="note">' + note + '</div>';
    }

    function rows(list) { return list.map((r) => `<div class="r"><span>${esc(r[0])}</span><span>${r[1]}</span></div>`).join(''); }

    function productBody(d) {
      const t = tabs.product, p = d.detail || {};
      if (t === 'ulasan') {
        let h2 = '<div class="body"><div class="sec">';
        if (p.stars) {
          const total = [1, 2, 3, 4, 5].reduce((s, n) => s + (p.stars[n] || 0), 0) || 1;
          h2 += [5, 4, 3, 2, 1].map((n) => `<div class="bar"><u>${n} ★</u><i style="width:${Math.max(1, ((p.stars[n] || 0) / total) * 260)}px"></i><em>${cnt(p.stars[n])} (${(((p.stars[n] || 0) / total) * 100).toFixed(1).replace('.', ',')}%)</em></div>`).join('');
          h2 += `<div class="r" style="margin-top:8px"><span>Komplain (★1–2)</span><span><b>${p.complaintPct != null ? p.complaintPct.toString().replace('.', ',') + '%' : '–'}</b></span></div>`;
        } else h2 += '<div class="empty">Distribusi bintang belum termuat. Klik <b>Analisa</b> agar bagian ulasan ikut dimuat.</div>';
        return h2 + '</div>' + actRow() + '</div>';
      }
      if (t === 'affiliate') {
        const a = p.aff;
        let h2 = '<div class="body"><div class="sec">';
        if (a === undefined || a === null) h2 += '<div class="empty">Memuat data komisi…</div>';
        else if (a.error) h2 += '<div class="empty">Data komisi belum bisa dimuat (' + esc(String(a.error).slice(0, 80)) + ').</div>';
        else if (!a.enabled) h2 += '<div class="empty">Data Affiliate belum diaktifkan oleh admin.</div>';
        else if (!a.found || !a.data) h2 += '<div class="empty">Produk ini tidak terdaftar di program Affiliate Shopee.</div>';
        else {
          const x = a.data, pc = (v) => (v == null ? '–' : String(v).replace('.', ',') + '%');
          h2 += '<h5>Komisi</h5>' + rows([['Komisi Xtra (penjual)', pc(x.rate_seller) + (x.rate_seller != null && x.price_min != null ? ' (' + full(Math.round(x.price_min * x.rate_seller / 100)) + ')' : '')],
            ['Komisi Shopee', pc(x.rate_shopee) + (x.rate_shopee != null && x.price_min != null ? ' (' + full(Math.round(x.price_min * x.rate_shopee / 100)) + ')' : '')],
            ['Komisi Total', pc(x.rate_total) + (x.commission != null ? ' (' + full(x.commission) + ')' : '')]]) +
            '<h5>Produk di program Affiliate</h5>' + rows([['Terjual (data Shopee)', cnt(x.sales)], ['Rating', x.rating != null ? '★ ' + x.rating : '–']]);
        }
        return h2 + '</div>' + (a && a.enabled ? '<div class="note">Dari Open API Affiliate Shopee. Nominal komisi dihitung dari harga terendah.</div>' : '') + '</div>';
      }
      if (t === 'kompetitor') {
        const cs = d.competitors || [];
        if (!cs.length) return '<div class="body">' + topTable([], '') + actRow() + '</div>';
        const shown = compAll ? cs : cs.slice(0, 4);
        const perMon = (r) => {
          if (r.ctime && r.sold != null && !r.soldMonthly) return r.sold / Math.max(1, (Date.now() - r.ctime * 1000) / (30.44 * 864e5));
          if (r.soldMonthly && r.sold != null) return r.sold;
          return null;
        };
        const card = (r) => {
          const pm = perMon(r), star = (r.badges || []).indexOf('Mall') >= 0 ? 'Mall' : ((r.badges || []).indexOf('Star') >= 0 ? 'Star+' : '');
          return '<div class="cc">' + (r.image ? '<img src="' + esc(r.image) + '">' : '<span class="ci"></span>') +
            '<div class="cb"><a class="ct" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + esc((r.name || '').slice(0, 110)) + '</a>' +
            '<div class="cs">' + (star ? '<em class="sb">' + star + '</em>' : '') + esc(r.shopName || r.location || '') + '</div>' +
            '<div class="cm"><span>' + (r.price == null ? '–' : full(r.price)) + '</span>' +
            (r.rating != null ? '<span>★ ' + String(r.rating).replace('.', ',') + (r.ratingCount != null ? ' (' + cnt(r.ratingCount) + ')' : '') + '</span>' : '') +
            '<span>' + (pm != null ? 'Terjual ' + cnt(Math.round(pm)) + ' / bln' : (r.sold != null ? 'Terjual ' + cnt(r.sold) + (r.soldPlus ? '+' : '') + (r.soldMonthly ? ' / bln' : '') : '')) + '</span></div></div></div>';
        };
        return '<div class="body"><div class="comp">' + shown.map(card).join('') + '</div>' +
          (cs.length > 4 ? '<div style="text-align:center;padding:6px 0 10px"><button class="btn" data-act="compmore">' + (compAll ? 'Tampilkan lebih sedikit' : 'Tampilkan Produk Lainnya') + '</button></div>' : '') +
          '<div class="note">Produk serupa yang tampil di halaman ini, diurutkan dari omset terbesar. Terjual / bln dihitung dari total terjual dibagi umur produk bila tanggal dibuat diketahui.</div>' + actRow() + '</div>';
      }
      if (t === 'varian') {
        let h2 = '<div class="body"><div class="sec">';
        h2 += p.variants && p.variants.length ? p.variants.map((v) => `<h5>${esc(v.name)}</h5><div>${v.options.map((o) => `<span class="chip">${esc(o)}</span>`).join('')}</div>`).join('') : '<div class="empty">Varian belum terbaca. Klik Analisa.</div>';
        return h2 + (p.variantSales && p.variantSales.length ? '<div class="note">Persentase penjualan per varian dari data Shopee.</div>' : '<div class="note">Persentase penjualan per varian hanya tampil bila Shopee menyertakannya untuk produk ini.</div>') + '</div>' + actRow() + '</div>';
      }
      // transaksi
      const mid = p.priceMax && p.price != null ? (p.price + p.priceMax) / 2 : p.price;
      const addedMs = p.ctime ? p.ctime * 1000 : null;
      const months = addedMs ? Math.max(1, (Date.now() - addedMs) / (30.44 * 864e5)) : null;
      const perMonth = months && p.sold != null && !p.soldMonthly ? p.sold / months : null;
      const vsTxt = p.variantSales && p.variantSales.length ? p.variantSales.map((v) => { const tot = v.opts.reduce((a, o) => a + o.sold, 0) || 1; return '<b>' + esc(v.name) + '</b><br>' + v.opts.filter((o) => o.sold > 0).sort((a, b) => b.sold - a.sold).map((o) => esc(o.o) + ' (' + Math.round((o.sold / tot) * 100) + '%)').join(', '); }).join('<br>') : null;
      const sec1 = rows([['Ditambahkan', addedMs ? fmtDate(addedMs).slice(0, 11) : '–'], ['Harga', rangeTxt(p.price, p.priceMax)], ['Stok', cnt(p.stock)],
        ['Rating', p.rating != null ? `★ ${p.rating.toFixed(1)} (${cnt(p.ratingCount)} penilaian)` : '–'],
        ['Toko', p.shopUrl ? `<a href="${esc(p.shopUrl)}" target="_blank" rel="noopener">${esc(p.shopName || 'Lihat toko')}</a>` : esc(p.shopName || '–')]]);
      const r = d.rate;
      const estTag = r && r.est ? ' <small style="color:#d97706">(estimasi)</small>' : '';
      const sec2 = rows([['Omset / Bulan', perMonth != null && mid != null ? full(perMonth * mid) : '–'], ['Terjual / Bulan', perMonth != null ? cnt(Math.round(perMonth)) : '–'], ['Omset 30 hari', r && r.omzet != null ? full(r.omzet) + estTag : '–'], ['Terjual 30 hari', r ? cnt(r.sold) + estTag : '–'], ['Trend 30 hari', trendTxt(d.trendPct)]]);
      const sec3 = rows([['Wishlist', p.favorit != null ? '❤ ' + cnt(p.favorit) : '–'], ['Nilai Jual Stok', p.price != null && p.stock != null ? full(p.price * p.stock) : 'n/a'],
        ['Komplain (★1–2)', p.complaintPct != null ? p.complaintPct.toString().replace('.', ',') + '%' : '–'],
        ['Penjualan Varian', vsTxt || '<span style="color:#9ca3af">tidak disediakan Shopee untuk produk ini</span>'],
        ['Varian', p.variants && p.variants.length ? p.variants.map((v) => esc(v.name) + ' (' + v.options.length + ')').join(', ') : '–']]);
      const sec4 = rows([['Total Omset (est.)', full(p.omzet)], ['Total Terjual', cnt(p.sold) + (p.soldPlus ? '+' : '') + (p.soldMonthly ? ' /bulan' : '') + (p.soldExact ? ' <small style="color:#16a34a">(pasti)</small>' : '')]]);
      return '<div class="body" style="padding:14px 0 6px"><div class="sec"><h5>Informasi Umum</h5>' + sec1 + '</div><div class="sec"><h5>Trend</h5>' + sec2 +
        '</div><div class="sec"><h5>Potensi dan Performa</h5>' + sec3 + '</div><div class="sec"><h5>Statistik Total</h5>' + sec4 + '</div>' + actRow() +
        '<div class="note" style="margin:0 14px 8px">Total terjual dibulatkan Shopee (mis. “10RB+”), jadi total omset adalah batas bawah. ' +
        (d.rate && d.rate.api ? 'Angka terjual 30 hari dan total terjual berasal dari data Shopee (angka pasti, bukan estimasi).' : d.rate && d.rate.est ? 'Angka 30 hari adalah <b>estimasi kasar</b> dari tanggal ulasan (' + d.rate.recent + ' dari ' + d.rate.sample + ' ulasan sampel dalam 30 hari terakhir; sampel ulasan Shopee tidak berurutan waktu, jadi bisa meleset); lebih akurat setelah produk di-scan lagi di hari berbeda.' : 'Data 30 hari terisi setelah produk ini di-scan lagi di hari berbeda.') +
        '</div></div>';
    }

    function actRow() {
      return `<div style="text-align:right;padding:0 14px 8px"><button class="btn" data-act="analyze" ${busyText ? 'disabled' : ''}>${esc(busyText || 'Analisa')}<i class="dot"></i></button></div>`;
    }


    const GICON = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

    function badge() {
      if (!L || !L.enabled || !L.access) return '';
      if (L.state === 'trial') return `<button class="bdg" data-act="plans" title="Klik untuk upgrade">Trial · ${L.daysLeft} hari lagi</button>`;
      if (L.state === 'active') return `<button class="bdg" data-act="plans" title="Perpanjang / upgrade">Aktif s/d ${fmtDate(L.until * 1000).slice(0, 11)}</button>`;
      if (L.state === 'lifetime') return '<span class="bdg ok">Lifetime ★</span>';
      return '';
    }

    function paywall() {
      const l = L || {};
      const pl = l.plans || {};
      const p1 = pl.monthly || { label: 'Bulanan', price: 24000, original: 49000, days: 30 }, p2 = pl.yearly || { label: 'Tahunan', price: 249000, original: 549000, days: 365 };
      const aiLine = (p) => (p.ai_limit === undefined ? '' : `<li>Analisa AI ${p.ai_limit === null ? 'tanpa batas' : p.ai_limit + 'x'}/hari</li>`);
      const off = (p) => (p.original > p.price ? Math.round((1 - p.price / p.original) * 100) : 0);
      const was = (p) => (p.original > p.price ? `<s style="opacity:.55;font-size:12px">${full(p.original)}</s> ` : '');
      const dis = lbusy ? 'disabled' : '';
      const err = lerr ? `<div class="err">${esc(lerr)}</div>` : '';
      if (l.state === 'signedout') {
        return `<div class="pw"><h3>Mulai trial gratis 3 hari</h3><p>Masuk dengan Google untuk mengaktifkan Spill Data. Tanpa kartu kredit.</p>
          <button class="gbtn" data-lic="login" ${dis}>${GICON} ${esc(lbusy || 'Masuk dengan Google')}</button>${err}</div>`;
      }
      if (l.state === 'offline' || l.state === 'invalid' || l.state === 'unconfigured') {
        return `<div class="pw"><h3>Lisensi belum bisa diverifikasi</h3><p>${esc(l.message || 'Periksa koneksi internet lalu coba lagi.')}</p>
          <button class="btn" data-lic="refresh">Coba lagi</button>${l.state === 'invalid' ? ' <button class="gbtn" data-lic="logout">Masuk ulang</button>' : ''}${err}</div>`;
      }
      const head = l.state === 'expired' ? '<h3>Masa aktif berakhir</h3><p>Pilih paket untuk melanjutkan riset produk &amp; toko.</p>'
        : '<h3>Pilih paket</h3><p>Upgrade kapan saja — sisa masa aktif Anda tidak hangus.</p>';
      const wait = l.pending ? '<div class="wait">⏳ Menunggu pembayaran… akses aktif otomatis setelah bayar. <a data-lic="refresh">Sudah bayar? Cek status</a></div>' : '';
      const yearBox = `<div class="pl hot"><small>${esc(p2.label)}${off(p2) ? ' · hemat ' + off(p2) + '%' : ''}</small><div>${was(p2)}</div><b>${full(p2.price)}</b><small>per tahun</small>
          <ul><li>Semua fitur</li>${aiLine(p2)}<li>Paling hemat</li></ul><button class="btn" data-lic="checkout" data-plan="yearly" ${dis}>${esc(lbusy || 'Pilih Tahunan')}</button></div>`;
      return `<div class="pw">${head}<div class="plans">
        <div class="pl"><small>${esc(p1.label)}${off(p1) ? ' · hemat ' + off(p1) + '%' : ''}</small><div>${was(p1)}</div><b>${full(p1.price)}</b><small>per ${p1.days} hari</small>
          <ul><li>Semua fitur</li>${aiLine(p1)}<li>Perpanjang kapan saja</li></ul><button class="btn" data-lic="checkout" data-plan="monthly" ${dis}>${esc(lbusy || 'Pilih Bulanan')}</button></div>${yearBox}</div>
        ${wait}${err}<div class="meta">${esc(l.email || '')}<a data-lic="logout">Keluar</a></div></div>`;
    }

    let ai = null;           // { kind, st } - hasil analisis AI untuk halaman saat ini
    let copyBag = [];
    const scoreColor = (n) => (n >= 80 ? '#16a34a' : n >= 60 ? '#2563eb' : n >= 40 ? '#d97706' : '#dc2626');
    const aiList = (title, arr) => (arr && arr.length ? `<div><h5>${title}</h5><ul>${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '');
    const cp = (text) => copyBag.push(text) - 1;

    function aiBody(k) {
      const info = L && L.ai;
      const box = (inner) => '<div class="body" style="display:block"><div class="aiempty">' + inner + '</div></div>';
      if (L && !L.enabled) return box('Paket <b>DEV tanpa login</b> tidak bisa memakai Analisis AI (AI butuh akun Google + server). Pakai paket tes yang wajib login.');
      if (L && L.state === 'unconfigured') return box('Extension belum dikonfigurasi: isi <b>GOOGLE_CLIENT_ID</b> dan <b>LICENSE_PUBKEY</b> di src/config.js, lalu muat ulang extension.');
      if (!L || !L.access) return box('Masuk dengan Google dan aktifkan langganan/trial untuk memakai Analisis AI.');
      if (!info) return box('Info AI dari server belum termuat. Tutup lalu buka lagi kartu ini, atau cek koneksi ke server.');
      if (!info.enabled) return box('Analisis AI belum diaktifkan oleh admin.');
      const a = ai && ai.kind === k ? ai.st : { status: 'idle' };
      const quota = info.limit == null ? 'tanpa batas' : `${Math.max(0, info.limit - info.used)} dari ${info.limit}`;
      const runBtn = (label, force) => `<br><button class="btn" data-act="${force ? 'ai-redo' : 'ai-run'}" ${busyText ? 'disabled' : ''}>${label}<i class="dot"></i></button>`;
      if (a.status !== 'loading' && a.status !== 'ok' && k !== 'product' && !(payload && payload.data && payload.data.stats)) a.status = 'nodata';
      if (a.status === 'loading') return box('<span class="spin"></span>AI sedang menganalisis data… (± 10–40 detik)');
      if (a.status === 'nodata') return box(k === 'product' ? 'Data produk belum terbaca. Tunggu halaman selesai dimuat.' :
        'Belum ada data untuk dianalisis. Klik <b>Analisa Detail</b> dulu untuk memindai produk, lalu AI akan menganalisisnya.');
      if (a.status === 'error') return box(`<b style="color:#c0392b">${esc(a.error)}</b>` + runBtn('Coba lagi', true));
      if (a.status !== 'ok') return box(`AI akan menganalisis data hasil scan halaman ini.<br><small>Sisa kuota hari ini: ${quota}</small>` + runBtn('Analisis dengan AI', false));
      const x = a.analysis;
      copyBag = [];
      const rec = (x.rekomendasi || []).map((r) => `<div class="rec"><span class="pr ${esc(r.prioritas)}">${esc(r.prioritas)}</span><div><b>${esc(r.aksi)}</b>${r.alasan ? `<small>${esc(r.alasan)}</small>` : ''}</div></div>`).join('');
      const kw = (x.kata_kunci || []).map((w) => `<span class="chip kw" data-copy="${cp(w)}" title="Klik untuk menyalin">${esc(w)}</span>`).join('');
      const jd = (x.saran_judul || []).map((t) => `<div class="jd"><span>${esc(t)}</span><a data-copy="${cp(t)}">Salin</a></div>`).join('');
      return `<div class="body" style="display:block"><div class="ai">
        <div class="aihd"><div class="sc" style="--c:${scoreColor(x.skor)};--p:${x.skor}"><span>${x.skor}</span></div><div><b class="lb" style="color:${scoreColor(x.skor)}">${esc(x.label)}</b><p>${esc(x.ringkasan)}</p></div></div>
        <div class="cols">${aiList('Temuan', x.temuan)}${aiList('Peluang', x.peluang)}${aiList('Risiko', x.risiko)}</div>
        ${rec ? '<h5>Rekomendasi aksi</h5>' + rec : ''}
        ${kw ? '<h5>Kata kunci</h5><div>' + kw + '</div>' : ''}
        ${jd ? '<h5>Saran judul listing</h5>' + jd : ''}
        <div class="aimeta"><span>Analisis AI${x.model ? ' · ' + esc(x.model) : ''}${a.cached ? ' · hasil tersimpan' : ''}${a.at ? ' · ' + esc(fmtDate(a.at * 1000)) : ''}</span><span>Sisa kuota hari ini: ${quota}</span><a data-act="ai-redo">Analisis ulang</a></div>
        <div class="note">Dibuat otomatis oleh AI dari data yang ter-scan (estimasi, bukan data resmi Shopee). Periksa kembali sebelum mengambil keputusan.</div>
      </div></div>`;
    }

    const TABS = {
      shop: [['ringkasan', 'Ringkasan'], ['omset', 'Omset'], ['volume', 'Volume'], ['info', 'Informasi Umum'], ['andalan', 'Produk Andalan'], ['ai', '✨ Analisa AI']],
      search: [['ringkasan', 'Ringkasan'], ['market', 'Market Size'], ['volume', 'Volume'], ['ai', '✨ Analisa AI']],
      product: [['transaksi', 'Transaksi'], ['ulasan', 'Ulasan'], ['kompetitor', 'Kompetitor'], ['varian', 'Varian'], ['affiliate', 'Affiliate'], ['ai', '✨ Analisa AI']]
    };

    function draw() {
      if (!payload) { cardEl.innerHTML = ''; return; }
      const k = payload.kind, d = payload.data;
      const aiS = ai && ai.kind === k ? ai.st : null;
      if (payload.locked || (plansOpen && L && L.enabled)) {
        cardEl.innerHTML = `<div class="card"><div class="head"><span class="logo">${ICON}<span>Spill <small>Data</small></span><small class="ver">${VER}</small></span>` +
          (!payload.locked ? '<button class="bdg" data-act="closeplans">✕ Tutup</button>' : '') + '</div>' + paywall() + '</div>';
        return;
      }
      const head = `<div class="head"><span class="logo">${ICON}<span>Spill <small>Data</small></span><small class="ver">${VER}</small></span>` +
        TABS[k].map((x) => `<button class="tab${tabs[k] === x[0] ? ' on' : ''}${x[0] === 'ai' ? ' ai' : ''}" data-tab="${x[0]}">${x[1]}${x[0] === 'ai' && aiS && aiS.status === 'ok' ? '<i class="dt"></i>' : ''}</button>`).join('') + badge() +
        `<span class="upd">${d.updatedAt ? 'Terakhir diperbarui ' + fmtDate(d.updatedAt) : 'Belum pernah di-scan'}. <a data-act="refresh">Refresh</a></span></div>`;
      const body = tabs[k] === 'ai' ? aiBody(k) : k === 'shop' ? shopBody(d) : k === 'search' ? searchBody(d) : productBody(d);
      cardEl.innerHTML = '<div class="card">' + head + progBar() + body + '</div>';
    }

    function progBar() {
      if (!prog) return '';
      const pct = prog.total ? Math.max(3, Math.min(100, Math.round((prog.done / prog.total) * 100))) : 3;
      if (prog.state === 'err') return `<div class="prog err"><div class="pt"><span>⚠️ ${esc(prog.msg || 'Gagal')}</span><a data-act="dismiss">Tutup</a></div></div>`;
      if (prog.state === 'run') return `<div class="prog run"><div class="pt"><span>⏳ ${prog.mode === 'api' ? 'Mengambil data semua produk toko —' : 'Memindai semua produk di latar belakang —'} halaman ${Math.min(prog.done + 1, prog.total)} dari ${prog.total} · ${prog.found || 0}${prog.expect ? ' dari ±' + prog.expect : ''} produk terbaca</span><a data-act="stop">Hentikan</a></div><div class="pb"><i style="width:${pct}%"></i></div></div>`;
      if (prog.state === 'blocked') return `<div class="prog err"><div class="pt"><span>⚠️ Dijeda: Shopee meminta verifikasi di tab scan. Selesaikan di sana, lalu <a data-act="staged">lanjutkan scan</a>. (${prog.found || 0} produk terbaca)</span></div></div>`;
      return `<div class="prog"><div class="pt"><span>✅ Scan selesai — ${prog.found || 0} produk terbaca dari ${prog.done} halaman.</span><a data-act="dismiss">Tutup</a></div></div>`;
    }

    cardEl.addEventListener('click', (e) => {
      const lc = e.target.closest('[data-lic]');
      if (lc) { h.onLicense(lc.dataset.lic, lc.dataset.plan); return; }
      const t = e.target.closest('[data-tab]');
      if (t && payload) { tabs[payload.kind] = t.dataset.tab; draw(); return; }
      const cpEl = e.target.closest('[data-copy]');
      if (cpEl) {
        const txt = copyBag[Number(cpEl.dataset.copy)];
        if (txt != null) {
          const done = () => { const o = cpEl.textContent; cpEl.textContent = 'Tersalin ✓'; setTimeout(() => { cpEl.textContent = o; }, 1200); };
          try { navigator.clipboard.writeText(txt).then(done, () => {}); } catch (_) { /* tanpa izin clipboard */ }
        }
        return;
      }
      const a = e.target.closest('[data-act]');
      if (!a || !payload) return;
      const act = a.dataset.act;
      if (act === 'plans') { plansOpen = true; draw(); }
      else if (act === 'closeplans') { plansOpen = false; draw(); }
      else if (act === 'analyze') h.onAnalyze(payload.kind);
      else if (act === 'ai-run') h.onAi(payload.kind, false);
      else if (act === 'ai-redo') h.onAi(payload.kind, true);
      else if (act === 'refresh') h.onRefresh(payload.kind);
      else if (act === 'panel') h.onPanel();
      else if (act === 'multi') h.onMulti(3);
      else if (act === 'staged') h.onStaged && h.onStaged();
      else if (act === 'stop') h.onStop && h.onStop();
      else if (act === 'dismiss') { prog = null; draw(); }
      else if (act === 'compmore') { compAll = !compAll; draw(); }
    });

    // ---------- modal Analisa Detail ----------
    const mhost = document.createElement('div');
    mhost.id = 'spill-modal-host';
    const msr = mhost.attachShadow({ mode: 'open' });
    msr.innerHTML = `<style>${MCSS}</style><div class="ov" id="ov" hidden><div class="md">
      <div class="mh"><span class="lg">${ICON}<span>Spill Toko</span></span><span class="ttl">Analisa</span><span class="upd" id="mupd"></span><button class="x" data-a="close">✕</button></div>
      <div class="tb"><b>Urutkan:</b><select id="msort">${SORTS.map((s) => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select>
        <button class="g" data-a="filter" id="mfbtn">Show Filter</button><span class="sp"></span>
        <button class="g" data-a="download">Download</button>
        <div class="seg"><button data-v="table" id="vt">Table</button><button data-v="grid" id="vg">Grid</button></div></div>
      <div class="fl" id="mfl" hidden><input id="fq" placeholder="Cari nama/lokasi/toko"><input id="fpmin" type="number" placeholder="Harga min"><input id="fpmax" type="number" placeholder="Harga maks"><input id="fsold" type="number" placeholder="Min terjual"></div>
      <div class="ct" id="mct"></div></div></div>`;
    const m$ = (id) => msr.getElementById(id);
    const ms = { view: 'grid', sort: 'omzet', filter: false, f: { q: '', pmin: null, pmax: null, sold: null }, limit: 48, data: null, busy: false };

    function mrows() {
      if (!ms.data) return [];
      const f = ms.f, q = f.q.trim().toLowerCase();
      let arr = ms.data.rows.filter((r) => (!q || (r.name || '').toLowerCase().includes(q) || (r.location || '').toLowerCase().includes(q) || (r.shopName || '').toLowerCase().includes(q)) &&
        (f.pmin == null || (r.price != null && r.price >= f.pmin)) && (f.pmax == null || (r.price != null && r.price <= f.pmax)) && (f.sold == null || (r.sold || 0) >= f.sold));
      const k = ms.sort;
      return arr.slice().sort((a, b) => { const x = a[k], y = b[k]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return y - x; });
    }

    function gridCard(r) {
      const basisLbl = r.soldMonthly ? 'Terjual / Bulan' : 'Terjual (total)';
      return `<div class="gc"><div class="gh">${r.image ? `<img src="${esc(r.image)}">` : '<img>'}<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></div><div class="gb">
        <div class="kv"><span>Nama Toko</span><span>${r.badges && r.badges.indexOf('Star') >= 0 ? '<i class="star">Star</i>' : ''}${esc(r.shopName || 'ID ' + r.shopId)}</span></div>
        <div class="kv"><span>Lokasi</span><span>${esc(r.location || '–')}</span></div>
        <div class="kv"><span>Harga</span><span>${rangeTxt(r.price, r.priceMax)}${r.discount ? ' (-' + r.discount + '%)' : ''}</span></div>
        <div class="kv"><span>Stok</span><span>${cnt(r.stock)}</span></div>
        <h6>Trend</h6>
        <div class="kv b"><span>Est. Omset${r.soldMonthly ? ' / Bln' : ' (total)'}</span><span>${full(r.omzet)}</span></div>
        <div class="kv"><span>Est. Omset 30 hr</span><span>${full(r.omzet30)}</span></div>
        <div class="kv"><span>${basisLbl}</span><span>${cnt(r.sold)}${r.soldPlus ? '+' : ''}</span></div>
        <div class="kv"><span>Penjualan 30 hari</span><span>${r.sold30 != null ? cnt(r.sold30) : '–'}</span></div>
        <div class="kv"><span>Trend 30 hari</span><span>${trendTxt(r.trendPct)}</span></div>
        <h6>Potensi dan Performa</h6>
        <div class="kv"><span>% Market Share</span><span>${r.share != null ? r.share.toFixed(2).replace('.', ',') + '%' : '–'}</span></div>
        <div class="kv"><span>Nilai Ulasan</span><span>${r.rating != null ? '★ ' + r.rating.toFixed(2).replace('.', ',') : '–'}</span></div>
        <div class="kv"><span>Wishlist</span><span>${r.favorit != null ? '❤ ' + cnt(r.favorit) : '–'}</span></div>
        <div class="kv"><span>Nilai Jual Stok</span><span>${r.stock != null && r.price != null ? full(r.stock * r.price) : 'n/a'}</span></div>
      </div></div>`;
    }

    function tableHtml(arr) {
      const cols = [['Produk', null], ['Toko / Lokasi', null], ['Harga', 'price'], ['Stok', null], ['Est. Omset', 'omzet'], ['Terjual', 'sold'], ['Omset 30 hari', 'omzet30'],
        ['Terjual 30 hari', 'sold30'], ['Trend', null], ['% Share', 'share'], ['Rating', 'rating'], ['Wishlist', 'favorit']];
      return '<div class="tbl"><table><thead><tr>' + cols.map((c) => `<th class="${c[1] && c[0] !== 'Produk' ? 'n' : ''}${c[1] === ms.sort ? ' s' : ''}" ${c[1] ? `data-s="${c[1]}"` : ''}>${c[1] === ms.sort ? '↓ ' : ''}${c[0]}</th>`).join('') + '</tr></thead><tbody>' +
        arr.map((r) => `<tr><td><div class="pn">${r.image ? `<img src="${esc(r.image)}">` : ''}<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a></div></td>
        <td>${esc(r.shopName || ('ID ' + r.shopId))}<div style="color:#888;font-size:12px">${esc(r.location || '')}</div></td>
        <td class="n${ms.sort === 'price' ? ' s' : ''}">${rangeTxt(r.price, r.priceMax)}</td><td class="n">${cnt(r.stock)}</td>
        <td class="n${ms.sort === 'omzet' ? ' s' : ''}"><b>${full(r.omzet)}</b></td><td class="n${ms.sort === 'sold' ? ' s' : ''}">${cnt(r.sold)}${r.soldPlus ? '+' : ''}${r.soldMonthly ? ' /bln' : ''}</td>
        <td class="n${ms.sort === 'omzet30' ? ' s' : ''}">${full(r.omzet30)}</td><td class="n${ms.sort === 'sold30' ? ' s' : ''}">${r.sold30 != null ? cnt(r.sold30) : '–'}</td><td class="n">${trendTxt(r.trendPct)}</td>
        <td class="n${ms.sort === 'share' ? ' s' : ''}">${r.share != null ? r.share.toFixed(2).replace('.', ',') + '%' : '–'}</td><td class="n${ms.sort === 'rating' ? ' s' : ''}">${r.rating != null ? '★ ' + r.rating.toFixed(2).replace('.', ',') : '–'}</td>
        <td class="n${ms.sort === 'favorit' ? ' s' : ''}">${r.favorit != null ? cnt(r.favorit) : '–'}</td></tr>`).join('') + '</tbody></table></div>';
    }

    function mdraw() {
      if (!ms.data) return;
      m$('mupd').innerHTML = (ms.data.updatedAt ? 'Terakhir diperbarui ' + fmtDate(ms.data.updatedAt) : '') + ' <a data-a="refresh">Refresh</a>';
      m$('vt').classList.toggle('on', ms.view === 'table'); m$('vg').classList.toggle('on', ms.view === 'grid');
      m$('mfbtn').classList.toggle('on', ms.filter); m$('mfbtn').textContent = ms.filter ? 'Hide Filter' : 'Show Filter';
      m$('mfl').hidden = !ms.filter; m$('msort').value = ms.sort;
      const ct = m$('mct');
      if (ms.busy) { ct.innerHTML = '<div class="busy">Memindai produk… jangan tutup tab.</div>'; return; }
      const arr = mrows();
      if (!arr.length) { ct.innerHTML = '<div class="empty">Belum ada data. Tutup lalu klik “Analisa Detail” untuk memindai.</div>'; return; }
      const part = arr.slice(0, ms.limit);
      ct.innerHTML = (ms.view === 'grid' ? '<div class="grid">' + part.map(gridCard).join('') + '</div>' : tableHtml(part)) +
        (arr.length > part.length ? `<button class="more" data-a="more">Tampilkan lebih banyak (${part.length}/${arr.length})</button>` : `<div style="text-align:center;color:#999;margin-top:14px">${arr.length} produk</div>`);
    }

    function openModal() { ms.data = h.getRows(payload ? payload.kind : 'search'); ms.limit = ms.view === 'grid' ? 48 : 200; m$('ov').hidden = false; if (!mhost.isConnected) document.documentElement.appendChild(mhost); mdraw(); }
    function closeModal() { m$('ov').hidden = true; }

    msr.addEventListener('click', (e) => {
      const v = e.target.closest('[data-v]');
      if (v) { ms.view = v.dataset.v; ms.limit = ms.view === 'grid' ? 48 : 200; mdraw(); return; }
      const s = e.target.closest('[data-s]');
      if (s) { ms.sort = s.dataset.s; m$('msort').value = ms.sort; mdraw(); return; }
      const a = e.target.closest('[data-a]');
      if (!a) { if (e.target.id === 'ov') closeModal(); return; }
      const act = a.dataset.a;
      if (act === 'close') closeModal();
      else if (act === 'filter') { ms.filter = !ms.filter; mdraw(); }
      else if (act === 'more') { ms.limit += ms.view === 'grid' ? 48 : 300; mdraw(); }
      else if (act === 'download') h.onDownload(mrows());
      else if (act === 'refresh') { h.onRefresh(payload ? payload.kind : 'search', true); }
    });
    m$('msort').onchange = (e) => { ms.sort = e.target.value; mdraw(); };
    const nz = (el) => (el.value === '' ? null : Number(el.value));
    m$('fq').oninput = (e) => { ms.f.q = e.target.value; mdraw(); };
    m$('fpmin').oninput = (e) => { ms.f.pmin = nz(e.target); mdraw(); };
    m$('fpmax').oninput = (e) => { ms.f.pmax = nz(e.target); mdraw(); };
    m$('fsold').oninput = (e) => { ms.f.sold = nz(e.target); mdraw(); };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m$('ov').hidden) closeModal(); });

    return {
      render(p) {
        payload = p;
        if (!host.isConnected || placedKind !== p.kind) place();
        draw();
      },
      hide() { payload = null; placedKind = null; host.remove(); draw(); },
      setProgress(p) { prog = p || null; draw(); },
      setBusy(text) { busyText = text || null; ms.busy = !!text && !m$('ov').hidden; draw(); if (!m$('ov').hidden) mdraw(); },
      setLic(l) { L = l; if (L && (!L.enabled || !L.access || L.state === 'lifetime') && plansOpen && L.access) plansOpen = false; },
      setAi(kind, st) { ai = kind ? { kind: kind, st: st } : null; draw(); },
      setLicenseUi(o) { lbusy = o.busy || null; lerr = o.error || null; draw(); },
      openPlans() { plansOpen = true; draw(); },
      closePlans() { plansOpen = false; draw(); },
      openModal: openModal,
      closeModal: closeModal,
      refreshModal() { if (!m$('ov').hidden) { ms.data = h.getRows(payload ? payload.kind : 'search'); mdraw(); } }
    };
  }

  root.SpillInline = { create: create };
})(typeof self !== 'undefined' ? self : this);
