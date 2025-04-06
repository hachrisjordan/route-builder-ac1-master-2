import React from 'react';
import { Radio, Input, Checkbox, Tooltip, Button, Divider } from 'antd';
import { isValidSegmentForRoute } from './flightUtils';
import { airportGroups } from '../data/airportGroups';

// Helper function to expand an airport group into individual airports
const expandAirportGroup = (groupCode) => {
  return airportGroups[groupCode]?.split('/') || [groupCode];
};

// Render origin filter dropdown for group-based filter
export const renderOriginDropdown = (filterId, groupFilters, setGroupFilters, originSearchText, setOriginSearchText, groupFilterOptions) => {
  const currentFilter = groupFilters[filterId] || { originFilter: { mode: 'include', airports: [] } };
  
  // Separate options into groups and individual airports
  const groupOptions = groupFilterOptions.originOptions.filter(option => option.isGroup);
  const airportOptions = groupFilterOptions.originOptions.filter(option => !option.isGroup);
  
  // Filter options based on search text
  const filterBySearchText = (option) => 
    option.code.toLowerCase().includes(originSearchText.toLowerCase()) ||
    option.name.toLowerCase().includes(originSearchText.toLowerCase());
  
  const filteredGroupOptions = groupOptions.filter(filterBySearchText);
  const filteredAirportOptions = airportOptions.filter(filterBySearchText);

  // Check if all airports in a group are selected
  const isGroupFullySelected = (groupCode) => {
    const airports = expandAirportGroup(groupCode);
    return airports.every(airport => currentFilter.originFilter.airports.includes(airport));
  };
  
  // Check if any airports in a group are selected
  const isGroupPartiallySelected = (groupCode) => {
    const airports = expandAirportGroup(groupCode);
    return airports.some(airport => currentFilter.originFilter.airports.includes(airport)) && 
           !isGroupFullySelected(groupCode);
  };
  
  // Handle select/deselect all airports in a group
  const toggleGroupSelection = (groupCode, isSelected) => {
    const airports = expandAirportGroup(groupCode);
    
    setGroupFilters(prev => {
      const currentAirports = prev[filterId]?.originFilter?.airports || [];
      
      // Remove all airports from this group
      const filteredAirports = currentAirports.filter(airport => !airports.includes(airport));
      
      // Add all airports if selecting, or leave filtered if deselecting
      const newAirports = isSelected ? [...filteredAirports, ...airports] : filteredAirports;
      
      return {
        ...prev,
        [filterId]: {
          ...prev[filterId],
          originFilter: {
            ...prev[filterId].originFilter,
            airports: newAirports
          }
        }
      };
    });
  };

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
      
      {/* Airport Groups Section */}
      {filteredGroupOptions.length > 0 && (
        <div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold', fontSize: '13px' }}>
            Airport Groups
          </div>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            padding: '8px 0'
          }}>
            {filteredGroupOptions.map(option => (
              <div 
                key={option.code} 
                style={{ 
                  padding: '4px 12px',
                  cursor: 'pointer',
                  backgroundColor: isGroupFullySelected(option.code) ? '#f0f8ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Checkbox
                    checked={isGroupFullySelected(option.code)}
                    indeterminate={isGroupPartiallySelected(option.code)}
                    onChange={e => toggleGroupSelection(option.code, e.target.checked)}
                  >
                    <span style={{ fontWeight: 500 }}>{option.code}</span>
                  </Checkbox>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    flex: 1,
                    marginLeft: '4px'
                  }}>
                    {option.name}
                  </span>
                </div>
                <div style={{ marginLeft: '25px', fontSize: '12px', color: '#888' }}>
                  {option.expanded}
                </div>
              </div>
            ))}
          </div>
          <Divider style={{ margin: '4px 0' }} />
        </div>
      )}
      
      {/* Individual Airports Section */}
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredAirportOptions.map(option => (
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
                <span style={{ fontWeight: 500 }}>{option.name}</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis' 
                }}>
                  {option.iata}
                </span>
              </div>
            </Checkbox>
          </div>
        ))}
        {filteredAirportOptions.length === 0 && filteredGroupOptions.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No options found
          </div>
        )}
      </div>
    </div>
  );
};

