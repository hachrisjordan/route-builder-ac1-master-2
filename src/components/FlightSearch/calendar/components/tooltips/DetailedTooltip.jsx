/**
 * DetailedTooltip.jsx
 * Creates a detailed tooltip for flight availability in detailed view mode
 */

import { convertCurrency } from '../../utils/currencyUtils';
import { formatTaxes, getAirlineName } from '../../utils/flightUtils';
import { getSourceByCodename } from '../../data/sources';
import airlines from '../../data/airlines_full';

// Create detailed tooltip for the detailed view
const createDetailedTooltip = (classCode, flights, route, currencyFilter = { enabled: false }, directFilter = false, airlinesFilter = { airlines: [] }, pointsFilter = null, timeFilters = { departure: { enabled: false }, arrival: { enabled: false }, duration: { enabled: false } }) => {
  // Create a div element for the tooltip content
  const tooltipDiv = document.createElement('div');
  tooltipDiv.style.width = '1320px';
  tooltipDiv.style.padding = '12px';
  tooltipDiv.style.backgroundColor = 'white';
  tooltipDiv.style.borderRadius = '8px';
  tooltipDiv.style.boxShadow = '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)';
  tooltipDiv.style.fontFamily = 'Menlo, monospace';
  tooltipDiv.style.fontSize = '11px'; // Match summary view font size
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
  
  // Add filter indicators in the title
  const filterInfo = [];
  if (directFilter) filterInfo.push('Direct only');
  if (airlinesFilter?.airlines?.length > 0) {
    filterInfo.push(`Airlines: ${airlinesFilter.mode === 'include' ? 'Including' : 'Excluding'} ${airlinesFilter.airlines.join(', ')}`);
  }
  if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
    filterInfo.push(`Points: ${pointsFilter[0]}-${pointsFilter[1]}`);
  }
  
  // Add time filters to filter info
  if (timeFilters?.departure?.enabled) {
    const start = formatHoursToTime(timeFilters.departure.range[0]);
    const end = formatHoursToTime(timeFilters.departure.range[1]);
    filterInfo.push(`Departure: ${start}-${end}`);
  }
  if (timeFilters?.arrival?.enabled) {
    const start = formatHoursToTime(timeFilters.arrival.range[0]);
    const end = formatHoursToTime(timeFilters.arrival.range[1]);
    filterInfo.push(`Arrival: ${start}-${end}`);
  }
  if (timeFilters?.duration?.enabled) {
    const start = formatMinutesToHM(timeFilters.duration.range[0]);
    const end = formatMinutesToHM(timeFilters.duration.range[1]);
    filterInfo.push(`Duration: ${start}-${end}`);
  }
  
  const filterText = filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : '';
  titleDiv.textContent = `${route} - ${classCode} Class${filterText}`;
  
  tooltipDiv.appendChild(titleDiv);
  
  // Helper functions for time formatting
  function formatHoursToTime(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  function formatMinutesToHM(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  }
  
  // Helper to convert time string to decimal hours
  function timeToDecimalHours(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  }
  
  // Sort state
  let sortField = 'mileValue'; // Default sort by miles
  let sortOrder = 'asc'; // Default order ascending
  
  // Function to update sort state and re-render
  const updateSort = (field) => {
    if (sortField === field) {
      // Toggle order if clicking same field
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Set new field and default to ascending
      sortField = field;
      sortOrder = 'asc';
    }
    renderCurrentPage();
    updateSortIndicators();
  };
  
  // Create table header
  const headerRow = document.createElement('div');
  headerRow.style.display = 'grid';
  headerRow.style.gridTemplateColumns = '1.8fr 1fr 2.4fr 1.2fr 1fr 0.8fr 0.8fr 2.4fr 1.8fr';
  headerRow.style.columnGap = '12px';
  headerRow.style.backgroundColor = '#fafafa';
  headerRow.style.padding = '8px 4px';
  headerRow.style.fontWeight = '500';
  headerRow.style.borderBottom = '1px solid #f0f0f0';
  headerRow.style.position = 'sticky';
  headerRow.style.top = titleDiv.clientHeight + 'px';
  headerRow.style.zIndex = '1';
  headerRow.style.fontSize = '13px'; // Increased font size for header row
  
  // Helper function to create sortable header
  const createSortableHeader = (text, field, width = '13px') => {
    const header = document.createElement('div');
    header.textContent = text;
    header.style.fontSize = width;
    header.style.cursor = 'pointer';
    header.style.userSelect = 'none';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '4px';
    
    // Add sort indicator
    const sortIndicator = document.createElement('span');
    sortIndicator.id = `sort-indicator-${field}`;
    sortIndicator.style.opacity = sortField === field ? '1' : '0.3';
    sortIndicator.textContent = sortField === field 
      ? (sortOrder === 'asc' ? '↑' : '↓') 
      : '↕';
    sortIndicator.style.fontSize = '10px';
    header.appendChild(sortIndicator);
    
    // Add click handler
    header.onclick = () => updateSort(field);
    
    return header;
  };
  
  // Create headers with sort functionality
  const pathHeader = createSortableHeader('Path', 'path', '13px');
  const flightNumberHeader = createSortableHeader('Flight #', 'flightNumber');
  const airlinesHeader = createSortableHeader('Airlines', 'airlines');
  const aircraftHeader = createSortableHeader('Aircraft', 'aircraft');
  const durationHeader = createSortableHeader('Duration', 'durationMinutes');
  const departsHeader = createSortableHeader('Departs', 'departs');
  const arrivesHeader = createSortableHeader('Arrives', 'arrives');
  const sourceHeader = createSortableHeader('Source', 'source');
  const priceHeader = createSortableHeader('Price', 'mileValue', '13px');
  priceHeader.style.textAlign = 'right';
  
  // Function to update sort indicators based on current sort state
  const updateSortIndicators = () => {
    ['path', 'flightNumber', 'airlines', 'aircraft', 'durationMinutes', 
     'departs', 'arrives', 'source', 'mileValue'].forEach(field => {
      const indicator = document.getElementById(`sort-indicator-${field}`);
      if (indicator) {
        indicator.style.opacity = sortField === field ? '1' : '0.3';
        indicator.textContent = sortField === field 
          ? (sortOrder === 'asc' ? '↑' : '↓') 
          : '↕';
      }
    });
  };
  
  headerRow.appendChild(pathHeader);
  headerRow.appendChild(flightNumberHeader);
  headerRow.appendChild(airlinesHeader);
  headerRow.appendChild(aircraftHeader);
  headerRow.appendChild(durationHeader);
  headerRow.appendChild(departsHeader);
  headerRow.appendChild(arrivesHeader);
  headerRow.appendChild(sourceHeader);
  headerRow.appendChild(priceHeader);
  tooltipDiv.appendChild(headerRow);
  
  // Create the container for trip rows
  const rowsContainer = document.createElement('div');
  rowsContainer.style.overflowY = 'visible';
  rowsContainer.style.flex = '1';
  rowsContainer.style.display = 'flex';
  rowsContainer.style.flexDirection = 'column';
  rowsContainer.style.gap = '0px'; // Ensure consistent spacing between rows
  
  // Pagination state
  let currentPage = 0;
  const ITEMS_PER_PAGE = 10;
  
  // Process available trips for display
  const allTrips = [];
  
  // Collect all trips first, applying all filters
  for (const flight of flights) {
    // Check if this flight has availability trips
    if (!flight.rawData || !flight.rawData.AvailabilityTrips) continue;
    
    const flightSource = flight.rawData.source || '';
    const availabilityTrips = flight.rawData.AvailabilityTrips;
    // Get the TaxesCurrency from the flight data
    const taxesCurrency = flight.rawData.TaxesCurrency || flight.rawData.Currency;
    
    // Process each trip
    availabilityTrips.forEach(trip => {
      // Attach the TaxesCurrency to each trip from the parent flight
      trip.TaxesCurrency = taxesCurrency;
      
      // Get appropriate mile value based on classCode
      let mileValue;
      if (classCode === 'Y') {
        mileValue = trip.YMile;
      } else if (classCode === 'W') {
        mileValue = trip.WMile;
      } else if (classCode === 'J') {
        mileValue = trip.JMile;
      } else if (classCode === 'F') {
        mileValue = trip.FMile;
      }
      
      // Only add trips that have non-zero miles for the current class
      if (mileValue && mileValue > 0) {
        // Apply direct filter - skip any trip with Stops > 0 if directFilter is enabled
        if (directFilter && trip.Stops !== 0) {
          return; // Skip this trip since it's not direct
        }
        
        // Apply airlines filter if it exists
        if (airlinesFilter?.airlines?.length > 0) {
          // Extract airline codes from flight numbers
          const tripAirlines = new Set();
          if (trip.FlightNumbers && Array.isArray(trip.FlightNumbers)) {
            trip.FlightNumbers.forEach(flightNum => {
              // Take the first 2 characters as the airline code instead of removing digits
              const airlineCode = flightNum.substring(0, 2);
              if (airlineCode) {
                tripAirlines.add(airlineCode);
              }
            });
          }
          
          // Use the actual Airlines array if available
          if (trip.Airlines && Array.isArray(trip.Airlines)) {
            trip.Airlines.forEach(airline => tripAirlines.add(airline));
          }
          
          // Check if any airline matches the filter
          const airlinesList = Array.from(tripAirlines);
          if (airlinesFilter.mode === 'include') {
            // In include mode, at least one airline must be included
            const hasIncludedAirline = airlinesList.some(airline => 
              airlinesFilter.airlines.includes(airline)
            );
            if (!hasIncludedAirline) {
              return; // Skip this trip - no matching airline
            }
          } else {
            // In exclude mode, only filter out if ALL airlines are excluded
            const allAirlinesExcluded = airlinesList.length > 0 && 
              airlinesList.every(airline => airlinesFilter.airlines.includes(airline));
            if (allAirlinesExcluded) {
              return; // Skip this trip - all airlines are excluded
            }
          }
        }
        
        // Apply points filter if it exists
        if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
          if (mileValue < pointsFilter[0] || mileValue > pointsFilter[1]) {
            return; // Skip this trip - outside points range
          }
        }
        
        // Extract time information for filtering
        const departsAt = new Date(trip.DepartsAt);
        const arrivesAt = new Date(trip.ArrivesAt);
        
        // Get the actual hours and minutes directly from the string for filtering
        const getTimeDecimal = (timeString) => {
          // Extract HH:MM directly from the timestamp
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
          
          // Fallback to the Date object if string parsing fails
          const date = new Date(timeString);
          return date.getHours() + (date.getMinutes() / 60);
        };
        
        // Apply departure time filter if enabled
        if (timeFilters?.departure?.enabled) {
          const departureHour = getTimeDecimal(trip.DepartsAt);
          const [minHour, maxHour] = timeFilters.departure.range;
          if (departureHour < minHour || departureHour > maxHour) {
            return; // Skip this trip - outside departure time range
          }
        }
        
        // Apply arrival time filter if enabled
        if (timeFilters?.arrival?.enabled) {
          const arrivalHour = getTimeDecimal(trip.ArrivesAt);
          const [minHour, maxHour] = timeFilters.arrival.range;
          if (arrivalHour < minHour || arrivalHour > maxHour) {
            return; // Skip this trip - outside arrival time range
          }
        }
        
        // Calculate duration in minutes for filtering and sorting
        let durationMinutes = 0;
        if (trip.TotalDuration) {
          durationMinutes = trip.TotalDuration;
        } else {
          durationMinutes = Math.floor((arrivesAt - departsAt) / (1000 * 60));
        }
        
        // Apply duration filter if enabled
        if (timeFilters?.duration?.enabled) {
          const [minDuration, maxDuration] = timeFilters.duration.range;
          if (durationMinutes < minDuration || durationMinutes > maxDuration) {
            return; // Skip this trip - outside duration range
          }
        }
        
        // Extract path components
        const [origin, destination] = route.split('-');
        const connections = Array.isArray(trip.connections) ? trip.connections : [];
        const pathText = [origin, ...connections, destination].join('-');
        
        // Format departure and arrival times
        // Extract the exact time strings from the original data directly
        const getDepartsTime = () => {
          // Parse HH:MM directly from ISO string, without timezone conversion
          if (typeof trip.DepartsAt === 'string') {
            // Extract HH:MM directly from the timestamp
            const match = trip.DepartsAt.match(/T(\d{2}:\d{2})/);
            if (match && match[1]) {
              return match[1];
            }
          }
          // Fallback to original string if needed
          return trip.DepartsAt.replace(/Z$/, '').split('T')[1].substring(0, 5);
        };
        
        const getArrivesTime = () => {
          // Parse HH:MM directly from ISO string, without timezone conversion
          if (typeof trip.ArrivesAt === 'string') {
            // Extract HH:MM directly from the timestamp
            const match = trip.ArrivesAt.match(/T(\d{2}:\d{2})/);
            if (match && match[1]) {
              return match[1];
            }
          }
          // Fallback to original string if needed
          return trip.ArrivesAt.replace(/Z$/, '').split('T')[1].substring(0, 5);
        };
        
        // Get formatted time strings without timezone conversion
        const departureTimeFormatted = getDepartsTime();
        const arrivalTimeFormatted = getArrivesTime();
        
        // Create Date objects only for calculations, not for display
        const departsAtDate = new Date(trip.DepartsAt);
        const arrivesAtDate = new Date(trip.ArrivesAt);
        
        // Calculate duration using TotalDuration field (in minutes)
        let formattedDuration = '';
        if (trip.TotalDuration) {
          const durationHours = Math.floor(trip.TotalDuration / 60);
          const durationMinutes = trip.TotalDuration % 60;
          formattedDuration = `${durationHours}h ${durationMinutes}m`;
        } else {
          // Fallback to calculating from departure and arrival times
          const durationMs = arrivesAtDate - departsAtDate;
          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
          const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
          formattedDuration = `${durationHours}h ${durationMinutes}m`;
        }
        
        // Calculate the actual day difference between departure and arrival
        const departsDay = departsAtDate.getUTCDate();
        const arrivesDay = arrivesAtDate.getUTCDate();
        const dayDifference = arrivesDay - departsDay;
        
        // Add trip to collection with its source and additional data for sorting
        allTrips.push({
          trip,
          source: flightSource,
          mileValue,
          durationMinutes,
          path: pathText,
          flightNumber: trip.FlightNumbers.join(','),
          airlines: trip.Airlines ? trip.Airlines.join(',') : '',
          aircraft: trip.Aircraft ? trip.Aircraft.join(',') : '',
          departs: departureTimeFormatted,
          arrives: arrivalTimeFormatted
        });
      }
    });
  }
  
  // Sort allTrips initially by miles (asc) then duration (asc)
  allTrips.sort((a, b) => {
    // Default sort by miles ascending, then duration ascending
    if (a.mileValue !== b.mileValue) {
      return a.mileValue - b.mileValue;
    }
    return a.durationMinutes - b.durationMinutes;
  });
  
  // Count total valid trips
  const totalTrips = allTrips.length;
  const totalPages = Math.ceil(totalTrips / ITEMS_PER_PAGE);
  
  // Function to render the current page of trips
  const renderCurrentPage = () => {
    // Sort trips based on current sort field and order
    allTrips.sort((a, b) => {
      let comparison = 0;
      
      // Handle numeric fields
      if (sortField === 'mileValue' || sortField === 'durationMinutes') {
        comparison = a[sortField] - b[sortField];
      } 
      // Handle date/time fields
      else if (sortField === 'departs' || sortField === 'arrives') {
        // Create Date objects for comparison
        const dateA = new Date(a.trip[sortField === 'departs' ? 'DepartsAt' : 'ArrivesAt']);
        const dateB = new Date(b.trip[sortField === 'departs' ? 'DepartsAt' : 'ArrivesAt']);
        comparison = dateA - dateB;
      }
      // Handle text fields
      else {
        comparison = String(a[sortField] || '').localeCompare(String(b[sortField] || ''));
      }
      
      // Apply sort order
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Clear existing rows
    while (rowsContainer.firstChild) {
      rowsContainer.removeChild(rowsContainer.firstChild);
    }
    
    // Get trips for current page
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalTrips);
    const currentTrips = allTrips.slice(startIndex, endIndex);
    
    // Render each trip
    currentTrips.forEach(({ trip, source: flightSource, mileValue }) => {
      // Extract origin, connections, and destination to create path
      const [origin, destination] = route.split('-');
      
      // Ensure connections is always an array, even if it's undefined or null
      const connections = Array.isArray(trip.connections) ? trip.connections : [];
      
      // Construct the path with connections
      const pathText = [origin, ...connections, destination].join('-');
      
      // Format departure and arrival times
      // Extract the exact time strings from the original data directly
      const getDepartsTime = () => {
        // Parse HH:MM directly from ISO string, without timezone conversion
        if (typeof trip.DepartsAt === 'string') {
          // Extract HH:MM directly from the timestamp
          const match = trip.DepartsAt.match(/T(\d{2}:\d{2})/);
          if (match && match[1]) {
            return match[1];
          }
        }
        // Fallback to original string if needed
        return trip.DepartsAt.replace(/Z$/, '').split('T')[1].substring(0, 5);
      };
      
      const getArrivesTime = () => {
        // Parse HH:MM directly from ISO string, without timezone conversion
        if (typeof trip.ArrivesAt === 'string') {
          // Extract HH:MM directly from the timestamp
          const match = trip.ArrivesAt.match(/T(\d{2}:\d{2})/);
          if (match && match[1]) {
            return match[1];
          }
        }
        // Fallback to original string if needed
        return trip.ArrivesAt.replace(/Z$/, '').split('T')[1].substring(0, 5);
      };
      
      // Get formatted time strings without timezone conversion
      const departureTimeFormatted = getDepartsTime();
      const arrivalTimeFormatted = getArrivesTime();
      
      // Create Date objects only for calculations, not for display
      const departsAtDate = new Date(trip.DepartsAt);
      const arrivesAtDate = new Date(trip.ArrivesAt);
      
      // Calculate duration using TotalDuration field (in minutes)
      let formattedDuration = '';
      if (trip.TotalDuration) {
        const durationHours = Math.floor(trip.TotalDuration / 60);
        const durationMinutes = trip.TotalDuration % 60;
        formattedDuration = `${durationHours}h ${durationMinutes}m`;
      } else {
        // Fallback to calculating from departure and arrival times
        const durationMs = arrivesAtDate - departsAtDate;
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        formattedDuration = `${durationHours}h ${durationMinutes}m`;
      }
      
      // Calculate the actual day difference between departure and arrival
      const departsDay = departsAtDate.getUTCDate();
      const arrivesDay = arrivesAtDate.getUTCDate();
      const dayDifference = arrivesDay - departsDay;
      
      // Create the row
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1.8fr 1fr 2.4fr 1.2fr 1fr 0.8fr 0.8fr 2.4fr 1.8fr';
      row.style.columnGap = '12px';
      row.style.padding = '8px 4px';
      row.style.borderBottom = '1px solid #f0f0f0';
      row.style.alignItems = 'center'; // Center align vertically instead of 'start'
      row.style.lineHeight = '1.3'; // Add consistent line height
      
      // Path cell with improved styling to highlight connections
      const pathCell = document.createElement('div');
      pathCell.style.fontSize = '13px'; // Increase font size for path
      
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
      flightNumberCell.style.fontSize = '11px';
      flightNumberCell.style.lineHeight = '1.5'; // Improve line spacing for multi-line content
      trip.FlightNumbers.forEach((number, i) => {
        if (i > 0) flightNumberCell.appendChild(document.createElement('br'));
        flightNumberCell.appendChild(document.createTextNode(number));
      });
      
      // Airlines cell
      const airlinesCell = document.createElement('div');
      airlinesCell.style.fontSize = '11px'; // Match summary view font size
      
      // Check if Airlines data is available
      if (trip.Airlines && trip.Airlines.length > 0) {
        // Create a list of airlines with individual items
        const airlinesList = document.createElement('div');
        airlinesList.style.display = 'flex';
        airlinesList.style.flexDirection = 'column';
        airlinesList.style.gap = '4px';
        
        // Process each airline
        trip.Airlines.forEach(airline => {
          const airlineItem = document.createElement('div');
          airlineItem.style.display = 'flex';
          airlineItem.style.alignItems = 'center';
          airlineItem.style.gap = '6px';
          airlineItem.style.fontSize = '11px';
          airlineItem.style.padding = '2px 0';
          
          // Find the full airline name from airlines_full.js
          const airlineInfo = airlines.find(a => a.value === airline.trim());
          const airlineLabel = airlineInfo ? airlineInfo.label : airline;
          
          // Try to add airline logo
          try {
            const logo = document.createElement('img');
            logo.src = `/${airline}.png`;
            logo.alt = airline;
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
          airlineText.style.fontFamily = 'Menlo, monospace'; // Ensure consistent font family
          airlineText.style.fontWeight = 'normal'; // Ensure consistent font weight
          
          // Add title attribute as tooltip for truncated text
          nameContainer.title = airlineLabel;
          nameContainer.appendChild(airlineText);
          airlineItem.appendChild(nameContainer);
          
          airlinesList.appendChild(airlineItem);
        });
        
        airlinesCell.appendChild(airlinesList);
      } else {
        // If no airlines data, try to extract from flight numbers
        if (trip.FlightNumbers && trip.FlightNumbers.length > 0) {
          const airlinesList = document.createElement('div');
          airlinesList.style.display = 'flex';
          airlinesList.style.flexDirection = 'column';
          airlinesList.style.gap = '4px';
          
          // Extract airline codes from flight numbers (usually first 2 characters)
          const uniqueAirlines = new Set();
          trip.FlightNumbers.forEach(flightNum => {
            // Take the first 2 characters as the airline code
            const airlineCode = flightNum.substring(0, 2);
            if (airlineCode) uniqueAirlines.add(airlineCode);
          });
          
          // Process each unique airline
          uniqueAirlines.forEach(airline => {
            const airlineItem = document.createElement('div');
            airlineItem.style.display = 'flex';
            airlineItem.style.alignItems = 'center';
            airlineItem.style.gap = '6px';
            airlineItem.style.fontSize = '11px';
            airlineItem.style.padding = '2px 0';
            
            // Find the full airline name from airlines_full.js
            const airlineInfo = airlines.find(a => a.value === airline.trim());
            const airlineLabel = airlineInfo ? airlineInfo.label : airline;
            
            // Try to add airline logo
            try {
              const logo = document.createElement('img');
              logo.src = `/${airline}.png`;
              logo.alt = airline;
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
            airlineText.style.fontFamily = 'Menlo, monospace'; // Ensure consistent font family
            airlineText.style.fontWeight = 'normal'; // Ensure consistent font weight
            
            // Add title attribute as tooltip for truncated text
            nameContainer.title = airlineLabel;
            nameContainer.appendChild(airlineText);
            airlineItem.appendChild(nameContainer);
            
            airlinesList.appendChild(airlineItem);
          });
          
          airlinesCell.appendChild(airlinesList);
        }
      }
      
      // Aircraft cell with each aircraft on a new line
      const aircraftCell = document.createElement('div');
      aircraftCell.style.fontSize = '11px';
      aircraftCell.style.lineHeight = '1.5'; // Improve line spacing for multi-line content
      trip.Aircraft.forEach((aircraft, i) => {
        if (i > 0) aircraftCell.appendChild(document.createElement('br'));
        aircraftCell.appendChild(document.createTextNode(aircraft));
      });
      
      // Duration cell
      const durationCell = document.createElement('div');
      durationCell.textContent = formattedDuration;
      durationCell.style.fontSize = '11px'; // Match summary view font size
      
      // Departure time cell
      const departsCell = document.createElement('div');
      departsCell.textContent = departureTimeFormatted;
      departsCell.style.fontSize = '11px'; // Match summary view font size
      
      // Arrival time cell - improved to better handle date differences
      const arrivesCell = document.createElement('div');
      arrivesCell.style.fontSize = '11px'; // Match summary view font size
      
      // Arrival time with day indicator for next-day arrivals
      arrivesCell.textContent = arrivalTimeFormatted;
      if (dayDifference > 0) {
        const dayIndicator = document.createElement('span');
        dayIndicator.textContent = ` (+${dayDifference})`;
        dayIndicator.style.color = '#1890ff'; // Highlight day difference in blue
        dayIndicator.style.fontWeight = 'bold';
        arrivesCell.appendChild(dayIndicator);
      }
      
      // Source cell - use the source from the current flight
      const sourceCell = document.createElement('div');
      sourceCell.style.fontSize = '11px';
      sourceCell.style.display = 'flex';
      sourceCell.style.alignItems = 'center';
      sourceCell.style.gap = '6px';
      
      // Try to add source logo if available
      try {
        // Extract codename from flightSource
        const sourceCode = flightSource.split('_')[0];
        if (sourceCode) {
          // Use getSourceByCodename to get source info
          const source = getSourceByCodename(sourceCode);
          if (source && source.iata) {
            const logo = document.createElement('img');
            logo.src = `/${source.iata}.png`; // Use IATA code for logo
            logo.alt = source.airline;
            logo.style.width = '18px';
            logo.style.height = '18px';
            logo.style.objectFit = 'contain';
            logo.style.borderRadius = '4px';
            logo.onerror = function() {
              this.style.display = 'none';
            };
            sourceCell.appendChild(logo);
          } else {
            // Fallback to source code if not found
            const logo = document.createElement('img');
            logo.src = `/${sourceCode}.png`;
            logo.alt = sourceCode;
            logo.style.width = '18px';
            logo.style.height = '18px';
            logo.style.objectFit = 'contain';
            logo.style.borderRadius = '4px';
            logo.onerror = function() {
              this.style.display = 'none';
            };
            sourceCell.appendChild(logo);
          }
        }
      } catch (e) {}
      
      // Add source text in a container with truncation support
      const sourceTextContainer = document.createElement('div');
      sourceTextContainer.style.overflow = 'hidden';
      sourceTextContainer.style.textOverflow = 'ellipsis';
      sourceTextContainer.style.whiteSpace = 'nowrap';
      sourceTextContainer.style.maxWidth = '100%';
      sourceTextContainer.style.flex = '1';
      
      const sourceText = document.createElement('span');
      // Use getAirlineName to get formatted airline name
      sourceText.textContent = getAirlineName(flightSource.split('_')[0]);
      sourceText.style.fontSize = '11px';
      
      sourceTextContainer.title = sourceText.textContent; // Use formatted name for tooltip
      sourceTextContainer.appendChild(sourceText);
      sourceCell.appendChild(sourceTextContainer);
      
      // Get appropriate tax value based on classCode
      let taxValue;
      if (classCode === 'Y') {
        taxValue = trip.YTaxes;
      } else if (classCode === 'W') {
        taxValue = trip.WTaxes;
      } else if (classCode === 'J') {
        taxValue = trip.JTaxes;
      } else if (classCode === 'F') {
        taxValue = trip.FTaxes;
      }
      
      // Price cell - shows mileage and taxes similar to summary view
      const priceCell = document.createElement('div');
      priceCell.style.textAlign = 'right';
      
      // Add mileage and taxes information
      if (mileValue) {
        const mileText = document.createElement('div');
        mileText.style.fontWeight = 'bold';
        mileText.style.fontSize = '13px'; // Increased font size for price
        mileText.textContent = `${mileValue.toLocaleString()} miles`;
        priceCell.appendChild(mileText);
      }
      
      if (taxValue) {
        const taxText = document.createElement('div');
        taxText.style.fontSize = '11px';
        taxText.style.color = '#666';
        
        // Format taxes with currency conversion if enabled
        const formatTaxesAndDisplay = async () => {
          try {
            const currency = trip.TaxesCurrency || trip.Currency || 'USD';
            const taxAmount = typeof taxValue === 'number' ? taxValue / 100 : parseFloat(taxValue);
            
            if (!isNaN(taxAmount)) {
              const formattedTax = await formatTaxes(
                taxAmount,
                currency,
                currencyFilter,
                true // Add parameter to use currency code instead of symbol
              );
              taxText.textContent = `+ ${formattedTax}`;
            } else {
              taxText.textContent = `+ ${taxValue}`;
            }
          } catch (error) {
            console.error('Error formatting taxes in detailed view:', error);
            // Fallback formatting - use the trip's currency code instead of assuming USD
            const amount = typeof taxValue === 'number' ? taxValue / 100 : taxValue;
            const currency = trip.TaxesCurrency || trip.Currency || 'USD';
            taxText.textContent = `+ ${currency} ${amount}`;
          }
        };
        
        formatTaxesAndDisplay();
        priceCell.appendChild(taxText);
      } else {
        // Add a placeholder for taxes if none available
        const noTaxesText = document.createElement('div');
        noTaxesText.style.fontSize = '11px';
        noTaxesText.style.color = '#666';
        noTaxesText.style.fontStyle = 'italic';
        noTaxesText.textContent = 'Taxes and fees are not available';
        priceCell.appendChild(noTaxesText);
      }
      
      // Add cells to row
      row.appendChild(pathCell);
      row.appendChild(flightNumberCell);
      row.appendChild(airlinesCell);
      row.appendChild(aircraftCell);
      row.appendChild(durationCell);
      row.appendChild(departsCell);
      row.appendChild(arrivesCell);
      row.appendChild(sourceCell);
      row.appendChild(priceCell);
      
      // Add row to container
      rowsContainer.appendChild(row);
    });
    
    // If no trips found, show a message
    if (rowsContainer.childElementCount === 0) {
      const noDataDiv = document.createElement('div');
      noDataDiv.style.padding = '16px';
      noDataDiv.style.textAlign = 'center';
      noDataDiv.style.color = '#999';
      noDataDiv.textContent = 'No detailed trip information available for this flight';
      rowsContainer.appendChild(noDataDiv);
    }
  };
  
  // Function to create pagination controls
  const createPaginationControls = () => {
    const paginationContainer = document.createElement('div');
    paginationContainer.style.display = 'flex';
    paginationContainer.style.justifyContent = 'center';
    paginationContainer.style.alignItems = 'center';
    paginationContainer.style.padding = '12px 0';
    paginationContainer.style.borderTop = '1px solid #f0f0f0';
    paginationContainer.style.marginTop = '8px';
    
    // Create pagination info text
    const paginationInfo = document.createElement('div');
    paginationInfo.style.margin = '0 12px';
    paginationInfo.style.fontSize = '11px';
    paginationInfo.style.color = '#666';
    
    // Create prev button
    const prevButton = document.createElement('button');
    prevButton.textContent = '← Previous';
    prevButton.style.padding = '4px 8px';
    prevButton.style.border = '1px solid #d9d9d9';
    prevButton.style.borderRadius = '4px';
    prevButton.style.backgroundColor = 'white';
    prevButton.style.cursor = 'pointer';
    prevButton.style.fontSize = '11px';
    prevButton.style.marginRight = '8px';
    prevButton.disabled = currentPage === 0;
    prevButton.style.opacity = currentPage === 0 ? '0.5' : '1';
    prevButton.onclick = () => {
      if (currentPage > 0) {
        currentPage--;
        renderCurrentPage();
        updatePagination();
      }
    };
    
    // Create next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next →';
    nextButton.style.padding = '4px 8px';
    nextButton.style.border = '1px solid #d9d9d9';
    nextButton.style.borderRadius = '4px';
    nextButton.style.backgroundColor = 'white';
    nextButton.style.cursor = 'pointer';
    nextButton.style.fontSize = '11px';
    nextButton.style.marginLeft = '8px';
    nextButton.disabled = currentPage >= totalPages - 1;
    nextButton.style.opacity = currentPage >= totalPages - 1 ? '0.5' : '1';
    nextButton.onclick = () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        renderCurrentPage();
        updatePagination();
      }
    };
    
    // Update pagination info
    const updatePaginationInfo = () => {
      const start = currentPage * ITEMS_PER_PAGE + 1;
      const end = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalTrips);
      paginationInfo.textContent = `Showing ${start}-${end} of ${totalTrips} trips`;
    };
    
    // Function to update pagination state
    const updatePagination = () => {
      prevButton.disabled = currentPage === 0;
      prevButton.style.opacity = currentPage === 0 ? '0.5' : '1';
      nextButton.disabled = currentPage >= totalPages - 1;
      nextButton.style.opacity = currentPage >= totalPages - 1 ? '0.5' : '1';
      updatePaginationInfo();
    };
    
    // Initial pagination info update
    updatePaginationInfo();
    
    // Add pagination controls
    paginationContainer.appendChild(prevButton);
    paginationContainer.appendChild(paginationInfo);
    paginationContainer.appendChild(nextButton);
    
    return {
      container: paginationContainer,
      updatePagination
    };
  };
  
  // Render initial page
  renderCurrentPage();
  
  // Create and add pagination if needed
  if (totalTrips > ITEMS_PER_PAGE) {
    const { container: paginationContainer } = createPaginationControls();
    tooltipDiv.appendChild(rowsContainer);
    tooltipDiv.appendChild(paginationContainer);
  } else {
    tooltipDiv.appendChild(rowsContainer);
  }
  
  return tooltipDiv;
};

export default createDetailedTooltip; 