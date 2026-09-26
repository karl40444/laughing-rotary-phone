// Searches for the border with the fewest misplaced people: simulated
// annealing over assignments of cells to k contiguous territories. It moves
// one cell at a time across a territory boundary, never emptying or
// disconnecting a territory. The result is the best found, not a proof.
import { score } from '../site/partition/js/engine.js';

export function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Is territory t still connected if cell `skip` leaves it?
function connectedWithout(map, of, t, skip, size) {
  let start = -1;
  for (const [j] of map.cells[skip].nb) if (of[j] === t) { start = j; break; }
  if (start < 0) return size === 1;
  const seen = new Uint8Array(of.length);
  seen[skip] = 1;
  seen[start] = 1;
  const stack = [start];
  let n = 1;
  while (stack.length) {
    const i = stack.pop();
    for (const [j] of map.cells[i].nb) {
      if (!seen[j] && of[j] === t) { seen[j] = 1; n++; stack.push(j); }
    }
  }
  return n === size - 1;
}

// Grows k territories from random seed cells.
function randomStart(map, k, rand) {
  const n = map.cells.length;
  const of = new Int32Array(n).fill(-1);
  const frontier = [];
  for (let t = 0; t < k; t++) {
    let s;
    do s = Math.floor(rand() * n); while (of[s] >= 0);
    of[s] = t;
    frontier.push(s);
  }
  while (frontier.length) {
    const i = frontier.splice(Math.floor(rand() * frontier.length), 1)[0];
    for (const [j] of map.cells[i].nb) if (of[j] < 0) { of[j] = of[i]; frontier.push(j); }
  }
  return of;
}

function anneal(map, k, rand, steps) {
  const G = map.groups.length, cells = map.cells;
  const of = randomStart(map, k, rand);
  const pops = Array.from({ length: k }, () => new Array(G).fill(0));
  const size = new Array(k).fill(0);
  cells.forEach((c, i) => { size[of[i]]++; for (let g = 0; g < G; g++) pops[of[i]][g] += c.pops[g]; });
  const bad = (p) => p.reduce((s, v) => s + v, 0) - Math.max(...p);
  let cost = pops.reduce((s, p) => s + bad(p), 0);
  let best = cost, bestOf = of.slice();
  const T0 = map.total * 0.004, T1 = map.total * 0.00001;
  for (let step = 0; step < steps; step++) {
    const T = T0 * Math.pow(T1 / T0, step / steps);
    const i = Math.floor(rand() * cells.length);
    const nb = cells[i].nb;
    const [j] = nb[Math.floor(rand() * nb.length)];
    const from = of[i], to = of[j];
    if (from === to || size[from] === 1) continue;
    const c = cells[i].pops;
    const pf = pops[from].map((v, g) => v - c[g]), pt = pops[to].map((v, g) => v + c[g]);
    const delta = bad(pf) + bad(pt) - bad(pops[from]) - bad(pops[to]);
    if (delta > 0 && rand() >= Math.exp(-delta / T)) continue;
    if (!connectedWithout(map, of, from, i, size[from])) continue;
    of[i] = to; pops[from] = pf; pops[to] = pt; size[from]--; size[to]++;
    cost += delta;
    if (cost < best - 1e-6) { best = cost; bestOf = of.slice(); }
  }
  return bestOf;
}

// Best of several annealing runs with exactly k territories. Splitting a
// territory never raises the score, so k = the puzzle's maximum is optimal.
export function solve(map, k, { restarts = 24, steps = 400000, seed = 1 } = {}) {
  const rand = mulberry32(seed);
  let best = null;
  for (let r = 0; r < restarts; r++) {
    const of = anneal(map, k, rand, steps);
    const s = score(map, of, k);
    if (!best || s.misplaced < best.misplaced) best = { of, misplaced: s.misplaced };
  }
  return best;
}
