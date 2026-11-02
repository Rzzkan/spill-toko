// Konfigurasi lisensi (SaaS). Isi setelah backend di-deploy.
// Selama API_BASE / GOOGLE_CLIENT_ID / LICENSE_PUBKEY kosong, sistem lisensi NONAKTIF dan semua fitur terbuka (mode pengembangan).
self.SPILL_CONFIG = {
  // URL endpoint API, mis. 'https://spilltoko.com/api/index.php'
  API_BASE: '',
  // OAuth Client ID tipe "Web application" dari Google Cloud Console
  GOOGLE_CLIENT_ID: '',
  // Hasil `php tools/keygen.php` (LICENSE_PUBKEY) - aman dipublikasikan
  LICENSE_PUBKEY: '',
  // Hanya untuk pengujian otomatis; biarkan kosong di produksi
  DEV_ID_TOKEN: '',
  DEV_NONCE: ''
};
