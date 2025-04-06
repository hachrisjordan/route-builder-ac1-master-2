import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const processFlightData = async (from, to, date, apiKey) => {
  try {
    const response = await fetch('https://backend-284998006367.us-central1.run.app/api/flight-details', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from,
        to,
        date
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch flight details');
    }

    const data = await response.json();
    return formatFlightData(data, from, to);
  } catch (error) {
    console.error('Error fetching flight details:', error);
    return [];
  }
};

export const formatFlightData = (data, from, to) => {
  if (!data || !Array.isArray(data)) return [];

  return data.map((flight, index) => ({
    key: `${from}-${to}-${index}`,
    from,
    to,
    flightNumber: flight.flightNumber,
    departureTime: formatTime(flight.departureTime),
    arrivalTime: formatTime(flight.arrivalTime),
    duration: formatDuration(flight.duration),
    aircraft: flight.aircraft,
    price: formatPrice(flight.price),
    seats: formatSeats(flight.availableSeats),
    airline: flight.airline
  }));
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  return dayjs(timeString).format('HH:mm');
};

export const formatDuration = (minutes) => {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const formatPrice = (price) => {
  if (!price) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

export const formatSeats = (seats) => {
  if (!seats) return 'N/A';
  return seats.toString();
}; 