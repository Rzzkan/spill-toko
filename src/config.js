// Konfigurasi lisensi (SaaS). Isi setelah backend di-deploy.
// Selama API_BASE / GOOGLE_CLIENT_ID / LICENSE_PUBKEY kosong, sistem lisensi NONAKTIF dan semua fitur terbuka (mode pengembangan).
self.SPILL_CONFIG = {
  // URL endpoint API, server: https://hipmibantul.site
  API_BASE: 'https://hipmibantul.site/api/index.php',
  // Situs web (landing, login web, status langganan)
  SITE_URL: 'https://hipmibantul.site',
  // OAuth Client ID tipe "Web application" dari Google Cloud Console
  GOOGLE_CLIENT_ID: '',
  // Salin dari admin: Pengaturan -> Extension -> LICENSE_PUBKEY (aman dipublikasikan)
  LICENSE_PUBKEY: '',
  // JANGAN diaktifkan di produksi: true = semua fitur terbuka tanpa login (hanya untuk pengembangan lokal)
  DEV_OPEN: false,
  // Hanya untuk pengujian otomatis; biarkan kosong di produksi
  DEV_ID_TOKEN: '',
  DEV_NONCE: ''
};
