// Scores a set of borders: will the new states go to war, and will they hold
// together? Works on a per-cell owner array (country index, or -1 = unclaimed).
import { COLS } from './grid.js';
import { toGrid } from './grid.js';
import { GROUPS, KINSHIP, HOSTILITY, SITES } from '../data/ethnic.js';
import { G, GROUP_INDEX } from './model.js';

const NATIONS = [...new Set(GROUPS.map((g) => g.nation))];
const NATION_OF = GROUPS.map((g) => NATIONS.indexOf(g.nation));
const NN = NATIONS.length;

function pairMatrix(list, fallback) {
  const m = Array.from({ length: G }, (_, a) => Array.from({ length: G }, (_, b) => fallback(a, b)));
  for (const [a, b, v] of list) {
    const i = GROUP_INDEX[a], j = GROUP_INDEX[b];
    m[i][j] = m[j][i] = v;
  }
  return m;
}

export const KIN = pairMatrix(KINSHIP, (a, b) => (a === b || NATION_OF[a] === NATION_OF[b] ? 1 : 0));

function defaultHostility(a, b) {
  if (a === b || NATION_OF[a] === NATION_OF[b]) return 0;
  const ra = GROUPS[a].rel, rb = GROUPS[b].rel;
  if (ra === rb) return 0.2;
  if (ra === 'jew' || rb === 'jew') return 0.35;
  if (ra === 'musl' || rb === 'musl') return 0.75;
  return 0.35; // Orthodox vs Catholic
}
export const HOSTILE = pairMatrix(HOSTILITY, defaultHostility);

export const SITE_CELLS = SITES.map(([name, lon, lat, claims]) => {
  const [x, y] = toGrid(lon, lat);
  return { name, cell: Math.floor(y) * COLS + Math.floor(x), claims };
});

// Tuning constants.
const STRANDED_SHARE_PTS = 70;      // tension for losing 100% of a nation to a neighbour
const STRANDED_ABS_PTS = 1 / 80000; // tension per stranded person
const SITE_PTS = 15;                // a fully-weighted holy site in foreign hands
const DISTANT_FACTOR = 0.5;         // grievance against a non-neighbour
const MIN_VIABLE = 150000;
const DIASPORA = GROUPS.map((g) => !!g.diaspora);

const logistic = (x) => 1 / (1 + Math.exp(-x));
// Chance that a border dispute of tension t ends in war within a generation.
export const warChance = (t) => logistic((t - 55) / 9);
// Chance that a state with this unrest suffers a revolt or civil war.
export const revoltChance = (u) => logistic((u - 36) / 5);

export function riskLabel(t) {
  if (t >= 55) return 'War certain';
  if (t >= 30) return 'War likely';
  if (t >= 15) return 'Tense';
  return 'Peaceful';
}
export function unrestLabel(u) {
  if (u >= 40) return 'Revolt likely';
  if (u >= 25) return 'Unrest';
  if (u >= 12) return 'Restless';
  return 'Stable';
}

// Fallback land-cell finder for sites that fall just offshore. Returns
// undefined when the site is outside the scored area.
function siteOwner(site, owner, land, N) {
  if (land[site.cell]) return owner[site.cell];
  for (let r = 1; r <= 3; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const i = site.cell + dy * COLS + dx;
        if (i >= 0 && i < N && land[i]) return owner[i];
      }
  return undefined;
}

/**
 * @param model   from buildModel()
 * @param owner   Int16Array/Int32Array per cell: country index or -1
 * @param countries array of { name } (index = country id)
 * @param options.mask optional Uint8Array: score only these cells (daily puzzles)
 * @param options.allNeighbours treat every pair of states as neighbours (in a
 *   puzzle they all border each other just outside the area)
 * A country may carry `nation`: that nation is then its only titular nation,
 * and the country is always its homeland, even with no land in the area.
 */
