const fs = require('fs');
const Arc = require('arc');

const INPUT = 'public/routes.geojson';
const OUTPUT = 'public/routes-arcs.geojson';
const POINTS = 100;

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Input file not found: ${INPUT}`);
    process.exit(1);
  }
  const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  if (!input.features || !Array.isArray(input.features)) {
    console.error('Invalid GeoJSON: no features array');
    process.exit(1);
  }
  const arcRoutes = input.features.map((feature, i) => {
    if (!feature.geometry || !feature.geometry.coordinates || feature.geometry.coordinates.length !== 2) {
      console.warn(`Skipping feature ${i}: invalid geometry`);
      return feature;
    }
    const [from, to] = feature.geometry.coordinates;
    const arcGenerator = new Arc.GreatCircle(
      { x: from[0], y: from[1] },
      { x: to[0], y: to[1] }
    );
    const arcLine = arcGenerator.Arc(POINTS, { offset: 10 });
    if (!arcLine.geometries.length) {
      console.warn(`Skipping feature ${i}: arc generation failed`);
      return feature;
    }
    return {
      ...feature,
      geometry: {
        type: 'LineString',
        coordinates: arcLine.geometries[0].coords
      }
    };
  });
  const output = {
    ...input,
    features: arcRoutes
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(output, null, 2));
  console.log(`Great circle arc routes written to ${OUTPUT}`);
  console.log(`Converted ${arcRoutes.length} routes.`);
}

main(); 