// Builds the Partition maps in site/partition/data/ from the region
// definitions in tools/partition-regions/, with the best border precomputed.
//   node tools/build-partition.mjs            all regions
//   node tools/build-partition.mjs punjab     just one
//
// Each region lists anchors (towns, municipalities or districts) with a
// population and the share of each group. Each anchor's people are spread
// over nearby squares with a Gaussian kernel. These are simplified teaching
// models, not demographic datasets.
import { readFileSync, writeFileSync } from 'node:fs';
import { feature } from 'topojson-client';
import { prepareMap, territories, bordersOf, encodeAssignment, floorScore } from '../site/partition/js/engine.js';
import { ROTATION } from '../site/partition/js/regions.js';
import { solve } from './partition-solve.mjs';

const KM_LAT = 110.57;

function insideRing([x, y], ring) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

// A polygon is a list of rings (outer, then holes): inside by even-odd.
const insidePolygon = (p, rings) => rings.reduce((hit, ring) => hit !== insideRing(p, ring), false);

let countries;
function naturalEarth(specs) {
  if (!countries) {
    const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-10m.json', import.meta.url)));
    countries = feature(topo, topo.objects.countries).features;
  }
  return specs.flatMap(({ name, containing }) => {
    const f = countries.find((c) => c.properties.name === name);
    if (!f) throw new Error(`no country called ${name}`);
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    return containing ? polys.filter((rings) => insidePolygon(containing, rings)) : polys;
  });
}

function gridFor(region) {
  if (region.grid) return region.grid;
  const [west, south, east, north] = region.bbox;
  const lat0 = (south + north) / 2;
  const dlat = region.cellKm / KM_LAT;
  const dlon = region.cellKm / (111.32 * Math.cos((lat0 * Math.PI) / 180));
  return {
    west, north, dlon, dlat, lat0, cellKm: region.cellKm,
    cols: Math.ceil((east - west) / dlon), rows: Math.ceil((north - south) / dlat),
  };
}

