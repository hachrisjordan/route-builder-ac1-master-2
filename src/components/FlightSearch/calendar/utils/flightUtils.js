import { getSourceByCodename } from '../data/sources';
import airlines from '../data/airlines_full';
import { airportGroups, airportGroupDescriptions } from '../data/airportGroups';
import { convertCurrency, formatCurrencyAmount } from './currencyUtils';

// Sample raw response data for fallback
export const sampleRawData = [
  {
    "originAirport": "LHR",
    "destinationAirport": "EWR",
    "date": "2025-03-28",
    "distance": 3459,
    "ID": "sample1",
    "source": "aeroplan",
    "YAvailable": true,
    "WAvailable": false,
    "JAvailable": true,
    "FAvailable": false,
    "YDirect": true,
    "WDirect": false,
    "JDirect": true,
    "FDirect": false,
    "YAirlines": "AC, LH, QK, UA",
    "WAirlines": "",
    "JAirlines": "UA",
    "FAirlines": "",
    "YDirectAirlines": "UA",
    "WDirectAirlines": "",
    "JDirectAirlines": "UA",
    "FDirectAirlines": "",
    "YMileageCost": "40000",
    "WMileageCost": "0",
    "JMileageCost": "80000",
    "FMileageCost": "0",
    "YTotalTaxes": 34639,
    "WTotalTaxes": 0,
    "JTotalTaxes": 55000,
    "FTotalTaxes": 0,
    "YDirectMileageCost": 40000,
    "WDirectMileageCost": 0,
    "JDirectMileageCost": 80000,
    "FDirectMileageCost": 0,
    "YDirectTotalTaxes": 35470,
    "WDirectTotalTaxes": 0,
    "JDirectTotalTaxes": 55000,
    "FDirectTotalTaxes": 0,
    "TaxesCurrency": "CAD"
  }
];

// Get enriched flight data with raw API information
export const getEnrichedFlightData = (routeCode, classCode, dateString, classData, flightData, currencyFilter) => {
  // Handle missing or empty classData
  if (!classData) {
    return [];
  }
  
  // Extract flights from the class data
  // If there are no flights but the class is available, create synthetic flights from the sources
  let flights = [];
  if (classData.flights && classData.flights.length > 0) {
    flights = [...classData.flights];
  } else if (classData.available && classData.sources) {
    // Create synthetic flights from sources if no flights are provided but class is available
    const sources = classData.sources.split(',').filter(s => s.trim());
    
    flights = sources.map(source => ({
      source: source.trim(),
      direct: classData.direct || false,
      id: `synthetic-${source.trim()}-${Date.now()}`
    }));
  }
  
  // If still no flights, return empty array
  if (flights.length === 0) {
    return [];
  }

  // Check for raw data from the flightData prop
  const rawDataArray = flightData?.rawData || sampleRawData;
  
  // Process each flight
  return flights.map(flight => {
    // If rawData is already present, just return the flight
    if (flight.rawData) return flight;
    
    try {
      // Find matching raw flight data
      const [origin, destination] = routeCode.split('-');
      
      const raw = rawDataArray.find(rawFlight => {
        return (
          // Match by ID if available
          (rawFlight.ID === flight.id || !flight.id) &&
          // Match by date
          rawFlight.date === dateString &&
          // Match by route
          rawFlight.originAirport === origin && 
          rawFlight.destinationAirport === destination &&
          // Match by class availability
          rawFlight[`${classCode}Available`] === true &&
          // Match by source if available
          (flight.source ? rawFlight.source === flight.source : true)
        );
      });
      
      if (raw) {
        return {
          ...flight,
          rawData: raw
        };
      }
      
      // Create sample raw data if none found
      const sampleRaw = {
        ...sampleRawData[0],
        originAirport: origin,
        destinationAirport: destination,
        date: dateString,
        ID: flight.id || `sample-${Date.now()}`,
        source: flight.source || "sample",
        [`${classCode}Available`]: true,
        [`${classCode}Direct`]: flight.direct || classData.direct || false,
        [`${classCode}Airlines`]: "Sample Airlines",
        [`${classCode}DirectAirlines`]: flight.direct || classData.direct ? "Sample Airlines" : "",
        [`${classCode}MileageCost`]: "50000", 
        [`${classCode}DirectMileageCost`]: flight.direct || classData.direct ? "50000" : "0",
        [`${classCode}TotalTaxes`]: 50,
        [`${classCode}DirectTotalTaxes`]: flight.direct || classData.direct ? 50 : 0,
        TaxesCurrency: "USD"
      };
      
      return {
        ...flight,
        rawData: sampleRaw
      };
    } catch (error) {
      console.warn('Error finding raw flight data:', error);
      return flight;
    }
  });
};

// Helper function to check if a segment is valid for the current route
export const isValidSegmentForRoute = (segment, currentRoute) => {
  const [origin, destination] = typeof segment === 'string' 
    ? segment.split('-') 
    : segment.route.split('-');
  
  // Check if this segment follows the sequence in currentRoute
  for (let i = 0; i < currentRoute.length - 1; i++) {
    const fromGroup = currentRoute[i];
    const toGroup = currentRoute[i + 1];
    
    // Get airports for each group
    const fromAirports = airportGroups[fromGroup]?.split('/') || [fromGroup];
    const toAirports = airportGroups[toGroup]?.split('/') || [toGroup];
    
    // If this segment is part of the current route section
    if (fromAirports.includes(origin) && toAirports.includes(destination)) {
      return true; // This is a valid segment
    }
  }
  
  return false; // Segment doesn't match any part of the route sequence
};

