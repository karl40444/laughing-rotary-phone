// Daily puzzles: one small border problem a day, the same for everyone.
import { COLS, ROWS, toGrid } from './grid.js';
import { G } from './model.js';
import { evaluate, KIN } from './score.js';
import { GROUPS } from '../data/ethnic.js';

// Puzzle #1 is 26 September 2026 (local time); the list then repeats.
const EPOCH = new Date(2026, 8, 26);
const DAY = 86400000;

// Each state is tinted like its people on the ethnic map, so Serbia reads
// as blue and Bulgaria as pink in both views.
const NATION_COLOURS = {
  Serbia: '#6378c9', Bulgaria: '#ec9db1', Greece: '#5bb8a8', Romania: '#e8c93f', Hungary: '#66bd5f',
  Croatia: '#dc5f58', Bosnia: '#6f9a63', Albania: '#a97c55', Turkey: '#bdbb52', Italy: '#5fd3c7',
  Slovenia: '#9a5cb0', Ruthenia: '#4d93c6',
};

// area: [west, south, east, north] in degrees. states: [name, nation] where
// nation is a GROUPS[].nation. lines: how many border lines may be drawn.
export const PUZZLES = [
  {
    title: 'Serbia or Bulgaria?',
    brief: 'The Morava and Timok valleys, Niš and Pirot: in 1885 Serbia and Bulgaria went to war over this frontier. Draw it so they never do.',
    area: [20.6, 42.3, 23.6, 44.35], states: [['Serbia', 'Serbia'], ['Bulgaria', 'Bulgaria']], lines: 2,
  },
  {
    title: 'Macedonia, three ways',
    brief: 'Slav villages in the middle, Albanians in the west, Greeks in the south, and Turks everywhere between. The powers fought two wars over Macedonia in 1912–13. Divide it between Bulgaria, Albania and Greece.',
    area: [20.4, 40.45, 23.4, 42.4], states: [['Bulgaria', 'Bulgaria'], ['Albania', 'Albania'], ['Greece', 'Greece']], lines: 3,
  },
  {
    title: 'Transylvania',
    brief: 'Romanians, Hungarians, Székelys and Saxons live side by side beyond the Carpathians. Split the land between Hungary and Romania.',
    area: [21.0, 45.3, 26.6, 48.0], states: [['Hungary', 'Hungary'], ['Romania', 'Romania']], lines: 3,
  },
  {
    title: 'Bosnia and Herzegovina',
    brief: 'Orthodox, Muslim and Catholic villages interleave across Bosnia. Draw borders for Croatia, Serbia and a Bosnian state.',
    area: [15.7, 42.55, 19.65, 45.3], states: [['Croatia', 'Croatia'], ['Serbia', 'Serbia'], ['Bosnia', 'Bosnia']], lines: 3,
  },
  {
    title: 'Kosovo',
    brief: 'The Field of Kosovo and the Patriarchate of Peć are sacred to Serbs; most people here are Albanian. Divide the land between Serbia and Albania.',
    area: [19.7, 41.85, 22.0, 43.4], states: [['Serbia', 'Serbia'], ['Albania', 'Albania']], lines: 2,
  },
  {
    title: 'Dobruja',
    brief: 'Turks, Tatars, Romanians and Bulgarians share the steppe between the Danube and the Black Sea. Draw the Romania–Bulgaria line.',
    area: [26.8, 43.3, 29.8, 45.5], states: [['Romania', 'Romania'], ['Bulgaria', 'Bulgaria']], lines: 2,
  },
  {
    title: 'Epirus',
    brief: 'Greeks, Muslim and Orthodox Albanians and Vlachs share the mountains around Ioannina. Draw the Greece–Albania border.',
    area: [19.3, 39.0, 21.6, 41.0], states: [['Albania', 'Albania'], ['Greece', 'Greece']], lines: 2,
  },
  {
    title: 'Thrace',
    brief: 'Bulgarians, Greeks, Turks and Pomaks, with Adrianople and the road to Constantinople at stake. Divide Thrace in three.',
    area: [24.0, 40.3, 29.4, 42.8], states: [['Bulgaria', 'Bulgaria'], ['Greece', 'Greece'], ['Turkey', 'Turkey']], lines: 3,
  },
  {
    title: 'The Banat',
    brief: 'Serbs, Romanians, Hungarians and Swabian Germans farm the plain north of the Danube. Share it between three states.',
    area: [19.9, 44.6, 22.8, 46.4], states: [['Hungary', 'Hungary'], ['Serbia', 'Serbia'], ['Romania', 'Romania']], lines: 3,
  },
  {
    title: 'Trieste and Istria',
    brief: 'Italian towns on the coast, Slovene and Croat villages inland. Draw borders for Italy, Slovenia and Croatia.',
    area: [13.0, 44.8, 16.2, 46.8], states: [['Italy', 'Italy'], ['Slovenia', 'Slovenia'], ['Croatia', 'Croatia']], lines: 3,
  },
  {
    title: 'Bessarabia',
    brief: 'Moldavian Romanians, Ukrainians, Russians and Bulgarian colonists between the Prut and the Dniester. Split it between Romania and Ruthenia.',
    area: [26.6, 45.2, 30.0, 48.6], states: [['Romania', 'Romania'], ['Ruthenia', 'Ruthenia']], lines: 2,
  },
  {
    title: 'The Sandžak',
    brief: 'A strip of Muslim and Orthodox country wedged between Serbia and Montenegro. Divide it between Serbia, Bosnia and Albania.',
    area: [18.8, 42.35, 21.0, 43.8], states: [['Bosnia', 'Bosnia'], ['Serbia', 'Serbia'], ['Albania', 'Albania']], lines: 3,
  },
  {
    title: 'San Stefano',
    brief: 'Russia\'s treaty of March 1878 created a Greater Bulgaria; the Powers tore it up. Draw your own Bulgaria between Greece and Turkey.',
    area: [22.0, 40.4, 28.6, 44.25], states: [['Bulgaria', 'Bulgaria'], ['Greece', 'Greece'], ['Turkey', 'Turkey']], lines: 3,
  },
  {
    title: 'Salonica',
    brief: 'A city of Jews, Turks and Greeks, with Bulgarian villages all around. Draw the Greece–Bulgaria border.',
    area: [22.0, 40.0, 24.6, 41.65], states: [['Greece', 'Greece'], ['Bulgaria', 'Bulgaria']], lines: 2,
  },
  {
    title: 'Slavonia and Syrmia',
    brief: 'Croats, Serbs, Hungarians and Germans between the Drava, the Sava and the Danube. Share them out between three states.',
    area: [17.4, 44.7, 20.5, 46.3], states: [['Hungary', 'Hungary'], ['Croatia', 'Croatia'], ['Serbia', 'Serbia']], lines: 3,
  },
  {
    title: 'Smyrna',
    brief: 'Greeks crowd the Aegean coast and islands; the interior is Turkish. In 1919 this became a war. Draw the Greece–Turkey line.',
    area: [26.0, 37.0, 29.8, 41.0], states: [['Greece', 'Greece'], ['Turkey', 'Turkey']], lines: 2,
  },
];

