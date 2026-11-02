// Data CONTOH (fiktif) untuk tangkapan layar pratinjau. Bukan data toko nyata.
(function () {
  const pal = [['#ffb199', '#ff6a5a'], ['#c3b1e1', '#7c5cbf'], ['#a8e6cf', '#3fa07c'], ['#ffe29a', '#f2a900'], ['#9ec9ff', '#3a7bd5'], ['#f7b6d2', '#d6457d']];
  const svg = (i, kind) => {
    const [a, b] = pal[i % pal.length];
    const shape = kind === 'dress' ? '<path d="M70 28 L90 28 L98 52 L112 140 L48 140 L62 52Z" fill="#fff" fill-opacity=".85"/>' :
      kind === 'scarf' ? '<path d="M40 40 Q80 10 120 40 L110 130 Q80 150 50 130Z" fill="#fff" fill-opacity=".85"/>' :
        '<path d="M50 40 L70 30 L90 30 L110 40 L124 66 L106 76 L100 62 L100 136 L60 136 L60 62 L54 76 L36 66Z" fill="#fff" fill-opacity=".85"/>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="170" viewBox="0 0 160 170"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="160" height="170" fill="url(#g)"/>${shape}</svg>`);
  };
  const names = [['Kebaya Modern Brokat Wanita Premium', 'dress', 289000, 3200], ['Dress Batik Couple Keluarga Set', 'dress', 349000, 2100], ['Hijab Segi Empat Voal Motif Premium', 'scarf', 59000, 9800],
    ['Blouse Tenun Etnik Lengan Panjang', 'top', 159000, 2650], ['Gamis Anak Perempuan Katun Adem', 'dress', 129000, 4100], ['Outer Kimono Batik Cardigan', 'top', 189000, 1200],
    ['Rok Plisket Panjang Jumbo', 'dress', 99000, 3500], ['Pashmina Instan Ceruty Babydoll', 'scarf', 45000, 12400], ['Kemeja Batik Pria Slimfit', 'top', 175000, 1800],
    ['Tunik Polos Crinkle Airflow', 'top', 119000, 2900], ['Setelan Kebaya Kutubaru Anak', 'dress', 169000, 1500], ['Bergo Jersey Premium Tanpa Pet', 'scarf', 39000, 15400]];
  const loc = ['Kota Yogyakarta', 'Kab. Bantul', 'Kota Surakarta', 'Kab. Sleman'];
  const rows = names.map((n, i) => {
    const sold = n[3], price = n[2], omzet = sold * price, sold30 = Math.round(sold * (0.07 + (i % 5) * 0.012));
    return { name: n[0], url: '#', image: svg(i, n[1]), shopName: i % 3 ? 'Toko Contoh Fashion' : 'Butik Nusantara', shopId: 100 + i, location: loc[i % 4], price: price, priceMax: i % 4 === 0 ? price + 40000 : null,
      stock: 120 + i * 47, sold: sold, soldPlus: sold > 10000, omzet: omzet, sold30: sold30, omzet30: sold30 * price, trendPct: [12.4, -3.2, 28.1, 5.6, -8.7, 17.3][i % 6], rating: 4.6 + (i % 4) * 0.1,
      favorit: 800 + i * 321, discount: i % 3 ? 15 : null, badges: i % 2 ? ['Star'] : [] };
  });
  const tot = rows.reduce((s, r) => s + r.omzet, 0);
  rows.forEach((r) => { r.share = (r.omzet / tot) * 100; });
  const top = rows.slice().sort((a, b) => b.omzet - a.omzet).slice(0, 7);
  const stats = { priceMin: 39000, priceMax: 389000, have30: true, sold30: 7413, soldTrend: 11.8, omzet30: 842650000, omzetTrend: 9.4, basisSold: 61200, basisOmzet: 7.9e9, hasTotal: true,
    totalOmzet: 7.9e9, totalSold: 61200, avgOmzet: 263000000, avgSold: 2040, count: 142, top: top, top10share: 61.3, medianSold: 740 };
  const info = { joined: '3 tahun lalu', products: 142, followersText: '48,2RB', followers: 48200, rating: 4.9, ratingCountText: '21,3RB', chatText: '± 5 menit' };
  const sc = ['shop', 'search', 'product'].reduce((o, k) => (o[k] = 1, o), {});
  const shot = {
    shop: { kind: 'shop', data: { updatedAt: Date.now() - 6 * 60000, stats: stats, info: info, scanned: 142 } },
    search: { kind: 'search', data: { updatedAt: Date.now() - 3 * 60000, stats: stats, scanned: 142 } },
    product: { kind: 'product', data: { updatedAt: Date.now() - 2 * 60000, detail: { price: 289000, priceMax: 329000, stock: 640, rating: 4.9, ratingCount: 3120, shopName: 'Toko Contoh Fashion', shopUrl: '#', favorit: 5120, omzet: 925000000, sold: 3200,
      complaintPct: 1.4, stars: { 5: 2810, 4: 240, 3: 48, 2: 14, 1: 8 }, variants: [{ name: 'Warna', options: ['Dusty Pink', 'Sage', 'Hitam', 'Maroon'] }, { name: 'Ukuran', options: ['S', 'M', 'L', 'XL'] }] },
      rate: { omzet: 71800000, sold: 248 }, trendPct: 12.4, competitors: top.slice(0, 5) } }
  };
  const analysis = { skor: 82, label: 'Potensial', ringkasan: 'Toko ini kuat di kategori kebaya dan batik keluarga. Omzet 30 hari naik 9,4% dan tidak bergantung pada satu produk saja.',
    temuan: ['Top 10 produk menyumbang 61,3% omzet', 'Hijab dan scarf punya volume terbesar dengan harga di bawah Rp60 rb', 'Produk couple/keluarga punya nilai transaksi tertinggi'],
    peluang: ['Paket set keluarga dengan harga Rp300–400 rb', 'Ukuran jumbo masih sedikit pesaing'], risiko: ['Rating turun jika stok varian populer habis', 'Harga kebaya brokat mulai ditekan pesaing'],
    rekomendasi: [{ prioritas: 'tinggi', aksi: 'Buat bundling set keluarga', alasan: 'Nilai transaksi paling tinggi di toko' }, { prioritas: 'sedang', aksi: 'Perbarui foto utama produk terlaris', alasan: 'Konversi bergantung pada visual pertama' }, { prioritas: 'rendah', aksi: 'Tambahkan varian ukuran jumbo', alasan: 'Pesaing sedikit' }],
    kata_kunci: ['kebaya modern', 'batik couple', 'gamis anak', 'hijab voal premium'], saran_judul: ['Kebaya Modern Brokat Wanita Premium Kondangan Wisuda Lamaran', 'Dress Batik Couple Keluarga Set Ayah Ibu Anak Seragam Lebaran'], model: 'AI' };
  const lic = { enabled: true, access: true, state: 'trial', daysLeft: 3, ai: { enabled: true, limit: 20, used: 3 }, plans: {} };
  window.DEMO = { shot, rows, analysis, lic };
  const grid = document.getElementById('prods');
  grid.innerHTML = rows.slice(0, 5).map((r) => `<div class="p"><div class="im" style="background:url('${r.image}') center/cover"></div><div class="t">${r.name}<div class="pr">Rp${new Intl.NumberFormat('id-ID').format(r.price)}</div></div></div>`).join('');
  const h = { getRows: () => ({ rows: rows, updatedAt: Date.now() - 6 * 60000 }), onLicense() {}, onAnalyze() {}, onAi() {}, onRefresh() {}, onPanel() {}, onMulti() {}, onDownload() {} };
  window.UI = SpillInline.create(h);
  window.show = (kind) => { UI.setLic(lic); UI.render(shot[kind]); };
})();
