// Builds site/partition/data/bosnia.json: a simplified Bosnia and
// Herzegovina on a ~16 km square grid, with the best border precomputed.
//   node tools/build-partition-bosnia.mjs
//
// Each anchor is a municipality with its approximate 1991 census population
// (thousands) and Bosniak / Serb / Croat shares in percent, rounded from
// memory of the published results. "Yugoslavs" and others are left out, so
// only the three largest groups are counted. Each anchor's people are spread
// over nearby cells with a Gaussian kernel. This is a simplified teaching
// model, not a demographic dataset.
import { writeFileSync } from 'node:fs';
import { prepareMap, territories, bordersOf, encodeAssignment, floorScore } from '../site/partition/js/engine.js';
import { solve } from './partition-solve.mjs';

// [name, lon, lat, population (k), Bosniak %, Serb %, Croat %]
const ANCHORS = [
  ['Bihać', 15.87, 44.82, 71, 66, 18, 8], ['Cazin', 15.94, 44.97, 64, 98, 1, 0.5],
  ['Velika Kladuša', 15.79, 45.18, 52, 92, 4, 1], ['Bosanska Krupa', 16.15, 44.88, 58, 74, 24, 0.5],
  ['Bosanski Petrovac', 16.37, 44.55, 16, 21, 75, 1], ['Sanski Most', 16.67, 44.77, 60, 47, 42, 7],
  ['Prijedor', 16.71, 44.98, 112, 44, 42, 6], ['Bosanski Novi', 16.38, 45.05, 41, 34, 60, 1],
  ['Bosanska Dubica', 16.81, 45.18, 31, 20, 69, 2], ['Banja Luka', 17.19, 44.77, 195, 15, 55, 15],
  ['Gradiška', 17.25, 45.14, 60, 26, 60, 6], ['Srbac', 17.52, 45.10, 21, 4, 89, 2],
  ['Laktaši', 17.30, 44.91, 29, 2, 80, 11], ['Prnjavor', 17.66, 44.87, 47, 15, 72, 4],
  ['Čelinac', 17.33, 44.72, 18, 8, 89, 0.5], ['Kotor Varoš', 17.37, 44.62, 36, 30, 38, 29],
  ['Skender Vakuf', 17.38, 44.49, 19, 1, 68, 29], ['Ključ', 16.78, 44.53, 37, 48, 49, 1],
  ['Drvar', 16.38, 44.37, 17, 0.2, 97, 0.2], ['Bosansko Grahovo', 16.36, 44.18, 8, 0.2, 95, 3],
  ['Glamoč', 16.85, 44.05, 12, 18, 79, 1], ['Mrkonjić Grad', 17.08, 44.42, 27, 12, 77, 8],
  ['Šipovo', 17.09, 44.28, 15, 19, 80, 0.2], ['Jajce', 17.27, 44.34, 45, 39, 19, 35],
  ['Donji Vakuf', 17.40, 44.14, 24, 55, 39, 3], ['Livno', 17.01, 43.83, 39, 15, 10, 72],
  ['Tomislavgrad', 17.23, 43.72, 30, 11, 1, 87], ['Kupres', 17.28, 43.99, 9, 7, 51, 39],
  ['Bugojno', 17.45, 44.06, 46, 42, 18, 34], ['Gornji Vakuf', 17.59, 43.94, 25, 56, 0.4, 43],
  ['Travnik', 17.67, 44.23, 70, 45, 11, 37], ['Novi Travnik', 17.63, 44.13, 30, 38, 13, 40],
  ['Vitez', 17.79, 44.16, 27, 41, 5, 46], ['Busovača', 17.88, 44.10, 18, 45, 3, 48],
  ['Kiseljak', 18.08, 43.94, 24, 41, 3, 52], ['Kreševo', 18.05, 43.87, 7, 23, 1, 70],
  ['Fojnica', 17.90, 43.96, 22, 49, 1, 41], ['Zenica', 17.91, 44.20, 145, 55, 15, 16],
  ['Kakanj', 18.12, 44.13, 55, 55, 9, 29], ['Visoko', 18.18, 43.99, 46, 75, 16, 4],
  ['Breza', 18.26, 44.02, 17, 76, 11, 6], ['Vareš', 18.33, 44.16, 22, 30, 16, 40],
  ['Olovo', 18.58, 44.13, 16, 75, 19, 4], ['Zavidovići', 18.15, 44.44, 57, 60, 20, 13],
  ['Žepče', 18.04, 44.43, 22, 47, 10, 40], ['Maglaj', 18.10, 44.55, 43, 45, 31, 19],
  ['Tešanj', 17.99, 44.61, 48, 72, 6, 18], ['Teslić', 17.86, 44.61, 59, 21, 55, 16],
  ['Doboj', 18.09, 44.73, 102, 40, 39, 13], ['Derventa', 17.91, 44.98, 56, 13, 41, 39],
  ['Bosanski Brod', 18.01, 45.14, 34, 12, 34, 41], ['Modriča', 18.30, 44.96, 35, 29, 35, 27],
  ['Odžak', 18.33, 45.01, 30, 20, 20, 54], ['Bosanski Šamac', 18.47, 45.06, 33, 7, 41, 45],
  ['Orašje', 18.69, 45.04, 28, 7, 15, 75], ['Gradačac', 18.43, 44.88, 56, 60, 20, 15],
  ['Brčko', 18.81, 44.87, 87, 44, 21, 25], ['Bijeljina', 19.21, 44.76, 97, 31, 59, 0.5],
  ['Lopare', 18.85, 44.64, 32, 38, 57, 4], ['Ugljevik', 18.99, 44.69, 25, 41, 57, 0.2],
  ['Srebrenik', 18.49, 44.71, 41, 75, 10, 11], ['Gračanica', 18.31, 44.70, 60, 72, 23, 2],
  ['Tuzla', 18.67, 44.54, 131, 48, 16, 15], ['Lukavac', 18.53, 44.54, 57, 67, 22, 4],
  ['Kalesija', 18.88, 44.44, 41, 80, 18, 0.2], ['Živinice', 18.65, 44.45, 55, 81, 6, 7],
  ['Banovići', 18.53, 44.41, 26, 73, 17, 2], ['Kladanj', 18.69, 44.23, 16, 73, 26, 0.2],
  ['Zvornik', 19.10, 44.39, 81, 59, 38, 0.2], ['Šekovići', 18.86, 44.30, 9, 3, 96, 0.2],
  ['Vlasenica', 18.94, 44.18, 34, 55, 42, 0.2], ['Bratunac', 19.33, 44.19, 33, 64, 34, 0.2],
  ['Srebrenica', 19.30, 44.10, 37, 73, 25, 0.2], ['Han Pijesak', 18.95, 44.08, 6, 40, 59, 0.2],
  ['Sokolac', 18.80, 43.94, 15, 30, 69, 0.2], ['Rogatica', 19.00, 43.80, 22, 60, 39, 0.2],
  ['Višegrad', 19.29, 43.78, 21, 63, 33, 0.2], ['Rudo', 19.37, 43.62, 11, 27, 71, 0.2],
  ['Goražde', 18.98, 43.67, 37, 70, 26, 0.2], ['Čajniče', 19.07, 43.56, 9, 45, 53, 0.2],
  ['Foča', 18.78, 43.51, 40, 51, 45, 0.2], ['Kalinovik', 18.45, 43.50, 5, 37, 61, 0.2],
  ['Trnovo', 18.45, 43.67, 7, 69, 29, 0.2], ['Pale', 18.57, 43.82, 16, 27, 69, 1],
  ['Sarajevo', 18.41, 43.86, 527, 50, 29, 7], ['Ilijaš', 18.27, 43.95, 25, 42, 45, 7],
  ['Hadžići', 18.20, 43.82, 24, 64, 26, 7], ['Konjic', 17.96, 43.65, 43, 55, 15, 26],
  ['Jablanica', 17.76, 43.66, 12, 72, 4, 18], ['Prozor', 17.61, 43.82, 19, 37, 0.2, 62],
  ['Mostar', 17.81, 43.34, 126, 35, 19, 34], ['Široki Brijeg', 17.59, 43.38, 27, 0.2, 0.2, 99],
  ['Posušje', 17.33, 43.47, 17, 0.2, 0.2, 99], ['Grude', 17.41, 43.37, 16, 0.2, 0.2, 99],
  ['Ljubuški', 17.55, 43.20, 28, 6, 0.2, 93], ['Čitluk', 17.70, 43.23, 15, 0.2, 0.2, 99],
  ['Čapljina', 17.71, 43.12, 27, 28, 14, 54], ['Stolac', 17.96, 43.08, 18, 44, 21, 33],
  ['Neum', 17.62, 42.92, 4, 5, 5, 87], ['Nevesinje', 18.11, 43.26, 14, 23, 75, 1],
  ['Gacko', 18.53, 43.17, 10, 36, 62, 0.2], ['Bileća', 18.43, 42.87, 13, 15, 80, 1],
  ['Ljubinje', 18.09, 42.95, 4, 8, 90, 1], ['Trebinje', 18.34, 42.71, 30, 18, 69, 4],
];

