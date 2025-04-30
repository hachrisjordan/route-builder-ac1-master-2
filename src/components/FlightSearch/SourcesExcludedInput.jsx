import React, { useState } from 'react';
import { Select, Tag, Radio } from 'antd';
import { sources } from './data/sources';
import './SourcesExcludedInput.css';

const SourcesInput = ({ value = [], onChange, defaultMode = 'include' }) => {
  const [mode, setMode] = useState(defaultMode);

  // Convert sources array to options format for Select
  const sourceOptions = sources.map(source => ({
    value: source.codename,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
        <img
          src={`/${source.iata}.png`}
          alt={source.iata}
          style={{ 
            width: '24px', 
            height: '24px', 
            marginRight: '8px',
            objectFit: 'contain',
            borderRadius: '4px'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 'bold' }}>{source.airline}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {source.ffname}
          </span>
        </div>
      </div>
    ),
    data: source
  }));

  const handleChange = (selectedValues) => {
    onChange?.({ mode, sources: selectedValues });
  };

  const handleModeChange = (e) => {
    const newMode = e.target.value;
    setMode(newMode);
    // Update parent with current selection and new mode
    onChange?.({ mode: newMode, sources: value });
  };

  // Custom filter function to match AC Route Builder behavior
  const filterOption = (input, option) => {
    if (!input) return true;
    
    const code = String(option.value || '').toLowerCase();
    const label = String(option.label || '').toLowerCase();
    
    return code.includes(input) || label.includes(input);
  };

  // Custom sort function to match AC Route Builder behavior
  const sortOptions = (optionA, optionB, inputValue) => {
    // Handle case when inputValue is undefined or null - sort by airline name
    if (!inputValue) {
      const airlineA = optionA.data.airline.toLowerCase();
      const airlineB = optionB.data.airline.toLowerCase();
      return airlineA.localeCompare(airlineB);
    }
    
    // Ensure inputValue is a string
    const input = String(inputValue).toLowerCase();
    const codeA = String(optionA.value || '').toLowerCase();
    const codeB = String(optionB.value || '').toLowerCase();
    
    let scoreA = 0;
    let scoreB = 0;
    
    // Priority 1 (Highest): Airline code exactly matches input
    if (codeA === input) scoreA = 1000;
    if (codeB === input) scoreB = 1000;
    
    // Priority 2: Airline code starts with input
    if (codeA.startsWith(input) && codeA !== input) scoreA = 500;
    if (codeB.startsWith(input) && codeB !== input) scoreB = 500;
    
    // Priority 3: Airline code contains input
    if (codeA.includes(input) && !codeA.startsWith(input)) scoreA = 200;
    if (codeB.includes(input) && !codeB.startsWith(input)) scoreB = 200;
    
    // Priority 4: Label contains input
    const labelA = String(optionA.label || '').toLowerCase();
    const labelB = String(optionB.label || '').toLowerCase();
    
    if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
    if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    
    // If scores are equal, sort by airline name
    const airlineA = optionA.data.airline.toLowerCase();
    const airlineB = optionB.data.airline.toLowerCase();
    return airlineA.localeCompare(airlineB);
  };

  return (
    <Select
      mode="multiple"
      allowClear
      style={{ width: '100%' }}
      placeholder={`Select sources to ${mode}`}
      value={value}
      onChange={handleChange}
      options={sourceOptions}
      filterOption={filterOption}
      filterSort={sortOptions}
      optionFilterProp="children"
      virtual={false}
      menuItemSelectedIcon={null}
      dropdownRender={(menu) => (
        <div style={{ maxHeight: '400px', overflow: 'hidden' }}>
          <div style={{ 
            padding: '8px', 
            borderBottom: '1px solid #f0f0f0'
          }}>
            <Radio.Group
              value={mode}
              onChange={handleModeChange}
              style={{ 
                display: 'flex', 
                gap: '8px'
              }}
            >
              <Radio.Button 
                value="include" 
                style={{ 
                  flex: 1, 
                  textAlign: 'center'
                }}
              >
                Include
              </Radio.Button>
              <Radio.Button 
                value="exclude" 
                style={{ 
                  flex: 1, 
                  textAlign: 'center'
                }}
              >
                Exclude
              </Radio.Button>
            </Radio.Group>
          </div>
          <div style={{ maxHeight: 'calc(400px - 48px)', overflowY: 'auto' }}>
            {menu}
          </div>
        </div>
      )}
      dropdownStyle={{ 
        padding: '0',
        boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
        borderRadius: '8px',
        zIndex: 1050
      }}
      className="sources-excluded-select"
      tagRender={(props) => {
        const { label, value, closable, onClose } = props;
        const source = sources.find(s => s.codename === value);
        if (!source) return null;
        
        return (
          <Tag
            color="#ffffff"
            closable={closable}
            onClose={onClose}
            closeIcon={<span style={{ color: '#666666' }}>×</span>}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              marginRight: 4,
              fontFamily: 'Menlo, Monaco, Consolas, monospace',
              padding: '2px 7px',
              color: '#000000',
              border: '1px solid #000000'
            }}
          >
            <img
              src={`/${source.iata}.png`}
              alt={source.iata}
              style={{ 
                width: '16px', 
                height: '16px', 
                marginRight: '4px',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            {source.iata}
          </Tag>
        );
      }}
    />
  );
};

export default SourcesInput; 