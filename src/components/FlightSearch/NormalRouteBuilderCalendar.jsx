import React from 'react';
import dayjs from 'dayjs';

const NormalRouteBuilderCalendar = ({ flightData = {}, renderDayContent }) => {
  const today = dayjs();
  const year = today.year();
  const month = today.month();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  return (
  <div style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 190px)',
    gap: '1px',
    backgroundColor: '#e5e7eb',
    width: 'fit-content'
  }}>
    {/* Day headers */}
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
      <div key={day} style={{
        backgroundColor: '#f3f4f6',
        padding: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        width: '190px'
      }}>
        {day}
      </div>
    ))}
    
    {/* Empty cells for days before the first of the month */}
    {Array.from({ length: firstDayOfMonth }, (_, i) => (
      <div key={`empty-${i}`} style={{
        backgroundColor: '#f3f4f6',
        padding: '8px',
        width: '190px'
      }} />
    ))}
    
    {/* Days of the month */}
    {Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateStr = date.toISOString().split('T')[0];
      const dayFlights = flightData[dateStr] || {};
      
      return (
        <div key={i} style={{
          backgroundColor: '#f3f4f6',
          padding: '8px',
          minHeight: '120px',
          width: '190px'
        }}>
          <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
            {i + 1}
          </div>
          {renderDayContent && renderDayContent(dateStr, dayFlights)}
        </div>
      );
    })}
  </div>
  );
};

export default NormalRouteBuilderCalendar; 