import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Typography, Dropdown, Radio, Checkbox, Input, Slider, Menu, Select, Space } from 'antd';
import { DownOutlined, MenuOutlined, ArrowUpOutlined, ArrowDownOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { sources, getSourceByCodename } from './data/sources';
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
  
  // Search text states
  const [originSearchText, setOriginSearchText] = useState('');
  const [destSearchText, setDestSearchText] = useState('');
  
  // Create derived values for selection that can be used in the component
  const selectionStart = localSelectionStart;
  const selectionEnd = localSelectionEnd;
  
  // Track selection changes with a ref to prevent race conditions
  const selectionRef = useRef({ start: null, end: null });

  // Sample raw response data for fallback
  const sampleRawData = useRef([
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
  ]);

  // Get enriched flight data with raw API information
  const getEnrichedFlightData = (routeCode, classCode, dateString, classData) => {
    const flights = classData[`${classCode}Flights`] || [];

    // Check for raw data from the flightData prop
    const rawDataArray = flightData?.rawData || sampleRawData.current;
    
    // Ensure raw data is available for each flight
    return flights.map(flight => {
      // If rawData is already present, just return the flight
      if (flight.rawData) return flight;
      
      try {
        // Find matching raw flight data
        const [origin, destination] = routeCode.split('-');
        
        const raw = rawDataArray.find(rawFlight => {
          return (
            (rawFlight.ID === flight.id || !flight.id) &&
            rawFlight.date === dateString &&
            rawFlight.originAirport === origin && 
            rawFlight.destinationAirport === destination &&
            rawFlight[`${classCode}Available`]
          );
        });
        
        // Return flight with raw data attached
        return {
          ...flight,
          rawData: raw || null
        };
      } catch (error) {
        console.warn('Error finding raw flight data:', error);
        return flight;
      }
    });
  };

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

  // Calendar utility functions
  const getDaysInMonth = (year, month) => {
    return dayjs(`${year}-${month + 1}`).daysInMonth();
  };

  const getFirstDayOfMonth = (year, month) => {
    return dayjs(`${year}-${month + 1}-01`).day();
  };

  const formatDate = (year, month, day) => {
    return dayjs(`${year}-${month + 1}-${day}`).format('YYYY-MM-DD');
  };

  // Date selection handling with stable state
  const handleDateClick = (dateString) => {
    if (!selectionRef.current.start) {
      selectionRef.current.start = dateString;
      selectionRef.current.end = null;
      
      setLocalSelectionStart(dateString);
      setLocalSelectionEnd(null);
      setError('');
    } else if (!selectionRef.current.end) {
      const start = dayjs(selectionRef.current.start);
      const end = dayjs(dateString);
      
      if (end.isBefore(start)) {
        setError('End date cannot be before start date');
        return;
      }
      
      if (end.diff(start, 'days') > 7) {
        setError('Date range cannot exceed 7 days');
        return;
      }

      selectionRef.current.end = dateString;
      setLocalSelectionEnd(dateString);
      
      if (onDateRangeSelect) {
        onDateRangeSelect([start, end]);
      }
    } else {
      selectionRef.current.start = dateString;
      selectionRef.current.end = null;
      
      setLocalSelectionStart(dateString);
      setLocalSelectionEnd(null);
      setError('');
    }
  };

  const isDateInRange = (dateString) => {
    const ref = selectionRef.current;
    
    if (!ref.start || !ref.end) {
      if (ref.start && dateString === ref.start) {
        return true;
      }
      return false;
    }
    
    const date = dayjs(dateString);
    const start = dayjs(ref.start);
    const end = dayjs(ref.end);
    
    return (date.isAfter(start.subtract(1, 'day')) || date.isSame(start, 'day')) && 
           (date.isBefore(end.add(1, 'day')) || date.isSame(end, 'day'));
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

  // Render availability badges
  const renderAvailabilityBadges = (route, classes, date) => {
    const getBackgroundColor = (classCode, available) => {
      if (!available) return 'transparent';
      switch (classCode) {
        case 'Y': return '#E8E1F2';
        case 'W': return '#E8E1F2';
        case 'J': return '#F3CD87';
        case 'F': return '#D88A3F';
        default: return 'transparent';
      }
    };

    const classesToShow = ['Y', 'W', 'J', 'F'];

    // Check if this class should be shown as available based on class filter
    // and if there are any tooltip-able flights after filtering
    const shouldShowAsAvailable = (classCode) => {
      // First, check if it passes class filter
      let passesClassFilter = true;
      if (classFilter.length > 0) {
        switch(classCode) {
          case 'Y': passesClassFilter = classFilter.includes('Economy'); break;
          case 'W': passesClassFilter = classFilter.includes('Premium Economy'); break;
          case 'J': passesClassFilter = classFilter.includes('Business'); break;
          case 'F': passesClassFilter = classFilter.includes('First'); break;
          default: passesClassFilter = false;
        }
      }
      
      // If it doesn't pass class filter or isn't available, return false
      if (!passesClassFilter || !classes[classCode]) {
        return false;
      }
      
      // If any filtering is applied, check if there are any tooltip-able flights
      if (directFilter || sourceFilter.sources.length > 0 || pointsFilter || airlinesFilter.airlines.length > 0) {
        const flights = getFlightsForClassWithFilters(route, classCode, date, classes);
        return flights.length > 0;
      }
      
      // If no additional filtering, return true if it's available
      return true;
    };

    // Get the sources data for a specific class
    const getSourcesForClass = (classCode) => {
      const sourcesString = classes[`${classCode}Sources`];
      return sourcesString ? sourcesString.split(',') : [];
    };

    // Get the flight data for a specific class
    const getFlightsForClass = (classCode) => {
      let flights = getEnrichedFlightData(route, classCode, date, classes);
      
      // Apply direct filter to tooltip flights if enabled
      if (directFilter) {
        flights = flights.filter(flight => {
          const rawFlight = flight.rawData;
          if (!rawFlight) return false;
          return rawFlight[`${classCode}Direct`] === true;
        });
      }
      
      // Apply source filter to tooltip flights if enabled
      if (sourceFilter.sources.length > 0) {
        flights = flights.filter(flight => {
          const rawFlight = flight.rawData;
          if (!rawFlight || !rawFlight.source) return false;
          
          const matchesSource = sourceFilter.sources.includes(rawFlight.source);
          return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
        });
      }
      
      // Apply airlines filter to tooltip flights if enabled
      if (airlinesFilter.airlines.length > 0) {
        flights = flights.filter(flight => {
          const rawFlight = flight.rawData;
          if (!rawFlight) return false;
          
          // Get the airlines based on direct/indirect
          const airlinesString = directFilter 
            ? rawFlight[`${classCode}DirectAirlines`] 
            : rawFlight[`${classCode}Airlines`];
          
          if (!airlinesString) return false;
          
          // Parse the airlines list
          const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
          
          // Special logic: only filter out if ALL airlines are excluded
          if (airlinesFilter.mode === 'include') {
            // In include mode, at least one airline must be included
            return flightAirlines.some(airline => airlinesFilter.airlines.includes(airline));
          } else {
            // In exclude mode, only filter out if ALL airlines are excluded
            return !flightAirlines.every(airline => airlinesFilter.airlines.includes(airline));
          }
        });
      }
      
      // Apply points filter to tooltip flights if enabled
      if (pointsFilter) {
        flights = flights.filter(flight => {
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
      
      return flights;
    };

    // Get the full airline name from source codename
    const getAirlineName = (codename) => {
      const source = getSourceByCodename(codename);
      return source ? `${source.airline} ${source.ffname}` : codename;
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
        
        if (airlinesFilter.airlines.length > 0 && hasDirect && hasIndirect && directCost === indirectCost) {
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
        if (airlinesFilter.airlines.length > 0) {
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
              const formattedTaxes = (parseInt(totalTaxes, 10) / 100).toFixed(2);
              taxesSpan.textContent = `+ ${currency} ${formattedTaxes}`;
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

    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {classesToShow.map(classCode => {
          const isAvailable = shouldShowAsAvailable(classCode);
          const isDirect = classes[`${classCode}Direct`];
          const sources = getSourcesForClass(classCode);
          const flights = getFlightsForClass(classCode);
          
          return (
            <div
              key={classCode}
              title={!isAvailable ? "Not Available" : undefined}
              style={{
                backgroundColor: getBackgroundColor(classCode, isAvailable),
                color: isAvailable ? '#684634' : '#999',
                padding: '0px 4px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'Menlo',
                width: '20px',
                textAlign: 'center',
                position: 'relative',
                cursor: isAvailable ? 'pointer' : 'default'
              }}
              onMouseEnter={(e) => {
                if (isAvailable && flights.length > 0) {
                  const tooltipId = `tooltip-${route}-${classCode}-${date}`;
                  
                  // Remove any existing tooltip with the same ID
                  const existingTooltip = document.getElementById(tooltipId);
                  if (existingTooltip) {
                    document.body.removeChild(existingTooltip);
                  }
                  
                  // Also remove any other active tooltips
                  if (activeTooltipRef.current && activeTooltipRef.current !== tooltipId) {
                    const oldTooltip = document.getElementById(activeTooltipRef.current);
                    if (oldTooltip) {
                      document.body.removeChild(oldTooltip);
                    }
                  }
                  
                  // Save current tooltip ID as active
                  activeTooltipRef.current = tooltipId;
                  
                  // Create and populate the tooltip element
                  const tooltip = createEnhancedTooltip(classCode, flights);
                  tooltip.id = tooltipId;
                  tooltip.style.position = 'fixed'; // Changed from absolute to fixed for better positioning
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
                }
              }}
              onMouseLeave={() => {
                const tooltipId = `tooltip-${route}-${classCode}-${date}`;
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
              }}
            >
              {isAvailable ? classCode : '-'}
              {isAvailable && !isDirect && (
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
    );
  };

  // Calendar constants
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  
  // Helper function to check if a segment is valid for the current route
  const isValidSegmentForRoute = (segment) => {
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

  // Get all unique segments from filtered flights
  const getUniqueSegments = () => {
    const segments = new Set();
    
    // First try to get from filtered flights
    if (filteredFlights.length > 0) {
      filteredFlights.forEach(flight => {
        segments.add(`${flight.originAirport}-${flight.destinationAirport}`);
      });
    } 
    // Fallback to all data if no filtered flights
    else if (flightData?.data) {
      Object.values(flightData.data).forEach(dateData => {
        Object.keys(dateData).forEach(route => {
          segments.add(route);
        });
      });
    }
    
    // Filter out segments that don't follow the route sequence
    return Array.from(segments)
      .filter(isValidSegmentForRoute)
      .sort();
  };
  
  // Get unique sources from filtered flights
  const getUniqueSources = () => {
    const sourcesSet = new Set();
    
    // Use filtered flights if available
    if (filteredFlights.length > 0) {
      filteredFlights.forEach(flight => {
        if (flight.source) {
          sourcesSet.add(flight.source);
        }
      });
    } 
    // Fallback to all data
    else if (flightData?.rawData) {
      flightData.rawData.forEach(flight => {
        if (flight.source) {
          sourcesSet.add(flight.source);
        }
      });
    }
    
    // Convert to array, map to enriched objects, then sort by airline name
    const sourceCodes = Array.from(sourcesSet);
    const sourceObjects = sourceCodes.map(code => {
      const sourceInfo = getSourceByCodename(code);
      return {
        code: code,
        airline: sourceInfo?.airline || code,
        ffname: sourceInfo?.ffname || '',
        iata: sourceInfo?.iata || ''
      };
    });
    
    // Sort by airline name
    return sourceObjects.sort((a, b) => a.airline.localeCompare(b.airline));
  };
  
  // Get unique airlines from filtered flights
  const getUniqueAirlines = () => {
    const airlinesSet = new Set();
    
    // Use filtered flights if available
    if (filteredFlights.length > 0) {
      filteredFlights.forEach(flight => {
        // Extract airlines from all cabin classes (direct and indirect)
        ['Y', 'W', 'J', 'F'].forEach(classCode => {
          // Process airlines based on direct filter
          const airlines = directFilter 
            ? flight[`${classCode}DirectAirlines`]
            : flight[`${classCode}Airlines`];
            
          if (airlines) {
            airlines.split(',').forEach(airline => {
              const trimmed = airline.trim();
              if (trimmed) airlinesSet.add(trimmed);
            });
          }
        });
      });
    } 
    // Fallback to all data
    else if (flightData?.rawData) {
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
        name: airlineInfo ? airlineInfo.label : code
      };
    });
    
    return airlinesObjects.sort((a, b) => a.name.localeCompare(b.name));
  };
  
  // Get points range from filtered flights
  const getPointsRange = () => {
    if (!filteredFlights.length && (!flightData?.rawData || flightData.rawData.length === 0)) {
      return [0, 200000]; // Default range if no data available
    }
    
    let min = Infinity;
    let max = 0;
    
    // Decide which dataset to use
    const dataToUse = filteredFlights.length > 0 ? filteredFlights : flightData.rawData;
    
    // Iterate through all data to find min and max mileage costs
    dataToUse.forEach(flight => {
      // Check all cabin classes
      ['Y', 'W', 'J', 'F'].forEach(classCode => {
        // Check direct and indirect costs based on direct filter
        const mileageCost = directFilter 
          ? parseInt(flight[`${classCode}DirectMileageCost`] || '0', 10)
          : parseInt(flight[`${classCode}MileageCost`] || '0', 10);
        
        // Update min and max
        if (mileageCost > 0) {
          min = Math.min(min, mileageCost);
          max = Math.max(max, mileageCost);
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

  // Memoize these to prevent recalculation on every render
  const uniqueSegments = useMemo(getUniqueSegments, [filteredFlights, flightData]);
  const uniqueSources = useMemo(getUniqueSources, [filteredFlights, flightData]);
  const uniqueAirlines = useMemo(getUniqueAirlines, [filteredFlights, flightData, directFilter]);
  const pointsRange = useMemo(getPointsRange, [filteredFlights, flightData, directFilter]);

  // Render the segments dropdown content
  const renderSegmentsDropdown = () => {
    // Get filtered segments based on search text
    const allSegments = getOrderedSegments();
    const filteredSegments = allSegments.filter(segment => 
      segment.toLowerCase().includes(segmentSearchText.toLowerCase())
    );

    // Function to handle drag end and reordering
    const handleDragEnd = (result) => {
      // Dropped outside the list
      if (!result.destination) {
        return;
      }
      
      const startIndex = result.source.index;
      const endIndex = result.destination.index;
      
      // Don't update if dropped in the same position
      if (startIndex === endIndex) {
        return;
      }
      
      // Create a copy of the current order or initialize with filtered segments
      const currentOrder = segmentOrder.length > 0 
        ? [...segmentOrder] 
        : filteredSegments;
      
      // Get the item being dragged
      const [removed] = currentOrder.splice(startIndex, 1);
      // Insert at the new position
      currentOrder.splice(endIndex, 0, removed);
      
      // Update the segment order
      setSegmentOrder(currentOrder);
    };

    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '320px'
      }}>
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Radio.Group
            value={segmentFilter.mode}
            onChange={e => setSegmentFilter(prev => ({ ...prev, mode: e.target.value }))}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Radio.Button 
              value="include" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Include
            </Radio.Button>
            <Radio.Button 
              value="exclude" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Exclude
            </Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="Search segments..."
            value={segmentSearchText}
            onChange={e => setSegmentSearchText(e.target.value)}
            size="small"
            allowClear
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {filteredSegments.map((segment, index) => (
            <div 
              key={segment} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'white',
                borderBottom: '1px solid #f9f9f9',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', segment);
                e.currentTarget.style.opacity = '0.4';
                e.currentTarget.style.backgroundColor = '#f0f0f0';
              }}
              onDragEnd={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.backgroundColor = 'white';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderTop = '2px solid #1890ff';
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderTop = '1px solid #f9f9f9';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderTop = '1px solid #f9f9f9';
                
                const draggedSegment = e.dataTransfer.getData('text/plain');
                if (draggedSegment === segment) return; // Same segment, no change
                
                // Get current ordered segments or initialize with filtered segments
                const currentOrder = segmentOrder.length > 0 
                  ? [...segmentOrder] 
                  : filteredSegments;
                
                const sourceIndex = currentOrder.indexOf(draggedSegment);
                const targetIndex = currentOrder.indexOf(segment);
                
                if (sourceIndex === -1 || targetIndex === -1) return;
                
                // Create new array with reordered segments
                const newOrder = [...currentOrder];
                newOrder.splice(sourceIndex, 1);
                newOrder.splice(targetIndex, 0, draggedSegment);
                
                setSegmentOrder(newOrder);
              }}
            >
              <div
                style={{
                  cursor: 'grab',
                  padding: '0 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#999',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <MenuOutlined />
              </div>
              
              <Checkbox
                checked={segmentFilter.segments.includes(segment)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setSegmentFilter(prev => ({
                    ...prev,
                    segments: isChecked 
                      ? [...prev.segments, segment]
                      : prev.segments.filter(s => s !== segment)
                  }));
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {segment}
              </Checkbox>
            </div>
          ))}
          {filteredSegments.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No segments found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the class filter dropdown
  const renderClassDropdown = () => {
    const cabinClasses = ['Economy', 'Premium Economy', 'Business', 'First'];
    
    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '240px'
      }}>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {cabinClasses.map(cabinClass => (
            <div 
              key={cabinClass} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <Checkbox
                checked={classFilter.includes(cabinClass)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setClassFilter(prev => 
                    isChecked 
                      ? [...prev, cabinClass]
                      : prev.filter(c => c !== cabinClass)
                  );
                }}
              >
                {cabinClass}
              </Checkbox>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render the sources dropdown content
  const renderSourcesDropdown = () => {
    // Filter sources based on search text
    const filteredSources = uniqueSources.filter(source => 
      source.airline.toLowerCase().includes(sourceSearchText.toLowerCase()) ||
      source.ffname.toLowerCase().includes(sourceSearchText.toLowerCase()) ||
      source.code.toLowerCase().includes(sourceSearchText.toLowerCase())
    );

    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '320px'
      }}>
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Radio.Group
            value={sourceFilter.mode}
            onChange={e => setSourceFilter(prev => ({ ...prev, mode: e.target.value }))}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Radio.Button 
              value="include" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Include
            </Radio.Button>
            <Radio.Button 
              value="exclude" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Exclude
            </Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="Search sources..."
            value={sourceSearchText}
            onChange={e => setSourceSearchText(e.target.value)}
            size="small"
            allowClear
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {filteredSources.map(source => (
            <div 
              key={source.code} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <Checkbox
                checked={sourceFilter.sources.includes(source.code)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setSourceFilter(prev => ({
                    ...prev,
                    sources: isChecked 
                      ? [...prev.sources, source.code]
                      : prev.sources.filter(s => s !== source.code)
                  }));
                }}
              >
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center', 
                  gap: '8px'
                }}>
                  {/* Logo */}
                  {source.iata && (
                    <div style={{ 
                      width: '24px', 
                      height: '24px',
                      flexShrink: 0
                    }}>
                      <img 
                        src={`/${source.iata}.png`} 
                        alt={source.airline} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain',
                          borderRadius: '4px'
                        }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>
                  )}
                  
                  {/* Text content */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '500' }}>{source.airline}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>{source.ffname}</span>
                  </div>
                </div>
              </Checkbox>
            </div>
          ))}
          {filteredSources.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No sources found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render the airlines filter dropdown content
  const renderAirlinesDropdown = () => {
    // Filter airlines based on search text
    const filteredAirlines = uniqueAirlines.filter(airline => 
      airline.name.toLowerCase().includes(airlinesSearchText.toLowerCase()) ||
      airline.code.toLowerCase().includes(airlinesSearchText.toLowerCase())
    );

    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '320px'
      }}>
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Radio.Group
            value={airlinesFilter.mode}
            onChange={e => setAirlinesFilter(prev => ({ ...prev, mode: e.target.value }))}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Radio.Button 
              value="include" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Include
            </Radio.Button>
            <Radio.Button 
              value="exclude" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Exclude
            </Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="Search airlines..."
            value={airlinesSearchText}
            onChange={e => setAirlinesSearchText(e.target.value)}
            size="small"
            allowClear
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {filteredAirlines.map(airline => (
            <div 
              key={airline.code} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <Checkbox
                checked={airlinesFilter.airlines.includes(airline.code)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setAirlinesFilter(prev => ({
                    ...prev,
                    airlines: isChecked 
                      ? [...prev.airlines, airline.code]
                      : prev.airlines.filter(a => a !== airline.code)
                  }));
                }}
              >
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center', 
                  gap: '8px'
                }}>
                  {/* Logo */}
                  <div style={{ 
                    width: '24px', 
                    height: '24px',
                    flexShrink: 0
                  }}>
                    <img 
                      src={`/${airline.code}.png`} 
                      alt={airline.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  
                  {/* Text content */}
                  <div style={{ fontSize: '13px' }}>
                    {airline.name}
                  </div>
                </div>
              </Checkbox>
            </div>
          ))}
          {filteredAirlines.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No airlines found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render points filter dropdown
  const renderPointsDropdown = () => {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '16px',
        width: '380px'  // Increased from 320px to 380px
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div style={{ fontWeight: '500' }}>Points Range</div>
            {pointsFilter && (
              <Button 
                type="link" 
                size="small" 
                onClick={() => setPointsFilter(null)}
                style={{ padding: 0 }}
              >
                Reset
              </Button>
            )}
          </div>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            marginBottom: '16px',
            gap: '8px'
          }}>
            <Input
              value={pointsFilter ? pointsFilter[0].toLocaleString() : pointsRange[0].toLocaleString()}
              onChange={e => {
                try {
                  const value = parseInt(e.target.value.replace(/,/g, ''), 10);
                  if (!isNaN(value)) {
                    setPointsFilter([
                      value,
                      pointsFilter ? pointsFilter[1] : pointsRange[1]
                    ]);
                  }
                } catch (err) {}
              }}
              style={{ width: '110px' }}  // Slightly increased width
              size="small"
            />
            <span style={{ color: '#999' }}>to</span>
            <Input
              value={pointsFilter ? pointsFilter[1].toLocaleString() : pointsRange[1].toLocaleString()}
              onChange={e => {
                try {
                  const value = parseInt(e.target.value.replace(/,/g, ''), 10);
                  if (!isNaN(value)) {
                    setPointsFilter([
                      pointsFilter ? pointsFilter[0] : pointsRange[0],
                      value
                    ]);
                  }
                } catch (err) {}
              }}
              style={{ width: '110px' }}  // Slightly increased width
              size="small"
            />
          </div>
          
          <div style={{ padding: '0 8px' }}>  {/* Added padding to prevent marks from being cut off */}
            <Slider
              range
              min={pointsRange[0]}
              max={pointsRange[1]}
              value={pointsFilter || pointsRange}
              onChange={value => setPointsFilter(value)}
              tipFormatter={value => `${value.toLocaleString()} miles`}
              marks={{
                [pointsRange[0]]: {
                  label: pointsRange[0].toLocaleString(),
                  style: { transform: 'translateX(0%)' }  // Align left mark to left
                },
                [Math.floor(pointsRange[1] / 2)]: {
                  label: Math.floor(pointsRange[1] / 2).toLocaleString(),
                  style: { transform: 'translateX(-50%)' }  // Center middle mark
                },
                [pointsRange[1]]: {
                  label: pointsRange[1].toLocaleString(),
                  style: { transform: 'translateX(-100%)' }  // Align right mark to right
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // Get all unique dates with availability
  const getUniqueDates = () => {
    const dates = new Set();
    
    // Only add dates that have valid flights after filtering
    if (flightData?.data) {
      Object.entries(flightData.data).forEach(([dateString, dateData]) => {
        // Check if this date has any valid segments
        let hasValidSegments = false;
        
        Object.entries(dateData).forEach(([route, data]) => {
          // Check if this route is valid for our currentRoute sequence
          if (isValidSegmentForRoute(route)) {
            // Check if there's at least one available class
            const hasAvailability = 
              data.classes.Y.available || 
              data.classes.W.available || 
              data.classes.J.available || 
              data.classes.F.available;
            
            if (hasAvailability) {
              hasValidSegments = true;
            }
          }
        });
        
        if (hasValidSegments) {
          dates.add(dateString);
        }
      });
    }
    
    // Sort dates chronologically
    return Array.from(dates).sort();
  };

  // Memoize unique dates to prevent recalculation
  const uniqueDates = useMemo(getUniqueDates, [flightData]);

  // Render the dates dropdown content
  const renderDatesDropdown = () => {
    // Format date for display
    const formatDateForDisplay = (dateString) => {
      const date = dayjs(dateString);
      return date.format('ddd, MMM D, YYYY');
    };

    // Get filtered dates based on search text
    const filteredDates = uniqueDates.filter(dateString => {
      const displayDate = formatDateForDisplay(dateString);
      return displayDate.toLowerCase().includes(dateSearchText.toLowerCase());
    });

    return (
      <div style={{ 
        padding: '8px 0', 
        width: '300px', 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        border: '1px solid #f0f0f0',
        borderRadius: '2px'
      }}>
        <div style={{ 
          padding: '0 12px 8px', 
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: 'white'
        }}>
          <Input.Search
            placeholder="Search dates..."
            value={dateSearchText}
            onChange={e => setDateSearchText(e.target.value)}
            style={{ width: '100%' }}
            size="small"
          />
        </div>
        
        <div style={{ 
          padding: '8px 12px',
          backgroundColor: 'white'
        }}>
          <Radio.Group
            value={dateFilter.length > 0 ? 'custom' : 'all'}
            onChange={e => {
              if (e.target.value === 'all') {
                setDateFilter([]);
              }
            }}
            style={{ marginBottom: '8px' }}
          >
            <Radio value="all">All Dates</Radio>
            <Radio value="custom">Custom</Radio>
          </Radio.Group>
        </div>
        
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          padding: '0 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          backgroundColor: 'white'
        }}>
          {filteredDates.map(dateString => (
            <div 
              key={dateString}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '4px 0',
                backgroundColor: 'white'
              }}
            >
              <Checkbox
                checked={dateFilter.includes(dateString)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setDateFilter(prev => {
                    if (isChecked) {
                      return [...prev, dateString];
                    } else {
                      return prev.filter(d => d !== dateString);
                    }
                  });
                }}
              >
                {formatDateForDisplay(dateString)}
              </Checkbox>
            </div>
          ))}
          {filteredDates.length === 0 && (
            <div style={{ padding: '8px 0', color: '#999', textAlign: 'center', backgroundColor: 'white' }}>
              No dates found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to get segment index in the route order
  const getSegmentIndex = (origin, destination) => {
    // Skip if no route is selected
    if (!currentRoute || currentRoute.length < 2) return -1;
    
    // Check each segment in the route
    for (let i = 0; i < currentRoute.length - 1; i++) {
      const fromGroup = currentRoute[i];
      const toGroup = currentRoute[i + 1];
      
      // Check if the segment belongs to this route segment
      const fromAirports = airportGroups[fromGroup]?.split('/') || [fromGroup];
      const toAirports = airportGroups[toGroup]?.split('/') || [toGroup];
      
      // If this segment is part of this route section
      if (fromAirports.includes(origin) && toAirports.includes(destination)) {
        return i;
      }
    }
    return -1; // Segment not found in route
  };

  // Helper function to compare two segments for ordering
  const compareSegments = (a, b) => {
    // Get the origin and destination of each route
    const [aOrigin, aDest] = typeof a === 'string' ? a.split('-') : a.route.split('-');
    const [bOrigin, bDest] = typeof b === 'string' ? b.split('-') : b.route.split('-');
    
    // Get segment indices for both routes
    const aIndex = getSegmentIndex(aOrigin, aDest);
    const bIndex = getSegmentIndex(bOrigin, bDest);
    
    // Sort by segment index first
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    
    // If both routes are in the same segment, sort by exact matches to currentRoute first
    if (aOrigin === currentRoute[aIndex] && aDest === currentRoute[aIndex + 1]) return -1;
    if (bOrigin === currentRoute[bIndex] && bDest === currentRoute[bIndex + 1]) return 1;
    
    // Next, prioritize routes where the origin matches the exact origin in currentRoute
    if (aOrigin === currentRoute[aIndex] && bOrigin !== currentRoute[bIndex]) return -1;
    if (bOrigin === currentRoute[bIndex] && aOrigin !== currentRoute[aIndex]) return 1;
    
    // Next, prioritize routes where the destination matches the exact destination in currentRoute
    if (aDest === currentRoute[aIndex + 1] && bDest !== currentRoute[bIndex + 1]) return -1;
    if (bDest === currentRoute[bIndex + 1] && aDest !== currentRoute[aIndex + 1]) return 1;
    
    // For routes in the same segment group with no exact matches, sort alphabetically
    const routeA = typeof a === 'string' ? a : a.route;
    const routeB = typeof b === 'string' ? b : b.route;
    return routeA.localeCompare(routeB);
  };

  // When sorting validFlights:
  const sortSegments = (a, b) => {
    // Use custom order if available
    if (segmentOrder.length > 0) {
      const aIndex = segmentOrder.indexOf(a.route);
      const bIndex = segmentOrder.indexOf(b.route);
      
      // If both routes are in our order, use that order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one route is in our order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
    }
    
    // Use the common segment comparison function
    return compareSegments(a, b);
  };

  // Add a helper function to get flights for a class with all filters applied
  const getFlightsForClassWithFilters = (route, classCode, dateString, classData) => {
    // Skip if class isn't available at all
    if (!classData[classCode]) return [];
    
    let flights = getEnrichedFlightData(route, classCode, dateString, classData);
    
    // Apply direct filter
    if (directFilter) {
      flights = flights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        return rawFlight[`${classCode}Direct`] === true;
      });
    }
    
    // Apply source filter
    if (sourceFilter.sources.length > 0) {
      flights = flights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight || !rawFlight.source) return false;
        
        const matchesSource = sourceFilter.sources.includes(rawFlight.source);
        return sourceFilter.mode === 'include' ? matchesSource : !matchesSource;
      });
    }
    
    // Apply airlines filter
    if (airlinesFilter.airlines.length > 0) {
      flights = flights.filter(flight => {
        const rawFlight = flight.rawData;
        if (!rawFlight) return false;
        
        // Get the airlines based on direct/indirect
        const airlinesString = directFilter 
          ? rawFlight[`${classCode}DirectAirlines`] 
          : rawFlight[`${classCode}Airlines`];
        
        if (!airlinesString) return false;
        
        // Parse the airlines list
        const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
        
        // Special logic: only filter out if ALL airlines are excluded
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
    if (pointsFilter) {
      flights = flights.filter(flight => {
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
    
    return flights;
  };

  // Get ordered segments - use this for display
  const getOrderedSegments = () => {
    // If we have a custom order, use it
    if (segmentOrder.length > 0) {
      // Start with ordered segments that exist in uniqueSegments
      const orderedSegments = segmentOrder.filter(segment => uniqueSegments.includes(segment));
      
      // Add any segments that aren't in the order yet
      uniqueSegments.forEach(segment => {
        if (!orderedSegments.includes(segment)) {
          orderedSegments.push(segment);
        }
      });
      
      return orderedSegments;
    }
    
    // Otherwise sort segments using the common comparison function
    return [...uniqueSegments].sort(compareSegments);
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

  // Filter flights based on selected segments, classes, direct filter, and sources
  const filterFlights = (flights) => {
    if (segmentFilter.segments.length === 0 && 
        classFilter.length === 0 && 
        !directFilter &&
        dateFilter.length === 0 &&
        groupFilters.length === 0) {
      // Even with no filters, we still only want to show valid segments
      return Object.entries(flights).reduce((filtered, [route, data]) => {
        // Only include segments that follow the route sequence
        if (isValidSegmentForRoute(route)) {
          filtered[route] = data;
        }
        return filtered;
      }, {});
    }
    
    return Object.entries(flights).reduce((filtered, [route, data]) => {
      // First check if this is a valid segment for the route
      if (!isValidSegmentForRoute(route)) {
        return filtered;
      }

      // Check if it passes the group-based filter
      if (!passesGroupFilter(route)) {
        return filtered;
      }

      // Check segment filter
      const isInSegmentFilter = segmentFilter.segments.includes(route);
      const passesSegmentFilter = 
        segmentFilter.segments.length === 0 || 
        (segmentFilter.mode === 'include' && isInSegmentFilter) || 
        (segmentFilter.mode === 'exclude' && !isInSegmentFilter);
      
      // Check direct and class filters
      let passesClassAndDirectFilter = true;
      
      if (directFilter) {
        if (classFilter.length === 0) {
          // If Direct filter is ON but no Class filter is selected
          // Show routes with ANY direct cabin class
          passesClassAndDirectFilter = 
            data.classes.Y.direct || 
            data.classes.W.direct || 
            data.classes.J.direct || 
            data.classes.F.direct;
        } else {
          // If Direct filter is ON and specific Class filters are selected
          // Show routes with direct flights in ANY of the selected cabin classes
          passesClassAndDirectFilter = classFilter.some(cls => {
            switch(cls) {
              case 'Economy': return data.classes.Y.direct;
              case 'Premium Economy': return data.classes.W.direct;
              case 'Business': return data.classes.J.direct;
              case 'First': return data.classes.F.direct;
              default: return false;
            }
          });
        }
      } else if (classFilter.length > 0) {
        // If Direct filter is OFF but Class filter is ON
        // Show routes with ANY class availability matching the filter
        passesClassAndDirectFilter = classFilter.some(cls => {
          switch(cls) {
            case 'Economy': return data.classes.Y.available;
            case 'Premium Economy': return data.classes.W.available;
            case 'Business': return data.classes.J.available;
            case 'First': return data.classes.F.available;
            default: return false;
          }
        });
      }
      
      // Source filter is now only applied at the tooltip level, not the route level
      
      if (passesSegmentFilter && passesClassAndDirectFilter) {
        filtered[route] = data;
      }
      
      return filtered;
    }, {});
  };

  // Use this function to check if a date should be rendered based on the date filter
  const shouldRenderDate = (dateString) => {
    return dateFilter.length === 0 || dateFilter.includes(dateString);
  };

  // Render the "Add filter" dropdown menu
  const addFilterMenu = (
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
  );

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

  // Get all unique origins and destinations for group filter
  const getGroupFilterOptions = () => {
    // Initialize sets to store unique airport codes
    const origins = new Set();
    const destinations = new Set();
    
    // Create a map of IATA codes to airport info for quick lookup
    const airportMap = new Map(airports.map(airport => [airport.IATA, airport]));
    
    // Extract airports from flight data
    if (flightData?.data) {
      Object.values(flightData.data).forEach(dateData => {
        Object.keys(dateData).forEach(route => {
          if (isValidSegmentForRoute(route)) {
            const [origin, destination] = route.split('-');
            origins.add(origin);
            destinations.add(destination);
          }
        });
      });
    }
    
    // Add airport groups from the route (except the last one) to origins
    const originGroups = [];
    for (let i = 0; i < currentRoute.length - 1; i++) {
      originGroups.push({
        code: currentRoute[i],
        name: airportGroupDescriptions[currentRoute[i]] || currentRoute[i],
        expanded: airportGroups[currentRoute[i]] || currentRoute[i],
        isGroup: !!airportGroups[currentRoute[i]]
      });
    }
    
    // Add airport groups from the route (except the first one) to destinations
    const destGroups = [];
    for (let i = 1; i < currentRoute.length; i++) {
      destGroups.push({
        code: currentRoute[i],
        name: airportGroupDescriptions[currentRoute[i]] || currentRoute[i],
        expanded: airportGroups[currentRoute[i]] || currentRoute[i],
        isGroup: !!airportGroups[currentRoute[i]]
      });
    }
    
    // Convert sets to arrays of option objects
    const originOptions = Array.from(origins).map(code => {
      const airport = airportMap.get(code);
      return {
        code: code,
        name: airport ? `${airport.CityName} (${airport.Country})` : code,
        isGroup: false
      };
    });
    
    const destOptions = Array.from(destinations).map(code => {
      const airport = airportMap.get(code);
      return {
        code: code,
        name: airport ? `${airport.CityName} (${airport.Country})` : code,
        isGroup: false
      };
    });
    
    return {
      originOptions: [...originGroups, ...originOptions],
      destOptions: [...destGroups, ...destOptions]
    };
  };
  
  // Memoize group filter options
  const groupFilterOptions = useMemo(getGroupFilterOptions, [flightData, currentRoute]);
  
  // Check if a segment passes the group-based filter
  const passesGroupFilter = (route) => {
    // If no group filters are applied, all segments pass
    if (Object.keys(groupFilters).length === 0) {
      return true;
    }
    
    const [origin, destination] = route.split('-');
    
    // Check if any group filter matches
    return Object.values(groupFilters).some(filter => {
      const originFilter = filter.originFilter || { mode: 'include', airports: [] };
      const destFilter = filter.destFilter || { mode: 'include', airports: [] };
      
      // Skip if no airports are selected in this filter
      if (originFilter.airports.length === 0 && destFilter.airports.length === 0) {
        return true;
      }
      
      // Check origin match
      let originMatch = originFilter.airports.length === 0; // Match by default if no airports selected
      
      if (originFilter.airports.length > 0) {
        // Direct match
        const directMatch = originFilter.airports.includes(origin);
        
        // Group match (check if origin is part of any selected group)
        const groupMatch = originFilter.airports.some(group => {
          const airports = airportGroups[group]?.split('/') || [];
          return airports.includes(origin);
        });
        
        originMatch = (directMatch || groupMatch);
        
        // Apply include/exclude logic
        if (originFilter.mode === 'exclude') {
          originMatch = !originMatch;
        }
      }
      
      // Check destination match
      let destMatch = destFilter.airports.length === 0; // Match by default if no airports selected
      
      if (destFilter.airports.length > 0) {
        // Direct match
        const directMatch = destFilter.airports.includes(destination);
        
        // Group match (check if destination is part of any selected group)
        const groupMatch = destFilter.airports.some(group => {
          const airports = airportGroups[group]?.split('/') || [];
          return airports.includes(destination);
        });
        
        destMatch = (directMatch || groupMatch);
        
        // Apply include/exclude logic
        if (destFilter.mode === 'exclude') {
          destMatch = !destMatch;
        }
      }
      
      // Pass if both origin and destination match
      return originMatch && destMatch;
    });
  };

  // Render additional filter line content
  const renderAdditionalFilter = () => {
    if (additionalFilters.length === 0) return null;
    
    return additionalFilters.map(filter => {
      if (filter.type === 'group') {
        return (
          <div key={filter.id} style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontWeight: 600, 
              marginRight: '4px',
              fontSize: '14px'
            }}>
              Group-based Filter
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>for</span>
            <Dropdown 
              overlay={renderOriginDropdown(filter.id)}
              trigger={['click']}
            >
              <Button 
                type={groupFilters[filter.id]?.originFilter?.airports?.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: groupFilters[filter.id]?.originFilter?.airports?.length > 0 ? 600 : 400
                }}
              >
                Origins {groupFilters[filter.id]?.originFilter?.airports?.length > 0 && `(${groupFilters[filter.id]?.originFilter?.airports?.length})`}
              </Button>
            </Dropdown>
            
            <span style={{ whiteSpace: 'nowrap' }}>to</span>
            <Dropdown 
              overlay={renderDestDropdown(filter.id)}
              trigger={['click']}
            >
              <Button 
                type={groupFilters[filter.id]?.destFilter?.airports?.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: groupFilters[filter.id]?.destFilter?.airports?.length > 0 ? 600 : 400
                }}
              >
                Destinations {groupFilters[filter.id]?.destFilter?.airports?.length > 0 && `(${groupFilters[filter.id]?.destFilter?.airports?.length})`}
              </Button>
            </Dropdown>
            <span style={{ whiteSpace: 'nowrap' }}>:</span>
            
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              style={{ marginLeft: 'auto', color: '#ff4d4f' }}
              onClick={() => deleteFilter(filter.id)}
            />
          </div>
        );
      } else if (filter.type === 'segment') {
        return (
          <div key={filter.id} style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            borderRadius: '4px',
            marginBottom: '8px'
          }}>
            <span style={{ 
              fontWeight: 600, 
              marginRight: '4px',
              fontSize: '14px'
            }}>
              Segment-based Filter
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>for</span>
            <Dropdown 
              overlay={renderSegmentsDropdownSimple(filter.id)}
              trigger={['click']}
            >
              <Button 
                type={segmentFilters[filter.id]?.segments?.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: segmentFilters[filter.id]?.segments?.length > 0 ? 600 : 400
                }}
              >
                Segments {segmentFilters[filter.id]?.segments?.length > 0 && `(${segmentFilters[filter.id]?.segments?.length})`}
              </Button>
            </Dropdown>
            <span style={{ whiteSpace: 'nowrap' }}>:</span>
            
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              style={{ marginLeft: 'auto', color: '#ff4d4f' }}
              onClick={() => deleteFilter(filter.id)}
            />
          </div>
        );
      }
      return null;
    });
  };

  // Render origin filter dropdown for group-based filter
  const renderOriginDropdown = (filterId) => {
    const currentFilter = groupFilters[filterId] || { originFilter: { mode: 'include', airports: [] } };
    
    // Filter options based on search text
    const filteredOptions = groupFilterOptions.originOptions.filter(option => 
      option.code.toLowerCase().includes(originSearchText.toLowerCase()) ||
      option.name.toLowerCase().includes(originSearchText.toLowerCase())
    );

    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '450px'
      }}>
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Radio.Group
            value={currentFilter.originFilter.mode}
            onChange={e => setGroupFilters(prev => ({
              ...prev,
              [filterId]: {
                ...prev[filterId],
                originFilter: {
                  ...prev[filterId].originFilter,
                  mode: e.target.value
                }
              }
            }))}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Radio.Button 
              value="include" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Include
            </Radio.Button>
            <Radio.Button 
              value="exclude" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Exclude
            </Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="Search origin airports/groups..."
            value={originSearchText}
            onChange={e => setOriginSearchText(e.target.value)}
            size="small"
            allowClear
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {filteredOptions.map(option => (
            <div 
              key={option.code} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer'
              }}
            >
              <Checkbox
                checked={currentFilter.originFilter.airports.includes(option.code)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setGroupFilters(prev => ({
                    ...prev,
                    [filterId]: {
                      ...prev[filterId],
                      originFilter: {
                        ...prev[filterId].originFilter,
                        airports: isChecked 
                          ? [...prev[filterId].originFilter.airports, option.code]
                          : prev[filterId].originFilter.airports.filter(a => a !== option.code)
                      }
                    }
                  }));
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '390px' }}>
                  <span style={{ fontWeight: 500 }}>{option.code}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis' 
                  }}>
                    {option.name}
                  </span>
                </div>
              </Checkbox>
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No options found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render destination filter dropdown for group-based filter
  const renderDestDropdown = (filterId) => {
    const currentFilter = groupFilters[filterId] || { destFilter: { mode: 'include', airports: [] } };
    
    // Filter options based on search text
    const filteredOptions = groupFilterOptions.destOptions.filter(option => 
      option.code.toLowerCase().includes(destSearchText.toLowerCase()) ||
      option.name.toLowerCase().includes(destSearchText.toLowerCase())
    );

    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '450px'
      }}>
        <div style={{ padding: '4px 12px 8px', borderBottom: '1px solid #f0f0f0' }}>
          <Radio.Group
            value={currentFilter.destFilter.mode}
            onChange={e => setGroupFilters(prev => ({
              ...prev,
              [filterId]: {
                ...prev[filterId],
                destFilter: {
                  ...prev[filterId].destFilter,
                  mode: e.target.value
                }
              }
            }))}
            style={{ display: 'flex', gap: '8px' }}
          >
            <Radio.Button 
              value="include" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Include
            </Radio.Button>
            <Radio.Button 
              value="exclude" 
              style={{ flex: 1, textAlign: 'center' }}
            >
              Exclude
            </Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="Search destination airports/groups..."
            value={destSearchText}
            onChange={e => setDestSearchText(e.target.value)}
            size="small"
            allowClear
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {filteredOptions.map(option => (
            <div 
              key={option.code} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer'
              }}
            >
              <Checkbox
                checked={currentFilter.destFilter.airports.includes(option.code)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setGroupFilters(prev => ({
                    ...prev,
                    [filterId]: {
                      ...prev[filterId],
                      destFilter: {
                        ...prev[filterId].destFilter,
                        airports: isChecked 
                          ? [...prev[filterId].destFilter.airports, option.code]
                          : prev[filterId].destFilter.airports.filter(a => a !== option.code)
                      }
                    }
                  }));
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', width: '390px' }}>
                  <span style={{ fontWeight: 500 }}>{option.code}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis' 
                  }}>
                    {option.name}
                  </span>
                </div>
              </Checkbox>
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No options found
            </div>
          )}
        </div>
      </div>
    );
  };

  // Simplified segment dropdown (no reordering, include only)
  const renderSegmentsDropdownSimple = (filterId) => {
    const currentFilter = segmentFilters[filterId] || { segments: [] };
    
    // Get filtered segments based on search text
    const filteredSegments = uniqueSegments.filter(segment => 
      segment.toLowerCase().includes(segmentSearchText.toLowerCase())
    );

    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '320px'
      }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
          <Input
            placeholder="Search segments..."
            value={segmentSearchText}
            onChange={e => setSegmentSearchText(e.target.value)}
            size="small"
            allowClear
            onClick={e => e.stopPropagation()}
          />
        </div>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {filteredSegments.map(segment => (
            <div 
              key={segment} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'white',
                borderBottom: '1px solid #f9f9f9'
              }}
            >
              <Checkbox
                checked={currentFilter.segments.includes(segment)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setSegmentFilters(prev => ({
                    ...prev,
                    [filterId]: {
                      ...prev[filterId],
                      segments: isChecked 
                        ? [...prev[filterId].segments, segment]
                        : prev[filterId].segments.filter(s => s !== segment)
                    }
                  }));
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {segment}
              </Checkbox>
            </div>
          ))}
          {filteredSegments.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No segments found
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Calendar container */}
      <div className="calendar-container" style={{ padding: '20px' }}>
        {/* Add filter buttons on top */}
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between', // Changed to space-between to put Add filter on right
          marginBottom: '8px', // Reduced margin to accommodate additional filter line
          gap: '8px',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontWeight: 600, 
              marginRight: '8px',
              fontSize: '14px'
            }}>
              Global Filter:
            </span>
            
            <Dropdown 
              dropdownRender={renderSegmentsDropdown}
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
            
            <Dropdown 
              dropdownRender={renderClassDropdown}
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
                Class {classFilter.length > 0 && `(${classFilter.length})`}
              </Button>
            </Dropdown>
            
            <Dropdown 
              dropdownRender={renderSourcesDropdown}
              trigger={['click']}
            >
              <Button 
                type={sourceFilter.sources.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: sourceFilter.sources.length > 0 ? 600 : 400
                }}
              >
                Sources {sourceFilter.sources.length > 0 && `(${sourceFilter.sources.length})`}
              </Button>
            </Dropdown>
            
            <Dropdown 
              dropdownRender={renderAirlinesDropdown}
              trigger={['click']}
            >
              <Button 
                type={airlinesFilter.airlines.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: airlinesFilter.airlines.length > 0 ? 600 : 400
                }}
              >
                Airlines {airlinesFilter.airlines.length > 0 && `(${airlinesFilter.airlines.length})`}
              </Button>
            </Dropdown>
            
            <Dropdown 
              dropdownRender={renderPointsDropdown}
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
            
            <Dropdown 
              dropdownRender={renderDatesDropdown}
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
            
            <Checkbox 
              checked={directFilter}
              onChange={e => setDirectFilter(e.target.checked)}
              style={{ marginLeft: '8px' }}
            >
              <span style={{ fontWeight: directFilter ? 600 : 400 }}>Direct Only</span>
            </Checkbox>
          </div>
          
          {/* Add filter button on right side */}
          <Dropdown 
            overlay={addFilterMenu}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button 
              type="default"
              size="small"
              icon={<PlusOutlined />}
              style={{ fontWeight: 500 }}
            >
              Add filter
            </Button>
          </Dropdown>
        </div>
        
        {/* Render additional filter line if a type is selected */}
        {additionalFilters.length > 0 && (
          <div style={{ 
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: '16px',
            gap: '8px',
            alignItems: 'center'
          }}>
            {renderAdditionalFilter()}
          </div>
        )}

        {/* Calendar header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <Button 
            type="primary"
            onClick={goToPrevMonth}
            style={{ backgroundColor: '#000000' }}
          >
            &larr;
          </Button>
          <Title level={4} style={{ margin: 0 }}>{monthNames[currentMonth]} {currentYear}</Title>
          <Button 
            type="primary"
            onClick={goToNextMonth}
            style={{ backgroundColor: '#000000' }}
          >
            &rarr;
          </Button>
        </div>

        {/* Calendar grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 200px)',
          border: '1px solid #f0f0f0',
          backgroundColor: '#f0f0f0',
          gap: '1px',
          fontFamily: 'Menlo, monospace',
          width: 'fit-content'
        }}>
          {/* Day headers */}
          {dayNames.map(day => (
            <div key={day} style={{ 
              backgroundColor: '#f5f5f5',
              padding: '8px',
              textAlign: 'center',
              fontWeight: '500',
              width: '200px'
            }}>
              {day}
            </div>
          ))}

          {/* Empty cells for days of week before the first day of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} style={{ 
              backgroundColor: 'white',
              minHeight: '120px',
              padding: '8px',
              width: '200px'
            }} />
          ))}

          {/* Calendar day cells */}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const dateString = formatDate(currentYear, currentMonth, day);
            
            // Skip rendering this cell if it's filtered out by date filter
            if (dateFilter.length > 0 && !dateFilter.includes(dateString)) {
              return (
                <div
                  key={`day-${day}`}
                  style={{
                    backgroundColor: '#f9f9f9',
                    minHeight: '120px',
                    padding: '8px',
                    opacity: 0.5,
                    width: '200px'
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{day}</div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#999',
                    textAlign: 'center',
                    marginTop: '20px'
                  }}>
                    Filtered out
                  </div>
                </div>
              );
            }
            
            const rawFlights = flightData?.data?.[dateString] || {};
            // Apply segment and class filtering
            const flights = filterFlights(rawFlights);
            
            // Sort routes based on the pattern: BOS-EWR/JFK/LGA first, then EWR/JFK/LGA-MIA
            const validFlights = Object.entries(flights)
              .map(([route, data]) => ({
                route,
                classes: {
                  Y: data.classes.Y.available,
                  W: data.classes.W.available,
                  J: data.classes.J.available,
                  F: data.classes.F.available,
                  YDirect: data.classes.Y.direct,
                  WDirect: data.classes.W.direct,
                  JDirect: data.classes.J.direct,
                  FDirect: data.classes.F.direct,
                  YSources: data.classes.Y.sources,
                  WSources: data.classes.W.sources,
                  JSources: data.classes.J.sources,
                  FSources: data.classes.F.sources,
                  YFlights: data.classes.Y.flights,
                  WFlights: data.classes.W.flights,
                  JFlights: data.classes.J.flights,
                  FFlights: data.classes.F.flights
                }
              }))
              .sort(sortSegments);

            // Filter to only show routes with at least one available class
            const filteredValidFlights = validFlights.filter(segment => {
              // Check if there's at least one available cabin class after all filtering
              const classesToCheck = ['Y', 'W', 'J', 'F'];
              return classesToCheck.some(classCode => {
                if (!segment.classes[classCode]) return false;
                // Get the flights for this class after all filtering
                const flights = getFlightsForClassWithFilters(segment.route, classCode, dateString, segment.classes);
                return flights.length > 0;
              });
            });

            const showFlights = filteredValidFlights.length > 0;
            const isSelected = isDateInRange(dateString);
            const isStart = dateString === selectionRef.current.start;
            const isEnd = dateString === selectionRef.current.end;
            
            // Pagination logic
            const ITEMS_PER_PAGE = 10;
            const currentPage = cellPages[dateString] || 0;
            const totalPages = Math.ceil(filteredValidFlights.length / ITEMS_PER_PAGE);
            const paginatedFlights = filteredValidFlights.slice(
              currentPage * ITEMS_PER_PAGE, 
              (currentPage + 1) * ITEMS_PER_PAGE
            );
            const showPagination = filteredValidFlights.length > ITEMS_PER_PAGE;

            return (
              <div
                key={`day-${day}`}
                style={{
                  backgroundColor: isSelected ? '#e6f4ff' : 'white',
                  minHeight: '120px',
                  padding: '8px',
                  fontFamily: 'Menlo, monospace',
                  cursor: 'pointer',
                  border: isStart || isEnd ? '2px solid #000000' : 'none',
                  width: '200px',
                  position: 'relative' // Added for pagination positioning
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDateClick(dateString);
                }}
              >
                <div style={{ 
                  fontWeight: 'bold', 
                  marginBottom: '8px',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>{day}</span>
                  {filteredValidFlights.length > 0 && (
                    <span style={{ 
                      fontSize: '11px', 
                      color: '#666',
                      backgroundColor: '#f5f5f5',
                      padding: '1px 5px',
                      borderRadius: '10px'
                    }}>
                      {filteredValidFlights.length} route{filteredValidFlights.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {showFlights ? (
                  <>
                  <div style={{ fontSize: '12px' }}>
                      {paginatedFlights.map((segment, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          marginBottom: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '20px'
                        }}
                      >
                        <div style={{ 
                          fontSize: '14px',
                          fontFamily: 'Menlo, monospace'
                        }}>
                          {segment.route}
                        </div>
                        {renderAvailabilityBadges(segment.route, segment.classes, dateString)}
                      </div>
                    ))}
                  </div>
                    
                    {/* Pagination controls */}
                    {showPagination && (
                      <div 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '8px',
                          fontSize: '11px',
                          color: '#555',
                          borderTop: '1px solid #f0f0f0',
                          paddingTop: '6px'
                        }}
                        onClick={(e) => e.stopPropagation()} // Prevent date selection when clicking pagination
                      >
                        <button
                          disabled={currentPage === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePageChange(dateString, 'prev', e);
                          }}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: 'transparent',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                            color: currentPage === 0 ? '#bbb' : '#555',
                            transition: 'all 0.2s',
                            fontSize: '10px'
                          }}
                        >
                          &lt;
                        </button>
                        
                        <span style={{ fontSize: '10px' }}>{`${currentPage + 1} / ${totalPages}`}</span>
                        
                        <button
                          disabled={currentPage === totalPages - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePageChange(dateString, 'next', e);
                          }}
                          style={{
                            padding: '2px 6px',
                            backgroundColor: 'transparent',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                            color: currentPage === totalPages - 1 ? '#bbb' : '#555',
                            transition: 'all 0.2s',
                            fontSize: '10px'
                          }}
                        >
                          &gt;
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#999', 
                    fontSize: '12px',
                    marginTop: '32px',
                    fontFamily: 'Menlo, monospace'
                  }}>
                    No flights
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div style={{ 
            color: '#ff4d4f', 
            marginTop: '16px',
            textAlign: 'center' 
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default NormalFlightAvailabilityCalendar; 