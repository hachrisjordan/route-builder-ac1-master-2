import React from 'react';
import { Checkbox } from 'antd';

const ClassFilter = ({ classFilter, setClassFilter }) => {
  console.log('[DEBUG] ClassFilter render with classFilter:', classFilter);
  
  const cabinClasses = ['Economy', 'Premium Economy', 'Business', 'First'];
  
  const handleCheck = (cabinClass, isChecked) => {
    console.log('[DEBUG] ClassFilter checkbox clicked:', cabinClass, 'checked:', isChecked);
    
    const safeClassFilter = Array.isArray(classFilter) ? classFilter : [];
    console.log('[DEBUG] Current classFilter before update:', safeClassFilter);
    
    const newValue = isChecked 
      ? [...safeClassFilter, cabinClass]
      : safeClassFilter.filter(c => c !== cabinClass);
      
    console.log('[DEBUG] New classFilter after update:', newValue);
    setClassFilter(newValue);
  };
  
  return (
    <div style={{ 
      backgroundColor: 'white', 
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      padding: '8px 0',
      width: '240px'
    }}>
      <div style={{ 
        maxHeight: '300px', 
        overflowY: 'auto',
        padding: '8px 0'
      }}>
        {cabinClasses.map(cabinClass => (
          <div 
            key={cabinClass} 
            style={{ 
              padding: '4px 12px',
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: '#f5f5f5'
              }
            }}
          >
            <Checkbox
              checked={Array.isArray(classFilter) && classFilter.includes(cabinClass)}
              onChange={e => handleCheck(cabinClass, e.target.checked)}
            >
              {cabinClass}
            </Checkbox>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassFilter; 