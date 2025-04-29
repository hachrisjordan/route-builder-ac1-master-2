import React, { useState, useRef, useEffect } from 'react';
import { getEnrichedFlightData, getAirlineName, formatTaxes } from '../utils/flightUtils';
import { getSourceByCodename } from '../data/sources';
import airlines from '../data/airlines_full';
import { applyGroupFilters, findApplicableGroupFilters } from '../utils/filterUtils';
import { convertCurrency, formatCurrencyAmount } from '../utils/currencyUtils';
import { useTooltipManager } from './tooltips/TooltipManager';

// Static helper function to check if a route has any available badges
export const hasAvailableBadges = (route, date, flightData, directFilter, sourceFilter, airlinesFilter, pointsFilter, classes, groupFilters, segmentFilters, timeFilters) => {
  // Class to cabin code mapping
  const classToCabin = {
    'Economy': 'Y',
    'Premium Economy': 'W',
    'Business': 'J',
    'First': 'F'
  };
  
  // Get classes to check
  const classesToCheck = Array.isArray(classes) && classes.length > 0 
    ? classes.map(cls => classToCabin[cls]).filter(Boolean)
    : Object.values(classToCabin);
  
  // Check each class to see if any are available after filtering
  for (const classCode of classesToCheck) {
    // Skip if no flight data
    if (!flightData?.data?.[date]?.[route]?.classes?.[classCode]) continue;
    
    const classData = flightData.data[date][route].classes[classCode];
    
    // Skip if not available
    if (!classData || !classData.available) continue;
    
    // Skip if direct filter is on and this class doesn't have direct flights
    if (directFilter && !classData.direct) continue;
    
    // Get enriched flight data
    const flights = getEnrichedFlightData(route, classCode, date, classData, flightData);
    
    // Apply all filters to see if any flights remain
    let filteredFlights = [...flights];
    
    // Apply direct filter
    if (directFilter) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        return rawFlight[`${classCode}Direct`] === true;
      });
    }
    
    // Apply source filter
    if (sourceFilter?.sources?.length > 0) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight || !rawFlight.source) return false;
        
        if (sourceFilter.mode === 'include') {
          // In include mode, keep flights that match any included source
          return sourceFilter.sources.includes(rawFlight.source);
        } else {
          // In exclude mode, keep flights that have at least one non-excluded source
          return !sourceFilter.sources.includes(rawFlight.source);
        }
      });
    }
    
    // Apply airlines filter
    if (airlinesFilter?.airlines?.length > 0) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        
        // Get the airlines based on direct/indirect
        const airlinesString = directFilter 
          ? rawFlight[`${classCode}DirectAirlines`] 
          : rawFlight[`${classCode}Airlines`];
        
        if (!airlinesString) return false;
        
        // Parse the airlines list
        const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
        
        if (airlinesFilter.mode === 'include') {
          // In include mode, at least one airline must be included
          return flightAirlines.some(airline => airlinesFilter.airlines.includes(airline));
        } else {
          // In exclude mode, only filter out if ALL airlines are excluded
          return !flightAirlines.every(airline => airlinesFilter.airlines.includes(airline));
        }
      });
    }
    
    // Apply points filter
    if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        
        // Get the mileage cost based on direct/indirect
        let mileageCost;
        if (directFilter) {
          mileageCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10);
        } else {
          mileageCost = parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
        }
        
        // Check if it's within the range
        return mileageCost >= pointsFilter[0] && mileageCost <= pointsFilter[1];
      });
    }
    
    // Apply time filters if present
    if (timeFilters?.departure?.enabled || timeFilters?.arrival?.enabled || timeFilters?.duration?.enabled) {
      filteredFlights = filteredFlights.filter(flight => {
        // Skip flights without raw data or AvailabilityTrips
        if (!flight.rawData || !flight.rawData.AvailabilityTrips) return false;
        
        // Check if any AvailabilityTrip passes all time filters
        return flight.rawData.AvailabilityTrips.some(trip => {
          // Helper to convert time strings to decimal hours
          const getTimeDecimal = (timeString) => {
            let hours = 0;
            let minutes = 0;
            
            if (typeof timeString === 'string') {
              const match = timeString.match(/T(\d{2}):(\d{2})/);
              if (match && match[1] && match[2]) {
                hours = parseInt(match[1], 10);
                minutes = parseInt(match[2], 10);
                return hours + (minutes / 60);
              }
            }
            
            // Fallback to Date object if string parsing fails
            const date = new Date(timeString);
            return date.getHours() + (date.getMinutes() / 60);
          };
          
          // Apply departure time filter if enabled
          if (timeFilters?.departure?.enabled) {
            const departureHour = getTimeDecimal(trip.DepartsAt);
            const [minHour, maxHour] = timeFilters.departure.range;
            if (departureHour < minHour || departureHour > maxHour) {
              return false;
            }
          }
          
          // Apply arrival time filter if enabled
          if (timeFilters?.arrival?.enabled) {
            const arrivalHour = getTimeDecimal(trip.ArrivesAt);
            const [minHour, maxHour] = timeFilters.arrival.range;
            if (arrivalHour < minHour || arrivalHour > maxHour) {
              return false;
            }
          }
          
          // Apply duration filter if enabled
          if (timeFilters?.duration?.enabled) {
            const durationMinutes = trip.TotalDuration || 0;
            const [minDuration, maxDuration] = timeFilters.duration.range;
            if (durationMinutes < minDuration || durationMinutes > maxDuration) {
              return false;
            }
          }
          
          // If we got here, this trip passed all time filters
          return true;
        });
      });
    }
    
    // Apply segment filters if they exist
    if (segmentFilters && Object.keys(segmentFilters).length > 0) {
      // Check if any segment filter applies to this route (defines scope)
      let hasApplicableSegmentFilter = false;
      
      // Check if this route is in the scope of any segment filter
      Object.entries(segmentFilters).forEach(([filterId, filter]) => {
        if (!filter || !filter.segments || !Array.isArray(filter.segments)) return;
        
        // Check if this route is in the segments list
        const isInSegments = filter.segments.includes(route);
        
        // Use the mode if it exists, default to 'include'
        const mode = filter.mode || 'include';
        
        // Check if this route is in the scope of this filter
        if ((mode === 'include' && isInSegments) || (mode === 'exclude' && !isInSegments)) {
          hasApplicableSegmentFilter = true;
          
          // Apply any specific filters from this segment filter
          
          // Apply direct filter from segment filter
          if (filter.directFilter) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              return rawFlight[`${classCode}Direct`] === true;
            });
          }
          
          // Apply class filter from segment filter
          if (filter.classFilter && Array.isArray(filter.classFilter) && filter.classFilter.length > 0) {
            const classMapping = {
              'Economy': 'Y',
              'Premium Economy': 'W',
              'Business': 'J',
              'First': 'F'
            };
            
            // Map the class names to codes
            const classCodes = filter.classFilter.map(cls => classMapping[cls]).filter(Boolean);
            
            // Skip if this class isn't in the filter
            if (!classCodes.includes(classCode)) {
              filteredFlights = [];
              return;
            }
          }
          
          // Apply source filter from segment filter
          if (filter.sourceFilter && filter.sourceFilter.sources && filter.sourceFilter.sources.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight || !rawFlight.source) return false;
              
              const matchesSource = filter.sourceFilter.sources.includes(rawFlight.source);
              return filter.sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
            });
          }
          
          // Apply airlines filter from segment filter
          if (filter.airlinesFilter && filter.airlinesFilter.airlines && filter.airlinesFilter.airlines.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the airlines based on direct/indirect
              const airlinesString = directFilter 
                ? rawFlight[`${classCode}DirectAirlines`] 
                : rawFlight[`${classCode}Airlines`];
              
              if (!airlinesString) return false;
              
              // Parse the airlines list
              const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
              
              if (filter.airlinesFilter.mode === 'include') {
                // In include mode, at least one airline must be included
                return flightAirlines.some(airline => filter.airlinesFilter.airlines.includes(airline));
              } else {
                // In exclude mode, only filter out if ALL airlines are excluded
                return !flightAirlines.every(airline => filter.airlinesFilter.airlines.includes(airline));
              }
            });
          }
          
          // Apply points filter from segment filter
          if (filter.pointsFilter && Array.isArray(filter.pointsFilter) && filter.pointsFilter.length === 2) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the mileage cost based on direct/indirect
              let mileageCost;
              if (directFilter || filter.directFilter) {
                mileageCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10);
              } else {
                mileageCost = parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
              }
              
              // Check if it's within the range
              return mileageCost >= filter.pointsFilter[0] && mileageCost <= filter.pointsFilter[1] && mileageCost > 0;
            });
          }
        }
      });
      
      // We don't need to filter out routes that don't have applicable segment filters
      // Just keep processing as normal for routes that don't match any segment filter scope
    }
    
    // Apply group filters if they exist and apply to this route
    if (groupFilters && Object.keys(groupFilters).length > 0) {
      const applicableFilters = findApplicableGroupFilters(route, groupFilters);
      
      if (applicableFilters.length > 0) {
        applicableFilters.forEach(filter => {
          // Skip if there are no flights left
          if (filteredFlights.length === 0) return;
          
          // Apply direct filter from group filter
          if (filter.directFilter) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              return rawFlight[`${classCode}Direct`] === true;
            });
          }
          
          // Apply class filter from group filter
          if (filter.classFilter && Array.isArray(filter.classFilter) && filter.classFilter.length > 0) {
            const classMapping = {
              'Economy': 'Y',
              'Premium Economy': 'W',
              'Business': 'J',
              'First': 'F'
            };
            
            // Map the class names to codes
            const classCodes = filter.classFilter.map(cls => classMapping[cls]).filter(Boolean);
            
            // Skip if this class isn't in the filter
            if (!classCodes.includes(classCode)) {
              filteredFlights = [];
              return;
            }
          }
          
          // Apply source filter from group filter
          if (filter.sourceFilter && filter.sourceFilter.sources && filter.sourceFilter.sources.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight || !rawFlight.source) return false;
              
              const matchesSource = filter.sourceFilter.sources.includes(rawFlight.source);
              return filter.sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
            });
          }
          
          // Apply airlines filter from group filter
          if (filter.airlinesFilter && filter.airlinesFilter.airlines && filter.airlinesFilter.airlines.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the airlines based on direct/indirect
              const airlinesString = directFilter 
                ? rawFlight[`${classCode}DirectAirlines`] 
                : rawFlight[`${classCode}Airlines`];
              
              if (!airlinesString) return false;
              
              // Parse the airlines list
              const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
              
              if (filter.airlinesFilter.mode === 'include') {
                // In include mode, at least one airline must be included
                return flightAirlines.some(airline => filter.airlinesFilter.airlines.includes(airline));
              } else {
                // In exclude mode, only filter out if ALL airlines are excluded
                return !flightAirlines.every(airline => filter.airlinesFilter.airlines.includes(airline));
              }
            });
          }
          
          // Apply points filter from group filter
          if (filter.pointsFilter && Array.isArray(filter.pointsFilter) && filter.pointsFilter.length === 2) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the mileage cost based on direct/indirect
              let mileageCost;
              if (directFilter || filter.directFilter) {
                mileageCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10);
              } else {
                mileageCost = parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
              }
              
              // Check if it's within the range
              return mileageCost >= filter.pointsFilter[0] && mileageCost <= filter.pointsFilter[1] && mileageCost > 0;
            });
          }
          
          // Apply date filter from group filter
          if (filter.dateFilter && Array.isArray(filter.dateFilter) && filter.dateFilter.length > 0) {
            // Skip if this date isn't in the filter
            if (!filter.dateFilter.includes(date)) {
              filteredFlights = [];
              return;
            }
          }
        });
      }
    }
    
    // If any flights remain after all filters, this route has at least one available badge
    if (filteredFlights.length > 0) {
      return true;
    }
  }
  
  // If no class has available flights after filtering, return false
  return false;
};