// Render destination filter dropdown for group-based filter
export const renderDestDropdown = (filterId, groupFilters, setGroupFilters, destSearchText, setDestSearchText, groupFilterOptions) => {
  const currentFilter = groupFilters[filterId] || { destFilter: { mode: 'include', airports: [] } };
  
  // Separate options into groups and individual airports
  const groupOptions = groupFilterOptions.destOptions.filter(option => option.isGroup);
  const airportOptions = groupFilterOptions.destOptions.filter(option => !option.isGroup);
  
  // Filter options based on search text
  const filterBySearchText = (option) => 
    option.code.toLowerCase().includes(destSearchText.toLowerCase()) ||
    option.name.toLowerCase().includes(destSearchText.toLowerCase());
  
  const filteredGroupOptions = groupOptions.filter(filterBySearchText);
  const filteredAirportOptions = airportOptions.filter(filterBySearchText);

  // Check if all airports in a group are selected
  const isGroupFullySelected = (groupCode) => {
    const airports = expandAirportGroup(groupCode);
    return airports.every(airport => currentFilter.destFilter.airports.includes(airport));
  };
  
  // Check if any airports in a group are selected
  const isGroupPartiallySelected = (groupCode) => {
    const airports = expandAirportGroup(groupCode);
    return airports.some(airport => currentFilter.destFilter.airports.includes(airport)) && 
           !isGroupFullySelected(groupCode);
  };
  
  // Handle select/deselect all airports in a group
  const toggleGroupSelection = (groupCode, isSelected) => {
    const airports = expandAirportGroup(groupCode);
    
    setGroupFilters(prev => {
      const currentAirports = prev[filterId]?.destFilter?.airports || [];
      
      // Remove all airports from this group
      const filteredAirports = currentAirports.filter(airport => !airports.includes(airport));
      
      // Add all airports if selecting, or leave filtered if deselecting
      const newAirports = isSelected ? [...filteredAirports, ...airports] : filteredAirports;
      
      return {
        ...prev,
        [filterId]: {
          ...prev[filterId],
          destFilter: {
            ...prev[filterId].destFilter,
            airports: newAirports
          }
        }
      };
    });
  };

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
      
      {/* Airport Groups Section */}
      {filteredGroupOptions.length > 0 && (
        <div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', fontWeight: 'bold', fontSize: '13px' }}>
            Airport Groups
          </div>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto',
            padding: '8px 0'
          }}>
            {filteredGroupOptions.map(option => (
              <div 
                key={option.code} 
                style={{ 
                  padding: '4px 12px',
                  cursor: 'pointer',
                  backgroundColor: isGroupFullySelected(option.code) ? '#f0f8ff' : 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                  <Checkbox
                    checked={isGroupFullySelected(option.code)}
                    indeterminate={isGroupPartiallySelected(option.code)}
                    onChange={e => toggleGroupSelection(option.code, e.target.checked)}
                  >
                    <span style={{ fontWeight: 500 }}>{option.code}</span>
                  </Checkbox>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    flex: 1,
                    marginLeft: '4px'
                  }}>
                    {option.name}
                  </span>
                </div>
                <div style={{ marginLeft: '25px', fontSize: '12px', color: '#888' }}>
                  {option.expanded}
                </div>
              </div>
            ))}
          </div>
          <Divider style={{ margin: '4px 0' }} />
        </div>
      )}
      
      {/* Individual Airports Section */}
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {filteredAirportOptions.map(option => (
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
                <span style={{ fontWeight: 500 }}>{option.name}</span>
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis' 
                }}>
                  {option.iata}
                </span>
              </div>
            </Checkbox>
          </div>
        ))}
        {filteredAirportOptions.length === 0 && filteredGroupOptions.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No options found
          </div>
        )}
      </div>
    </div>
  );
};

// Simplified segment dropdown (no reordering, include only)
export const renderSegmentsDropdownSimple = (filterId, segmentFilters, setSegmentFilters, segmentSearchText, setSegmentSearchText, uniqueSegments, currentRoute) => {
  const currentFilter = segmentFilters[filterId] || { segments: [] };
  
  // Add logging to help debug why invalid segments might be showing
  console.log('[DEBUG] renderSegmentsDropdownSimple uniqueSegments:', uniqueSegments);
  console.log('[DEBUG] renderSegmentsDropdownSimple currentRoute:', currentRoute);
  
  // Filter segments based on search text
  const displaySegments = uniqueSegments.filter(segment => 
    segment.toLowerCase().includes(segmentSearchText.toLowerCase())
  );
  
  console.log('[DEBUG] renderSegmentsDropdownSimple displaySegments after filtering:', displaySegments);

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
        {displaySegments.map(segment => (
          <div 
            key={segment} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer'
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
                      ? [...(prev[filterId]?.segments || []), segment]
                      : (prev[filterId]?.segments || []).filter(s => s !== segment)
                  }
                }));
              }}
            >
              {segment}
            </Checkbox>
          </div>
        ))}
        {displaySegments.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No valid segments found
          </div>
        )}
      </div>
    </div>
  );
}; 