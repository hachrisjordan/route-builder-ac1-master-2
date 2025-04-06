// Filter flights based on filter settings
export const filterFlights = (
  dateData, 
  segmentFilter, 
  classFilter, 
  directFilter,
  dateFilter,
  groupFilters,
  currentRoute,
  filterCallback,
  sourceFilter,
  airlinesFilter,
  pointsFilter,
  rawFlightData,
  segmentFilters
) => {
  if (!dateData) return {};
  
  const filteredDateData = {};
  
  // Find applicable segment filters that have actual filtering criteria
  const applicableSegmentFilters = segmentFilters ? Object.entries(segmentFilters).filter(([_, filter]) => {
    // Skip if there are no segments selected (empty scope)
    if (!filter.segments || filter.segments.length === 0) return false;
    
    // Check if this filter has any real filtering criteria beyond just segment selection
    return filter.directFilter === true || 
           (filter.classFilter && filter.classFilter.length > 0) ||
           (filter.sourceFilter && filter.sourceFilter.sources && filter.sourceFilter.sources.length > 0) ||
           (filter.airlinesFilter && filter.airlinesFilter.airlines && filter.airlinesFilter.airlines.length > 0) ||
           filter.pointsFilter !== null;
  }) : [];
  
  Object.entries(dateData).forEach(([route, routeData]) => {
    // Apply global segment filter
    if (segmentFilter.segments.length > 0) {
      const isInFilter = segmentFilter.segments.includes(route);
      if (segmentFilter.mode === 'include' ? !isInFilter : isInFilter) {
        return;
      }
    }
    
    // Check if any segment-based filter's scope includes this route
    const segmentFiltersForThisRoute = applicableSegmentFilters.filter(([_, filter]) => {
      const isInSegments = filter.segments.includes(route);
      const mode = filter.mode || 'include';
      return mode === 'include' ? isInSegments : !isInSegments;
    });
    
    // If there are segment filters with criteria and none apply to this route, process as normal
    // If there are segment filters with criteria that apply to this route, they will be checked later
    
    // Apply class filter
    if (classFilter.length > 0) {
      const hasMatchingClass = classFilter.some(cls => {
        switch(cls) {
          case 'Economy': return routeData.classes.Y.available && (!directFilter || routeData.classes.Y.direct);
          case 'Premium Economy': return routeData.classes.W.available && (!directFilter || routeData.classes.W.direct);
          case 'Business': return routeData.classes.J.available && (!directFilter || routeData.classes.J.direct);
          case 'First': return routeData.classes.F.available && (!directFilter || routeData.classes.F.direct);
          default: return false;
        }
      });
      
      if (!hasMatchingClass) {
        return;
      }
    }
    
    // Apply direct filter
    if (directFilter) {
      const hasDirect = 
        routeData.classes.Y.direct || 
        routeData.classes.W.direct || 
        routeData.classes.J.direct || 
        routeData.classes.F.direct;
      
      if (!hasDirect) {
        return;
      }
    }
    
    // Apply group filter using the callback
    if (!filterCallback(route)) {
      return;
    }
    
    // Apply source, airlines, and points filters - check if any flights are left after filtering
    if ((sourceFilter && sourceFilter.sources.length > 0) || 
        (airlinesFilter && airlinesFilter.airlines.length > 0) || 
        pointsFilter) {
      
      // Check if there's at least one available class for this route after applying all filters
      const hasAnyFilteredFlights = ['Y', 'W', 'J', 'F'].some(classCode => {
        // Only check classes that are available
        if (!routeData.classes[classCode].available || (directFilter && !routeData.classes[classCode].direct)) {
          return false;
        }
        
        // For each date and route, get all raw flights
        const allFlights = rawFlightData?.filter(flight => {
          return (
            flight.originAirport + '-' + flight.destinationAirport === route &&
            flight[classCode + 'Available'] &&
            (!directFilter || flight[classCode + 'Direct'])
          );
        }) || [];
        
        // Apply source filter if active
        let filtered = allFlights;
        
        if (sourceFilter?.sources?.length > 0) {
          filtered = filtered.filter(flight => {
            const matchesSource = sourceFilter.sources.includes(flight.source);
            return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
          });
        }
        
        // Apply airlines filter if active
        if (airlinesFilter?.airlines?.length > 0) {
          filtered = filtered.filter(flight => {
            // Get airlines list based on direct/indirect filter
            const airlinesList = directFilter
              ? flight[classCode + 'DirectAirlines']
              : flight[classCode + 'Airlines'];
            
            if (!airlinesList) return false;
            
            // Parse airlines
            const airlines = airlinesList.split(',').map(a => a.trim()).filter(a => a);
            
            // Apply include/exclude logic
            if (airlinesFilter.mode === 'include') {
              return airlines.some(airline => airlinesFilter.airlines.includes(airline));
            } else {
              // For exclude, only filter out if ALL airlines are excluded
              return !airlines.every(airline => airlinesFilter.airlines.includes(airline));
            }
          });
        }
        
        // Apply points filter if active
        if (pointsFilter) {
          filtered = filtered.filter(flight => {
            const costField = directFilter
              ? classCode + 'DirectMileageCost'
              : classCode + 'MileageCost';
            
            const cost = parseInt(flight[costField] || '0', 10);
            return cost >= pointsFilter[0] && cost <= pointsFilter[1] && cost > 0;
          });
        }
        
        // Return true if any flights passed all filters
        return filtered.length > 0;
      });
      
      if (!hasAnyFilteredFlights) {
        return; // No flights pass all filters, skip this route
      }
    }
    
    // If the route passes all filters, add it to the result
    filteredDateData[route] = routeData;
  });
  
  return filteredDateData;
};

