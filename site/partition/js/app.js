// Partition: rendering, border drawing and the daily round.
import {
  prepareMap, territories, score, floorScore, activeEdges, bordersOf, decodeAssignment, edgeBetween, edgeEnds, hKey, vKey,
  peopleDots,
} from './engine.js';
import { regionFor } from './regions.js';
import {
  puzzleNumber, efficiency, shareText, emptyStats, recordResult, currentStreak, clock,
} from './daily.js';

const SVG = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const fmt = (n) => Math.round(n).toLocaleString('en-GB');
const people = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} million` : fmt(Math.round(n / 1000) * 1000));
const pct = (v) => `${(100 * v).toFixed(1)}%`;

const STATS_KEY = 'partition.stats.v1';
const HELP_KEY = 'partition.helpSeen';
const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ?puzzle=N replays another day's map as practice; it never counts.
const today = puzzleNumber();
const asked = parseInt(new URLSearchParams(location.search).get('puzzle'), 10);
const replay = asked >= 1 && asked !== today;
const number = replay ? asked : today;
const map = prepareMap(await (await fetch(`data/${regionFor(number)}.json`)).json());
const bestOf = decodeAssignment(map, map.optimum.assignment);
const bestEdges = bordersOf(map, bestOf);
const noBorder = score(map, new Int32Array(map.cells.length), 1).misplaced;
const floor = floorScore(map);

let edges = new Set();
let undo = [];
let stroke = null;
let started = 0;
let elapsed = 0;
let timerId = 0;
let practice = replay;
let result = null; // set once submitted
let view = 'mine';
let stats = { ...emptyStats(), ...(store.get(STATS_KEY) || {}) };

// ---------- static map layers ----------

const svg = $('map');
svg.setAttribute('viewBox', `-0.3 -0.3 ${map.cols + 0.6} ${map.rows + 0.6}`);
const defs = el('defs', {}, svg);
const hatch = el('pattern', { id: 'hatch', width: 0.35, height: 0.35, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)', class: 'hatch' }, defs);
el('line', { x1: 0, y1: 0, x2: 0, y2: 0.35 }, hatch);

const gCells = el('g', {}, svg);
const gHatch = el('g', {}, svg);
const gGrid = el('g', {}, svg);
const gDots = el('g', {}, svg);
const gPlaces = el('g', {}, svg);
const gEdges = el('g', {}, svg);
const gTags = el('g', {}, svg);
const cursor = el('circle', { r: 0.14, class: 'cursor', visibility: 'hidden' }, svg);

const maxPop = Math.max(...map.cells.map((c) => c.total));
for (const cell of map.cells) {
  const { r, c, pops, total, major } = cell;
  el('rect', { x: c, y: r, width: 1, height: 1, class: 'land' }, gCells);
  // Paler means more mixed: a 34% plurality is almost blank, 100% is solid.
  const purity = (pops[major] / total - 1 / 3) / (2 / 3);
  el('rect', { x: c, y: r, width: 1, height: 1, fill: map.groups[major].color, 'fill-opacity': (0.15 + 0.85 * purity).toFixed(3) }, gCells);
  el('circle', { cx: c + 0.5, cy: r + 0.5, r: (0.06 + 0.3 * Math.sqrt(total / maxPop)).toFixed(3), class: 'dot' }, gDots);
}
for (const key of map.interior.keys()) {
  const [[x1, y1], [x2, y2]] = edgeEnds(key);
  el('line', { x1, y1, x2, y2, class: 'gridline' }, gGrid);
}
// The coastline and frontier: every cell side that is not an interior edge.
let outline = '';
for (const { r, c } of map.cells) {
  for (const key of [hKey(c, r), hKey(c, r + 1), vKey(c, r), vKey(c + 1, r)]) {
    if (map.interior.has(key)) continue;
    const [[x1, y1], [x2, y2]] = edgeEnds(key);
    outline += `M${x1} ${y1}L${x2} ${y2}`;
  }
}
el('path', { d: outline, class: 'outline' }, svg);
for (const p of map.places) {
  el('circle', { cx: p.c + 0.5, cy: p.r + 0.5, r: 0.07, fill: 'currentColor' }, gPlaces);
  // Labels near the right edge go on the left of their dot so they fit.
  const left = p.c >= map.cols - 4;
  const t = el('text', { x: left ? p.c + 0.38 : p.c + 0.62, y: p.r + 0.42, class: 'place', 'text-anchor': left ? 'end' : 'start' }, gPlaces);
  t.textContent = p.name;
}

$('puzzleNum').textContent = `#${number}${replay ? ' · practice' : ''}`;
const NUMBER = ['', 'one', 'two', 'three', 'four', 'five', 'six'];
const parts = map.maxTerritories === 2 ? 'two territories'
  : map.maxTerritories === 3 ? 'two or three territories' : `two to ${NUMBER[map.maxTerritories]} territories`;
