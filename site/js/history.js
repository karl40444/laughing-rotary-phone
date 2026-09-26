// Approximate borders set by the Congress of Berlin (July 1878), for the
// historical comparison. Hand-traced and coarse: good to ~20 km.
import { COLS, ROWS, cellCentre } from './grid.js';

export const BERLIN_COUNTRIES = [
  { name: 'Austria-Hungary', color: '#d9c27a' },
  { name: 'Ottoman Empire', color: '#c9745a' },
  { name: 'Serbia', color: '#7d8fc9' },
  { name: 'Montenegro', color: '#5d6fa0' },
  { name: 'Romania', color: '#e8d25a' },
  { name: 'Bulgaria', color: '#8fbf7a' },
  { name: 'Eastern Rumelia', color: '#b5d99c' },
  { name: 'Greece', color: '#6fb3d9' },
  { name: 'Russian Empire', color: '#a58fc9' },
  { name: 'Italy', color: '#7fd1b9' },
];

// Polygons as [lon, lat] rings.
const SERBIA = [[19.1, 44.9], [19.8, 44.9], [20.45, 44.84], [21.4, 44.78], [22.0, 44.62], [22.5, 44.6], [22.68, 44.25],
  [22.4, 43.8], [22.6, 43.3], [22.65, 43.0], [22.4, 42.6], [22.0, 42.35], [21.7, 42.6], [21.4, 42.9], [21.0, 43.1],
  [20.7, 43.3], [20.3, 43.45], [19.6, 43.6], [19.5, 44.0], [19.25, 44.3]];
const MONTENEGRO = [[18.45, 42.45], [18.6, 42.9], [18.9, 43.2], [19.3, 43.1], [19.7, 42.85], [19.9, 42.6], [19.6, 42.4],
  [19.35, 42.2], [19.1, 42.0], [18.95, 42.1], [18.8, 42.3]];
const ROMANIA = [[22.4, 44.72], [22.1, 44.5], [22.4, 44.9], [22.9, 45.2], [23.6, 45.4], [24.5, 45.4], [25.3, 45.5],
  [25.9, 45.4], [26.4, 45.6], [26.3, 46.1], [26.0, 46.5], [25.9, 47.3], [26.2, 47.7], [26.6, 48.1], [27.3, 48.3],
  [27.9, 47.6], [28.2, 47.0], [28.2, 46.4], [28.1, 45.6], [28.2, 45.45], [28.8, 45.25], [29.8, 45.25], [29.9, 44.8],
  [29.0, 44.6], [28.65, 44.0], [28.58, 43.75], [27.3, 44.1], [26.1, 43.87], [25.0, 43.65], [24.2, 43.72], [23.3, 43.8],
  [22.9, 44.05], [22.68, 44.25], [22.5, 44.6]];
const BULGARIA = [[22.68, 44.25], [22.9, 44.05], [23.3, 43.8], [24.2, 43.72], [25.0, 43.65], [26.1, 43.87], [27.3, 44.1],
  [28.58, 43.75], [28.9, 43.4], [27.9, 42.7], [27.0, 42.75], [26.0, 42.75], [25.0, 42.72], [24.3, 42.7], [23.9, 42.5],
  [23.5, 42.35], [23.2, 42.15], [22.9, 42.2], [22.5, 42.25], [22.4, 42.6], [22.65, 43.0], [22.6, 43.3], [22.4, 43.8]];
const RUMELIA = [[23.9, 42.5], [24.3, 42.7], [25.0, 42.72], [26.0, 42.75], [27.0, 42.75], [27.9, 42.7], [28.2, 42.4],
  [27.9, 42.05], [27.0, 42.05], [26.5, 41.95], [26.1, 41.8], [25.5, 41.7], [25.0, 41.8], [24.5, 41.8], [24.1, 41.95],
  [23.9, 42.2]];
const BOSNIA = [[15.72, 44.95], [16.0, 45.22], [16.9, 45.25], [17.5, 45.12], [18.2, 45.08], [18.8, 44.95], [19.37, 44.88],
  [19.2, 44.4], [19.6, 44.05], [19.3, 43.6], [18.95, 43.3], [18.7, 43.0], [18.5, 42.6], [18.2, 42.8], [17.7, 43.0],
  [17.4, 43.25], [17.0, 43.55], [16.5, 43.9], [16.2, 44.2], [15.9, 44.5], [15.75, 44.75]];

function inPoly(lon, lat, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Latitude of the Sava–Danube frontier between Hungary and the Balkans, east of the Drina.
function danubeLat(lon) {
  const pts = [[18.9, 44.9], [19.3, 44.9], [20.45, 44.83], [21.4, 44.75], [22.0, 44.6], [22.7, 44.6]];
  if (lon <= pts[0][0]) return pts[0][1];
  for (let k = 1; k < pts.length; k++) {
    if (lon <= pts[k][0]) {
      const [x0, y0] = pts[k - 1], [x1, y1] = pts[k];
      return y0 + ((lon - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return pts[pts.length - 1][1];
}

function greece(lon, lat) {
  if (lat < 36.2 || lat > 39.9) return false; // excludes Crete (Ottoman until 1913)
  if (lon < 20.05 && lat > 39.3) return true; // Corfu
  if (lat > 39.08) return false;
  return lon < 25.6 || (lat < 37.6 && lon < 26.3); // Cyclades, not the eastern Aegean isles
}

export function berlinOwner(model) {
  const owner = new Int16Array(COLS * ROWS).fill(-1);
  const idx = Object.fromEntries(BERLIN_COUNTRIES.map((c, i) => [c.name, i]));
  for (let i = 0; i < model.N; i++) {
    if (!model.land[i]) continue;
    const [lon, lat] = cellCentre(i);
    let c;
    if (inPoly(lon, lat, SERBIA)) c = 'Serbia';
    else if (inPoly(lon, lat, MONTENEGRO)) c = 'Montenegro';
    else if (inPoly(lon, lat, ROMANIA)) c = 'Romania';
    else if (inPoly(lon, lat, BULGARIA)) c = 'Bulgaria';
    else if (inPoly(lon, lat, RUMELIA)) c = 'Eastern Rumelia';
    else if (inPoly(lon, lat, BOSNIA)) c = 'Austria-Hungary'; // occupied Bosnia-Herzegovina
    else if (greece(lon, lat)) c = 'Greece';
    else if (lon < 13.6 && lat > 45.55) c = 'Italy';
    else if (lon > 26.6 && lat > 45.2) c = 'Russian Empire'; // Bessarabia (Romania took N. Dobruja)
    else if (lon > 18.9 && lat > danubeLat(lon)) c = 'Austria-Hungary';
    else if (lon <= 18.9 && lat > 42.2) c = 'Austria-Hungary'; // Croatia, Dalmatia, Slovene lands
    else if (lat > 45.2 && lon < 26.6) c = 'Austria-Hungary';
    else c = 'Ottoman Empire';
    owner[i] = idx[c];
  }
  return owner;
}
