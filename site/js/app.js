import { COLS, ROWS, toGrid } from './grid.js';
import { buildModel, G } from './model.js';
import { rasteriseLines, labelRegions } from './regions.js';
import { evaluate, verdict, SITE_CELLS } from './score.js';
import { berlinOwner, BERLIN_COUNTRIES } from './history.js';
import { encodeState, decodeState } from './share.js';
import {
  puzzleNumber, puzzleFor, areaMask, puzzlePar, scorePuzzle, grade, GRADES, MAX_ATTEMPTS,
  shareText, emptyStats, recordResult,
} from './daily.js';
import { GROUPS, CITIES, SOURCES } from '../data/ethnic.js';
import { COAST, MODERN_BORDERS } from '../data/geo.js';

// ---------- Model ----------
const model = buildModel();
const N = model.N;
const berlin = berlinOwner(model);
let berlinResult = null;
const getBerlinResult = () => (berlinResult ??= evaluate(model, berlin, BERLIN_COUNTRIES));

const PALETTE = ['#d9826b', '#7aa6cf', '#9cc27a', '#c69ad0', '#e6be55', '#63bfb2', '#e397ae', '#a8916a',
  '#8f9ee3', '#cfc964', '#b8795a', '#82b598', '#c9708c', '#79a653', '#e3a15a', '#9a8cc4'];
const hexRGB = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const GROUP_RGB = GROUPS.map((g) => hexRGB(g.color));
const mixRGB = (a, b, t) => [0, 1, 2].map((k) => Math.round(a[k] * (1 - t) + b[k] * t));

// ---------- Storage (every access guarded: private mode may throw) ----------
const KEYS = { free: 'balkans1878.v1', daily: 'balkans1878.daily.v1', stats: 'balkans1878.stats.v1', mode: 'balkans1878.mode', coached: 'balkans1878.coached' };
const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } };

// ---------- Game state ----------
// Free play: the whole peninsula, any number of countries.
const free = { lines: [], countries: [], claims: [] };
// Daily: today's puzzle, a few fixed states, limited lines and three attempts.
const puzzle = puzzleFor(puzzleNumber());
const mask = areaMask(puzzle);
const dailyLand = model.land.map((v, i) => v & mask[i]);
let par = null;
const getPar = () => (par ??= puzzlePar(model, puzzle, mask));
const daily = { number: puzzle.number, lines: [], claims: [], attempts: [], done: false, countries: puzzle.countries };
let stats = { ...emptyStats(), ...load(KEYS.stats, {}) };

let mode = 'daily';
let state = free; // the current mode's { lines, countries, claims }: `free` or `daily`
let active = -1;
let tool = 'draw';
let view = 'ethnic';
let highlight = -1;
const opts = { show1878: false, showModern: false, showSites: true, simplify: false };
let undoStack = [], redoStack = [];
let briefOpen = true;

const isDaily = () => mode === 'daily';
const locked = () => isDaily() && daily.done;
const playLand = () => (isDaily() ? dailyLand : model.land);

// Derived
let region = new Int32Array(N).fill(-1), regionCount = 0, regionTouches = new Uint8Array(0);
let autoIsland = new Uint8Array(0);
const AUTO_ISLAND = 400; // cells: smaller natural islands follow the nearest country
let regionOwner = new Int16Array(0);
let cellOwner = new Int16Array(N).fill(-1);
let regionPop = new Float64Array(0), regionTotal = new Float64Array(0);
let regionEdges = new Path2D(), countryEdges = new Path2D();
let countryStats = [];
let labelPos = [];

