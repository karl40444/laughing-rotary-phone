import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  prepareMap, territories, score, floorScore, activeEdges, bordersOf, decodeAssignment, encodeAssignment,
  edgeBetween, hKey, vKey, peopleDots,
} from '../site/partition/js/engine.js';
import {
  puzzleNumber, efficiency, shareText, emptyStats, recordResult, currentStreak,
} from '../site/partition/js/daily.js';
import { ROTATION, regionFor } from '../site/partition/js/regions.js';
import { solve } from '../tools/partition-solve.mjs';

// A 3 x 2 toy map: a Serb-ish left column, a Croat-ish right column and a
// mixed middle.
//   [90,10] [50,50] [10,90]
//   [80,20] [40,60] [ 0,100]
const toy = prepareMap({
  cols: 3, rows: 2, maxTerritories: 2,
  groups: [{ name: 'A' }, { name: 'B' }],
  grid: [[[90, 10], [50, 50], [10, 90]], [[80, 20], [40, 60], [0, 100]]],
});

test('edges join adjacent vertices only', () => {
  assert.equal(edgeBetween([2, 3], [3, 3]), hKey(2, 3));
  assert.equal(edgeBetween([3, 4], [3, 3]), vKey(3, 3));
  assert.equal(edgeBetween([0, 0], [1, 1]), null);
  // Interior edges have land on both sides: 3 horizontal + 2 x 2 vertical.
  assert.equal(toy.interior.size, 7);
});

test('an open line does not split the map; a closed one does', () => {
  const half = new Set([vKey(1, 0)]);
  assert.equal(territories(toy, half).count, 1);
  assert.equal(activeEdges(toy, half, territories(toy, half).of).size, 0);
  const full = new Set([vKey(1, 0), vKey(1, 1)]);
  const { of, count } = territories(toy, full);
  assert.equal(count, 2);
  assert.deepEqual([...of], [0, 1, 1, 0, 1, 1]);
  assert.equal(activeEdges(toy, full, of).size, 2);
});

test('misplaced counts everyone outside each territory\'s majority', () => {
  const none = score(toy, new Int32Array(6), 1);
  assert.equal(none.total, 600);
  assert.equal(none.misplaced, 270); // A 270, B 330
  const { of, count } = territories(toy, new Set([vKey(1, 0), vKey(1, 1)]));
  const s = score(toy, of, count);
  assert.equal(s.misplaced, 30 + 100); // left: 30 B; right: 100 A
  assert.equal(s.territories[1].major, 1);
  assert.ok(Math.abs(s.share - 130 / 600) < 1e-12);
  assert.equal(floorScore(toy), 10 + 50 + 10 + 20 + 40 + 0);
});

test('people dots add up to 100 and put the wrong side first', () => {
  const { of, count } = territories(toy, new Set([vKey(1, 0), vKey(1, 1)]));
  const dots = peopleDots(toy, score(toy, of, count));
  assert.equal(dots.length, 100);
  // 130 of 600 people are on the wrong side: 21.7, so 22 dots.
  const wrong = dots.filter((d) => d.wrong);
  assert.equal(wrong.length, 22);
  assert.ok(dots.slice(0, 22).every((d) => d.wrong));
  // Left territory is A-majority, so its 30 B are wrong; right is B-majority, so its 100 A are.
  assert.equal(wrong.filter((d) => d.group === 1).length, 5);
  assert.equal(wrong.filter((d) => d.group === 0).length, 17);
});

test('the solver finds the toy optimum', () => {
  const best = solve(toy, 2, { restarts: 4, steps: 5000 });
  assert.equal(best.misplaced, 130);
  assert.deepEqual(decodeAssignment(toy, encodeAssignment(toy, best.of)), best.of);
});

const load = (id) => prepareMap(JSON.parse(readFileSync(new URL(`../site/partition/data/${id}.json`, import.meta.url))));
const maps = Object.fromEntries(ROTATION.map((id) => [id, load(id)]));

// Places whose local majority is not in doubt, as a check on each dataset.
const EXPECTED = {
  bosnia: { Sarajevo: 'Bosniaks', 'Banja Luka': 'Serbs', Trebinje: 'Serbs', Livno: 'Croats', Tuzla: 'Bosniaks' },
  punjab: { Rawalpindi: 'Muslims', Multan: 'Muslims', Lahore: 'Muslims', Ludhiana: 'Sikhs', Hissar: 'Hindus', Gurgaon: 'Hindus' },
  'northern-ireland': { Derry: 'Catholic', Newry: 'Catholic', Bangor: 'Protestant', Ballymena: 'Protestant' },
  belgium: { Antwerp: 'Dutch', Ghent: 'Dutch', Brussels: 'French', Liège: 'French', Eupen: 'German' },
  'north-macedonia': { Tetovo: 'Albanians', Bitola: 'Macedonians', Štip: 'Macedonians', Debar: 'Albanians' },
  palestine: { 'Tel Aviv': 'Jews', Nablus: 'Arabs', Hebron: 'Arabs', Gaza: 'Arabs' },
  bengal: { Dacca: 'Muslims', Mymensingh: 'Muslims', Calcutta: 'Hindus', Burdwan: 'Hindus', Midnapore: 'Hindus' },
  'sri-lanka': { Jaffna: 'Tamils', Colombo: 'Sinhalese', Galle: 'Sinhalese', 'Nuwara Eliya': 'Tamils', Kalmunai: 'Muslims' },
  cyprus: { Limassol: 'Greek Cypriots', Morphou: 'Greek Cypriots', Lefka: 'Turkish Cypriots' },
  kashmir: { Srinagar: 'Muslims', Jammu: 'Hindus', Kathua: 'Hindus', Leh: 'Buddhists', Gilgit: 'Muslims' },
  'armenia-azerbaijan': { Yerevan: 'Armenians', Stepanakert: 'Armenians', Baku: 'Azerbaijanis', Nakhchivan: 'Azerbaijanis' },
  quebec: { 'Quebec City': 'French', 'Trois-Rivières': 'French', Ottawa: 'English', Brockville: 'English', 'Prescott-Russell': 'French' },
};

