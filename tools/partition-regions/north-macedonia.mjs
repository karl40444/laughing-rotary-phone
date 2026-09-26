// North Macedonia, 2002. Each anchor is a municipality (Skopje split into
// its main parts) with its approximate 2002 census population (thousands)
// and Macedonian / Albanian / Turkish shares in percent, rounded from memory
// of the published results. Roma, Serbs, Bosniaks and others are left out.
export default {
  id: 'north-macedonia',
  name: 'North Macedonia',
  subtitle: '2002 census',
  brief: 'Macedonians, Albanians and Turks. After the 2001 conflict, the Ohrid Agreement chose power-sharing over any new border.',
  note: 'Approximate 2002 census figures by municipality; Roma, Serbs and others are left out. Albanians are concentrated in the west and north-west, but Skopje, Kumanovo and Struga are mixed.',
  maxTerritories: 2,
  groups: [
    { key: 'mk', name: 'Macedonians', color: '#e76f51' },
    { key: 'sq', name: 'Albanians', color: '#2a9d8f' },
    { key: 'tr', name: 'Turks', color: '#7b6cc4' },
  ],
  bbox: [20.4, 40.8, 23.1, 42.4],
  cellKm: 9,
  sigmaKm: 6,
  floor: { total: 50 },
  naturalEarth: [{ name: 'Macedonia' }],

  // [name, lon, lat, population (k), Macedonian %, Albanian %, Turkish %]
  anchors: [
    ['Skopje', 21.43, 41.99, 230, 88, 3, 1], ['Čair', 21.44, 42.02, 65, 25, 57, 6],
    ['Saraj', 21.33, 42.00, 35, 4, 91, 0], ['Gazi Baba', 21.47, 42.01, 110, 70, 20, 1],
    ['Tetovo', 20.97, 42.01, 86, 23, 70, 1], ['Tearce', 21.05, 42.08, 22, 13, 84, 2],
    ['Želino', 21.07, 41.98, 24, 0.2, 99, 0], ['Bogovinje', 20.92, 41.92, 28, 0.2, 95, 4],
    ['Brvenica', 20.98, 41.97, 16, 37, 62, 0], ['Jegunovce', 21.12, 42.07, 10, 57, 42, 0],
    ['Gostivar', 20.91, 41.80, 81, 20, 67, 10], ['Vrapčište', 20.88, 41.84, 25, 1, 81, 17],
    ['Mavrovo', 20.75, 41.70, 9, 51, 18, 26], ['Debar', 20.53, 41.52, 19, 20, 58, 14],
    ['Centar Župa', 20.56, 41.48, 6, 20, 0.2, 80], ['Kičevo', 20.96, 41.51, 30, 53, 31, 8],
    ['Zajas', 20.93, 41.60, 12, 1, 97, 0], ['Plasnica', 21.12, 41.47, 5, 1, 1, 98],
    ['Makedonski Brod', 21.22, 41.51, 7, 99, 0, 0], ['Struga', 20.68, 41.18, 63, 32, 57, 5],
    ['Ohrid', 20.80, 41.12, 55, 84, 5, 6], ['Resen', 21.01, 41.09, 16, 75, 10, 11],
    ['Bitola', 21.33, 41.03, 95, 88, 5, 1.5], ['Demir Hisar', 21.20, 41.22, 9.5, 97, 2, 0],
    ['Kruševo', 21.25, 41.37, 10, 63, 21, 0], ['Prilep', 21.55, 41.35, 76, 93, 0.2, 1.5],
    ['Veles', 21.78, 41.72, 55, 86, 1, 4], ['Štip', 22.19, 41.74, 47, 87, 0.1, 4],
    ['Kočani', 22.41, 41.92, 38, 93, 0, 3], ['Kumanovo', 21.71, 42.13, 105, 60, 26, 0.3],
    ['Lipkovo', 21.59, 42.16, 27, 1, 97, 0], ['Aračinovo', 21.56, 42.03, 11, 1, 94, 0],
    ['Čučer-Sandevo', 21.40, 42.10, 8.5, 38, 23, 0], ['Kratovo', 22.18, 42.08, 10, 99, 0, 0],
    ['Kriva Palanka', 22.33, 42.20, 20, 96, 0, 0], ['Probištip', 22.18, 41.99, 16, 97, 0, 0],
    ['Sveti Nikole', 21.94, 41.86, 18, 95, 0, 0], ['Negotino', 22.09, 41.48, 19, 93, 0, 1],
    ['Kavadarci', 22.01, 41.43, 38, 96, 0, 1], ['Gevgelija', 22.50, 41.14, 23, 96, 0, 0],
    ['Strumica', 22.64, 41.44, 55, 92, 0, 5], ['Radoviš', 22.46, 41.64, 28, 84, 0, 15],
    ['Valandovo', 22.56, 41.32, 12, 81, 0, 11], ['Dojran', 22.71, 41.18, 3.4, 70, 0, 10],
    ['Delčevo', 22.77, 41.97, 17, 97, 0, 0], ['Berovo', 22.86, 41.71, 14, 96, 0, 0],
    ['Vinica', 22.51, 41.88, 19, 93, 0, 0], ['Studeničani', 21.53, 41.92, 17, 3, 68, 9],
    ['Sopište', 21.38, 41.92, 5.6, 51, 44, 3], ['Zelenikovo', 21.59, 41.88, 4, 61, 35, 0],
    ['Petrovec', 21.62, 41.94, 8, 44, 33, 0], ['Ilinden', 21.58, 41.99, 15, 94, 3, 0],
  ],

  places: ['Skopje', 'Tetovo', 'Gostivar', 'Kumanovo', 'Debar', 'Struga', 'Ohrid', 'Bitola', 'Prilep', 'Veles', 'Štip', 'Strumica'],
};