// ---------- DOM ----------
const $ = (s) => document.querySelector(s);
const canvas = $('#map');
const ctx = canvas.getContext('2d');
const mapbox = $('#mapbox');
const tip = $('#tip');
const panel = $('#panel');
const base = document.createElement('canvas');
base.width = COLS; base.height = ROWS;
const baseCtx = base.getContext('2d');
const hoverCanvas = document.createElement('canvas');
hoverCanvas.width = COLS; hoverCanvas.height = ROWS;
const hoverCtx = hoverCanvas.getContext('2d');
const loupe = document.createElement('canvas');

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${Math.round(n)}`);
const pct = (x) => `${Math.round(x * 100)}%`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch { /* not supported */ } };

function toast(msg) {
  const t = $('#toast');
  // An open dialog sits in the top layer, so the toast must live inside it to be seen.
  const host = document.querySelector('dialog[open]') || document.body;
  if (t.parentElement !== host) host.appendChild(t);
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- Recompute ----------
function recompute({ inherit = false } = {}) {
  const prevOwner = cellOwner;
  const prevCount = regionCount;
  const land = playLand();
  const wall = rasteriseLines(state.lines, land);
  ({ region, count: regionCount, touches: regionTouches } = labelRegions(land, wall));
  const C = state.countries.length;

  regionOwner = new Int16Array(regionCount).fill(-1);
  const claimOf = new Int32Array(regionCount).fill(-1);
  state.claims.forEach((c, k) => {
    const r = region[c.cell];
    if (r < 0 || c.country >= C) return;
    regionOwner[r] = c.country;
    claimOf[r] = k;
  });

  const newClaims = [];
  if (inherit) {
    // A piece cut off from a claimed area keeps its owner if it was mostly theirs.
    const votes = new Float64Array(regionCount * (C + 1));
    const repCell = new Int32Array(regionCount * (C + 1)).fill(-1);
    const tot = new Float64Array(regionCount);
    for (let i = 0; i < N; i++) {
      const r = region[i];
      if (r < 0 || regionOwner[r] >= 0) continue;
      const o = prevOwner[i] >= 0 && prevOwner[i] < C ? prevOwner[i] : C;
      votes[r * (C + 1) + o] += model.pop[i] + 1;
      tot[r] += model.pop[i] + 1;
      if (repCell[r * (C + 1) + o] < 0) repCell[r * (C + 1) + o] = i;
    }
    for (let r = 0; r < regionCount; r++) {
      if (regionOwner[r] >= 0 || tot[r] === 0) continue;
      let best = -1;
      for (let o = 0; o < C; o++) if (votes[r * (C + 1) + o] > tot[r] * 0.5) best = o;
      if (best >= 0) {
        regionOwner[r] = best;
        newClaims.push({ cell: repCell[r * (C + 1) + best], country: best });
      }
    }
  }
  // Keep one claim per region so the list stays small.
  state.claims = [...[...claimOf].filter((k) => k >= 0).sort((a, b) => a - b).map((k) => state.claims[k]), ...newClaims]
    .filter((c) => c.country >= 0);

  assignIslands();

  cellOwner = new Int16Array(N).fill(-1);
  regionPop = new Float64Array(regionCount * G);
  regionTotal = new Float64Array(regionCount);
  for (let i = 0; i < N; i++) {
    const r = region[i];
    if (r < 0) continue;
    cellOwner[i] = regionOwner[r];
    const p = model.pop[i];
    regionTotal[r] += p;
    for (let g = 0; g < G; g++) regionPop[r * G + g] += p * model.comp[i * G + g];
  }

  buildEdges();
  computeCountryStats();
  autoName();
  renderBase();
  hoverRegion = -1;
  renderPanel();
  draw();
  save();
  return regionCount - prevCount;
}

// Unclaimed small islands join whichever country's land is nearest.
function assignIslands() {
  autoIsland = new Uint8Array(regionCount);
  const size = new Int32Array(regionCount);
  for (let i = 0; i < N; i++) if (region[i] >= 0) size[region[i]]++;
  const want = new Set();
  for (let r = 0; r < regionCount; r++) if (regionOwner[r] < 0 && !regionTouches[r] && size[r] <= AUTO_ISLAND) want.add(r);
  if (!want.size || !state.claims.length) return;
  const near = new Int16Array(N).fill(-1);
  let frontier = [];
  for (let i = 0; i < N; i++) {
    const r = region[i];
    if (r >= 0 && regionOwner[r] >= 0) { near[i] = regionOwner[r]; frontier.push(i); }
  }
  while (frontier.length) {
    const next = [];
    for (const i of frontier) {
      const x = i % COLS;
      for (const j of [x > 0 ? i - 1 : -1, x < COLS - 1 ? i + 1 : -1, i - COLS, i + COLS]) {
        if (j < 0 || j >= N || near[j] >= 0) continue;
        near[j] = near[i];
        next.push(j);
      }
    }
    frontier = next;
  }
  const seen = new Uint8Array(regionCount);
  for (let i = 0; i < N; i++) {
    const r = region[i];
    if (r < 0 || seen[r]) continue;
    seen[r] = 1;
    if (want.has(r) && near[i] >= 0) { regionOwner[r] = near[i]; autoIsland[r] = 1; }
  }
}

function buildEdges() {
  regionEdges = new Path2D();
  countryEdges = new Path2D();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const i = y * COLS + x;
      if (region[i] < 0) continue;
      if (x + 1 < COLS && region[i + 1] >= 0 && region[i + 1] !== region[i]) {
        const p = cellOwner[i] !== cellOwner[i + 1] ? countryEdges : regionEdges;
        p.moveTo(x + 1, y); p.lineTo(x + 1, y + 1);
      }
      if (y + 1 < ROWS && region[i + COLS] >= 0 && region[i + COLS] !== region[i]) {
        const p = cellOwner[i] !== cellOwner[i + COLS] ? countryEdges : regionEdges;
        p.moveTo(x, y + 1); p.lineTo(x + 1, y + 1);
      }
    }
  }
}

function computeCountryStats() {
  const C = state.countries.length;
  countryStats = Array.from({ length: C }, () => ({ people: 0, groups: new Float64Array(G), bestRegion: -1, bestPop: 0 }));
  for (let r = 0; r < regionCount; r++) {
    const o = regionOwner[r];
    if (o < 0) continue;
    const s = countryStats[o];
    s.people += regionTotal[r];
    for (let g = 0; g < G; g++) s.groups[g] += regionPop[r * G + g];
    if (regionTotal[r] > s.bestPop) { s.bestPop = regionTotal[r]; s.bestRegion = r; }
  }
  // Label position: centroid of the country's most populous piece, nudged onto a cell of it.
  labelPos = countryStats.map((s) => {
    if (s.bestRegion < 0) return null;
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < N; i++) if (region[i] === s.bestRegion) { sx += i % COLS; sy += Math.floor(i / COLS); n++; }
    const cx = sx / n, cy = sy / n;
    let best = Infinity, bx = cx, by = cy;
    for (let i = 0; i < N; i++) {
      if (region[i] !== s.bestRegion) continue;
      const d = (i % COLS - cx) ** 2 + (Math.floor(i / COLS) - cy) ** 2;
      if (d < best) { best = d; bx = i % COLS; by = Math.floor(i / COLS); }
    }
    return [bx + 0.5, by + 0.5, n];
  });
}

function nationOfGroups(groups) {
  const byNation = {};
  groups.forEach((p, g) => { byNation[GROUPS[g].nation] = (byNation[GROUPS[g].nation] || 0) + p; });
  return Object.entries(byNation).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function autoName() {
  const taken = new Set(state.countries.filter((c) => !c.autoName).map((c) => c.name));
  state.countries.forEach((c, k) => {
    if (!c.autoName) return;
    const s = countryStats[k];
    const stem = s && s.people > 0 ? nationOfGroups(s.groups) : 'New country';
    let name = stem, n = 2;
    while (taken.has(name)) name = `${stem} ${['', '', 'II', 'III', 'IV', 'V', 'VI'][n] || n}`, n++;
    c.name = name;
    taken.add(name);
  });
}

// ---------- Rendering ----------
const SEA = '#cfdde3';
const FADED = [233, 226, 207];

function renderBase() {
  const img = baseCtx.createImageData(COLS, ROWS);
  const d = img.data;
  const countryRGB = state.countries.map((c) => hexRGB(c.color));
  const inPlay = isDaily() ? mask : null;
  for (let i = 0; i < N; i++) {
    if (!model.land[i]) continue;
    let rgb = GROUP_RGB[opts.simplify ? model.major[i] : model.patch[i]];
    if (highlight >= 0) {
      rgb = mixRGB(FADED, GROUP_RGB[highlight], Math.min(1, model.comp[i * G + highlight] * 1.15));
    } else if (view === 'political' && cellOwner[i] >= 0) {
      rgb = mixRGB(countryRGB[cellOwner[i]], rgb, 0.22);
    } else if (view === 'political') {
      rgb = mixRGB(rgb, FADED, 0.72);
    }
    if (inPlay && !inPlay[i]) rgb = mixRGB(rgb, FADED, 0.78);
    d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255;
  }
  baseCtx.putImageData(img, 0, 0);
}

let hoverRegion = -1;
function renderHover(r) {
  if (r === hoverRegion) return;
  hoverRegion = r;
  hoverCtx.clearRect(0, 0, COLS, ROWS);
  if (r < 0) return;
  const img = hoverCtx.createImageData(COLS, ROWS);
  for (let i = 0; i < N; i++) if (region[i] === r) { img.data[i * 4 + 3] = 70; img.data[i * 4] = 255; img.data[i * 4 + 1] = 255; img.data[i * 4 + 2] = 255; }
  hoverCtx.putImageData(img, 0, 0);
}

// 1878 border edges (built once).
const berlinEdges = new Path2D();
for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
  const i = y * COLS + x;
  if (!model.land[i]) continue;
  if (x + 1 < COLS && model.land[i + 1] && berlin[i + 1] !== berlin[i]) { berlinEdges.moveTo(x + 1, y); berlinEdges.lineTo(x + 1, y + 1); }
  if (y + 1 < ROWS && model.land[i + COLS] && berlin[i + COLS] !== berlin[i]) { berlinEdges.moveTo(x, y + 1); berlinEdges.lineTo(x + 1, y + 1); }
}
const pathOf = (lines) => {
  const p = new Path2D();
  for (const l of lines) l.forEach(([x, y], k) => (k ? p.lineTo(x, y) : p.moveTo(x, y)));
  return p;
};
const coastPath = pathOf(COAST);
const modernPath = pathOf(MODERN_BORDERS);
const CITY_PTS = CITIES.map(([name, lon, lat, k]) => ({ name, k, p: toGrid(lon, lat) }));
const SITE_POINTS = SITE_CELLS.map((sc) => ({ ...sc, p: [(sc.cell % COLS) + 0.5, Math.floor(sc.cell / COLS) + 0.5] }));
const areaBox = (() => {
  const [w, s, e, n] = puzzle.area;
  const [x0, y0] = toGrid(w, n), [x1, y1] = toGrid(e, s);
  return { x0: Math.floor(x0), y0: Math.floor(y0), x1: Math.ceil(x1), y1: Math.ceil(y1) };
})();

const cam = { s: 1, ox: 0, oy: 0, fitS: 1 };
let dpr = 1, cw = 0, ch = 0;
let stroke = null;
let eraseHover = -1;

function resize() {
  const r = mapbox.getBoundingClientRect();
  if (!r.width || !r.height) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const first = cw === 0;
  cw = r.width; ch = r.height;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  cam.fitS = Math.min(cw / COLS, ch / ROWS);
  if (first) fit(); else clampCam();
  draw();
}
// Fit the whole map, or today's puzzle area, into view.
function fit() {
  const topPad = $('#brief').offsetHeight ? $('#brief').offsetHeight + 16 : 0;
  cam.fitS = Math.min(cw / COLS, ch / ROWS);
  if (isDaily()) {
    const { x0, y0, x1, y1 } = areaBox;
    const w = x1 - x0, h = y1 - y0;
    cam.s = Math.min((cw - 24) / w, (ch - topPad - 24) / h);
    cam.ox = (cw - w * cam.s) / 2 - x0 * cam.s;
    cam.oy = topPad + (ch - topPad - h * cam.s) / 2 - y0 * cam.s;
  } else {
    cam.s = cam.fitS;
    cam.ox = (cw - COLS * cam.s) / 2;
    cam.oy = (ch - ROWS * cam.s) / 2;
  }
  draw();
}
function clampCam() {
  cam.s = Math.max(cam.fitS * 0.8, Math.min(cam.fitS * 16, cam.s));
  const mw = COLS * cam.s, mh = ROWS * cam.s;
  const m = 80;
  cam.ox = mw < cw ? Math.min(Math.max(cam.ox, 0), cw - mw) : Math.min(m, Math.max(cw - mw - m, cam.ox));
  cam.oy = mh < ch ? Math.min(Math.max(cam.oy, 0), ch - mh) : Math.min(m, Math.max(ch - mh - m, cam.oy));
}
function zoomAt(px, py, f) {
  const s0 = cam.s;
  cam.s = Math.max(cam.fitS * 0.8, Math.min(cam.fitS * 16, cam.s * f));
  const k = cam.s / s0;
  cam.ox = px - (px - cam.ox) * k;
  cam.oy = py - (py - cam.oy) * k;
  clampCam();
  draw();
}
const toCell = (px, py) => [(px - cam.ox) / cam.s, (py - cam.oy) / cam.s];

let raf = 0;
function draw() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    paint(ctx, cam, cw, ch, dpr, {});
    if (stroke && gesture?.pointerType && gesture.pointerType !== 'mouse') paintLoupe();
  });
}

function paint(c, cm, w, h, ratio, { exporting = false, top = 0 }) {
  const { s, ox, oy } = cm;
  c.setTransform(ratio, 0, 0, ratio, 0, top * ratio);
  c.fillStyle = SEA;
  c.fillRect(0, 0, w, h);
  c.save();
  c.translate(ox, oy);
  c.scale(s, s);
  c.imageSmoothingEnabled = false;
  c.drawImage(base, 0, 0);
  if (!exporting) c.drawImage(hoverCanvas, 0, 0);
  c.lineJoin = 'round'; c.lineCap = 'round';

  c.strokeStyle = 'rgba(43,33,24,.55)'; c.lineWidth = 0.8 / s;
  c.stroke(coastPath);
  if (opts.showModern && !exporting) {
    c.setLineDash([4 / s, 3 / s]); c.strokeStyle = 'rgba(43,33,24,.5)'; c.lineWidth = 1 / s;
    c.stroke(modernPath); c.setLineDash([]);
  }
  c.strokeStyle = 'rgba(43,33,24,.35)'; c.lineWidth = 1 / s;
  c.stroke(regionEdges);
  if (view === 'political' || exporting) { c.strokeStyle = '#2b2118'; c.lineWidth = 2 / s; c.stroke(countryEdges); }
  if (isDaily()) {
    const { x0, y0, x1, y1 } = areaBox;
    c.setLineDash([5 / s, 4 / s]); c.strokeStyle = '#8b1e1e'; c.lineWidth = 1.6 / s;
    c.strokeRect(x0, y0, x1 - x0, y1 - y0); c.setLineDash([]);
  }

  // Player's lines.
  state.lines.forEach((l, k) => {
    c.beginPath();
    l.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = k === eraseHover ? '#c0392b' : '#2b2118';
    c.lineWidth = (k === eraseHover ? 4.5 : 2.6) / s;
    c.stroke();
  });
  if (stroke && stroke.length > 1) {
    c.beginPath();
    stroke.forEach(([x, y], j) => (j ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.strokeStyle = '#8b1e1e'; c.lineWidth = 3 / s; c.stroke();
  }
  if (opts.show1878 && !exporting) {
    c.setLineDash([6 / s, 4 / s]); c.strokeStyle = '#8b1e1e'; c.lineWidth = 2.2 / s;
    c.stroke(berlinEdges); c.setLineDash([]);
  }
  c.restore();

  const scr = ([x, y]) => [ox + x * s, oy + y * s];
  // Cities.
  const zoomed = s / cm.fitS;
  c.font = '600 11px "Source Sans 3", system-ui, sans-serif';
  c.textBaseline = 'middle';
  for (const city of CITY_PTS) {
    if (city.k < (zoomed > 2.2 ? 0 : zoomed > 1.3 ? 40 : 90)) continue;
    const [x, y] = scr(city.p);
    if (x < -50 || y < -20 || x > w + 50 || y > h + 20) continue;
    c.fillStyle = '#2b2118';
    c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill();
    c.lineWidth = 3; c.strokeStyle = 'rgba(251,246,232,.9)';
    c.strokeText(city.name, x + 5, y); c.fillText(city.name, x + 5, y);
  }
  // Holy sites.
  if (opts.showSites) {
    for (const site of SITE_POINTS) {
      const [x, y] = scr(site.p);
      if (x < -10 || y < -10 || x > w + 10 || y > h + 10) continue;
      c.save();
      c.translate(x, y); c.rotate(Math.PI / 4);
      c.fillStyle = '#fbf6e8'; c.strokeStyle = '#8b1e1e'; c.lineWidth = 1.5;
      c.fillRect(-4, -4, 8, 8); c.strokeRect(-4, -4, 8, 8);
      c.restore();
    }
  }
  // Country names.
  if (view === 'political' || exporting) {
    c.textAlign = 'center';
    state.countries.forEach((co, k) => {
      const lp = labelPos[k];
      if (!lp) return;
      const size = Math.max(11, Math.min(22, Math.sqrt(lp[2]) * s * 0.18));
      c.font = `700 ${size}px "EB Garamond", Georgia, serif`;
      const [x, y] = scr(lp);
      c.lineWidth = 4; c.strokeStyle = 'rgba(251,246,232,.92)';
      c.strokeText(co.name.toUpperCase(), x, y); c.fillStyle = '#2b2118'; c.fillText(co.name.toUpperCase(), x, y);
    });
    c.textAlign = 'start';
  }
}

// A magnifier above the finger while drawing, since the finger hides the pen.
function paintLoupe() {
  const last = stroke[stroke.length - 1];
  const fx = cam.ox + last[0] * cam.s, fy = cam.oy + last[1] * cam.s;
  const R = 52, ZOOM = 2, src = R / ZOOM;
  const lx = Math.min(cw - R - 6, Math.max(R + 6, fx));
  const ly = fy - R - 46 > R + 6 ? fy - R - 46 : fy + R + 46;
  const size = Math.round(2 * R * dpr);
  if (loupe.width !== size) { loupe.width = size; loupe.height = size; }
  const l = loupe.getContext('2d');
  l.clearRect(0, 0, size, size);
  l.drawImage(canvas, (fx - src) * dpr, (fy - src) * dpr, 2 * src * dpr, 2 * src * dpr, 0, 0, size, size);
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.beginPath(); ctx.arc(lx, ly, R, 0, 7); ctx.closePath();
  ctx.save(); ctx.clip();
  ctx.drawImage(loupe, lx - R, ly - R, 2 * R, 2 * R);
  ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = '#2b2118'; ctx.stroke();
  ctx.fillStyle = '#8b1e1e'; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill();
  ctx.restore();
}

// ---------- Hit testing ----------
function cellAt(px, py) {
  const [x, y] = toCell(px, py);
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return -1;
  return cy * COLS + cx;
}
const regionAt = (px, py) => { const i = cellAt(px, py); return i < 0 ? -1 : region[i]; };
function lineAt(px, py) {
  const [x, y] = toCell(px, py);
  const tol = 16 / cam.s;
  let best = -1, bestD = tol;
  state.lines.forEach((l, k) => {
    for (let j = 1; j < l.length; j++) {
      const [ax, ay] = l[j - 1], [bx, by] = l[j];
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
      const d = Math.hypot(x - ax - t * dx, y - ay - t * dy);
      if (d < bestD) { bestD = d; best = k; }
    }
  });
  return best;
}
function siteAt(px, py, radius = 10) {
  for (const s of SITE_POINTS) {
    const x = cam.ox + s.p[0] * cam.s, y = cam.oy + s.p[1] * cam.s;
    if (Math.hypot(px - x, py - y) < radius) return s;
  }
  return null;
}

// ---------- Info tooltip (hover with a mouse, press and hold on touch) ----------
function showTip(px, py, touch = false) {
  const site = opts.showSites ? siteAt(px, py, touch ? 18 : 10) : null;
  const i = cellAt(px, py);
  const r = i >= 0 ? region[i] : -1;
  let html = '';
  if (site) {
    const names = Object.keys(site.claims).map((k) => GROUPS.find((g) => g.key === k).name).join(', ');
    html = `<h4>✦ ${esc(site.name)}</h4><div class="muted">Sacred or historic to: ${esc(names)}</div>`;
  } else if (r >= 0) {
    const o = regionOwner[r];
    const mix = [...Array(G).keys()].map((g) => [g, regionPop[r * G + g] / regionTotal[r]]).filter(([, v]) => v >= 0.02).sort((a, b) => b[1] - a[1]).slice(0, 5);
    html = `<h4>${o >= 0 ? esc(state.countries[o].name) : 'Unclaimed land'}</h4>
      <div class="muted">This piece: ${fmt(regionTotal[r])} people${autoIsland[r] ? ' · island, joins the nearest country' : ''}</div>
      ${mix.map(([g, v]) => `<div class="row"><span><i class="dot" style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><b>${pct(v)}</b></div>`).join('')}`;
  } else if (i >= 0 && model.land[i] && isDaily()) {
    html = '<h4>Outside today\'s puzzle</h4><div class="muted">Only the land inside the dashed box is in play.</div>';
  } else { tip.hidden = true; return; }
  tip.innerHTML = html;
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = px + 16, y = touch ? py - th - 40 : py + 16;
  if (x + tw > cw - 8) x = px - tw - 16;
  if (y + th > ch - 8) y = py - th - 16;
  if (y < 8) y = py + 40;
  tip.style.left = `${Math.max(8, Math.min(cw - tw - 8, x))}px`;
  tip.style.top = `${Math.max(8, y)}px`;
}

// ---------- History ----------
const snapshot = () => JSON.stringify({ lines: state.lines, countries: state.countries, claims: state.claims });
function pushUndo() {
  undoStack.push(snapshot());
  if (undoStack.length > 200) undoStack.shift();
  redoStack = [];
  updateButtons();
}
function restore(json) {
  const s = JSON.parse(json);
  state.lines = s.lines; state.claims = s.claims;
  if (!isDaily()) state.countries = s.countries;
  if (active >= state.countries.length) active = state.countries.length - 1;
  recompute();
}
function undo() {
  if (!undoStack.length || locked()) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
}
function redo() {
  if (!redoStack.length || locked()) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
}
function updateButtons() {
  $('#undo').disabled = !undoStack.length || locked();
  $('#redo').disabled = !redoStack.length || locked();
  document.querySelectorAll('.tool').forEach((b) => { b.disabled = locked(); });
  const sign = $('#sign');
  sign.textContent = locked() ? 'Results' : 'Sign';
  $('#clear').textContent = isDaily() ? 'Clear the map' : 'Start again';
  $('#clear').disabled = locked();
  mapbox.classList.toggle('locked', locked());
}

// ---------- Actions ----------
function newCountry() {
  const used = new Set(state.countries.map((c) => c.color));
  const color = PALETTE.find((p) => !used.has(p)) || PALETTE[state.countries.length % PALETTE.length];
  state.countries.push({ name: `Country ${state.countries.length + 1}`, color, autoName: true });
  active = state.countries.length - 1;
  return active;
}
function claimRegion(r, country) {
  for (let i = 0; i < N; i++) if (region[i] === r) { state.claims.push({ cell: i, country }); return; }
}
function deleteCountry(k) {
  pushUndo();
  state.countries.splice(k, 1);
  state.claims = state.claims.filter((c) => c.country !== k).map((c) => ({ ...c, country: c.country > k ? c.country - 1 : c.country }));
  if (active === k) active = -1; else if (active > k) active--;
  recompute();
}
function renameCountry(k) {
  const name = prompt('Name this country', state.countries[k].name);
  if (!name || !name.trim()) return;
  pushUndo();
  state.countries[k].name = name.trim().slice(0, 40);
  state.countries[k].autoName = false;
  recompute();
}

function simplifyLine(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1, fd = tol;
    for (let k = a + 1; k < b; k++) {
      const d = Math.abs((bx - ax) * (ay - pts[k][1]) - (ax - pts[k][0]) * (by - ay)) / len;
      if (d > fd) { fd = d; far = k; }
    }
    if (far >= 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, k) => keep[k]).map(([x, y]) => [Math.round(x * 2) / 2, Math.round(y * 2) / 2]);
}

// ---------- Pointer input ----------
// One finger (or the left mouse button) uses the current tool; two fingers
// move and zoom; the middle/right mouse button, or holding Space, moves the
// map; press and hold shows who lives there.
const pointers = new Map();
let gesture = null;
let spaceDown = false;
const LONG_PRESS = 450;

function localXY(e) {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
function closePopovers() {
  if (!$('#layers').hidden) toggleLayers(false);
  if (panel.classList.contains('open') && window.innerWidth < 900) setSheet(false);
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  const [x, y] = localXY(e);
  pointers.set(e.pointerId, { x, y });
  tip.hidden = true;
  closePopovers();
  if (pointers.size === 2) {
    // Second finger: abandon whatever the first was doing and pan/zoom.
    clearTimeout(gesture?.timer);
    if (gesture?.type === 'draw') stroke = null;
    if (gesture?.type === 'claim' && gesture.changed) recompute();
    const [p1, p2] = [...pointers.values()];
    gesture = { type: 'pinch', d: Math.hypot(p1.x - p2.x, p1.y - p2.y), mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
    draw();
    return;
  }
  if (pointers.size > 2) return;
  let t = tool;
  if (spaceDown || (e.pointerType === 'mouse' && e.button > 0)) t = 'pan';
  else if (locked()) t = 'look';
  else if (t === 'draw' && isDaily() && state.lines.length >= puzzle.lines) {
    toast(`Today's puzzle allows ${puzzle.lines} line${puzzle.lines > 1 ? 's' : ''}. Erase one to redraw it.`);
    t = 'look';
  }
  gesture = { type: t, pointerType: e.pointerType, x0: x, y0: y, lx: x, ly: y, moved: false, changed: false, visited: new Set() };
  if (e.pointerType !== 'mouse' && t !== 'pan') {
    gesture.timer = setTimeout(() => {
      if (!gesture || gesture.moved || gesture.type === 'pinch') return;
      gesture.info = true;
      stroke = null;
      buzz(8);
      showTip(gesture.x0, gesture.y0, true);
      draw();
    }, LONG_PRESS);
  }
  if (t === 'draw') stroke = [toCell(x, y)];
  if (t === 'erase') eraseAt(x, y);
  if (t === 'pan') mapbox.classList.add('panning');
});

