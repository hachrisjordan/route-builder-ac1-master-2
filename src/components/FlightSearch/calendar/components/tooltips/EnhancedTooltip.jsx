/**
 * EnhancedTooltip.jsx
 * Creates an enhanced tooltip for flight availability in summary view mode
 */

import { getAirlineName, formatTaxes } from '../../utils/flightUtils';
import { getSourceByCodename } from '../../data/sources';
import airlines from '../../data/airlines_full';
import { formatCurrencyAmount, convertCurrency } from '../../utils/currencyUtils';

/**
 * Creates an enhanced tooltip for displaying flight availability information in summary view
 * @param {string} classCode - The class code (Y/W/J/F) for the flight
 * @param {Array} flights - Array of flight data objects
 * @param {string} route - The route string (e.g., "LAX-JFK")
 * @param {Object} currencyFilter - Currency filter settings
 * @param {boolean} directFilter - Whether to filter for direct flights only
 * @param {Object} airlinesFilter - Airline filter settings
 * @param {Array} pointsFilter - Points filter settings
 * @returns {HTMLElement} - The created tooltip DOM element
 */
const createEnhancedTooltip = (classCode, flights, route, currencyFilter = { enabled: false }, directFilter = false, airlinesFilter = { airlines: [] }, pointsFilter = null) => {
  // Create a div element for the tooltip content
  const tooltipDiv = document.createElement('div');
  tooltipDiv.style.width = '620px'; // Increased width for the tooltip to accommodate full airline names
  tooltipDiv.style.padding = '12px';
  tooltipDiv.style.backgroundColor = 'white';
  tooltipDiv.style.borderRadius = '8px';
  tooltipDiv.style.boxShadow = '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)';
  tooltipDiv.style.fontFamily = 'Menlo, monospace';
  tooltipDiv.style.fontSize = '11px';
  tooltipDiv.style.maxHeight = 'none';
  tooltipDiv.style.overflowY = 'visible';
  tooltipDiv.style.wordWrap = 'break-word';
  tooltipDiv.style.whiteSpace = 'normal';
  
  // Add title
  const titleDiv = document.createElement('div');
  titleDiv.style.fontWeight = 'bold';
  titleDiv.style.marginBottom = '8px';
  titleDiv.style.padding = '4px 0';
  titleDiv.style.borderBottom = '1px solid #f5f5f5';
  
  // Add filter indicators in the title
  const filterInfo = [];
  if (directFilter) filterInfo.push('Direct only');
  if (airlinesFilter?.airlines?.length > 0) {
    filterInfo.push(`Airlines: ${airlinesFilter.mode === 'include' ? 'Including' : 'Excluding'} ${airlinesFilter.airlines.join(', ')}`);
  }
  if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
    filterInfo.push(`Points: ${pointsFilter[0]}-${pointsFilter[1]}`);
  }
  
  const filterText = filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : '';
  titleDiv.textContent = `${route} - ${classCode} Class${filterText}`;
  
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
  
  // Apply filters to each flight
  const filteredFlights = [];
  
  for (let i = 0; i < flights.length && filteredFlights.length < 5; i++) {
    const flight = flights[i];
    const rawFlight = flight.rawData;
    
    if (!rawFlight) continue;
    
    // Skip if we're filtering for direct and this flight isn't direct
    if (directFilter && !rawFlight[`${classCode}Direct`]) {
      continue;
    }
    
    // Skip if we're filtering for airlines and this flight doesn't match
    if (airlinesFilter?.airlines?.length > 0) {
      const airlinesString = directFilter 
        ? rawFlight[`${classCode}DirectAirlines`] 
        : rawFlight[`${classCode}Airlines`];
      
      if (!airlinesString) continue;
      
      const flightAirlines = airlinesString.split(',').map(a => a.trim()).filter(a => a);
      
      if (airlinesFilter.mode === 'include') {
        if (!flightAirlines.some(airline => airlinesFilter.airlines.includes(airline))) {
          continue;
        }
      } else {
        if (flightAirlines.every(airline => airlinesFilter.airlines.includes(airline))) {
          continue;
        }
      }
    }
    
    // Skip if we're filtering for points and this flight doesn't match
    if (pointsFilter && pointsFilter[0] !== undefined && pointsFilter[1] !== undefined) {
      const mileageCost = directFilter
        ? parseInt(rawFlight[`${classCode}DirectMileageCost`] || '0', 10)
        : parseInt(rawFlight[`${classCode}MileageCost`] || '0', 10);
      
      if (mileageCost < pointsFilter[0] || mileageCost > pointsFilter[1]) {
        continue;
      }
    }
    
    filteredFlights.push(flight);
  }
  
  // Create flight cards for the filtered flights
  const MAX_CARDS = 5;
  const processedFlights = Math.min(filteredFlights.length, MAX_CARDS);
  
  // Process each flight and format for display
  let processedFlightCount = 0;
  const MAX_DISPLAYED_FLIGHTS = 12; // Limit the number of flights shown
  
  // Sort flights by airline name
  const sortedFlights = [...filteredFlights].sort((a, b) => {
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
    
    // Skip flights that have zero miles for their respective class
    if ((hasDirect && directCost === 0) && (hasIndirect && indirectCost === 0)) return;
    
    // Check if we have a cheaper indirect option - this is the standard case
    const showBothOptions = hasDirect && indirectCost < directCost;
    
    // Check if we need to show indirect due to airline filter - only if there's a relevant airline filter
    let showIndirectForAirlineFilter = false;
    
    if (rawFlight.airlinesFilter && hasDirect && hasIndirect && directCost === indirectCost) {
      // Get airlines for direct and indirect
      const directAirlinesStr = rawFlight[`${classCode}DirectAirlines`] || '';
      const indirectAirlinesStr = rawFlight[`${classCode}Airlines`] || '';
      
      const directAirlines = directAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
      const indirectAirlines = indirectAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
      
      const airlinesFilter = rawFlight.airlinesFilter;
      
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
    if (rawFlight.airlinesFilter && rawFlight.airlinesFilter.airlines && rawFlight.airlinesFilter.airlines.length > 0) {
      // Get airlines for direct and indirect
      const directAirlinesStr = rawFlight[`${classCode}DirectAirlines`] || '';
      const indirectAirlinesStr = rawFlight[`${classCode}Airlines`] || '';
      
      const directAirlines = directAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
      const indirectAirlines = indirectAirlinesStr.split(',').map(a => a.trim()).filter(a => a);
      
      const airlinesFilter = rawFlight.airlinesFilter;
      
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
      
      // Skip rows with zero mileage
      const mileageCost = isDirect ? directCost : indirectCost;
      if (mileageCost === 0) return null;
      
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
      const totalTaxes = isDirect
        ? rawFlight[`${classCode}DirectTotalTaxes`]
        : rawFlight[`${classCode}TotalTaxes`];
      
      const currency = rawFlight.TaxesCurrency || '';
      
      if (parseInt(mileageCost, 10) > 0) {
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
  const totalFlights = filteredFlights.length;
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

export default createEnhancedTooltip; 