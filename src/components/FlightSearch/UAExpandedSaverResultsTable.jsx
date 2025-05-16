import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Radio, Checkbox, Space, Tag, Dropdown, Button, Slider, Switch, Select, Menu, Tabs } from 'antd';
import { LinkOutlined, SearchOutlined, DownOutlined, DollarOutlined, UserOutlined } from '@ant-design/icons';
import { airports } from './data/airports';
import uaPriceData from '../../data/ua';
import filteredAirportsByCopazone from '../../data/filtered_airports_by_copazone.json';
import airlines from './data/airlines';
import { currencyList } from './calendar/data/currency_list';
import { convertCurrency, formatCurrencyAmount, fetchExchangeRates } from './calendar/utils/currencyUtils';
import { RATE_JSON_URL } from '../../config/cloud';

// Create a separate component for formatted price display
const FormattedPrice = ({ price, currency }) => {
  const [formattedValue, setFormattedValue] = useState('...');
  
  useEffect(() => {
    let isMounted = true;
    
    const formatPrice = async () => {
      try {
        // Use the public formatCurrencyAmount function for consistent formatting
        const formattedPrice = await formatCurrencyAmount(price, currency, true);
        // Remove any currency symbol and just keep the number with proper formatting
        const numericPart = formattedPrice.replace(/^[^\d]+/, '').trim();
        return `${currency} ${numericPart}`;
      } catch (error) {
        console.error('Error formatting price:', error);
        
        // Fallback if formatting fails
        const rates = await fetchExchangeRates();
        const rate = rates && rates[currency];
        const isHighValueCurrency = rate && rate > 1000;
        
        return `${currency} ${price.toLocaleString('en-US', {
          minimumFractionDigits: isHighValueCurrency ? 0 : 2,
          maximumFractionDigits: isHighValueCurrency ? 0 : 2
        })}`;
      }
    };
    
    formatPrice().then(result => {
      if (isMounted) setFormattedValue(result);
    });
    
    return () => { isMounted = false; };
  }, [price, currency]);
  
  return <div style={{ fontWeight: 'bold' }}>{formattedValue}</div>;
};

