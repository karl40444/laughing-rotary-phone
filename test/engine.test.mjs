import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COLS, ROWS, toGrid, encodeRLE, decodeRLE } from '../site/js/grid.js';
import { buildModel, G } from '../site/js/model.js';
import { rasteriseLines, labelRegions } from '../site/js/regions.js';
import { evaluate } from '../site/js/score.js';
import { berlinOwner, BERLIN_COUNTRIES } from '../site/js/history.js';
import { pack, unpack } from '../site/js/share.js';
import { GROUPS } from '../site/data/ethnic.js';

const model = buildModel();
const regionAt = (region, lon, lat) => {
  const [x, y] = toGrid(lon, lat);
  return region[Math.floor(y) * COLS + Math.floor(x)];
};

test('RLE round-trips a mask', () => {
  const m = Uint8Array.from({ length: 1000 }, (_, i) => (i % 7 < 3 ? 1 : 0));
  assert.deepEqual(decodeRLE(encodeRLE(m), m.length), m);
});

test('population model is plausible', () => {
  assert.ok(model.total > 30e6 && model.total < 55e6, `total ${model.total}`);
  for (let i = 0; i < model.N; i += 97) {
    if (!model.land[i]) continue;
    let s = 0;
    for (let g = 0; g < G; g++) s += model.comp[i * G + g];
    assert.ok(Math.abs(s - 1) < 1e-4, 'mix sums to 1');
  }
  const major = (lon, lat) => {
    const [x, y] = toGrid(lon, lat);
    return GROUPS[model.major[Math.floor(y) * COLS + Math.floor(x)]].key;
  };
  assert.equal(major(26.1, 44.43), 'ro'); // Bucharest
  assert.equal(major(20.9, 44.0), 'sr'); // Šumadija
  assert.equal(major(22.37, 37.51), 'gr'); // Peloponnese
  assert.equal(major(25.62, 43.08), 'bg'); // Tarnovo
  assert.equal(major(19.7, 46.9), 'hu'); // Great Plain
  assert.equal(major(15.98, 45.81), 'hr'); // Zagreb
});

test('Italy is not part of the playable land', () => {
  const [x, y] = toGrid(16.0, 41.0); // Apulia
  assert.equal(model.land[Math.floor(y) * COLS + Math.floor(x)], 0);
});

test('a line from coast to coast splits the land, closing small gaps', () => {
  // Synthetic island: a 60×30 rectangle of land.
  const land = new Uint8Array(COLS * ROWS);
  for (let y = 20; y < 50; y++) for (let x = 20; x < 80; x++) land[y * COLS + x] = 1;
  assert.equal(labelRegions(land, rasteriseLines([], land)).count, 1);
  // Vertical line stopping 5 cells short of each coast: the ends snap shut.
  const r = labelRegions(land, rasteriseLines([[[50.5, 25.5], [50.5, 44.5]]], land));
  assert.equal(r.count, 2);
  assert.notEqual(r.region[30 * COLS + 30], r.region[30 * COLS + 70]);
  // Every land cell (walls included) belongs to a region.
  for (let i = 0; i < land.length; i++) if (land[i]) assert.ok(r.region[i] >= 0);
  // A line that stops far short (20 cells) of a coast does not cut.
  const open = labelRegions(land, rasteriseLines([[[50.5, 20.5], [50.5, 28.5]]], land));
  assert.equal(open.count, 1);
});

test('tiny slivers join their neighbour instead of becoming regions', () => {
  const land = new Uint8Array(COLS * ROWS);
  for (let y = 20; y < 50; y++) for (let x = 20; x < 80; x++) land[y * COLS + x] = 1;
  // A line cutting a 2×2 corner off the island.
  const r = labelRegions(land, rasteriseLines([[[22.5, 19.5], [22.5, 22.5], [19.5, 22.5]]], land));
  assert.equal(r.count, 1);
});

test('a short line in open country cuts nothing', () => {
  const none = labelRegions(model.land, rasteriseLines([], model.land));
  const line = [toGrid(20.5, 44.0), toGrid(21.0, 44.2)];
  const r = labelRegions(model.land, rasteriseLines([line], model.land));
  assert.equal(r.count, none.count);
});