// Simplified national outline, clockwise from the north-west, [lon, lat].
const OUTLINE = [
  [15.73, 45.22], [16.00, 45.22], [16.20, 45.02], [16.38, 45.10], [16.60, 45.22], [16.95, 45.28],
  [17.25, 45.16], [17.55, 45.13], [17.85, 45.08], [18.05, 45.16], [18.35, 45.10], [18.65, 45.08],
  [18.85, 44.92], [19.10, 44.93], [19.38, 44.88], [19.25, 44.60], [19.12, 44.35], [19.40, 44.18],
  [19.62, 43.95], [19.50, 43.70], [19.25, 43.52], [18.95, 43.30], [18.65, 43.05], [18.55, 42.60],
  [18.30, 42.62], [18.00, 42.85], [17.65, 42.90], [17.35, 43.15], [17.15, 43.40], [16.85, 43.65],
  [16.55, 43.90], [16.25, 44.15], [16.05, 44.40], [15.75, 44.60], [15.72, 44.95],
];

// Labelled on the map for orientation.
const PLACES = ['Bihać', 'Banja Luka', 'Doboj', 'Tuzla', 'Bijeljina', 'Zenica', 'Sarajevo', 'Mostar', 'Livno', 'Foča', 'Trebinje', 'Drvar'];

