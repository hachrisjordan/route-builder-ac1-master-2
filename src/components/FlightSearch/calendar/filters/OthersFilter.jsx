import React, { useEffect, useState } from 'react';
import { Checkbox, Select, Slider, Row, Col, Typography } from 'antd';
import { currencyList } from '../data/currency_list';
import { fetchExchangeRates } from '../utils/currencyUtils';

const { Title } = Typography;

// Helper to format time value (0-24 hours) to display format
const formatTimeDisplay = (value) => {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Helper to format duration in minutes to hours and minutes
const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const OthersFilter = ({
  currencyFilter: externalCurrencyFilter,
  setCurrencyFilter: externalSetCurrencyFilter,
  timeFilters: externalTimeFilters,
  setTimeFilters: externalSetTimeFilters,
  flightData,
  flightDurationRange = [60, 1440] // Default min/max duration in minutes (1h to 24h)
}) => {
  // Internal state as fallback when props are not provided
  const [internalCurrencyFilter, setInternalCurrencyFilter] = useState({ 
    enabled: false, 
    selectedCurrency: null 
  });
  
  // Calculate actual min/max duration from flight data
  const [calculatedDurationRange, setCalculatedDurationRange] = useState(flightDurationRange);
  
  // Calculate min/max durations from flight data on first render
  useEffect(() => {
    if (flightData?.rawData && Array.isArray(flightData.rawData)) {
      let minDuration = Number.MAX_SAFE_INTEGER;
      let maxDuration = 0;
      
      // Loop through raw flight data to find min/max durations
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
      
      // If we found valid durations, update the range
      if (minDuration !== Number.MAX_SAFE_INTEGER && maxDuration > 0) {
        // Round min down to nearest 5 minutes, max up to nearest 5 minutes
        minDuration = Math.floor(minDuration / 5) * 5;
        maxDuration = Math.ceil(maxDuration / 5) * 5;
        
        // Use sensible defaults if values are extreme
        if (minDuration < 30) minDuration = 30; // minimum 30 minutes
        if (maxDuration > 2880) maxDuration = 2880; // maximum 48 hours
        
        console.log(`Duration range calculated: ${minDuration}-${maxDuration} minutes`);
        setCalculatedDurationRange([minDuration, maxDuration]);
        
        // Also update the filter range if it's enabled
        if (externalTimeFilters?.duration?.enabled) {
          const updatedDurationFilter = {
            ...externalTimeFilters.duration,
            range: [minDuration, maxDuration]
          };
          setTimeFilters({
            ...externalTimeFilters,
            duration: updatedDurationFilter
          });
        }
      }
    }
  }, [flightData]);
  
  const [internalTimeFilters, setInternalTimeFilters] = useState({
    departure: { enabled: false, range: [0, 24] },
    arrival: { enabled: false, range: [0, 24] },
    duration: { enabled: false, range: calculatedDurationRange }
  });
  
  // Use either external props or internal state
  const currencyFilter = externalCurrencyFilter || internalCurrencyFilter;
  const setCurrencyFilter = externalSetCurrencyFilter || setInternalCurrencyFilter;
  const timeFilters = externalTimeFilters || internalTimeFilters;
  const setTimeFilters = externalSetTimeFilters || setInternalTimeFilters;

  // Transform currency list into options format for Select
  const currencyOptions = currencyList.map(currency => ({
    label: `${currency.code} - ${currency.name}`,
    value: currency.code
  }));

  // Fetch exchange rates when currency filter is enabled
  useEffect(() => {
    if (currencyFilter.enabled) {
      fetchExchangeRates().catch(console.error);
    }
  }, [currencyFilter.enabled]);

  // Local handlers to prevent errors
  const handleCurrencyChange = (e) => {
    try {
      setCurrencyFilter({
        ...currencyFilter,
        enabled: e.target.checked,
        selectedCurrency: e.target.checked ? (currencyFilter.selectedCurrency || 'USD') : null
      });
    } catch (err) {
      console.error('Error in handleCurrencyChange:', err);
      // Fallback to internal state if external handler fails
      setInternalCurrencyFilter({
        ...internalCurrencyFilter,
        enabled: e.target.checked,
        selectedCurrency: e.target.checked ? (internalCurrencyFilter.selectedCurrency || 'USD') : null
      });
    }
  };

  const handleCurrencySelect = (value) => {
    try {
      setCurrencyFilter({
        ...currencyFilter,
        selectedCurrency: value
      });
    } catch (err) {
      console.error('Error in handleCurrencySelect:', err);
      setInternalCurrencyFilter({
        ...internalCurrencyFilter,
        selectedCurrency: value
      });
    }
  };

  // Handler for departure time filter changes
  const handleDepartureFilterChange = (enabled) => {
    try {
      setTimeFilters({
        ...timeFilters,
        departure: {
          ...timeFilters.departure,
          enabled
        }
      });
    } catch (err) {
      console.error('Error in handleDepartureFilterChange:', err);
      setInternalTimeFilters({
        ...internalTimeFilters,
        departure: {
          ...internalTimeFilters.departure,
          enabled
        }
      });
    }
  };

  // Handler for departure time range changes
  const handleDepartureRangeChange = (range) => {
    try {
      setTimeFilters({
        ...timeFilters,
        departure: {
          ...timeFilters.departure,
          range
        }
      });
    } catch (err) {
      console.error('Error in handleDepartureRangeChange:', err);
      setInternalTimeFilters({
        ...internalTimeFilters,
        departure: {
          ...internalTimeFilters.departure,
          range
        }
      });
    }
  };

  // Handler for arrival time filter changes
  const handleArrivalFilterChange = (enabled) => {
    try {
      setTimeFilters({
        ...timeFilters,
        arrival: {
          ...timeFilters.arrival,
          enabled
        }
      });
    } catch (err) {
      console.error('Error in handleArrivalFilterChange:', err);
      setInternalTimeFilters({
        ...internalTimeFilters,
        arrival: {
          ...internalTimeFilters.arrival,
          enabled
        }
      });
    }
  };

  // Handler for arrival time range changes
  const handleArrivalRangeChange = (range) => {
    try {
      setTimeFilters({
        ...timeFilters,
        arrival: {
          ...timeFilters.arrival,
          range
        }
      });
    } catch (err) {
      console.error('Error in handleArrivalRangeChange:', err);
      setInternalTimeFilters({
        ...internalTimeFilters,
        arrival: {
          ...internalTimeFilters.arrival,
          range
        }
      });
    }
  };

  // Handler for duration filter changes
  const handleDurationFilterChange = (enabled) => {
    try {
      // If enabling the filter, recalculate min/max from latest flight data
      if (enabled && flightData?.rawData) {
        let minDuration = Number.MAX_SAFE_INTEGER;
        let maxDuration = 0;
        
        // Loop through raw flight data to find min/max durations
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
        
        // If we found valid durations, update the range
        if (minDuration !== Number.MAX_SAFE_INTEGER && maxDuration > 0) {
          // Round min down to nearest 5 minutes, max up to nearest 5 minutes
          minDuration = Math.floor(minDuration / 5) * 5;
          maxDuration = Math.ceil(maxDuration / 5) * 5;
          
          console.log(`Duration range calculated: ${minDuration}-${maxDuration} minutes`);
          
          setTimeFilters({
            ...timeFilters,
            duration: {
              enabled: true,
              range: [minDuration, maxDuration]
            }
          });
          return;
        }
      }
      
      // If we get here, either disabling or couldn't calculate new range
      setTimeFilters({
        ...timeFilters,
        duration: {
          ...timeFilters.duration,
          enabled
        }
      });
    } catch (err) {
      console.error('Error in handleDurationFilterChange:', err);
      setInternalTimeFilters({
        ...internalTimeFilters,
        duration: {
          ...internalTimeFilters.duration,
          enabled
        }
      });
    }
  };

  // Handler for duration range changes
  const handleDurationRangeChange = (range) => {
    try {
      setTimeFilters({
        ...timeFilters,
        duration: {
          ...timeFilters.duration,
          range
        }
      });
    } catch (err) {
      console.error('Error in handleDurationRangeChange:', err);
      setInternalTimeFilters({
        ...internalTimeFilters,
        duration: {
          ...internalTimeFilters.duration,
          range
        }
      });
    }
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '320px'
    }}>
      {/* Currency Filter Section */}
      <div style={{ 
        padding: '8px 12px', 
        borderBottom: '1px solid #f0f0f0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '12px' }}>
          <Checkbox
            checked={currencyFilter.enabled}
            onChange={handleCurrencyChange}
          >
            Select Currency
          </Checkbox>
        </div>
        {currencyFilter.enabled && (
          <div style={{ width: '100%' }}>
            <Select
              style={{ width: '100%', maxWidth: '296px' }}
              value={currencyFilter.selectedCurrency}
              onChange={handleCurrencySelect}
              options={currencyOptions}
              placeholder="Select a currency"
              size="small"
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        )}
      </div>

      {/* Departure Time Filter Section */}
      <div style={{ 
        padding: '12px', 
        borderBottom: '1px solid #f0f0f0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <Checkbox
            checked={timeFilters.departure?.enabled || false}
            onChange={(e) => handleDepartureFilterChange(e.target.checked)}
          >
            Departure Time
          </Checkbox>
        </div>
        {timeFilters.departure?.enabled && (
          <div style={{ 
            width: '100%', 
            paddingLeft: '8px', 
            paddingRight: '8px',
            paddingBottom: '8px',
            boxSizing: 'border-box'
          }}>
            <Row>
              <Col span={24}>
                <Slider
                  range
                  min={0}
                  max={24}
                  step={0.25} // 15 minute intervals
                  value={timeFilters.departure.range}
                  onChange={handleDepartureRangeChange}
                  tipFormatter={formatTimeDisplay}
                />
              </Col>
            </Row>
            <Row justify="space-between" style={{ marginTop: '6px' }}>
              <Col>
                <small>{formatTimeDisplay(timeFilters.departure.range[0])}</small>
              </Col>
              <Col>
                <small>{formatTimeDisplay(timeFilters.departure.range[1])}</small>
              </Col>
            </Row>
          </div>
        )}
      </div>

      {/* Arrival Time Filter Section */}
      <div style={{ 
        padding: '12px', 
        borderBottom: '1px solid #f0f0f0',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <Checkbox
            checked={timeFilters.arrival?.enabled || false}
            onChange={(e) => handleArrivalFilterChange(e.target.checked)}
          >
            Arrival Time
          </Checkbox>
        </div>
        {timeFilters.arrival?.enabled && (
          <div style={{ 
            width: '100%', 
            paddingLeft: '8px', 
            paddingRight: '8px',
            paddingBottom: '8px',
            boxSizing: 'border-box'
          }}>
            <Row>
              <Col span={24}>
                <Slider
                  range
                  min={0}
                  max={24}
                  step={0.25} // 15 minute intervals
                  value={timeFilters.arrival.range}
                  onChange={handleArrivalRangeChange}
                  tipFormatter={formatTimeDisplay}
                />
              </Col>
            </Row>
            <Row justify="space-between" style={{ marginTop: '6px' }}>
              <Col>
                <small>{formatTimeDisplay(timeFilters.arrival.range[0])}</small>
              </Col>
              <Col>
                <small>{formatTimeDisplay(timeFilters.arrival.range[1])}</small>
              </Col>
            </Row>
          </div>
        )}
      </div>

      {/* Duration Filter Section */}
      <div style={{ 
        padding: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ marginBottom: '14px' }}>
          <Checkbox
            checked={timeFilters.duration?.enabled || false}
            onChange={(e) => handleDurationFilterChange(e.target.checked)}
          >
            Flight Duration
          </Checkbox>
        </div>
        {timeFilters.duration?.enabled && (
          <div style={{ 
            width: '100%', 
            paddingLeft: '8px', 
            paddingRight: '8px',
            paddingBottom: '8px',
            boxSizing: 'border-box'
          }}>
            <Row>
              <Col span={24}>
                <Slider
                  range
                  min={calculatedDurationRange[0]}
                  max={calculatedDurationRange[1]}
                  step={5} // 5 minute intervals
                  value={timeFilters.duration.range}
                  onChange={handleDurationRangeChange}
                  tipFormatter={(value) => formatDuration(value)}
                />
              </Col>
            </Row>
            <Row justify="space-between" style={{ marginTop: '6px' }}>
              <Col>
                <small>{formatDuration(timeFilters.duration.range[0])}</small>
              </Col>
              <Col>
                <small>{formatDuration(timeFilters.duration.range[1])}</small>
              </Col>
            </Row>
          </div>
        )}
      </div>
    </div>
  );
};

export default OthersFilter; 