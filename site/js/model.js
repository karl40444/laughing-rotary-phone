// Builds the population model: for every land cell, a population and an
// ethnic mix interpolated from the anchors in data/ethnic.js.
import { COLS, ROWS, CELL_KM2, toGrid, decodeRLE } from './grid.js';
import { LAND_RLE } from '../data/geo.js';
import { GROUPS, REGIONS, CITIES } from '../data/ethnic.js';

export const G = GROUPS.length;
export const GROUP_INDEX = Object.fromEntries(GROUPS.map((g, i) => [g.key, i]));

function mixVector(mix) {
  const v = new Float32Array(G);
  let total = 0;
  for (const [k, p] of Object.entries(mix)) {
    if (!(k in GROUP_INDEX)) throw new Error(`Unknown group ${k}`);
    v[GROUP_INDEX[k]] = p;
    total += p;
  }
  for (let g = 0; g < G; g++) v[g] /= total;
  return v;
}

// Deterministic lattice value noise, used only for the dithered display.
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function valueNoise(x, y, scale) {
  const fx = x / scale, fy = y / scale;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(x0, y0), b = hash(x0 + 1, y0), c = hash(x0, y0 + 1), d = hash(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function buildModel() {
  const N = COLS * ROWS;
  const land = decodeRLE(LAND_RLE, N);
  const pop = new Float32Array(N);
  const comp = new Float32Array(N * G);

  const anchors = REGIONS.map(([lon, lat, density, mix]) => {
    const [x, y] = toGrid(lon, lat);
    return { x, y, density, mix: mixVector(mix) };
  });

  // Inverse-distance weighting over the nearest anchors.
  const K_NEAREST = 5, POWER = 2.2;
  const near = new Array(K_NEAREST);
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const x = (i % COLS) + 0.5, y = Math.floor(i / COLS) + 0.5;
    let count = 0;
    for (const a of anchors) {
      const d2 = (a.x - x) ** 2 + (a.y - y) ** 2;
      if (count < K_NEAREST) { near[count++] = { a, d2 }; if (count === K_NEAREST) near.sort((p, q) => p.d2 - q.d2); }
      else if (d2 < near[K_NEAREST - 1].d2) {
        let j = K_NEAREST - 1;
        while (j > 0 && near[j - 1].d2 > d2) { near[j] = near[j - 1]; j--; }
        near[j] = { a, d2 };
      }
    }
    let wsum = 0, dens = 0;
    const base = i * G;
    for (let k = 0; k < count; k++) {
      const { a, d2 } = near[k];
      const w = 1 / Math.pow(d2 + 0.5, POWER / 2);
      wsum += w;
      dens += w * a.density;
      for (let g = 0; g < G; g++) comp[base + g] += w * a.mix[g];
    }
    for (let g = 0; g < G; g++) comp[base + g] /= wsum;
    pop[i] = (dens / wsum) * CELL_KM2;
  }

  // Cities: a Gaussian bump of population with the city's own mix.
  for (const [, lon, lat, thousands, mix] of CITIES) {
    const [cx, cy] = toGrid(lon, lat);
    const v = mixVector(mix);
    const SIGMA = 1.0, R = 3;
    const cells = [];
    let wsum = 0;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) {
      for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        const i = y * COLS + x;
        if (!land[i]) continue;
        const w = Math.exp(-((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) / (2 * SIGMA * SIGMA));
        cells.push([i, w]);
        wsum += w;
      }
    }
    for (const [i, w] of cells) {
      const add = (thousands * 1000 * w) / wsum;
      const base = i * G;
      for (let g = 0; g < G; g++) comp[base + g] = (comp[base + g] * pop[i] + v[g] * add) / (pop[i] + add);
      pop[i] += add;
    }
  }

  // Plurality group, and a dithered "patchwork" group for the display, which
  // shows mixed areas as interleaved patches the way period maps did.
  const major = new Uint8Array(N);
  const patch = new Uint8Array(N);
  const noise = new Float32Array(N);
  const landIdx = [];
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const x = i % COLS, y = Math.floor(i / COLS);
    noise[i] = 0.65 * valueNoise(x, y, 4.5) + 0.35 * valueNoise(x + 97, y + 31, 1.8);
    landIdx.push(i);
  }
  // Rank-transform the noise so it is uniformly distributed.
  landIdx.sort((a, b) => noise[a] - noise[b]);
  landIdx.forEach((i, r) => { noise[i] = (r + 0.5) / landIdx.length; });

  const order = [...Array(G).keys()];
  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const base = i * G;
    let best = 0;
    for (let g = 1; g < G; g++) if (comp[base + g] > comp[base + best]) best = g;
    major[i] = best;
    order.sort((a, b) => comp[base + b] - comp[base + a]);
    let acc = 0, pick = order[0];
    for (const g of order) {
      acc += comp[base + g];
      if (noise[i] < acc) { pick = g; break; }
    }
    patch[i] = pick;
  }

  let total = 0;
  for (let i = 0; i < N; i++) total += pop[i];

  return { N, land, pop, comp, major, patch, total };
}