export function build(region) {
  const G = region.groups.length;
  const { west, north, dlon, dlat, cols, rows, lat0, cellKm } = gridFor(region);
  const kmLon = 111.32 * Math.cos((lat0 * Math.PI) / 180);
  const polygons = region.outline ? [[region.outline]] : naturalEarth(region.naturalEarth);
  const centre = (r, c) => [west + (c + 0.5) * dlon, north - (r + 0.5) * dlat];
  const toCell = (lon, lat) => [Math.floor((north - lat) / dlat), Math.floor((lon - west) / dlon)];

  const isLand = new Uint8Array(rows * cols);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const p = centre(r, c);
    if (polygons.some((rings) => insidePolygon(p, rings)) && !(region.holes ?? []).some((h) => insideRing(p, h))) isLand[r * cols + c] = 1;
  }
  // Causeways and narrow isthmuses the grid would miss, as [from, to] lines.
  for (const [[x1, y1], [x2, y2]] of region.links ?? []) {
    for (let t = 0; t <= 1; t += 0.02) {
      const [r, c] = toCell(x1 + t * (x2 - x1), y1 + t * (y2 - y1));
      if (r >= 0 && r < rows && c >= 0 && c < cols) isLand[r * cols + c] = 1;
    }
  }
  // Keep the largest group of edge-connected squares: islands and squares
  // touching only at a corner could never join a territory.
  let land = [];
  const seen = new Uint8Array(rows * cols);
  for (let s = 0; s < rows * cols; s++) {
    if (!isLand[s] || seen[s]) continue;
    const part = [], stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(), r = Math.floor(i / cols), c = i % cols;
      part.push([r, c]);
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc, j = rr * cols + cc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && isLand[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (part.length > land.length) land = part;
  }

  const acc = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
  for (const [r, c] of land) acc[r][c] = new Array(G).fill(0);
  const d2 = ([x, y], lon, lat) => ((x - lon) * kmLon) ** 2 + ((y - lat) * KM_LAT) ** 2;
  for (const [name, lon, lat, k, ...rest] of region.anchors) {
    const pct = rest.slice(0, G), sigma = rest[G] ?? region.sigmaKm;
    if (pct.length !== G) throw new Error(`${region.id}: ${name} needs ${G} shares`);
    if (pct.reduce((s, v) => s + v, 0) > 101) throw new Error(`${region.id}: ${name} shares over 100%`);
    const w = land.map(([r, c]) => Math.exp(-d2(centre(r, c), lon, lat) / (2 * sigma * sigma)));
    const W = w.reduce((s, v) => s + v, 0);
    if (!(W > 0)) throw new Error(`${region.id}: ${name} is too far from the map`);
    land.forEach(([r, c], n) => {
      for (let g = 0; g < G; g++) acc[r][c][g] += k * 1000 * (pct[g] / 100) * (w[n] / W);
    });
  }

  // A small rural floor so no square is empty: either a flat number of each
  // group, or a few people mixed like the square (or its nearest anchor).
  const nearestMix = (r, c) => {
    let best = null, bd = Infinity;
    for (const [, lon, lat, , ...rest] of region.anchors) {
      const d = d2(centre(r, c), lon, lat);
      if (d < bd) { bd = d; best = rest.slice(0, G); }
    }
    return best;
  };
  const full = acc.map((row, r) => row.map((p, c) => {
    if (!p) return null;
    let add;
    if (region.floor.perGroup) add = p.map(() => region.floor.perGroup);
    else {
      const sum = p.reduce((s, v) => s + v, 0);
      const mix = sum > 1 ? p : nearestMix(r, c);
      const m = mix.reduce((s, v) => s + v, 0);
      add = mix.map((v) => (region.floor.total * v) / m);
    }
    return p.map((v, g) => Math.round((v + add[g]) / 10) * 10);
  }));

  // Empty rows and columns around the edge are trimmed off.
  const used = (xs) => [xs.findIndex(Boolean), xs.findLastIndex(Boolean)];
  const [r0, r1] = used(full.map((row) => row.some(Boolean)));
  const [c0, c1] = used(full[0].map((_, c) => full.some((row) => row[c])));
  const grid = full.slice(r0, r1 + 1).map((row) => row.slice(c0, c1 + 1));

  const places = region.places.map((place) => {
    const [name, lon, lat] = typeof place === 'string' ? region.anchors.find((a) => a[0] === place) : place;
    // Coastal towns can fall in a sea square: use the nearest land square.
    const [tr, tc] = toCell(lon, lat).map((v, k) => v - [r0, c0][k]);
    let spot = null, bd = Infinity;
    grid.forEach((row, r) => row.forEach((p, c) => {
      const d = (r - tr) ** 2 + (c - tc) ** 2;
      if (p && d < bd) { bd = d; spot = { name, r, c }; }
    }));
    if (bd > 2) throw new Error(`${region.id}: ${name} is off the map`);
    return spot;
  });

  const raw = {
    id: region.id,
    name: region.name,
    subtitle: region.subtitle,
    brief: region.brief,
    note: region.note,
    cols: grid[0].length, rows: grid.length, cellKm: Math.round(cellKm),
    maxTerritories: region.maxTerritories,
    groups: region.groups,
    places,
    grid,
  };

  const map = prepareMap(raw);
  const best = solve(map, raw.maxTerritories, { restarts: 40 });
  const { of } = territories(map, bordersOf(map, best.of)); // renumber in reading order
  raw.optimum = { misplaced: best.misplaced, assignment: encodeAssignment(map, of) };
  return { raw, map, best };
}

// One line per grid row keeps the file readable and diffs small.
function toJson(raw) {
  const rowsJson = (name, rows) => `"${name}": [\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n ]`;
  const { grid, optimum, ...head } = raw;
  const json = `${JSON.stringify(head, null, 1).slice(0, -2)},\n ${rowsJson('grid', grid)},\n "optimum": {\n  "misplaced": ${optimum.misplaced},\n  ${rowsJson('assignment', optimum.assignment)}\n }\n}\n`;
  JSON.parse(json);
  return json;
}

const ids = process.argv.length > 2 ? process.argv.slice(2) : ROTATION;
for (const id of ids) {
  const region = (await import(`./partition-regions/${id}.mjs`)).default;
  const { raw, map, best } = build(region);
  writeFileSync(new URL(`../site/partition/data/${id}.json`, import.meta.url), toJson(raw));
  const pct = (v) => `${((100 * v) / map.total).toFixed(1)}%`;
  const none = map.total - Math.max(...map.groups.map((_, g) => map.cells.reduce((s, c) => s + c.pops[g], 0)));
  console.log(`\n${id}: ${map.cells.length} squares of ${raw.cellKm} km, ${map.total.toLocaleString('en-GB')} people`);
  console.log(`  no border ${pct(none)} · best ${pct(best.misplaced)} · floor ${pct(floorScore(map))}`);
  console.log(raw.optimum.assignment.map((r) => `  ${r}`).join('\n'));
}