export function puzzleNumber(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(1, Math.round((d - EPOCH) / DAY) + 1);
}

export function puzzleFor(number) {
  const p = PUZZLES[(number - 1) % PUZZLES.length];
  return {
    ...p,
    number,
    countries: p.states.map(([name, nation]) => ({ name, nation, color: NATION_COLOURS[nation], autoName: false })),
  };
}

// Cells inside the puzzle's box.
export function areaMask(puzzle) {
  const mask = new Uint8Array(COLS * ROWS);
  const [w, s, e, n] = puzzle.area;
  const [x0, y0] = toGrid(w, n), [x1, y1] = toGrid(e, s);
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(ROWS, Math.ceil(y1)); y++)
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(COLS, Math.ceil(x1)); x++) mask[y * COLS + x] = 1;
  return mask;
}

// How at home group g feels in a state of the given nation (0–1).
function affinity(g, nation) {
  if (GROUPS[g].nation === nation) return 1;
  let best = 0;
  GROUPS.forEach((h, k) => { if (h.nation === nation) best = Math.max(best, KIN[g][k]); });
  return best;
}

// A strong reference solution: every cell goes to the state its people feel
// most at home in, then the map is smoothed into compact blocks, as a good
// player with a few lines would draw it. Its score is the puzzle's "par".
export function referenceOwner(model, puzzle, mask) {
  const S = puzzle.countries.length;
  const aff = puzzle.countries.map((c) => GROUPS.map((_, g) => affinity(g, c.nation)));
  let own = new Int16Array(model.N).fill(-1);
  const frontier = [];
  for (let i = 0; i < model.N; i++) {
    if (!model.land[i] || !mask[i]) continue;
    let best = -1, bv = 0.05;
    for (let s = 0; s < S; s++) {
      let v = 0;
      for (let g = 0; g < G; g++) v += model.comp[i * G + g] * aff[s][g];
      if (v > bv) { bv = v; best = s; }
    }
    own[i] = best;
    if (best >= 0) frontier.push(i);
  }
  // Cells nobody wants go to the nearest state.
  let f = frontier;
  while (f.length) {
    const next = [];
    for (const i of f) {
      const x = i % COLS;
      for (const j of [x > 0 ? i - 1 : -1, x < COLS - 1 ? i + 1 : -1, i - COLS, i + COLS]) {
        if (j < 0 || j >= model.N || !model.land[j] || !mask[j] || own[j] >= 0) continue;
        own[j] = own[i];
        next.push(j);
      }
    }
    f = next;
  }
  // Majority smoothing, weighted by population.
  for (let it = 0; it < 3; it++) {
    const nxt = own.slice();
    for (let i = 0; i < model.N; i++) {
      if (own[i] < 0) continue;
      const x = i % COLS, y = Math.floor(i / COLS);
      const votes = new Float64Array(S);
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= COLS || Y >= ROWS) continue;
        const j = Y * COLS + X;
        if (own[j] >= 0) votes[own[j]] += model.pop[j] + 1;
      }
      nxt[i] = votes.indexOf(Math.max(...votes));
    }
    own = nxt;
  }
  return own;
}

