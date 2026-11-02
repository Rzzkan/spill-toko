# Spill Toko — Riset Produk Shopee (Chrome Extension)

Extension Chrome (Manifest V3) untuk riset produk & toko kompetitor di Shopee Indonesia.
Metode: **scraping tampilan halaman (DOM)** — tidak memakai API Shopee dan tidak mengirim data ke server mana pun.
Semua data tersimpan lokal di browser (`chrome.storage.local`).

## Instal
1. Buka `chrome://extensions`
2. Aktifkan **Developer mode** (kanan atas)
3. Klik **Load unpacked** → pilih folder `spill-toko` ini
4. Buka shopee.co.id (login dulu), klik ikon extension atau tab oranye **SPILL TOKO** di tepi kanan layar

## Lisensi (SaaS)
Extension memakai langganan: login Google → trial 7 hari → Bulanan Rp25.000/30 hari atau Lifetime Rp200.000. Backend PHP + MySQL + Midtrans ada di folder `spill-toko-server` (lihat README di sana). Isi `src/config.js` (`API_BASE`, `GOOGLE_CLIENT_ID`, `LICENSE_PUBKEY`) untuk mengaktifkan; selama kosong, lisensi nonaktif dan semua fitur terbuka. Field `key` di `manifest.json` hanya untuk ID extension yang stabil saat pengembangan — hapus sebelum upload ke Chrome Web Store.

## Tampilan inline (seperti Tokpee Data)
Kartu **Spill Data** tertanam langsung di halaman Shopee:
- **Halaman toko** (di bawah tab Halaman Utama/Produk): tab Ringkasan · Omset · Volume · Informasi Umum · Produk Andalan.
- **Halaman pencarian/kategori** (di atas daftar produk): tab Ringkasan · Market Size · Volume.
- **Halaman produk** (di bawah harga): tab Transaksi · Ulasan · Kompetitor · Varian.
- Tombol **Analisa / Analisa Detail** membuka modal layar penuh (Grid & Table, urutkan, filter, Download CSV). Di halaman toko, tombol ini memindai semua produk toko otomatis (beberapa halaman) lalu kembali ke halaman asal.
- Angka 30 hari & Trend terisi setelah produk yang sama di-scan lagi di hari berbeda (atau langsung bila Shopee menampilkan "terjual/bulan"). Stok & Wishlist terisi untuk produk yang pernah dibuka halaman detailnya.
- Tidak tersedia dari tampilan Shopee: tanggal produk ditambahkan, merek, penjualan per varian (%), iklan, live.

## Fitur panel samping
| Fitur | Cara pakai |
|---|---|
| Riset pencarian & kategori | Buka hasil pencarian/kategori → **Scan halaman ini** (auto-scroll + baca semua kartu) |
| Scan multi-halaman | Isi jumlah halaman (maks 20) → **Scan multi-halaman**; jeda acak 2,5–4,5 dtk antar halaman |
| Estimasi omzet | Harga × jumlah terjual per produk, plus total & median harga |
| Riset toko kompetitor | Buka halaman toko → Scan; muncul ringkasan toko + **produk andalan** (porsi omzet) |
| Tab "Toko" | Mengelompokkan seluruh koleksi per toko → peringkat toko berdasarkan est. omzet |
| Detail produk | Buka produk → **Analisa detail**: rating, stok, distribusi bintang, **% komplain (★1–2)**, pilihan varian, nama toko |
| Tren (Δ) | Scan ulang produk yang sama di hari berbeda → kolom Δ menunjukkan tambahan terjual |
| Grafik omzet per rentang harga | Otomatis muncul jika ≥10 produk |
| Filter & sort | Cari nama/lokasi, min terjual, rentang harga, min omzet; klik header kolom untuk sort |
| Export | **Export CSV** (langsung terbuka rapi di Excel) atau **Salin (Sheets)** untuk paste ke Google Sheets |

## Batasan (jujur)
- Angka terjual di tampilan Shopee dibulatkan ("2,5RB+", "10RB+"), jadi omzet adalah **estimasi batas bawah**, bukan angka pasti.
- Jika kartu menampilkan "terjual/bulan", kolom Terjual diberi label `/bulan`; jika tidak, itu angka total sepanjang masa.
- Penjualan **per varian**, **iklan/bid kompetitor**, dan **live shopping** tidak tampil di halaman Shopee, jadi tidak bisa di-scrape (Tokpee memakai data lain untuk itu).
- Jika Shopee meminta verifikasi/captcha, scan berhenti otomatis — selesaikan manual lalu scan lagi.
- Shopee kadang mengubah tampilan. Parser sengaja tidak bergantung pada class CSS (memakai link `-i.{shopId}.{itemId}` + regex teks), tetapi bila ada kolom kosong, perbaikan ada di `src/parser.js`.
- Gunakan secukupnya (Shopee bisa membatasi akun yang scraping berlebihan). Hanya untuk riset internal.

## Struktur
```
manifest.json      MV3, izin: storage, scripting, clipboardWrite, host shopee.co.id
background.js      klik ikon → buka/tutup panel
src/parser.js      parser DOM (kartu produk, detail produk, info toko)
src/store.js       koleksi + riwayat terjual (untuk Δ)
src/ui.js          panel (Shadow DOM)
src/content.js     scan, auto-scroll, multi-halaman, export
```


## Analisis AI
Di kartu inline ada tab **✨ Analisa AI** (produk, toko, pencarian). Data hasil scrape dikirim ke server Anda, diteruskan ke model di kenari.id, dan hasilnya (skor peluang, temuan, risiko, rekomendasi aksi, kata kunci, saran judul) tampil di kartu. Berjalan otomatis setelah scan selesai bila admin mengaktifkannya; tombol **Analisis ulang** memaksa analisis baru. Semua konfigurasi (API key, model, prompt, kuota) ada di halaman admin web — API key tidak pernah ada di extension. Butuh server lisensi aktif (lihat `spill-toko-server`).
