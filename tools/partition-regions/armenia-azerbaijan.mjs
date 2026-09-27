// Soviet Armenia and Azerbaijan, 1979. Anchors are cities and groups of
// districts with approximate 1979 census populations (thousands) and
// Armenian / Azerbaijani shares in percent, rounded from memory (Nagorno-
// Karabakh 76% Armenian, Baku about 16%). Russians, Lezgins and others are
// left out; the census counted Kurds in Azerbaijan as Azerbaijanis.
export default {
  id: 'armenia-azerbaijan',
  name: 'Armenia and Azerbaijan',
  subtitle: '1979 census',
  brief: 'Soviet Armenia and Azerbaijan in 1979. Nagorno-Karabakh, mostly Armenian, lay inside Azerbaijan; Azerbaijanis lived across Armenia, and Baku had a large Armenian community.',
  source: 'Approximate 1979 census figures by city and district, counting only Armenians and Azerbaijanis.',
  history: 'Between 1988 and 1994 more than a million people fled or were driven out across these lines. In 2023 almost all of Nagorno-Karabakh\'s Armenians, over 100,000 people, fled to Armenia.',
  maxTerritories: 2,
  groups: [
    { key: 'hy', name: 'Armenians', color: '#e76f51' },
    { key: 'az', name: 'Azerbaijanis', color: '#2a9d8f' },
  ],
  bbox: [43.4, 38.35, 50.5, 41.95],
  cellKm: 19,
  sigmaKm: 10,
  floor: { total: 100 },
  naturalEarth: [{ name: 'Armenia' }, { name: 'Azerbaijan' }],

  // [name, lon, lat, population (k), Armenian %, Azerbaijani %]
  anchors: [
    // Armenian SSR
    ['Yerevan', 44.51, 40.18, 1019, 96, 0.5], ['Leninakan', 43.84, 40.79, 207, 97, 0.5],
    ['Kirovakan', 44.49, 40.81, 146, 95, 2], ['Ararat valley', 44.60, 39.95, 250, 75, 22],
    ['Amasia', 43.66, 40.95, 60, 60, 38], ['Vardenis', 45.73, 40.18, 50, 40, 58],
    ['Krasnoselsk', 45.35, 40.60, 25, 70, 30], ['Noyemberyan', 45.02, 41.10, 60, 85, 12],
    ['Ijevan', 45.10, 40.85, 70, 94, 3], ['Sevan', 45.10, 40.35, 150, 97, 1],
    ['Zangezur', 46.30, 39.30, 150, 85, 13], ['Yeghegnadzor', 45.35, 39.75, 50, 70, 28],
    ['Echmiadzin', 44.10, 40.15, 200, 92, 5], ['Ashtarak', 44.30, 40.40, 140, 95, 0.5],
    ['Stepanavan', 44.35, 41.00, 120, 93, 3],
    // Azerbaijan SSR
    ['Baku', 49.87, 40.40, 1550, 16, 56], ['Sumgait', 49.66, 40.59, 190, 10, 70],
    ['Kirovabad', 46.36, 40.68, 232, 14, 80], ['Shahumyan', 46.35, 40.45, 15, 80, 15],
    ['Khanlar', 46.15, 40.55, 50, 20, 75], ['Dashkesan', 46.08, 40.50, 40, 25, 72],
    ['Shamkhor', 46.00, 40.83, 120, 5, 93], ['Kazakh', 45.40, 41.10, 250, 2, 96],
    ['Mingachevir', 47.05, 40.77, 70, 10, 80], ['Stepanakert', 46.75, 39.82, 40, 88, 11],
    ['Shusha', 46.75, 39.76, 17, 8, 91], ['Mardakert', 46.83, 40.13, 45, 80, 19],
    ['Hadrut', 47.03, 39.52, 25, 92, 7], ['Martuni', 47.00, 39.85, 35, 85, 14],
    ['Lachin', 46.40, 39.60, 45, 1, 95], ['Kelbajar', 46.00, 40.10, 45, 0.5, 99],
    ['Agdam', 46.93, 39.99, 130, 3, 95], ['Fizuli', 47.15, 39.60, 90, 1, 98],
    ['Jabrayil', 47.00, 39.40, 50, 0.5, 99], ['Kubatly', 46.60, 39.30, 60, 0.5, 99],
    ['Nakhchivan', 45.40, 39.20, 240, 1.4, 96], ['Shaki', 47.17, 41.19, 150, 1, 90],
    ['Kuba', 48.50, 41.40, 250, 1, 70], ['Shamakhi', 48.64, 40.63, 150, 1, 95],
    ['Kura lowland', 47.80, 40.10, 900, 0.5, 97], ['Lankaran', 48.85, 38.75, 450, 0.5, 88],
    ['Salyan', 49.00, 39.60, 250, 0.5, 95], ['Ismailli', 48.15, 40.79, 60, 2, 90],
    ['Zakatala', 46.60, 41.60, 150, 1, 70],
  ],

  places: ['Yerevan', 'Leninakan', 'Baku', 'Kirovabad', 'Stepanakert', 'Nakhchivan', 'Lankaran', 'Shaki', 'Vardenis', 'Zangezur', 'Agdam'],
};
