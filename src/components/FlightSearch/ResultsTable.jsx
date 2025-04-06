import React, { useState, useEffect } from 'react';
import { Table, Card, Input, Radio, Checkbox, Space, Tag, Dropdown, Button, Slider } from 'antd';
import { getResultColumns } from './columns';
import { DownOutlined } from '@ant-design/icons';
import { airports } from './data/airports';

const ResultsTable = ({ 
  searchResults, 
  isLoading, 
  pagination, 
  onTableChange,
  onRouteSelect 
}) => {
  const [tableSearchText, setTableSearchText] = useState('');
  const [selectedDays, setSelectedDays] = useState(60);
  const [isDaysChanging, setIsDaysChanging] = useState(false);
  const [connectionFilter, setConnectionFilter] = useState({
    mode: 'include',
    airports: []
  });
  const [stopsFilter, setStopsFilter] = useState([]);
  const [distanceFilter, setDistanceFilter] = useState(null);
  const [yPercentFilter, setYPercentFilter] = useState(null);
  const [jPercentFilter, setJPercentFilter] = useState(null);
  const [fPercentFilter, setFPercentFilter] = useState(null);
  const [yMinSegmentPercent, setYMinSegmentPercent] = useState(0);
  const [jMinSegmentPercent, setJMinSegmentPercent] = useState(0);
  const [fMinSegmentPercent, setFMinSegmentPercent] = useState(0);
  const [airportSearchText, setAirportSearchText] = useState('');
  const previousDays = React.useRef(60);
  const [otherFilters, setOtherFilters] = useState({
    filterNonAvailability: false
  });

  // Get unique airports from connections
  const uniqueAirports = React.useMemo(() => {
    const airports = new Set();
    searchResults?.routes?.forEach(route => {
      route.connections.forEach(airport => airports.add(airport));
    });
    return Array.from(airports).sort();
  }, [searchResults]);

  // Get unique stops counts
  const uniqueStops = React.useMemo(() => {
    const stops = new Set();
    searchResults?.routes?.forEach(route => {
      stops.add(route.connections.length);
    });
    return Array.from(stops).sort((a, b) => a - b);
  }, [searchResults]);

  // Get distance range
  const distanceRange = React.useMemo(() => {
    if (!searchResults?.routes?.length) return [0, 0];
    const distances = searchResults.routes.map(route => route.totalDistance);
    return [Math.min(...distances), Math.max(...distances)];
  }, [searchResults]);

  // Get percent ranges
  const getPercentRange = (cabin) => {
    if (!searchResults?.routes?.length) return [-100, 100];
    const netField = selectedDays === 60 ? `${cabin}net` : `${cabin}T${selectedDays}net`;
    const percents = searchResults.routes
      .map(route => {
        const value = route[netField];
        if (!value) return 0;
        const match = value.match(/^(-?\d+)/);
        return match ? parseInt(match[0]) : 0;
      });
    return [Math.min(...percents), Math.max(...percents)];
  };

  const yPercentRange = React.useMemo(() => getPercentRange('Y'), [searchResults, selectedDays]);
  const jPercentRange = React.useMemo(() => getPercentRange('J'), [searchResults, selectedDays]);
  const fPercentRange = React.useMemo(() => getPercentRange('F'), [searchResults, selectedDays]);

  // Helper function to map sorting field based on days
  const mapSortField = (field, oldDays, newDays) => {
    if (!field) return null;
    
    // Special case for 60 days - use base net fields
    if (newDays === 60) {
      return field.replace(/[YJF]T\d+net/, match => match.replace(/T\d+net/, 'net'));
    }
    
    // Map from base net field to T{days}net field
    if (!field.includes('T')) {
      return field.replace(/[YJF]net/, match => match.replace('net', `T${newDays}net`));
    }
    
    // For other days, map to the corresponding T{days}net field
    const mappedField = field.replace(
      new RegExp(`[YJF]T${oldDays}net`),
      match => match.replace(`${oldDays}net`, `${newDays}net`)
    );
    
    return mappedField;
  };

  const getFilteredData = () => {
    let data = searchResults?.routes || [];
    console.log('Initial data:', data.length, 'rows');

    // Apply search filter if there's search text
    if (tableSearchText) {
      // Split search text into terms and filter out empty terms
      const searchTerms = tableSearchText.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      console.log('Search terms:', searchTerms);
      
      data = data.filter(route => {
        // If no search terms, include all routes
        if (searchTerms.length === 0) return true;
        
        // For exact airport pair searches (e.g., "BLR DEL")
        if (searchTerms.length === 2) {
          const [term1, term2] = searchTerms;
          
          // Check if the search terms match the exact airport pair (in either order)
          const exactMatch = 
            (route.departure.toLowerCase() === term1 && route.arrival.toLowerCase() === term2) ||
            (route.departure.toLowerCase() === term2 && route.arrival.toLowerCase() === term1);
            
          if (exactMatch) return true;
        }
        
        // Include connections as a string for easier searching
        const connectionsString = route.connections.join(' ').toLowerCase();
        
        // Convert all values to strings to avoid potential type issues
        const yNetString = String(route.Ynet || '').toLowerCase();
        const jNetString = String(route.Jnet || '').toLowerCase();
        const fNetString = String(route.Fnet || '').toLowerCase();
        const yPriceString = String(route.YPrice || '').toLowerCase();
        const jPriceString = String(route.JPrice || '').toLowerCase();
        const fPriceString = String(route.FPrice || '').toLowerCase();
        
        // Fall back to the regular search if no exact match
        return searchTerms.every(term => (
          route.departure.toLowerCase().includes(term) ||
          route.arrival.toLowerCase().includes(term) ||
          connectionsString.includes(term) ||
          yPriceString.includes(term) ||
          jPriceString.includes(term) ||
          fPriceString.includes(term) ||
          yNetString.includes(term) ||
          jNetString.includes(term) ||
          fNetString.includes(term)
        ));
      });
      console.log('After search filter:', data.length, 'rows');
    }

    // Apply connections filter
    if (connectionFilter.airports.length > 0) {
      data = data.filter(route => {
        const hasSelectedAirport = connectionFilter.airports.some(airport => 
          route.connections.includes(airport)
        );
        return connectionFilter.mode === 'include' ? hasSelectedAirport : !hasSelectedAirport;
      });
      console.log('After connections filter:', data.length, 'rows');
    }

    // Apply stops filter
    if (stopsFilter.length > 0) {
      data = data.filter(route => 
        stopsFilter.includes(route.connections.length)
      );
      console.log('After stops filter:', data.length, 'rows');
    }

    // Apply distance filter
    if (distanceFilter) {
      data = data.filter(route => 
        route.totalDistance >= distanceFilter[0] && 
        route.totalDistance <= distanceFilter[1]
      );
      console.log('After distance filter:', data.length, 'rows');
    }

    // Apply non-availability filter
    if (otherFilters.filterNonAvailability) {
      data = data.filter(route => {
        const netField = selectedDays === 60 ? 'net' : `T${selectedDays}net`;
        const yField = 'Y' + netField;
        const jField = 'J' + netField;
        const fField = 'F' + netField;

        // Get all segments percentages for each cabin class
        const getSegmentPercentages = (value) => {
          if (!value) return [];
          const matches = value.match(/-?\d+/g);
          if (!matches) return [];
          return matches.map(num => parseInt(num));
        };

        const ySegments = getSegmentPercentages(route[yField]);
        const jSegments = getSegmentPercentages(route[jField]);
        const fSegments = getSegmentPercentages(route[fField]);

        // Check if any segment has all cabin classes at 0%
        for (let i = 1; i < ySegments.length; i++) {  // Start from 1 to skip overall percentage
          if (ySegments[i] === 0 && jSegments[i] === 0 && fSegments[i] === 0) {
            return false;  // Filter out this route
          }
        }
        return true;
      });
      console.log('After non-availability filter:', data.length, 'rows');
    }

    // Apply Y% filter
    if (yPercentFilter || yMinSegmentPercent > 0) {
      const netField = selectedDays === 60 ? 'Ynet' : `YT${selectedDays}net`;
      data = data.filter(route => {
        const value = route[netField];
        if (!value) return false;
        // Extract all numbers from the percentage string, including those in parentheses
        const matches = value.match(/-?\d+/g);
        if (!matches) return false;
        const segments = matches.map(num => parseInt(num));
        
        // Check range filter if active (first number is overall)
        if (yPercentFilter) {
          const overallPercent = segments[0];
          if (overallPercent < yPercentFilter[0] || overallPercent > yPercentFilter[1]) {
            return false;
          }
        }
        
        // Check minimum segment percentage (skip first number as it's the overall)
        if (yMinSegmentPercent > 0) {
          // Check all segments except the overall percentage
          return segments.slice(1).every(percent => percent >= yMinSegmentPercent);
        }
        return true;
      });
    }

    // Apply J% filter
    if (jPercentFilter || jMinSegmentPercent > 0) {
      const netField = selectedDays === 60 ? 'Jnet' : `JT${selectedDays}net`;
      data = data.filter(route => {
        const value = route[netField];
        if (!value) return false;
        // Extract all numbers from the percentage string, including those in parentheses
        const matches = value.match(/-?\d+/g);
        if (!matches) return false;
        const segments = matches.map(num => parseInt(num));
        
        // Check range filter if active (first number is overall)
        if (jPercentFilter) {
          const overallPercent = segments[0];
          if (overallPercent < jPercentFilter[0] || overallPercent > jPercentFilter[1]) {
            return false;
          }
        }
        
        // Check minimum segment percentage (skip first number as it's the overall)
        if (jMinSegmentPercent > 0) {
          // Check all segments except the overall percentage
          return segments.slice(1).every(percent => percent >= jMinSegmentPercent);
        }
        return true;
      });
    }

    // Apply F% filter
    if (fPercentFilter || fMinSegmentPercent > 0) {
      const netField = selectedDays === 60 ? 'Fnet' : `FT${selectedDays}net`;
      data = data.filter(route => {
        const value = route[netField];
        if (!value) return false;
        // Extract all numbers from the percentage string, including those in parentheses
        const matches = value.match(/-?\d+/g);
        if (!matches) return false;
        const segments = matches.map(num => parseInt(num));
        
        // Check range filter if active (first number is overall)
        if (fPercentFilter) {
          const overallPercent = segments[0];
          if (overallPercent < fPercentFilter[0] || overallPercent > fPercentFilter[1]) {
            return false;
          }
        }
        
        // Check minimum segment percentage (skip first number as it's the overall)
        if (fMinSegmentPercent > 0) {
          // Check all segments except the overall percentage
          return segments.slice(1).every(percent => percent >= fMinSegmentPercent);
        }
        return true;
      });
    }

    // Apply sorting if there's a sort field
    if (pagination?.sortField && pagination?.sortOrder) {
      console.log('Applying sort:', { field: pagination.sortField, order: pagination.sortOrder });
      data.sort((a, b) => {
        const aValue = a[pagination.sortField];
        const bValue = b[pagination.sortField];
        
        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;
        if (aValue === bValue) return 0;
        
        // Convert to numbers for comparison
        const aNum = parseFloat(aValue);
        const bNum = parseFloat(bValue);
        
        // If both values are valid numbers, use numeric comparison
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return pagination.sortOrder === 'ascend' ? aNum - bNum : bNum - aNum;
        }
        
        // Fall back to string comparison for non-numeric values
        const comparison = String(aValue).localeCompare(String(bValue));
        return pagination.sortOrder === 'ascend' ? comparison : -comparison;
      });
      console.log('After sorting - First few rows:', data.slice(0, 3).map(r => ({
        route: `${r.departure}-${r.arrival}`,
        value: r[pagination.sortField]
      })));
    }

    return data;
  };

  // Get filtered data once to use in multiple places
  const filteredData = getFilteredData();
  
  // Reset to first page when search text changes
  // Using useRef to prevent infinite loops with the onTableChange callback
  const previousSearchText = React.useRef(tableSearchText);
  
  // Reset to first page when days selection changes, but preserve sorting
  useEffect(() => {
    if (onTableChange && pagination) {
      console.log('=== Days Change Effect ===');
      console.log('Previous days:', previousDays.current);
      console.log('New days:', selectedDays);
      console.log('Current sorting:', { field: pagination.sortField, order: pagination.sortOrder });
      
      // Set loading state immediately
      setIsDaysChanging(true);
      
      // Delay the data remapping by 0.2s
      setTimeout(() => {
        // Map the sort field to the new day selection
        const mappedField = mapSortField(pagination.sortField, previousDays.current, selectedDays);
        const newSorter = mappedField ? { field: mappedField, order: pagination.sortOrder } : null;
        
        console.log('Mapped field:', mappedField);
        console.log('New sorter being applied:', newSorter);
        
        // Update the previous days value first
        previousDays.current = selectedDays;
        
        // Then trigger the table change with the new sorting
        onTableChange(
          { ...pagination, current: 1 }, 
          pagination.filters,
          newSorter
        );

        // Clear loading state after a short delay to ensure smooth transition
        setTimeout(() => {
          setIsDaysChanging(false);
        }, 100);
      }, 200);
      
      console.log('=== End Days Change Effect ===');
    }
  }, [selectedDays]);

  // Add reset filters function
  const resetAllFilters = () => {
    setConnectionFilter({ mode: 'include', airports: [] });
    setStopsFilter([]);
    setDistanceFilter(null);
    setYPercentFilter(null);
    setJPercentFilter(null);
    setFPercentFilter(null);
    setYMinSegmentPercent(0);
    setJMinSegmentPercent(0);
    setFMinSegmentPercent(0);
    setTableSearchText('');
    setOtherFilters({ filterNonAvailability: false });
  };

  // Add effect to reset filters when searchResults changes
  useEffect(() => {
    resetAllFilters();
  }, [searchResults]);

  // Handle search text changes and reset filters
  const handleSearchTextChange = (value) => {
    // Update the search text state without resetting other filters
    setTableSearchText(value);
    
    // Reset to first page while preserving sort and existing filters
    if (onTableChange && pagination) {
      setTimeout(() => {
        onTableChange(
          { ...pagination, current: 1 },
          pagination.filters,
          { field: pagination.sortField, order: pagination.sortOrder }
        );
      }, 0);
    }
  };

  // Log table props before render
  console.log('=== Table Props ===');
  console.log('Sorting props:', {
    defaultSortOrder: pagination.sortOrder,
    sortOrder: pagination.sortOrder,
    sortField: pagination.sortField
  });
  console.log('Pagination:', pagination);
  console.log('Filtered data length:', filteredData.length);
  console.log('=== End Table Props ===');

  const renderConnectionsDropdown = () => {
    // Create a map of IATA codes to airport names
    const airportMap = new Map(airports.map(airport => [airport.IATA, airport.Name]));

    const filteredAirports = uniqueAirports.filter(airport => {
      const airportName = airportMap.get(airport) || '';
      return airport.toLowerCase().includes(airportSearchText.toLowerCase()) ||
             airportName.toLowerCase().includes(airportSearchText.toLowerCase());
    });

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
            value={connectionFilter.mode}
            onChange={e => setConnectionFilter(prev => ({ ...prev, mode: e.target.value }))}
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
            placeholder="Search airports..."
            value={airportSearchText}
            onChange={e => setAirportSearchText(e.target.value)}
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
          {filteredAirports.map(airport => (
            <div 
              key={airport} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <Checkbox
                checked={connectionFilter.airports.includes(airport)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setConnectionFilter(prev => ({
                    ...prev,
                    airports: isChecked 
                      ? [...prev.airports, airport]
                      : prev.airports.filter(a => a !== airport)
                  }));
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 500 }}>{airport}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {airportMap.get(airport) || ''}
                  </span>
                </div>
              </Checkbox>
            </div>
          ))}
          {filteredAirports.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No airports found
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStopsDropdown = () => {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '8px 0',
        width: '200px'
      }}>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {uniqueStops.map(stops => (
            <div 
              key={stops} 
              style={{ 
                padding: '4px 12px',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: '#f5f5f5'
                }
              }}
            >
              <Checkbox
                checked={stopsFilter.includes(stops)}
                onChange={e => {
                  const isChecked = e.target.checked;
                  setStopsFilter(prev => 
                    isChecked 
                      ? [...prev, stops]
                      : prev.filter(s => s !== stops)
                  );
                }}
              >
                {stops === 0 ? 'Direct' : `${stops} ${stops === 1 ? 'Stop' : 'Stops'}`}
              </Checkbox>
            </div>
          ))}
          {uniqueStops.length === 0 && (
            <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
              No options available
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDistanceDropdown = () => {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '12px 16px',
        width: '320px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Distance Range (miles)</span>
            <Button 
              type="link" 
              size="small" 
              onClick={() => setDistanceFilter(null)}
              style={{ padding: 0 }}
            >
              Reset
            </Button>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <Input
              size="small"
              value={distanceFilter ? distanceFilter[0].toLocaleString() : distanceRange[0].toLocaleString()}
              onChange={e => {
                const value = parseInt(e.target.value.replace(/,/g, ''));
                if (!isNaN(value)) {
                  setDistanceFilter(prev => [
                    value,
                    prev ? prev[1] : distanceRange[1]
                  ]);
                }
              }}
              style={{ width: '100px' }}
            />
            <span style={{ color: '#999' }}>to</span>
            <Input
              size="small"
              value={distanceFilter ? distanceFilter[1].toLocaleString() : distanceRange[1].toLocaleString()}
              onChange={e => {
                const value = parseInt(e.target.value.replace(/,/g, ''));
                if (!isNaN(value)) {
                  setDistanceFilter(prev => [
                    prev ? prev[0] : distanceRange[0],
                    value
                  ]);
                }
              }}
              style={{ width: '100px' }}
            />
          </div>
          <Slider
            range
            min={distanceRange[0]}
            max={distanceRange[1]}
            value={distanceFilter || distanceRange}
            onChange={value => setDistanceFilter(value)}
            tipFormatter={value => value.toLocaleString()}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    );
  };

  const renderPercentDropdown = (title, filter, setFilter, minSegmentPercent, setMinSegmentPercent) => {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '12px 16px',
        width: '320px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{title} Range (%)</span>
            <Button 
              type="link" 
              size="small" 
              onClick={() => {
                setFilter(null);
                setMinSegmentPercent(0);
              }}
              style={{ padding: 0 }}
            >
              Reset
            </Button>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <Input
              size="small"
              value={filter ? filter[0] : 0}
              onChange={e => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  setFilter(prev => [
                    value,
                    prev ? prev[1] : 100
                  ]);
                }
              }}
              style={{ width: '100px' }}
            />
            <span style={{ color: '#999' }}>to</span>
            <Input
              size="small"
              value={filter ? filter[1] : 100}
              onChange={e => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  setFilter(prev => [
                    prev ? prev[0] : 0,
                    value
                  ]);
                }
              }}
              style={{ width: '100px' }}
            />
          </div>
          <Slider
            range
            min={0}
            max={100}
            value={filter || [0, 100]}
            onChange={value => setFilter(value)}
            style={{ width: '100%', marginBottom: '16px' }}
          />
          <div style={{ 
            borderTop: '1px solid #f0f0f0',
            paddingTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>No segment below</span>
            <Input
              size="small"
              type="number"
              min={0}
              max={100}
              value={minSegmentPercent}
              onChange={e => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 0 && value <= 100) {
                  setMinSegmentPercent(value);
                }
              }}
              addonAfter="%"
              style={{ width: '100px' }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderOtherDropdown = () => {
    return (
      <div style={{ 
        backgroundColor: 'white', 
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        padding: '12px 16px',
        width: '320px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Other Filters</span>
            <Button 
              type="link" 
              size="small" 
              onClick={() => setOtherFilters({ filterNonAvailability: false })}
              style={{ padding: 0 }}
            >
              Reset
            </Button>
          </div>
          <Checkbox
            checked={otherFilters.filterNonAvailability}
            onChange={e => setOtherFilters(prev => ({ ...prev, filterNonAvailability: e.target.checked }))}
          >
            Filter segments with no availability
          </Checkbox>
        </div>
      </div>
    );
  };

  return (
    <Card 
      className="results-card" 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>Search Results</span>
            <Radio.Group 
              value={selectedDays} 
              onChange={e => {
                console.log('Changing days from', selectedDays, 'to', e.target.value);
                console.log('Current sorting:', { field: pagination.sortField, order: pagination.sortOrder });
                setSelectedDays(e.target.value);
              }}
              size="small"
              optionType="button"
              buttonStyle="solid"
              disabled={isDaysChanging}
              style={{ 
                '--radio-button-checked-bg': '#000000',
                '--radio-button-checked-color': '#ffffff',
              }}
            >
              <Radio.Button value={3}>T-3</Radio.Button>
              <Radio.Button value={7}>T-7</Radio.Button>
              <Radio.Button value={14}>T-14</Radio.Button>
              <Radio.Button value={28}>T-28</Radio.Button>
              <Radio.Button value={60}>T-60</Radio.Button>
            </Radio.Group>
            <Dropdown 
              dropdownRender={renderConnectionsDropdown}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={connectionFilter.airports.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: connectionFilter.airports.length > 0 ? 600 : 400
                }}
              >
                Connections {connectionFilter.airports.length > 0 && `(${connectionFilter.airports.length})`}
              </Button>
            </Dropdown>
            <Dropdown 
              dropdownRender={renderStopsDropdown}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={stopsFilter.length > 0 ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: stopsFilter.length > 0 ? 600 : 400
                }}
              >
                Stops {stopsFilter.length > 0 && `(${stopsFilter.length})`}
              </Button>
            </Dropdown>
            <Dropdown 
              dropdownRender={renderDistanceDropdown}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={distanceFilter ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: distanceFilter ? 600 : 400
                }}
              >
                Distance
              </Button>
            </Dropdown>
            <Dropdown 
              dropdownRender={() => renderPercentDropdown('Y%', yPercentFilter, setYPercentFilter, yMinSegmentPercent, setYMinSegmentPercent)}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={(yPercentFilter || yMinSegmentPercent > 0) ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: (yPercentFilter || yMinSegmentPercent > 0) ? 600 : 400
                }}
              >
                Y%
              </Button>
            </Dropdown>
            <Dropdown 
              dropdownRender={() => renderPercentDropdown('J%', jPercentFilter, setJPercentFilter, jMinSegmentPercent, setJMinSegmentPercent)}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={(jPercentFilter || jMinSegmentPercent > 0) ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: (jPercentFilter || jMinSegmentPercent > 0) ? 600 : 400
                }}
              >
                J%
              </Button>
            </Dropdown>
            <Dropdown 
              dropdownRender={() => renderPercentDropdown('F%', fPercentFilter, setFPercentFilter, fMinSegmentPercent, setFMinSegmentPercent)}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={(fPercentFilter || fMinSegmentPercent > 0) ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: (fPercentFilter || fMinSegmentPercent > 0) ? 600 : 400
                }}
              >
                F%
              </Button>
            </Dropdown>
            <Dropdown 
              dropdownRender={renderOtherDropdown}
              trigger={['click']}
              disabled={isDaysChanging}
            >
              <Button 
                type={Object.values(otherFilters).some(v => v) ? "primary" : "default"}
                size="small"
                icon={<DownOutlined />}
                style={{ 
                  fontWeight: Object.values(otherFilters).some(v => v) ? 600 : 400
                }}
              >
                Other
              </Button>
            </Dropdown>
          </div>
          <Input
            placeholder="Search routes..."
            value={tableSearchText}
            onChange={e => handleSearchTextChange(e.target.value)}
            style={{ 
              width: 200,
              borderColor: tableSearchText ? '#000000' : undefined,
            }}
            allowClear
            disabled={isDaysChanging}
            onPressEnter={(e) => {
              // Reapply the search to ensure it's processed
              handleSearchTextChange(e.target.value);
            }}
          />
        </div>
      }
      style={{ 
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
        marginTop: 24
      }}
    >
      <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
        <Table
          dataSource={filteredData}
          columns={getResultColumns(onRouteSelect, selectedDays, pagination.sortField, pagination.sortOrder)}
          rowKey={(record, index) => index}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total, range) => {
              // Ensure range doesn't exceed total
              const adjustedEnd = Math.min(range[1], total);
              const adjustedStart = total === 0 ? 0 : range[0];
              return `${adjustedStart}-${adjustedEnd} of ${total} routes`;
            },
            pageSizeOptions: ['10', '25', '50', '100'],
            defaultPageSize: 25,
            total: filteredData.length,
          }}
          loading={isLoading || isDaysChanging}
          onChange={onTableChange}
          scroll={{ x: true }}
          showSorterTooltip={true}
          style={{ width: '100%' }}
          locale={{
            emptyText: (
              <div style={{ padding: '16px 0', width: '100%' }}>
                No results found
              </div>
            )
          }}
          defaultSortOrder={pagination.sortOrder}
          sortOrder={pagination.sortOrder}
          sortField={pagination.sortField}
        />
      </div>

      <style jsx>{`
        .table-container {
          display: block;
          width: 100%;
          overflow-x: auto;
        }
        :global(.ant-table) {
          max-width: 100%;
        }
        :global(.ant-table-container) {
          width: 100%;
        }
        :global(.ant-table-content) {
          overflow-x: auto;
        }
        :global(.ant-spin-nested-loading) {
          overflow-x: auto;
        }
        :global(.ant-spin-container) {
          overflow-x: auto;
        }
        :global(.ant-table-tbody > tr) {
          transition: all 0.3s ease-in-out;
        }
        :global(.ant-table-tbody > tr:hover > td) {
          background: #f5f5f5;
          transition: background-color 0.3s ease-in-out;
        }
        :global(.ant-table-thead > tr > th) {
          transition: background-color 0.3s ease-in-out;
        }
        :global(.ant-table-thead > tr > th:hover) {
          background: #fafafa;
        }
        :global(.ant-card-body) {
          padding: 12px;
          max-width: 100%;
          overflow-x: auto;
        }
        :global(.ant-table-wrapper) {
          width: 100%;
        }
        :global(.ant-table-empty .ant-table-content) {
          min-width: 1600px;
        }
        :global(.ant-table-placeholder) {
          min-width: 1600px;
        }
        :global(.ant-empty-normal) {
          margin: 32px 0;
        }
      `}</style>
    </Card>
  );
};

export default ResultsTable; 