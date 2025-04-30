import React from 'react';
import { Radio, Input, Checkbox } from 'antd';
import AirlineAllianceGroups from '../components/AirlineAllianceGroups';

const AirlinesFilter = ({ 
  airlinesFilter, 
  setAirlinesFilter, 
  airlinesSearchText, 
  setAirlinesSearchText,
  uniqueAirlines 
}) => {
  console.log('[DEBUG] AirlinesFilter render with:', JSON.stringify(airlinesFilter));
  
  // Ensure airlinesFilter and airlines are properly initialized
  const safeAirlinesFilter = airlinesFilter || { mode: 'include', airlines: [] };
  const airlines = Array.isArray(safeAirlinesFilter.airlines) ? safeAirlinesFilter.airlines : [];
  
  // Ensure uniqueAirlines is an array
  const safeUniqueAirlines = Array.isArray(uniqueAirlines) ? uniqueAirlines : [];
  
  // Filter airlines based on search text
  const filteredAirlines = safeUniqueAirlines.filter(airline => 
    airline.name.toLowerCase().includes(airlinesSearchText.toLowerCase()) ||
    airline.code.toLowerCase().includes(airlinesSearchText.toLowerCase())
  );

  // Helper function to update the filter
  const updateFilter = (updatedFilter) => {
    console.log('[DEBUG] AirlinesFilter updating filter to:', JSON.stringify(updatedFilter));
    setAirlinesFilter(updatedFilter);
  };

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
          value={safeAirlinesFilter.mode}
          onChange={e => {
            const newMode = e.target.value;
            console.log('[DEBUG] AirlinesFilter changing mode to:', newMode);
            const newFilter = {
              mode: newMode,
              airlines: airlines
            };
            updateFilter(newFilter);
          }}
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

      {/* Alliance Groups */}
      <div style={{ borderBottom: '1px solid #f0f0f0' }}>
        <AirlineAllianceGroups
          selectedAirlines={airlines}
          onAirlinesChange={(newAirlines) => {
            const newFilter = {
              mode: safeAirlinesFilter.mode,
              airlines: newAirlines
            };
            updateFilter(newFilter);
          }}
          availableAirlines={filteredAirlines}
        />
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search airlines..."
          value={airlinesSearchText}
          onChange={e => setAirlinesSearchText(e.target.value)}
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
        {filteredAirlines.map(airline => (
          <div 
            key={airline.code} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Checkbox
              checked={airlines.includes(airline.code)}
              onChange={e => {
                const isChecked = e.target.checked;
                console.log('[DEBUG] AirlinesFilter checkbox changed for:', airline.code, 'checked:', isChecked);
                
                const newAirlines = isChecked 
                  ? [...airlines, airline.code]
                  : airlines.filter(a => a !== airline.code);
                  
                const newFilter = {
                  mode: safeAirlinesFilter.mode,
                  airlines: newAirlines
                };
                
                updateFilter(newFilter);
              }}
            >
              <div style={{ 
                display: 'flex',
                alignItems: 'center', 
                gap: '8px'
              }}>
                {/* Logo */}
                <div style={{ 
                  width: '24px', 
                  height: '24px',
                  flexShrink: 0
                }}>
                  <img 
                    src={`/${airline.code}.png`} 
                    alt={airline.name} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                
                {/* Text content */}
                <div style={{ fontSize: '13px' }}>
                  {airline.name}
                </div>
              </div>
            </Checkbox>
          </div>
        ))}
        {filteredAirlines.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No airlines found
          </div>
        )}
      </div>
    </div>
  );
};

export default AirlinesFilter; 