$('brief').innerHTML = `<strong>${map.name}</strong>, ${map.subtitle}. ${map.brief} Split it into ${parts} and leave as few people as possible on the wrong side.`;
$('note').textContent = map.source;
document.title = `Partition #${number}: ${map.name}`;
$('legend').innerHTML = map.groups.map((g) => `<li><i style="background:${g.color}"></i>${g.name}</li>`).join('')
  + '<li class="mixed">pale = mixed · dot = population</li>';

// ---------- drawing ----------

function renderBorder() {
  const shown = result && view === 'best' ? bestEdges : edges;
  const { of, count } = territories(map, shown);
  const active = activeEdges(map, shown, of);
  gEdges.replaceChildren();
  for (const key of shown) {
    const [[x1, y1], [x2, y2]] = edgeEnds(key);
    const cls = active.has(key) ? (shown === bestEdges ? 'edge best' : 'edge') : 'edge loose';
    el('line', { x1, y1, x2, y2, class: cls }, gEdges);
  }
  renderTags(of, count);
  gHatch.replaceChildren();
  if (result) {
    // Hatch the squares whose local majority ended up as a minority.
    const s = score(map, of, count);
    renderTerritories(s);
    renderWaffle(s, shown === bestEdges);
    map.cells.forEach((cell, i) => {
      if (cell.major !== s.territories[of[i]].major) el('rect', { x: cell.c, y: cell.r, width: 1, height: 1, fill: 'url(#hatch)' }, gHatch);
    });
  }
  return { of, count };
}

function renderTerritories(s) {
  $('resTerr').innerHTML = s.territories.map((t) => {
    const g = map.groups[t.major];
    return `<li><b>${String.fromCharCode(65 + t.id)}</b><i style="background:${g.color}"></i>`
      + `<span>Majority: ${g.name}</span><span class="n">${people(t.total)} people · ${pct(t.misplaced / t.total)} minorities</span></li>`;
  }).join('');
}

// 100 people: those on the wrong side in full colour, the rest faded.
function renderWaffle(s, best) {
  const dots = peopleDots(map, s);
  $('resWaffle').innerHTML = dots.map((d) => `<i class="${d.wrong ? 'wrong' : ''}" style="background:${map.groups[d.group].color}"></i>`).join('');
  $('resWaffle').setAttribute('aria-label', `${dots.filter((d) => d.wrong).length} in every 100 people on the wrong side`);
  $('resWaffleCap').textContent = `Every dot is 1 in 100 people, with ${best ? 'the best border' : 'your border'}`;
}

// A letter on each territory, on the square nearest its middle that is not
// already labelled with a town.
const labelled = new Set(map.places.map((p) => map.at(p.r, p.c)));
function renderTags(of, count) {
  gTags.replaceChildren();
  if (count < 2) return;
  const sums = Array.from({ length: count }, () => [0, 0, 0]);
  map.cells.forEach((cell, i) => { const s = sums[of[i]]; s[0] += cell.c; s[1] += cell.r; s[2]++; });
  const spot = new Array(count).fill(-1), dist = new Array(count).fill(Infinity);
  map.cells.forEach((cell, i) => {
    const [x, y, n] = sums[of[i]];
    const d = Math.hypot(cell.c - x / n, cell.r - y / n) + (labelled.has(i) ? 1.5 : 0);
    if (d < dist[of[i]]) { dist[of[i]] = d; spot[of[i]] = i; }
  });
  spot.forEach((i, t) => {
    const g = el('g', { class: 'tag' }, gTags);
    el('circle', { cx: map.cells[i].c + 0.5, cy: map.cells[i].r + 0.5, r: 0.34 }, g);
    el('text', { x: map.cells[i].c + 0.5, y: map.cells[i].r + 0.52 }, g).textContent = String.fromCharCode(65 + t);
  });
}

