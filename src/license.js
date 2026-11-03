/* Shofee - jembatan content script -> background untuk lisensi (login Google, status, checkout). */
(function (root) {
  'use strict';
  const send = (msg) => new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, (r) => {
        const e = chrome.runtime.lastError;
        if (e) return reject(new Error(e.message));
        if (r && r.error) return reject(new Error(r.error));
        resolve(r);
      });
    } catch (e) { reject(e); }
  });
  root.SpillLicense = {
    get: (force) => send({ type: 'lic:get', force: !!force }),
    login: () => send({ type: 'lic:login' }),
    logout: () => send({ type: 'lic:logout' }),
    checkout: (plan) => send({ type: 'lic:checkout', plan: plan }),
    ai: (kind, data, force) => send({ type: 'lic:ai', kind: kind, data: data, force: !!force })
  };
})(typeof self !== 'undefined' ? self : this);