// Helper function to get segment index in the route order
export const getSegmentIndex = (origin, dest, currentRoute) => {
  for (let i = 0; i < currentRoute.length - 1; i++) {
    const fromGroup = currentRoute[i];
    const toGroup = currentRoute[i + 1];
    
    // Helper function to check if an airport is part of a group/segment
    const isAirportInGroup = (airport, group) => {
      // Direct match
      if (airport === group) return true;
      
      // Check if it's part of a slashed segment
      if (group.includes('/') && group.split('/').includes(airport)) return true;
      
      // Check if it's part of an airport group
      if (airportGroups[group]?.split('/').includes(airport)) return true;
      
      return false;
    };
    
    // If this segment is part of this route section
    if (isAirportInGroup(origin, fromGroup) && isAirportInGroup(dest, toGroup)) {
      return i;
    }
  }
  return -1; // Segment not found in route
};

// Compare and sort segments based on route order
export const sortSegments = (originA, destA, originB, destB, currentRoute, segmentOrder = []) => {
  // First check custom order if available
  if (segmentOrder && segmentOrder.length > 0) {
    const routeA = `${originA}-${destA}`;
    const routeB = `${originB}-${destB}`;
    const indexA = segmentOrder.indexOf(routeA);
    const indexB = segmentOrder.indexOf(routeB);
    
    // If both routes are in the custom order, use that
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // If only one route is in custom order, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
  }
  
  // Get segment indices in the route
  const indexA = getSegmentIndex(originA, destA, currentRoute);
  const indexB = getSegmentIndex(originB, destB, currentRoute);
  
  // If both segments are part of the route, sort by their position
  if (indexA !== -1 && indexB !== -1) {
    // If they're in different positions, sort by position
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    // If they're in the same position, sort alphabetically by origin first, then destination
    if (originA !== originB) {
      return originA.localeCompare(originB);
    }
    return destA.localeCompare(destB);
  }
  
  // If only one segment is part of the route, prioritize it
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  
  // If neither segment is part of the route, check if origins match route segments
  const originAMatchIndex = currentRoute.findIndex(segment => isAirportInGroup(originA, segment));
  const originBMatchIndex = currentRoute.findIndex(segment => isAirportInGroup(originB, segment));
  
  if (originAMatchIndex !== -1 || originBMatchIndex !== -1) {
    if (originAMatchIndex === -1) return 1;
    if (originBMatchIndex === -1) return -1;
    // If they match at different positions, sort by position
    if (originAMatchIndex !== originBMatchIndex) {
      return originAMatchIndex - originBMatchIndex;
    }
    // If they match at the same position, sort alphabetically
    if (originA !== originB) {
      return originA.localeCompare(originB);
    }
    return destA.localeCompare(destB);
  }
  
  // If no other criteria matches, sort alphabetically by origin first, then destination
  if (originA !== originB) {
    return originA.localeCompare(originB);
  }
  return destA.localeCompare(destB);
};

// Helper function to check if an airport is part of a group/segment
const isAirportInGroup = (airport, group) => {
  // Direct match
  if (airport === group) return true;
  
  // Check if it's part of a slashed segment
  if (group.includes('/') && group.split('/').includes(airport)) return true;
  
  // Check if it's part of an airport group
  if (airportGroups[group]?.split('/').includes(airport)) return true;
  
  return false;
};

// Get the full airline name from source codename
export const getAirlineName = (codename) => {
  const source = getSourceByCodename(codename);
  return source ? `${source.airline} ${source.ffname}` : codename;
};

/**
 * Format taxes with currency conversion if needed
 * @param {number} amount - The tax amount
 * @param {string} originalCurrency - The original currency code
 * @param {Object} currencyFilter - The currency filter settings
 * @param {boolean} useCurrencyCode - Whether to use currency code instead of symbol
 * @returns {string} Formatted tax amount with currency
 */
export const formatTaxes = async (amount, originalCurrency, currencyFilter, useCurrencyCode = false) => {
  try {
    if (!amount || amount <= 0) return '';
    
    // If currency filter is enabled and a currency is selected
    if (currencyFilter?.enabled && currencyFilter?.selectedCurrency) {
      // Convert the amount to the selected currency
      const convertedAmount = await convertCurrency(
        amount,
        originalCurrency,
        currencyFilter.selectedCurrency
      );
      
      // Format the converted amount with the selected currency
      return formatCurrencyAmount(convertedAmount, currencyFilter.selectedCurrency, useCurrencyCode);
    }
    
    // If no currency conversion, format with original currency
    return formatCurrencyAmount(amount, originalCurrency, useCurrencyCode);
  } catch (error) {
    console.error('Error formatting taxes:', error);
    return `${originalCurrency} ${amount.toFixed(2)}`;
  }
}; 