import React, { useState, useEffect } from 'react';
import { Button, Input, Slider } from 'antd';

const PointsFilter = ({ pointsFilter, setPointsFilter, pointsRange }) => {
  console.log('[DEBUG] PointsFilter render with:', JSON.stringify(pointsFilter));
  
  // Initialize local state with pointsFilter or default to the pointsRange
  const [localRange, setLocalRange] = useState(pointsFilter || pointsRange);
  
  // Update local range when pointsFilter changes
  useEffect(() => {
    if (Array.isArray(pointsFilter) && pointsFilter.length === 2) {
      setLocalRange(pointsFilter);
    } else if (pointsRange && pointsRange.length === 2) {
      setLocalRange(pointsRange);
    }
  }, [pointsFilter, pointsRange]);
  
  const onSliderChange = (newValue) => {
    console.log('[DEBUG] PointsFilter slider changing to:', newValue);
    setLocalRange(newValue);
  };
  
  const onAfterChange = (newValue) => {
    console.log('[DEBUG] PointsFilter finalizing value to:', newValue);
    setPointsFilter(newValue);
  };
  
  // Handle the reset button click
  const handleReset = () => {
    console.log('[DEBUG] PointsFilter reset clicked');
    setPointsFilter(null);
  };
  
  // Make sure we have valid default values
  const safePointsRange = Array.isArray(pointsRange) && pointsRange.length === 2 
    ? pointsRange 
    : [0, 200000];
  
  const safeLocalRange = Array.isArray(localRange) && localRange.length === 2 
    ? localRange 
    : safePointsRange;

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '16px',
      width: '380px'  // Increased from 320px to 380px
    }}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ fontWeight: '500' }}>Points Range</div>
          {pointsFilter && (
            <Button 
              type="link" 
              size="small" 
              onClick={handleReset}
              style={{ padding: 0 }}
            >
              Reset
            </Button>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '16px',
          gap: '8px'
        }}>
          <Input
            value={safeLocalRange[0].toLocaleString()}
            onChange={e => {
              try {
                const value = parseInt(e.target.value.replace(/,/g, ''), 10);
                if (!isNaN(value)) {
                  setLocalRange([
                    value,
                    safeLocalRange[1]
                  ]);
                }
              } catch (err) {}
            }}
            style={{ width: '110px' }}  // Slightly increased width
            size="small"
          />
          <span style={{ color: '#999' }}>to</span>
          <Input
            value={safeLocalRange[1].toLocaleString()}
            onChange={e => {
              try {
                const value = parseInt(e.target.value.replace(/,/g, ''), 10);
                if (!isNaN(value)) {
                  setLocalRange([
                    safeLocalRange[0],
                    value
                  ]);
                }
              } catch (err) {}
            }}
            style={{ width: '110px' }}  // Slightly increased width
            size="small"
          />
        </div>
        
        <div style={{ padding: '0 8px' }}>  {/* Added padding to prevent marks from being cut off */}
          <Slider
            range
            min={safePointsRange[0]}
            max={safePointsRange[1]}
            value={safeLocalRange}
            onChange={onSliderChange}
            onAfterChange={onAfterChange}
            step={1000}
            marks={{
              [safePointsRange[0]]: {
                label: safePointsRange[0].toLocaleString(),
                style: { transform: 'translateX(0%)' }  // Align left mark to left
              },
              [Math.floor(safePointsRange[1] / 2)]: {
                label: Math.floor(safePointsRange[1] / 2).toLocaleString(),
                style: { transform: 'translateX(-50%)' }  // Center middle mark
              },
              [safePointsRange[1]]: {
                label: safePointsRange[1].toLocaleString(),
                style: { transform: 'translateX(-100%)' }  // Align right mark to right
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PointsFilter; 