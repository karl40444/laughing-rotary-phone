// Renders the model to PNGs for eyeballing: node tools/preview.mjs <outdir>
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { COLS, ROWS } from '../site/js/grid.js';
import { buildModel } from '../site/js/model.js';
import { GROUPS } from '../site/data/ethnic.js';
import { berlinOwner, BERLIN_COUNTRIES } from '../site/js/history.js';

function png(w, h, rgb) {
  const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
  const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const hex = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const out = process.argv[2] || '.';
const m = buildModel();
const S = 3;
function render(colorOf, file) {
  const buf = Buffer.alloc(COLS * S * ROWS * S * 3);
  for (let y = 0; y < ROWS * S; y++) for (let x = 0; x < COLS * S; x++) {
    const i = Math.floor(y / S) * COLS + Math.floor(x / S);
    const c = m.land[i] ? colorOf(i) : [200, 220, 240];
    buf.set(c, (y * COLS * S + x) * 3);
  }
  writeFileSync(`${out}/${file}`, png(COLS * S, ROWS * S, buf));
}
render((i) => hex(GROUPS[m.patch[i]].color), 'ethnic.png');
render((i) => hex(GROUPS[m.major[i]].color), 'major.png');
const bo = berlinOwner(m);
render((i) => hex(BERLIN_COUNTRIES[bo[i]].color), 'berlin.png');
console.log('total population', Math.round(m.total / 1e6 * 10) / 10, 'M');
const tot = new Float64Array(GROUPS.length);
for (let i = 0; i < m.N; i++) if (m.land[i]) for (let g = 0; g < GROUPS.length; g++) tot[g] += m.pop[i] * m.comp[i * GROUPS.length + g];
console.log(GROUPS.map((g, k) => `${g.name}: ${Math.round(tot[k] / 1000)}k`).join('\n'));