function refresh() {
  const { count } = renderBorder();
  if (result) return;
  const max = map.maxTerritories;
  const status = $('terrCount');
  status.className = count > max ? 'warn' : '';
  status.textContent = count < 2 ? 'Draw a border to start'
    : count > max ? `${count} territories: the most is ${max}`
      : `${count} territories`;
  $('submitBtn').disabled = count < 2 || count > max;
  $('undoBtn').disabled = !undo.length;
  $('clearBtn').disabled = !edges.size;
}

function toGrid(e) {
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  return [pt.x, pt.y];
}
const near = ([x, y]) => [Math.round(x), Math.round(y)];

function startTimer() {
  if (started || result) return;
  started = performance.now() - elapsed;
  timerId = setInterval(() => { $('timer').textContent = clock(performance.now() - started); }, 250);
}
function stopTimer() {
  if (started) elapsed = performance.now() - started;
  clearInterval(timerId);
  started = 0;
}

// Walks the pointer's path from vertex to vertex along the grid, drawing or
// erasing (whichever the first edge of the stroke called for).
function walkTo(v) {
  let [x, y] = stroke.last;
  while (x !== v[0] || y !== v[1]) {
    const dx = v[0] - x, dy = v[1] - y;
    const next = Math.abs(dx) >= Math.abs(dy) ? [x + Math.sign(dx), y] : [x, y + Math.sign(dy)];
    const key = edgeBetween([x, y], next);
    if (map.interior.has(key)) {
      stroke.mode ??= edges.has(key) ? 'erase' : 'draw';
      if (stroke.mode === 'draw') edges.add(key); else edges.delete(key);
      stroke.changed = true;
    }
    [x, y] = next;
  }
  stroke.last = [x, y];
}

function showCursor(v) {
  cursor.setAttribute('cx', v[0]);
  cursor.setAttribute('cy', v[1]);
  cursor.setAttribute('visibility', 'visible');
}

svg.addEventListener('pointerdown', (e) => {
  if (result || e.button > 0) return;
  svg.setPointerCapture(e.pointerId);
  const p = toGrid(e);
  stroke = { last: near(p), start: p, mode: null, changed: false, before: new Set(edges) };
  showCursor(stroke.last);
  startTimer();
});

svg.addEventListener('pointermove', (e) => {
  const p = toGrid(e);
  if (!stroke) { inspect(p, e.pointerType === 'mouse'); return; }
  const v = near(p);
  // Only commit to a vertex once the pointer is close to it, so a diagonal
  // drag does not zigzag across the wrong squares.
  if (Math.hypot(p[0] - v[0], p[1] - v[1]) > 0.38) return;
  showCursor(v);
  walkTo(v);
  if (stroke.changed) refresh();
});

function endStroke(e) {
  if (!stroke) return;
  const p = toGrid(e);
  if (!stroke.changed && Math.hypot(p[0] - stroke.start[0], p[1] - stroke.start[1]) < 0.3) tap(p);
  else if (stroke.changed) undo.push(stroke.before);
  stroke = null;
  cursor.setAttribute('visibility', 'hidden');
  refresh();
}
svg.addEventListener('pointerup', endStroke);
svg.addEventListener('pointercancel', endStroke);
svg.addEventListener('pointerleave', () => { if (!stroke) inspect([0, 0], false); });

// A tap near a grid line toggles that edge; elsewhere it shows the square.
function tap(p) {
  const [x, y] = p;
  const dv = Math.abs(x - Math.round(x)), dh = Math.abs(y - Math.round(y));
  const key = dv < dh ? vKey(Math.round(x), Math.floor(y)) : hKey(Math.floor(x), Math.round(y));
  if (Math.min(dv, dh) < 0.22 && map.interior.has(key)) {
    undo.push(new Set(edges));
    if (edges.has(key)) edges.delete(key); else edges.add(key);
  } else {
    inspect(p, true);
  }
}

function inspect([x, y], show) {
  const box = $('inspect');
  const i = map.at(Math.floor(y), Math.floor(x));
  if (!show || i < 0) { box.textContent = '\u00a0'; return; }
  const cell = map.cells[i];
  box.textContent = `${fmt(cell.total)} people: ` + map.groups
    .map((g, k) => `${g.name} ${Math.round((100 * cell.pops[k]) / cell.total)}%`).join(' · ');
}

