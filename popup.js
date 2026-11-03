/* Shofee - popup ikon toolbar: saklar utama + tampilkan/sembunyikan kartu per jenis halaman. */
(function () {
  'use strict';
  const KEYS = ['shop', 'search', 'product', 'category', 'active'];
  const $ = (id) => document.getElementById(id);
  const DEF = { on: true, shop: true, search: true, product: true, category: true, active: true };
  let prefs = Object.assign({}, DEF);

  function paint() {
    $('on').checked = !!prefs.on;
    $('feat').classList.toggle('off', !prefs.on);
    KEYS.forEach((k) => { const s = document.querySelector('select[data-k="' + k + '"]'); if (s) s.value = prefs[k] === false ? '0' : '1'; });
  }
  function save() { try { chrome.storage.local.set({ prefs: prefs }); } catch (_) { /* abaikan */ } }

  $('ver').textContent = 'v' + chrome.runtime.getManifest().version;
  try {
    const cfg = (self.SPILL_CONFIG || {});
    $('acct').href = (cfg.SITE_URL || 'https://temanseller.com') + '/akun';
  } catch (_) { /* abaikan */ }

  chrome.storage.local.get('prefs', (r) => { prefs = Object.assign({}, DEF, (r && r.prefs) || {}); paint(); });
  $('on').addEventListener('change', () => { prefs.on = $('on').checked; paint(); save(); });
  document.querySelectorAll('select[data-k]').forEach((s) => s.addEventListener('change', () => { prefs[s.dataset.k] = s.value === '1'; save(); }));

  $('panel').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !/^https:\/\/shopee\.co\.id\//.test(tab.url || '')) { chrome.tabs.create({ url: 'https://shopee.co.id/' }); window.close(); return; }
      chrome.runtime.sendMessage({ type: 'spill-open-panel', tabId: tab.id }, () => { void chrome.runtime.lastError; window.close(); });
    } catch (_) { window.close(); }
  });
})();