canvas.addEventListener('pointermove', (e) => {
  const [x, y] = localXY(e);
  if (!pointers.has(e.pointerId)) {
    if (e.pointerType === 'mouse') hover(x, y);
    return;
  }
  pointers.set(e.pointerId, { x, y });
  if (!gesture) return;
  if (gesture.type === 'pinch') {
    if (pointers.size < 2) return;
    const [p1, p2] = [...pointers.values()];
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    cam.ox += mx - gesture.mx; cam.oy += my - gesture.my;
    zoomAt(mx, my, d / gesture.d);
    gesture.d = d; gesture.mx = mx; gesture.my = my;
    return;
  }
  if (gesture.info) return;
  if (!gesture.moved && Math.hypot(x - gesture.x0, y - gesture.y0) > 6) {
    gesture.moved = true;
    clearTimeout(gesture.timer);
  }
  if (gesture.type === 'pan') {
    cam.ox += x - gesture.lx; cam.oy += y - gesture.ly;
    clampCam(); draw();
  } else if (gesture.type === 'draw') {
    const p = toCell(x, y), last = stroke[stroke.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) >= 0.3) { stroke.push(p); draw(); }
  } else if (gesture.type === 'erase') {
    eraseAt(x, y);
  } else if (gesture.type === 'claim' && gesture.moved) {
    // Dragging paints every piece passed over, starting where the finger went down.
    if (!gesture.dragging) { gesture.dragging = true; claimAt(gesture.x0, gesture.y0, false, gesture); }
    claimAt(x, y, false, gesture);
  }
  gesture.lx = x; gesture.ly = y;
});