const WEST = 15.70, NORTH = 45.35, DLON = 0.2, DLAT = 0.14, COLS = 20, ROWS = 20;
const KM_LON = 111.32 * Math.cos(44 * Math.PI / 180), KM_LAT = 110.57;
const SIGMA = 6; // km

function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const centre = (r, c) => [WEST + (c + 0.5) * DLON, NORTH - (r + 0.5) * DLAT];
const toCell = (lon, lat) => [Math.floor((NORTH - lat) / DLAT), Math.floor((lon - WEST) / DLON)];

const land = [];
for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (inside(centre(r, c), OUTLINE)) land.push([r, c]);

const acc = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
for (const [r, c] of land) acc[r][c] = [0, 0, 0];
for (const [, lon, lat, k, ...pct] of ANCHORS) {
  const w = land.map(([r, c]) => {
    const [x, y] = centre(r, c);
    const d2 = ((x - lon) * KM_LON) ** 2 + ((y - lat) * KM_LAT) ** 2;
    return Math.exp(-d2 / (2 * SIGMA * SIGMA));
  });
  const W = w.reduce((s, v) => s + v, 0);
  const pctSum = pct.reduce((s, v) => s + v, 0);
  land.forEach(([r, c], n) => {
    for (let g = 0; g < 3; g++) acc[r][c][g] += (k * 1000 * (pct[g] / 100)) * (w[n] / W);
  });
  if (pctSum > 101) throw new Error(`shares over 100% at ${lon},${lat}`);
}
// Round to the nearest 10 people, with a small rural floor so no cell is empty.
// Empty rows and columns around the edge are trimmed off.
const full = acc.map((row) => row.map((p) => p && p.map((v) => Math.round((v + 150) / 10) * 10)));
const used = (xs) => [xs.findIndex(Boolean), xs.findLastIndex(Boolean)];
const [r0, r1] = used(full.map((row) => row.some(Boolean)));
const [c0, c1] = used(full[0].map((_, c) => full.some((row) => row[c])));
const grid = full.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1));

const places = PLACES.map((name) => {
  const [, lon, lat] = ANCHORS.find((a) => a[0] === name);
  const [r, c] = toCell(lon, lat).map((v, k) => v - [r0, c0][k]);
  if (!grid[r]?.[c]) throw new Error(`${name} is off the map`);
  return { name, r, c };
});

const raw = {
  id: 'bosnia',
  name: 'Bosnia and Herzegovina',
  subtitle: 'simplified, 1991 census',
  cols: grid[0].length, rows: grid.length, cellKm: 16,
  maxTerritories: 3,
  groups: [
    { key: 'b', name: 'Bosniaks', color: '#2a9d8f' },
    { key: 's', name: 'Serbs', color: '#e76f51' },
    { key: 'c', name: 'Croats', color: '#7b6cc4' },
  ],
  grid,
  places,
};

const map = prepareMap(raw);
const best = solve(map, raw.maxTerritories, { restarts: 40 });
const { of } = territories(map, bordersOf(map, best.of)); // renumber in reading order
raw.optimum = { misplaced: best.misplaced, assignment: encodeAssignment(map, of) };

// One line per grid row keeps the file readable and diffs small.
const rowsJson = (name, rows) => `"${name}": [\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n ]`;
const { grid: _g, optimum, ...head } = raw;
const json = `${JSON.stringify(head, null, 1).slice(0, -2)},\n ${rowsJson('grid', grid)},\n "optimum": {\n  "misplaced": ${optimum.misplaced},\n  ${rowsJson('assignment', optimum.assignment)}\n }\n}\n`;
JSON.parse(json);
writeFileSync(new URL('../site/partition/data/bosnia.json', import.meta.url), json);

const pct = (v) => `${(100 * v / map.total).toFixed(1)}%`;
console.log(`${map.cells.length} cells, ${map.total.toLocaleString('en-GB')} people`);
console.log(`best border: ${best.misplaced.toLocaleString('en-GB')} misplaced (${pct(best.misplaced)})`);
console.log(`floor: ${pct(floorScore(map))}`);
console.log(raw.optimum.assignment.join('\n'));
