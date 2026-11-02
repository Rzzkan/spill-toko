// Membuat paket extension siap upload ke Chrome Web Store.
//   node tools/build.mjs --api https://spill.delova.id/api/index.php --client-id XXXX.apps.googleusercontent.com --pubkey BASE64
// (atau lewat env: SPILL_API, SPILL_CLIENT_ID, SPILL_PUBKEY). Hasil: dist/spill-toko-<versi>.zip
// Paket: config.js diisi, field "key" dihapus dari manifest (Web Store memberi ID sendiri), tools/ & dev files tidak ikut.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, env) => { const i = process.argv.indexOf('--' + n); return (i > 0 ? process.argv[i + 1] : process.env[env]) || ''; };
const API = arg('api', 'SPILL_API').trim(), CID = arg('client-id', 'SPILL_CLIENT_ID').trim(), PUB = arg('pubkey', 'SPILL_PUBKEY').trim();
const fail = (m) => { console.error('GAGAL: ' + m); process.exit(1); };

if (!/^https:\/\/[^\s'"]+$/.test(API)) fail('--api harus URL https, mis. https://spill.delova.id/api/index.php');
if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(CID)) fail('--client-id harus berakhiran .apps.googleusercontent.com');
if (!/^[A-Za-z0-9+/]{43}=$/.test(PUB)) fail('--pubkey harus base64 32 byte (44 karakter, dari setup.sh / keygen.php)');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const out = path.join(root, 'dist', `spill-toko-${manifest.version}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const f of ['background.js', 'icons', 'src']) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
delete manifest.key;
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(out, 'src', 'config.js'),
  `// Dibuat oleh tools/build.mjs - jangan diedit manual.\nself.SPILL_CONFIG = { API_BASE: ${JSON.stringify(API)}, GOOGLE_CLIENT_ID: ${JSON.stringify(CID)}, LICENSE_PUBKEY: ${JSON.stringify(PUB)}, DEV_ID_TOKEN: '', DEV_NONCE: '' };\n`);

const zip = out + '.zip';
fs.rmSync(zip, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell', ['-NoProfile', '-Command', `Compress-Archive -Path '${out}\\*' -DestinationPath '${zip}' -Force`], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', zip, '.'], { cwd: out, stdio: 'inherit' });
}
console.log(`OK: ${path.relative(root, zip)}  (${(fs.statSync(zip).size / 1024).toFixed(0)} KB)`);
console.log('Upload zip ini di Chrome Web Store Developer Dashboard. Lalu daftarkan https://<ID-BARU>.chromiumapp.org/ di Google Cloud (Authorized redirect URIs).');
