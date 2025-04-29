import { useState, useEffect } from 'react';
import { getSourceCodenames } from '../data/sources';
import { airportGroups } from '../data/airportGroups';

// API key storage key
const API_KEY_STORAGE_KEY = 'normalRouteBuilderApiKey';

export default function useNormalFlightSearch() {
  const [flightData, setFlightData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedDateRange, setSelectedDateRange] = useState(null);
  const [selectedFlights, setSelectedFlights] = useState(null);
  const [pricingData, setPricingData] = useState(null);
  const [currentRoute, setCurrentRoute] = useState([]);
  const [cachedApiKey, setCachedApiKey] = useState('');

  // Load cached API key on initial mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setCachedApiKey(storedApiKey);
    }
  }, []);

  // Save API key to localStorage
  const saveApiKey = (apiKey) => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      setCachedApiKey(apiKey);
    }
  };

  const expandAirportGroup = (code) => {
    if (!code) return [];
    
    // If the code contains slashes, it's already expanded
    if (code.includes('/')) {
      return code.split('/');
    }
    
    // If it's a group code, expand it
    if (airportGroups[code]) {
      const airports = new Set();
      const toExpand = [code];
      
      // Recursively expand all groups
      while (toExpand.length > 0) {
        const current = toExpand.pop();
        if (airportGroups[current]) {
          // Split and process each airport/group
          airportGroups[current].split('/').forEach(airport => {
            if (airportGroups[airport]) {
              // If this is another group, add to expansion queue
              toExpand.push(airport);
            } else {
              // If this is an airport, add to results
              airports.add(airport);
            }
          });
        } else {
          // If not a group, add as is
          airports.add(current);
        }
      }
      
      return Array.from(airports).sort();
    }
    
    // If not a group and no slashes, return as single airport
    return [code];
  };

  const generateRoutePermutations = (path) => {
    const routes = new Set();
    const segments = path.split('-');

    // Helper function to expand a segment that might contain slashes
    const expandSegment = (segment) => {
      if (segment.includes('/')) {
        // If segment contains slashes, split and expand each part
        const parts = segment.split('/');
        const expandedParts = parts.map(part => expandAirportGroup(part) || [part]);
        // Flatten and deduplicate
        return [...new Set(expandedParts.flat())];
      }
      // Otherwise just expand normally
      return expandAirportGroup(segment) || [segment];
    };

    // For each segment pair
    for (let i = 0; i < segments.length - 1; i++) {
      const fromSegment = segments[i];
      const toSegment = segments[i + 1];

      // Special handling for first segment (e.g., CVG to USA)
      if (i === 0) {
        const fromAirports = expandSegment(fromSegment);
        const toAirports = expandSegment(toSegment);

        fromAirports.forEach(from => {
          toAirports.forEach(to => {
            if (from !== to) routes.add(`${from}-${to}`);
          });
        });
      }

      // Special handling for last segment (e.g., ASA/DOH to HAN)
      if (i === segments.length - 2) {
        const fromAirports = expandSegment(fromSegment);
        const toAirports = expandSegment(toSegment);

        fromAirports.forEach(from => {
          toAirports.forEach(to => {
            if (from !== to) routes.add(`${from}-${to}`);
          });
        });
      }

      // Handle intermediate connections (e.g., USA to ASA/DOH)
      if (i > 0) {
        const prevSegment = segments[i - 1];
        const currSegment = segments[i];
        const nextSegment = segments[i + 1];

        const prevAirports = expandSegment(prevSegment);
        const currAirports = expandSegment(currSegment);
        const nextAirports = expandSegment(nextSegment);

        // Add routes from previous segment airports to current segment airports
        prevAirports.forEach(prev => {
          currAirports.forEach(curr => {
            if (prev !== curr) routes.add(`${prev}-${curr}`);
          });
        });

        // Add routes from current segment airports to next segment airports
        currAirports.forEach(curr => {
          nextAirports.forEach(next => {
            if (curr !== next) routes.add(`${curr}-${next}`);
          });
        });
      }
    }

    return Array.from(routes).sort();
  };

  const processFlightData = (data, routeSegments = currentRoute) => {
    // Group flights by date and route
    const flightsByDate = {};
    
    // Get all possible valid routes
    const validRoutes = new Set(generateRoutePermutations(routeSegments.join('-')));
    
    console.log('SEARCH DEBUG - Path received:', routeSegments.join('-'));
    console.log('Valid routes to match:', Array.from(validRoutes).sort());
    
    // First, group flights by date, route, and aggregate availability
    const aggregatedData = {};
    
    // Process each flight from the API response
    data.forEach(flight => {
      const date = flight.date;
      const route = `${flight.originAirport}-${flight.destinationAirport}`;
      
      // Only process if this route is in our valid routes set
      if (validRoutes.has(route)) {
        if (!aggregatedData[date]) {
          aggregatedData[date] = {};
        }
        
        if (!aggregatedData[date][route]) {
          aggregatedData[date][route] = {
            YAvailable: false,
            YDirect: false,
            WAvailable: false,
            WDirect: false,
            JAvailable: false,
            JDirect: false,
            FAvailable: false,
            FDirect: false,
            YSources: new Set(),
            WSources: new Set(),
            JSources: new Set(),
            FSources: new Set(),
            YFlights: [],
            WFlights: [],
            JFlights: [],
            FFlights: []
          };
        }
        
        // Update aggregated data based on this flight
        const routeData = aggregatedData[date][route];
        
        // For each cabin class, update availability and direct flags
        // Y class
        if (flight.YAvailable) {
          routeData.YAvailable = true;
          
          // If any flight has direct availability, set direct to true
          if (flight.YDirect) {
            routeData.YDirect = true;
          }
          
          // Add source
          if (flight.source) {
            routeData.YSources.add(flight.source);
          }
          
          // Store full flight data for tooltip
          routeData.YFlights.push({
            source: flight.source,
            direct: flight.YDirect,
            id: flight.ID
          });
        }
        
        // W class
        if (flight.WAvailable) {
          routeData.WAvailable = true;
          
          if (flight.WDirect) {
            routeData.WDirect = true;
          }
          
          if (flight.source) {
            routeData.WSources.add(flight.source);
          }
          
          routeData.WFlights.push({
            source: flight.source,
            direct: flight.WDirect,
            id: flight.ID
          });
        }
        
        // J class
        if (flight.JAvailable) {
          routeData.JAvailable = true;
          
          if (flight.JDirect) {
            routeData.JDirect = true;
          }
          
          if (flight.source) {
            routeData.JSources.add(flight.source);
          }
          
          routeData.JFlights.push({
            source: flight.source,
            direct: flight.JDirect,
            id: flight.ID
          });
        }
        
        // F class
        if (flight.FAvailable) {
          routeData.FAvailable = true;
          
          if (flight.FDirect) {
            routeData.FDirect = true;
          }
          
          if (flight.source) {
            routeData.FSources.add(flight.source);
          }
          
          routeData.FFlights.push({
            source: flight.source,
            direct: flight.FDirect,
            id: flight.ID
          });
        }
      }
    });
    
    // Convert aggregated data to final format
    for (const [date, routes] of Object.entries(aggregatedData)) {
      if (!flightsByDate[date]) {
        flightsByDate[date] = {};
      }
      
      for (const [route, data] of Object.entries(routes)) {
        flightsByDate[date][route] = {
          classes: {
            Y: { 
              available: data.YAvailable, 
              direct: data.YDirect, 
              sources: Array.from(data.YSources).join(','),
              flights: data.YFlights
            },
            W: { 
              available: data.WAvailable, 
              direct: data.WDirect, 
              sources: Array.from(data.WSources).join(','),
              flights: data.WFlights
            },
            J: { 
              available: data.JAvailable, 
              direct: data.JDirect, 
              sources: Array.from(data.JSources).join(','),
              flights: data.JFlights
            },
            F: { 
              available: data.FAvailable, 
              direct: data.FDirect, 
              sources: Array.from(data.FSources).join(','),
              flights: data.FFlights
            }
          }
        };
      }
    }

    // Log the processed data for debugging
    console.log('Processed flight data:', flightsByDate);
    
    return flightsByDate;
  };

  const handleSearch = async (searchParams, setExternalFlightData) => {
    const { path: originalPath, sourcesState, apiKey, dateRange, isUAExpandedSaver } = searchParams;
    let path = originalPath;
    let routeSegmentsForProcessing = [];

    console.log('🔍 Search params received:', {
      path,
      sourcesState,
      dateRange,
      isUAExpandedSaver
    });

    // Reset errors and data
    setErrors({});
    setFlightData(null);
    setSelectedDateRange(null);
    setSelectedFlights([]);
    setPricingData(null);

    // Special handling for UA Expanded Saver direct API calls
    if (isUAExpandedSaver) {
      console.log('Using UA Expanded Saver direct API mode');
      
      // If apiResponseData is provided, use it directly
      if (searchParams.apiResponseData) {
        console.log('Direct API response data available:', searchParams.apiResponseData);
        
        // Process the data from direct API call 
        // This would normally happen in the API response handler
        const processedData = {}; // Process API data to match expected format
        
        const flightDataObj = {
          routes: [path], // Use the provided path
          data: processedData,
          rawData: searchParams.apiResponseData
        };

        setFlightData(flightDataObj);
        if (setExternalFlightData) {
          setExternalFlightData(flightDataObj);
        }
        setSelectedDateRange(dateRange);
        
        return;
      }
      
      // If we get here, it's a UA Expanded Saver request without direct API data
      // Split path into segments but skip validation
      const segments = path.split('-');
      routeSegmentsForProcessing = segments;
      setCurrentRoute(segments);
    } else {
      // Regular path validation for non-UA Expanded Saver requests
    
      // Validate mandatory fields
      if (!path) {
        setErrors({ path: 'Path is required' });
        return;
      }

      // First, check if the path is already expanded (contains / and -), like "EWR/JFK/LGA-HND/NRT"
      if (path.includes('/') && path.includes('-')) {
        console.log('Path is already expanded:', path);
        // Split into segments based on hyphens
        const segments = path.split('-');
        console.log('Expanded route segments:', segments);
        
        if (segments.length < 2) {
          setErrors({ path: 'Invalid path format. Need at least two segments.' });
          return;
        }
        
        // Store the segments for later use (both in state and local var)
        routeSegmentsForProcessing = segments;
        setCurrentRoute(segments);
        
        // For API request, we'll keep using the expanded format
        const originalPath = path;
        
        // Get all available source codenames and filter based on mode
        const allSources = getSourceCodenames();
        
        // If no sources are selected, use all sources
        // Otherwise, if mode is 'include', use only the selected sources
        // If mode is 'exclude', use all sources except the selected ones
        const sourcesToUse = !sourcesState.sources.length ? allSources :
          sourcesState.mode === 'include' 
            ? sourcesState.sources 
            : allSources.filter(source => !sourcesState.sources.includes(source));

        setIsLoading(true);

        try {
          // Prepare the request body
          const requestBody = {
            routeId: path,
            startDate: dateRange ? dateRange[0] : null,
            endDate: dateRange ? dateRange[1] : null,
            sources: sourcesToUse.join(',')
          };

          console.log('API Request Body:', requestBody);

          const response = await fetch('https://backend-284998006367.us-central1.run.app/api/availability-v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Partner-Authorization': apiKey
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            throw new Error('Search failed');
          }

          const data = await response.json();
          console.log('API response:', data);
          
          // Process the flight data
          const processedData = processFlightData(data, routeSegmentsForProcessing);
          
          // For expanded paths, we don't need to generate permutations again
          const flightDataObj = {
            routes: generateRoutePermutations(originalPath),
            data: processedData,
            rawData: data
          };

          setFlightData(flightDataObj);
          if (setExternalFlightData) {
            setExternalFlightData(flightDataObj);
          }
          setSelectedDateRange(dateRange);
        } catch (error) {
          console.error('Search failed:', error);
          setErrors({ general: 'Search failed. Please try again.' });
        } finally {
          setIsLoading(false);
        }
        
        return;
      }

      // Check if the path is an expanded airport group value
      if (path.includes('/') && !path.includes('-')) {
        // This is likely an expanded airport group value
        console.log('Path appears to be an expanded airport group value:', path);
        
        // Try to find which airport group this value belongs to
        for (const [code, airports] of Object.entries(airportGroups)) {
          if (path === airports) {
            console.log('Found matching airport group:', code);
            
            // Detailed error message explaining the issue
            setErrors({ 
              path: `
                Error: Received only one expanded airport group "${code}" (${path}).
                The search path should be in format like "NYC-TYO" or "EWR/JFK/LGA-HND/NRT".
                Please check HybridPathInput component - it's sending expanded airports instead of the full path.
              `
            });
            console.error(`
              DETECTED FRONTEND BUG IN HybridPathInput COMPONENT:
              When searching for paths like "NYC-TYO", the frontend is only sending the 
              expanded value of the last part ("HND/NRT") instead of the full path.
              
              To fix: Update HybridPathInput to send the full path with airport group codes.
            `);
            return;
          }
        }
      }

      // Split path into segments (e.g., "EST-WST-EUR" -> ["EST", "WST", "EUR"])
      const segments = path.split('-');
      console.log('Route segments:', segments);
      
      if (segments.length < 2 && !isUAExpandedSaver) {
        setErrors({ path: 'Invalid path format' });
        return;
      }

      // Check if there are airport groups between first and last hyphens
      const hasMiddleAirportGroups = segments.length > 2 && 
        segments.slice(1, -1).some(segment => 
          Object.keys(airportGroups).includes(segment) || 
          segment.includes('/')
        );

      if (hasMiddleAirportGroups) {
        console.log('Path contains airport groups in the middle, splitting into individual searches');
        
        // Split into individual paths
        const individualPaths = [];
        for (let i = 0; i < segments.length - 1; i++) {
          individualPaths.push(`${segments[i]}-${segments[i + 1]}`);
        }

        // Get all available source codenames and filter based on mode
        const allSources = getSourceCodenames();
        const sourcesToUse = !sourcesState.sources.length ? allSources :
          sourcesState.mode === 'include' 
            ? sourcesState.sources 
            : allSources.filter(source => !sourcesState.sources.includes(source));

        setIsLoading(true);

        try {
          // Make individual API calls for each path
          const allResponses = await Promise.all(
            individualPaths.map(async (individualPath) => {
              const requestBody = {
                routeId: individualPath,
                startDate: dateRange ? dateRange[0] : null,
                endDate: dateRange ? dateRange[1] : null,
                sources: sourcesToUse.join(',')
              };

              console.log('🔍 API Request Body for path:', individualPath, requestBody);

              const response = await fetch('https://backend-284998006367.us-central1.run.app/api/availability-v2', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Partner-Authorization': apiKey
                },
                body: JSON.stringify(requestBody)
              });

              if (!response.ok) {
                throw new Error(`Search failed for path: ${individualPath}`);
              }

              return response.json();
            })
          );

          // Merge all responses
          const mergedData = allResponses.flat();
          console.log('Merged API responses:', mergedData);

          // Process the flight data with the original segments
          const processedData = processFlightData(mergedData, segments);
          
          // Generate route permutations for display
          const routePermutations = generateRoutePermutations(path);
          
          const flightDataObj = {
            routes: routePermutations,
            data: processedData,
            rawData: mergedData
          };

          setFlightData(flightDataObj);
          if (setExternalFlightData) {
            setExternalFlightData(flightDataObj);
          }
          setSelectedDateRange(dateRange);
        } catch (error) {
          console.error('Search failed:', error);
          setErrors({ general: 'Search failed. Please try again.' });
        } finally {
          setIsLoading(false);
        }
        
        return;
      }

      // Store the original segments for later use, but handle slashes correctly
      routeSegmentsForProcessing = segments;
      setCurrentRoute(segments.map(segment => {
        // If this is a group code, expand it
        if (airportGroups[segment]) {
          return segment;
        }
        // If it contains slashes, keep it as is
        if (segment.includes('/')) {
          return segment;
        }
        // Otherwise, it's a single airport code
        return segment;
      }));
    }

    // Get all available source codenames and filter based on mode
    const allSources = getSourceCodenames();
    
    // If no sources are selected, use all sources
    // Otherwise, if mode is 'include', use only the selected sources
    // If mode is 'exclude', use all sources except the selected ones
    const sourcesToUse = !sourcesState.sources.length ? allSources :
      sourcesState.mode === 'include' 
        ? sourcesState.sources 
        : allSources.filter(source => !sourcesState.sources.includes(source));

    console.log('🔍 Sources state:', {
      mode: sourcesState.mode,
      selectedSources: sourcesState.sources,
      allSources,
      sourcesToUse
    });

    setIsLoading(true);

    try {
      // Prepare the request body
      const requestBody = {
        routeId: path,
        startDate: dateRange ? dateRange[0] : null,
        endDate: dateRange ? dateRange[1] : null,
        sources: sourcesToUse.join(',')
      };

      console.log('🔍 API Request Body:', requestBody);

      // Send request with the original path (e.g., "EST-WST-EUR")
      const response = await fetch('https://backend-284998006367.us-central1.run.app/api/availability-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Partner-Authorization': apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      console.log('API response:', data);
      
      // Process the flight data
      const processedData = processFlightData(data, routeSegmentsForProcessing);
      
      // Generate route permutations for display
      const routePermutations = generateRoutePermutations(path);
      
      const flightDataObj = {
        routes: routePermutations,
        data: processedData,
        rawData: data
      };

      setFlightData(flightDataObj);
      if (setExternalFlightData) {
        setExternalFlightData(flightDataObj);
      }
      setSelectedDateRange(dateRange);
    } catch (error) {
      console.error('Search failed:', error);
      setErrors({ general: 'Search failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeSelect = (dateRange) => {
    setSelectedDateRange(dateRange);
  };

  const handleFlightSelect = (flights, pricing) => {
    setSelectedFlights(flights);
    setPricingData(pricing);
  };

  return {
    flightData,
    isLoading,
    handleSearch,
    errors,
    selectedDateRange,
    handleDateRangeSelect,
    selectedFlights,
    handleFlightSelect,
    pricingData,
    cachedApiKey,
    saveApiKey
  };
}