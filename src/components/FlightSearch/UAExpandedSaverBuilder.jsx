import React, { useState, useEffect } from 'react';
import { Card, Input, DatePicker, Button, Space, Row, Col, Select, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import filteredAirportsByCopazone from '../../data/filtered_airports_by_copazone.json';
import './styles/NormalRouteBuilder.css';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// Helper function to parse search input - extracted from SearchForm
const parseSearchInput = (inputValue) => {
  if (!inputValue) return '';
  
  try {
    if (typeof inputValue === 'object' && inputValue !== null) {
      if (inputValue._searchText) {
        return String(inputValue._searchText).toLowerCase();
      } else if (inputValue.input) {
        return String(inputValue.input).toLowerCase();
      } else if (inputValue.searchText) {
        return String(inputValue.searchText).toLowerCase();
      } else if (inputValue.value) {
        return String(inputValue.value).toLowerCase();
      } else if (inputValue.searchValue) {
        return String(inputValue.searchValue).toLowerCase();
      } else {
        // Try to extract searchValue from JSON string
        const str = String(inputValue);
        if (str.startsWith('{') && str.includes('searchValue')) {
          try {
            const parsed = JSON.parse(str);
            if (parsed.searchValue) {
              return String(parsed.searchValue).toLowerCase();
            }
          } catch (e) {
            // Parsing error, continue to fallback
          }
        }
        // If we get here, we couldn't extract a searchValue
        return '';
      }
    } else {
      return String(inputValue || '').toLowerCase();
    }
  } catch (error) {
    console.error('Error parsing input value:', error);
    return '';
  }
};

const UAExpandedSaverBuilder = ({ onSearch, isLoading, errors, cachedApiKey, saveApiKey }) => {
  const [direction, setDirection] = useState('From US');
  const [airport, setAirport] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  // Track whether we're selecting start or end date
  const [selectingDate, setSelectingDate] = useState('start');
  // Store temporary start date
  const [tempStartDate, setTempStartDate] = useState(null);
  // Add API loading state
  const [apiLoading, setApiLoading] = useState(false);

  // Process the local JSON data
  useEffect(() => {
    try {
      setLoading(true);
      
      // Flatten the grouped data for the Select component
      const allAirports = [];
      for (const [zoneName, zoneAirports] of Object.entries(filteredAirportsByCopazone)) {
        // Add this zone's airports, filtering out US airports
        zoneAirports.forEach(airport => {
          // Skip airports with CountryCode "US"
          if (airport.CountryCode !== "US") {
            allAirports.push({
              ...airport,
              zoneName
            });
          }
        });
      }
      
      setAirports(allAirports);
      setLoading(false);
    } catch (error) {
      console.error('Error processing airports data:', error);
      setLoading(false);
    }
  }, []);

  // Custom date range handler
  const handleDateRangeChange = (dates, dateStrings) => {
    if (!dates || dates.length === 0) {
      // Handle clear
      setDateRange(null);
      setTempStartDate(null);
      setSelectingDate('start');
      return;
    }

    // Always store both dates when provided
    if (dates.length === 2 && dates[0] && dates[1]) {
      const startDate = dates[0];
      const endDate = dates[1];
      
      // Check if the date range is more than 7 days
      const diffDays = endDate.diff(startDate, 'day');
      
      if (diffDays > 7) {
        // If more than 7 days, adjust the end date to be 7 days from start
        const newEndDate = startDate.clone().add(7, 'day');
        setDateRange([startDate, newEndDate]);
      } else {
        // Valid selection within 7 days
        setDateRange(dates);
      }
      setSelectingDate('start'); // Reset for next selection
      return;
    }
    
    // Store the single date if only one selected
    if (dates.length === 1 && dates[0]) {
      setDateRange([dates[0], null]);
      setTempStartDate(dates[0]);
    }
  };

  // Date range disabler function
  const disabledDate = (current) => {
    // Disable dates before today
    const today = dayjs().startOf('day');
    // Disable dates after 365 days from today
    const maxDate = today.add(365, 'day');
    
    // Get the currently selected start date (if any)
    const startDate = dateRange && dateRange[0] ? dateRange[0] : null;
    
    // If we have a start date and we're selecting the end date
    if (startDate) {
      const maxEndDate = startDate.clone().add(7, 'day');
      // For end date selection, disable dates before start date or after start date + 7 days
      if (current.isBefore(startDate, 'day')) {
        return true;
      }
      if (current.isAfter(maxEndDate, 'day')) {
        return true;
      }
    }
    
    // Always disable dates outside the allowed range
    return current.isBefore(today, 'day') || current.isAfter(maxDate, 'day');
  };

  // Common airport select properties - exactly matching the AC Route Builder
  const airportSelectProps = {
    showSearch: true,
    allowClear: true,
    suffixIcon: null,
    loading: loading,
    options: airports.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.CityName} (${airport.Country})`,
      iata: airport.IATA,
      name: airport.CityName,
      country: airport.Country,
      zone: airport.copazone
    })),
    optionRender: (option) => {
      // Extract the parts of the label
      const iataCode = option.value;
      const airportName = option.data.name;
      const country = option.data.country;
      const zone = option.data.zone;
      
      return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          <span style={{ fontWeight: 'bold' }}>{iataCode}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {airportName} ({country})
          </span>
          <span style={{ fontSize: '11px', color: '#999' }}>
            {zone}
          </span>
        </div>
      );
    },
    filterOption: (input, option) => {
      if (!input) return true;
      
      // Use the helper function to extract search text
      const searchText = parseSearchInput(input);
      
      const iata = String(option.value || '').toLowerCase();
      const label = String(option.label || '').toLowerCase();
      
      // Always include options where IATA matches, then name matches
      return iata.includes(searchText) || label.includes(searchText);
    },
    filterSort: (optionA, optionB, inputValue) => {
      // Handle case when inputValue is undefined or null
      if (!inputValue) return String(optionA.value || '').localeCompare(String(optionB.value || ''));
      
      // Use the helper function to extract input
      const input = parseSearchInput(inputValue);
      
      // Get IATA codes
      const iataA = String(optionA.value || '').toLowerCase();
      const iataB = String(optionB.value || '').toLowerCase();
      
      // SCORING SYSTEM - higher scores come first
      let scoreA = 0;
      let scoreB = 0;
      
      // Priority 1 (Highest): IATA code exactly matches input
      if (iataA === input) scoreA = 1000;
      if (iataB === input) scoreB = 1000;
      
      // Priority 2: IATA code starts with input
      if (iataA.startsWith(input) && iataA !== input) scoreA = 500;
      if (iataB.startsWith(input) && iataB !== input) scoreB = 500;
      
      // Priority 3: IATA code contains input
      if (iataA.includes(input) && !iataA.startsWith(input)) scoreA = 200;
      if (iataB.includes(input) && !iataB.startsWith(input)) scoreB = 200;
      
      // Priority 4: Label contains input - separated by giving a special score
      // Now check if the labels contain the input
      const labelA = String(optionA.label || '').toLowerCase();
      const labelB = String(optionB.label || '').toLowerCase();
      
      if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
      if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
      
      // Compare scores (higher score first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // If tied on score, sort alphabetically by IATA code
      return String(iataA).localeCompare(String(iataB));
    },
    listHeight: 256,
    virtual: true,
    dropdownStyle: { 
      maxHeight: 400,
      padding: '8px 0',
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      zIndex: 1050,
      overflowY: 'auto',
      overflowAnchor: 'none'
    }
  };

  // Load the cached API key when the component mounts
  useEffect(() => {
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
    }
  }, [cachedApiKey]);

  // Update the cached API key when it changes
  const handleApiKeyChange = (e) => {
    const newApiKey = e.target.value;
    setApiKey(newApiKey);
    saveApiKey(newApiKey);
  };

  const handleSearch = () => {
    if (!airport) {
      return;
    }

    // Set API loading state to true
    setApiLoading(true);

    // Format the URL with proper query parameters
    const formattedType = encodeURIComponent(direction);
    const formattedAirport = encodeURIComponent(airport);
    const startDate = dateRange ? dateRange[0].format('YYYY-MM-DD') : '';
    const endDate = dateRange ? dateRange[1].format('YYYY-MM-DD') : '';
    
    // Construct the API URL with HTTPS
    const apiUrl = `https://backend-284998006367.us-central1.run.app/api/route-search?type=${formattedType}&airport=${formattedAirport}&startDate=${startDate}&endDate=${endDate}`;
    
    // Make the API call
    fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Partner-Authorization': apiKey
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    })
    .then(data => {
      // Reset API loading state
      setApiLoading(false);
      
      // Handle successful API response
      console.log('API response:', data);
      
      // Skip the standard onSearch which triggers path format validations
      // Instead, directly update UI as needed to show results
      
      // If your UI needs updates based on the onSearch callback,
      // you can call it with a specially formatted object to bypass validations
      onSearch({
        direction,
        airport,
        apiKey,
        dateRange: dateRange ? [dateRange[0].format('YYYY-MM-DD'), dateRange[1].format('YYYY-MM-DD')] : null,
        sourcesState: { mode: 'include', sources: ['united'] },
        // Add special flag to bypass path validation
        isUAExpandedSaver: true,
        // Format the path to prevent invalid path format error (add hyphen)
        path: `dummy-${airport}`,
        // Add the API response data
        apiResponseData: data
      });
    })
    .catch(error => {
      // Reset API loading state even on error
      setApiLoading(false);
      console.error('API request failed:', error);
      // Set error state if needed
    });
  };

  return (
    <>
      <Card className="normal-route-builder">
        <Row gutter={[16, 16]} className="form-row">
          {/* Custom Path Input with Direction and Airport */}
          <Col flex="16">
            <div className="form-item">
              <div className="element-label">Route:</div>
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
                <Text strong style={{ whiteSpace: 'nowrap' }}>Flying</Text>
                <Select
                  value={direction}
                  onChange={setDirection}
                  style={{ width: 120 }}
                  options={[
                    { value: 'From US', label: 'From US' },
                    { value: 'To US', label: 'To US' },
                  ]}
                />
                <Text strong style={{ whiteSpace: 'nowrap' }}>{direction === 'From US' ? 'to' : 'from'}</Text>
                <Select
                  {...airportSelectProps}
                  value={airport}
                  onChange={setAirport}
                  style={{ flex: 1 }}
                  placeholder={loading ? "Loading airports..." : "Select airport"}
                  className="airport-select"
                />
              </div>
            </div>
          </Col>

          {/* API Key */}
          <Col flex="6">
            <div className="form-item">
              <div className="element-label">API Key:</div>
              <Input.Password
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your API key"
              />
            </div>
          </Col>

          {/* Date Range */}
          <Col flex="6">
            <div className="form-item">
              <div className="element-label">Date Range:</div>
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="YYYY-MM-DD"
                disabledDate={disabledDate}
                placeholder={['Start date', 'End date (max 7 days)']}
                allowClear={true}
                style={{ width: '100%' }}
              />
            </div>
          </Col>

          {/* Search Button */}
          <Col flex="0 1 120px" className="search-button-col">
            <Button
              type="primary"
              onClick={handleSearch}
              disabled={!airport || isLoading || loading}
              loading={isLoading || apiLoading}
              className="search-button"
              icon={<SearchOutlined />}
            >
              Search
            </Button>
          </Col>
        </Row>
        
        {/* Error messages */}
        {errors && Object.entries(errors).map(([key, error]) => (
          <div key={key} style={{ color: 'red', marginTop: '8px' }}>
            {error}
          </div>
        ))}
      </Card>
    </>
  );
};

export default UAExpandedSaverBuilder;