export const scorePuzzle = (model, owner, puzzle, mask) => evaluate(model, owner, puzzle.countries, { mask, allNeighbours: true });

// Straight bands across the area, in every order of the states, along both axes.
function bandOwners(model, puzzle, mask) {
  const S = puzzle.countries.length;
  const perms = S === 2 ? [[0, 1], [1, 0]] : [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  let x0 = COLS, x1 = 0, y0 = ROWS, y1 = 0;
  for (let i = 0; i < model.N; i++) if (model.land[i] && mask[i]) {
    const x = i % COLS, y = Math.floor(i / COLS);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const out = [];
  for (const axis of [0, 1]) for (const perm of perms) for (const shift of [-0.15, 0, 0.15]) {
    const own = new Int16Array(model.N).fill(-1);
    for (let i = 0; i < model.N; i++) {
      if (!model.land[i] || !mask[i]) continue;
      const t = axis ? (Math.floor(i / COLS) - y0) / (y1 - y0 + 1) : (i % COLS - x0) / (x1 - x0 + 1);
      own[i] = perm[Math.max(0, Math.min(S - 1, Math.floor((t + shift) * S)))];
    }
    out.push(own);
  }
  return out;
}

// Par: the best of the reference map and simple banded splits.
export function puzzlePar(model, puzzle, mask) {
  let best = scorePuzzle(model, referenceOwner(model, puzzle, mask), puzzle, mask).peace;
  for (const own of bandOwners(model, puzzle, mask)) best = Math.max(best, scorePuzzle(model, own, puzzle, mask).peace);
  return best;
}

// Grade an attempt against par.
export const GRADES = [
  { min: 0.9, emoji: '🟩', label: 'Statesman' },
  { min: 0.75, emoji: '🟨', label: 'Diplomat' },
  { min: 0.5, emoji: '🟧', label: 'Envoy' },
  { min: -Infinity, emoji: '🟥', label: 'Warmonger' },
];
export function grade(score, par) {
  const r = score / Math.max(par, 1);
  return GRADES.find((g) => r >= g.min);
}

export const MAX_ATTEMPTS = 3;

export function shareText(puzzle, attempts, url) {
  const best = Math.max(...attempts.map((a) => a.score));
  const won = attempts.some((a) => a.emoji === '🟩');
  const tries = won ? attempts.findIndex((a) => a.emoji === '🟩') + 1 : 'X';
  return `Balkans 1878 #${puzzle.number} ${tries}/${MAX_ATTEMPTS} 🕊️ ${best}\n${puzzle.title}\n${attempts.map((a) => a.emoji).join('')}\n${url}`;
}

// ---- Stats (per device) ----
export function emptyStats() {
  return { played: 0, wins: 0, streak: 0, maxStreak: 0, lastPlayed: 0, lastWin: 0, dist: { '🟩': 0, '🟨': 0, '🟧': 0, '🟥': 0 } };
}

// Record a finished puzzle. Streak = consecutive days finished with a 🟩.
export function recordResult(stats, number, bestEmoji) {
  const s = { ...stats, dist: { ...stats.dist } };
  if (s.lastPlayed === number) return s;
  s.played++;
  s.lastPlayed = number;
  s.dist[bestEmoji] = (s.dist[bestEmoji] || 0) + 1;
  if (bestEmoji === '🟩') {
    s.wins++;
    s.streak = s.lastWin === number - 1 ? s.streak + 1 : 1;
    s.lastWin = number;
    s.maxStreak = Math.max(s.maxStreak, s.streak);
  } else {
    s.streak = 0;
  }
  return s;
}
