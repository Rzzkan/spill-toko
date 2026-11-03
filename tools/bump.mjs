// Menaikkan versi extension setiap ada pembaruan (agar mudah dikenali saat tes).
//   node tools/bump.mjs          -> patch   1.1.0 -> 1.1.1
//   node tools/bump.mjs minor    -> minor   1.1.4 -> 1.2.0
//   node tools/bump.mjs major    -> major   1.2.3 -> 2.0.0
// Mengubah manifest.json (version + version_name berisi waktu build, WIB). Versi tampil di panel & kartu Shofee Data.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'manifest.json');
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
let [a, b, c] = m.version.split('.').map(Number);
const kind = process.argv[2] || 'patch';
if (kind === 'major') { a++; b = 0; c = 0; } else if (kind === 'minor') { b++; c = 0; } else c++;
m.version = `${a}.${b}.${c}`;
const wib = new Date(Date.now() + 7 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
m.version_name = `${m.version} (${wib} WIB)`;
fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
console.log('Versi extension:', m.version_name);
