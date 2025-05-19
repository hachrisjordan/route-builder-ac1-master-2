/**
 * Centralized configuration for all cloud storage URLs and API endpoints
 * Change these values when deploying to a different bucket or backend
 */

// Google Cloud Storage bucket base URL
export const CLOUD_STORAGE_BASE_URL = 'https://storage.googleapis.com/routebuilder_storage';

// Backend API base URL
export const API_BASE_URL = 'https://rbbackend-fzkmdxllwa-uc.a.run.app';

// Access codes configuration
export const ACCESS_CODES_URL = `${CLOUD_STORAGE_BASE_URL}/access-codes.json`;

// Exchange rates configuration
export const EXCHANGE_RATES_URL = `${CLOUD_STORAGE_BASE_URL}/exchange-rates/latest.json`;

// Currency rates configuration
export const RATE_JSON_URL = `${CLOUD_STORAGE_BASE_URL}/rate.json`;

// Seat configuration
export const getSeatConfigUrl = (airline) => `${CLOUD_STORAGE_BASE_URL}/seat_${airline}.json`;

// API endpoints
export const API_ENDPOINTS = {
  FLIGHT_DETAILS: `${API_BASE_URL}/api/flight-details`,
  SEATS: (id) => `${API_BASE_URL}/api/seats/${id}`,
  AVAILABILITY: `${API_BASE_URL}/api/availability-v2`,
  FIND_ROUTES: `${API_BASE_URL}/api/find-routes`,
};

// GCE configuration
export const GCE_CONFIG = {
  PROJECT_ID: 'route-builder-460117',
  ZONE: 'us-central1-c',
  get API_URL() {
    return `https://compute.googleapis.com/compute/v1/projects/${this.PROJECT_ID}/zones/${this.ZONE}/instances`;
  }
};

// CORS proxy URL if needed
export const CORS_PROXY_URL = 'https://corsanywhere.herokuapp.com/'; 