function hover(x, y) {
  showTip(x, y);
  renderHover(tool === 'claim' && !locked() ? regionAt(x, y) : -1);
  eraseHover = tool === 'erase' ? lineAt(x, y) : -1;
  draw();
}

function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (!gesture) return;
  if (gesture.type === 'pinch') {
    if (pointers.size === 0) gesture = null;
    else { const [p] = [...pointers.values()]; gesture = { type: 'pan', x0: p.x, y0: p.y, lx: p.x, ly: p.y, moved: true, visited: new Set() }; }
    return;
  }
  const g = gesture;
  gesture = null;
  clearTimeout(g.timer);
  mapbox.classList.remove('panning');
  if (g.info) {
    setTimeout(() => { tip.hidden = true; }, 2200);
    if (g.type === 'claim' && g.changed) recompute();
    draw();
    return;
  }
  if (g.type === 'draw' && stroke) {
    const pts = simplifyLine(stroke, 0.35);
    stroke = null;
    let len = 0;
    for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (pts.length >= 2 && len >= 1.5) {
      pushUndo();
      state.lines.push(pts);
      const cut = recompute({ inherit: true });
      if (cut > 0) buzz(12);
      if (briefOpen && isDaily()) { briefOpen = false; renderBrief(); }
    } else draw();
  } else if (g.type === 'claim') {
    if (!g.moved) claimAt(g.x0, g.y0, true, g);
    if (g.changed) recompute();
  } else if (g.type === 'look' && !g.moved && e.pointerType !== 'mouse') {
    showTip(g.x0, g.y0, true);
    setTimeout(() => { tip.hidden = true; }, 2200);
  }
  draw();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse' && !pointers.size) { tip.hidden = true; renderHover(-1); eraseHover = -1; draw(); }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [x, y] = localXY(e);
  zoomAt(x, y, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)));
}, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// Stop iOS from treating a drag on the map as a page scroll or zoom.
mapbox.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

