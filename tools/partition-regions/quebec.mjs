// Southern Quebec and eastern Ontario, 2021. Anchors are cities and regions
// with approximate 2021 census populations (thousands) and French / English
// mother-tongue shares in percent, estimated from memory. People with other
// mother tongues, about a third of Montreal island, are left out, as is the
// thinly peopled north. The St Lawrence and Ottawa rivers are not cut out.
export default {
  id: 'quebec',
  name: 'Quebec and eastern Ontario',
  subtitle: '2021 census, mother tongue',
  brief: 'Quebec nearly voted to leave Canada in 1995. English-speaking communities in Quebec argued they could then leave Quebec, and French speakers in Ontario were on the other side of the line.',
  source: 'Approximate 2021 census mother-tongue figures by city and region, for French and English only; people with other mother tongues, about a third of Montreal island, are left out. Only southern Quebec and eastern Ontario are shown.',
  history: 'Quebec voted to stay in Canada by 50.6% to 49.4%, so the partition question was never tested.',
  maxTerritories: 2,
  groups: [
    { key: 'fr', name: 'French', color: '#2a9d8f' },
    { key: 'en', name: 'English', color: '#e76f51' },
  ],
  bbox: [-77.6, 44.4, -70.6, 47.3],
  cellKm: 20,
  sigmaKm: 10,
  floor: { total: 60 },

  // [name, lon, lat, population (k), French %, English %]
  anchors: [
    ['West Island', -73.85, 45.46, 250, 25, 45], ['Montreal', -73.58, 45.52, 1200, 50, 12],
    ['Westmount', -73.63, 45.48, 350, 30, 30], ['Montreal East', -73.55, 45.60, 200, 65, 5],
    ['Laval', -73.73, 45.58, 440, 60, 8], ['Longueuil', -73.50, 45.53, 430, 80, 7],
    ['Vaudreuil', -74.05, 45.40, 160, 72, 17], ['Châteauguay', -73.75, 45.35, 150, 65, 25],
    ['North Shore', -73.90, 45.75, 600, 90, 5], ['Lanaudière', -73.40, 46.00, 520, 95, 2],
    ['Montérégie', -73.20, 45.35, 900, 85, 7], ['Sherbrooke', -71.90, 45.40, 330, 90, 5],
    ['Stanstead', -72.30, 45.10, 120, 75, 22], ['Granby', -72.70, 45.40, 200, 92, 5],
    ['Gatineau', -75.70, 45.48, 290, 78, 15], ['Aylmer', -75.85, 45.55, 60, 55, 40],
    ['Shawville', -76.49, 45.61, 15, 35, 60], ['Maniwaki', -75.95, 46.40, 30, 85, 10],
    ['Laurentians', -74.60, 46.20, 200, 92, 5], ['Lachute', -74.35, 45.65, 35, 75, 22],
    ['Trois-Rivières', -72.55, 46.35, 270, 97, 1], ['Drummondville', -72.50, 45.90, 250, 97, 1],
    ['Quebec City', -71.25, 46.80, 820, 94, 1.5], ['Beauce', -70.80, 46.20, 440, 97, 1],
    // Eastern Ontario
    ['Ottawa', -75.70, 45.42, 850, 14, 64], ['Orléans', -75.50, 45.47, 150, 30, 60],
    ['Prescott-Russell', -75.00, 45.45, 90, 62, 33], ['Cornwall', -74.73, 45.03, 115, 22, 70],
    ['Renfrew', -77.00, 45.60, 105, 6, 88], ['Lanark', -76.20, 45.00, 75, 3, 93],
    ['Brockville', -75.70, 44.65, 105, 3, 92], ['Kemptville', -75.60, 45.05, 70, 5, 88],
    ['Frontenac', -76.90, 44.80, 20, 2, 95],
  ],

  // Quebec south of 47.3°N and Ontario east of 77.6°W down to the St
  // Lawrence, simplified by hand, clockwise from the north-west, [lon, lat].
  outline: [
    [-77.6, 47.3], [-70.6, 47.3], [-70.6, 46.25], [-70.8, 45.4], [-71.1, 45.3], [-71.5, 45.01],
    [-74.7, 45.0], [-75.3, 44.85], [-75.8, 44.6], [-76.2, 44.4], [-77.6, 44.4],
  ],

  places: ['Montreal', 'West Island', 'Ottawa', 'Shawville', 'Cornwall', 'Prescott-Russell', 'Sherbrooke', 'Quebec City', 'Trois-Rivières', 'Brockville'],
};
