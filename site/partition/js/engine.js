// Partition engine: the cell grid, territories cut out by drawn borders, and
// scoring. Pure functions shared by the page, the solver and the tests.
//
// Grid vertices sit at integer (x, y) with 0 <= x <= cols, 0 <= y <= rows.
// A border is a set of unit edges between vertices, keyed as
//   'h:x,y'  the horizontal edge from (x, y) to (x + 1, y)
//   'v:x,y'  the vertical edge from (x, y) to (x, y + 1)
// Cell (r, c) is the square with top-left corner (c, r).

export const hKey = (x, y) => `h:${x},${y}`;
export const vKey = (x, y) => `v:${x},${y}`;

// The edge joining two adjacent vertices, or null if they are not adjacent.
export function edgeBetween([x1, y1], [x2, y2]) {
  if (y1 === y2 && Math.abs(x1 - x2) === 1) return hKey(Math.min(x1, x2), y1);
  if (x1 === x2 && Math.abs(y1 - y2) === 1) return vKey(x1, Math.min(y1, y2));
  return null;
}

// End points of an edge key.
export function edgeEnds(key) {
  const [x, y] = key.slice(2).split(',').map(Number);
  return key[0] === 'h' ? [[x, y], [x + 1, y]] : [[x, y], [x, y + 1]];
}

const sum = (a) => a.reduce((s, v) => s + v, 0);
const argmax = (a) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);

// Turns the JSON map into cells with neighbours. Only edges with a populated
// cell on both sides ("interior" edges) can take part in a border.
export function prepareMap(raw) {
  const { cols, rows } = raw;
  const index = new Int32Array(cols * rows).fill(-1);
  const cells = [];
  raw.grid.forEach((row, r) => row.forEach((pops, c) => {
    if (!pops) return;
    index[r * cols + c] = cells.length;
    cells.push({ r, c, pops, total: sum(pops), major: argmax(pops), nb: [] });
  }));
  const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols ? index[r * cols + c] : -1);
  const interior = new Map();
  cells.forEach((cell, i) => {
    const { r, c } = cell;
    const down = at(r + 1, c), right = at(r, c + 1);
    if (down >= 0) interior.set(hKey(c, r + 1), [i, down]);
    if (right >= 0) interior.set(vKey(c + 1, r), [i, right]);
  });
  for (const [key, [i, j]] of interior) {
    cells[i].nb.push([j, key]);
    cells[j].nb.push([i, key]);
  }
  return { ...raw, cells, index, at, interior, total: sum(cells.map((c) => c.total)) };
}

// Splits the map into territories: groups of cells connected without
// crossing a border edge. Returns the territory of each cell, numbered in
// reading order from the top-left.
export function territories(map, edges) {
  const of = new Int32Array(map.cells.length).fill(-1);
  let count = 0;
  for (let s = 0; s < map.cells.length; s++) {
    if (of[s] >= 0) continue;
    of[s] = count;
    const stack = [s];
    while (stack.length) {
      const i = stack.pop();
      for (const [j, key] of map.cells[i].nb) {
        if (of[j] < 0 && !edges.has(key)) { of[j] = count; stack.push(j); }
      }
    }
    count++;
  }
  return { of, count };
}

// For each territory, the largest group is its majority; everyone else in it
// is on the wrong side. Lower misplaced is better.
export function score(map, of, count) {
  const G = map.groups.length;
  const terr = Array.from({ length: count }, (_, id) => ({ id, pops: new Array(G).fill(0), cells: 0 }));
  map.cells.forEach((cell, i) => {
    const t = terr[of[i]];
    t.cells++;
    for (let g = 0; g < G; g++) t.pops[g] += cell.pops[g];
  });
  let misplaced = 0;
  for (const t of terr) {
    t.total = sum(t.pops);
    t.major = argmax(t.pops);
    t.misplaced = t.total - t.pops[t.major];
    misplaced += t.misplaced;
  }
  return { territories: terr, misplaced, total: map.total, share: misplaced / map.total };
}

// The unreachable floor: even if every single cell became its own country,
// its local minorities would still be on the wrong side.
export function floorScore(map) {
  return sum(map.cells.map((c) => c.total - c.pops[c.major]));
}

// Border edges that actually separate two territories; the rest of a drawing
// is loose ends.
export function activeEdges(map, edges, of) {
  const out = new Set();
  for (const key of edges) {
    const pair = map.interior.get(key);
    if (pair && of[pair[0]] !== of[pair[1]]) out.add(key);
  }
  return out;
}

// The border implied by a territory assignment.
export function bordersOf(map, of) {
  const out = new Set();
  for (const [key, [i, j]] of map.interior) if (of[i] !== of[j]) out.add(key);
  return out;
}

// Assignments are stored as one string per grid row: '.' outside the map,
// otherwise the territory letter (A, B, C...).
export function encodeAssignment(map, of) {
  const rows = [];
  for (let r = 0; r < map.rows; r++) {
    let s = '';
    for (let c = 0; c < map.cols; c++) {
      const i = map.at(r, c);
      s += i < 0 ? '.' : String.fromCharCode(65 + of[i]);
    }
    rows.push(s);
  }
  return rows;
}

export function decodeAssignment(map, rows) {
  const of = new Int32Array(map.cells.length);
  map.cells.forEach((cell, i) => { of[i] = rows[cell.r].charCodeAt(cell.c) - 65; });
  return of;
}

// A result as n people (100 by default): for each group, how many are on
// the wrong side and how many live where their group is the majority.
// Largest-remainder rounding keeps the total at exactly n. Returns dots in
// display order, wrong side first: [{ group, wrong }].
export function peopleDots(map, s, n = 100) {
  const G = map.groups.length;
  const counts = [];
  for (let g = 0; g < G; g++) {
    let right = 0, all = 0;
    for (const t of s.territories) {
      all += t.pops[g];
      if (t.major === g) right += t.pops[g];
    }
    counts.push({ group: g, wrong: true, v: all - right }, { group: g, wrong: false, v: right });
  }
  const total = counts.reduce((a, c) => a + c.v, 0);
  for (const c of counts) {
    const q = total ? (c.v * n) / total : 0;
    c.k = Math.floor(q);
    c.rem = q - c.k;
  }
  let left = n - counts.reduce((a, c) => a + c.k, 0);
  for (const c of [...counts].sort((a, b) => b.rem - a.rem)) if (left-- > 0) c.k++;
  const dots = [];
  for (const wrong of [true, false]) {
    for (const c of counts) if (c.wrong === wrong) for (let i = 0; i < c.k; i++) dots.push({ group: c.group, wrong });
  }
  return dots;
}