// Helper function to get flights for a specific class with various filters
export const getFlightsForClassWithFilters = (
  routeCode, 
  classCode, 
  dateString, 
  classData, 
  flightData,
  directFilter,
  sourceFilter,
  airlinesFilter,
  pointsFilter
) => {
  if (!classData || !classData.available || (directFilter && !classData.direct)) {
    return [];
  }
  
  // Get all flights for this route, date and class
  const allFlights = flightData?.rawData?.filter(flight => {
    return (
      flight.originAirport + '-' + flight.destinationAirport === routeCode &&
      flight.date === dateString &&
      flight[classCode + 'Available'] &&
      (!directFilter || flight[classCode + 'Direct'])
    );
  }) || [];
  
  // Apply source filter if active
  let filtered = allFlights;
  
  if (sourceFilter?.sources?.length > 0) {
    filtered = filtered.filter(flight => {
      const matchesSource = sourceFilter.sources.includes(flight.source);
      return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
    });
  }
  
  // Apply filters using AvailabilityTrips data
  filtered = applyAvailabilityTripsFilters(filtered, classCode, directFilter, airlinesFilter, pointsFilter);
  
  return filtered;
};

/**
 * Apply filters based on AvailabilityTrips data
 * @param {Array} flights - Array of flight data objects
 * @param {string} classCode - The class code (Y/W/J/F)
 * @param {boolean} directFilter - Whether to show only direct flights
 * @param {Object} airlinesFilter - Airlines filter configuration
 * @param {Array} pointsFilter - Points range filter [min, max]
 * @returns {Array} - Filtered flights
 */
