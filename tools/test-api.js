// Uji pembaca respons API Shopee: node tools/test-api.js
const A = require('../src/apiparse.js');
let fail = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'OK   ' : 'FAIL ') + name, ok ? '' : JSON.stringify(got) + ' != ' + JSON.stringify(want)); };

// bentuk search_items (items[].item_data + item_card_displayed_asset di level items[])
const search = { items: [
  { item_card_displayed_asset: { name: 'Hanbai Kids Study Tab A15', shop_location: 'Bekasi', image: 'id-111-abc', rating: { rating_text: '4.4' }, sold_count: { text: '3RB+ terjual' } },
    item_data: { itemid: 111, shopid: 222, item_card_display_price: { price: 97999900000, discount: 50 },
      item_card_display_sold_count: { historical_sold_count: 3126, monthly_sold_count: 63 }, liked_count: 10, item_rating: { rating_star: 4.43, rating_count: [900, 1, 2, 3, 4, 890] } } },
  { item_basic: null, itemid: 999 }
] };
const c = A.cards(search);
eq('search: jumlah kartu', c.length, 1);
eq('search: key', c[0].key, '222.111');
eq('search: harga', c[0].price, 979999);
eq('search: total terjual pasti', c[0].sold, 3126);
eq('search: terjual 30 hari', c[0].api30, 63);
eq('search: omzet total', Math.round(c[0].omzet), 979999 * 3126);
eq('search: nama dari asset', c[0].name, 'Hanbai Kids Study Tab A15');
eq('search: lokasi', c[0].location, 'Bekasi');
eq('search: via', c[0].via, 'api');
eq('search: ratingCount', c[0].ratingCount, 900);

// bentuk shop/rcmd_items (kartu langsung di centralize_item_card.item_cards)
const shop = { data: { centralize_item_card: { item_cards: [
  { itemid: 5, shopid: 6, item_card_display_price: { price: 17900000000 }, item_card_display_sold_count: { historical_sold_count: 12, monthly_sold_count: 3 },
    shop_data: { shop_name: 'Delova', shop_location: 'KAB. BANTUL' }, item_card_displayed_asset: { name: 'Blouse Lace' }, item_rating: { rating_star: 4.9, rating_count: [10] } }
] } } };
const s = A.cards(shop);
eq('toko: key & 30 hari', [s[0].key, s[0].api30, s[0].sold, s[0].price], ['6.5', 3, 12, 179000]);
eq('toko: nama toko', s[0].shopName, 'Delova');

// skema lama item_basic
const legacy = { items: [{ item_basic: { itemid: 7, shopid: 8, name: 'Legacy', historical_sold: 50, sold: 9, price_min: 10000000000, price_max: 20000000000 } }] };
const l = A.cards(legacy);
eq('lama: field (30 hari tidak dipakai)', [l[0].key, l[0].sold, l[0].api30, l[0].price, l[0].priceMax], ['8.7', 50, null, 100000, 200000]);

// pdp
const pdp = A.pdp({ data: { item: { item_id: 22473207972, shop_id: 198876985, title: 'Obi', ctime: 1689005332 },
  product_price: { price: { range_min: 4200000000, range_max: 5200000000, single_value: -1 } },
  product_review: { total_rating_count: 2636, liked_count: 8470, rating_star: 4.88, historical_sold: null, historical_sold_display: '7RB+' } } });
eq('pdp: field', [pdp.key, pdp.price, pdp.priceMax, pdp.ratingCount, pdp.favorit, pdp.soldExact, pdp.soldDisplay], ['198876985.22473207972', 42000, 52000, 2636, 8470, null, '7RB+']);

eq('json kosong', A.cards({}).length, 0);
eq('pdp tanpa item', A.pdp({ data: {} }), null);
const pv = A.pdp({ data: { item: { item_id: 2, shop_id: 1, title: 'V', stock: 1483,
  tier_variations: [{ name: 'Warna', options: ['Pink'] }, { name: 'Ukuran', options: ['100', '110'] }],
  models: [{ extinfo: { tier_index: [0, 0] }, sold: 30, normal_stock: 5 }, { extinfo: { tier_index: [0, 1] }, sold: 70, normal_stock: 5 }] } } });
eq('pdp: stok', pv.stock, 1483);
eq('pdp: varian %', JSON.stringify(pv.variantSales), JSON.stringify([{ name: 'Warna', opts: [{ o: 'Pink', sold: 100 }] }, { name: 'Ukuran', opts: [{ o: '100', sold: 30 }, { o: '110', sold: 70 }] }]));
const ssr = A.pdp({ data: { item: { item_id: 25082469347, shop_id: 33464234, title: 'SSR', ctime: 1718870970, stock: null, historical_sold: null, models: [{ stock: 10, sold: null, normal_stock: null }] }, product_price: null, product_review: { historical_sold: null, historical_sold_display: '1RB+', rating_star: null } } });
eq('pdp SSR (banyak null): ctime & tanpa galat', [ssr.key, ssr.ctime, ssr.soldExact, ssr.soldDisplay, ssr.price], ['33464234.25082469347', 1718870970, null, '1RB+', null]);
const pv2 = A.pdp({ data: { item: { item_id: 3, shop_id: 1, title: 'W', models: [{ normal_stock: 4 }, { normal_stock: 6 }] } } });
eq('pdp: stok dari jumlah model, tanpa varian', [pv2.stock, pv2.variantSales], [10, null]);
if (fail) { console.log(fail + ' GAGAL'); process.exit(1); } console.log('Semua lolos');
