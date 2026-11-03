// Uji: data API tidak ditimpa angka DOM yang dibulatkan, dan rate30 memakai api30. node tools/test-store-api.js
let data = {};
global.chrome = { storage: { local: { get: async (k) => (typeof k === 'string' ? { [k]: data[k] } : data), set: async (o) => { Object.assign(data, o); }, remove: async (k) => { delete data[k]; } } } };
global.self = global;
require('../src/store.js');
const S = global.SpillStore;
let fail = 0; const eq = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) fail++; console.log((ok ? 'OK   ' : 'FAIL ') + n, ok ? '' : JSON.stringify(g) + ' != ' + JSON.stringify(w)); };
(async () => {
  await S.upsert([{ key: '1.2', shopId: '1', itemId: '2', name: 'A', price: 100000, sold: 3126, api30: 63, omzet: 312600000, via: 'api' }], { source: 't' });
  await S.upsert([{ key: '1.2', shopId: '1', itemId: '2', name: 'A', price: 100000, sold: 3000, soldPlus: true, omzet: 300000000 }], { source: 'dom' });
  const it = (await S.items())['1.2'];
  eq('sold pasti tidak ditimpa DOM', it.sold, 3126);
  eq('rate30 dari API', S.rate30(it), { sold: 63, omzet: 6300000, api: true });
  await S.upsert([{ key: '9.9', shopId: '9', itemId: '9', name: 'B', price: 50000, sold: 500 }], { source: 'dom' });
  eq('tanpa API: DOM tetap masuk', (await S.items())['9.9'].sold, 500);
  eq('tanpa API & riwayat: rate30 null', S.rate30((await S.items())['9.9']), null);
  // riwayat DOM (dibulatkan) tidak boleh menghasilkan "0 terjual 30 hari"
  await S.upsert([{ key: '7.7', shopId: '7', itemId: '7', name: 'C', price: 10000, sold: 7000, soldPlus: true }], { source: 'dom' });
  await new Promise((r) => setTimeout(r, 5));
  const it7 = (await S.items())['7.7']; it7.hist = [{ t: Date.now() - 3 * 864e5, sold: 7000, m: false }, { t: Date.now(), sold: 7000, m: false }]; it7.lastSeen = Date.now();
  eq('riwayat DOM dibulatkan: rate30 null', S.rate30(it7), null);
  // trend dari snapshot 30 hari lalu (lokal dan server)
  const D = 864e5;
  eq('trend lokal +25%', JSON.stringify(S.trend({ api30: 100, mh: [{ t: Date.now() - 30 * D, m: 80 }] })), JSON.stringify({ cur: 100, prev: 80 }));
  eq('trend lokal: snapshot terlalu baru diabaikan', S.trend({ api30: 100, mh: [{ t: Date.now() - 5 * D, m: 80 }] }), null);
  eq('trend dari server', JSON.stringify(S.trend({ api30: 50, prev30: { m: 100 } })), JSON.stringify({ cur: 50, prev: 100 }));
  eq('tanpa api30: tidak ada trend', S.trend({ prev30: { m: 100 } }), null);
  // api30=0 padahal total terjual >0 -> estimasi, bukan 0
  eq('api30=0 & sold>0 tanpa dasar bulan: null', S.rate30({ sold: 600, api30: 0, price: 1000 }), null);
  eq('api30=0 & sold>0 pakai bulan toko', JSON.stringify(S.rate30({ sold: 600, api30: 0, price: 1000 }, 6)), JSON.stringify({ sold: 100, omzet: 100000, est: true, life: true }));
  eq('api30=0 & sold>0 pakai ctime', Math.round(S.rate30({ sold: 600, api30: 0, price: 1000, ctime: Date.now() / 1000 - 6 * 30 * 86400 }).sold), 100);
  eq('api30=0 & sold=0 tetap 0', S.rate30({ sold: 0, api30: 0, price: 1000 }).sold, 0);
  // API mengirim sold=0 (tidak diketahui) lalu DOM menampilkan "10RB+": angka DOM harus dipakai
  await S.upsert([{ key: '5.5', shopId: '5', itemId: '5', name: 'D', price: 39000, sold: 0, api30: 0, via: 'api' }], { source: 'api' });
  await S.upsert([{ key: '5.5', shopId: '5', itemId: '5', name: 'D', price: 39000, sold: 10000, soldPlus: true, omzet: 390000000 }], { source: 'dom' });
  eq('sold API 0 tidak memblokir angka DOM', (await S.items())['5.5'].sold, 10000);
  if (fail) process.exit(1); console.log('Semua lolos');
})();
