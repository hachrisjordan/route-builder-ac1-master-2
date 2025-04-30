import React from 'react';
import { Checkbox, Tooltip } from 'antd';
import { airlineAlliances } from '../data/airlineAlliances';

const AirlineAllianceGroups = ({ selectedAirlines, onAirlinesChange, availableAirlines }) => {
  const handleAllianceChange = (allianceName, checked) => {
    const alliance = airlineAlliances[allianceName];
    let newSelectedAirlines = [...selectedAirlines];
    
    // Get only the alliance airlines that are available in the current filter
    const availableAllianceAirlines = alliance.airlines.filter(airline => 
      availableAirlines.some(a => a.code === airline)
    );
    
    if (checked) {
      // Add only available alliance airlines that aren't already selected
      availableAllianceAirlines.forEach(airline => {
        if (!newSelectedAirlines.includes(airline)) {
          newSelectedAirlines.push(airline);
        }
      });
    } else {
      // Remove only available alliance airlines
      newSelectedAirlines = newSelectedAirlines.filter(
        airline => !availableAllianceAirlines.includes(airline)
      );
    }
    
    onAirlinesChange(newSelectedAirlines);
  };

  const isAllianceSelected = (allianceName) => {
    const alliance = airlineAlliances[allianceName];
    const availableAllianceAirlines = alliance.airlines.filter(airline => 
      availableAirlines.some(a => a.code === airline)
    );
    return availableAllianceAirlines.length > 0 && 
           availableAllianceAirlines.every(airline => selectedAirlines.includes(airline));
  };

  const isAlliancePartiallySelected = (allianceName) => {
    const alliance = airlineAlliances[allianceName];
    const availableAllianceAirlines = alliance.airlines.filter(airline => 
      availableAirlines.some(a => a.code === airline)
    );
    const selectedCount = availableAllianceAirlines.filter(airline => 
      selectedAirlines.includes(airline)
    ).length;
    return selectedCount > 0 && selectedCount < availableAllianceAirlines.length;
  };

  return (
    <div>
      {Object.entries(airlineAlliances).map(([allianceName, alliance]) => {
        // Check if this alliance has any available airlines
        const hasAvailableAirlines = alliance.airlines.some(airline => 
          availableAirlines.some(a => a.code === airline)
        );
        
        if (!hasAvailableAirlines) return null;
        
        return (
          <div 
            key={allianceName}
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Checkbox
              checked={isAllianceSelected(allianceName)}
              indeterminate={isAlliancePartiallySelected(allianceName)}
              onChange={(e) => handleAllianceChange(allianceName, e.target.checked)}
            >
              <div style={{ 
                display: 'flex',
                alignItems: 'center', 
                gap: '8px'
              }}>
                {/* Alliance Logo */}
                <div style={{ 
                  width: '24px', 
                  height: '24px',
                  flexShrink: 0
                }}>
                  <img 
                    src={`/${alliance.logo}`} 
                    alt={allianceName}
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
                  {allianceName}
                </div>
              </div>
            </Checkbox>
          </div>
        );
      })}
    </div>
  );
};

export default AirlineAllianceGroups; 