function eraseAt(x, y) {
  const k = lineAt(x, y);
  if (k < 0) return;
  if (!gesture.changed) pushUndo();
  gesture.changed = true;
  state.lines.splice(k, 1);
  eraseHover = -1;
  buzz(10);
  recompute({ inherit: true });
}

function claimAt(x, y, tap, g) {
  const r = regionAt(x, y);
  if (r < 0) {
    if (tap && isDaily()) toast('Only the land inside the dashed box is in play today.');
    return;
  }
  if (g.visited.has(r)) return;
  g.visited.add(r);
  if (active < 0 || active >= state.countries.length) {
    if (isDaily()) active = 0;
    else { if (!g.changed) pushUndo(); newCountry(); g.changed = true; }
  }
  let owner = active;
  if (tap && regionOwner[r] === active && !autoIsland[r]) owner = -1; // tap your own piece to release it
  if (regionOwner[r] === owner && !autoIsland[r]) return;
  if (!g.changed) pushUndo();
  g.changed = true;
  claimRegion(r, owner);
  regionOwner[r] = owner;
  // Cheap live update while dragging; full recompute on release.
  for (let i = 0; i < N; i++) if (region[i] === r) cellOwner[i] = owner;
  buzz(6);
  if (view !== 'political') setView('political');
  else { renderBase(); draw(); }
}

// ---------- Keyboard ----------
window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, dialog[open]')) return;
  const k = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); redo(); return; }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (k === ' ') { spaceDown = true; mapbox.classList.add('panning'); e.preventDefault(); }
  else if (k === 'd') setTool('draw');
  else if (k === 'e') setTool('erase');
  else if (k === 'c') setTool('claim');
  else if (k === 'escape' && stroke) { stroke = null; gesture = null; draw(); }
});
window.addEventListener('keyup', (e) => { if (e.key === ' ') { spaceDown = false; mapbox.classList.remove('panning'); } });

// ---------- UI ----------
function setTool(t) {
  tool = t;
  document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  mapbox.dataset.tool = t;
  renderHover(-1);
  eraseHover = -1;
  renderBrief();
  draw();
}
function setView(v) {
  view = v;
  document.querySelectorAll('.view').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  renderBase();
  draw();
}

function renderBrief() {
  const el = $('#brief');
  if (isDaily()) {
    const used = state.lines.length;
    const tries = daily.attempts.map((a) => a.emoji).join('') + '⬜'.repeat(MAX_ATTEMPTS - daily.attempts.length);
    el.className = `brief${briefOpen ? '' : ' collapsed'}`;
    el.innerHTML = `
      <div class="row"><span class="num">No. ${puzzle.number}</span>
        <span class="pill${used >= puzzle.lines ? ' full' : ''}" title="Border lines used">✏️ ${used}/${puzzle.lines}</span>
        <span class="tries" title="Attempts">${tries}</span></div>
      <div class="row"><h2>${esc(puzzle.title)}</h2><button class="toggle" type="button">${briefOpen ? 'Hide' : 'Brief'}</button></div>
      <p>${esc(puzzle.brief)} ${daily.done ? '<b>Finished. A new puzzle comes at midnight.</b>' : `Draw up to <b>${puzzle.lines} lines</b>, claim the pieces, then sign.`}</p>`;
    el.querySelector('.toggle').onclick = () => { briefOpen = !briefOpen; renderBrief(); };
    return;
  }
  el.className = 'brief';
  const c = state.countries[active];
  const msg = {
    draw: state.lines.length >= 2 ? '' : '<b>Draw a border</b> with one finger. Lines that end near a coast or another line snap to it. Two fingers move the map.',
    erase: '<b>Tap a line</b> to erase it.',
    claim: c ? `<b>Tap or drag</b> across pieces to give them to <b>${esc(c.name)}</b>. Tap one of its pieces again to release it.` : '<b>Tap a piece</b> of land to found a new country there.',
  }[tool];
  el.innerHTML = msg ? `<div>${msg}</div>` : '';
}

