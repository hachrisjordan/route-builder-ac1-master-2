import React, { useState, useEffect } from 'react';
import { Table, Input, Radio, Checkbox, Space, Tag, Dropdown, Button, Slider } from 'antd';
import { LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { airports } from './data/airports';
import uaPriceData from '../../data/ua';
import filteredAirportsByCopazone from '../../data/filtered_airports_by_copazone.json';
import airlines from './data/airlines';

const UAExpandedSaverResultsTable = ({ 
  searchResults, 
  isLoading, 
  pagination, 
  onTableChange,
  onRouteSelect 
}) => {
  const [tableSearchText, setTableSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  
  // Transform and filter data whenever searchResults or tableSearchText changes
  useEffect(() => {
    const data = getFilteredData();
    setFilteredData(data);
    
    // Calculate total pages
    const totalItems = data.length;
    const totalPages = Math.ceil(totalItems / pagination.pageSize);
    
    // If current page is higher than total pages and we have data
    if (pagination.current > totalPages && totalPages > 0) {
      // Update pagination to be on the last available page
      onTableChange({
        ...pagination,
        current: totalPages
      });
    } else if (totalItems > 0 && pagination.total !== totalItems) {
      // Update total count in pagination
      onTableChange({
        ...pagination,
        total: totalItems
      });
    }
  }, [searchResults, tableSearchText]);
  
  const getColumns = () => {
    return [
      {
        title: 'Path',
        dataIndex: 'path',
        key: 'path',
        width: 180,
        render: (text) => <div style={{ whiteSpace: 'nowrap' }}>{text.replace(/->/g, ' → ')}</div>,
        sorter: (a, b) => a.path.localeCompare(b.path),
      },
      {
        title: 'Stops',
        dataIndex: 'connections',
        key: 'stops',
        width: 80,
        sorter: (a, b) => (a.connections ? a.connections.length : 0) - (b.connections ? b.connections.length : 0),
        render: (connections) => {
          const stops = connections ? connections.length : 0;
          let color;
          switch (stops) {
            case 0: color = 'green'; break;
            case 1: color = 'blue'; break;
            case 2: color = 'orange'; break;
            default: color = 'red';
          }
          return (
            <div style={{ whiteSpace: 'nowrap' }}>
              <Tag color={color}>
                {stops === 0 ? 'Direct' : `${stops} ${stops === 1 ? 'Stop' : 'Stops'}`}
              </Tag>
            </div>
          );
        },
      },
      {
        title: 'Date',
        dataIndex: 'date',
        key: 'date',
        width: 100,
        render: (text) => <div style={{ whiteSpace: 'nowrap' }}>{text}</div>,
        sorter: (a, b) => a.date.localeCompare(b.date),
      },
      {
        title: 'Connections',
        dataIndex: 'connections',
        key: 'connections',
        width: 160,
        render: (connections) => (
          <div>
            {connections.map((connection, index) => (
              <div key={index} style={{ whiteSpace: 'nowrap' }}>
                {connection}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Airlines',
        dataIndex: 'airlines',
        key: 'airlines',
        width: 150,
        render: (airlineCodes, record) => {
          // Get unique airline codes
          const uniqueAirlineCodes = [...new Set(record.flightNumbers.map(flightNumber => flightNumber.slice(0, 2)))];
          
          return (
            <div>
              {uniqueAirlineCodes.map((airlineCode, index) => {
                // Find matching airline in the airlines data
                const airline = airlines.find(a => a.value === airlineCode);
                const airlineName = airline ? airline.label.split(' (')[0] : airlineCode;
                
                return (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', marginBottom: '4px' }}>
                    <img 
                      src={`/${airlineCode}.png`} 
                      alt={airlineCode}
                      style={{ 
                        width: '20px', 
                        height: '20px', 
                        marginRight: '8px', 
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }}
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    {airlineName}
                  </div>
                );
              })}
            </div>
          );
        },
      },
      {
        title: 'Flight #',
        dataIndex: 'flightNumbers',
        key: 'flightNumbers',
        width: 120,
        render: (flightNumbers) => (
          <div>
            {flightNumbers.map((flightNumber, index) => (
              <div key={index} style={{ whiteSpace: 'nowrap' }}>
                {flightNumber}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Aircraft',
        dataIndex: 'aircraft',
        key: 'aircraft',
        width: 150,
        render: (aircraft) => (
          <div>
            {aircraft.map((aircraft, index) => (
              <div key={index} style={{ whiteSpace: 'nowrap' }}>
                {aircraft}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Departs',
        dataIndex: 'departs',
        key: 'departs',
        width: 120,
        render: (departs) => (
          <div>
            {departs.map((depart, index) => (
              <div key={index} style={{ whiteSpace: 'nowrap' }}>
                {depart}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Arrives',
        dataIndex: 'arrives',
        key: 'arrives',
        width: 120,
        render: (arrives) => (
          <div>
            {arrives.map((arrive, index) => (
              <div key={index} style={{ whiteSpace: 'nowrap' }}>
                {arrive}
              </div>
            ))}
          </div>
        ),
      },
      {
        title: 'Seats',
        dataIndex: 'seats',
        key: 'seats',
        width: 80,
        sorter: (a, b) => {
          const aSeat = typeof a.seats === 'string' ? parseInt(a.seats.replace(/\D/g, '')) : a.seats;
          const bSeat = typeof b.seats === 'string' ? parseInt(b.seats.replace(/\D/g, '')) : b.seats;
          return aSeat - bSeat;
        },
      },
      {
        title: 'Price',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        sorter: (a, b) => a.price - b.price,
        render: (price) => <div>{price.toLocaleString()}</div>,
      },
      {
        title: '',
        key: 'action',
        width: 50,
        render: (_, record) => (
          <Button 
            type="link" 
            icon={<LinkOutlined />} 
            onClick={() => handleRecordSelect(record)}
          />
        ),
      },
    ];
  };

  const handleRecordSelect = (record) => {
    if (onRouteSelect) {
      onRouteSelect(record);
    }
    
    // Extract origin, destination and date from the record
    const originAirport = record.rawData.originAirport;
    const destinationAirport = record.rawData.destinationAirport;
    const date = record.rawData.date;
    
    // Format the URL with the flight data
    const bookingUrl = `https://shopping.copaair.com/miles?roundtrip=false&adults=1&children=0&infants=0&date1=${date}&date2=null&promocode=&area1=${originAirport}&area2=${destinationAirport}&advanced_air_search=false&flexible_dates_v2=false&airline_preference=UA`;
    
    // Open the URL in a new tab
    window.open(bookingUrl, '_blank');
  };

  const calculateLayoverTime = (departDate, arriveDate) => {
    const departDateTime = new Date(departDate);
    const arriveDateTime = new Date(arriveDate);
    
    // Calculate difference in hours and minutes
    const diffMs = departDateTime - arriveDateTime;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHrs}:${diffMins.toString().padStart(2, '0')}`;
  };

  const findAirportCopazone = (airportCode) => {
    // Search through each zone in the filtered airports data
    for (const [zoneName, zoneAirports] of Object.entries(filteredAirportsByCopazone)) {
      // Check if this airport exists in this zone
      const foundAirport = zoneAirports.find(airport => airport.IATA === airportCode);
      if (foundAirport) {
        return foundAirport.copazone;
      }
    }
    
    // Fallback: use US & Canada if not found
    return "US & Canada";
  };

  const calculateUAPrice = (originAirport, destinationAirport) => {
    if (!originAirport || !destinationAirport) {
      console.error('Missing airport data:', { originAirport, destinationAirport });
      return 0;
    }
    
    const fromZone = findAirportCopazone(originAirport);
    const toZone = findAirportCopazone(destinationAirport);
    
    if (!fromZone || !toZone) {
      console.error('Could not find zone for airports:', { 
        originAirport, 
        destinationAirport, 
        fromZone, 
        toZone 
      });
      return 0;
    }
    
    // Ensure uaPriceData is working correctly
    if (!uaPriceData || !Array.isArray(uaPriceData)) {
      console.error('uaPriceData is not available or not an array', uaPriceData);
      return 0;
    }
    
    // Find matching price in UA price data
    const priceEntry = uaPriceData.find(
      entry => entry.FromZone === fromZone && entry.ToZone === toZone
    );
    
    if (!priceEntry) {
      console.error('No price found for zones:', { fromZone, toZone });
      return 0;
    }
    
    return priceEntry.Business;
  };

  const calculateSeats = (trips) => {
    // Filter out trips with JSeats = 0
    const nonZeroSeats = trips.filter(trip => trip.JSeats > 0);
    
    // If all seats are 0
    if (nonZeroSeats.length === 0) {
      return "Min 1";
    }
    
    // If all trips have JSeats > 0
    if (nonZeroSeats.length === trips.length) {
      // Find the minimum seat count
      const minSeats = Math.min(...trips.map(trip => trip.JSeats));
      return minSeats;
    }
    
    // If mixed (some 0, some non-zero)
    const minNonZeroSeats = Math.min(...nonZeroSeats.map(trip => trip.JSeats));
    
    if (minNonZeroSeats === 1) {
      return 1;
    } else {
      return `1~${minNonZeroSeats}`;
    }
  };

  const transformData = (results) => {
    if (!results || !Array.isArray(results)) return [];
    
    return results.map(flight => {
      const { originAirport, destinationAirport, date, AvailabilityTrips } = flight;
      
      // Build the actual flight path from the segments
      let path = originAirport;
      const connections = [];
      
      // We'll use this to reconstruct the path in order
      const segments = [];
      
      // First identify all the segments by origin/destination
      AvailabilityTrips.forEach(trip => {
        segments.push({
          from: trip.originAirport,
          to: trip.destinationAirport,
          trip: trip
        });
      });
      
      // If we have segments, build the path properly
      for (const segment of segments) {
        path += ` → ${segment.to}`;
      }
      
      // Process connections
      for (let i = 0; i < segments.length - 1; i++) {
        const trip = segments[i].trip;
        if (trip.connection) {
          const currentArrive = trip.ArrivesAt;
          const nextDepart = segments[i + 1].trip.DepartsAt;
          const layoverTime = calculateLayoverTime(nextDepart, currentArrive);
          connections.push(`${trip.connection} - ${layoverTime}`);
        }
      }
      
      // Process flight numbers
      const flightNumbers = segments.map(segment => segment.trip.FlightNumbers.join('/'));
      
      // Extract airline codes for display
      const airlineCodes = flightNumbers.map(flightNum => flightNum.slice(0, 2));
      
      // Process aircraft
      const aircraft = segments.map(segment => segment.trip.Aircraft.join('/'));
      
      // Process departure times
      const departs = segments.map(segment => {
        const departDate = new Date(segment.trip.DepartsAt);
        return `${departDate.getMonth() + 1}-${departDate.getDate()} ${departDate.getHours()}:${String(departDate.getMinutes()).padStart(2, '0')}`;
      });
      
      // Process arrival times
      const arrives = segments.map(segment => {
        const arriveDate = new Date(segment.trip.ArrivesAt);
        return `${arriveDate.getMonth() + 1}-${arriveDate.getDate()} ${arriveDate.getHours()}:${String(arriveDate.getMinutes()).padStart(2, '0')}`;
      });
      
      // Calculate seats
      const trips = segments.map(segment => segment.trip);
      const seats = calculateSeats(trips);
      
      // Calculate price - use last segment's destination as final destination
      const finalDestination = segments[segments.length - 1].to;
      const price = calculateUAPrice(originAirport, finalDestination);
      
      return {
        key: `${originAirport}-${destinationAirport}-${date}-${flightNumbers.join('/')}`,
        path,
        date,
        connections,
        airlines: airlineCodes,
        flightNumbers,
        aircraft,
        departs,
        arrives,
        seats,
        price,
        rawData: flight
      };
    });
  };

  const handleSearchTextChange = (value) => {
    // Reset to page 1 when search text changes
    if (value !== tableSearchText) {
      onTableChange({
        ...pagination,
        current: 1
      });
    }
    setTableSearchText(value);
  };

  const getFilteredData = () => {
    const data = transformData(searchResults);
    
    if (!tableSearchText) {
      return data;
    }
    
    const searchLower = tableSearchText.toLowerCase();
    
    return data.filter(item => {
      return (
        item.path.toLowerCase().includes(searchLower) ||
        item.date.toLowerCase().includes(searchLower) ||
        (item.connections && item.connections.some(c => c.toLowerCase().includes(searchLower))) ||
        (item.flightNumbers && item.flightNumbers.some(f => f.toLowerCase().includes(searchLower))) ||
        (item.aircraft && item.aircraft.some(a => a.toLowerCase().includes(searchLower)))
      );
    });
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search flights..."
          onChange={e => handleSearchTextChange(e.target.value)}
          style={{ width: 300 }}
        />
      </div>
      
      <Table
        columns={getColumns()}
        dataSource={filteredData}
        loading={isLoading}
        pagination={pagination}
        onChange={onTableChange}
        scroll={{ x: 'max-content' }}
        size="small"
        style={{ width: '1600px' }}
        defaultSortOrder={[
          { columnKey: 'price', order: 'ascend' },
          { columnKey: 'stops', order: 'ascend' }
        ]}
      />
    </>
  );
};

export default UAExpandedSaverResultsTable; 