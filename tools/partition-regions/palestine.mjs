// Mandatory Palestine, 1945. Anchors are subdistricts (split into towns and
// countryside where they differ) with approximate populations (thousands)
// and Arab / Jewish shares in percent, rounded from memory of the 1945
// Village Statistics estimates. The Bedouin of the Negev are spread over
// wide kernels (the last number, in km).
export default {
  id: 'palestine',
  name: 'Mandatory Palestine',
  subtitle: '1945 estimates',
  brief: 'In 1947 the UN proposed splitting Palestine into a Jewish and an Arab state. Arabs and Jews lived in the same cities and valleys.',
  note: 'Approximate figures from the 1945 Village Statistics by subdistrict; the almost empty southern Negev is left off. The Jewish state in the UN plan would have had an Arab population of over 40%; in the war that followed, around 700,000 Palestinian Arabs fled or were expelled.',
  maxTerritories: 2,
  groups: [
    { key: 'ar', name: 'Arabs', color: '#2a9d8f' },
    { key: 'je', name: 'Jews', color: '#7b6cc4' },
  ],
  // The almost empty southern Negev is cut off at 30.4°N to keep the map compact.
  bbox: [34.2, 30.4, 35.95, 33.35],
  cellKm: 11,
  sigmaKm: 7,
  floor: { total: 30 },
  naturalEarth: [{ name: 'Israel' }, { name: 'Palestine' }],

  // [name, lon, lat, population (k), Arab %, Jewish %, (spread km)]
  anchors: [
    ['Safad', 35.50, 32.96, 60, 88, 12], ['Acre', 35.15, 32.93, 75, 96, 4],
    ['Tiberias', 35.53, 32.79, 41, 67, 33], ['Nazareth', 35.30, 32.70, 50, 84, 16],
    ['Beisan', 35.50, 32.50, 28, 73, 27], ['Haifa', 34.99, 32.81, 145, 48, 52],
    ['Carmel coast', 34.95, 32.60, 55, 70, 30], ['Jezreel Valley', 35.20, 32.63, 40, 25, 75],
    ['Jenin', 35.30, 32.46, 60, 100, 0], ['Hadera', 34.92, 32.43, 30, 40, 60],
    ['Tulkarm', 35.03, 32.31, 75, 100, 0], ['Nablus', 35.26, 32.22, 93, 100, 0],
    ['Tel Aviv', 34.78, 32.08, 250, 2, 98], ['Jaffa', 34.75, 32.05, 95, 70, 30],
    ['Petah Tikva', 34.88, 32.09, 70, 35, 65], ['Lydda', 34.89, 31.94, 35, 100, 0],
    ['Rehovot', 34.80, 31.90, 45, 25, 75], ['Ramle villages', 34.97, 31.82, 50, 100, 0],
    ['Ramallah', 35.20, 31.90, 50, 100, 0], ['Jerusalem', 35.21, 31.78, 164, 40, 60],
    ['Bethlehem', 35.17, 31.70, 85, 97, 3], ['Jericho', 35.45, 31.86, 10, 100, 0],
    ['Hebron', 35.10, 31.53, 93, 100, 0], ['Majdal', 34.58, 31.67, 45, 92, 8],
    ['Gaza', 34.45, 31.51, 80, 100, 0], ['Khan Yunis', 34.30, 31.35, 35, 100, 0],
    ['Beersheba', 34.79, 31.25, 30, 99, 1, 20], ['Negev north', 34.60, 31.05, 20, 100, 0, 25],
    ['Negev', 34.90, 30.70, 10, 100, 0, 30],
  ],

  places: ['Haifa', 'Acre', 'Safad', 'Tiberias', 'Nazareth', 'Nablus', 'Tel Aviv', 'Jerusalem', 'Hebron', 'Gaza', 'Beersheba'],
};
