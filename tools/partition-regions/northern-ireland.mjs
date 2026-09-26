// Northern Ireland, 2011. Each anchor is one of the 26 former council
// districts with its approximate population (thousands) and the shares
// brought up Catholic or Protestant (including other Christian) in percent,
// from the census "community background" question, rounded from memory.
// Other religions and none are left out.
export default {
  id: 'northern-ireland',
  name: 'Northern Ireland',
  subtitle: '2011 census',
  brief: 'Community background by district. Repartition was floated in the 1970s as a way out of the Troubles.',
  note: 'Approximate 2011 census "community background" figures for the 26 former districts. Repartition was dropped, partly because no line could separate communities this mixed.',
  maxTerritories: 2,
  groups: [
    { key: 'c', name: 'Catholic', color: '#2a9d8f' },
    { key: 'p', name: 'Protestant', color: '#e76f51' },
  ],
  bbox: [-8.3, 53.9, -5.3, 55.4],
  cellKm: 8,
  sigmaKm: 7,
  floor: { total: 60 },
  naturalEarth: [{ name: 'United Kingdom', containing: [-6.6, 54.6] }],
  // Natural Earth does not cut out lakes: Lough Neagh, traced by hand.
  holes: [[[-6.56, 54.73], [-6.36, 54.73], [-6.26, 54.66], [-6.30, 54.52], [-6.42, 54.47], [-6.62, 54.52], [-6.60, 54.64]]],

  // [name, lon, lat, population (k), Catholic %, Protestant %]
  anchors: [
    ['Belfast', -5.93, 54.60, 281, 49, 48], ['Derry', -7.31, 55.00, 108, 75, 23],
    ['Strabane', -7.46, 54.83, 40, 65, 34], ['Newry', -6.34, 54.18, 99, 77, 21],
    ['Omagh', -7.30, 54.60, 51, 68, 30], ['Enniskillen', -7.64, 54.34, 62, 59, 39],
    ['Dungannon', -6.77, 54.50, 57, 62, 36], ['Magherafelt', -6.61, 54.76, 45, 66, 32],
    ['Cookstown', -6.75, 54.64, 37, 60, 38], ['Armagh', -6.65, 54.35, 59, 48, 50],
    ['Craigavon', -6.39, 54.45, 93, 45, 52], ['Banbridge', -6.27, 54.35, 48, 32, 65],
    ['Downpatrick', -5.72, 54.33, 70, 64, 33], ['Lisburn', -6.04, 54.51, 120, 32, 64],
    ['Castlereagh', -5.88, 54.57, 67, 22, 73], ['Bangor', -5.67, 54.66, 79, 15, 79],
    ['Newtownards', -5.60, 54.55, 78, 14, 81], ['Newtownabbey', -5.91, 54.67, 85, 24, 71],
    ['Carrickfergus', -5.81, 54.72, 39, 12, 83], ['Larne', -5.82, 54.85, 32, 25, 72],
    ['Antrim', -6.21, 54.72, 53, 40, 56], ['Ballymena', -6.28, 54.86, 64, 24, 73],
    ['Ballymoney', -6.51, 55.07, 31, 32, 66], ['Ballycastle', -6.24, 55.20, 17, 60, 38],
    ['Coleraine', -6.67, 55.13, 59, 26, 71], ['Limavady', -6.94, 55.05, 34, 55, 43],
  ],

  places: ['Belfast', 'Derry', 'Newry', 'Omagh', 'Enniskillen', 'Armagh', 'Ballymena', 'Coleraine', 'Dungannon', 'Bangor'],
};
