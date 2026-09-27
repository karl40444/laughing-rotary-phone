// Jammu and Kashmir, 1941. Each anchor is a district of the princely state
// (Udhampur split into Udhampur and Doda-Kishtwar, Srinagar separate from
// the rest of the Valley) with its approximate 1941 census population
// (thousands) and Muslim / Hindu / Buddhist shares in percent. Jammu (431k,
// 40% Muslim) and Mirpur (387k, 80% Muslim) were checked against the
// census; the rest are from memory. Sikhs are left out. The thinly peopled
// mountain districts are spread over wide kernels (the last number, in km).
export default {
  id: 'kashmir',
  name: 'Jammu and Kashmir',
  subtitle: '1941 census',
  brief: 'In 1947 the Hindu maharaja of Muslim-majority Jammu and Kashmir joined India, and the state has been divided and fought over since. Jammu was mostly Hindu, the Valley overwhelmingly Muslim, and Ladakh partly Buddhist.',
  note: 'Approximate 1941 census figures by district, for the whole princely state. In 1950 the UN mediator Owen Dixon proposed dividing it region by region. In 1947 tens of thousands of Muslims were killed in Jammu, and in 1990 most of the Valley\'s Hindu Pandits fled.',
  maxTerritories: 3,
  groups: [
    { key: 'm', name: 'Muslims', color: '#2a9d8f' },
    { key: 'h', name: 'Hindus', color: '#e76f51' },
    { key: 'b', name: 'Buddhists', color: '#7b6cc4' },
  ],
  bbox: [72.4, 32.2, 79.6, 37.2],
  cellKm: 28,
  sigmaKm: 18,
  floor: { total: 200 },

  // [name, lon, lat, population (k), Muslim %, Hindu %, Buddhist %, (spread km)]
  anchors: [
    ['Jammu', 74.86, 32.73, 431, 40, 56, 0], ['Kathua', 75.52, 32.37, 167, 25, 74, 0],
    ['Udhampur', 75.14, 32.93, 200, 25, 75, 0], ['Doda', 75.55, 33.15, 106, 62, 38, 0],
    ['Reasi', 74.83, 33.08, 257, 68, 31, 0], ['Mirpur', 73.75, 33.15, 387, 80, 16, 0],
    ['Poonch', 73.95, 33.80, 421, 90, 7, 0], ['Srinagar', 74.80, 34.08, 208, 75, 24, 0],
    ['Anantnag', 75.15, 33.73, 870, 96, 4, 0], ['Baramulla', 74.35, 34.30, 612, 97, 2, 0],
    ['Muzaffarabad', 73.47, 34.37, 265, 93, 6, 0], ['Leh', 77.58, 34.16, 36, 10, 1, 89, 45],
    ['Kargil', 76.13, 34.56, 82, 94, 1, 5, 30], ['Skardu', 75.63, 35.30, 116, 99, 0, 1, 35],
    ['Gilgit', 74.31, 35.92, 120, 99, 0.5, 0, 45],
  ],

  // The princely state as claimed in 1941, without Aksai Chin, simplified
  // by hand, clockwise from the north-west, [lon, lat].
  outline: [
    [72.6, 36.4], [73.0, 36.9], [74.5, 37.1], [75.5, 36.9], [76.3, 36.3], [77.8, 35.5], [78.2, 35.3],
    [78.3, 34.6], [79.0, 34.3], [79.4, 33.2], [78.7, 32.6], [77.8, 32.9], [77.0, 32.8], [76.4, 33.1],
    [75.9, 32.6], [75.6, 32.3], [75.3, 32.25], [74.9, 32.5], [74.6, 32.7], [74.0, 32.8], [73.6, 33.0],
    [73.5, 33.4], [73.4, 33.9], [73.3, 34.5], [73.6, 35.0], [73.2, 35.3], [72.8, 35.8], [72.5, 36.2],
  ],

  places: ['Jammu', 'Kathua', 'Mirpur', 'Poonch', 'Srinagar', 'Anantnag', 'Muzaffarabad', 'Doda', 'Leh', 'Kargil', 'Skardu', 'Gilgit'],
};
