// Membuat tangkapan layar pratinjau dari UI extension asli (src/inline.js) dengan data contoh.
const { chromium } = require('playwright');
const path = require('path');
const out = process.argv[2] || './out';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1240, height: 1180 }, deviceScaleFactor: 1.5 });
  await p.goto('file://' + path.resolve(__dirname, 'demo.html'));
  const card = async (name, pad = 14) => {
    const bb = await p.locator('#spill-inline-host').boundingBox();
    await p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 88, clip: { x: Math.max(0, bb.x - pad), y: Math.max(0, bb.y - pad), width: Math.min(1240, bb.width + pad * 2), height: bb.height + pad * 2 } });
  };
  const tab = async (t) => { await p.locator(`#spill-inline-host >> [data-tab="${t}"]`).click(); await p.waitForTimeout(150); };
  const shotAI = async (kind) => { await p.evaluate((k) => UI.setAi(k, { status: 'ok', analysis: DEMO.analysis, at: Math.floor(Date.now() / 1000) - 60, cached: false }), kind); };

  // 1. Kartu halaman toko: Ringkasan, Omset, Produk Andalan, Analisa AI
  await p.evaluate(() => show('shop')); await p.waitForTimeout(300);
  await card('toko-ringkasan');
  await tab('andalan'); await card('toko-produk-andalan');
  await tab('ai'); await shotAI('shop'); await p.waitForTimeout(200); await card('toko-analisa-ai');
  // 2. Halaman produk
  await p.evaluate(() => { UI.setAi(null); show('product'); }); await p.waitForTimeout(300);
  await card('produk-transaksi');
  await tab('ulasan'); await card('produk-ulasan');
  // 3. Pencarian
  await p.evaluate(() => show('search')); await p.waitForTimeout(300); await tab('market'); await card('pencarian-market');
  // 4. Modal Analisa Detail
  await p.evaluate(() => { show('shop'); UI.openModal(); }); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/analisa-detail-grid.jpg`, type: 'jpeg', quality: 88 });
  await p.locator('#spill-modal-host >> [data-v="table"]').click(); await p.locator('#spill-modal-host >> #mfbtn').click(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/analisa-detail-tabel.jpg`, type: 'jpeg', quality: 88 });
  await b.close();
})();