export const applyAvailabilityTripsFilters = (flights, classCode, directFilter, airlinesFilter, pointsFilter) => {
  if (!flights || flights.length === 0) {
    return [];
  }

  return flights.filter(flight => {
    // Skip flights without AvailabilityTrips data
    if (!flight.AvailabilityTrips || !Array.isArray(flight.AvailabilityTrips) || flight.AvailabilityTrips.length === 0) {
      // Legacy filtering for backwards compatibility
      return passesLegacyFilters(flight, classCode, directFilter, airlinesFilter, pointsFilter);
    }

    // Get trips that have availability for the current class
    const availableTrips = flight.AvailabilityTrips.filter(trip => {
      const mileField = `${classCode}Mile`;
      return trip[mileField] && trip[mileField] > 0;
    });

    if (availableTrips.length === 0) {
      return false; // No available trips for this class
    }

    // Apply direct filter using Stops data from AvailabilityTrips
    if (directFilter) {
      const hasDirectTrips = availableTrips.some(trip => trip.Stops === 0);
      if (!hasDirectTrips) {
        return false;
      }
    }

    // Apply airlines filter using FlightNumbers from AvailabilityTrips
    if (airlinesFilter?.airlines?.length > 0) {
      const flightAirlines = new Set();
      
      availableTrips.forEach(trip => {
        if (trip.FlightNumbers && Array.isArray(trip.FlightNumbers)) {
          trip.FlightNumbers.forEach(flightNum => {
            // Extract airline code (first 2 characters)
            const airlineCode = flightNum.substring(0, 2);
            if (airlineCode) {
              flightAirlines.add(airlineCode);
            }
          });
        }
      });
      
      const airlinesList = Array.from(flightAirlines);
      
      if (airlinesFilter.mode === 'include') {
        // In include mode, at least one airline must be included
        const hasIncludedAirline = airlinesList.some(airline => 
          airlinesFilter.airlines.includes(airline)
        );
        if (!hasIncludedAirline) {
          return false;
        }
      } else {
        // In exclude mode, only filter out if ALL airlines are excluded
        const allAirlinesExcluded = airlinesList.length > 0 && 
          airlinesList.every(airline => airlinesFilter.airlines.includes(airline));
        if (allAirlinesExcluded) {
          return false;
        }
      }
    }

    // Apply points filter using YMile/WMile/JMile/FMile from AvailabilityTrips
    if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
      const mileField = `${classCode}Mile`;
      
      // Check if any trip's miles are within the range
      const hasTripsInRange = availableTrips.some(trip => {
        const miles = trip[mileField];
        return miles >= pointsFilter[0] && miles <= pointsFilter[1];
      });
      
      if (!hasTripsInRange) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Fall back to legacy filtering for flights without AvailabilityTrips data
 * @param {Object} flight - Flight data object
 * @param {string} classCode - The class code (Y/W/J/F)
 * @param {boolean} directFilter - Whether to show only direct flights
 * @param {Object} airlinesFilter - Airlines filter configuration
 * @param {Array} pointsFilter - Points range filter [min, max]
 * @returns {boolean} - Whether the flight passes all filters
 */
export const passesLegacyFilters = (flight, classCode, directFilter, airlinesFilter, pointsFilter) => {
  // Apply airlines filter using legacy fields
  if (airlinesFilter?.airlines?.length > 0) {
    // Get airlines list based on direct/indirect filter
    const airlinesList = directFilter
      ? flight[classCode + 'DirectAirlines']
      : flight[classCode + 'Airlines'];
    
    if (!airlinesList) return false;
    
    // Parse airlines
    const airlines = airlinesList.split(',').map(a => a.trim()).filter(a => a);
    
    // Apply include/exclude logic
    if (airlinesFilter.mode === 'include') {
      if (!airlines.some(airline => airlinesFilter.airlines.includes(airline))) {
        return false;
      }
    } else {
      // For exclude, only filter out if ALL airlines are excluded
      if (airlines.every(airline => airlinesFilter.airlines.includes(airline))) {
        return false;
      }
    }
  }
  
  // Apply points filter using legacy fields
  if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
    const costField = directFilter
      ? classCode + 'DirectMileageCost'
      : classCode + 'MileageCost';
    
    const cost = parseInt(flight[costField] || '0', 10);
    if (!(cost >= pointsFilter[0] && cost <= pointsFilter[1] && cost > 0)) {
      return false;
    }
  }
  
  return true;
}

// Check if a segment passes the group-based filter
export const passesGroupFilter = (route, groupFilters) => {
  // If no group filters are applied, all segments pass
  if (!groupFilters || Object.keys(groupFilters).length === 0) {
    return true;
  }
  
  const [origin, destination] = route.split('-');
  
  // Check if any group filter matches
  for (const filterId in groupFilters) {
    const filter = groupFilters[filterId];
    const originFilter = filter.originFilter || { mode: 'include', airports: [] };
    const destFilter = filter.destFilter || { mode: 'include', airports: [] };
    
    // If both filters are empty, the filter is incomplete so skip this filter
    if (originFilter.airports.length === 0 && destFilter.airports.length === 0) {
      continue;
    }
    
    // Check origin filter
    let originPass = true;
    if (originFilter.airports.length > 0) {
      const isOriginInFilter = originFilter.airports.includes(origin);
      originPass = originFilter.mode === 'include' ? isOriginInFilter : !isOriginInFilter;
    }
    
    // Check destination filter
    let destPass = true;
    if (destFilter.airports.length > 0) {
      const isDestInFilter = destFilter.airports.includes(destination);
      destPass = destFilter.mode === 'include' ? isDestInFilter : !isDestInFilter;
    }
    
    // If this route is in the scope of this filter
    if (originPass && destPass) {
      console.log('[DEBUG] Route', route, 'matches scope of filter', filterId);
      console.log('[DEBUG] Filter details:', filter);
      
      // Check if there are actual filtering criteria
      const hasFilterCriteria = filter.directFilter || 
        (filter.classFilter && Array.isArray(filter.classFilter) && filter.classFilter.length > 0) ||
        (filter.sourceFilter && filter.sourceFilter.sources && Array.isArray(filter.sourceFilter.sources) && filter.sourceFilter.sources.length > 0) ||
        (filter.airlinesFilter && filter.airlinesFilter.airlines && Array.isArray(filter.airlinesFilter.airlines) && filter.airlinesFilter.airlines.length > 0) ||
        (filter.pointsFilter && Array.isArray(filter.pointsFilter) && filter.pointsFilter.length === 2) ||
        (filter.dateFilter && Array.isArray(filter.dateFilter) && filter.dateFilter.length > 0);
      
      if (hasFilterCriteria) {
        console.log('[DEBUG] Filter has criteria, need to apply to route');
        return true; // Route is in scope of this filter and filter has criteria
      }
    }
  }
  
  return true; // No matching filter found with criteria
};

// Find applicable group filters for a given route
// This only determines which filters apply to a route based on origin/destination scope
export const findApplicableGroupFilters = (route, groupFilters) => {
  console.log('[DEBUG] Finding applicable group filters for route:', route, 'with groupFilters:', groupFilters);
  
  if (!groupFilters || Object.keys(groupFilters).length === 0) {
    console.log('[DEBUG] No group filters defined, returning empty array');
    return [];
  }
  
  const [origin, destination] = route.split('-');
  const applicableFilters = [];
  
  // Check each group filter to see if it applies to this route
  Object.entries(groupFilters).forEach(([filterId, filter]) => {
    // Ensure the filter is properly initialized
    if (!filter) return;
    
    const originFilter = filter.originFilter || { mode: 'include', airports: [] };
    const destFilter = filter.destFilter || { mode: 'include', airports: [] };
    
    console.log('[DEBUG] Checking filter:', filterId, 'for route:', route);
    console.log('[DEBUG] Origin filter:', originFilter);
    console.log('[DEBUG] Destination filter:', destFilter);
    
    // If both origin and destination filters are empty, this filter has no scope defined
    // so it doesn't apply to any route
    if (originFilter.airports.length === 0 && destFilter.airports.length === 0) {
      console.log('[DEBUG] Filter has no scope defined, skipping');
      return;
    }
    
    // Check if origin matches the scope
    let originMatch = true;
    if (originFilter.airports.length > 0) {
      const isOriginInFilter = originFilter.airports.includes(origin);
      originMatch = originFilter.mode === 'include' ? isOriginInFilter : !isOriginInFilter;
      console.log('[DEBUG] Origin match check:', origin, 'in filter:', isOriginInFilter, 'mode:', originFilter.mode, 'result:', originMatch);
    }
    
    // Check if destination matches the scope
    let destMatch = true;
    if (destFilter.airports.length > 0) {
      const isDestInFilter = destFilter.airports.includes(destination);
      destMatch = destFilter.mode === 'include' ? isDestInFilter : !isDestInFilter;
      console.log('[DEBUG] Destination match check:', destination, 'in filter:', isDestInFilter, 'mode:', destFilter.mode, 'result:', destMatch);
    }
    
    // If both origin and destination match the scope, this filter applies to this route
    if (originMatch && destMatch) {
      console.log('[DEBUG] Filter applies to route:', route);
      // Create a safe copy of the filter with proper initialization
      const safeFilter = {
        id: filterId,
        originFilter: originFilter,
        destFilter: destFilter,
        directFilter: filter.directFilter || false,
        classFilter: Array.isArray(filter.classFilter) ? filter.classFilter : [],
        sourceFilter: filter.sourceFilter || { mode: 'include', sources: [] },
        airlinesFilter: filter.airlinesFilter || { mode: 'include', airlines: [] },
        pointsFilter: filter.pointsFilter || null,
        dateFilter: Array.isArray(filter.dateFilter) ? filter.dateFilter : []
      };
      
      console.log('[DEBUG] Adding safe filter for route:', route, 'filter:', safeFilter);
      applicableFilters.push(safeFilter);
    } else {
      console.log('[DEBUG] Filter does not apply to route:', route, 'originMatch:', originMatch, 'destMatch:', destMatch);
    }
  });
  
  console.log('[DEBUG] Applicable filters for route:', route, 'count:', applicableFilters.length);
  return applicableFilters;
};

// Apply group-based filters in order (earlier filters have priority)
export const applyGroupFilters = (flights, classCode, groupFilters) => {
  console.log('[DEBUG] Applying group filters for classCode:', classCode, 'with filters:', groupFilters);
  let filtered = [...flights];
  
  // Apply each group filter in order (they are already in declaration order)
  groupFilters.forEach(filter => {
    console.log('[DEBUG] Processing group filter:', filter.id);
    
    // Apply direct filter if enabled
    if (filter.directFilter) {
      console.log('[DEBUG] Applying direct filter');
      filtered = filtered.filter(flight => flight[classCode + 'Direct']);
    }
    
    // Apply class filter if specified
    if (filter.classFilter && Array.isArray(filter.classFilter) && filter.classFilter.length > 0) {
      const classMapping = {
        'Economy': 'Y',
        'Premium Economy': 'W',
        'Business': 'J',
        'First': 'F'
      };
      
      // Map the class names to codes
      const classCodes = filter.classFilter.map(cls => classMapping[cls]).filter(Boolean);
      console.log('[DEBUG] Class filter applied with classes:', filter.classFilter, 'mapped to codes:', classCodes);
      
      // Skip if this class isn't in the filter
      if (!classCodes.includes(classCode)) {
        console.log('[DEBUG] Current class code', classCode, 'not in filter, emptying results');
        filtered = [];
        return;
      }
    }
    
    // ... rest of the code ...
  });
  
  console.log('[DEBUG] After applying group filters, flights count:', filtered.length);
  return filtered;
};