test('scores rank sensible borders above empires and chaos', () => {
  const nothing = evaluate(model, new Int16Array(model.N).fill(-1), []);
  const union = evaluate(model, new Int16Array(model.N).fill(0), [{ name: 'Union' }]);
  const berlin = evaluate(model, berlinOwner(model), BERLIN_COUNTRIES);
  // Nation state per cell by plurality.
  const nations = [...new Set(GROUPS.map((g) => g.nation))];
  const own = new Int16Array(model.N).fill(-1);
  for (let i = 0; i < model.N; i++) {
    if (!model.land[i]) continue;
    const by = new Float64Array(nations.length);
    for (let g = 0; g < G; g++) by[nations.indexOf(GROUPS[g].nation)] += model.comp[i * G + g];
    own[i] = by.indexOf(Math.max(...by));
  }
  const ethnic = evaluate(model, own, nations.map((name) => ({ name })));
  assert.equal(nothing.peace, 0);
  assert.ok(union.peace < berlin.peace, `union ${union.peace} < berlin ${berlin.peace}`);
  assert.ok(berlin.peace < ethnic.peace, `berlin ${berlin.peace} < ethnic ${ethnic.peace}`);
  assert.ok(ethnic.fairness > berlin.fairness);
  // The real settlement should flag the wars that actually happened.
  const names = BERLIN_COUNTRIES.map((c) => c.name);
  const risky = berlin.wars.filter((w) => w.chance > 0.5).map((w) => [names[w.a], names[w.b]].sort().join('/'));
  assert.ok(risky.includes('Greece/Ottoman Empire'));
  assert.ok(risky.includes('Bulgaria/Ottoman Empire'));
});

test('holy sites create claims on the holder', () => {
  // Serbia and Albania split along 21.5°E longitude inside Kosovo's latitude band:
  // all of Kosovo (incl. Peć) goes to a mostly-Albanian state.
  const own = new Int16Array(model.N).fill(-1);
  for (let i = 0; i < model.N; i++) {
    if (!model.land[i]) continue;
    const x = i % COLS, y = Math.floor(i / COLS);
    const lat = 48.6 - (y + 0.5) * 0.05;
    const [kx] = toGrid(21.5, 0);
    if (lat > 43.2) own[i] = 0; else if (lat > 41.8 && x < kx) own[i] = 1; else own[i] = 2;
  }
  const r = evaluate(model, own, [{ name: 'North' }, { name: 'Kosovo' }, { name: 'South' }]);
  const peć = r.sites.find((s) => s.name === 'Patriarchate of Peć');
  assert.equal(peć.owner, 1);
});

test('share encoding round-trips', () => {
  const s = {
    lines: [[[10, 20], [12.5, 21], [15, 30.5]]],
    countries: [{ name: 'Rumelia', color: '#abcdef', autoName: false }],
    claims: [{ cell: 1234, country: 0 }],
  };
  const back = unpack(JSON.parse(JSON.stringify(pack(s))));
  assert.deepEqual(back, s);
});

test('1878 borders put key cities in the right states', () => {
  const owner = berlinOwner(model);
  const at = (lon, lat) => {
    const [x, y] = toGrid(lon, lat);
    return BERLIN_COUNTRIES[owner[Math.floor(y) * COLS + Math.floor(x)]].name;
  };
  assert.equal(at(20.46, 44.78), 'Serbia');
  assert.equal(at(26.1, 44.43), 'Romania');
  assert.equal(at(23.32, 42.7), 'Bulgaria');
  assert.equal(at(24.75, 42.15), 'Eastern Rumelia');
  assert.equal(at(23.73, 37.98), 'Greece');
  assert.equal(at(22.94, 40.66), 'Ottoman Empire');
  assert.equal(at(18.41, 43.86), 'Austria-Hungary');
  assert.equal(at(18.93, 42.4), 'Montenegro');
  assert.equal(at(28.86, 47.0), 'Russian Empire');
  assert.ok(ROWS > 0);
});
