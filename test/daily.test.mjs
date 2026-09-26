import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildModel } from '../site/js/model.js';
import {
  PUZZLES, puzzleNumber, puzzleFor, areaMask, referenceOwner, puzzlePar, scorePuzzle, grade,
  shareText, emptyStats, recordResult,
} from '../site/js/daily.js';
import { GROUPS } from '../site/data/ethnic.js';

const model = buildModel();
const NATIONS = new Set(GROUPS.map((g) => g.nation));

test('puzzle numbers start on 26 September 2026 and advance daily', () => {
  assert.equal(puzzleNumber(new Date(2026, 8, 26, 0, 1)), 1);
  assert.equal(puzzleNumber(new Date(2026, 8, 26, 23, 59)), 1);
  assert.equal(puzzleNumber(new Date(2026, 8, 27, 9)), 2);
  assert.equal(puzzleNumber(new Date(2026, 9, 26, 12)), 31);
  // Daylight-saving changes must not skip or repeat a day.
  assert.equal(puzzleNumber(new Date(2026, 9, 26)) - puzzleNumber(new Date(2026, 9, 24)), 2);
});

test('the puzzle list repeats and every puzzle is well formed', () => {
  assert.equal(puzzleFor(1).title, puzzleFor(PUZZLES.length + 1).title);
  for (const [k, p] of PUZZLES.entries()) {
    const q = puzzleFor(k + 1);
    assert.ok(p.states.length >= 2 && p.states.length <= 3, p.title);
    for (const [, nation] of p.states) assert.ok(NATIONS.has(nation), `${p.title}: ${nation}`);
    assert.ok(q.countries.every((c) => /^#[0-9a-f]{6}$/.test(c.color)), `${p.title} colours`);
    assert.ok(p.lines >= 1 && p.lines <= 3);
    const [w, s, e, n] = p.area;
    assert.ok(w < e && s < n);
  }
});

test('every puzzle has a meaningful par that lazy answers cannot reach', () => {
  for (let k = 1; k <= PUZZLES.length; k++) {
    const p = puzzleFor(k), mask = areaMask(p);
    const par = puzzlePar(model, p, mask);
    assert.ok(par >= 15, `${p.title} par ${par}`);
    // Handing the whole area to one state must never earn a 🟩.
    for (let s = 0; s < p.countries.length; s++) {
      const own = new Int16Array(model.N).fill(-1);
      for (let i = 0; i < model.N; i++) if (model.land[i] && mask[i]) own[i] = s;
      const lazy = scorePuzzle(model, own, p, mask).peace;
      assert.notEqual(grade(lazy, par).emoji, '🟩', `${p.title}: all to ${p.countries[s].name} scores ${lazy} vs par ${par}`);
    }
    // The reference map itself earns a 🟩.
    assert.equal(grade(scorePuzzle(model, referenceOwner(model, p, mask), p, mask).peace, par).emoji, '🟩', p.title);
  }
});

test('puzzle scoring ignores land outside the area', () => {
  const p = puzzleFor(1), mask = areaMask(p);
  const own = referenceOwner(model, p, mask);
  const a = scorePuzzle(model, own, p, mask).peace;
  const noisy = own.slice();
  for (let i = 0; i < model.N; i++) if (model.land[i] && !mask[i]) noisy[i] = 1;
  assert.equal(scorePuzzle(model, noisy, p, mask).peace, a);
});

test('grades follow the ratio to par', () => {
  assert.equal(grade(60, 60).emoji, '🟩');
  assert.equal(grade(54, 60).emoji, '🟩');
  assert.equal(grade(50, 60).emoji, '🟨');
  assert.equal(grade(35, 60).emoji, '🟧');
  assert.equal(grade(10, 60).emoji, '🟥');
});

test('share text has number, tries, best score and the emoji row', () => {
  const p = puzzleFor(3);
  const txt = shareText(p, [{ score: 20, emoji: '🟧' }, { score: 61, emoji: '🟩' }], 'https://example.org/');
  assert.equal(txt, `Balkans 1878 #3 2/3 🕊️ 61\n${p.title}\n🟧🟩\nhttps://example.org/`);
  assert.match(shareText(p, [{ score: 5, emoji: '🟥' }, { score: 9, emoji: '🟥' }, { score: 30, emoji: '🟧' }], 'u'), /#3 X\/3 🕊️ 30/);
});

test('streaks count wins on consecutive days', () => {
  let s = emptyStats();
  s = recordResult(s, 1, '🟩');
  s = recordResult(s, 2, '🟩');
  assert.deepEqual([s.played, s.wins, s.streak, s.maxStreak], [2, 2, 2, 2]);
  s = recordResult(s, 2, '🟩'); // the same day twice does not count
  assert.equal(s.played, 2);
  s = recordResult(s, 3, '🟨');
  assert.equal(s.streak, 0);
  s = recordResult(s, 5, '🟩');
  s = recordResult(s, 7, '🟩'); // a missed day breaks the streak
  assert.deepEqual([s.played, s.wins, s.streak, s.maxStreak], [5, 4, 1, 2]);
  assert.deepEqual(s.dist, { '🟩': 4, '🟨': 1, '🟧': 0, '🟥': 0 });
});
