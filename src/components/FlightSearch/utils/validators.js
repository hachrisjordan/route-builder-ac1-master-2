import dayjs from 'dayjs';
import 'dayjs/plugin/isSameOrAfter';
import 'dayjs/plugin/isSameOrBefore';

export const validateRoute = (route) => {
  if (!Array.isArray(route) || route.length < 2) {
    return false;
  }

  // Check for duplicate airports in sequence
  for (let i = 0; i < route.length - 1; i++) {
    if (route[i] === route[i + 1]) {
      return false;
    }
  }

  // Check for valid airport codes
  return route.every(airport => 
    typeof airport === 'string' && 
    airport.length === 3 && 
    airport === airport.toUpperCase()
  );
};

export const validateApiKey = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Add any specific API key format validation here
  return apiKey.length >= 32;
};

export const validateDateRange = (date) => {
  if (!date) return false;
  
  const today = dayjs().startOf('day');
  const maxDate = today.add(330, 'days');
  
  return date.isSameOrAfter(today) && date.isSameOrBefore(maxDate);
};

export const validateFlightData = (flightData) => {
  if (!flightData || typeof flightData !== 'object') {
    return false;
  }

  const requiredFields = [
    'flightNumber',
    'departureTime',
    'arrivalTime',
    'from',
    'to'
  ];

  return requiredFields.every(field => field in flightData);
}; 