$('undoBtn').onclick = () => { if (undo.length) { edges = undo.pop(); refresh(); } };
$('clearBtn').onclick = () => { if (edges.size) { undo.push(edges); edges = new Set(); refresh(); } };

// ---------- results ----------

function submit() {
  stopTimer();
  const { of, count } = territories(map, edges);
  const s = score(map, of, count);
  const eff = efficiency(s.misplaced, noBorder, map.optimum.misplaced);
  const entry = { region: map.id, misplaced: s.misplaced, eff, ms: Math.round(elapsed), edges: [...edges] };
  if (!practice) {
    stats = recordResult(stats, number, entry);
    store.set(STATS_KEY, stats);
  }
  showResults(entry);
}
$('submitBtn').onclick = submit;

function showResults(entry) {
  edges = new Set(entry.edges);
  const { of, count } = territories(map, edges);
  const s = score(map, of, count);
  const best = map.optimum.misplaced;
  result = { ...entry, s };
  view = 'mine';
  setView('mine');
  $('controls').hidden = true;
  $('results').hidden = false;
  $('timer').textContent = clock(entry.ms);

  const wrong = peopleDots(map, s).filter((d) => d.wrong).length;
  $('resPeople').textContent = `${people(s.misplaced)} people`;
  $('resPer100').textContent = `would be a minority in the ${count === 1 ? 'country' : 'countries'} you drew. That's ${wrong} in every 100.`;

  // The scale runs from no border (left) to the best possible border (right).
  const eff = entry.eff;
  $('resFill').style.width = `${(100 * eff).toFixed(1)}%`;
  $('resPin').style.left = `${(100 * eff).toFixed(1)}%`;
  $('resNone').textContent = pct(noBorder / map.total);
  $('resBest').textContent = pct(best / map.total);
  const gap = s.misplaced - best;
  $('resVerdict').innerHTML = gap <= 0
    ? `<strong>You: ${pct(s.share)}.</strong> You matched the best border we found.`
    : `<strong>You: ${pct(s.share)}, ${Math.round(eff * 100)}% of the way there.</strong> The best border leaves ${people(gap)} fewer people on the wrong side.`;

  $('resLesson').innerHTML = `Even the best possible border leaves <strong>${people(best)} people (${pct(best / map.total)})</strong> on the wrong side. `
    + `Even if every ${map.cellKm} km square became its own country, ${people(floor)} still would.`;
  $('resHistory').textContent = map.history;
}

function setView(v) {
  view = v;
  document.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === v)));
  renderBorder();
}
document.querySelectorAll('.seg button').forEach((b) => { b.onclick = () => setView(b.dataset.view); });

$('practiceBtn').onclick = () => {
  practice = true;
  result = null;
  edges = new Set();
  undo = [];
  elapsed = 0;
  $('timer').textContent = '0:00';
  $('results').hidden = true;
  $('controls').hidden = false;
  refresh();
};

$('shareBtn').onclick = async () => {
  const text = shareText({
    number, mapName: map.name, share: result.s.share, bestShare: map.optimum.misplaced / map.total,
    eff: result.eff, territories: result.s.territories, ms: result.ms, practice,
  });
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ text }); return; } catch { /* fall back to copying */ }
  }
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } catch { prompt('Copy your result:', text); }
};

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

// ---------- dialogs ----------

function showStats() {
  const cells = [
    [stats.played, 'Played'],
    [currentStreak(stats, today), 'Streak'],
    [stats.maxStreak, 'Best streak'],
    [stats.bestEff == null ? '–' : `${Math.round(stats.bestEff * 100)}%`, 'Best score'],
  ];
  $('statGrid').innerHTML = cells.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  $('stats').showModal();
}
$('statsBtn').onclick = showStats;
$('helpBtn').onclick = () => $('help').showModal();

// ---------- start ----------

// Today's result comes back after a reload (unless it was for another map).
const done = replay ? null : stats.results[number];
if (done && (done.region ?? 'bosnia') === map.id) showResults(done);
else refresh();
if (!store.get(HELP_KEY)) { store.set(HELP_KEY, true); $('help').showModal(); }
