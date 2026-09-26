// Turns freehand border lines into walls on the grid, then splits the land
// into enclosed regions.
import { COLS, ROWS } from './grid.js';

const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;

// All cells an 8-connected line visits. An 8-connected wall is enough to stop
// a 4-connected flood fill.
function cellsOnSegment(x0, y0, x1, y1, out) {
  let dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    out.push(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

const EXTEND = 12;
const MIN_REGION = 6; // cells // cells (~65 km) an open line end may be stretched to meet something

// Stretches a line end in its direction of travel until it meets the sea, the
// map edge or another wall, so that nearly-closed borders close.
function extendEnd(pts, fromEnd, land, wall, out) {
  const n = pts.length;
  if (n < 2) return;
  const tip = fromEnd ? pts[n - 1] : pts[0];
  let back = tip;
  for (let k = 1; k < n; k++) {
    const p = fromEnd ? pts[n - 1 - k] : pts[k];
    back = p;
    if (Math.hypot(p[0] - tip[0], p[1] - tip[1]) >= 3) break;
  }
  const len = Math.hypot(tip[0] - back[0], tip[1] - back[1]);
  if (len < 0.5) return;
  const ux = (tip[0] - back[0]) / len, uy = (tip[1] - back[1]) / len;
  const tx = Math.floor(tip[0]), ty = Math.floor(tip[1]);
  const path = [];
  for (let s = 0.5; s <= EXTEND; s += 0.5) {
    const x = Math.floor(tip[0] + ux * s), y = Math.floor(tip[1] + uy * s);
    if (x === tx && y === ty) continue;
    if (!inside(x, y) || !land[y * COLS + x] || wall[y * COLS + x]) {
      // Found a stop: keep the path that leads to it. Steps of half a cell
      // give an 8-connected path.
      for (const [px, py] of path) out.push(px, py);
      return;
    }
    const last = path[path.length - 1];
    if (!last || last[0] !== x || last[1] !== y) path.push([x, y]);
  }
}

// lines: arrays of [x, y] points in grid coordinates.
export function rasteriseLines(lines, land) {
  const wall = new Uint8Array(COLS * ROWS);
  const mark = (buf) => {
    for (let j = 0; j < buf.length; j += 2) {
      const x = buf[j], y = buf[j + 1];
      if (inside(x, y)) wall[y * COLS + x] = 1;
    }
  };
  for (const pts of lines) {
    const buf = [];
    for (let k = 0; k < pts.length; k++) {
      const x = Math.floor(pts[k][0]), y = Math.floor(pts[k][1]);
      if (k === 0) buf.push(x, y);
      else cellsOnSegment(Math.floor(pts[k - 1][0]), Math.floor(pts[k - 1][1]), x, y, buf);
    }
    mark(buf);
  }
  // Extend open ends after all lines are in, so they can meet later lines too.
  for (const pts of lines) {
    const buf = [];
    extendEnd(pts, false, land, wall, buf);
    extendEnd(pts, true, land, wall, buf);
    mark(buf);
  }
  return wall;
}

// Labels 4-connected land regions separated by walls. Wall cells are then
// handed to a neighbouring region so no population is lost.
export function labelRegions(land, wall) {
  const N = COLS * ROWS;
  const region = new Int32Array(N).fill(-1);
  const stack = new Int32Array(N);
  let count = 0;
  for (let s = 0; s < N; s++) {
    if (!land[s] || wall[s] || region[s] !== -1) continue;
    let top = 0;
    stack[top++] = s;
    region[s] = count;
    while (top) {
      const i = stack[--top];
      const x = i % COLS;
      const nb = [x > 0 ? i - 1 : -1, x < COLS - 1 ? i + 1 : -1, i - COLS, i + COLS];
      for (const j of nb) {
        if (j < 0 || j >= N || !land[j] || wall[j] || region[j] !== -1) continue;
        region[j] = count;
        stack[top++] = j;
      }
    }
    count++;
  }
  // Slivers cut off by a wall (not islands) are too small to be worth a
  // claim: dissolve them so they join a neighbour like wall cells do.
  const size = new Int32Array(count);
  const touchesWall = new Uint8Array(count);
  for (let i = 0; i < N; i++) {
    const r = region[i];
    if (r < 0) continue;
    size[r]++;
    const x = i % COLS;
    if ((x > 0 && wall[i - 1]) || (x < COLS - 1 && wall[i + 1]) || (i >= COLS && wall[i - COLS]) || (i + COLS < N && wall[i + COLS])) touchesWall[r] = 1;
  }
  const absorb = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const r = region[i];
    if (r >= 0 && touchesWall[r] && size[r] < MIN_REGION) { absorb[i] = 1; region[i] = -1; }
  }
  // Renumber the surviving regions 0..count-1.
  const remap = new Int32Array(count).fill(-1);
  let next = 0;
  for (let i = 0; i < N; i++) {
    const r = region[i];
    if (r < 0) continue;
    if (remap[r] < 0) remap[r] = next++;
    region[i] = remap[r];
  }
  const touches = new Uint8Array(next + N); // room for wall-only islets
  for (let r = 0; r < count; r++) if (remap[r] >= 0) touches[remap[r]] = touchesWall[r];
  count = next;

  // Breadth-first growth of regions into wall cells and dissolved slivers.
  let frontier = [];
  for (let i = 0; i < N; i++) if (land[i] && (wall[i] || absorb[i])) frontier.push(i);
  while (frontier.length) {
    const next = [];
    const assigned = [];
    for (const i of frontier) {
      const x = i % COLS;
      const nb = [x > 0 ? i - 1 : -1, x < COLS - 1 ? i + 1 : -1, i - COLS, i + COLS];
      let r = -1;
      for (const j of nb) if (j >= 0 && j < N && region[j] >= 0) { r = region[j]; break; }
      if (r >= 0) assigned.push(i, r); else next.push(i);
    }
    for (let k = 0; k < assigned.length; k += 2) region[assigned[k]] = assigned[k + 1];
    if (next.length === frontier.length) {
      for (const i of next) { touches[count] = 1; region[i] = count++; } // isolated wall-only islets
      break;
    }
    frontier = next;
  }
  // touches[r]: the region borders a drawn line (0 = a natural island or landmass).
  return { region, count, touches: touches.subarray(0, count) };
}
