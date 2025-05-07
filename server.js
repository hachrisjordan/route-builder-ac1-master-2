require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Google Cloud Storage client without credentials for public bucket
const storage = new Storage();

const BUCKET_NAME = 'exchange-rates-fabled-emblem-451602';

// API endpoint
app.post('/api/seat-config', async (req, res) => {
  try {
    const { airlineCode, tailNumber, variant } = req.body;

    // Validate input
    if (!airlineCode || !tailNumber || !variant) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['airlineCode', 'tailNumber', 'variant']
      });
    }

    // Validate airline code format (2 letters)
    if (!/^[A-Z]{2}$/.test(airlineCode)) {
      return res.status(400).json({
        error: 'Invalid airline code',
        message: 'Airline code must be 2 uppercase letters'
      });
    }

    const FILE_NAME = `seat_${airlineCode}.json`;

    // Get the bucket
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(FILE_NAME);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({
        error: 'Airline configuration not found',
        message: `No configuration found for airline ${airlineCode}`
      });
    }

    // Download the current file content
    const [fileContent] = await file.download();
    const data = JSON.parse(fileContent.toString());

    // Check if tail number already exists
    if (data.tail_number_distribution[tailNumber]) {
      return res.status(409).json({ 
        error: 'Tail number already exists',
        existingVariant: data.tail_number_distribution[tailNumber]
      });
    }

    // Check if variant exists in configurations
    const variantExists = Object.values(data.configurations_by_type).some(
      (configs) => configs.some((config) => config.variant === variant)
    );

    if (!variantExists) {
      return res.status(400).json({ 
        error: 'Invalid variant',
        message: 'The specified variant does not exist in the configurations'
      });
    }

    // Add the new tail number
    data.tail_number_distribution[tailNumber] = variant;

    // Upload the updated content
    await file.save(JSON.stringify(data, null, 2), {
      contentType: 'application/json',
      metadata: {
        cacheControl: 'no-cache',
      },
    });

    return res.status(200).json({
      message: 'Tail number added successfully',
      airlineCode,
      tailNumber,
      variant
    });

  } catch (error) {
    console.error('Error updating seat configuration:', error);
    return res.status(500).json({ 
      error: 'Failed to update seat configuration',
      details: error.message
    });
  }
});

// Serve static files in production
if (isProduction) {
  app.use(express.static(path.join(__dirname, 'build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port} in ${isProduction ? 'production' : 'development'} mode`);
});

// Export the Express API
module.exports = app;