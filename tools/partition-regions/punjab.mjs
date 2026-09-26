// Punjab, 1941. Each anchor is a British district (or one of the larger
// Sikh princely states) with its approximate 1941 census population
// (thousands) and Muslim / Hindu / Sikh shares in percent, rounded from
// memory of the published tables. Christians and others are left out, and
// Hindus include the scheduled castes.
export default {
  id: 'punjab',
  name: 'Punjab',
  subtitle: '1941 census',
  brief: 'In 1947 the Radcliffe Line split Punjab between India and Pakistan. Muslims, Hindus and Sikhs lived intermixed across the province.',
  note: 'Approximate 1941 census figures by district, for the British districts and the larger Sikh states. When Punjab was partitioned in 1947, hundreds of thousands were killed and around ten million people fled across the new border.',
  maxTerritories: 2,
  groups: [
    { key: 'm', name: 'Muslims', color: '#2a9d8f' },
    { key: 'h', name: 'Hindus', color: '#e76f51' },
    { key: 's', name: 'Sikhs', color: '#7b6cc4' },
  ],
  bbox: [69.6, 27.8, 77.8, 34.1],
  cellKm: 34,
  sigmaKm: 30,
  floor: { total: 400 },

  // [name, lon, lat, population (k), Muslim %, Hindu %, Sikh %]
  anchors: [
    ['Attock', 72.36, 33.77, 675, 91, 6, 3], ['Rawalpindi', 73.05, 33.60, 785, 80, 10, 8],
    ['Jhelum', 73.73, 32.93, 629, 90, 6, 4], ['Gujrat', 74.08, 32.57, 1105, 86, 7, 7],
    ['Shahpur', 72.67, 32.08, 999, 84, 10, 5], ['Mianwali', 71.55, 32.58, 506, 87, 12, 1],
    ['Sialkot', 74.53, 32.49, 1190, 62, 23, 12], ['Gujranwala', 74.19, 32.16, 912, 71, 12, 11],
    ['Sheikhupura', 73.98, 31.71, 852, 64, 10, 18], ['Lahore', 74.34, 31.55, 1695, 61, 16, 18],
    ['Amritsar', 74.87, 31.63, 1413, 46, 15, 36], ['Gurdaspur', 75.40, 32.04, 1153, 51, 25, 19],
    ['Lyallpur', 73.08, 31.42, 1397, 63, 14, 19], ['Jhang', 72.32, 31.27, 822, 83, 16, 1],
    ['Montgomery', 73.10, 30.66, 1329, 69, 16, 14], ['Multan', 71.47, 30.20, 1484, 78, 19, 3],
    ['Muzaffargarh', 71.19, 30.07, 712, 87, 12, 1], ['Dera Ghazi Khan', 70.64, 30.05, 581, 89, 11, 0.2],
    ['Ferozepur', 74.61, 30.93, 1423, 45, 20, 35], ['Ludhiana', 75.85, 30.90, 819, 37, 21, 42],
    ['Jullundur', 75.58, 31.33, 1127, 45, 29, 26], ['Hoshiarpur', 75.91, 31.53, 1170, 33, 50, 17],
    ['Kangra', 76.27, 32.10, 899, 5, 94, 0.3], ['Ambala', 76.78, 30.38, 848, 31, 50, 18],
    ['Karnal', 76.99, 29.69, 994, 31, 67, 2], ['Rohtak', 76.61, 28.90, 956, 17, 83, 0.2],
    ['Hissar', 75.72, 29.15, 1006, 28, 65, 7], ['Gurgaon', 77.03, 28.46, 852, 34, 66, 0.2],
    ['Patiala', 76.39, 30.34, 1936, 23, 32, 45], ['Kapurthala', 75.38, 31.38, 379, 57, 17, 24],
    ['Faridkot', 74.76, 30.67, 199, 31, 19, 50], ['Nabha', 76.15, 30.37, 341, 20, 45, 35],
    ['Jind', 76.31, 29.32, 362, 15, 80, 5],
  ],

  // British Punjab and the Sikh states, simplified by hand, clockwise from
  // the north-west, [lon, lat].
  outline: [
    [72.0, 34.0], [73.4, 34.0], [73.7, 33.4], [74.3, 33.0], [74.7, 32.8], [75.4, 32.5], [75.9, 32.5],
    [76.4, 32.9], [77.2, 32.5], [77.4, 31.8], [77.0, 31.3], [77.5, 30.5], [77.2, 29.5], [77.5, 28.4],
    [77.2, 27.9], [76.6, 28.1], [75.9, 28.5], [75.0, 29.0], [74.4, 29.8], [73.9, 30.2], [73.2, 29.9],
    [72.4, 29.6], [71.6, 29.3], [70.9, 29.0], [70.4, 28.5], [69.9, 28.9], [70.1, 30.0], [70.4, 30.9],
    [70.9, 31.6], [71.1, 32.4], [71.3, 33.0], [71.8, 33.3],
  ],

  places: ['Rawalpindi', 'Lahore', 'Multan', 'Lyallpur', 'Ludhiana', 'Jullundur', 'Ambala', 'Hissar', 'Gurgaon', 'Dera Ghazi Khan', 'Sialkot'],
};
