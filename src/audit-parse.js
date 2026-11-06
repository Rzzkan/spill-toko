/* Marketplace Audit - pembaca respons Shopee -> payload audit. Fungsi murni (dipakai di halaman & diuji di Node).
 * PENTING: bentuk JSON internal Shopee tidak terdokumentasi dan bisa berubah. Tiap field dicari lewat beberapa kemungkinan jalur
 * (pick) dan dibiarkan kosong bila tidak ketemu; server melewati aturan yang datanya tidak ada. Perbarui PATHS bila Shopee berubah. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SpillAudit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const UNIT = 1e5;
  const num = (x) => (typeof x === 'number' && isFinite(x) ? x : (typeof x === 'string' && x.trim() !== '' && isFinite(+x) ? +x : null));
  const str = (x, n) => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim().slice(0, n || 300) : '');
  const get = (o, p) => { let c = o; for (const k of p.split('.')) { if (c == null || typeof c !== 'object') return undefined; c = c[k]; } return c; };
  const pick = (o, paths) => { for (const p of paths) { const v = get(o, p); if (v !== undefined && v !== null && v !== '') return v; } return null; };
  const price = (v) => (num(v) != null && v > 0 ? Math.round((v / UNIT) * 100) / 100 : null);
  const bool = (v) => (v == null ? null : !!v);

  /** Cari nilai pertama bernama key (kedalaman terbatas) - cadangan bila jalur tetap tidak cocok. */
  function deep(o, key, depth) {
    if (!o || typeof o !== 'object' || (depth || 0) > 7) return null;
    if (Object.prototype.hasOwnProperty.call(o, key) && o[key] != null) return o[key];
    const ks = Object.keys(o);
    for (let i = 0; i < ks.length && i < 60; i++) { const r = deep(o[ks[i]], key, (depth || 0) + 1); if (r != null) return r; }
    return null;
  }

  /** @param pdpJson respons /api/v4/pdp/get_pc  @param extra {description_len?, images?} dari DOM (cadangan) */
  function product(pdpJson, extra) {
    const d = pdpJson && pdpJson.data;
    const it = d && d.item;
    if (!it) return null;
    extra = extra || {};
    const pr = get(d, 'product_price.price') || {};
    const rv = d.product_review || {};
    const before = get(d, 'product_price.price_before_discount');
    const single = num(pr.single_value) != null && pr.single_value > 0 ? pr.single_value : num(pr.range_min);
    const beforeV = before && num(before.single_value) ? before.single_value : (before && num(before.range_min) ? before.range_min : null);
    let disc = num(get(d, 'product_price.raw_discount'));
    if (disc == null && single && beforeV && beforeV > single) disc = Math.round((1 - single / beforeV) * 100);
    const imgs = pick(d, ['product_images.images', 'item.images']);
    const video = pick(d, ['product_images.video', 'item.video_info_list', 'video_info_list']);
    const attrs = pick(d, ['product_attributes.attrs', 'item.attributes']);
    const models = Array.isArray(it.models) ? it.models : (Array.isArray(d.models) ? d.models : []);
    const tiers = Array.isArray(it.tier_variations) ? it.tier_variations : (Array.isArray(d.tier_variations) ? d.tier_variations : []);
    const cats = pick(d, ['product_detail.categories', 'item.categories', 'categories']);
    const desc = pick(d, ['product_detail.description', 'item.description', 'description']);
    const shop = pick(d, ['shop_detailed', 'shop', 'shop_info']) || {};
    let stock = num(it.normal_stock) != null ? it.normal_stock : num(it.stock);
    if (stock == null && models.length) { let s = 0, any = false; models.forEach((m) => { const v = num(m.normal_stock) != null ? m.normal_stock : num(m.stock); if (v != null) { s += v; any = true; } }); if (any) stock = s; }
    const dist = Array.isArray(rv.rating_count) ? rv.rating_count.slice(1, 6) : null;
    const total = num(rv.total_rating_count) != null ? rv.total_rating_count : (Array.isArray(rv.rating_count) ? num(rv.rating_count[0]) : null);
    const descText = typeof desc === 'string' ? desc : '';
    const p = {
      name: str(it.title, 300),
      price: price(single), price_min: price(pr.range_min), price_max: price(pr.range_max),
      discount_pct: disc,
      stock: stock, sold: null, historical_sold: num(rv.historical_sold),
      rating: num(rv.rating_star) != null ? Math.round(rv.rating_star * 100) / 100 : null, rating_count: total, rating_dist: dist, liked_count: num(rv.liked_count),
      images: Array.isArray(imgs) ? imgs.length : num(extra.images),
      has_video: video == null ? null : (Array.isArray(video) ? video.length > 0 : !!video),
      description: descText ? str(descText, 1500) : null,
      description_len: descText ? descText.length : num(extra.description_len),
      category: Array.isArray(cats) ? cats.map((c) => str(c.display_name || c.name || '', 40)).filter(Boolean).join(' > ') : null,
      brand: str(pick(d, ['product_detail.brand', 'item.brand']) || '', 80) || null,
      attributes: Array.isArray(attrs) ? attrs.length : null,
      variations: models.length ? models.length : (tiers.length ? tiers.reduce((a, t) => a * Math.max(1, (t.options || []).length), 1) : null),
      free_shipping: bool(pick(d, ['product_shipping.free_shipping', 'item.show_free_shipping', 'item.is_free_shipping'])),
      cod: bool(pick(d, ['item.can_use_cod'])), wholesale: bool(pick(d, ['item.wholesale_tier_list.length'])) || null,
      flash_sale: bool(pick(d, ['item.flash_sale', 'flash_sale'])),
      shop: {
        name: str(shop.name || shop.shop_name || '', 100) || null, rating: num(shop.rating_star), followers: num(shop.follower_count),
        response_rate: num(shop.response_rate), is_official: bool(shop.is_official_shop), is_mall: bool(shop.is_shopee_verified || shop.is_mall)
      }
    };
    return { product: p, reviews: [] };
  }

  /** @param detailJson /api/v4/shop/get_shop_detail  @param cards hasil SpillApi.cards (produk halaman pertama) */
  function shop(detailJson, cards) {
    const d = detailJson && (detailJson.data || detailJson);
    if (!d || !(d.name || d.shop_name)) return null;
    const s = {
      name: str(d.name || d.shop_name, 100), username: str(d.account && d.account.username || d.username || '', 60) || null,
      rating: num(d.rating_star), rating_count: num(d.rating_normal) != null ? (num(d.rating_normal) + (num(d.rating_good) || 0) + (num(d.rating_bad) || 0)) : null,
      followers: num(d.follower_count), response_rate: num(d.response_rate), response_time: num(d.response_time) != null ? Math.round(d.response_time / 60) + ' menit' : null,
      joined_days: num(d.ctime) ? Math.max(0, Math.round((Date.now() / 1000 - d.ctime) / 86400)) : null,
      product_count: num(d.item_count), is_official: bool(d.is_official_shop), is_mall: bool(d.is_shopee_verified),
      description: str(d.description || '', 1000) || null, description_len: typeof d.description === 'string' ? d.description.length : null,
      location: str(d.shop_location || d.place || '', 80) || null
    };
    const products = (cards || []).slice(0, 30).map((c) => ({
      name: str(c.name, 200), price: c.price, sold: c.sold, historical_sold: c.sold, rating: c.rating, rating_count: c.ratingCount, discount_pct: c.discount
    })).filter((x) => x.name);
    return { shop: s, products: products };
  }

  /** Buang field kosong agar payload kecil. */
  function compact(o) {
    if (Array.isArray(o)) return o.map(compact);
    if (o && typeof o === 'object') { const r = {}; Object.keys(o).forEach((k) => { const v = compact(o[k]); if (v !== null && v !== undefined && v !== '') r[k] = v; }); return r; }
    return o;
  }

  return { product: product, shop: shop, compact: compact, deep: deep };
});
