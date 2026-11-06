// Uji pembaca respons Marketplace Audit: node tools/test-audit.js
// CATATAN: fixture di bawah dibuat sendiri mengikuti bentuk yang dipakai apiparse.js; BELUM dicocokkan dengan respons Shopee langsung.
const A = require('../src/audit-parse.js');
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'OK   ' : 'FAIL ') + name, ok ? '' : '\n   got:  ' + JSON.stringify(got) + '\n   want: ' + JSON.stringify(want)); };

const pdp = { data: {
  item: { item_id: 2, shop_id: 1, title: '  Kebaya Modern   Brokat ', normal_stock: 25, models: [{ normal_stock: 10 }, { normal_stock: 15 }], tier_variations: [{ options: ['S', 'M'] }], can_use_cod: true },
  product_price: { price: { single_value: 18500000000 }, price_before_discount: { single_value: 20555500000 }, raw_discount: 10 },
  product_review: { rating_star: 4.8123, total_rating_count: 120, rating_count: [120, 1, 2, 5, 22, 90], liked_count: 33, historical_sold: 540 },
  product_images: { images: ['a', 'b', 'c', 'd'], video: { id: 'v' } },
  product_attributes: { attrs: [{}, {}, {}] },
  product_detail: { description: 'x'.repeat(650), categories: [{ display_name: 'Fashion Wanita' }, { display_name: 'Kebaya' }], brand: 'Delova' },
  shop_detailed: { name: 'Delova Store', rating_star: 4.9, follower_count: 2500, response_rate: 97, is_official_shop: false, is_shopee_verified: true }
} };
const p = A.product(pdp).product;
eq('produk: judul dirapikan', p.name, 'Kebaya Modern Brokat');
eq('produk: harga', p.price, 185000);
eq('produk: diskon', p.discount_pct, 10);
eq('produk: stok', p.stock, 25);
eq('produk: terjual', p.historical_sold, 540);
eq('produk: rating', p.rating, 4.81);
eq('produk: distribusi', p.rating_dist, [1, 2, 5, 22, 90]);
eq('produk: foto & video', [p.images, p.has_video], [4, true]);
eq('produk: deskripsi', p.description_len, 650);
eq('produk: kategori', p.category, 'Fashion Wanita > Kebaya');
eq('produk: variasi', p.variations, 2);
eq('produk: atribut', p.attributes, 3);
eq('produk: toko', [p.shop.name, p.shop.followers, p.shop.is_mall], ['Delova Store', 2500, true]);
eq('produk: cod', p.cod, true);
eq('produk tanpa item -> null', A.product({ data: {} }), null);
eq('produk: cadangan DOM', A.product({ data: { item: { title: 'X' } } }, { description_len: 300, images: 5 }).product.description_len, 300);

const shopJson = { data: { name: 'Delova Store', account: { username: 'delova.id' }, rating_star: 4.9, follower_count: 2500, response_rate: 97, response_time: 3600, item_count: 42,
  is_shopee_verified: true, description: 'Toko kebaya', ctime: Math.floor(Date.now() / 1000) - 86400 * 400, shop_location: 'Bantul' } };
const cards = [{ name: 'Kebaya A', price: 100000, sold: 12, rating: 4.9, ratingCount: 10, discount: 5 }, { name: '', price: 1 }];
const s = A.shop(shopJson, cards);
eq('toko: nama & username', [s.shop.name, s.shop.username], ['Delova Store', 'delova.id']);
eq('toko: waktu balas', s.shop.response_time, '60 menit');
eq('toko: usia toko (hari)', s.shop.joined_days, 400);
eq('toko: produk (nama kosong dibuang)', s.products.length, 1);
eq('toko: produk terjual', s.products[0].sold, 12);
eq('toko tanpa nama -> null', A.shop({ data: {} }, []), null);
eq('compact membuang kosong', A.compact({ a: null, b: '', c: 1, d: { e: null, f: 2 } }), { c: 1, d: { f: 2 } });

console.log(fail ? '\n' + fail + ' GAGAL' : '\nsemua lolos');
process.exit(fail ? 1 : 0);
