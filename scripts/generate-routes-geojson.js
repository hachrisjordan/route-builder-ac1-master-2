const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Paths
const ROUTES_CSV = path.join(__dirname, '../src/data/airline_routes_20250506_114129.csv');
const AIRPORTS_JS = path.join(__dirname, '../src/data/airports.js');
const OUTPUT_GEOJSON = path.join(__dirname, '../src/data/routes.geojson');

// 1. Parse CSV
const csvContent = fs.readFileSync(ROUTES_CSV, 'utf8');
const records = csv.parse(csvContent, { columns: true });

// 2. Load airports.js and build a code->airport map
const airportsModule = fs.readFileSync(AIRPORTS_JS, 'utf8');
const airportsMatch = airportsModule.match(/const airports = (\[.*\]);/s);
if (!airportsMatch) throw new Error('Could not find airports array in airports.js');
const airports = JSON.parse(airportsMatch[1]);
const airportMap = {};
for (const ap of airports) {
  if (ap.IATA) airportMap[ap.IATA.trim()] = ap;
}

// 3. Build GeoJSON FeatureCollection of LineStrings
const features = [];
for (const row of records) {
  const origin = row.origin?.trim();
  const destination = row.destination?.trim();
  const airline = row.airlines?.trim();
  const distance = row.distance_miles ? Number(row.distance_miles) : null;
  const ap1 = airportMap[origin];
  const ap2 = airportMap[destination];
  if (ap1 && ap2 && ap1.Latitude && ap1.Longitude && ap2.Latitude && ap2.Longitude) {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [ap1.Longitude, ap1.Latitude],
          [ap2.Longitude, ap2.Latitude]
        ]
      },
      properties: {
        origin,
        destination,
        airline,
        distance_miles: distance
      }
    });
  }
}
const geojson = {
  type: 'FeatureCollection',
  features,
};

// 4. Write to file
fs.writeFileSync(OUTPUT_GEOJSON, JSON.stringify(geojson, null, 2));
console.log(`Wrote ${features.length} routes to ${OUTPUT_GEOJSON}`); 