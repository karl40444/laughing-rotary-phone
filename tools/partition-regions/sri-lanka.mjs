// Sri Lanka, 2012. Each anchor is a district (the mixed eastern districts
// and Puttalam split into their Tamil, Muslim and Sinhalese parts) with its
// approximate 2012 census population (thousands) and Sinhalese / Tamil /
// Muslim shares in percent. Tamils combines Sri Lankan Tamils and the
// hill-country Tamils of Indian origin; Muslims combines Moors and Malays.
// District totals were checked against the census where a search found
// them (Colombo, Batticaloa, Trincomalee, Mullaitivu, Vavuniya); the splits
// within districts are estimates.
export default {
  id: 'sri-lanka',
  name: 'Sri Lanka',
  subtitle: '2012 census',
  brief: 'From 1983 to 2009 the Tamil Tigers fought for a Tamil state in the north and east. The north is Tamil, but the east is a three-way mix of Tamils, Muslims and Sinhalese.',
  note: 'Approximate 2012 census figures by district, with the eastern districts split into their Tamil, Muslim and Sinhalese areas by estimate. Tamils here include both Sri Lankan Tamils and the hill-country Tamils of Indian origin.',
  maxTerritories: 2,
  groups: [
    { key: 's', name: 'Sinhalese', color: '#e76f51' },
    { key: 't', name: 'Tamils', color: '#2a9d8f' },
    { key: 'm', name: 'Muslims', color: '#7b6cc4' },
  ],
  bbox: [79.5, 5.9, 82.0, 9.9],
  cellKm: 15,
  sigmaKm: 13,
  floor: { total: 60 },
  naturalEarth: [{ name: 'Sri Lanka' }],
  // The Elephant Pass causeway joins the Jaffna peninsula to the mainland.
  links: [[[80.41, 9.45], [80.35, 9.68]]],

  // [name, lon, lat, population (k), Sinhalese %, Tamil %, Muslim %]
  anchors: [
    ['Colombo', 79.90, 6.90, 2324, 77, 11, 11], ['Gampaha', 80.00, 7.10, 2304, 91, 4, 4],
    ['Kalutara', 80.10, 6.60, 1222, 87, 4, 9], ['Kandy', 80.63, 7.29, 1375, 74, 11, 14],
    ['Matale', 80.62, 7.60, 485, 81, 10, 9], ['Nuwara Eliya', 80.77, 6.97, 712, 40, 58, 2],
    ['Galle', 80.22, 6.10, 1063, 94, 2, 3], ['Matara', 80.55, 6.00, 815, 94, 2, 3],
    ['Hambantota', 81.10, 6.20, 597, 97, 0.3, 1], ['Jaffna', 80.02, 9.67, 584, 0.6, 99, 0.4],
    ['Kilinochchi', 80.40, 9.40, 113, 0.8, 98, 0.6], ['Mannar', 79.90, 8.98, 60, 1, 85, 13],
    ['Mannar mainland', 80.10, 8.85, 40, 5, 75, 20], ['Vavuniya', 80.50, 8.75, 171, 10, 83, 7],
    ['Mullaitivu', 80.60, 9.20, 92, 10, 88, 2], ['Kurunegala', 80.36, 7.60, 1618, 91, 1, 7],
    ['Puttalam', 79.83, 8.03, 150, 30, 10, 60], ['Chilaw', 79.90, 7.60, 610, 84, 6, 10],
    ['Anuradhapura', 80.40, 8.35, 860, 91, 0.6, 8], ['Polonnaruwa', 81.00, 7.94, 406, 91, 2, 7],
    ['Badulla', 81.05, 7.00, 815, 73, 21, 5], ['Moneragala', 81.35, 6.87, 451, 95, 2, 2],
    ['Ratnapura', 80.40, 6.68, 1088, 87, 11, 2], ['Kegalle', 80.35, 7.25, 837, 86, 8, 6],
    ['Trincomalee', 81.23, 8.57, 100, 18, 60, 22], ['Kinniya', 81.25, 8.40, 130, 3, 22, 75],
    ['Kantale', 81.00, 8.35, 150, 60, 22, 18], ['Batticaloa', 81.70, 7.72, 90, 1, 70, 28],
    ['Kattankudy', 81.73, 7.68, 45, 0, 0, 100], ['Eravur', 81.61, 7.77, 40, 0, 20, 80],
    ['Batticaloa rural', 81.55, 7.60, 350, 1, 90, 8], ['Kalmunai', 81.83, 7.30, 420, 5, 27, 68],
    ['Ampara', 81.55, 7.25, 230, 97, 1, 2],
  ],

  places: ['Colombo', 'Jaffna', 'Kandy', 'Trincomalee', 'Batticaloa', 'Galle', 'Anuradhapura', 'Vavuniya', 'Nuwara Eliya', 'Kalmunai', 'Mannar', 'Hambantota'],
};
