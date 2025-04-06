import React from 'react';
import { Input, Checkbox } from 'antd';

const DatesFilter = ({ 
  dateFilter, 
  setDateFilter, 
  dateSearchText, 
  setDateSearchText,
  uniqueDates 
}) => {
  console.log('[DEBUG] DatesFilter render with:', JSON.stringify(dateFilter));
  
  // Ensure dateFilter is always an array
  const safeDateFilter = Array.isArray(dateFilter) ? dateFilter : [];
  
  // Ensure uniqueDates is an array
  const safeUniqueDates = Array.isArray(uniqueDates) ? uniqueDates : [];
  
  // Filter dates based on search text
  const filteredDates = safeUniqueDates.filter(date => 
    date.toLowerCase().includes(dateSearchText.toLowerCase())
  );
  
  // Helper function to update the filter
  const updateFilter = (updatedFilter) => {
    console.log('[DEBUG] DatesFilter updating filter to:', JSON.stringify(updatedFilter));
    setDateFilter(updatedFilter);
  };

  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '240px'
    }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
        <Input
          placeholder="Search dates..."
          value={dateSearchText}
          onChange={e => setDateSearchText(e.target.value)}
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
        {filteredDates.map(date => (
          <div 
            key={date} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Checkbox
              checked={safeDateFilter.includes(date)}
              onChange={e => {
                const isChecked = e.target.checked;
                console.log('[DEBUG] DatesFilter checkbox changed for:', date, 'checked:', isChecked);
                
                const newDates = isChecked 
                  ? [...safeDateFilter, date]
                  : safeDateFilter.filter(d => d !== date);
                
                updateFilter(newDates);
              }}
              onClick={e => e.stopPropagation()}
            >
              {date}
            </Checkbox>
          </div>
        ))}
        {filteredDates.length === 0 && (
          <div style={{ padding: '8px 12px', color: '#999', textAlign: 'center' }}>
            No dates found
          </div>
        )}
      </div>
    </div>
  );
};

export default DatesFilter; 