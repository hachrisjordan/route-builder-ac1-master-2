import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Typography, Checkbox, Dropdown, Button, Menu, Switch } from 'antd';
import { DownOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// Component imports
import DateGrid from './components/DateGrid';

// Filter components
import SegmentsFilter from './filters/SegmentsFilter';
import ClassFilter from './filters/ClassFilter';
import SourcesFilter from './filters/SourcesFilter';
import AirlinesFilter from './filters/AirlinesFilter';
import PointsFilter from './filters/PointsFilter';
import DatesFilter from './filters/DatesFilter';
import AdditionalFilter from './filters/AdditionalFilter';
import OthersFilter from './filters/OthersFilter';

// Utility functions
import { formatDateForDisplay } from './utils/dateUtils';
import { 
  isValidSegmentForRoute, 
  compareSegments, 
  sortSegments,
  getAirlineName
} from './utils/flightUtils';
import { filterFlights, passesGroupFilter } from './utils/filterUtils';
import { 
  renderOriginDropdown, 
  renderDestDropdown, 
  renderSegmentsDropdownSimple 
} from './utils/dropdownUtils';
import { getSourceByCodename } from './data/sources';
import airlines from './data/airlines_full';
import { airportGroups, airportGroupDescriptions } from './data/airportGroups';
import { airports } from './data/airports';

const { Title } = Typography;

const NormalFlightAvailabilityCalendar = ({ flightData, currentRoute, onDateRangeSelect, selectedRange }) => {
  // State initialization
  const [currentMonth, setCurrentMonth] = useState(dayjs().month());
  const [currentYear, setCurrentYear] = useState(dayjs().year());
  const [localSelectionStart, setLocalSelectionStart] = useState(null);
  const [localSelectionEnd, setLocalSelectionEnd] = useState(null);
  const [error, setError] = useState('');
  // Add detailed view toggle state
  const [isDetailedView, setIsDetailedView] = useState(false);
  // Pagination state - store current page for each cell by date
  const [cellPages, setCellPages] = useState({});
  // Ref to track active tooltip ID
  const activeTooltipRef = useRef(null);
  // Segment filter state
  const [segmentFilter, setSegmentFilter] = useState({
    mode: 'include',
    segments: []
  });
  const [segmentSearchText, setSegmentSearchText] = useState('');
  // Add segment order state to control the display order
  const [segmentOrder, setSegmentOrder] = useState([]);
  // Class filter state
  const [classFilter, setClassFilter] = useState([]);
  // Direct filter state
  const [directFilter, setDirectFilter] = useState(false);
  // Source filter state
  const [sourceFilter, setSourceFilter] = useState({
    mode: 'include',
    sources: []
  });
  const [sourceSearchText, setSourceSearchText] = useState('');
  // Points filter state
  const [pointsFilter, setPointsFilter] = useState(null);
  // Add airlines filter state
  const [airlinesFilter, setAirlinesFilter] = useState({
    mode: 'include',
    airlines: []
  });
  const [airlinesSearchText, setAirlinesSearchText] = useState('');
  // Date filter state
  const [dateFilter, setDateFilter] = useState([]);
  const [dateSearchText, setDateSearchText] = useState('');
  
  // Change additionalFilterType to an array of filter objects
  const [additionalFilters, setAdditionalFilters] = useState([]); // Array of {id, type} objects
  
  // Add state for group-based filters and segment-based filters
  const [groupFilters, setGroupFilters] = useState({}); // { filterId: { originFilter: {}, destFilter: {} } }
  const [segmentFilters, setSegmentFilters] = useState({}); // { filterId: { segments: [] } }
  
  // Add logging to track filter state changes
  useEffect(() => {
    console.log('[DEBUG] groupFilters updated:', groupFilters);
  }, [groupFilters]);
  
  useEffect(() => {
    console.log('[DEBUG] segmentFilters updated:', segmentFilters);
  }, [segmentFilters]);
  
  // Clean up segment filters when current route changes
  useEffect(() => {
    // Clean up any invalid segments from filters when route changes
    if (Object.keys(segmentFilters).length > 0) {
      setSegmentFilters(prev => {
        const newFilters = {};
        Object.entries(prev).forEach(([filterId, filter]) => {
          const validSegments = filter.segments.filter(segment => 
            isValidSegmentForRoute(segment, currentRoute)
          );
          
          newFilters[filterId] = {
            ...filter,
            segments: validSegments
          };
        });
        return newFilters;
      });
    }
    
    // Also clean up global segment filter
    if (segmentFilter.segments.length > 0) {
      setSegmentFilter(prev => ({
        ...prev,
        segments: prev.segments.filter(segment => 
          isValidSegmentForRoute(segment, currentRoute)
        )
      }));
    }
  }, [currentRoute]);
  
  // Manual forceUpdate function to help with re-renders
  const [, forceUpdate] = useState();
  
  // Listen for custom events to force re-renders
  useEffect(() => {
    const handleCustomEvent = () => {
      console.log('[DEBUG] Force update triggered');
      forceUpdate({});
    };
    
    document.addEventListener('change', handleCustomEvent);
    
    return () => {
      document.removeEventListener('change', handleCustomEvent);
    };
  }, []);
  
  // Search text states
  const [originSearchText, setOriginSearchText] = useState('');
  const [destSearchText, setDestSearchText] = useState('');
  
  // Create derived values for selection that can be used in the component
  const selectionStart = localSelectionStart;
  const selectionEnd = localSelectionEnd;
  
  // Track selection changes with a ref to prevent race conditions
  const selectionRef = useRef({ start: null, end: null });

  // Get all unique origins and destinations for group filter
  const getGroupFilterOptions = () => {
    // Initialize sets to store unique airport codes
    const origins = new Set();
    const destinations = new Set();
    const intermediates = new Set();
    
    // Create a map of IATA codes to airport info for quick lookup
    const airportMap = new Map(airports.map(airport => [airport.IATA, airport]));
    
    // Function to parse route input in format like "USA-DOH/AUH/DXB-HAN/SGN/TYO"
    const parseRouteString = (routeString) => {
      // Split by dash to get segments
      const segments = routeString.split('-');
      
      if (segments.length >= 2) {
        // First segment goes to origins only
        const firstSegment = segments[0];
        // Split by slash in case there are multiple airports/groups
        firstSegment.split('/').forEach(code => origins.add(code));
        
        // Last segment goes to destinations only
        const lastSegment = segments[segments.length - 1];
        // Split by slash in case there are multiple airports/groups
        lastSegment.split('/').forEach(code => destinations.add(code));
        
        // Intermediate segments go to both origins and destinations
        if (segments.length > 2) {
          for (let i = 1; i < segments.length - 1; i++) {
            segments[i].split('/').forEach(code => {
              intermediates.add(code);
              origins.add(code);
              destinations.add(code);
            });
          }
        }
      }
    };
    
    // Parse the current route if it's a string
    if (typeof currentRoute === 'string') {
      parseRouteString(currentRoute);
    } 
    // Extract airports from flight data
    else if (flightData?.data) {
      Object.values(flightData.data).forEach(dateData => {
        Object.keys(dateData).forEach(route => {
          if (isValidSegmentForRoute(route, currentRoute)) {
            const [origin, destination] = route.split('-');
            origins.add(origin);
            destinations.add(destination);
          }
        });
      });
      
      // If currentRoute is an array, add appropriate entries
      if (Array.isArray(currentRoute) && currentRoute.length > 0) {
        // First segment goes to origins only
        if (currentRoute.length > 0) {
          origins.add(currentRoute[0]);
        }
        
        // Last segment goes to destinations only
        if (currentRoute.length > 1) {
          destinations.add(currentRoute[currentRoute.length - 1]);
        }
        
        // Intermediate segments go to both origins and destinations
        if (currentRoute.length > 2) {
          for (let i = 1; i < currentRoute.length - 1; i++) {
            intermediates.add(currentRoute[i]);
            origins.add(currentRoute[i]);
            destinations.add(currentRoute[i]);
          }
        }
      }
    }
    
    // Create origin group options
    const originGroups = Array.from(origins)
      .filter(code => !!airportGroups[code])
      .map(code => ({
        code,
        name: airportGroupDescriptions[code] || code,
        expanded: airportGroups[code] || code,
        isGroup: true,
        isIntermediate: intermediates.has(code)
      }));
    
    // Create destination group options
    const destGroups = Array.from(destinations)
      .filter(code => !!airportGroups[code])
      .map(code => ({
        code,
        name: airportGroupDescriptions[code] || code,
        expanded: airportGroups[code] || code,
        isGroup: true,
        isIntermediate: intermediates.has(code)
      }));
    
    // Create individual airport options for origins
    const originOptions = Array.from(origins)
      .filter(code => !airportGroups[code])
      .map(code => {
        const airport = airportMap.get(code);
        return {
          code,
          name: airport ? `${airport.CityName} (${airport.Country})` : code,
          iata: code,
          isGroup: false,
          isIntermediate: intermediates.has(code)
        };
      });
    
    // Create individual airport options for destinations
    const destOptions = Array.from(destinations)
      .filter(code => !airportGroups[code])
      .map(code => {
        const airport = airportMap.get(code);
        return {
          code,
          name: airport ? `${airport.CityName} (${airport.Country})` : code,
          iata: code,
          isGroup: false,
          isIntermediate: intermediates.has(code)
        };
      });
    
    return {
      originOptions: [...originGroups, ...originOptions],
      destOptions: [...destGroups, ...destOptions]
    };
  };
  
  // Memoize group filter options
  const groupFilterOptions = useMemo(getGroupFilterOptions, [flightData, currentRoute]);

  // Handle tooltip repositioning on window resize or scroll
  useEffect(() => {
    const handleWindowChange = () => {
      const tooltipId = activeTooltipRef.current;
      if (tooltipId) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
          // Remove the tooltip if window size changes or scrolling occurs
          document.body.removeChild(tooltip);
          activeTooltipRef.current = null;
        }
      }
    };
    
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange);
    
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange);
    };
  }, []);

  // Clean up any tooltips when component unmounts
  useEffect(() => {
    return () => {
      const tooltipId = activeTooltipRef.current;
      if (tooltipId) {
        const tooltip = document.getElementById(tooltipId);
        if (tooltip) {
          document.body.removeChild(tooltip);
        }
      }
    };
  }, []);

  // Add effect to update calendar month when selectedRange changes
  useEffect(() => {
    if (selectedRange && selectedRange[0]) {
      // If a date range is selected, update the calendar to show the month of the start date
      const startDate = dayjs(selectedRange[0]);
      setCurrentMonth(startDate.month());
      setCurrentYear(startDate.year());
      console.log('[DEBUG] Calendar month updated to match selected start date:', startDate.format('YYYY-MM'));
      
      // Also update the selection ref to match the selectedRange prop
      if (selectedRange.length >= 2 && selectedRange[0] && selectedRange[1]) {
        const startDateStr = startDate.format('YYYY-MM-DD');
        const endDateStr = dayjs(selectedRange[1]).format('YYYY-MM-DD');
        
        selectionRef.current.start = startDateStr;
        selectionRef.current.end = endDateStr;
        
        setLocalSelectionStart(startDateStr);
        setLocalSelectionEnd(endDateStr);
      }
    }
  }, [selectedRange]);

  // Calendar navigation functions
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    // Reset pagination when changing months
    setCellPages({});
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    // Reset pagination when changing months
    setCellPages({});
  };

  // Date selection handling with stable state
  const handleDateClick = (dateString) => {
    // Temporarily disabled
    return;
  };

  const isDateInRange = (dateString) => {
    // Temporarily disabled
    return false;
  };

  // Add this function to handle pagination for each cell
  const handlePageChange = (dateString, direction, e) => {
    // Prevent event bubbling to avoid triggering date selection
    e.stopPropagation();
    
    setCellPages(prevPages => {
      const currentPage = prevPages[dateString] || 0;
      return {
        ...prevPages,
        [dateString]: direction === 'next' ? currentPage + 1 : Math.max(0, currentPage - 1)
      };
    });
  };

  // Get unique segments from flight data - always use full dataset
  const getUniqueSegments = () => {
    console.log('[DEBUG] getUniqueSegments called with currentRoute:', currentRoute);
    
    // Create a set to hold all the unique routes from all dates that are actually displayed
    const displayedRoutes = new Set();
    
    // Process the data the same way DateGrid does
    if (flightData?.data) {
      // For each date in the data
      Object.entries(flightData.data).forEach(([dateString, dateData]) => {
        // Skip dates filtered out by date filter
        if (!shouldRenderDate(dateString)) return;
        
        // Get all possible routes for this date
        let routes = Object.keys(dateData);
        
        // Apply all the same filters that DateGrid would apply
        // This matches exactly what's shown in the calendar
        const filteredDateData = filterFlights(
          dateData, 
          { mode: 'include', segments: [] },  // Use empty segment filter to get all routes
          [], // Use empty class filter
          false, // No direct filter
          [], // No date filter  
          {}, // No group filters
          currentRoute,
          () => true, // All routes pass group filter
          { mode: 'include', sources: [] }, // No source filter
          { mode: 'include', airlines: [] }, // No airlines filter
          null, // No points filter
          flightData?.rawData,
          {} // No segment filters
        );
        
        // Add all routes that remain after filtering to our set
        Object.keys(filteredDateData).forEach(route => {
          displayedRoutes.add(route);
        });
      });
    }
    
    // Convert set to array
    const allDisplayedRoutes = Array.from(displayedRoutes);
    
    // Sort the routes exactly as DateGrid would
    const sortedRoutes = allDisplayedRoutes.sort((a, b) => {
      const [originA, destA] = a.split('-');
      const [originB, destB] = b.split('-');
      return sortSegments(originA, destA, originB, destB, currentRoute);
    });
    
    console.log('[DEBUG] All unique routes that would display in calendar:', sortedRoutes);
    console.log('[DEBUG] Total count of displayable routes:', sortedRoutes.length);
    
    return sortedRoutes;
  };
  
  // Get all unique sources from flight data - always use full dataset
  const getUniqueSources = () => {
    const sources = new Set();
    
    // Always use the full dataset
    if (flightData?.rawData) {
      flightData.rawData.forEach(flight => {
        if (flight.source) {
          sources.add(flight.source);
        }
      });
    }
    
    // Convert to sorted array of objects with name/description
    return Array.from(sources).map(source => {
      const sourceInfo = getSourceByCodename(source);
      return {
        code: source,
        airline: sourceInfo && sourceInfo.airline ? sourceInfo.airline : String(source || ''),
        ffname: sourceInfo && sourceInfo.ffname ? sourceInfo.ffname : '',
        iata: sourceInfo && sourceInfo.iata ? sourceInfo.iata : ''
      };
    }).sort((a, b) => {
      // Safe sort with null checks
      const nameA = a.airline || '';
      const nameB = b.airline || '';
      return nameA.localeCompare(nameB);
    });
  };
  
  // Get unique airlines from flight data - always use full dataset
  const getUniqueAirlines = () => {
    const airlinesSet = new Set();
    
    // Always use the full dataset
    if (flightData?.rawData) {
      flightData.rawData.forEach(flight => {
        // Extract airlines from all cabin classes (direct and indirect)
        ['Y', 'W', 'J', 'F'].forEach(classCode => {
          // Process airlines for regular flights
          const airlines = flight[`${classCode}Airlines`];
          if (airlines) {
            airlines.split(',').forEach(airline => {
              const trimmed = airline.trim();
              if (trimmed) airlinesSet.add(trimmed);
            });
          }
          
          // Process airlines for direct flights
          const directAirlines = flight[`${classCode}DirectAirlines`];
          if (directAirlines) {
            directAirlines.split(',').forEach(airline => {
              const trimmed = airline.trim();
              if (trimmed) airlinesSet.add(trimmed);
            });
          }
        });
      });
    }
    
    // Convert to array, map to enriched objects with full names, then sort alphabetically
    const airlinesCodes = Array.from(airlinesSet);
    const airlinesObjects = airlinesCodes.map(code => {
      const airlineInfo = airlines.find(a => a.value === code);
      return {
        code: code,
        name: airlineInfo && airlineInfo.label ? airlineInfo.label : String(code || '')
      };
    });
    
    return airlinesObjects.sort((a, b) => {
      // Safe sort with null checks
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB);
    });
  };
  
  // Get points range from flight data - always use full dataset
  const getPointsRange = () => {
    if (!flightData?.rawData || flightData.rawData.length === 0) {
      return [0, 200000]; // Default range if no data available
    }
    
    let min = Infinity;
    let max = 0;
    
    // Always use the full dataset
    const dataToUse = flightData.rawData;
    
    // Iterate through all data to find min and max mileage costs
    dataToUse.forEach(flight => {
      // Check all cabin classes
      ['Y', 'W', 'J', 'F'].forEach(classCode => {
        // Check direct and indirect costs
        const directCost = parseInt(flight[`${classCode}DirectMileageCost`] || '0', 10);
        const indirectCost = parseInt(flight[`${classCode}MileageCost`] || '0', 10);
        
        // Update min and max
        if (directCost > 0) {
          min = Math.min(min, directCost);
          max = Math.max(max, directCost);
        }
        
        if (indirectCost > 0) {
          min = Math.min(min, indirectCost);
          max = Math.max(max, indirectCost);
        }
      });
    });
    
    // Start from 0 to allow filtering from the minimum possible value
    min = 0;
    
    // Handle case where no valid costs were found
    if (min === Infinity) min = 0;
    
    // Round max up to nearest multiple of 10000 for a nicer range
    max = Math.ceil(max / 10000) * 10000;
    
    return [min, max];
  };

  // Get all unique dates with availability - always use full dataset
  const getUniqueDates = () => {
    const dates = new Set();
    
    // Always use the full dataset
    if (flightData?.data) {
      Object.keys(flightData.data).forEach(dateString => {
        dates.add(dateString);
      });
    }
    
    // Sort dates chronologically
    return Array.from(dates).sort();
  };

  // Get all available flights after applying current filters
  const getFilteredFlights = () => {
    if (!flightData?.rawData) return [];
    
    let filtered = [...flightData.rawData];
    
    // Apply segment filter
    if (segmentFilter.segments.length > 0) {
      filtered = filtered.filter(flight => {
        const route = `${flight.originAirport}-${flight.destinationAirport}`;
        const isInFilter = segmentFilter.segments.includes(route);
        return segmentFilter.mode === 'include' ? isInFilter : !isInFilter;
      });
    }
    
    // Apply class filter
    if (classFilter.length > 0) {
      filtered = filtered.filter(flight => {
        return classFilter.some(cls => {
          switch(cls) {
            case 'Economy': return flight.YAvailable && (!directFilter || flight.YDirect);
            case 'Premium Economy': return flight.WAvailable && (!directFilter || flight.WDirect);
            case 'Business': return flight.JAvailable && (!directFilter || flight.JDirect);
            case 'First': return flight.FAvailable && (!directFilter || flight.FDirect);
            default: return false;
          }
        });
      });
    }
    
    // Apply direct filter
    if (directFilter) {
      filtered = filtered.filter(flight => 
        flight.YDirect || flight.WDirect || flight.JDirect || flight.FDirect
      );
    }
    
    // Apply source filter
    if (sourceFilter.sources.length > 0) {
      filtered = filtered.filter(flight => {
        const matchesSource = sourceFilter.sources.includes(flight.source);
        return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
      });
    }
    
    // Apply airlines filter
    if (airlinesFilter.airlines.length > 0) {
      filtered = filtered.filter(flight => {
        // Check all cabin classes for matching airlines
        const allAirlines = [];
        
        ['Y', 'W', 'J', 'F'].forEach(classCode => {
          const airlinesStr = directFilter 
            ? flight[`${classCode}DirectAirlines`] 
            : flight[`${classCode}Airlines`];
            
          if (airlinesStr) {
            airlinesStr.split(',').forEach(airline => {
              const trimmed = airline.trim();
              if (trimmed) allAirlines.push(trimmed);
            });
          }
        });
        
        // Remove duplicates
        const uniqueAirlines = [...new Set(allAirlines)];
        
        if (airlinesFilter.mode === 'include') {
          // In include mode, at least one airline must be included
          return uniqueAirlines.some(airline => airlinesFilter.airlines.includes(airline));
        } else {
          // In exclude mode, only filter out if ALL airlines are excluded
          return !uniqueAirlines.every(airline => airlinesFilter.airlines.includes(airline));
        }
      });
    }
    
    // Apply points filter
    if (pointsFilter) {
      filtered = filtered.filter(flight => {
        // Check all cabin classes for points in range
        return ['Y', 'W', 'J', 'F'].some(classCode => {
          const mileageCost = directFilter 
            ? parseInt(flight[`${classCode}DirectMileageCost`] || '0', 10)
            : parseInt(flight[`${classCode}MileageCost`] || '0', 10);
            
          return mileageCost >= pointsFilter[0] && 
                 mileageCost <= pointsFilter[1] && 
                 mileageCost > 0;
        });
      });
    }
    
    return filtered;
  };

  // Get ordered segments - use this for display
  const getOrderedSegments = () => {
    // Filter based on search text only
    const filteredBySearch = segmentSearchText
      ? uniqueSegments.filter(segment => segment.toLowerCase().includes(segmentSearchText.toLowerCase()))
      : uniqueSegments;

    // Apply ordering if available
    if (segmentOrder.length > 0) {
      const orderedSegments = [...segmentOrder];
      const remainingSegments = filteredBySearch.filter(segment => !segmentOrder.includes(segment));
      return [...orderedSegments, ...remainingSegments];
    }

    // Sort segments using our sorting logic
    return [...filteredBySearch].sort((a, b) => {
      const [originA, destA] = a.split('-');
      const [originB, destB] = b.split('-');
      return sortSegments(originA, destA, originB, destB, currentRoute);
    });
  };
  
  // Add the moveSegment function back:
  const moveSegment = (segment, direction) => {
    // Get current ordered segments or initialize with unique segments
    const currentOrder = segmentOrder.length > 0 
      ? [...segmentOrder] 
      : [...uniqueSegments];
    
    const index = currentOrder.indexOf(segment);
    if (index === -1) return; // Segment not found
    
    // Calculate new index
    const newIndex = direction === 'up' 
      ? Math.max(0, index - 1) 
      : Math.min(currentOrder.length - 1, index + 1);
    
    // Don't proceed if already at top/bottom
    if (newIndex === index) return;
    
    // Create new array with reordered segments
    const newOrder = [...currentOrder];
    newOrder.splice(index, 1); // Remove from old position
    newOrder.splice(newIndex, 0, segment); // Insert at new position
    
    setSegmentOrder(newOrder);
  };

  // Function to delete a filter
  const deleteFilter = (filterId) => {
    // Remove from additionalFilters
    setAdditionalFilters(prev => prev.filter(filter => filter.id !== filterId));
    
    // Remove from groupFilters or segmentFilters
    const filterType = additionalFilters.find(f => f.id === filterId)?.type;
    
    if (filterType === 'group') {
      setGroupFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[filterId];
        return newFilters;
      });
    } else if (filterType === 'segment') {
      setSegmentFilters(prev => {
        const newFilters = { ...prev };
        delete newFilters[filterId];
        return newFilters;
      });
    }
  };

  // Use this function to check if a date should be rendered based on the date filter
  const shouldRenderDate = (dateString) => {
    return dateFilter.length === 0 || dateFilter.includes(dateString);
  };

  // Use memoization to avoid recalculating filtered flights unless filters change
  const filteredFlights = useMemo(getFilteredFlights, [
    flightData, 
    segmentFilter, 
    classFilter, 
    directFilter, 
    sourceFilter, 
    airlinesFilter,
    pointsFilter
  ]);

  // Memoize these to prevent recalculation on every render
  // Note that these now always use the full dataset regardless of filters
  const uniqueSegments = useMemo(getUniqueSegments, [flightData, currentRoute]);
  const uniqueSources = useMemo(getUniqueSources, [flightData]);
  const uniqueAirlines = useMemo(getUniqueAirlines, [flightData]);
  const pointsRange = useMemo(getPointsRange, [flightData]);
  const uniqueDates = useMemo(getUniqueDates, [flightData]);

  // Process and filter flights for display
  const processedFlights = useMemo(() => {
    if (!flightData?.data) return {};
    
    console.log('[DEBUG] Processing flights with filters:');
    console.log('[DEBUG] Group filters:', groupFilters);
    console.log('[DEBUG] Segment filters:', segmentFilters);
    console.log('[DEBUG] Class filter:', classFilter);
    
    const processed = {};
    
    // Group filtered flights by date
    Object.entries(flightData.data).forEach(([dateString, dateData]) => {
      // Skip dates that don't pass date filter
      if (!shouldRenderDate(dateString)) return;
      
      const filteredDateData = filterFlights(
        dateData, 
        segmentFilter, 
        classFilter, 
        directFilter, 
        dateFilter, 
        groupFilters,
        currentRoute,
        route => {
          console.log('[DEBUG] Checking if route passes group filter:', route);
          const result = passesGroupFilter(route, groupFilters);
          console.log('[DEBUG] Result for', route, ':', result);
          return result;
        },
        sourceFilter,
        airlinesFilter,
        pointsFilter,
        flightData?.rawData,
        segmentFilters
      );
      
      // Only add the date if it has any routes left after filtering
      if (Object.keys(filteredDateData).length > 0) {
        processed[dateString] = filteredDateData;
      }
    });
    
    console.log('[DEBUG] Processed flights result:', processed);
    return processed;
  }, [
    flightData, 
    segmentFilter, 
    classFilter, 
    directFilter, 
    sourceFilter, 
    airlinesFilter,
    pointsFilter,
    dateFilter,
    groupFilters,
    segmentFilters,
    currentRoute,
    shouldRenderDate
  ]);

  // Add a proper way to update filter states
  const updateGroupFilter = (filterId, key, value) => {
    console.log('[DEBUG] updateGroupFilter called for filterId:', filterId, 'key:', key, 'value:', value);
    console.log('[DEBUG] Current groupFilters:', JSON.stringify(groupFilters));
    
    setGroupFilters(prev => {
      const prevFilterData = prev[filterId] || {};
      console.log('[DEBUG] Previous filter data for', filterId, ':', JSON.stringify(prevFilterData));
      
      const newFilterData = {
        ...prevFilterData,
        [key]: value
      };
      console.log('[DEBUG] New filter data for', filterId, ':', JSON.stringify(newFilterData));
      
      const newGroupFilters = {
        ...prev,
        [filterId]: newFilterData
      };
      
      console.log('[DEBUG] Updated groupFilters:', JSON.stringify(newGroupFilters));
      
      // Force a re-calculation of filtered flights
      setTimeout(() => {
        console.log('[DEBUG] Forcing re-render after group filter update');
        forceUpdate({});
      }, 100);
      
      return newGroupFilters;
    });
  };
  
  const updateSegmentFilter = (filterId, key, value) => {
    console.log('[DEBUG] updateSegmentFilter called for filterId:', filterId, 'key:', key, 'value:', value);
    
    setSegmentFilters(prev => {
      const prevFilterData = prev[filterId] || {};
      const newFilterData = {
        ...prevFilterData,
        [key]: value
      };
      
      return {
        ...prev,
        [filterId]: newFilterData
      };
    });
  };

  // Add currencyFilter state
  const [currencyFilter, setCurrencyFilter] = useState({
    enabled: false,
    selectedCurrency: null
  });

  // Add timeFilters state with calculated duration range
  const [timeFilters, setTimeFilters] = useState(() => {
    // Calculate duration range from flight data if available
    let minDuration = Number.MAX_SAFE_INTEGER;
    let maxDuration = 0;
    
    // Extract min/max duration from flight data
    if (flightData?.rawData && Array.isArray(flightData.rawData)) {
      flightData.rawData.forEach(flight => {
        if (flight.AvailabilityTrips && Array.isArray(flight.AvailabilityTrips)) {
          flight.AvailabilityTrips.forEach(trip => {
            if (trip.TotalDuration !== undefined) {
              minDuration = Math.min(minDuration, trip.TotalDuration);
              maxDuration = Math.max(maxDuration, trip.TotalDuration);
            }
          });
        }
      });
    }
    
    // Use sensible defaults if no valid data found
    if (minDuration === Number.MAX_SAFE_INTEGER) minDuration = 465;
    if (maxDuration === 0) maxDuration = 2000;
    
    // Log the calculated duration range
    console.log(`Duration range calculated: ${minDuration}-${maxDuration} minutes`);
    
    return {
      departure: { enabled: false, range: [0, 24] },
      arrival: { enabled: false, range: [0, 24] },
      duration: { enabled: false, range: [minDuration, maxDuration] }
    };
  });

  return (
    <div style={{ fontFamily: 'Menlo, monospace' }}>
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        padding: '16px' 
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          {/* Replace button with proper Switch component */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>View mode:</span>
            <Switch
              checked={isDetailedView}
              onChange={checked => setIsDetailedView(checked)}
              checkedChildren="Detailed"
              unCheckedChildren="Summary"
            />
          </div>
        </div>
        
        {/* Global filters section with title */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <Title level={5} style={{ margin: 0, fontFamily: 'Menlo, monospace' }}>
              Global filter
            </Title>
            <Dropdown 
              overlay={
                <Menu
                  onClick={({ key }) => {
                    // Generate a unique ID for the new filter
                    const filterId = `${key}-${Date.now()}`;
                    
                    // Add the new filter to the list
                    setAdditionalFilters(prev => [...prev, { id: filterId, type: key }]);
                    
                    // Initialize the filter data
                    if (key === 'group') {
                      setGroupFilters(prev => ({
                        ...prev,
                        [filterId]: {
                          originFilter: { mode: 'include', airports: [] },
                          destFilter: { mode: 'include', airports: [] }
                        }
                      }));
                    } else if (key === 'segment') {
                      setSegmentFilters(prev => ({
                        ...prev,
                        [filterId]: { segments: [] }
                      }));
                    }
                  }}
                  items={[
                    {
                      key: 'group',
                      label: 'Group-based Filter',
                    },
                    {
                      key: 'segment',
                      label: 'Segment-based Filter',
                    },
                  ]}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type="default" 
                icon={<PlusOutlined />} 
                size="small"
              >
                Add Custom Filter
              </Button>
            </Dropdown>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            justifyContent: 'flex-start',
            flexWrap: 'wrap',
            alignItems: 'center',
            backgroundColor: '#ffffff',
            padding: '8px',
            borderRadius: '4px',
            marginBottom: '12px'
          }}>
            {/* Direct only toggle */}
            <Checkbox 
              checked={directFilter}
              onChange={e => setDirectFilter(e.target.checked)}
              style={{ 
                marginLeft: '8px',
                fontSize: '13px'
              }}
            >
              <span style={{ fontWeight: directFilter ? 600 : 400 }}>Direct Only</span>
            </Checkbox>
            
            {/* Segments filter */}
            <Dropdown 
              overlay={
                <SegmentsFilter 
                  segmentFilter={segmentFilter}
                  setSegmentFilter={setSegmentFilter}
                  segmentSearchText={segmentSearchText}
                  setSegmentSearchText={setSegmentSearchText}
                  segmentOrder={segmentOrder}
                  setSegmentOrder={setSegmentOrder}
                  filteredSegments={getOrderedSegments()}
                  totalSegmentsCount={uniqueSegments.length}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={segmentFilter.segments.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: segmentFilter.segments.length > 0 ? 600 : 400
                }}
              >
                Segments {segmentFilter.segments.length > 0 && `(${segmentFilter.segments.length})`}
              </Button>
            </Dropdown>
            
            {/* Class filter */}
            <Dropdown 
              overlay={
                <ClassFilter 
                  classFilter={Array.isArray(classFilter) ? classFilter : []}
                  setClassFilter={setClassFilter}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={classFilter.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: classFilter.length > 0 ? 600 : 400
                }}
              >
                Classes {classFilter.length > 0 && `(${classFilter.length})`}
              </Button>
            </Dropdown>
            
            {/* Airlines filter */}
            <Dropdown 
              overlay={
                <AirlinesFilter 
                  airlinesFilter={airlinesFilter}
                  setAirlinesFilter={setAirlinesFilter}
                  airlinesSearchText={airlinesSearchText}
                  setAirlinesSearchText={setAirlinesSearchText}
                  uniqueAirlines={uniqueAirlines}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={airlinesFilter?.airlines?.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: airlinesFilter?.airlines?.length > 0 ? 600 : 400
                }}
              >
                Airlines {airlinesFilter?.airlines?.length > 0 && `(${airlinesFilter.airlines.length})`}
              </Button>
            </Dropdown>
            
            {/* Points filter */}
            <Dropdown 
              overlay={
                <PointsFilter 
                  pointsFilter={pointsFilter}
                  setPointsFilter={setPointsFilter}
                  pointsRange={pointsRange}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={pointsFilter ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: pointsFilter ? 600 : 400
                }}
              >
                Points {pointsFilter && `(${pointsFilter[0].toLocaleString()}-${pointsFilter[1].toLocaleString()})`}
              </Button>
            </Dropdown>
            
            {/* Dates filter */}
            <Dropdown 
              overlay={
                <DatesFilter 
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  dateSearchText={dateSearchText}
                  setDateSearchText={setDateSearchText}
                  uniqueDates={uniqueDates}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={dateFilter.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: dateFilter.length > 0 ? 600 : 400
                }}
              >
                Dates {dateFilter.length > 0 && `(${dateFilter.length})`}
              </Button>
            </Dropdown>
            
            {/* Sources filter - moved to the end */}
            <Dropdown 
              overlay={
                <SourcesFilter 
                  sourceFilter={sourceFilter}
                  setSourceFilter={setSourceFilter}
                  sourceSearchText={sourceSearchText}
                  setSourceSearchText={setSourceSearchText}
                  uniqueSources={uniqueSources}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={sourceFilter?.sources?.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: sourceFilter?.sources?.length > 0 ? 600 : 400
                }}
              >
                Sources {sourceFilter?.sources?.length > 0 && `(${sourceFilter.sources.length})`}
              </Button>
            </Dropdown>
            
            {/* Others filter */}
            <Dropdown 
              overlay={
                <OthersFilter 
                  currencyFilter={currencyFilter}
                  setCurrencyFilter={setCurrencyFilter}
                  timeFilters={timeFilters}
                  setTimeFilters={setTimeFilters}
                  flightData={flightData}
                />
              } 
              trigger={['click']}
            >
              <Button 
                type={(currencyFilter.enabled || timeFilters.departure.enabled || timeFilters.arrival.enabled || timeFilters.duration.enabled) ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: (currencyFilter.enabled || timeFilters.departure.enabled || timeFilters.arrival.enabled || timeFilters.duration.enabled) ? 600 : 400
                }}
              >
                Others {(currencyFilter.enabled || timeFilters.departure.enabled || timeFilters.arrival.enabled || timeFilters.duration.enabled) && 
                  [
                    currencyFilter.enabled && currencyFilter.selectedCurrency,
                    timeFilters.departure.enabled && "Departure",
                    timeFilters.arrival.enabled && "Arrival",
                    timeFilters.duration.enabled && "Duration"
                  ].filter(Boolean).join(", ")
                }
              </Button>
            </Dropdown>
          </div>
        </div>
        
        {/* Additional filters section */}
        <AdditionalFilter 
          additionalFilters={additionalFilters}
          setAdditionalFilters={setAdditionalFilters}
          groupFilters={groupFilters}
          setGroupFilters={setGroupFilters}
          segmentFilters={segmentFilters}
          setSegmentFilters={setSegmentFilters}
          updateGroupFilter={updateGroupFilter}
          updateSegmentFilter={updateSegmentFilter}
          renderOriginDropdown={(filterId) => renderOriginDropdown(
            filterId,
            groupFilters,
            setGroupFilters,
            originSearchText,
            setOriginSearchText,
            groupFilterOptions
          )}
          renderDestDropdown={(filterId) => renderDestDropdown(
            filterId,
            groupFilters,
            setGroupFilters,
            destSearchText,
            setDestSearchText,
            groupFilterOptions
          )}
          renderSegmentsDropdownSimple={(filterId) => renderSegmentsDropdownSimple(
            filterId,
            segmentFilters,
            setSegmentFilters,
            segmentSearchText,
            setSegmentSearchText,
            uniqueSegments,
            currentRoute
          )}
          deleteFilter={deleteFilter}
          uniqueSources={uniqueSources}
          uniqueAirlines={uniqueAirlines}
          pointsRange={pointsRange}
          uniqueDates={uniqueDates}
        />
        
        {/* Date Grid Component */}
        <DateGrid
          currentMonth={currentMonth}
          currentYear={currentYear}
          flightData={flightData}
          filteredFlights={processedFlights}
          cellPages={cellPages}
          handlePageChange={handlePageChange}
          handleDateClick={handleDateClick}
          isDateInRange={isDateInRange}
          error={error}
          directFilter={directFilter}
          sourceFilter={sourceFilter}
          airlinesFilter={airlinesFilter}
          pointsFilter={pointsFilter}
          classFilter={classFilter}
          shouldRenderDate={shouldRenderDate}
          goToPrevMonth={goToPrevMonth}
          goToNextMonth={goToNextMonth}
          groupFilters={groupFilters}
          segmentFilters={segmentFilters}
          currencyFilter={currencyFilter}
          currentRoute={currentRoute}
          segmentOrder={segmentOrder}
          isDetailedView={isDetailedView}
          timeFilters={timeFilters}
        />
        
        <div style={{ marginTop: '24px', color: '#666', fontSize: '12px' }}>
          <p>Tip: Click on a date to start selecting a range. Click again to complete the selection.</p>
        </div>
      </div>
    </div>
  );
};

export default NormalFlightAvailabilityCalendar; 