// Belgium, by language. Belgium has had no language census since 1947, so
// each anchor is an arrondissement (split where it matters) with a rough
// population (thousands) and rough Dutch / French / German speaker shares
// in percent. Brussels and its Flemish fringe are the uncertain part.
export default {
  id: 'belgium',
  name: 'Belgium',
  subtitle: 'languages, rough estimates',
  brief: 'Dutch speakers in the north, French speakers in the south, a German-speaking east, and a mostly French-speaking Brussels inside Flanders.',
  source: 'Rough estimates by arrondissement: there has been no language census since 1947.',
  history: 'Belgium fixed its language border in 1963 and has since handed power to its language communities. Here a line mostly works, apart from Brussels.',
  maxTerritories: 3,
  groups: [
    { key: 'nl', name: 'Dutch', color: '#2a9d8f' },
    { key: 'fr', name: 'French', color: '#e76f51' },
    { key: 'de', name: 'German', color: '#7b6cc4' },
  ],
  bbox: [2.5, 49.45, 6.45, 51.55],
  cellKm: 11,
  sigmaKm: 5,
  floor: { total: 60 },
  naturalEarth: [{ name: 'Belgium' }],

  // [name, lon, lat, population (k), Dutch %, French %, German %]
  anchors: [
    ['Antwerp', 4.40, 51.22, 1050, 97, 3, 0], ['Mechelen', 4.48, 51.03, 350, 97, 3, 0],
    ['Turnhout', 4.94, 51.32, 470, 99, 1, 0], ['Hasselt', 5.33, 50.93, 430, 98, 2, 0],
    ['Maaseik', 5.70, 51.10, 245, 99, 1, 0], ['Tongeren', 5.47, 50.78, 205, 95, 5, 0],
    ['Leuven', 4.70, 50.88, 510, 94, 6, 0], ['Vilvoorde', 4.43, 50.93, 350, 80, 20, 0],
    ['Halle', 4.23, 50.73, 300, 78, 22, 0], ['Brussels', 4.36, 50.85, 1210, 12, 88, 0],
    ['Ghent', 3.72, 51.05, 560, 99, 1, 0], ['Aalst', 4.04, 50.94, 290, 99, 1, 0],
    ['Oudenaarde', 3.60, 50.85, 125, 97, 3, 0], ['Eeklo', 3.56, 51.19, 85, 99, 1, 0],
    ['Dendermonde', 4.10, 51.03, 200, 99, 1, 0], ['Sint-Niklaas', 4.14, 51.17, 250, 99, 1, 0],
    ['Bruges', 3.22, 51.21, 280, 99, 1, 0], ['Ostend', 2.92, 51.22, 160, 98, 2, 0],
    ['Veurne', 2.66, 51.07, 62, 98, 2, 0], ['Diksmuide', 2.86, 51.03, 52, 99, 1, 0],
    ['Ypres', 2.88, 50.85, 106, 97, 3, 0], ['Kortrijk', 3.26, 50.83, 290, 96, 4, 0],
    ['Roeselare', 3.12, 50.95, 150, 99, 1, 0], ['Tielt', 3.33, 51.00, 92, 99, 1, 0],
    ['Mouscron', 3.21, 50.74, 77, 8, 92, 0], ['Comines', 3.00, 50.77, 18, 10, 90, 0],
    ['Tournai', 3.39, 50.61, 150, 1, 99, 0], ['Ath', 3.78, 50.63, 87, 2, 98, 0],
    ['Soignies', 4.07, 50.58, 190, 4, 96, 0], ['Mons', 3.95, 50.45, 250, 1, 99, 0],
    ['Charleroi', 4.44, 50.41, 430, 1, 99, 0], ['Thuin', 4.29, 50.34, 150, 1, 99, 0],
    ['Nivelles', 4.50, 50.67, 405, 5, 95, 0], ['Namur', 4.87, 50.47, 315, 1, 99, 0],
    ['Dinant', 4.91, 50.26, 110, 1, 99, 0], ['Philippeville', 4.54, 50.20, 67, 1, 99, 0],
    ['Huy', 5.24, 50.52, 115, 1, 99, 0], ['Waremme', 5.26, 50.70, 80, 5, 95, 0],
    ['Liège', 5.57, 50.63, 625, 2, 97, 1], ['Verviers', 5.86, 50.59, 210, 1, 95, 4],
    ['Voeren', 5.80, 50.75, 4, 70, 30, 0], ['Eupen', 6.03, 50.63, 45, 1, 9, 90],
    ['Sankt Vith', 6.13, 50.28, 33, 0, 5, 95], ['Arlon', 5.82, 49.68, 62, 1, 97, 2],
    ['Bastogne', 5.72, 50.00, 48, 1, 99, 0], ['Marche', 5.34, 50.23, 57, 1, 99, 0],
    ['Neufchâteau', 5.43, 49.84, 64, 1, 99, 0], ['Virton', 5.53, 49.57, 54, 1, 99, 0],
  ],

  places: ['Brussels', 'Antwerp', 'Ghent', 'Bruges', 'Leuven', 'Hasselt', 'Liège', 'Namur', 'Charleroi', 'Mons', 'Eupen', 'Arlon'],
};