test('the rotation starts with Bosnia and repeats', () => {
  assert.equal(regionFor(1), 'bosnia');
  assert.equal(regionFor(2), 'punjab');
  assert.equal(regionFor(ROTATION.length + 1), 'bosnia');
  assert.equal(new Set(ROTATION).size, ROTATION.length);
});

for (const [id, map] of Object.entries(maps)) {
  test(`${id}: the map is well formed and plausible`, () => {
    assert.equal(map.id, id);
    assert.ok(map.cells.length > 150 && map.cells.length < 400, `${map.cells.length} squares`);
    assert.ok(map.maxTerritories >= 2 && map.maxTerritories <= 4);
    assert.ok(map.name && map.subtitle && map.brief && map.source && map.history && map.cellKm > 0);
    assert.ok(map.cells.every((c) => c.total > 0 && c.pops.length === map.groups.length));
    // One connected landmass, so every square can join a territory.
    assert.equal(territories(map, new Set()).count, 1);
    const majorAt = (name) => {
      const p = map.places.find((q) => q.name === name);
      assert.ok(p, `${name} is labelled`);
      return map.groups[map.cells[map.at(p.r, p.c)].major].name;
    };
    for (const [place, group] of Object.entries(EXPECTED[id])) assert.equal(majorAt(place), group, place);
  });

  test(`${id}: the stored optimum is valid, honest and never zero`, () => {
    const of = decodeAssignment(map, map.optimum.assignment);
    // Contiguous: the territories cut out by its border are exactly its labels.
    const cut = territories(map, bordersOf(map, of));
    assert.ok(cut.count >= 2 && cut.count <= map.maxTerritories);
    assert.deepEqual([...cut.of], [...of]);
    const s = score(map, of, cut.count);
    assert.equal(s.misplaced, map.optimum.misplaced);
    const floor = floorScore(map);
    const none = score(map, new Int32Array(map.cells.length), 1).misplaced;
    assert.ok(floor <= s.misplaced && s.misplaced < none);
    assert.ok(s.share > 0.03, 'a perfectly clean partition should be impossible');
  });

  test(`${id}: a quick search never beats the stored optimum`, () => {
    const quick = solve(map, map.maxTerritories, { restarts: 2, steps: 60000, seed: 7 });
    assert.ok(quick.misplaced >= map.optimum.misplaced);
  });
}

test('puzzle numbers start on 26 September 2026 and advance daily', () => {
  assert.equal(puzzleNumber(new Date(2026, 8, 26, 0, 1)), 1);
  assert.equal(puzzleNumber(new Date(2026, 8, 26, 23, 59)), 1);
  assert.equal(puzzleNumber(new Date(2026, 8, 27, 9)), 2);
  assert.equal(puzzleNumber(new Date(2026, 9, 26)) - puzzleNumber(new Date(2026, 9, 24)), 2);
});

test('efficiency runs from no border (0) to the best border (1)', () => {
  assert.equal(efficiency(500, 500, 300), 0);
  assert.equal(efficiency(300, 500, 300), 1);
  assert.equal(efficiency(400, 500, 300), 0.5);
  assert.equal(efficiency(600, 500, 300), 0);
});

test('streaks and personal bests count only the first result each day', () => {
  let s = emptyStats();
  s = recordResult(s, 1, { eff: 0.5 });
  s = recordResult(s, 2, { eff: 0.8 });
  s = recordResult(s, 2, { eff: 1 }); // replay: ignored
  assert.equal(s.played, 2);
  assert.equal(s.streak, 2);
  assert.equal(s.bestEff, 0.8);
  s = recordResult(s, 5, { eff: 0.6 });
  assert.equal(s.streak, 1);
  assert.equal(s.maxStreak, 2);
  assert.equal(currentStreak(s, 6), 1);
  assert.equal(currentStreak(s, 7), 0);
});

test('the share card gives nothing away', () => {
  const text = shareText({
    number: 3, mapName: 'Bosnia and Herzegovina', share: 0.4567, bestShare: 0.4143, eff: 0.62,
    territories: [{ misplaced: 5, total: 100 }, { misplaced: 30, total: 100 }], ms: 84000,
  });
  assert.match(text, /^Partition #3 · Bosnia and Herzegovina/);
  assert.match(text, /🟦{6}⬜{4} 62% of the way to the best line/u);
  assert.match(text, /🟩🟨 45\.7% on the wrong side/u);
  assert.match(text, /1:24/);
  assert.equal(text.split('\n').length, 4);
});
