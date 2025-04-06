import React, { useState, useRef, useEffect } from 'react';
import { getEnrichedFlightData, getAirlineName, formatTaxes } from '../utils/flightUtils';
import { getSourceByCodename } from '../data/sources';
import airlines from '../data/airlines_full';
import { applyGroupFilters, findApplicableGroupFilters } from '../utils/filterUtils';
import { convertCurrency, formatCurrencyAmount } from '../utils/currencyUtils';

// Static helper function to check if a route has any available badges
export const hasAvailableBadges = (route, date, flightData, directFilter, sourceFilter, airlinesFilter, pointsFilter, classes, groupFilters, segmentFilters) => {
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
        
        const matchesSource = sourceFilter.sources.includes(rawFlight.source);
        return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
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
  isDetailedView
}) => {
  // Ref to track active tooltip
  const activeTooltipRef = useRef(null);
  
  // Add state to track pinned tooltip
  const [pinnedTooltipId, setPinnedTooltipId] = useState(null);
  
  // Add cleanup effect for tooltips
  useEffect(() => {
    return () => {
      // Clean up any tooltips when component unmounts
      if (activeTooltipRef.current) {
        const tooltip = document.getElementById(activeTooltipRef.current);
        if (tooltip && tooltip.parentNode) {
          document.body.removeChild(tooltip);
        }
      }
    };
  }, []);
  
  // Add effect to handle clicks outside tooltip for closing pinned tooltips
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pinnedTooltipId) {
        const tooltip = document.getElementById(pinnedTooltipId);
        // If tooltip exists and the click is outside of it, unpin it
        if (tooltip && !tooltip.contains(e.target)) {
          // Only close if the click is not on a badge element
          const badgeClicked = e.target.closest('[data-badge="true"]');
          if (!badgeClicked || badgeClicked.getAttribute('data-tooltip-id') !== pinnedTooltipId) {
            // Fade out the tooltip
            tooltip.style.opacity = '0';
            setTimeout(() => {
              if (tooltip.parentNode) {
                document.body.removeChild(tooltip);
              }
              if (activeTooltipRef.current === pinnedTooltipId) {
                activeTooltipRef.current = null;
              }
              setPinnedTooltipId(null);
            }, 200);
          }
        }
      }
    };
    
    // Add click listener to document
    document.addEventListener('click', handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [pinnedTooltipId]);
  
  // Class to cabin code mapping
  const classToCabin = {
    'Economy': 'Y',
    'Premium Economy': 'W',
    'Business': 'J',
    'First': 'F'
  };

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
        
        const matchesSource = sourceFilter.sources.includes(rawFlight.source);
        return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
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
  
  // Check if a class is available
  const shouldShowAsAvailable = (classCode) => {
    // Skip if no flight data
    if (!flightData?.data?.[date]?.[route]?.classes?.[classCode]) return false;
    
    const classData = flightData.data[date][route].classes[classCode];
    
    // Skip if not available
    if (!classData || !classData.available) return false;
    
    // Skip if direct filter is on and this class doesn't have direct flights
    if (directFilter && !classData.direct) return false;
    
    // Get enriched flight data
    const flights = getEnrichedFlightData(route, classCode, date, classData, flightData);
    
    // Apply all filters and check if any flights remain
    const filteredFlights = getFlightsForClassWithFilters(classCode, flights);
    
    // Return true only if there are flights remaining after all filters
    return filteredFlights.length > 0;
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
  
  // Create enhanced tooltip content with better styling and airline logos
  const createEnhancedTooltip = (classCode, flights) => {
    // Create a div element for the tooltip content
    const tooltipDiv = document.createElement('div');
    tooltipDiv.style.width = '620px'; // Increased width for the tooltip to accommodate full airline names
    tooltipDiv.style.padding = '12px';
    tooltipDiv.style.backgroundColor = 'white';
    tooltipDiv.style.borderRadius = '8px';
    tooltipDiv.style.boxShadow = '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)';
    tooltipDiv.style.fontFamily = 'Menlo, monospace';
    tooltipDiv.style.fontSize = '12px';
    // Remove scrolling
    tooltipDiv.style.maxHeight = 'none'; 
    tooltipDiv.style.overflowY = 'visible';
    tooltipDiv.style.transition = 'opacity 0.2s'; // Smooth fade-in effect
    tooltipDiv.style.display = 'flex';
    tooltipDiv.style.flexDirection = 'column';
    
    // Add title (fixed at the top)
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.fontSize = '14px';
    titleDiv.style.marginBottom = '12px';
    titleDiv.style.borderBottom = '1px solid #f0f0f0';
    titleDiv.style.paddingBottom = '8px';
    titleDiv.style.position = 'sticky';
    titleDiv.style.top = '0';
    titleDiv.style.backgroundColor = 'white';
    titleDiv.style.zIndex = '2';
    titleDiv.textContent = `${route} - ${classCode} Class`;
    
    // If direct filter is on, add an indicator
    if (directFilter) {
      const filterIndicator = document.createElement('span');
      filterIndicator.textContent = ' (Direct Only)';
      filterIndicator.style.fontSize = '12px';
      filterIndicator.style.color = '#52c41a';
      filterIndicator.style.fontWeight = 'normal';
      titleDiv.appendChild(filterIndicator);
    }
    
    tooltipDiv.appendChild(titleDiv);
    
    // Create table header (sticky below the title)
    const headerRow = document.createElement('div');
    headerRow.style.display = 'grid';
    headerRow.style.gridTemplateColumns = '3fr 80px 2.5fr 120px'; // Increased width for airlines column
    headerRow.style.backgroundColor = '#fafafa';
    headerRow.style.padding = '8px 4px';
    headerRow.style.fontWeight = '500';
    headerRow.style.borderBottom = '1px solid #f0f0f0';
    headerRow.style.position = 'sticky';
    headerRow.style.top = titleDiv.clientHeight + 'px';
    headerRow.style.zIndex = '1';
    
    const programHeader = document.createElement('div');
    programHeader.textContent = 'Program';
    
    const typeHeader = document.createElement('div');
    typeHeader.textContent = 'Type';
    typeHeader.style.textAlign = 'center';
    
    const airlinesHeader = document.createElement('div');
    airlinesHeader.textContent = 'Airlines';
    
    const priceHeader = document.createElement('div');
    priceHeader.textContent = 'Price';
    priceHeader.style.textAlign = 'right';
    
    headerRow.appendChild(programHeader);
    headerRow.appendChild(typeHeader);
    headerRow.appendChild(airlinesHeader);
    headerRow.appendChild(priceHeader);
    tooltipDiv.appendChild(headerRow);
    
    // Create the scrollable container for rows
    const rowsContainer = document.createElement('div');
    // Remove scrolling from rows container
    rowsContainer.style.overflowY = 'visible';
    rowsContainer.style.flex = '1';
    
    // Process each flight and format for display
    let processedFlightCount = 0;
    const MAX_DISPLAYED_FLIGHTS = 12; // Limit the number of flights shown
    
    // Sort flights by airline name
    const sortedFlights = [...flights].sort((a, b) => {
      const sourceA = getSourceByCodename(a.rawData?.source || '');
      const sourceB = getSourceByCodename(b.rawData?.source || '');
      
      // If sources are found, sort by airline name
      if (sourceA && sourceB) {
        return sourceA.airline.localeCompare(sourceB.airline);
      }
      
      // If one source is not found, put it at the end
      if (!sourceA) return 1;
      if (!sourceB) return -1;
      
      // Fallback to source codename
      return (a.rawData?.source || '').localeCompare(b.rawData?.source || '');
    });
    
    sortedFlights.forEach((flight, index) => {
      // Stop processing if we've reached the maximum
      if (processedFlightCount >= MAX_DISPLAYED_FLIGHTS) return;
      
      // Get raw flight data
      const rawFlight = flight.rawData;
      if (!rawFlight) return;
      
      // Variables to track if we need to show direct, indirect, or both
      const hasDirect = rawFlight[`${classCode}Direct`];
      const hasIndirect = rawFlight[`${classCode}Available`];
      const directCost = parseInt(rawFlight[`${classCode}DirectMileageCost`] || "0", 10);
      const indirectCost = parseInt(rawFlight[`${classCode}MileageCost`] || "0", 10);
      
      // Check if we have a cheaper indirect option - this is the standard case
      const showBothOptions = hasDirect && indirectCost < directCost;
      
      // Check if we need to show indirect due to airline filter - only if there's a relevant airline filter
      let showIndirectForAirlineFilter = false;
      
      if (airlinesFilter.airlines && airlinesFilter.airlines.length > 0 && hasDirect && hasIndirect && directCost === indirectCost) {
        // Get airlines for direct and indirect
        const directAirlinesStr = rawFlight[`${classCode}DirectAirlines`] || '';
        const indirectAirlinesStr = rawFlight[`${classCode}Airlines`] || '';
        
        const directAirlines = directAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
        const indirectAirlines = indirectAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
        
        // Only process if the airline filter is relevant to this row
        const filterIsRelevantToRow = airlinesFilter.mode === 'include' 
          ? indirectAirlines.some(airline => airlinesFilter.airlines.includes(airline))
          : indirectAirlines.some(airline => !airlinesFilter.airlines.includes(airline));
        
        if (filterIsRelevantToRow) {
          // Check if there's an airline in indirect that's not in direct and matches filter
          if (airlinesFilter.mode === 'include') {
            // In include mode, check if indirect has filtered airlines that direct doesn't
            const hasUniqueFilteredAirline = indirectAirlines.some(airline => 
              airlinesFilter.airlines.includes(airline) && !directAirlines.includes(airline)
            );
            showIndirectForAirlineFilter = hasUniqueFilteredAirline;
          } else {
            // In exclude mode, more complex - check if indirect has acceptable airlines that direct doesn't
            const allDirectAirlinesExcluded = directAirlines.every(airline => 
              airlinesFilter.airlines.includes(airline)
            );
            const someIndirectAirlinesNotExcluded = indirectAirlines.some(airline => 
              !airlinesFilter.airlines.includes(airline)
            );
            showIndirectForAirlineFilter = allDirectAirlinesExcluded && someIndirectAirlinesNotExcluded;
          }
        }
      }
      
      // Check airline filters for direct and indirect flights
      let showDirect = hasDirect;
      let showIndirect = hasIndirect && !directFilter;
      
      // Apply airline filter if active
      if (airlinesFilter.airlines && airlinesFilter.airlines.length > 0) {
        // Get airlines for direct and indirect
        const directAirlinesStr = rawFlight[`${classCode}DirectAirlines`] || '';
        const indirectAirlinesStr = rawFlight[`${classCode}Airlines`] || '';
        
        const directAirlines = directAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
        const indirectAirlines = indirectAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
        
        // Check if flights match airline filter
        if (airlinesFilter.mode === 'include') {
          // In include mode, at least one airline must be included
          const directHasFilteredAirline = directAirlines.some(airline => 
            airlinesFilter.airlines.includes(airline)
          );
          const indirectHasFilteredAirline = indirectAirlines.some(airline => 
            airlinesFilter.airlines.includes(airline)
          );
          
          // Only show direct if it has filtered airlines
          showDirect = showDirect && directHasFilteredAirline;
          
          // Only show indirect if it has filtered airlines and direct filter is off
          showIndirect = showIndirect && indirectHasFilteredAirline;
        } else {
          // In exclude mode
          const allDirectAirlinesExcluded = directAirlines.every(airline => 
            airlinesFilter.airlines.includes(airline)
          );
          const allIndirectAirlinesExcluded = indirectAirlines.every(airline => 
            airlinesFilter.airlines.includes(airline)
          );
          
          // Hide direct if all its airlines are excluded
          showDirect = showDirect && !allDirectAirlinesExcluded;
          
          // Hide indirect if all its airlines are excluded
          showIndirect = showIndirect && !allIndirectAirlinesExcluded;
        }
      } else {
        // If no airline filter, indirect flights are only shown if they're cheaper
        showIndirect = showIndirect && ((!hasDirect) || showBothOptions);
      }
      
      // Function to create a flight row
      const createFlightRow = (isDirect) => {
        // Skip if we've reached the maximum
        if (processedFlightCount >= MAX_DISPLAYED_FLIGHTS) return null;
        
        // Skip indirect flights when direct filter is enabled
        if (directFilter && !isDirect) return null;
        
        processedFlightCount++; // Increment counter
        
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '3fr 80px 2.5fr 120px'; // Increased width for airlines column
        row.style.padding = '8px 4px';
        row.style.borderBottom = '1px solid #f0f0f0';
        row.style.alignItems = 'start';
        
        // Program/source cell with logo
        const sourceCell = document.createElement('div');
        sourceCell.style.display = 'flex';
        sourceCell.style.alignItems = 'center';
        sourceCell.style.gap = '8px';
        
        if (rawFlight.source) {
          const source = getSourceByCodename(rawFlight.source);
          if (source && source.iata) {
            const logo = document.createElement('img');
            logo.src = `/${source.iata}.png`;
            logo.alt = source.airline;
            logo.style.width = '24px';
            logo.style.height = '24px';
            logo.style.objectFit = 'contain';
            logo.style.borderRadius = '4px';
            logo.onerror = function() {
              this.style.display = 'none';
            };
            sourceCell.appendChild(logo);
          }
          
          const nameSpan = document.createElement('span');
          nameSpan.textContent = getAirlineName(rawFlight.source);
          sourceCell.appendChild(nameSpan);
        }
        
        // Type cell
        const typeCell = document.createElement('div');
        typeCell.style.display = 'flex';
        typeCell.style.justifyContent = 'center';
        typeCell.style.alignItems = 'center';
        
        const typeIndicator = document.createElement('div');
        typeIndicator.style.fontSize = '10px';
        typeIndicator.style.fontWeight = 'bold';
        typeIndicator.style.padding = '2px 6px';
        typeIndicator.style.borderRadius = '3px';
        typeIndicator.style.display = 'inline-block';
        
        if (isDirect) {
          typeIndicator.textContent = 'Direct';
          typeIndicator.style.backgroundColor = '#e6f7e6';
          typeIndicator.style.color = '#52c41a';
        } else {
          typeIndicator.textContent = 'Indirect';
          typeIndicator.style.backgroundColor = '#fff1f0';
          typeIndicator.style.color = '#f5222d';
        }
        
        typeCell.appendChild(typeIndicator);
        
        // Airlines cell
        const airlinesCell = document.createElement('div');
        
        // Get airlines list
        const airlinesString = isDirect
          ? rawFlight[`${classCode}DirectAirlines`]
          : rawFlight[`${classCode}Airlines`];
        
        if (airlinesString && airlinesString.trim() !== '') {
          // Parse and sort airline codes alphabetically
          const airlinesCodes = airlinesString
            .split(',')
            .map(a => a.trim())
            .filter(a => a)
            .sort((a, b) => a.localeCompare(b));
          
          // Create a list of airlines with individual items
          const airlinesList = document.createElement('div');
          airlinesList.style.display = 'flex';
          airlinesList.style.flexDirection = 'column';
          airlinesList.style.gap = '4px';
          
          airlinesCodes.forEach(airlineCode => {
            if (!airlineCode.trim()) return;
            
            // Find the full airline name from airlines_full.js
            const airlineInfo = airlines.find(airline => airline.value === airlineCode.trim());
            const airlineLabel = airlineInfo ? airlineInfo.label : airlineCode;
            
            const airlineItem = document.createElement('div');
            airlineItem.style.display = 'flex';
            airlineItem.style.alignItems = 'center';
            airlineItem.style.gap = '6px';
            airlineItem.style.fontSize = '11px';
            airlineItem.style.padding = '2px 0';
            
            // Add airline logo
            try {
              const logo = document.createElement('img');
              logo.src = `/${airlineCode}.png`;
              logo.alt = airlineCode;
              logo.style.width = '18px';
              logo.style.height = '18px';
              logo.style.objectFit = 'contain';
              logo.style.borderRadius = '4px';
              logo.onerror = function() {
                this.style.display = 'none';
              };
              airlineItem.appendChild(logo);
            } catch (e) {}
            
            // Create a container for the airline name to support truncation
            const nameContainer = document.createElement('div');
            nameContainer.style.overflow = 'hidden';
            nameContainer.style.textOverflow = 'ellipsis';
            nameContainer.style.whiteSpace = 'nowrap';
            nameContainer.style.maxWidth = '100%';
            nameContainer.style.flex = '1';
            
            // Add airline name using the full label
            const airlineText = document.createElement('span');
            airlineText.textContent = airlineLabel;
            airlineText.style.fontSize = '11px';
            
            // Add title attribute as tooltip for truncated text
            nameContainer.title = airlineLabel;
            
            nameContainer.appendChild(airlineText);
            airlineItem.appendChild(nameContainer);
            
            airlinesList.appendChild(airlineItem);
          });
          
          airlinesCell.appendChild(airlinesList);
        } else {
          const noAirlinesText = document.createElement('div');
          noAirlinesText.textContent = 'No airline data';
          noAirlinesText.style.color = '#999';
          noAirlinesText.style.fontStyle = 'italic';
          noAirlinesText.style.fontSize = '11px';
          airlinesCell.appendChild(noAirlinesText);
        }
        
        // Price cell
        const priceCell = document.createElement('div');
        priceCell.style.textAlign = 'right';
        
        // Format the price information
        const mileageCost = isDirect
          ? rawFlight[`${classCode}DirectMileageCost`]
          : rawFlight[`${classCode}MileageCost`];
        
        const totalTaxes = isDirect
          ? rawFlight[`${classCode}DirectTotalTaxes`]
          : rawFlight[`${classCode}TotalTaxes`];
        
        const currency = rawFlight.TaxesCurrency || '';
        
        if (mileageCost && parseInt(mileageCost, 10) > 0) {
          const formattedMiles = parseInt(mileageCost, 10).toLocaleString();
          
          const milesSpan = document.createElement('div');
          milesSpan.style.fontWeight = 'bold';
          milesSpan.textContent = `${formattedMiles} miles`;
          priceCell.appendChild(milesSpan);
          
          const taxesSpan = document.createElement('div');
          taxesSpan.style.fontSize = '11px';
          taxesSpan.style.color = '#666';
          
          if (totalTaxes && parseInt(totalTaxes, 10) > 0) {
            // Format taxes with currency conversion if enabled
            const formatTaxesAndDisplay = async () => {
              try {
                const formattedTaxes = await formatTaxes(
                  parseInt(totalTaxes, 10) / 100,
                  currency,
                  currencyFilter,
                  true // Add parameter to use currency code instead of symbol
                );
                taxesSpan.textContent = `+ ${formattedTaxes}`;
              } catch (error) {
                console.error('Error formatting taxes:', error);
            const formattedTaxes = (parseInt(totalTaxes, 10) / 100).toFixed(2);
            taxesSpan.textContent = `+ ${currency} ${formattedTaxes}`;
              }
            };
            formatTaxesAndDisplay();
          } else {
            taxesSpan.textContent = 'Taxes and fees are not available';
            taxesSpan.style.fontStyle = 'italic';
          }
          
          priceCell.appendChild(taxesSpan);
        } else {
          const noPriceText = document.createElement('div');
          noPriceText.textContent = 'No price data';
          noPriceText.style.color = '#999';
          noPriceText.style.fontStyle = 'italic';
          noPriceText.style.fontSize = '11px';
          priceCell.appendChild(noPriceText);
        }
        
        // Add all cells to the row
        row.appendChild(sourceCell);
        row.appendChild(typeCell);
        row.appendChild(airlinesCell);
        row.appendChild(priceCell);
        
        return row;
      };
      
      // Add direct row if it passes filters
      if (showDirect) {
        const directRow = createFlightRow(true);
        if (directRow) rowsContainer.appendChild(directRow);
      }
      
      // Add indirect row if it passes filters
      // Now it includes the case where it has relevant airlines for the filter
      if (showIndirect || (showIndirectForAirlineFilter && !directFilter)) {
        const indirectRow = createFlightRow(false);
        if (indirectRow) rowsContainer.appendChild(indirectRow);
      }
    });
    
    // If no valid entries were found, show a message
    if (rowsContainer.childElementCount === 0) {
      const noDataDiv = document.createElement('div');
      noDataDiv.style.padding = '16px';
      noDataDiv.style.textAlign = 'center';
      noDataDiv.style.color = '#999';
      noDataDiv.textContent = 'No detailed information available for this flight';
      rowsContainer.appendChild(noDataDiv);
    }
    
    // If we've hit the limit, show a message indicating more results are available
    const totalFlights = flights.length;
    if (totalFlights > MAX_DISPLAYED_FLIGHTS) {
      const moreDiv = document.createElement('div');
      moreDiv.style.padding = '8px 4px';
      moreDiv.style.textAlign = 'center';
      moreDiv.style.color = '#666';
      moreDiv.style.fontSize = '11px';
      moreDiv.style.fontStyle = 'italic';
      moreDiv.style.borderTop = '1px solid #f0f0f0';
      moreDiv.textContent = `+ ${totalFlights - processedFlightCount} more options`;
      rowsContainer.appendChild(moreDiv);
    }
    
    // Append the rows container to the tooltip
    tooltipDiv.appendChild(rowsContainer);
    
    return tooltipDiv;
  };

  // Create detailed tooltip for the detailed view
  const createDetailedTooltip = (classCode, flights) => {
    // Create a div element for the tooltip content
    const tooltipDiv = document.createElement('div');
    tooltipDiv.style.width = '950px'; // Increased width significantly from 650px
    tooltipDiv.style.padding = '12px';
    tooltipDiv.style.backgroundColor = 'white';
    tooltipDiv.style.borderRadius = '8px';
    tooltipDiv.style.boxShadow = '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)';
    tooltipDiv.style.fontFamily = 'Menlo, monospace';
    tooltipDiv.style.fontSize = '12px';
    tooltipDiv.style.maxHeight = 'none';
    tooltipDiv.style.overflowY = 'visible';
    tooltipDiv.style.transition = 'opacity 0.2s';
    tooltipDiv.style.display = 'flex';
    tooltipDiv.style.flexDirection = 'column';
    
    // Add title (fixed at the top)
    const titleDiv = document.createElement('div');
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.fontSize = '14px';
    titleDiv.style.marginBottom = '12px';
    titleDiv.style.borderBottom = '1px solid #f0f0f0';
    titleDiv.style.paddingBottom = '8px';
    titleDiv.style.position = 'sticky';
    titleDiv.style.top = '0';
    titleDiv.style.backgroundColor = 'white';
    titleDiv.style.zIndex = '2';
    titleDiv.textContent = `${route} - ${classCode} Class (Detailed View)`;
    
    tooltipDiv.appendChild(titleDiv);
    
    // Create table header
    const headerRow = document.createElement('div');
    headerRow.style.display = 'grid';
    headerRow.style.gridTemplateColumns = '1.8fr 1fr 1.2fr 1.2fr 0.8fr 0.8fr 1.2fr 1.2fr'; // Adjusted column widths for better spacing
    headerRow.style.backgroundColor = '#fafafa';
    headerRow.style.padding = '8px 4px';
    headerRow.style.fontWeight = '500';
    headerRow.style.borderBottom = '1px solid #f0f0f0';
    headerRow.style.position = 'sticky';
    headerRow.style.top = titleDiv.clientHeight + 'px';
    headerRow.style.zIndex = '1';
    
    const pathHeader = document.createElement('div');
    pathHeader.textContent = 'Path';
    
    const flightNumberHeader = document.createElement('div');
    flightNumberHeader.textContent = 'Flight Number';
    
    const airlinesHeader = document.createElement('div');
    airlinesHeader.textContent = 'Airlines';
    
    const aircraftHeader = document.createElement('div');
    aircraftHeader.textContent = 'Aircraft';
    
    const departsHeader = document.createElement('div');
    departsHeader.textContent = 'Departs';
    
    const arrivesHeader = document.createElement('div');
    arrivesHeader.textContent = 'Arrives';
    
    const sourceHeader = document.createElement('div');
    sourceHeader.textContent = 'Source';
    
    const priceHeader = document.createElement('div');
    priceHeader.textContent = 'Price';
    priceHeader.style.textAlign = 'right';
    
    headerRow.appendChild(pathHeader);
    headerRow.appendChild(flightNumberHeader);
    headerRow.appendChild(airlinesHeader);
    headerRow.appendChild(aircraftHeader);
    headerRow.appendChild(departsHeader);
    headerRow.appendChild(arrivesHeader);
    headerRow.appendChild(sourceHeader);
    headerRow.appendChild(priceHeader);
    tooltipDiv.appendChild(headerRow);
    
    // Create the container for trip rows
    const rowsContainer = document.createElement('div');
    rowsContainer.style.overflowY = 'visible';
    rowsContainer.style.flex = '1';
    
    // Process each flight's available trips
    let processedFlights = 0;
    const MAX_DISPLAYED_FLIGHTS = 10;
    
    // Instead of just using flights[0], iterate through all flights to show all sources
    for (const flight of flights) {
      // Skip if we've reached the maximum displayed flights
      if (processedFlights >= MAX_DISPLAYED_FLIGHTS) break;
      
      // Check if this flight has availability trips
      if (!flight.rawData || !flight.rawData.AvailabilityTrips) continue;
      
      const flightSource = flight.rawData.source || '';
      const availabilityTrips = flight.rawData.AvailabilityTrips;
      
      // Loop through each trip and create a row
      availabilityTrips.forEach((trip, index) => {
        if (processedFlights >= MAX_DISPLAYED_FLIGHTS) return;
        
        // Extract origin, connections, and destination to create path
        const [origin, destination] = route.split('-');
        
        // Ensure connections is always an array, even if it's undefined or null
        const connections = Array.isArray(trip.connections) ? trip.connections : [];
        
        // Construct the path with connections
        const pathText = [origin, ...connections, destination].join('-');
        
        // Format departure and arrival times
        const departsAt = new Date(trip.DepartsAt);
        const arrivesAt = new Date(trip.ArrivesAt);
        
        // Format time as HH:MM
        const formatTime = (date) => {
          return date.toTimeString().substring(0, 5);
        };
            
        // Check if arrival is on a different day than departure
        const isDifferentDay = arrivesAt.getDate() !== departsAt.getDate() || 
                               arrivesAt.getMonth() !== departsAt.getMonth() || 
                               arrivesAt.getFullYear() !== departsAt.getFullYear();
        
        // Create the row
        const row = document.createElement('div');
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '1.8fr 1fr 1.2fr 1.2fr 0.8fr 0.8fr 1.2fr 1.2fr';
        row.style.padding = '8px 4px';
        row.style.borderBottom = '1px solid #f0f0f0';
        
        // Path cell with improved styling to highlight connections
        const pathCell = document.createElement('div');
        
        // If there are connections, style them differently to make them more visible
        if (connections.length > 0) {
          // Create a formatted path with visual emphasis on connections
          const pathParts = [];
          pathParts.push(document.createTextNode(origin));
          
          connections.forEach(connection => {
            pathParts.push(document.createTextNode('-'));
            
            const connectionSpan = document.createElement('span');
            connectionSpan.textContent = connection;
            connectionSpan.style.fontWeight = 'bold';
            connectionSpan.style.color = '#1890ff'; // Highlight connection in blue
            pathParts.push(connectionSpan);
          });
          
          pathParts.push(document.createTextNode('-' + destination));
          
          // Add all parts to the path cell
          pathParts.forEach(part => pathCell.appendChild(part));
        } else {
          // No connections, just use the text
          pathCell.textContent = pathText;
        }
        
        // Flight number cell with each number on a new line
        const flightNumberCell = document.createElement('div');
        trip.FlightNumbers.forEach((number, i) => {
          if (i > 0) flightNumberCell.appendChild(document.createElement('br'));
          flightNumberCell.appendChild(document.createTextNode(number));
        });
        
        // Airlines cell (empty for now as requested)
        const airlinesCell = document.createElement('div');
        
        // Aircraft cell with each aircraft on a new line
        const aircraftCell = document.createElement('div');
        trip.Aircraft.forEach((aircraft, i) => {
          if (i > 0) aircraftCell.appendChild(document.createElement('br'));
          aircraftCell.appendChild(document.createTextNode(aircraft));
        });
        
        // Departure time cell
        const departsCell = document.createElement('div');
        departsCell.textContent = formatTime(departsAt);
        
        // Arrival time cell
        const arrivesCell = document.createElement('div');
        arrivesCell.textContent = formatTime(arrivesAt);
        if (isDifferentDay) {
          arrivesCell.textContent += ' (+1)';
        }
        
        // Source cell - use the source from the current flight
        const sourceCell = document.createElement('div');
        sourceCell.textContent = flightSource;
        
        // Price cell - shows mileage and taxes similar to summary view
        const priceCell = document.createElement('div');
        priceCell.style.textAlign = 'right';
        
        // Get appropriate mile and tax values based on classCode
        let mileValue, taxValue;
        if (classCode === 'Y') {
          mileValue = trip.YMile;
          taxValue = trip.YTaxes;
        } else if (classCode === 'W') {
          mileValue = trip.WMile;
          taxValue = trip.WTaxes;
        } else if (classCode === 'J') {
          mileValue = trip.JMile;
          taxValue = trip.JTaxes;
        } else if (classCode === 'F') {
          mileValue = trip.FMile;
          taxValue = trip.FTaxes;
        }
        
        // Add mileage and taxes information
        if (mileValue) {
          const mileText = document.createElement('div');
          mileText.textContent = `${mileValue.toLocaleString()} miles`;
          priceCell.appendChild(mileText);
        }
        
        if (taxValue) {
          const taxText = document.createElement('div');
          const formattedTax = typeof taxValue === 'number' 
            ? `$${(taxValue / 100).toFixed(2)}`
            : taxValue;
          taxText.textContent = `+ ${formattedTax}`;
          taxText.style.fontSize = '10px';
          taxText.style.color = '#888';
          priceCell.appendChild(taxText);
        }
        
        // Add cells to row
        row.appendChild(pathCell);
        row.appendChild(flightNumberCell);
        row.appendChild(airlinesCell);
        row.appendChild(aircraftCell);
        row.appendChild(departsCell);
        row.appendChild(arrivesCell);
        row.appendChild(sourceCell);
        row.appendChild(priceCell);
        
        // Add row to container
        rowsContainer.appendChild(row);
        processedFlights++;
      });
    }
    
    // If no trips found, show a message
    if (rowsContainer.childElementCount === 0) {
      const noDataDiv = document.createElement('div');
      noDataDiv.style.padding = '16px';
      noDataDiv.style.textAlign = 'center';
      noDataDiv.style.color = '#999';
      noDataDiv.textContent = 'No detailed trip information available for this flight';
      rowsContainer.appendChild(noDataDiv);
    }
    
    // Count total trips across all flights
    let totalTrips = 0;
    flights.forEach(flight => {
      if (flight.rawData && flight.rawData.AvailabilityTrips) {
        totalTrips += flight.rawData.AvailabilityTrips.length;
      }
    });
    
    // Add a message if there are more trips than shown
    if (totalTrips > MAX_DISPLAYED_FLIGHTS) {
      const moreDiv = document.createElement('div');
      moreDiv.style.padding = '8px 4px';
      moreDiv.style.textAlign = 'center';
      moreDiv.style.color = '#666';
      moreDiv.style.fontSize = '11px';
      moreDiv.style.fontStyle = 'italic';
      moreDiv.style.borderTop = '1px solid #f0f0f0';
      moreDiv.textContent = `+ ${totalTrips - processedFlights} more trips`;
      rowsContainer.appendChild(moreDiv);
    }
    
    // Append the rows container to the tooltip
    tooltipDiv.appendChild(rowsContainer);
    
    return tooltipDiv;
  };

  // Function to create or show tooltip
  const showTooltip = (e, classCode, flights, tooltipId) => {
    if (!flights || flights.length === 0) return;
                    
                    // Remove any existing tooltip with the same ID
                    const existingTooltip = document.getElementById(tooltipId);
                    if (existingTooltip) {
                      document.body.removeChild(existingTooltip);
                    }
                    
    // Also remove any other active tooltips that aren't pinned
    if (activeTooltipRef.current && activeTooltipRef.current !== tooltipId && activeTooltipRef.current !== pinnedTooltipId) {
                      const oldTooltip = document.getElementById(activeTooltipRef.current);
                      if (oldTooltip) {
                        document.body.removeChild(oldTooltip);
                      }
                    }
                    
                    // Save current tooltip ID as active
                    activeTooltipRef.current = tooltipId;
                    
    // Create and populate the tooltip element based on view mode
    const tooltip = isDetailedView 
      ? createDetailedTooltip(classCode, flights)
      : createEnhancedTooltip(classCode, flights);
                    tooltip.id = tooltipId;
    tooltip.style.position = 'fixed';
                    tooltip.style.zIndex = '1000';
                    tooltip.style.opacity = '0'; // Start invisible for smooth fade-in
                    
                    // Add tooltip to the document body to get its dimensions
                    document.body.appendChild(tooltip);
                    
                    // Calculate optimal position to ensure tooltip stays within viewport
                    const tooltipRect = tooltip.getBoundingClientRect();
                    const viewportWidth = window.innerWidth;
                    const viewportHeight = window.innerHeight;
                    
                    // Calculate initial position (10px offset from cursor)
                    let left = e.clientX + 10;
                    let top = e.clientY + 10;
                    
                    // Adjust horizontal position if tooltip would overflow right edge
                    if (left + tooltipRect.width > viewportWidth - 20) {
                      left = Math.max(20, e.clientX - tooltipRect.width - 10);
                    }
                    
                    // Adjust vertical position if tooltip would overflow bottom edge
                    if (top + tooltipRect.height > viewportHeight - 20) {
                      top = Math.max(20, viewportHeight - tooltipRect.height - 20);
                    }
                    
                    // Apply calculated position
                    tooltip.style.left = `${left}px`;
                    tooltip.style.top = `${top}px`;
                    
                    // Fade in the tooltip
                    setTimeout(() => {
                      tooltip.style.opacity = '1';
                    }, 10);
    
    return tooltip;
  };
  
  // Function to handle hiding unpinned tooltips
  const hideTooltip = (tooltipId) => {
    // Don't hide if this is the pinned tooltip
    if (tooltipId === pinnedTooltipId) return;
    
                  const tooltip = document.getElementById(tooltipId);
                  if (tooltip) {
                    // Fade out and then remove tooltip
                    tooltip.style.opacity = '0';
                    setTimeout(() => {
                      if (tooltip.parentNode) {
                        document.body.removeChild(tooltip);
                      }
                      if (activeTooltipRef.current === tooltipId) {
                        activeTooltipRef.current = null;
                      }
                    }, 200);
    }
  };

  // Get classes to show for this route
  const classesToShow = Array.isArray(classes) && classes.length > 0 
    ? classes.map(cls => classToCabin[cls]).filter(c => c) // Map to cabin codes and filter out undefined
    : Object.values(classToCabin); // If classes not provided, show all
  
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
            const isAvailable = isSelected && shouldShowAsAvailable(classCode);
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
                    // Toggle pinned state
                    if (isPinned) {
                      // If already pinned, unpin it
                      setPinnedTooltipId(null);
                      hideTooltip(tooltipId);
                    } else {
                      // If not pinned or different tooltip is pinned, pin this one
                      // First hide any existing pinned tooltip
                      if (pinnedTooltipId) {
                        hideTooltip(pinnedTooltipId);
                      }
                      // Create new tooltip
                      const tooltip = showTooltip(e, classCode, flights, tooltipId);
                      setPinnedTooltipId(tooltipId);
                      e.stopPropagation(); // Prevent immediate close by document click handler
                    }
                  }
                }}
                onMouseEnter={(e) => {
                  if (isSelected && isAvailable && flights.length > 0 && !isPinned) {
                    // Only show hover tooltip if this badge isn't pinned
                    showTooltip(e, classCode, flights, tooltipId);
                  }
                }}
                onMouseLeave={() => {
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
