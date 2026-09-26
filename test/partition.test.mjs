import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  prepareMap, territories, score, floorScore, activeEdges, bordersOf, decodeAssignment, encodeAssignment,
  edgeBetween, hKey, vKey,
} from '../site/partition/js/engine.js';
import {
  puzzleNumber, efficiency, shareText, emptyStats, recordResult, currentStreak,
} from '../site/partition/js/daily.js';
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

test('the solver finds the toy optimum', () => {
  const best = solve(toy, 2, { restarts: 4, steps: 5000 });
  assert.equal(best.misplaced, 130);
  assert.deepEqual(decodeAssignment(toy, encodeAssignment(toy, best.of)), best.of);
});

const bosnia = prepareMap(JSON.parse(readFileSync(new URL('../site/partition/data/bosnia.json', import.meta.url))));

test('the Bosnia map is plausible', () => {
  assert.ok(bosnia.cells.length > 150 && bosnia.cells.length < 400, `${bosnia.cells.length} cells`);
  assert.ok(bosnia.total > 3.5e6 && bosnia.total < 4.5e6, `total ${bosnia.total}`);
  const majorAt = (name) => {
    const p = bosnia.places.find((q) => q.name === name);
    return bosnia.groups[bosnia.cells[bosnia.at(p.r, p.c)].major].name;
  };
  assert.equal(majorAt('Sarajevo'), 'Bosniaks');
  assert.equal(majorAt('Banja Luka'), 'Serbs');
  assert.equal(majorAt('Trebinje'), 'Serbs');
  assert.equal(majorAt('Livno'), 'Croats');
  assert.equal(majorAt('Tuzla'), 'Bosniaks');
});

test('the stored optimum is valid, honest and never zero', () => {
  const of = decodeAssignment(bosnia, bosnia.optimum.assignment);
  // Contiguous: the territories cut out by its border are exactly its labels.
  const cut = territories(bosnia, bordersOf(bosnia, of));
  assert.ok(cut.count >= 2 && cut.count <= bosnia.maxTerritories);
  assert.deepEqual([...cut.of], [...of]);
  const s = score(bosnia, of, cut.count);
  assert.equal(s.misplaced, bosnia.optimum.misplaced);
  const floor = floorScore(bosnia);
  const none = score(bosnia, new Int32Array(bosnia.cells.length), 1).misplaced;
  assert.ok(floor < s.misplaced && s.misplaced < none);
  assert.ok(s.share > 0.2, 'a clean partition should be impossible');
});

test('a quick search never beats the stored optimum', () => {
  const quick = solve(bosnia, bosnia.maxTerritories, { restarts: 2, steps: 60000, seed: 7 });
  assert.ok(quick.misplaced >= bosnia.optimum.misplaced);
});

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
  assert.match(text, /🟦{6}⬜{4} 62%/u);
  assert.match(text, /🟩🟨 45\.7% on the wrong side/u);
  assert.match(text, /1:24/);
  assert.equal(text.split('\n').length, 4);
});
