// Uji regresi parser kartu produk (harga "Rp" terpisah dari angka, rentang harga, terjual). Jalankan: node tools/test-parser.js
const { chromium } = require('playwright');
const path = require('path');
const cases = {
  flexSplit: [`<a href="/x-i.1.11"><div><img src="https://a/x.jpg"><div>Kebaya Modern Brokat Premium Wanita</div><div style="display:flex"><span>Rp</span><span>150.000</span></div><div>2,5RB terjual</div></div></a>`, 150000, null, 2500],
  blockSplit: [`<a href="/x-i.1.12"><div><div>Gamis Anak Katun Adem Premium</div><div><div>Rp</div><div>99.000</div></div><div>Terjual 1,2RB</div></div></a>`, 99000, null, 1200],
  rangeSplit: [`<a href="/x-i.1.13"><div><div>Set Batik Couple Keluarga Lengkap</div><div style="display:flex"><span>Rp</span><span>120.000</span><span>-</span><span>Rp</span><span>180.000</span></div><div>800 terjual</div></div></a>`, 120000, 180000, 800],
  inline: [`<a href="/x-i.1.14"><div><div>Hijab Segi Empat Voal Premium Motif</div><div>Rp59.000</div><div>9RB+ terjual</div></div></a>`, 59000, null, 9000]
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); let bad = 0;
  await p.setContent('<body><div id=c></div></body>');
  await p.addScriptTag({ path: path.resolve(__dirname, '../src/parser.js') });
  for (const [k, [html, price, max, sold]] of Object.entries(cases)) {
    await p.evaluate((h) => { document.getElementById('c').innerHTML = h; }, html);
    const r = (await p.evaluate(() => SpillParser.parseAll(document)))[0] || {};
    const ok = r.price === price && (r.priceMax ?? null) === max && r.sold === sold;
    if (!ok) bad++;
    console.log(ok ? 'OK  ' : 'GAGAL', k, JSON.stringify({ price: r.price, priceMax: r.priceMax, sold: r.sold }));
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