function mixBar(groups, total) {
  return `<div class="mixbar">${[...groups.keys()].filter((g) => groups[g] / total >= 0.02).sort((a, b) => groups[b] - groups[a])
    .map((g) => `<span title="${GROUPS[g].name} ${pct(groups[g] / total)}" style="width:${(groups[g] / total) * 100}%;background:${GROUPS[g].color}"></span>`).join('')}</div>`;
}

function renderPanel() {
  const editable = !isDaily();
  $('#chips').innerHTML = state.countries.map((c, k) => {
    const s = countryStats[k];
    return `<button class="chip${k === active ? ' active' : ''}" data-k="${k}" role="option" aria-selected="${k === active}">
      <i style="background:${c.color}"></i><span class="nm">${esc(c.name)}</span>${s?.people ? `<small>${fmt(s.people)}</small>` : ''}</button>`;
  }).join('') + (editable ? '<button class="chip add" data-add="1">+ New country</button>' : '');

  $('#countryList').innerHTML = state.countries.map((c, k) => {
    const s = countryStats[k];
    const top = s && s.people ? [...s.groups.keys()].sort((a, b) => s.groups[b] - s.groups[a]).slice(0, 2)
      .map((g) => `${pct(s.groups[g] / s.people)} ${GROUPS[g].name}`).join(', ') : 'No land yet';
    return `<li class="citem${k === active ? ' active' : ''}" data-k="${k}">
      <span class="swatch" style="background:${c.color}"></span>
      <span class="cname">${esc(c.name)}</span>
      <span class="cactions">${editable ? `
        <button class="icon-btn" data-act="rename" title="Rename" aria-label="Rename ${esc(c.name)}">✎</button>
        <button class="icon-btn" data-act="delete" title="Dissolve" aria-label="Dissolve ${esc(c.name)}">✕</button>` : ''}
      </span>
      <span class="cmeta">${s && s.people ? `${fmt(s.people)} people · ` : ''}${esc(top)}</span>
      ${s && s.people ? mixBar(s.groups, s.people) : ''}
    </li>`;
  }).join('') || '<li class="muted small">Draw lines to cut the map into pieces, then tap a piece to found a country there.</li>';

  let unclaimed = 0, total = 0;
  for (let r = 0; r < regionCount; r++) { total += regionTotal[r]; if (regionOwner[r] < 0) unclaimed += regionTotal[r]; }
  $('#unclaimed').innerHTML = state.countries.length && unclaimed > 1000
    ? `⚠ <b>${fmt(unclaimed)}</b> people (${pct(unclaimed / total)}) live on unclaimed land and ${isDaily() ? 'count against you' : 'stay under imperial rule'}.` : '';
  renderBrief();
  updateButtons();
}

function selectCountry(k) {
  active = k;
  setTool('claim');
  renderPanel();
}
$('#chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  if (chip.dataset.add) {
    pushUndo();
    newCountry();
    setTool('claim');
    renderPanel();
    save();
    toast('Now tap a piece of land to give it to your new country.');
    return;
  }
  selectCountry(+chip.dataset.k);
});
$('#countryList').addEventListener('click', (e) => {
  const li = e.target.closest('.citem');
  if (!li) return;
  const k = +li.dataset.k;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'rename') return renameCountry(k);
  if (act === 'delete') return deleteCountry(k);
  selectCountry(k);
});

// Bottom sheet: tap or swipe the handle.
function setSheet(open) {
  tip.hidden = true;
  panel.classList.toggle('open', open);
  $('#grab').setAttribute('aria-expanded', String(open));
}
$('#grab').addEventListener('click', () => setSheet(!panel.classList.contains('open')));
let sheetY = null;
$('#grab').addEventListener('pointerdown', (e) => { sheetY = e.clientY; });
window.addEventListener('pointerup', (e) => {
  if (sheetY === null) return;
  const dy = e.clientY - sheetY;
  sheetY = null;
  if (dy < -30) setSheet(true);
  else if (dy > 30) setSheet(false);
});

document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
document.querySelectorAll('.view').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#undo').addEventListener('click', undo);
$('#redo').addEventListener('click', redo);
$('#clear').addEventListener('click', () => {
  if (locked() || (!state.lines.length && !state.claims.length && (isDaily() || !state.countries.length))) return;
  if (!confirm(isDaily() ? 'Clear your lines and claims for today\'s puzzle?' : 'Tear up the map and start again?')) return;
  pushUndo();
  state.lines = []; state.claims = [];
  if (!isDaily()) { state.countries = []; active = -1; }
  recompute();
  setView('ethnic');
});
$('#fitBtn').addEventListener('click', fit);

