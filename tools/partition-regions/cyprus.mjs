// Cyprus, 1960. Anchors are towns and groups of villages with rough
// populations (thousands) and Greek / Turkish Cypriot shares in percent,
// estimated from memory in the pattern of the 1960 census: about four
// Greek Cypriots to every Turkish Cypriot, with Turkish Cypriot quarters in
// every town and Turkish villages scattered across the island. The totals
// are close to the census; the local splits are estimates.
export default {
  id: 'cyprus',
  name: 'Cyprus',
  subtitle: '1960, rough estimates',
  brief: 'Since 1974 Cyprus has been divided along a ceasefire line. Before that, Turkish Cypriots, about a fifth of the people, lived in towns and villages across the whole island; from 1964 many withdrew into armed enclaves.',
  source: 'Rough estimates by town and village group in the pattern of the 1960 census.',
  history: 'After 1974 around 160,000 Greek Cypriots and 45,000 Turkish Cypriots were displaced across the new line, which still divides the island.',
  maxTerritories: 4,
  groups: [
    { key: 'g', name: 'Greek Cypriots', color: '#2a9d8f' },
    { key: 't', name: 'Turkish Cypriots', color: '#e76f51' },
  ],
  bbox: [32.2, 34.5, 34.65, 35.75],
  cellKm: 6,
  sigmaKm: 5,
  floor: { total: 20 },
  naturalEarth: [
    { name: 'Cyprus' }, { name: 'N. Cyprus' }, { name: 'Cyprus U.N. Buffer Zone' }, { name: 'Akrotiri' }, { name: 'Dhekelia' },
  ],

  // [name, lon, lat, population (k), Greek %, Turkish %, (spread km)]
  anchors: [
    ['Nicosia', 33.37, 35.16, 70, 95, 3], ['Nicosia old city', 33.36, 35.18, 25, 15, 85],
    ['Mesaoria', 33.10, 35.15, 45, 90, 8], ['Gönyeli', 33.30, 35.21, 6, 10, 90],
    ['Morphou', 32.99, 35.20, 25, 95, 3], ['Lefka', 32.85, 35.11, 8, 10, 88],
    ['Kokkina', 32.62, 35.17, 5, 55, 45], ['Louroujina', 33.46, 35.00, 2, 0, 100],
    ['Dali', 33.42, 35.02, 20, 92, 8], ['Solea', 32.90, 34.99, 20, 99, 1],
    ['Kyrenia', 33.32, 35.34, 30, 88, 10], ['Kormakitis', 33.05, 35.33, 8, 80, 18],
    ['Famagusta', 33.94, 35.12, 35, 70, 28], ['East Mesaoria', 33.62, 35.12, 35, 95, 5],
    ['Turkish Mesaoria', 33.75, 35.20, 12, 15, 85], ['Karpas', 34.30, 35.58, 20, 95, 5, 12],
    ['Galatia', 34.10, 35.42, 5, 20, 80], ['Paralimni', 33.98, 35.03, 25, 99, 1],
    ['Lefkoniko', 33.73, 35.27, 15, 85, 13], ['Larnaca', 33.63, 34.92, 20, 75, 22],
    ['Larnaca villages', 33.50, 34.88, 31, 92, 6], ['Kofinou', 33.39, 34.83, 4, 10, 90],
    ['Limassol', 33.04, 34.68, 44, 83, 14], ['Limassol villages', 32.95, 34.80, 70, 95, 4],
    ['Episkopi', 32.85, 34.67, 8, 30, 70], ['Paphos', 32.42, 34.77, 12, 65, 33],
    ['Paphos villages', 32.45, 34.95, 25, 88, 10], ['Dhiarizos', 32.60, 34.80, 10, 20, 80],
    ['Polis', 32.43, 35.03, 10, 70, 28], ['Paphos hills', 32.72, 34.88, 15, 92, 7],
  ],

  places: ['Nicosia', 'Kyrenia', 'Famagusta', 'Larnaca', 'Limassol', 'Paphos', 'Lefka', 'Morphou', 'Polis', 'Louroujina'],
};
