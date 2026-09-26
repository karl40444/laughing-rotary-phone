// Map grid and projection shared by the game and the build tools.
// Equirectangular projection scaled by cos(41.5°) so each cell is roughly
// square on the ground (~5.6 km × 5.6 km, ~31 km²).

export const LON0 = 13.0;
export const LON1 = 30.0;
export const LAT0 = 34.8;
export const LAT1 = 48.6;
export const CELL_LAT = 0.05;
export const K = Math.cos((41.5 * Math.PI) / 180);
export const CELL_LON = CELL_LAT / K;
export const COLS = Math.round((LON1 - LON0) / CELL_LON);
export const ROWS = Math.round((LAT1 - LAT0) / CELL_LAT);
export const CELL_KM2 = (CELL_LAT * 111.2) ** 2;

// Continuous grid coordinates (x across columns, y down rows).
export const toGrid = (lon, lat) => [(lon - LON0) / CELL_LON, (LAT1 - lat) / CELL_LAT];
export const toLonLat = (x, y) => [LON0 + x * CELL_LON, LAT1 - y * CELL_LAT];
export const cellCentre = (i) => toLonLat((i % COLS) + 0.5, Math.floor(i / COLS) + 0.5);

// Run-length encoding for 0/1 masks: alternating run lengths starting with 0s.
export function encodeRLE(mask) {
  const runs = [];
  let cur = 0, n = 0;
  for (const v of mask) {
    if (v === cur) n++;
    else { runs.push(n); cur = v; n = 1; }
  }
  runs.push(n);
  return runs.map((r) => r.toString(36)).join(',');
}

export function decodeRLE(str, length) {
  const out = new Uint8Array(length);
  let p = 0, v = 0;
  for (const s of str.split(',')) {
    const n = parseInt(s, 36);
    if (v) out.fill(1, p, p + n);
    p += n; v ^= 1;
  }
  return out;
}