function toggleLayers(open = $('#layers').hidden) {
  tip.hidden = true;
  $('#layers').hidden = !open;
  $('#layersBtn').setAttribute('aria-expanded', String(open));
}
$('#layersBtn').addEventListener('click', () => toggleLayers());
for (const id of ['show1878', 'showModern', 'showSites', 'simplify']) {
  const el = $(`#${id}`);
  el.checked = opts[id];
  el.addEventListener('change', () => { opts[id] = el.checked; if (id === 'simplify') renderBase(); draw(); });
}
$('#legend').innerHTML = GROUPS.map((g, k) => `<li data-g="${k}"><i style="background:${g.color}"></i>${g.name}</li>`).join('');
$('#legend').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const g = +li.dataset.g;
  highlight = highlight === g ? -1 : g;
  document.querySelectorAll('#legend li').forEach((x) => x.classList.toggle('on', +x.dataset.g === highlight));
  renderBase();
  draw();
});
$('#sources').innerHTML = SOURCES.map((s) => `<li><a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('');
$('#aboutBtn').addEventListener('click', () => $('#about').showModal());
document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'coach') d.close(); }));

// ---------- Modes ----------
function setMode(m, { refit = true } = {}) {
  if (gesture) { gesture = null; stroke = null; }
  saveNow();
  mode = m;
  store(KEYS.mode, m);
  document.querySelectorAll('.mode').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  if (m === 'daily') {
    daily.countries = puzzle.countries.map((c) => ({ ...c }));
    state = daily;
    active = 0;
  } else {
    state = free;
    active = state.countries.length ? Math.min(Math.max(active, 0), state.countries.length - 1) : -1;
  }
  undoStack = []; redoStack = [];
  highlight = -1;
  document.querySelectorAll('#legend li').forEach((x) => x.classList.remove('on'));
  recompute();
  setView(state.claims.length ? 'political' : 'ethnic');
  setTool(locked() ? 'claim' : 'draw');
  if (refit) requestAnimationFrame(fit);
}
document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode); }));

// ---------- Results ----------
const riskClass = (l) => ({ 'Peaceful': 'b-ok', 'Tense': 'b-warn', 'War likely': 'b-bad', 'War certain': 'b-dire', 'Stable': 'b-ok', 'Restless': 'b-warn', 'Unrest': 'b-bad', 'Revolt likely': 'b-dire' }[l]);
const scoreHex = (v) => (v >= 70 ? '#3d7a45' : v >= 50 ? '#b7791f' : v >= 30 ? '#a8342b' : '#6d1414');

function reasonText(r, names, war) {
  const other = r.claimant === war.a ? war.b : war.a;
  if (r.kind === 'stranded') return `${fmt(r.people)} ${GROUPS[r.group].name} left inside ${esc(names[other])}`;
  return `${esc(names[other])} holds ${esc(r.site)}, sacred to ${GROUPS[r.group].name}`;
}

function warList(res, names, max = 8) {
  const wars = res.wars.filter((w) => w.label !== 'Peaceful').slice(0, max);
  if (!wars.length) return '<p class="empty-note">No war is on the cards. Every neighbour is at peace.</p>';
  return `<ul class="rlist">${wars.map((w) => `<li class="ritem"><div class="top">
    <span class="title">${esc(names[w.a])} ⚔ ${esc(names[w.b])}</span><span class="badge ${riskClass(w.label)}">${w.label}</span></div>
    <ul>${w.why.slice(0, 3).map((r) => `<li>${reasonText(r, names, w)}</li>`).join('')}${w.adjacent ? '' : '<li>No shared border, so less likely to fight</li>'}</ul></li>`).join('')}</ul>`;
}
function unrestList(res) {
  const unrest = res.states.filter((s) => s.label !== 'Stable').sort((a, b) => b.unrest - a.unrest);
  if (!unrest.length) return '<p class="empty-note">Every state is internally stable.</p>';
  return `<ul class="rlist">${unrest.slice(0, 8).map((s) => `<li class="ritem"><div class="top"><span class="title">${esc(s.name)}</span><span class="badge ${riskClass(s.label)}">${s.label}</span></div>
    <ul><li>${s.mix.slice(0, 3).map((m) => `${pct(m.share)} ${GROUPS[m.group].name}`).join(', ')}</li></ul></li>`).join('')}</ul>`;
}
function countryTable(res) {
  return `<table class="ctable"><thead><tr><th>Country</th><th>People</th><th>Peoples</th><th>Stability</th></tr></thead><tbody>
    ${res.states.map((s) => `<tr><td><i class="dot" style="background:${state.countries[s.id].color}"></i>${esc(s.name)}</td><td>${fmt(s.people)}</td>
      <td>${mixBar(Float64Array.from(GROUPS.map((_, g) => s.mix.find((m) => m.group === g)?.people || 0)), s.people)}</td>
      <td><span class="badge ${riskClass(s.label)}">${s.label}</span></td></tr>`).join('')}
  </tbody></table>`;
}
function setActions(buttons) {
  const box = $('#resultsActions');
  box.innerHTML = '';
  for (const [label, cls, fn] of buttons) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.addEventListener('click', fn);
    box.appendChild(b);
  }
}
const closeResults = () => $('#results').close();

let lastResult = null;
function showFreeResults() {
  const res = evaluate(model, cellOwner, state.countries);
  const hist = getBerlinResult();
  const names = state.countries.map((c) => c.name);
  const small = res.states.filter((s) => !s.viable);
  const diff = res.peace - hist.peace;
  lastResult = res;
  $('#resultsBody').innerHTML = `
    <p class="eyebrow">The Treaty of Berlin, as you drew it</p>
    <div class="score-head">
      <div class="dial" style="--v:${res.peace};--dial:${scoreHex(res.peace)}"><div><b>${res.peace}</b><span>Peace</span></div></div>
      <div>
        <p class="verdict">${verdict(res.peace)}</p>
        <div class="kpis">
          <span><b>${pct(res.fairness)}</b> live in a state they call their own</span>
          <span><b>${res.wars.filter((w) => w.label === 'War likely' || w.label === 'War certain').length}</b> likely wars</span>
        </div>
      </div>
    </div>
    <div class="compare">
      <b>The real Congress of Berlin scores ${hist.peace}.</b>
      ${diff > 0 ? `You beat the Great Powers by ${diff} points.` : diff < 0 ? `The Great Powers beat you by ${-diff} points.` : 'You tied with the Great Powers.'}
      <br><span class="muted">What actually followed: the Serbo-Bulgarian War (1885), the Greco-Turkish War (1897), the Ilinden Uprising (1903), the Balkan Wars (1912–13) and, from Sarajevo in 1914, the First World War.</span>
    </div>
    ${res.unclaimedShare > 0.005 ? `<p>⚠ ${pct(res.unclaimedShare)} of people were left on unclaimed land under imperial rule.</p>` : ''}
    <h3>Wars between states</h3>${warList(res, names)}
    <h3>Trouble at home</h3>${unrestList(res)}
    ${small.length ? `<p>🗺 Too small to survive alone: ${small.map((s) => `<b>${esc(s.name)}</b> (${fmt(s.people)})`).join(', ')}.</p>` : ''}
    ${res.stateless.length ? `<p>🏳 Peoples without a state: ${res.stateless.map((s) => `${esc(s.nation === 'Albania' ? 'Albanians' : GROUPS.find((g) => g.nation === s.nation).name)} (${fmt(s.people)})`).join(', ')}.</p>` : ''}
    <h3>Your countries</h3>${countryTable(res)}
    <details><summary class="muted small">How the score is worked out</summary>
    <p class="small">Tension between two states builds up from each one's people stranded in the other, and from holy sites and historic capitals held by the wrong side. It is halved if they share no border. Unrest inside a state comes from hostile peoples forced together and from nations with no state of their own. Each becomes a chance of war or revolt within a generation. Your borders give about <b>${res.breakdown.wars.toFixed(1)}</b> wars and <b>${res.breakdown.revolts.toFixed(1)}</b> revolts. The score falls as those add up, rises with the share of people living in their own nation's state, and drops for unclaimed land and states too small to survive.</p></details>`;
  setActions([['Share image', '', shareImage], ['Copy link', '', shareLink], ['Keep drawing', 'primary', closeResults]]);
  $('#results').showModal();
}

function signDaily() {
  const res = scorePuzzle(model, cellOwner, puzzle, mask);
  const g = grade(res.peace, getPar());
  daily.attempts.push({ score: res.peace, emoji: g.emoji });
  if (g.emoji === '🟩' || daily.attempts.length >= MAX_ATTEMPTS) {
    daily.done = true;
    const best = [...daily.attempts].sort((a, b) => b.score - a.score)[0];
    stats = recordResult(stats, puzzle.number, best.emoji);
    store(KEYS.stats, stats);
  }
  saveNow();
  renderPanel();
  showDailyResults(res);
}

function showDailyResults(res = scorePuzzle(model, cellOwner, puzzle, mask)) {
  const p = getPar();
  const lastTry = daily.attempts[daily.attempts.length - 1];
  const g = GRADES.find((x) => x.emoji === lastTry.emoji);
  const left = MAX_ATTEMPTS - daily.attempts.length;
  const won = daily.attempts.some((a) => a.emoji === '🟩');
  const names = state.countries.map((c) => c.name);
  const row = daily.attempts.map((a) => a.emoji).join('') + '⬜'.repeat(left);
  const message = won ? 'Peace for a generation. The chancelleries of Europe salute you.'
    : daily.done ? 'The treaty is signed, but the guns will speak. Try again tomorrow.'
      : `${left} ${left === 1 ? 'try' : 'tries'} left. Redraw your borders and sign again.`;
  $('#resultsBody').innerHTML = `
    <div class="daily-head">
      <p class="eyebrow">No. ${puzzle.number} · ${esc(puzzle.title)}</p>
      <div class="grades">${row}</div>
      <div class="big" style="color:${{ '🟩': '#3d7a45', '🟨': '#b7791f', '🟧': '#c0602a', '🟥': '#a8342b' }[g.emoji]}">${res.peace}<span class="muted" style="font-size:20px"> /100</span></div>
      <div class="par">Par ${p} · attempt ${daily.attempts.length} of ${MAX_ATTEMPTS}</div>
      <div class="glabel">${g.emoji} ${g.label}</div>
      <p style="margin-top:8px">${message}</p>
      ${daily.done ? '<p class="countdown">Next puzzle in <b id="countdown"></b></p>' : ''}
    </div>
    <h3>Wars between states</h3>${warList(res, names, 4)}
    <h3>Trouble at home</h3>${unrestList(res)}
    <p class="muted small">Par is the score of a strong reference map. Reach 90% of par for 🟩, 75% for 🟨, 50% for 🟧.</p>`;
  if (daily.done) {
    setActions([['Statistics', '', () => { closeResults(); showStats(); }], ['Free play', '', () => { closeResults(); setMode('free'); }], ['Share', 'primary', shareDaily]]);
    startCountdown();
  } else {
    setActions([['Keep drawing', 'primary', closeResults]]);
  }
  $('#results').showModal();
}

let countdownTimer = 0;
function startCountdown() {
  clearInterval(countdownTimer);
  const tick = () => {
    const el = document.getElementById('countdown');
    if (!el) { clearInterval(countdownTimer); return; }
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    el.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

$('#sign').addEventListener('click', () => {
  if (isDaily() && daily.done) { showDailyResults(); return; }
  if (!state.countries.some((_, k) => countryStats[k]?.people > 0)) {
    toast(isDaily() ? 'Claim some land first: pick a state below, then tap a piece.' : 'Claim some land for at least one country first.');
    return;
  }
  if (isDaily()) signDaily(); else showFreeResults();
});

// ---------- Statistics ----------
function showStats() {
  const s = stats;
  const max = Math.max(1, ...Object.values(s.dist));
  $('#statsBody').innerHTML = `
    <h2>Statistics</h2>
    <div class="statgrid">
      <div><b>${s.played}</b><span>Played</span></div>
      <div><b>${s.played ? Math.round((s.wins / s.played) * 100) : 0}</b><span>Win %</span></div>
      <div><b>${s.streak}</b><span>Streak</span></div>
      <div><b>${s.maxStreak}</b><span>Best streak</span></div>
    </div>
    <h3>Best grade each day</h3>
    <div class="dist">${GRADES.map((g) => `<div class="bar"><span>${g.emoji}</span><span class="fill" style="width:${Math.max(8, (s.dist[g.emoji] / max) * 100)}%">${s.dist[g.emoji] || 0}</span></div>`).join('')}</div>
    <p class="muted small" style="margin-top:12px">A win is a 🟩 within ${MAX_ATTEMPTS} tries. Your streak counts wins on consecutive days. Stats are kept on this device.</p>
    ${daily.done ? '<p class="countdown">Next puzzle in <b id="countdown"></b></p>' : ''}`;
  $('#stats').showModal();
  if (daily.done) startCountdown();
}
$('#statsBtn').addEventListener('click', showStats);

// ---------- Sharing ----------
const siteUrl = () => `${location.origin}${location.pathname}`;

async function shareDaily() {
  const text = shareText(puzzle, daily.attempts, siteUrl());
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Result copied. Paste it anywhere.');
  } catch {
    prompt('Copy your result:', text);
  }
}

async function shareLink() {
  const code = await encodeState(free);
  const url = `${siteUrl()}#g=${code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied. Anyone who opens it sees your map.');
  } catch {
    prompt('Copy this link:', url);
  }
  history.replaceState(null, '', `#g=${code}`);
}