const UAExpandedSaverResultsTable = ({ 
  searchResults, 
  isLoading, 
  pagination, 
  onTableChange,
  onRouteSelect 
}) => {
  const [tableSearchText, setTableSearchText] = useState('');
  const [filteredData, setFilteredData] = useState([]);
  const [isCashView, setIsCashView] = useState(false);
  const [applyExpiredPromo, setApplyExpiredPromo] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [convertedPrices, setConvertedPrices] = useState({});
  const [seatsFilterMode, setSeatsFilterMode] = useState('approximate'); // 'approximate' or 'exact'
  const [seatsFilterRange, setSeatsFilterRange] = useState([1, 9]);
  const [seatsFilterActive, setSeatsFilterActive] = useState(false);
  // Add state for rate data
  const [rateData, setRateData] = useState(null);
  const [rateDataLoading, setRateDataLoading] = useState(true);
  
  // Fetch rate data when component mounts
  useEffect(() => {
    const fetchRateData = async () => {
      try {
        setRateDataLoading(true);
        const response = await fetch(RATE_JSON_URL);
        if (!response.ok) {
          throw new Error(`Failed to fetch rate data: ${response.status}`);
        }
        const data = await response.json();
        console.log('Rate data loaded:', data);
        setRateData(data);
      } catch (error) {
        console.error('Error fetching rate data:', error);
        // Set fallback default values
        setRateData({
          basePrice: 0.03,
          type: 'bonus',
          endDate: '2025-04-18',
          tiers: [
            { minMiles: 1000, maxMiles: 4000, Percentage: 0 },
            { minMiles: 5000, maxMiles: 9000, Percentage: 40 },
            { minMiles: 10000, maxMiles: 19000, Percentage: 50 },
            { minMiles: 20000, maxMiles: 100000, Percentage: 60 }
          ]
        });
      } finally {
        setRateDataLoading(false);
      }
    };
    
    fetchRateData();
  }, []);
  
  // Check if promo rate is expired
  const isPromoExpired = useMemo(() => {
    if (!rateData || !rateData.endDate) return false;
    const endDate = new Date(rateData.endDate);
    const currentDate = new Date();
    return currentDate > endDate;
  }, [rateData]);
  
  // Transform and filter data whenever searchResults or tableSearchText or seatsFilter changes
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
  }, [searchResults, tableSearchText, seatsFilterActive, seatsFilterMode, seatsFilterRange]);
  
  // Convert prices when currency or filteredData changes
  useEffect(() => {
    if (!isCashView || !filteredData.length) return;
    
    const convertPrices = async () => {
      const priceMap = {};
      for (const item of filteredData) {
        const cashPrice = getCashPrice(item.price);
        if (selectedCurrency === 'USD') {
          priceMap[item.key] = cashPrice;
        } else {
          const convertedPrice = await convertCurrency(cashPrice, 'USD', selectedCurrency);
          priceMap[item.key] = convertedPrice;
        }
      }
      setConvertedPrices(priceMap);
    };
    
    convertPrices();
  }, [filteredData, selectedCurrency, isCashView, applyExpiredPromo]);
  
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
        sorter: { 
          compare: (a, b) => (a.connections ? a.connections.length : 0) - (b.connections ? b.connections.length : 0),
          multiple: 2 
        },
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
        title: 'Price (Business Class)',
        dataIndex: 'price',
        key: 'price',
        width: 200,
        defaultSortOrder: 'ascend',
        sorter: { 
          compare: (a, b) => a.price - b.price,
          multiple: 1 
        },
        align: 'right',
        render: (price, record) => {
          if (isCashView) {
            // Use converted price if available, otherwise calculate
            const convertedPrice = convertedPrices[record.key];
            if (convertedPrice !== undefined) {
              return <FormattedPrice price={convertedPrice} currency={selectedCurrency} />;
            }
            return <div style={{ fontWeight: 'bold' }}>...</div>; // Loading state
          }
          // Miles view
          return <div style={{ fontWeight: 'bold' }}>{price.toLocaleString()}</div>;
        },
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
    
    let filteredBySearch = data;
    if (tableSearchText) {
      const searchLower = tableSearchText.toLowerCase();
      
      filteredBySearch = data.filter(item => {
        return (
          item.path.toLowerCase().includes(searchLower) ||
          item.date.toLowerCase().includes(searchLower) ||
          (item.connections && item.connections.some(c => c.toLowerCase().includes(searchLower))) ||
          (item.flightNumbers && item.flightNumbers.some(f => f.toLowerCase().includes(searchLower))) ||
          (item.aircraft && item.aircraft.some(a => a.toLowerCase().includes(searchLower)))
        );
      });
    }
    
    // Apply seats filter if active
    if (seatsFilterActive && filteredBySearch.length > 0) {
      return filteredBySearch.filter(item => {
        const seats = item.seats;
        const min = seatsFilterRange[0];
        const max = seatsFilterRange[1];
        
        if (seatsFilterMode === 'approximate') {
          // For "Min 1", show if the filter includes 1
          if (seats === "Min 1") {
            return min <= 1;
          }
          
          // For ranges like "1~4"
          if (typeof seats === 'string' && seats.includes('~')) {
            const upperBound = parseInt(seats.split('~')[1]);
            // Show if there's any overlap between the filter range and seat range
            return !(max < 1 || min > upperBound);
          }
          
          // For exact numbers
          const exactSeats = parseInt(seats);
          if (!isNaN(exactSeats)) {
            return exactSeats >= min && exactSeats <= max;
          }
        } else if (seatsFilterMode === 'exact') {
          // In exact mode, if filter range includes 1, show all results
          if (min <= 1) {
            return true;
          }
          
          // For "Min 1", hide in exact mode unless filter includes 1
          if (seats === "Min 1") {
            return false;
          }
          
          // For ranges like "1~4", hide in exact mode
          if (typeof seats === 'string' && seats.includes('~')) {
            return false;
          }
          
          // For exact numbers, show only if within filter range
          const exactSeats = parseInt(seats);
          if (!isNaN(exactSeats)) {
            return exactSeats >= min && exactSeats <= max;
          }
        }
        
        return true; // Default to showing if logic fails
      });
    }
    
    return filteredBySearch;
  };

  // Calculate cash price based on miles using rate.json data
  const getCashPrice = (miles) => {
    // Return default calculation if rate data is still loading or unavailable
    if (rateDataLoading || !rateData) {
      return Math.round(miles * 0.03);
    }
    
    const basePrice = rateData.basePrice || 0.03;
    const promoType = rateData.type || 'none';
    const tiers = rateData.tiers || [];
    
    // Skip promo logic if expired and not applying promo
    if (isPromoExpired && !applyExpiredPromo) {
      return Math.round(miles * basePrice);
    }
    
    // Discount type: apply percentage discount to the price
    if (promoType === 'discount') {
      // Round miles up to nearest 1000
      const roundedMiles = Math.ceil(miles / 1000) * 1000;
      
      // Find applicable tier
      const tier = tiers.find(t => 
        roundedMiles >= t.minMiles && roundedMiles <= t.maxMiles
      ) || { Percentage: 0 };
      
      // Apply discount
      return Math.round(roundedMiles * basePrice * (100 - tier.Percentage) / 100);
    }
    
    // Bonus type: work backwards to find base miles
    if (promoType === 'bonus') {
      // For bonus type, we need to find the correct tier by testing each one
      let baseMiles = miles;
      let roundedBaseMiles = miles;
      
      // Sort tiers by percentage in descending order to try higher bonuses first
      const sortedTiers = [...tiers].sort((a, b) => b.Percentage - a.Percentage);
      
      // Try each tier to find the correct one
      for (const tier of sortedTiers) {
        // Calculate what the base miles would be for this tier
        const bonusMultiplier = 1 + (tier.Percentage / 100);
        const calculatedBaseMiles = miles / bonusMultiplier;
        const roundedCalculatedMiles = Math.ceil(calculatedBaseMiles / 1000) * 1000;
        
        // Check if the rounded base miles would fall within this tier's range
        if (roundedCalculatedMiles >= tier.minMiles && roundedCalculatedMiles <= tier.maxMiles) {
          // This tier is valid - use these base miles
          baseMiles = calculatedBaseMiles;
          roundedBaseMiles = roundedCalculatedMiles;
          break;
        }
      }
      
      // If no tier matched, use the standard base price without bonus
      return Math.round(roundedBaseMiles * basePrice);
    }
    
    // No promo or unknown type
    return Math.round(miles * basePrice);
  };

  const handleCurrencyChange = (value) => {
    setSelectedCurrency(value);
  };

  const handleSeatsFilterChange = (range) => {
    setSeatsFilterRange(range);
    setSeatsFilterActive(true);
  };
  
  const handleSeatsFilterModeChange = (mode) => {
    setSeatsFilterMode(mode);
  };
  
  const resetSeatsFilter = () => {
    setSeatsFilterRange([1, 9]);
    setSeatsFilterActive(false);
  };

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: 8 }}>Mode:</span>
          <Switch
            checked={isCashView}
            onChange={setIsCashView}
            checkedChildren="Cash"
            unCheckedChildren="Miles"
            style={{ marginRight: 8 }}
          />
          
          {isCashView && (
            <Dropdown
              overlay={
                <div style={{ 
                  backgroundColor: 'white', 
                  boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
                  borderRadius: '8px',
                  padding: '8px 0',
                  width: '300px'
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
                    <Input.Search
                      placeholder="Search currencies..."
                      size="small"
                      allowClear
                      onChange={(e) => {
                        // Will be used for filtering
                        const searchText = e.target.value.toLowerCase();
                        document.querySelectorAll('.currency-option').forEach(el => {
                          const text = el.getAttribute('data-search').toLowerCase();
                          el.style.display = text.includes(searchText) ? 'flex' : 'none';
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <div style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto',
                    padding: '8px 0'
                  }}>
                    {currencyList.map(currency => (
                      <div 
                        key={currency.code}
                        className="currency-option"
                        data-search={`${currency.code} ${currency.name}`}
                        onClick={() => handleCurrencyChange(currency.code)}
                        style={{ 
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          backgroundColor: selectedCurrency === currency.code ? '#f0f8ff' : 'white',
                          borderLeft: selectedCurrency === currency.code ? '3px solid #1890ff' : '3px solid transparent',
                          '&:hover': {
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                      >
                        <span style={{ fontWeight: 'bold' }}>{currency.code}</span>
                        <span style={{ fontSize: '12px', color: '#666' }}>{currency.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              trigger={['click']}
            >
              <Button style={{ marginLeft: 8 }}>
                <Space>
                  <DollarOutlined />
                  {selectedCurrency}
                  <DownOutlined />
                </Space>
              </Button>
            </Dropdown>
          )}
          
          {/* Seats Filter Button */}
          <Dropdown
            overlay={
              <div style={{ 
                backgroundColor: 'white', 
                boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
                borderRadius: '8px',
                padding: '8px 0',
                width: '300px'
              }}>
                <Tabs 
                  defaultActiveKey={seatsFilterMode}
                  onChange={handleSeatsFilterModeChange}
                  style={{ padding: '0 12px' }}
                >
                  <Tabs.TabPane tab="Approximate" key="approximate">
                    <div style={{ padding: '12px 0' }}>
                      <Slider 
                        range
                        min={1}
                        max={9}
                        value={seatsFilterRange}
                        onChange={handleSeatsFilterChange}
                        marks={{
                          1: '1',
                          3: '3',
                          5: '5',
                          7: '7',
                          9: '9'
                        }}
                      />
                      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                        Selected: {seatsFilterRange[0]} - {seatsFilterRange[1]} seats
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                        <p>Includes flights with:</p>
                        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                          <li>Exact seat counts in range</li>
                          <li>Range values with overlap (e.g. "1~4")</li>
                          <li>"Min 1" if range includes 1</li>
                        </ul>
                      </div>
                    </div>
                  </Tabs.TabPane>
                  <Tabs.TabPane tab="Exact" key="exact">
                    <div style={{ padding: '12px 0' }}>
                      <Slider 
                        range
                        min={1}
                        max={9}
                        value={seatsFilterRange}
                        onChange={handleSeatsFilterChange}
                        marks={{
                          1: '1',
                          3: '3',
                          5: '5',
                          7: '7',
                          9: '9'
                        }}
                      />
                      <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', color: '#666' }}>
                        Selected: {seatsFilterRange[0]} - {seatsFilterRange[1]} seats
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                        <p>Strict matching:</p>
                        <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                          <li>Only exact seat counts in range</li>
                          <li>No range values (e.g. "1~4")</li>
                          <li>Shows all if range includes 1</li>
                        </ul>
                      </div>
                    </div>
                  </Tabs.TabPane>
                </Tabs>
                <div style={{ 
                  padding: '8px 12px',
                  borderTop: '1px solid #f0f0f0',
                  display: 'flex', 
                  justifyContent: 'flex-end'
                }}>
                  <Button 
                    size="small" 
                    onClick={resetSeatsFilter}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            }
            trigger={['click']}
          >
            <Button 
              style={{ marginLeft: 8 }}
              type={seatsFilterActive ? 'primary' : 'default'}
            >
              <Space>
                <UserOutlined />
                Seats {seatsFilterActive && `(${seatsFilterRange[0]}-${seatsFilterRange[1]})`}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
          
          {isCashView && isPromoExpired && (
            <Checkbox 
              checked={applyExpiredPromo} 
              onChange={e => setApplyExpiredPromo(e.target.checked)}
              style={{ marginLeft: 12 }}
            >
              Apply last promo
            </Checkbox>
          )}
        </div>
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
        style={{ width: '100%' }}
      />
      
      {/* Add custom styles to override global flex-direction */}
      <style jsx>{`
        :global(.ua-expanded-table-card .ant-card-body) {
          flex-direction: column !important;
          align-items: flex-start !important;
        }
      `}</style>
    </>
  );
};

export default UAExpandedSaverResultsTable; 