const AvailabilityBadges = ({
  route,
  date,
  flightData,
  directFilter,
  sourceFilter,
  airlinesFilter,
  pointsFilter,
  classes,
  groupFilters,
  segmentFilters,
  currencyFilter,
  isDetailedView,
  timeFilters
}) => {
  // Use our tooltip manager hook
  const { 
    activeTooltipRef, 
    pinnedTooltipId, 
    setPinnedTooltipId, 
    showTooltip, 
    hideTooltip 
  } = useTooltipManager(React);
  
  // Class to cabin code mapping
  const classToCabin = {
    'Economy': 'Y',
    'Premium Economy': 'W',
    'Business': 'J',
    'First': 'F'
  };

  // Function to check if the flight should be shown as available after all filters
  const shouldShowAsAvailable = (route, classCode, date, flightData, directFilter, sourceFilter, airlinesFilter, pointsFilter, segmentFilters) => {
    // Check if we have data for this combination
    if (!flightData || !flightData.data || !flightData.data[date] || 
        !flightData.data[date][route] || !flightData.data[date][route].classes) {
      return false;
    }
    
    const classData = flightData.data[date][route].classes[classCode];
    if (!classData || !classData.available) return false;
    
    // Apply all filters to the flight data
    if (directFilter && !classData.direct) return false;
    
    // Apply source filter if set
    if (sourceFilter?.sources?.length > 0) {
      const sources = (classData.sources || '').split(',').map(s => s.trim()).filter(s => s);
      
      if (sourceFilter.mode === 'include') {
        // In include mode, keep if any source matches
        const matchesSources = sourceFilter.sources.some(s => sources.includes(s));
        if (!matchesSources) return false;
      } else {
        // In exclude mode, keep if any source is not excluded
        const hasNonExcludedSource = sources.some(s => !sourceFilter.sources.includes(s));
        if (!hasNonExcludedSource) return false;
      }
    }
    
    // If either time or airlines filter is enabled, we need to check actual flight data
    // to see if any flights match the criteria
    if (timeFilters?.departure?.enabled || timeFilters?.arrival?.enabled || timeFilters?.duration?.enabled ||
        airlinesFilter?.airlines?.length > 0 || pointsFilter) {
      // Get the enriched flight data with all details
      const flights = getEnrichedFlightData(route, classCode, date, classData, flightData);
      
      // Apply time filters to each flight
      const filteredFlights = flights.filter(flight => {
        // Skip flights without raw data
        if (!flight.rawData || !flight.rawData.AvailabilityTrips) return false;
        
        // Check if any AvailabilityTrip passes all filters
        return flight.rawData.AvailabilityTrips.some(trip => {
          // Skip if flight is filtered by other criteria
          if (directFilter && trip.Stops !== 0) return false;
          
          // Get appropriate mile value based on classCode
          let mileValue;
          if (classCode === 'Y') mileValue = trip.YMile;
          else if (classCode === 'W') mileValue = trip.WMile;
          else if (classCode === 'J') mileValue = trip.JMile;
          else if (classCode === 'F') mileValue = trip.FMile;
          
          // Apply points filter if enabled
          if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
            if (!mileValue || mileValue < pointsFilter[0] || mileValue > pointsFilter[1]) {
              return false;
            }
          }
          
          // Apply airline filter if enabled
          if (airlinesFilter?.airlines?.length > 0) {
            const flightAirlines = new Set();
            
            // Extract airline codes from flight numbers
            if (trip.FlightNumbers && Array.isArray(trip.FlightNumbers)) {
              trip.FlightNumbers.forEach(flightNum => {
                // Take first 2 characters as airline code
                const airlineCode = flightNum.substring(0, 2);
                if (airlineCode) flightAirlines.add(airlineCode);
              });
            }
            
            // Add actual Airlines if available
            if (trip.Airlines && Array.isArray(trip.Airlines)) {
              trip.Airlines.forEach(airline => flightAirlines.add(airline));
            }
            
            const airlinesList = Array.from(flightAirlines);
            
            if (airlinesFilter.mode === 'include') {
              if (!airlinesList.some(airline => airlinesFilter.airlines.includes(airline))) {
                return false;
              }
            } else {
              if (airlinesList.length > 0 && airlinesList.every(airline => airlinesFilter.airlines.includes(airline))) {
                return false;
              }
            }
          }
          
          // Extract departure and arrival times for filtering
          if (timeFilters?.departure?.enabled || timeFilters?.arrival?.enabled) {
            // Get exact time strings without timezone conversion
            const getTimeDecimal = (timeString) => {
              let hours = 0;
              let minutes = 0;
              
              if (typeof timeString === 'string') {
                const match = timeString.match(/T(\d{2}):(\d{2})/);
                if (match && match[1] && match[2]) {
                  hours = parseInt(match[1], 10);
                  minutes = parseInt(match[2], 10);
                  return hours + (minutes / 60);
                }
              }
              
              // Fallback to Date object if string parsing fails
              const date = new Date(timeString);
              return date.getHours() + (date.getMinutes() / 60);
            };
          
            // Apply departure time filter if enabled
            if (timeFilters?.departure?.enabled) {
              const departureHour = getTimeDecimal(trip.DepartsAt);
              const [minHour, maxHour] = timeFilters.departure.range;
              if (departureHour < minHour || departureHour > maxHour) {
                return false;
              }
            }
            
            // Apply arrival time filter if enabled
            if (timeFilters?.arrival?.enabled) {
              const arrivalHour = getTimeDecimal(trip.ArrivesAt);
              const [minHour, maxHour] = timeFilters.arrival.range;
              if (arrivalHour < minHour || arrivalHour > maxHour) {
                return false;
              }
            }
          }
          
          // Apply duration filter if enabled
          if (timeFilters?.duration?.enabled) {
            const durationMinutes = trip.TotalDuration || 0;
            const [minDuration, maxDuration] = timeFilters.duration.range;
            if (durationMinutes < minDuration || durationMinutes > maxDuration) {
              return false;
            }
          }
          
          // If we got here, this trip passed all filters
          return true;
        });
      });
      
      // Return true only if at least one flight passed all filters
      return filteredFlights.length > 0;
    }
    
    // If we got here with no special filters, it means the class is available
    return true;
  };

  // Get classes to show for this route
  const classesToShow = Array.isArray(classes) && classes.length > 0 
    ? classes.map(cls => classToCabin[cls]).filter(c => c) // Map to cabin codes and filter out undefined
    : Object.values(classToCabin); // If classes not provided, show all
  
  // Check if any class is available for this route after all filters
  const hasAnyAvailableClass = classesToShow.some(classCode => 
    shouldShowAsAvailable(route, classCode, date, flightData, directFilter, sourceFilter, airlinesFilter, pointsFilter, segmentFilters)
  );

  // If no classes are available, don't render anything
  if (!hasAnyAvailableClass) {
    return null;
  }

  // Get background color based on class code
  const getBackgroundColor = (classCode, isAvailable) => {
    if (!isAvailable) return '#f5f5f5';
    
    switch (classCode) {
      case 'Y': return '#E8E1F2'; // Light purple for Economy
      case 'W': return '#B8A4CC'; // Light blue for Premium Economy
      case 'J': return '#F3CD87'; // Light orange for Business
      case 'F': return '#D88A3F'; // Light red for First
      default: return '#f5f5f5';
    }
  };
  
  // Get flights for a specific class
  const getFlightsForClass = (classCode) => {
    // Get all flights for this class and apply filters
    const allFlights = [];
    
    // Process if we have flight data
    if (flightData && flightData.data && flightData.data[date] && 
        flightData.data[date][route] && flightData.data[date][route].classes) {
      const classData = flightData.data[date][route].classes[classCode];
      
      if (classData) {
        const flights = getEnrichedFlightData(route, classCode, date, classData, flightData);
        return getFlightsForClassWithFilters(classCode, flights);
      }
    }
    
    return allFlights;
  };
  
  // Apply filters to flights
  const getFlightsForClassWithFilters = (classCode, flights) => {
    if (!flights || !flights.length) return [];
    
    let filteredFlights = [...flights];
    
    // Apply direct filter
    if (directFilter) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        return rawFlight[`${classCode}Direct`] === true;
      });
    }
    
    // Apply source filter
    if (sourceFilter.sources && sourceFilter.sources.length > 0) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight || !rawFlight.source) return false;
        
        if (sourceFilter.mode === 'include') {
          // In include mode, keep flights that match any included source
          return sourceFilter.sources.includes(rawFlight.source);
        } else {
          // In exclude mode, keep flights that have at least one non-excluded source
          return !sourceFilter.sources.includes(rawFlight.source);
        }
      });
    }
    
    // Apply airlines filter
    if (airlinesFilter.airlines && airlinesFilter.airlines.length > 0) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        
        // Get the airlines based on direct/indirect
        const airlinesString = directFilter 
          ? rawFlight[`${classCode}DirectAirlines`] 
          : rawFlight[`${classCode}Airlines`];
        
        if (!airlinesString) return false;
        
        // Parse the airlines list
        const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
        
        if (airlinesFilter.mode === 'include') {
          // In include mode, at least one airline must be included
          return flightAirlines.some(airline => airlinesFilter.airlines.includes(airline));
        } else {
          // In exclude mode, only filter out if ALL airlines are excluded
          return !flightAirlines.every(airline => airlinesFilter.airlines.includes(airline));
        }
      });
    }
    
    // Apply points filter
    if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
      filteredFlights = filteredFlights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        
        // Get the mileage cost based on direct/indirect
        let mileageCost;
        if (directFilter) {
          mileageCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10);
        } else {
          mileageCost = parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
        }
        
        // Check if it's within the range
        return mileageCost >= pointsFilter[0] && mileageCost <= pointsFilter[1];
      });
    }
    
    // Apply segment filters if they exist
    if (segmentFilters && Object.keys(segmentFilters).length > 0) {
      // Check if any segment filter applies to this route (defines scope)
      let hasApplicableSegmentFilter = false;
  
      // Check if this route is in the scope of any segment filter
      Object.entries(segmentFilters).forEach(([filterId, filter]) => {
        if (!filter || !filter.segments || !Array.isArray(filter.segments)) return;
        
        // Check if this route is in the segments list
        const isInSegments = filter.segments.includes(route);
        
        // Use the mode if it exists, default to 'include'
        const mode = filter.mode || 'include';
        
        // Check if this route is in the scope of this filter
        if ((mode === 'include' && isInSegments) || (mode === 'exclude' && !isInSegments)) {
          hasApplicableSegmentFilter = true;
          
          // Apply any specific filters from this segment filter
          
          // Apply direct filter from segment filter
          if (filter.directFilter) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              return rawFlight[`${classCode}Direct`] === true;
            });
          }
          
          // Apply class filter from segment filter
          if (filter.classFilter && Array.isArray(filter.classFilter) && filter.classFilter.length > 0) {
            const classMapping = {
              'Economy': 'Y',
              'Premium Economy': 'W',
              'Business': 'J',
              'First': 'F'
            };
            
            // Map the class names to codes
            const classCodes = filter.classFilter.map(cls => classMapping[cls]).filter(Boolean);
            
            // Skip if this class isn't in the filter
            if (!classCodes.includes(classCode)) {
              filteredFlights = [];
              return;
            }
          }
          
          // Apply source filter from segment filter
          if (filter.sourceFilter && filter.sourceFilter.sources && filter.sourceFilter.sources.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight || !rawFlight.source) return false;
              
              const matchesSource = filter.sourceFilter.sources.includes(rawFlight.source);
              return filter.sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
            });
          }
          
          // Apply airlines filter from segment filter
          if (filter.airlinesFilter && filter.airlinesFilter.airlines && filter.airlinesFilter.airlines.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the airlines based on direct/indirect
              const airlinesString = directFilter 
                ? rawFlight[`${classCode}DirectAirlines`] 
                : rawFlight[`${classCode}Airlines`];
              
              if (!airlinesString) return false;
              
              // Parse the airlines list
              const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
              
              if (filter.airlinesFilter.mode === 'include') {
                // In include mode, at least one airline must be included
                return flightAirlines.some(airline => filter.airlinesFilter.airlines.includes(airline));
              } else {
                // In exclude mode, only filter out if ALL airlines are excluded
                return !flightAirlines.every(airline => filter.airlinesFilter.airlines.includes(airline));
              }
            });
          }
          
          // Apply points filter from segment filter
          if (filter.pointsFilter && Array.isArray(filter.pointsFilter) && filter.pointsFilter.length === 2) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the mileage cost based on direct/indirect
              let mileageCost;
              if (directFilter || filter.directFilter) {
                mileageCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10);
              } else {
                mileageCost = parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
              }
              
              // Check if it's within the range
              return mileageCost >= filter.pointsFilter[0] && mileageCost <= filter.pointsFilter[1] && mileageCost > 0;
            });
          }
        }
      });
      
      // We don't need to filter out routes that don't have applicable segment filters
      // Just keep processing as normal for routes that don't match any segment filter scope
    }
    
    // Apply group filters if they exist and apply to this route
    if (groupFilters && Object.keys(groupFilters).length > 0) {
      const applicableFilters = findApplicableGroupFilters(route, groupFilters);
      
      if (applicableFilters.length > 0) {
        // We need to apply each detailed filter from the group filters
        applicableFilters.forEach(filter => {
          // Skip if there are no flights left
          if (filteredFlights.length === 0) return;
          
          // Apply direct filter from group filter
          if (filter.directFilter) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              return rawFlight[`${classCode}Direct`] === true;
            });
          }
          
          // Apply class filter from group filter
          if (filter.classFilter && Array.isArray(filter.classFilter) && filter.classFilter.length > 0) {
            const classMapping = {
              'Economy': 'Y',
              'Premium Economy': 'W',
              'Business': 'J',
              'First': 'F'
            };
            
            // Map the class names to codes
            const classCodes = filter.classFilter.map(cls => classMapping[cls]).filter(Boolean);
            
            // Skip if this class isn't in the filter
            if (!classCodes.includes(classCode)) {
              filteredFlights = [];
              return;
            }
          }
          
          // Apply source filter from group filter
          if (filter.sourceFilter && filter.sourceFilter.sources && filter.sourceFilter.sources.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight || !rawFlight.source) return false;
              
              const matchesSource = filter.sourceFilter.sources.includes(rawFlight.source);
              return filter.sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
            });
          }
          
          // Apply airlines filter from group filter
          if (filter.airlinesFilter && filter.airlinesFilter.airlines && filter.airlinesFilter.airlines.length > 0) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the airlines based on direct/indirect
              const airlinesString = directFilter 
                ? rawFlight[`${classCode}DirectAirlines`] 
                : rawFlight[`${classCode}Airlines`];
              
              if (!airlinesString) return false;
              
              // Parse the airlines list
              const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
              
              if (filter.airlinesFilter.mode === 'include') {
                // In include mode, at least one airline must be included
                return flightAirlines.some(airline => filter.airlinesFilter.airlines.includes(airline));
              } else {
                // In exclude mode, only filter out if ALL airlines are excluded
                return !flightAirlines.every(airline => filter.airlinesFilter.airlines.includes(airline));
              }
            });
          }
          
          // Apply points filter from group filter
          if (filter.pointsFilter && Array.isArray(filter.pointsFilter) && filter.pointsFilter.length === 2) {
            filteredFlights = filteredFlights.filter(flight => {
              const rawFlight = flight.rawData;
              if (!rawFlight) return false;
              
              // Get the mileage cost based on direct/indirect
              let mileageCost;
              if (directFilter || filter.directFilter) {
                mileageCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10);
              } else {
                mileageCost = parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
              }
              
              // Check if it's within the range
              return mileageCost >= filter.pointsFilter[0] && mileageCost <= filter.pointsFilter[1] && mileageCost > 0;
            });
          }
          
          // Apply date filter from group filter (only if we're on this date)
          if (filter.dateFilter && Array.isArray(filter.dateFilter) && filter.dateFilter.length > 0) {
            // Since we're already looking at a specific date, just check if this date is in the filter
            if (!filter.dateFilter.includes(date)) {
              filteredFlights = [];
              return;
            }
          }
        });
      }
    }
    
    return filteredFlights;
  };
  
  // Get sources for a class
  const getSourcesForClass = (classCode) => {
    if (!flightData || !flightData.data || !flightData.data[date] || 
        !flightData.data[date][route] || !flightData.data[date][route].classes) {
      return [];
    }
    
    const classData = flightData.data[date][route].classes[classCode];
    if (!classData || !classData.sources) return [];
    
    return classData.sources.split(',').map(source => source.trim()).filter(s => s);
  };

  return (
    <div style={{ marginBottom: '4px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: '8px' 
      }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 500,
          minWidth: '60px'
        }}>
          {route}
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          {Object.values(classToCabin).map(classCode => {
            // Check if this class is selected in the filter or no filter is applied
            const isSelected = classesToShow.includes(classCode);
            const isAvailable = isSelected && shouldShowAsAvailable(route, classCode, date, flightData, directFilter, sourceFilter, airlinesFilter, pointsFilter, segmentFilters);
            const flights = getFlightsForClass(classCode);
            
            // Check if any filtered flights are direct
            // This replaces the previous isDirect check
            const hasDirect = flights.some(flight => flight.rawData && flight.rawData[`${classCode}Direct`]);
            
            const sources = getSourcesForClass(classCode);
            
            // Create tooltip ID for this badge
            const tooltipId = `tooltip-${route}-${classCode}-${date}`;
            
            // Check if this tooltip is currently pinned
            const isPinned = pinnedTooltipId === tooltipId;
            
            return (
              <div
                key={classCode}
                data-badge="true"
                data-tooltip-id={tooltipId}
                title={!isSelected ? "Class not selected" : (!isAvailable ? "Not Available" : undefined)}
                style={{
                  backgroundColor: isSelected ? getBackgroundColor(classCode, isAvailable) : '#f5f5f5',
                  color: isSelected ? (isAvailable ? '#684634' : '#999') : '#999',
                  padding: '0px 4px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'Menlo',
                  width: '20px',
                  textAlign: 'center',
                  position: 'relative',
                  cursor: isSelected && isAvailable ? 'pointer' : 'default',
                  boxShadow: isPinned ? '0 0 0 2px #1890ff' : 'none' // Highlight pinned badge
                }}
                onClick={(e) => {
                  if (isSelected && isAvailable && flights.length > 0) {
                    // Only pin the tooltip, don't toggle
                    if (!isPinned) {
                      // If not pinned or different tooltip is pinned, pin this one
                      // First hide any existing pinned tooltip
                      if (pinnedTooltipId) {
                        hideTooltip(pinnedTooltipId);
                        // Make sure we clear the pinnedTooltipId before setting a new one
                        setPinnedTooltipId(null);
                      }
                      
                      // Create new tooltip
                      const tooltip = showTooltip(e, classCode, flights, tooltipId, route, isDetailedView, currencyFilter, directFilter, airlinesFilter, pointsFilter, timeFilters);
                      
                      // Mark as pinned - the DOM property will be set by setPinnedTooltipId
                      if (tooltip) {
                        setPinnedTooltipId(tooltipId);
                        e.stopPropagation(); // Prevent immediate close by document click handler
                      }
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  if (isSelected && isAvailable && flights.length > 0 && !isPinned) {
                    // Set a timer to show the tooltip after 500ms delay
                    const badge = e.currentTarget;
                    badge.hoverTimer = setTimeout(() => {
                      // Only show hover tooltip if this badge isn't pinned and mouse is still over it
                      if (!pinnedTooltipId || pinnedTooltipId !== tooltipId) {
                        showTooltip(e, classCode, flights, tooltipId, route, isDetailedView, currencyFilter, directFilter, airlinesFilter, pointsFilter, timeFilters);
                      }
                      badge.hoverTimer = null;
                    }, 500);
                  }
                }}
                onMouseLeave={(e) => {
                  // Clear the hover timer if it exists
                  const badge = e.currentTarget;
                  if (badge.hoverTimer) {
                    clearTimeout(badge.hoverTimer);
                    badge.hoverTimer = null;
                  }
                  
                  // Only hide if not pinned
                  if (!isPinned) {
                    hideTooltip(tooltipId);
                  }
                }}
              >
                {isSelected ? (isAvailable ? classCode : '-') : '-'}
                {isSelected && isAvailable && !hasDirect && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.7) 3px, rgba(255,255,255,0.7) 6px)',
                      pointerEvents: 'none'
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityBadges;