async function shareImage() {
  const W = 1200, mapH = Math.round(W * ROWS / COLS), H = mapH + 150;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  const prevView = view, prevHL = highlight;
  view = 'political'; highlight = -1;
  renderBase();
  const s = W / COLS;
  x.fillStyle = '#efe4c8'; x.fillRect(0, 0, W, H);
  paint(x, { s, ox: 0, oy: 0, fitS: s }, W, mapH, 1, { exporting: true, top: 150 });
  x.setTransform(1, 0, 0, 1, 0, 0);
  view = prevView; highlight = prevHL;
  renderBase(); draw();
  const res = lastResult || evaluate(model, cellOwner, state.countries);
  x.fillStyle = '#2b2118';
  x.font = '700 44px "EB Garamond", Georgia, serif';
  x.fillText('My Balkans, 1878', 32, 62);
  x.font = '500 24px "EB Garamond", Georgia, serif';
  x.fillStyle = '#5b4a3a';
  x.fillText(verdict(res.peace), 32, 100);
  x.font = '600 18px "Source Sans 3", system-ui, sans-serif';
  x.fillText(`${pct(res.fairness)} live in their own state · Congress of Berlin: ${getBerlinResult().peace}`, 32, 130);
  x.fillStyle = scoreHex(res.peace);
  x.beginPath(); x.arc(W - 90, 75, 58, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.textAlign = 'center';
  x.font = '700 48px "EB Garamond", Georgia, serif'; x.fillText(String(res.peace), W - 90, 88);
  x.font = '700 13px "Source Sans 3", system-ui, sans-serif'; x.fillText('PEACE', W - 90, 110);
  x.textAlign = 'start';
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'balkans-1878.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'My Balkans, 1878', text: `I scored ${res.peace}/100 for peace. Can you draw fairer borders?` }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'balkans-1878.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('Image saved.');
}

// ---------- First-run coach ----------
let slide = 0;
function showSlide(k) {
  slide = k;
  document.querySelectorAll('#slides .slide').forEach((s, i) => s.classList.toggle('on', i === k));
  document.querySelectorAll('#dots i').forEach((d, i) => d.classList.toggle('on', i === k));
  $('#coachNext').textContent = k === 2 ? 'Start' : 'Next';
}
function openCoach() { showSlide(0); $('#coach').showModal(); }
function closeCoach() { $('#coach').close(); store(KEYS.coached, true); }
$('#coachNext').addEventListener('click', () => (slide < 2 ? showSlide(slide + 1) : closeCoach()));
$('#coachSkip').addEventListener('click', closeCoach);
$('#coach').addEventListener('cancel', () => store(KEYS.coached, true));
$('#helpBtn').addEventListener('click', openCoach);

// ---------- Persistence ----------
let saveTimer = 0;
function saveNow() {
  clearTimeout(saveTimer);
  store(KEYS.free, free);
  store(KEYS.daily, daily);
}
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}

async function boot() {
  new ResizeObserver(resize).observe(mapbox);
  resize();

  const savedFree = load(KEYS.free, null);
  if (savedFree && Array.isArray(savedFree.lines)) Object.assign(free, savedFree);
  const savedDaily = load(KEYS.daily, null);
  if (savedDaily && savedDaily.number === puzzle.number) Object.assign(daily, savedDaily, { countries: puzzle.countries });

  let startMode = load(KEYS.mode, 'daily');
  if (location.hash.startsWith('#g=')) {
    try {
      Object.assign(free, await decodeState(location.hash.slice(3)));
      startMode = 'free';
      toast('Loaded a shared map.');
    } catch { toast('That shared link could not be read.'); }
  }
  briefOpen = !daily.lines.length;
  setMode(startMode === 'free' ? 'free' : 'daily');
  if (!load(KEYS.coached, false)) openCoach();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  }
}
boot();

// Exposed for automated tests.
window.__game = {
  get state() { return state; }, get mode() { return mode; }, daily, puzzle, cam, toCell, setTool, setMode,
  evaluate: () => (isDaily() ? scorePuzzle(model, cellOwner, puzzle, mask) : evaluate(model, cellOwner, state.countries)),
  par: getPar,
};
