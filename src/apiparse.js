/* Shofee - pembaca respons API internal Shopee (search_items, shop/rcmd_items, pdp/get_pc, rekomendasi).
 * Dimuat di dunia halaman (MAIN) oleh hook.js; juga bisa di-require untuk pengujian (Node). Hanya fungsi murni. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SpillApi = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const UNIT = 1e5; // harga Shopee dikirim dalam satuan ×100.000
  const num = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
  const str = (x, n) => (typeof x === 'string' ? x.slice(0, n || 200) : '');
  const img = (h) => (!h || typeof h !== 'string' ? '' : /^https?:/.test(h) ? h : 'https://down-id.img.susercontent.com/file/' + h);

  function fromCard(o, asset) {
    const ds = o.item_card_display_sold_count || {};
    const dp = o.item_card_display_price || {};
    const a = o.item_card_displayed_asset || asset || {};
    const shopId = String(o.shopid != null ? o.shopid : o.shop_id), itemId = String(o.itemid != null ? o.itemid : o.item_id);
    if (!/^\d+$/.test(shopId) || !/^\d+$/.test(itemId)) return null;

    let price = num(dp.price) != null && dp.price > 0 ? dp.price / UNIT : null;
    let priceMax = null;
    let sold = num(ds.historical_sold_count), api30 = num(ds.monthly_sold_count);
    // skema "rounded_*" (halaman toko / SSR): total & 30 hari pasti pada kolom berbeda
    if (!sold) sold = num(ds.rounded_global_historical_sold_count) || num(ds.rounded_local_historical_sold_count) || num(ds.rounded_display_sold_count) || num(ds.display_sold_count) || sold;
    if (!api30) api30 = num(ds.rounded_local_monthly_sold_count) || api30;
    // skema lama (item_basic)
    if (o.historical_sold != null || o.price_min != null) {
      if (sold == null) sold = num(o.historical_sold);
      // catatan: item_basic.sold (skema lama) sudah tidak berisi penjualan 30 hari (selalu 0), jadi tidak dipakai
      if (price == null && num(o.price_min) != null) price = o.price_min / UNIT;
      if (num(o.price_max) != null && o.price_max > o.price_min) priceMax = o.price_max / UNIT;
      if (price == null && num(o.price) != null) price = o.price / UNIT;
    }
    // Beberapa API (mis. halaman toko) mengirim 0 padahal produk laku ribuan: 0 dianggap "tidak diketahui", bukan terjual 0.
    if (sold === 0) { sold = null; if (api30 === 0) api30 = null; }
    if (sold == null && price == null && !a.name && !o.name) return null;

    const rc = o.item_rating && Array.isArray(o.item_rating.rating_count) ? num(o.item_rating.rating_count[0]) : null;
    let rating = o.item_rating ? num(o.item_rating.rating_star) : null;
    if (!rating && a.rating && a.rating.rating_text) rating = parseFloat(String(a.rating.rating_text).replace(',', '.')) || null;
    const shop = o.shop_data || {};
    const mid = priceMax && price != null ? (price + priceMax) / 2 : price;
    return {
      key: shopId + '.' + itemId, shopId: shopId, itemId: itemId,
      url: 'https://shopee.co.id/product/' + shopId + '/' + itemId,
      name: str(a.name || o.name, 200), image: img(a.image || (a.images && a.images[0]) || o.image),
      price: price, priceMax: priceMax,
      sold: sold, soldMonthly: false, soldPlus: false, api30: api30,
      omzet: mid != null && sold != null ? mid * sold : null,
      rating: rating ? Math.round(rating * 10) / 10 : null, ratingCount: rc,
      favorit: num(o.liked_count), location: str(a.shop_location || shop.shop_location || o.shop_location, 60),
      shopName: str(shop.shop_name || o.shop_name, 80),
      discount: num(dp.discount) || null, ctime: num(o.ctime),
      via: 'api'
    };
  }

  // Telusuri seluruh JSON; objek berisi itemid+shopid dan data penjualan/harga dianggap kartu produk.
  function cards(json) {
    const out = new Map();
    (function walk(node, asset, depth) {
      if (!node || typeof node !== 'object' || depth > 9 || out.size >= 400) return;
      if (Array.isArray(node)) { for (let i = 0; i < node.length && i < 400; i++) walk(node[i], asset, depth + 1); return; }
      const a = node.item_card_displayed_asset || asset;
      const hasId = (node.itemid != null && node.shopid != null) || (node.item_id != null && node.shop_id != null && node.item_card_display_price);
      if (hasId && (node.item_card_display_sold_count || node.item_card_display_price || node.historical_sold != null)) {
        const c = fromCard(node, a);
        if (c && !out.has(c.key)) out.set(c.key, c);
      }
      const ks = Object.keys(node);
      for (let i = 0; i < ks.length; i++) {
        const v = node[ks[i]];
        if (v && typeof v === 'object') walk(v, a, depth + 1);
      }
    })(json, null, 0);
    return Array.from(out.values());
  }

  // /api/v4/pdp/get_pc : detail produk. Jumlah terjual di sini dibulatkan ("7RB+"), jadi tidak dipakai sebagai angka pasti.
  function pdp(json) {
    const d = json && json.data;
    if (!d || !d.item) return null;
    const it = d.item, rv = d.product_review || {};
    const shopId = String(it.shop_id), itemId = String(it.item_id);
    if (!/^\d+$/.test(shopId) || !/^\d+$/.test(itemId)) return null;
    const pr = d.product_price && d.product_price.price;
    let price = null, priceMax = null;
    if (pr) {
      if (num(pr.single_value) != null && pr.single_value > 0) price = pr.single_value / UNIT;
      else if (num(pr.range_min) != null) { price = pr.range_min / UNIT; if (num(pr.range_max) != null && pr.range_max > pr.range_min) priceMax = pr.range_max / UNIT; }
    }
    const exact = num(rv.historical_sold) != null ? rv.historical_sold : null;
    // stok & penjualan per varian (bila Shopee menyertakannya di respons halaman produk)
    const models = Array.isArray(it.models) ? it.models : (Array.isArray(d.models) ? d.models : []);
    const mstock = function (m) { const v = num(m.normal_stock) != null ? m.normal_stock : num(m.stock); return v; };
    let stock = num(it.normal_stock) != null ? it.normal_stock : num(it.stock);
    if (stock == null && models.length) { let sum = 0, any = false; models.forEach(function (m) { const v = mstock(m); if (v != null) { sum += v; any = true; } }); if (any) stock = sum; }
    const tiers = Array.isArray(it.tier_variations) ? it.tier_variations : (Array.isArray(d.tier_variations) ? d.tier_variations : []);
    let variantSales = null;
    if (tiers.length && models.length) {
      const out = [];
      tiers.forEach(function (t, ti) {
        const opts = Array.isArray(t.options) ? t.options : [];
        const rows = opts.map(function (o, oi) {
          let sold = 0;
          models.forEach(function (m) {
            const idx = (m.extinfo && m.extinfo.tier_index) || m.tier_index;
            const ms = num(m.sold) != null ? m.sold : num(m.historical_sold);
            if (Array.isArray(idx) && idx[ti] === oi && ms != null) sold += ms;
          });
          return { o: str(o, 40), sold: sold };
        });
        if (rows.some(function (r) { return r.sold > 0; })) out.push({ name: str(t.name, 30), opts: rows.slice(0, 40) });
      });
      if (out.length) variantSales = out;
    }
    return {
      stock: stock, variantSales: variantSales, schema: Object.keys(it).slice(0, 80),
      key: shopId + '.' + itemId, shopId: shopId, itemId: itemId, name: str(it.title, 200),
      price: price, priceMax: priceMax, rating: num(rv.rating_star) != null ? Math.round(rv.rating_star * 10) / 10 : null,
      ratingCount: num(rv.total_rating_count), favorit: num(rv.liked_count), ctime: num(it.ctime),
      soldExact: exact, soldDisplay: str(rv.historical_sold_display, 20)
    };
  }

  return { cards: cards, pdp: pdp, fromCard: fromCard };
});
