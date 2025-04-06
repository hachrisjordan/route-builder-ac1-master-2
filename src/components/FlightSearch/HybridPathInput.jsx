import React, { useState, useRef, useEffect } from 'react';
import { Select, Input } from 'antd';
import { airports } from './data/airports';
import { airportGroups, airportGroupDescriptions } from './data/airportGroups';

// Create options for airport groups with descriptions
const airportGroupOptions = Object.entries(airportGroups).map(([code]) => ({
  value: code,
  label: `${airportGroupDescriptions[code]}`,
  isGroup: true
}));

const HybridPathInput = ({ value, onChange, placeholder = 'Enter path (e.g. NRT/HND-OAK/SFO-JFK/EWR)' }) => {
  const [displayValue, setDisplayValue] = useState('');
  const [inputValue, setInputValue] = useState(value || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentSearch, setCurrentSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [completedSegments, setCompletedSegments] = useState([]);
  const inputRef = useRef(null);

  // Convert airports data to options format
  const airportOptions = [
    ...airportGroupOptions,
    ...airports.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.Name} (${airport.Country})`,
      isGroup: false
    }))
  ];

  // Filter airports based on current search
  const filteredOptions = airportOptions.filter(option => {
    if (!currentSearch) return false; // Don't show options if no search
    
    const searchText = currentSearch.toUpperCase();
    const value = option.value;
    
    // For airport groups, only show exact matches or starts with
    if (option.isGroup) {
      return value === searchText || value.startsWith(searchText);
    }
    
    // For airports, must start with the search text
    return value.startsWith(searchText);
  }).sort((a, b) => {
    // Sort exact matches first
    const searchUpper = currentSearch.toUpperCase();
    if (a.value === searchUpper) return -1;
    if (b.value === searchUpper) return 1;
    
    // Then sort groups before individual airports
    if (a.isGroup && !b.isGroup) return -1;
    if (!a.isGroup && b.isGroup) return 1;
    
    // Then sort by code length
    if (a.value.length !== b.value.length) {
      return a.value.length - b.value.length;
    }
    
    // Finally sort alphabetically
    return a.value.localeCompare(b.value);
  });

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase(); // Convert to uppercase for airport codes
    setDisplayValue(newValue);
    setCurrentSearch(newValue);
    setShowDropdown(newValue.length > 0); // Show dropdown as soon as user starts typing
  };

  // Handle airport selection
  const handleSelect = (selectedValue) => {
    // Check if it's an airport group
    if (airportGroups[selectedValue]) {
      // For groups, add the group code as a single segment but use expanded airports as the value
      const expandedAirports = airportGroups[selectedValue];
      const newSegments = [
        ...completedSegments,
        { 
          type: 'airport', 
          value: selectedValue,
          expandedValue: expandedAirports // Store the expanded airports
        }
      ];
      
      // Build the display value using the group code
      let displayString = '';
      newSegments.forEach(segment => {
        displayString += segment.value;
      });
      
      setInputValue(displayString); // Set input value to show group codes
      setDisplayValue('');
      setCompletedSegments(newSegments);
      setShowDropdown(false);
      
      // Pass the displayString (with group codes) to parent instead of expanded airports
      onChange?.(displayString);
    } else {
      // Regular airport selection
      const newSegments = [...completedSegments, { type: 'airport', value: selectedValue }];
      
      let newValue = '';
      newSegments.forEach(segment => {
        newValue += segment.value;
      });
      
      setInputValue(newValue);
      setDisplayValue('');
      setCompletedSegments(newSegments);
      setShowDropdown(false);
      onChange?.(newValue);
    }
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Handle select and add separator in one step
  const handleSelectAndAddSeparator = (selectedValue, separator) => {
    // First do the selection - similar to handleSelect but with some adjustments
    let newValue = '';
    
    if (airportGroups[selectedValue]) {
      // For groups, add the group code
      const newSegments = [
        ...completedSegments,
        { 
          type: 'airport', 
          value: selectedValue,
          expandedValue: airportGroups[selectedValue]
        }
      ];
      
      // Build the new value
      newSegments.forEach(segment => {
        newValue += segment.value;
      });
      
      // Now add the separator
      newValue += separator;
      
      // Add the separator to segments
      newSegments.push({ type: 'separator', value: separator });
      
      setInputValue(newValue);
      setDisplayValue('');
      setCompletedSegments(newSegments);
      setShowDropdown(false);
      onChange?.(newValue);
    } else {
      // Regular airport selection
      const newSegments = [
        ...completedSegments, 
        { type: 'airport', value: selectedValue },
        { type: 'separator', value: separator }
      ];
      
      // Build the new value
      newSegments.forEach(segment => {
        newValue += segment.value;
      });
      
      setInputValue(newValue);
      setDisplayValue('');
      setCompletedSegments(newSegments);
      setShowDropdown(false);
      onChange?.(newValue);
    }
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Update completed segments when input changes
  useEffect(() => {
    const segments = [];
    let currentSegment = '';
    let i = 0;
    
    while (i < inputValue.length) {
      if (inputValue[i] === '/' || inputValue[i] === '-') {
        if (currentSegment) {
          // Check if this is a known group code
          const isGroup = Object.keys(airportGroups).includes(currentSegment);
          segments.push({ 
            type: 'airport', 
            value: currentSegment,
            expandedValue: isGroup ? airportGroups[currentSegment] : undefined
          });
        }
        segments.push({ type: 'separator', value: inputValue[i] });
        currentSegment = '';
      } else {
        currentSegment += inputValue[i];
      }
      i++;
    }
    
    // Don't add the current typing segment to completed segments
    if (currentSegment && !displayValue) {
      const isGroup = Object.keys(airportGroups).includes(currentSegment);
      segments.push({ 
        type: 'airport', 
        value: currentSegment,
        expandedValue: isGroup ? airportGroups[currentSegment] : undefined
      });
    }
    
    setCompletedSegments(segments);
    
    // Generate the final value using the unexpanded group codes
    // This ensures we always send the path with group codes to the search function
    if (segments.length > 0 && !displayValue) {
      let pathWithGroupCodes = '';
      segments.forEach(segment => {
        pathWithGroupCodes += segment.value;
      });
      
      // Only trigger onChange if the path has actually changed
      if (pathWithGroupCodes !== value) {
        onChange?.(pathWithGroupCodes);
      }
    }
  }, [inputValue, displayValue, value, onChange]);

  // Handle key down
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission but don't auto-select
    } else if (e.key === 'Tab' && showDropdown && filteredOptions.length > 0) {
      e.preventDefault(); // Prevent default tab behavior
      handleSelect(filteredOptions[0].value); // Select first option
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else if (e.key === 'Backspace' && !displayValue) {
      e.preventDefault();
      // If there are completed segments, remove the last one
      if (completedSegments.length > 0) {
        const newSegments = completedSegments.slice(0, -1);
        let newValue = '';
        newSegments.forEach(segment => {
          newValue += segment.value;
        });
        setInputValue(newValue);
        setCompletedSegments(newSegments);
        onChange?.(newValue);
      }
    } else if (['-', '/'].includes(e.key)) {
      e.preventDefault();
      
      // If there's text being typed and there are suggestions, select the first one and add separator
      if (displayValue && filteredOptions.length > 0) {
        handleSelectAndAddSeparator(filteredOptions[0].value, e.key);
      } else if (!displayValue) {
        // Original behavior if no text is being typed
        const separator = e.key;
        let newValue = inputValue + separator;
        setInputValue(newValue);
        onChange?.(newValue);
      }
    }
  };

  // Handle blur
  const handleBlur = () => {
    // Delay hiding dropdown to allow for selection
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  // Handle focus
  const handleFocus = () => {
    if (currentSearch) {
      setShowDropdown(true);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ 
        minHeight: '32px',
        padding: '4px 11px',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '4px'
      }}>
        {completedSegments.map((segment, index) => {
          if (segment.type === 'separator') {
            return (
              <span key={index} style={{ 
                margin: '0 4px',
                color: '#666',
                fontWeight: 'normal'
              }}>
                {segment.value}
              </span>
            );
          } else {
            const isGroup = segment.expandedValue !== undefined;
            return (
              <span
                key={index}
                style={{
                  display: 'inline-block',
                  backgroundColor: isGroup ? '#e6f4ff' : '#f0f0f0',
                  border: `1px solid ${isGroup ? '#91caff' : '#d9d9d9'}`,
                  borderRadius: '4px',
                  padding: '2px 8px',
                  margin: '0 2px',
                  fontSize: '14px',
                  fontWeight: isGroup ? '600' : '500',
                  color: isGroup ? '#0958d9' : '#262626',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
                title={isGroup ? `Expands to: ${segment.expandedValue}` : undefined}
              >
                {segment.value}
              </span>
            );
          }
        })}
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          style={{ 
            border: 'none',
            padding: '0',
            flex: '1',
            minWidth: '100px',
            outline: 'none',
            boxShadow: 'none'
          }}
        />
      </div>
      
      {showDropdown && filteredOptions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxHeight: '300px',
            overflow: 'auto',
            marginTop: '4px'
          }}
        >
          {filteredOptions.map(option => (
            <div
              key={option.value}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: option.isGroup ? '#f6f6f6' : 'white',
                ':hover': {
                  backgroundColor: option.isGroup ? '#f0f0f0' : '#f5f5f5'
                }
              }}
              onMouseDown={() => handleSelect(option.value)}
            >
              <div style={{ fontWeight: option.isGroup ? 600 : 500 }}>{option.value}</div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666',
                marginTop: option.isGroup ? '4px' : '2px'
              }}>
                {option.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HybridPathInput; 