export function evaluate(model, owner, countries, { mask = null, allNeighbours = false } = {}) {
  const C = countries.length;
  const U = C; // bucket for unclaimed land
  const byGroup = Array.from({ length: C + 1 }, () => new Float64Array(G));
  const { N, pop, comp } = model;
  const land = mask ? model.land.map((v, i) => v & mask[i]) : model.land;

  for (let i = 0; i < N; i++) {
    if (!land[i]) continue;
    const c = owner[i] >= 0 ? owner[i] : U;
    const p = pop[i], base = i * G, row = byGroup[c];
    for (let g = 0; g < G; g++) row[g] += p * comp[base + g];
  }

  // Borders between countries (4-neighbour land adjacency).
  const adjacent = Array.from({ length: C }, () => new Uint8Array(C));
  for (let i = 0; i < N; i++) {
    if (!land[i] || owner[i] < 0) continue;
    const a = owner[i];
    for (const j of [(i % COLS) < COLS - 1 ? i + 1 : -1, i + COLS]) {
      if (j < 0 || j >= N || !land[j] || owner[j] < 0 || owner[j] === a) continue;
      adjacent[a][owner[j]] = adjacent[owner[j]][a] = 1;
    }
  }

  const totals = byGroup.map((row) => row.reduce((s, v) => s + v, 0));
  const nationTotals = new Float64Array(NN);
  for (let c = 0; c <= C; c++) for (let g = 0; g < G; g++) nationTotals[NATION_OF[g]] += byGroup[c][g];

  // Titular nations: the largest nation, plus any other with ≥ 33%.
  const titular = byGroup.map((row, c) => {
    const set = new Set();
    if (c === U) return set;
    if (countries[c].nation) return set.add(NATIONS.indexOf(countries[c].nation));
    if (totals[c] <= 0) return set;
    const byNation = new Float64Array(NN);
    for (let g = 0; g < G; g++) byNation[NATION_OF[g]] += row[g];
    let best = 0;
    for (let n = 1; n < NN; n++) if (byNation[n] > byNation[best]) best = n;
    set.add(best);
    for (let n = 0; n < NN; n++) if (byNation[n] / totals[c] >= 0.33) set.add(n);
    return set;
  });

  // How at home a member of group g is in country c (0–1).
  const content = (g, c) => {
    if (c === U) return 0;
    if (titular[c].has(NATION_OF[g])) return 1;
    let best = DIASPORA[g] ? 0.6 : 0;
    const row = byGroup[c];
    // A named puzzle state has its whole nation behind it, even outside the area.
    const named = !!countries[c].nation;
    for (let t = 0; t < G; t++) {
      if (!titular[c].has(NATION_OF[t]) || (!named && row[t] <= 0)) continue;
      best = Math.max(best, KIN[g][t] * (named ? 1 : Math.min(1, (row[t] / totals[c]) * 1.5)));
    }
    return best;
  };

  // Homeland of each nation: the country where it is titular and has the most people.
  const homeland = new Int32Array(NN).fill(-1);
  const inHome = new Float64Array(NN);
  for (let c = 0; c < C; c++) {
    for (const n of titular[c]) {
      let p = 0;
      for (let g = 0; g < G; g++) if (NATION_OF[g] === n) p += byGroup[c][g];
      if (p > inHome[n]) { inHome[n] = p; homeland[n] = c; }
    }
  }
  countries.forEach((co, c) => { if (co.nation) homeland[NATIONS.indexOf(co.nation)] = c; });

  // Grievances between countries.
  const griev = Array.from({ length: C }, () => new Float64Array(C));
  const reasons = Array.from({ length: C }, () => Array.from({ length: C }, () => []));
  let happy = 0, grand = 0;
  const stranded = []; // { group, from, to, people }
  for (let c = 0; c <= C; c++) {
    for (let g = 0; g < G; g++) {
      const p = byGroup[c][g];
      if (p <= 0) continue;
      const k = content(g, c);
      happy += p * k;
      grand += p;
      const n = NATION_OF[g], H = homeland[n];
      if (DIASPORA[g] || H < 0 || H === c || c === U) continue;
      const lost = p * (1 - k);
      if (lost < 5000) continue;
      const pts = STRANDED_SHARE_PTS * (lost / nationTotals[n]) + lost * STRANDED_ABS_PTS;
      griev[H][c] += pts;
      reasons[H][c].push({ kind: 'stranded', group: g, people: lost, pts });
      stranded.push({ group: g, from: H, to: c, people: lost });
    }
  }

  // Holy sites and historic claims.
  const statelessClaims = new Float64Array(C + 1);
  const sites = SITE_CELLS.filter((s) => siteOwner(s, owner, land, N) !== undefined).map((s) => {
    const c = siteOwner(s, owner, land, N);
    const cc = c >= 0 ? c : U;
    const aggrieved = [];
    for (const [key, w] of Object.entries(s.claims)) {
      const g = GROUP_INDEX[key], n = NATION_OF[g];
      if (cc !== U && titular[cc].has(n)) continue;
      const H = homeland[n];
      if (H >= 0 && H !== cc && cc !== U) {
        griev[H][cc] += SITE_PTS * w;
        reasons[H][cc].push({ kind: 'site', site: s.name, group: g, pts: SITE_PTS * w });
        aggrieved.push(g);
      } else if (H < 0 && !DIASPORA[g]) {
        statelessClaims[cc] += 6 * w;
        aggrieved.push(g);
      }
    }
    return { name: s.name, owner: c, aggrieved };
  });

  // Pairwise war risk.
  const wars = [];
  for (let a = 0; a < C; a++) {
    for (let b = a + 1; b < C; b++) {
      const raw = griev[a][b] + griev[b][a];
      if (raw <= 0) continue;
      const t = raw * (adjacent[a][b] || allNeighbours ? 1 : DISTANT_FACTOR);
      const why = [...reasons[a][b].map((r) => ({ ...r, claimant: a })), ...reasons[b][a].map((r) => ({ ...r, claimant: b }))]
        .sort((x, y) => y.pts - x.pts);
      wars.push({ a, b, tension: t, label: riskLabel(t), adjacent: !!adjacent[a][b] || allNeighbours, why });
    }
  }
  wars.sort((x, y) => y.tension - x.tension);

  // Internal stability of each country.
  const states = [];
  for (let c = 0; c < C; c++) {
    const T = totals[c];
    if (T <= 0) continue;
    const s = byGroup[c].map((v) => v / T);
    let tension = 0;
    for (let i = 0; i < G; i++) for (let j = i + 1; j < G; j++) tension += 2 * s[i] * s[j] * HOSTILE[i][j];
    let statelessShare = 0;
    for (let g = 0; g < G; g++) if (!DIASPORA[g] && homeland[NATION_OF[g]] < 0 && s[g] >= 0.05) statelessShare += s[g];
    const unrest = 60 * tension + 25 * statelessShare + Math.min(15, statelessClaims[c]);
    const mix = [...s.keys()].filter((g) => s[g] >= 0.01).sort((x, y) => s[y] - s[x]).map((g) => ({ group: g, share: s[g], people: byGroup[c][g] }));
    states.push({
      id: c, name: countries[c].name, people: T, mix, unrest, label: unrestLabel(unrest),
      titular: [...titular[c]].map((n) => NATIONS[n]), viable: T >= MIN_VIABLE,
      neighbours: [...adjacent[c].keys()].filter((b) => adjacent[c][b]),
    });
  }

  // Stateless nations of real size.
  const stateless = [];
  for (let n = 0; n < NN; n++) {
    if (homeland[n] >= 0 || nationTotals[n] < 100000 || GROUPS.every((g, k) => NATION_OF[k] !== n || g.diaspora)) continue;
    stateless.push({ nation: NATIONS[n], people: nationTotals[n] });
  }

  // ---- Peace score ----
  // Expected number of wars and revolts within a generation; the score decays
  // with it, is scaled by fairness, and is cut by land left unclaimed.
  const total = grand;
  const unclaimedShare = totals[U] / total;
  let expectedWars = 0;
  for (const w of wars) { w.chance = warChance(w.tension); expectedWars += w.chance; }
  let expectedRevolts = 0;
  for (const st of states) {
    st.chance = revoltChance(st.unrest);
    expectedRevolts += st.chance * (1 + st.people / 2e6) ** 0.6;
  }
  let smallPenalty = 0;
  for (const st of states) if (!st.viable) smallPenalty += st.people < 30000 ? 5 : 3;
  const fairness = happy / grand;
  const conflict = expectedWars + expectedRevolts;
  // About 85% is the best fairness the ethnic map allows, so that counts as full marks.
  const fairFactor = Math.min(1, fairness / 0.85) ** 1.5;
  const raw = 100 * Math.exp(-conflict / 8) * fairFactor * (1 - unclaimedShare) ** 2;
  const peace = Math.max(0, Math.min(100, Math.round(raw - smallPenalty)));
  const breakdown = { wars: expectedWars, revolts: expectedRevolts, fairness, unclaimed: unclaimedShare, small: smallPenalty };

  return {
    peace, fairness, unclaimedShare, total, wars, states, sites, stateless, stranded, breakdown,
  };
}

export function verdict(peace) {
  if (peace >= 75) return 'A lasting peace. Historians will call it the Long Balkan Calm.';
  if (peace >= 55) return 'Mostly peaceful: a few border incidents, but no great war.';
  if (peace >= 35) return 'An uneasy peace. Expect at least one regional war within a generation.';
  if (peace >= 15) return 'A powder keg. Several wars and uprisings are all but certain.';
  return 'Catastrophe: the peninsula is set ablaze almost at once.';
}
