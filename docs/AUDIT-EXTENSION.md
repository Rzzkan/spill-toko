# Marketplace Audit — kontrak extension ↔ halaman ↔ server (v1.3.0)

Alur: halaman `https://temanseller.com/audit` (wajib login Google) → extension membuka tab Shopee latar belakang → mengumpulkan data **di browser pengguna** → mengirim ke server → server menjalankan aturan + AI → halaman menampilkan hasil.

## Komponen
| File | Dunia | Fungsi |
|---|---|---|
| `src/audit-bridge.js` | isolated, `temanseller.com/audit*` | Meneruskan `postMessage` halaman ↔ service worker |
| `src/audit-bg.js` | service worker | Validasi perintah, buka tab `…#ts-audit`, terima hasil, POST ke server, tutup tab |
| `src/audit-hook.js` | MAIN, `shopee.co.id` | Hanya aktif di tab bertanda `#ts-audit`: menyimpan salinan respons API yang diminta halaman Shopee sendiri |
| `src/audit-collect.js` | isolated, `shopee.co.id` | Meminta data dari hook, membentuk payload, deteksi login/verifikasi, lapor |
| `src/audit-parse.js` | murni | Respons Shopee → payload (diuji `node tools/test-audit.js`) |

## Pesan halaman → extension (`window.postMessage`, `source: 'ts-audit-page'`)
- `{type:'ping'}` → dijawab `{source:'ts-audit-ext', type:'pong', v:1}`
- `{type:'start', scanId, token, api, target:{kind, url, shopid, itemid, username}}`
- `{type:'cancel'}`

`api` harus persis `<SITE_URL>/api`; `target.url` harus `https://shopee.co.id/(product/{shop}/{item} | shop/{id} | {username})`; `token` 40 karakter alfanumerik. Selain itu perintah diabaikan.

## Payload ke server — `POST {api}/audit/scans/{id}/data`
Header `X-Audit-Token: <token sekali pakai>`; body JSON:
```json
{"status":"ok|needs_login|error","message":"…",
 "product":{"name","price","price_min","price_max","discount_pct","stock","historical_sold","rating","rating_count","rating_dist":[1..5],"liked_count","images","has_video","description","description_len","category","brand","attributes","variations","free_shipping","cod","wholesale","flash_sale","shop":{"name","rating","followers","response_rate","is_official","is_mall"}},
 "reviews":[{"rating","text"}]}
```
atau untuk toko: `"shop":{name,username,rating,rating_count,followers,response_rate,response_time,joined_days,product_count,is_official,is_mall,description,description_len,location}` + `"products":[{name,price,sold,historical_sold,rating,rating_count,discount_pct,stock}]` (maks 30). Field kosong dibuang; server membuang field yang tidak dikenal dan melewati aturan yang datanya tidak ada.

## Privasi
Tidak ada cookie, token, kata sandi, atau data akun Shopee yang dibaca atau dikirim. Hook hanya menyalin respons publik yang diminta halaman Shopee sendiri di tab audit.

## ⚠️ Belum diuji pada Shopee sungguhan
Bentuk JSON internal Shopee tidak terdokumentasi. `audit-parse.js` memakai beberapa kemungkinan jalur dan fixture buatan sendiri; **uji dengan satu produk dan satu toko nyata sebelum rilis** (lihat data yang dikirim di tab Network ke `/api/audit/scans/…/data`). Bila ada field kosong, sesuaikan jalur di `product()` / `shop()`.
