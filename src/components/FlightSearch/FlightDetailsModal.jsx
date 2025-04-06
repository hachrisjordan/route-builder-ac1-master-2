import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Input, Spin, Table, Button, Typography, Pagination } from 'antd';
import dayjs from 'dayjs';
import { getSegmentColumns } from './segmentColumns';
import useFlightDetails from './hooks/useFlightDetails';
import FlightAvailabilityCalendar from './FlightAvailabilityCalendar';
import airlines from './data/airlines';
import { airports } from './data/airports';
import pricingData from './data/pricing.json';

const FlightDetailsModal = ({ isVisible, currentRoute, onClose, startDay }) => {
  // State for tracking errors (used in handlers)
  const {
    selectedDates,
    setSelectedDates,
    apiKey,
    setApiKey,
    segmentDetails,
    isLoadingSegments,
    handleDateSearch,
    handleCalendarSearch,
    resetDetails,
    columns,
    selectedFlights,
    availabilityData,
    isLoadingAvailability,
  } = useFlightDetails(getSegmentColumns, startDay);

  // Add pagination state with sorting
  const [paginationState, setPaginationState] = useState({});
  
  // Add pagination config
  const paginationConfig = {
    pageSize: 5,
    showSizeChanger: true,
    pageSizeOptions: ['5', '10', '20', '50'],
  };

  // Function to handle pagination change
  const handlePaginationChange = (segmentIndex, page, pageSize) => {
    setPaginationState(prev => ({
      ...prev,
      [segmentIndex]: {
        ...prev[segmentIndex], // Preserve sorting if it exists
        page,
        pageSize
      }
    }));
  };

  // Placeholder for pagination implementation

  // COMMENT OUT THIS ENTIRE EFFECT TO STOP INFINITE LOOP
  /*
  useEffect(() => {
    if (!isVisible) {
      resetDetails();
      setSelectedDates(null);
      setApiKey('');
    }
  }, [isVisible, resetDetails, setSelectedDates, setApiKey]);
  */

  // DateSearch and close handlers - STOPS INFINITE LOOP
  const dateSelectRef = useRef(false);

  const handleCalendarDateSelect = (dateRange) => {
    if (JSON.stringify(dateRange) !== JSON.stringify(selectedDates)) {
      setSelectedDates(dateRange);
    }
  };

  const handleCalendarSearchClick = (stopoverInfo, preserveCalendarData = false, clearSelections = false) => {
    if (!selectedDates) {
      return;
    }
    
    // Pass the clearSelections flag to handleDateSearch
    handleDateSearch(currentRoute, stopoverInfo, preserveCalendarData, clearSelections);
  };

  // Function to group flights by segment with safety checks
  const getSegmentTables = () => {
    if (!segmentDetails || segmentDetails.length === 0) return [];

    // Group flights by segment and filter out hidden flights
    const segments = segmentDetails.reduce((acc, flight) => {
      if (flight.hidden) return acc; // Skip hidden flights
      
      if (!acc[flight.segmentIndex]) {
        acc[flight.segmentIndex] = {
          index: flight.segmentIndex,
          route: `${flight.from}-${flight.to}`,
          flights: []
        };
      }
      acc[flight.segmentIndex].flights.push(flight);
      return acc;
    }, {});

    return Object.entries(segments)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([segmentIndex, flights]) => {
        // Create a deep copy of flights to avoid modifying the original data
        const flightsCopy = JSON.parse(JSON.stringify(flights.flights));
        
        // Get pagination state for this segment
        const { page = 1, pageSize = paginationConfig.pageSize, sortField, sortOrder } = 
          paginationState[segmentIndex] || {};
        
        // Sort the entire dataset if sorting is applied
        if (sortField && sortOrder) {
          flightsCopy.sort((a, b) => {
            let aValue, bValue;
            
            // Special handling for cabin class columns
            if (sortField === 'economy' || sortField === 'business' || sortField === 'first') {
              // For cabin classes, true sorts before false
              aValue = a[sortField] === true ? 1 : 0;
              bValue = b[sortField] === true ? 1 : 0;
            } else {
              aValue = a[sortField];
              bValue = b[sortField];
            }
            
            // Handle different data types
            if (typeof aValue === 'string' && typeof bValue === 'string') {
              return sortOrder === 'ascend' 
                ? aValue.localeCompare(bValue) 
                : bValue.localeCompare(aValue);
            } else if (sortField === 'duration') {
              // For duration, convert to minutes if it's a string like "2h 30m"
              if (typeof aValue === 'string' && aValue.includes('h')) {
                const [aHours, aMinutes] = aValue.split('h').map(part => parseInt(part) || 0);
                aValue = aHours * 60 + aMinutes;
              }
              if (typeof bValue === 'string' && bValue.includes('h')) {
                const [bHours, bMinutes] = bValue.split('h').map(part => parseInt(part) || 0);
                bValue = bHours * 60 + bMinutes;
              }
              return sortOrder === 'ascend' ? aValue - bValue : bValue - aValue;
            } else {
              // For numbers and other types
              return sortOrder === 'ascend' 
                ? (aValue > bValue ? 1 : -1) 
                : (bValue > aValue ? 1 : -1);
            }
          });
        }
        
        // Calculate pagination
        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedFlights = flightsCopy.slice(start, end);
        
        return {
          index: parseInt(segmentIndex),
          route: `${flights.flights[0]?.from || '?'}-${flights.flights[0]?.to || '?'}`,
          flights: paginatedFlights,
          allFlights: flightsCopy, // Keep the full sorted dataset
          total: flightsCopy.length
        };
      });
  };

  // Update the handleTableChange function to handle sorting
  const handleTableChange = (segmentIndex, pagination, filters, sorter) => {
    setPaginationState(prev => ({
      ...prev,
      [segmentIndex]: {
        page: pagination.current,
        pageSize: pagination.pageSize,
        sortField: sorter.field,
        sortOrder: sorter.order
      }
    }));
  };

  // Modal close logic implemented in onCancel handler

  // Calculate total journey duration by summing segment durations and layovers
  const calculateTotalDuration = (segments) => {
    try {
      let totalMinutes = 0;
      
      // Add each segment's flight duration
      segments.forEach(segmentIndex => {
        const flight = selectedFlights[segmentIndex]?.[0];
        if (flight) {
          // Convert duration string (e.g., "6:25" or "6h 25m") to minutes
          if (typeof flight.duration === 'string') {
            if (flight.duration.includes('h')) {
              // Format: "6h 25m"
              const [hours, minutes] = flight.duration.split('h').map(part => 
                parseInt(part.replace(/[^0-9]/g, '') || 0)
              );
              totalMinutes += (hours * 60) + minutes;
            } else if (flight.duration.includes(':')) {
              // Format: "6:25"
              const [hours, minutes] = flight.duration.split(':').map(Number);
              totalMinutes += (hours * 60) + minutes;
            } else {
              // Try to parse as number
              totalMinutes += parseInt(flight.duration) || 0;
            }
          } else if (typeof flight.duration === 'number') {
            totalMinutes += flight.duration;
          }
        }
      });
      
      // Add layover durations between segments
      for (let i = 0; i < segments.length - 1; i++) {
        const currentSegment = selectedFlights[segments[i]]?.[0];
        const nextSegment = selectedFlights[segments[i + 1]]?.[0];
        
        if (currentSegment && nextSegment) {
          const arrivalTime = dayjs(currentSegment.ArrivesAt);
          const departureTime = dayjs(nextSegment.DepartsAt);
          const layoverMinutes = departureTime.diff(arrivalTime, 'minute');
          totalMinutes += layoverMinutes;
        }
      }
      
      // Format the total duration
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error('Error calculating total duration:', error);
      return 'N/A';
    }
  };

  return (
    <Modal
      title="Flight Details"
      open={isVisible}
      onCancel={() => {
        // Clear all flight details and selections but keep API key
        if (resetDetails) resetDetails();
        if (setSelectedDates) setSelectedDates(null);
        
        // Clear window selections if available
        if (window.clearStopoverInfo) {
          window.clearStopoverInfo();
        }
        
        // Clear date selections by directly manipulating DOM
        try {
          // Clear any highlighted dates in the calendar
          const highlightedDates = document.querySelectorAll('.calendar-container [style*="background-color: rgb(230, 244, 255)"]');
          highlightedDates.forEach(el => {
            el.style.backgroundColor = "white";
            el.style.border = "none";
          });
          
          // Clear any date borders
          const borderDates = document.querySelectorAll('.calendar-container [style*="border: 2px solid rgb(24, 144, 255)"]');
          borderDates.forEach(el => {
            el.style.border = "none";
          });
        } catch (e) {
          console.log("Error clearing date selections:", e);
        }
        
        // Finally close the modal
        onClose();
      }}
      footer={null}
      width={1600}
      styles={{
        body: { 
          padding: '12px',
          maxWidth: '100%'
        },
        wrapper: {
          top: '-80px' // Position the modal 16px from the top
        }
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <Input
              placeholder="Enter your yapping password (Under Development)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ flex: 1 }}
            />
            {/* Calendar start date picker removed as requested */}
            <Button
              type="primary"
              disabled={!apiKey || !apiKey.toLowerCase().startsWith('pro') || isLoadingAvailability}
              loading={isLoadingAvailability}
              onClick={() => {
                // First fetch the data
                handleCalendarSearch(currentRoute);
                
                // Then after a short delay, show the calendar
                setTimeout(() => {
                  if (window.showCalendar) {
                    window.showCalendar();
                  }
                }, 100);
              }}
            >
              {isLoadingAvailability ? 'Loading...' : 'Apply'}
            </Button>
          </div>
        </div>
      </div>

      <FlightAvailabilityCalendar 
        flightData={availabilityData}
        currentRoute={currentRoute}
        onDateRangeSelect={handleCalendarDateSelect}
        selectedRange={selectedDates}
        onSearch={handleCalendarSearchClick}
      />

      {isLoadingSegments ? (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin />
        </div>
      ) : (
        segmentDetails?.length > 0 && (
          <div style={{ marginTop: 0 }}>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              Flights By Segment
            </Typography.Title>
            {getSegmentTables().map((segment, index) => (
              <div key={segment.index} style={{ marginBottom: 16 }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: 12 
                }}>
                  <Typography.Title level={5} style={{ margin: 0 }}>
                    Segment {segment.index+1} ({segment.route}):
                  </Typography.Title>
                  <div>
                    <Pagination
                      size="small"
                      total={segment.total}
                      pageSize={paginationState[segment.index]?.pageSize || paginationConfig.pageSize}
                      current={paginationState[segment.index]?.page || 1}
                      onChange={(page, pageSize) => handlePaginationChange(segment.index, page, pageSize)}
                      showSizeChanger={true}
                      showTotal={(total, range) => `${range[0]}-${range[1]} of ${total}`}
                      style={{ 
                        display: 'inline-block',
                        marginBottom: 0
                      }}
                    />
                  </div>
                </div>
                <Table
                  columns={columns}
                  dataSource={segment.flights}
                  pagination={false}
                  size="small"
                  onChange={(pagination, filters, sorter) => 
                    handleTableChange(segment.index, pagination, filters, sorter)
                  }
                />
                
                {/* Add layover duration if there's a next segment and flights are selected */}
                {index < getSegmentTables().length - 1 && (
                  <div style={{ 
                    padding: '0px',
                    margin: '16px',
                    textAlign: 'center',
                    fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace'
                  }}>
                    <Typography.Text strong>
                      {(() => {
                        const currentSegmentFlights = selectedFlights[segment.index];
                        const nextSegmentFlights = selectedFlights[segment.index + 1];
                        
                        if (!currentSegmentFlights?.[0] || !nextSegmentFlights?.[0]) {
                          return 'Select flights to see connection time';
                        }

                        const currentFlight = currentSegmentFlights[0];
                        const nextFlight = nextSegmentFlights[0];
                        
                        const arrivalTime = dayjs(currentFlight.ArrivesAt);
                        const departureTime = dayjs(nextFlight.DepartsAt);
                        const layoverMinutes = departureTime.diff(arrivalTime, 'minute');
                        
                        // If layover is more than 24 hours, show as stopover
                        if (layoverMinutes >= 24 * 60) {
                          const days = Math.floor(layoverMinutes / (24 * 60));
                          const remainingHours = Math.floor((layoverMinutes % (24 * 60)) / 60);
                          const remainingMinutes = layoverMinutes % 60;
                          
                          return `Stopover duration: ${days} day${days > 1 ? 's' : ''} ${remainingHours}h ${remainingMinutes}m`;
                        } else {
                          // Regular layover display
                          const hours = Math.floor(layoverMinutes / 60);
                          const minutes = layoverMinutes % 60;
                          return `Layover duration: ${hours}h ${minutes}m`;
                        }
                      })()}
                    </Typography.Text>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Journey Summary Table - only rendered when there are selected flights */}
      <div style={{ marginTop: 24, display: Object.keys(selectedFlights).length > 0 ? 'block' : 'none' }}>
        <Typography.Title level={4}>Journey Summary</Typography.Title>
        <Table
          columns={[
            {
              title: 'From',
              dataIndex: 'from',
              key: 'from',
            },
            {
              title: 'To',
              dataIndex: 'to',
              key: 'to',
            },
            {
              title: 'Airlines',
              dataIndex: 'airlines',
              key: 'airlines',
              render: (airlinesList) => {
                // More thorough safety checks
                if (!airlinesList || airlinesList === '-') return '-';
                
                try {
                  const airlineArray = Array.isArray(airlinesList) ? airlinesList : airlinesList.split(', ');
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {airlineArray.map((airlineName, index) => {
                        if (!airlineName) return null;
                        
                        const airline = airlines.find(a => 
                          airlineName.startsWith(a.label?.replace(` (${a.value})`, ''))
                        );
                        const airlineCode = airline?.value;
                        
                        return (
                          <div key={`${airlineCode}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {airlineCode && (
                              <img 
                                src={`${process.env.PUBLIC_URL}/${airlineCode}.png`}
                                alt={airlineCode}
                                style={{ 
                                  width: '24px', 
                                  height: '24px',
                                  objectFit: 'contain',
                                  borderRadius: '4px'
                                }} 
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            )}
                            {airlineName}
                          </div>
                        );
                      })}
                    </div>
                  );
                } catch (error) {
                  console.error('Error rendering airlines:', error);
                  return '-';
                }
              },
            },
            {
              title: 'Duration',
              dataIndex: 'duration',
              key: 'duration',
            },
            {
              title: 'Departs',
              dataIndex: 'departs',
              key: 'departs',
            },
            {
              title: 'Arrives',
              dataIndex: 'arrives',
              key: 'arrives',
            },
            {
              title: 'Economy Price',
              dataIndex: 'economyPrice',
              key: 'economyPrice',
              onCell: (_, index) => ({
                rowSpan: index === 0 ? 2 : 0, // Show only in first row
              }),
            },
            {
              title: 'Business Price (Max %)',
              dataIndex: 'businessPrice',
              key: 'businessPrice',
              onCell: (_, index) => ({
                rowSpan: index === 0 ? 2 : 0, // Show only in first row
              }),
              render: (text) => {
                if (!text || text === 'N/A') return text;
                try {
                  const [price, percentage] = text.split(' (');
                  if (!percentage) return text;
                  return `${price} (${percentage}`;
                } catch (error) {
                  return text;
                }
              }
            },
            {
              title: 'First Price (Max %)',
              dataIndex: 'firstPrice',
              key: 'firstPrice',
              onCell: (_, index) => ({
                rowSpan: index === 0 ? 2 : 0, // Show only in first row
              }),
              render: (text) => {
                if (!text || text === 'N/A') return text;
                try {
                  const [price, percentage] = text.split(' (');
                  if (!percentage) return text;
                  return `${price} (${percentage}`;
                } catch (error) {
                  return text;
                }
              }
            },
          ]}
          dataSource={useMemo(() => {
            try {
              if (Object.keys(selectedFlights).length === 0) return [];
              
              const segments = Object.keys(selectedFlights).map(Number).sort((a, b) => a - b);
              if (segments.length === 0) return [];
              
              const firstSegmentIndex = Math.min(...segments);
              const lastSegmentIndex = Math.max(...segments);
              
              // Helper function to get airlines string
              const getAirlinesString = (segmentRange) => {
                try {
                  const airlineSet = new Set(
                    segmentRange
                      .flatMap(i => selectedFlights[i]?.map(f => f.airlines))
                      .filter(Boolean)
                  );
                  return Array.from(airlineSet).join(', ') || '-';
                } catch (error) {
                  console.error('Error getting airlines string:', error);
                  return '-';
                }
              };

              // Removed debug logging to prevent console spam
              
              // Calculate prices for the ENTIRE journey (origin to final destination)
              const calculatePrices = (hasStopover) => {
                try {
                  // Get origin and destination airports
                  const originAirport = airports.find(a => a.IATA === selectedFlights[firstSegmentIndex]?.[0]?.from);
                  const destAirport = airports.find(a => a.IATA === selectedFlights[lastSegmentIndex]?.[0]?.to);
                  
                  if (!originAirport || !destAirport) return {
                    economyPrice: '-',
                    businessPrice: '-',
                    firstPrice: '-'
                  };

                  // Calculate total distance and cabin class distances
                  let totalDistance = 0;
                  let businessDistance = 0;
                  let firstDistance = 0;
                  let businessOnlyDistance = 0;  // New: for segments with only business (no first)

                  Object.entries(selectedFlights).forEach(([_, flights]) => {
                    flights.forEach(flight => {
                      const distance = parseInt(flight.distance || 0);
                      totalDistance += distance;
                      
                      // For Business Price: Include all segments with business class
                      if (flight.business) businessDistance += distance;
                      
                      // For First Price: Only count business from segments without first
                      if (flight.business && !flight.first) businessOnlyDistance += distance;
                      if (flight.first) firstDistance += distance;
                    });
                  });

                  // Find matching price in pricing data
                  const pricing = pricingData.find(p => 
                    p["From Region"] === originAirport.Zone &&
                    p["To Region"] === destAirport.Zone &&
                    totalDistance >= p["Min Distance"] &&
                    totalDistance <= p["Max Distance"]
                  );

                  if (!pricing) return {
                    economyPrice: '-',
                    businessPrice: '-',
                    firstPrice: '-'
                  };

                  // Calculate percentages
                  const businessPercentage = Math.round((businessDistance / totalDistance) * 100);
                  const firstPercentage = Math.round((firstDistance / totalDistance) * 100);
                  const businessOnlyPercentage = Math.round((businessOnlyDistance / totalDistance) * 100);

                  // Add stopover fee if applicable
                  const stopoverExtra = hasStopover ? 5000 : 0;

                  return {
                    economyPrice: pricing.Economy ? (pricing.Economy + stopoverExtra).toLocaleString() : '-',
                    // If business percentage is 0, show "-" instead of price
                    businessPrice: pricing.Business && businessPercentage > 0 ? 
                      `${(pricing.Business + stopoverExtra).toLocaleString()} (${businessPercentage}% J)` : '-',
                    // If first percentage is 0, show "-" instead of price
                    firstPrice: pricing.First && firstPercentage > 0 ? 
                      `${(pricing.First + stopoverExtra).toLocaleString()} (${
                        firstPercentage > 0 && businessOnlyPercentage > 0 
                          ? `${firstPercentage}% F, ${businessOnlyPercentage}% J`
                          : firstPercentage > 0 
                            ? `${firstPercentage}% F`
                            : '0%'
                      })` : '-'
                  };
                } catch (error) {
                  console.error('Error calculating prices:', error);
                  return {
                    economyPrice: '-',
                    businessPrice: '-',
                    firstPrice: '-'
                  };
                }
              };

              // Find stopover point
              let stopoverIndex = null;
              for (let i = firstSegmentIndex; i < lastSegmentIndex; i++) {
                const currentFlight = selectedFlights[i]?.[0];
                const nextFlight = selectedFlights[i + 1]?.[0];
                
                if (currentFlight && nextFlight) {
                  const arrivalTime = dayjs(currentFlight.ArrivesAt);
                  const departureTime = dayjs(nextFlight.DepartsAt);
                  const layoverMinutes = departureTime.diff(arrivalTime, 'minute');
                  
                  if (layoverMinutes >= 24 * 60) {
                    stopoverIndex = i;
                    break;
                  }
                }
              }

              // Calculate prices once for the entire journey
              const prices = calculatePrices(stopoverIndex !== null);

              // Calculate total journey duration by summing segment durations and layovers
              const totalDuration = calculateTotalDuration(segments);

              // If no stopover found, return single row
              if (stopoverIndex === null) {
                return [{
                  key: '1',
                  from: selectedFlights[firstSegmentIndex]?.[0]?.from || '-',
                  to: selectedFlights[lastSegmentIndex]?.[0]?.to || '-',
                  airlines: getAirlinesString(segments),
                  duration: totalDuration,
                  departs: dayjs(selectedFlights[firstSegmentIndex]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
                  arrives: dayjs(selectedFlights[lastSegmentIndex]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
                  ...prices
                }];
              }

              // Split journey at stopover with merged price cells
              return [
                {
                  key: '1',
                  from: selectedFlights[firstSegmentIndex]?.[0]?.from || '-',
                  to: selectedFlights[stopoverIndex]?.[0]?.to || '-',
                  airlines: getAirlinesString(segments.filter(i => i <= stopoverIndex)),
                  duration: calculateTotalDuration(segments.filter(i => i <= stopoverIndex)),
                  departs: dayjs(selectedFlights[firstSegmentIndex]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
                  arrives: dayjs(selectedFlights[stopoverIndex]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
                  ...prices  // Same prices for first row
                },
                {
                  key: '2',
                  from: selectedFlights[stopoverIndex + 1]?.[0]?.from || '-',
                  to: selectedFlights[lastSegmentIndex]?.[0]?.to || '-',
                  airlines: getAirlinesString(segments.filter(i => i > stopoverIndex)),
                  duration: calculateTotalDuration(segments.filter(i => i > stopoverIndex)),
                  departs: dayjs(selectedFlights[stopoverIndex + 1]?.[0]?.DepartsAt).format('HH:mm MM-DD'),
                  arrives: dayjs(selectedFlights[lastSegmentIndex]?.[0]?.ArrivesAt).format('HH:mm MM-DD'),
                  economyPrice: null,  // Will be hidden by rowSpan
                  businessPrice: null, // Will be hidden by rowSpan
                  firstPrice: null     // Will be hidden by rowSpan
                }
              ];
            } catch (error) {
              console.error('Error generating dataSource:', error);
              return [];
            }
          }, [selectedFlights, pricingData])}
          pagination={false}
          size="small"
        />
        
        {/* Route Validation - always rendered but may be empty */}
        <div style={{ marginTop: 12, fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace' }}>
          <Typography.Text>
            {useMemo(() => {
              if (Object.keys(selectedFlights).length === 0) return null;
              
              try {
                const segments = Object.keys(selectedFlights).map(Number);
                if (segments.length === 0) return null;
                
                const firstSegmentIndex = Math.min(...segments);
                const lastSegmentIndex = Math.max(...segments);
                const originAirport = airports.find(a => a.IATA === selectedFlights[firstSegmentIndex]?.[0]?.from);
                const destAirport = airports.find(a => a.IATA === selectedFlights[lastSegmentIndex]?.[0]?.to);

                if (!originAirport || !destAirport) return 'Unable to validate route: airport data missing';

                // Haversine formula
                const R = 3959; // Earth's radius in miles
                const lat1 = originAirport.Latitude * Math.PI / 180;
                const lat2 = destAirport.Latitude * Math.PI / 180;
                const dLat = (destAirport.Latitude - originAirport.Latitude) * Math.PI / 180;
                const dLon = (destAirport.Longitude - originAirport.Longitude) * Math.PI / 180;

                const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                          Math.cos(lat1) * Math.cos(lat2) *
                          Math.sin(dLon/2) * Math.sin(dLon/2);
                
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const directDistance = Math.round(R * c);

                // Calculate total segment distance
                let totalSegmentDistance = 0;
                Object.values(selectedFlights).forEach(flights => {
                  flights.forEach(flight => {
                    totalSegmentDistance += parseInt(flight.distance || 0);
                  });
                });

                const isValid = totalSegmentDistance <= (2 * directDistance);

                return (
                  <>
                    <div style={{ 
                      marginTop: 8,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: isValid ? '#52c41a' : '#f5222d',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%'
                    }}>
                      {isValid ? (
                        <>
                          <span>✓</span>
                          <span>ROUTING VALIDATED</span>
                        </>
                      ) : (
                        <>
                          <span>✗</span>
                          <span>THIS ROUTING IS INVALID</span>
                        </>
                      )}
                    </div>
                  </>
                );
              } catch (error) {
                console.error('Error in route validation:', error);
                return null;
              }
            }, [selectedFlights, airports])}
          </Typography.Text>
        </div>
      </div>

      <style jsx>{`
        :global(.ant-table) {
          font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
        }
      `}</style>
    </Modal>
  );
};

// End of modal component

export default FlightDetailsModal; 