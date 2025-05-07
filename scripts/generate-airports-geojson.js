const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Paths
const ROUTES_CSV = path.join(__dirname, '../src/data/airline_routes_20250506_114129.csv');
const AIRPORTS_JS = path.join(__dirname, '../src/data/airports.js');
const OUTPUT_GEOJSON = path.join(__dirname, '../src/data/airports-on-routes.geojson');

// 1. Parse CSV to get unique airport codes and build route/destination maps
const csvContent = fs.readFileSync(ROUTES_CSV, 'utf8');
const records = csv.parse(csvContent, { columns: true });
const airportCodes = new Set();
const airportDestMap = {}; // { IATA: Set of destinations }
const airportAirlineDestMap = {}; // { IATA: { airline: Set of destinations } }
for (const row of records) {
  const origin = row.origin?.trim();
  const destination = row.destination?.trim();
  const airline = row.airlines?.trim();
  if (origin) airportCodes.add(origin);
  if (destination) airportCodes.add(destination);
  // For origin: add destination
  if (origin && destination) {
    if (!airportDestMap[origin]) airportDestMap[origin] = new Set();
    airportDestMap[origin].add(destination);
    if (!airportAirlineDestMap[origin]) airportAirlineDestMap[origin] = {};
    if (!airportAirlineDestMap[origin][airline]) airportAirlineDestMap[origin][airline] = new Set();
    airportAirlineDestMap[origin][airline].add(destination);
  }
}

// 2. Load airports.js and build a code->airport map
const airportsModule = fs.readFileSync(AIRPORTS_JS, 'utf8');
const airportsMatch = airportsModule.match(/const airports = (\[.*\]);/s);
if (!airportsMatch) throw new Error('Could not find airports array in airports.js');
const airports = JSON.parse(airportsMatch[1]);
const airportMap = {};
for (const ap of airports) {
  if (ap.IATA) airportMap[ap.IATA.trim()] = ap;
}

// 3. Build GeoJSON FeatureCollection
const features = [];
for (const code of airportCodes) {
  const ap = airportMap[code];
  if (ap && ap.Latitude && ap.Longitude) {
    // Calculate size
    const destCount = airportDestMap[code] ? airportDestMap[code].size : 0;
    let size = 'S';
    if (destCount > 100) size = 'XL';
    else if (destCount > 30) size = 'L';
    else if (destCount > 7) size = 'M';
    // Calculate star
    let isStar = false;
    let starAirlines = [];
    if (airportAirlineDestMap[code]) {
      for (const [airline, destSet] of Object.entries(airportAirlineDestMap[code])) {
        if (destSet.size > 20) {
          isStar = true;
          starAirlines.push(airline);
        }
      }
    }
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [ap.Longitude, ap.Latitude],
      },
      properties: {
        iata: ap.IATA,
        name: ap.Name,
        country: ap.Country,
        zone: ap.Zone,
        size,
        isStar,
        starAirlines,
        destCount,
      },
    });
  }
}
const geojson = {
  type: 'FeatureCollection',
  features,
};

// 4. Write to file
fs.writeFileSync(OUTPUT_GEOJSON, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${features.length} airports to ${OUTPUT_GEOJSON}`); 