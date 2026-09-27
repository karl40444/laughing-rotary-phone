// Bengal, 1941. Each anchor is a district of the Bengal Presidency with its
// approximate 1941 census population (thousands) and Muslim / Hindu shares
// in percent, rounded from memory of the published tables (Nadia checked
// against the census: 61% Muslim). Buddhists, Christians and tribal
// religions are left out; Hindus include the scheduled castes. The mostly
// Buddhist Chittagong Hill Tracts (247k) have no anchor, since their few
// Hindus would otherwise show as the local majority.
export default {
  id: 'bengal',
  name: 'Bengal',
  subtitle: '1941 census',
  brief: 'In 1947 Bengal was split between India and East Pakistan, now Bangladesh. Muslims were a majority in the east, Hindus in the west, and both lived everywhere.',
  source: 'Approximate 1941 census figures by district, for the Bengal Presidency without the princely states; the mostly Buddhist Chittagong Hill Tracts are counted as empty.',
  history: 'Millions of people crossed the new border in the years after 1947, and people kept crossing for decades.',
  maxTerritories: 2,
  groups: [
    { key: 'm', name: 'Muslims', color: '#2a9d8f' },
    { key: 'h', name: 'Hindus', color: '#e76f51' },
  ],
  bbox: [86.4, 20.7, 92.8, 27.3],
  cellKm: 27,
  sigmaKm: 24,
  floor: { total: 500 },

  // [name, lon, lat, population (k), Muslim %, Hindu %]
  anchors: [
    ['Burdwan', 87.86, 23.24, 1891, 18, 79], ['Birbhum', 87.53, 23.91, 1090, 27, 70],
    ['Bankura', 87.07, 23.23, 1289, 4.5, 85], ['Midnapore', 87.32, 22.42, 3190, 7.6, 88],
    ['Hooghly', 88.10, 22.90, 1377, 16, 83], ['Howrah', 88.20, 22.58, 1490, 20, 79],
    ['24 Parganas', 88.60, 22.35, 3536, 33, 65], ['Calcutta', 88.36, 22.57, 2109, 23, 73],
    ['Nadia', 88.55, 23.45, 1760, 61, 38], ['Murshidabad', 88.27, 24.18, 1640, 56, 43],
    ['Jessore', 89.21, 23.17, 1829, 61, 38], ['Khulna', 89.55, 22.60, 1944, 49, 50],
    ['Rajshahi', 88.60, 24.37, 1571, 75, 22], ['Dinajpur', 88.64, 25.63, 1927, 50, 44],
    ['Jalpaiguri', 88.72, 26.52, 1090, 23, 65], ['Darjeeling', 88.26, 27.04, 376, 2.5, 70],
    ['Rangpur', 89.25, 25.75, 2877, 71, 28], ['Bogra', 89.37, 24.85, 1260, 84, 16],
    ['Pabna', 89.24, 24.00, 1705, 77, 23], ['Malda', 88.14, 25.00, 1233, 57, 40],
    ['Dacca', 90.41, 23.72, 4222, 67, 33], ['Mymensingh', 90.40, 24.75, 6024, 77, 22],
    ['Faridpur', 89.84, 23.60, 2889, 64, 36], ['Bakarganj', 90.35, 22.70, 3549, 72, 28],
    ['Tippera', 91.18, 23.46, 3860, 77, 23], ['Noakhali', 91.10, 22.87, 2217, 81, 19],
    ['Chittagong', 91.83, 22.36, 2153, 74, 21],
  ],

  // The Bengal Presidency of 1941, simplified by hand, clockwise from the
  // north-west, [lon, lat]. The Sundarbans coast is smoothed.
  outline: [
    [88.0, 27.2], [88.9, 27.15], [89.8, 26.8], [89.85, 26.3], [89.9, 25.9], [90.5, 25.2], [91.2, 25.15],
    [91.2, 24.2], [91.35, 23.5], [91.4, 23.0], [91.8, 23.3], [92.2, 23.7], [92.6, 23.0], [92.6, 21.5],
    [92.3, 20.9], [92.0, 21.4], [91.8, 22.2], [91.5, 22.6], [91.0, 22.4], [90.6, 22.1], [89.9, 21.8],
    [89.2, 21.7], [88.6, 21.6], [88.0, 21.6], [87.5, 21.6], [87.4, 21.9], [86.9, 22.1], [86.8, 22.8],
    [86.6, 23.2], [86.9, 23.6], [87.3, 24.1], [87.8, 24.4], [87.8, 24.9], [88.1, 25.5], [88.0, 26.0],
    [88.2, 26.3], [88.1, 26.8],
  ],

  places: ['Calcutta', 'Dacca', 'Chittagong', 'Khulna', 'Jessore', 'Rajshahi', 'Rangpur', 'Mymensingh', 'Darjeeling', 'Burdwan', 'Midnapore', 'Murshidabad'],
};
