const fs = require('fs');
const key = process.env.GCP_SA_KEY;
if (!key) {
  throw new Error('GCP_SA_KEY environment variable is not set');
}
fs.writeFileSync('gcp-key.json', key);
console.log('gcp-key.json created'); 