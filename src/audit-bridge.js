/* Marketplace Audit - jembatan halaman temanseller.com/audit <-> extension.
 * Halaman mengirim ping/start/cancel lewat window.postMessage; script ini meneruskannya ke service worker. */
(function () {
  'use strict';
  window.addEventListener('message', (ev) => {
    if (ev.source !== window || ev.origin !== location.origin) return;
    const m = ev.data;
    if (!m || m.source !== 'ts-audit-page') return;
    try {
      if (m.type === 'ping') window.postMessage({ source: 'ts-audit-ext', type: 'pong', v: 1 }, location.origin);
      else if (m.type === 'start') chrome.runtime.sendMessage({ type: 'audit:start', scanId: m.scanId, token: m.token, api: m.api, target: m.target });
      else if (m.type === 'cancel') chrome.runtime.sendMessage({ type: 'audit:cancel' });
    } catch (_) { /* extension di-reload: halaman akan menampilkan petunjuk pasang/muat ulang */ }
  });
})();
