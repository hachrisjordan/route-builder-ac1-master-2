const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');

const app = express();
app.use(cors());
app.use(express.json());

const PROJECT_ID = 'fabled-emblem-451602-f6';
const ZONE = 'us-central1-c';
const GOOGLE_API_URL = `https://compute.googleapis.com/compute/v1/projects/${PROJECT_ID}/zones/${ZONE}/instances`;

const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

app.get('/api/gce', async (req, res) => {
    try {
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        const response = await fetch(GOOGLE_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`GCE API Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching GCE data:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add new endpoint for seats.aero API proxy
app.get('/api/seats/:segmentId', async (req, res) => {
    const { segmentId } = req.params;
    const apiKey = req.headers['partner-authorization'];

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    try {
        const response = await fetch(`https://seats.aero/partnerapi/trips/${segmentId}`, {
            method: 'GET',
            headers: {
                'accept': 'application/json',
                'Partner-Authorization': apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Seats.aero API Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching seats data:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;

// Add more detailed startup logging
console.log(`Starting server initialization...`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server successfully bound to port ${PORT}`);
    console.log(`Server accepting connections at http://0.0.0.0:${PORT}`);
}).on('error', (err) => {
    console.error('Failed to start server:', err);
    console.error('Error details:', {
        code: err.code,
        syscall: err.syscall,
        port: err.port
    });
    process.exit(1);
});

// Add error handler for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    server.close(() => {
        process.exit(1);
    });
});