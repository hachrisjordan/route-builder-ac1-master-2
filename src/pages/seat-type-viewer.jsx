import React, { useState, useEffect, useMemo } from 'react';
import { Select, Input, Button, Space, message, Typography, Modal, Checkbox, Row, Col, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined, FilterOutlined, BarChartOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import airlines from '../data/airlines_full';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import seatAF from '../data/seat_AF.json';
import { CLOUD_STORAGE_BASE_URL, API_BASE_URL, getSeatConfigUrl } from '../config/cloud';

// Configure dayjs with UTC plugin
dayjs.extend(utc);

const { Title, Text } = Typography;
const { Option } = Select;
const ALLOWED_AIRLINES = ['EI','LX','UX','WS','VJ','DE','4Y','WK','EW','FI','AZ','HO','VA','EN','CZ','DL','HA','B6','AA','UA','NK','F9','G4','AS','A3','NZ','OZ','MS','SA','TP','SN','AV','OU','MX','ME','KQ','MF','RO','AR','AM','SK','ZH','LA','AY','JX','FJ','KL','RJ','UL','AT','AC','LO','IB','CA','MU','TK','GA','MH','JL', 'NH', 'QR', 'AF', 'LH','BA','SQ','EK','KE','AI','EY','TG','QF','CX','VN','CI','BR','VS','SV','CM','ET','PR','OS'];

// Month names array
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Function to get aircraft details from registration number
const getAircraftDetails = (registration, airline, seatData, date) => {
  if (!registration || registration === 'None' || !seatData) {
    return null;
  }
  
  // Get the variant configuration
  let variant = seatData.tail_number_distribution[registration];
  
  // Handle date-based configuration changes
  if (variant && typeof variant === 'object' && variant.changes) {
    // Sort changes by date in descending order
    const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Find the most recent change that applies to the given date
    const applicableChange = sortedChanges.find(change => new Date(date) >= new Date(change.date));
    
    // Use the applicable change's variant, or fall back to default
    variant = applicableChange ? applicableChange.variant : variant.default;
  }
  
  // If variant is still an object, use the default value
  if (variant && typeof variant === 'object' && variant.default) {
    variant = variant.default;
  }
  
  if (!variant) return null;
  
  // Find aircraft type and config information
  const configsByType = seatData.configs_by_type || seatData.configurations_by_type;
  for (const [aircraftType, configs] of Object.entries(configsByType || {})) {
    const config = configs.find(c => c.variant === variant);
    if (config) {
      return {
        aircraftType,
        variant,
        config: config.config,
        note: config.note,
        color: config.color
      };
    }
  }
  
  return null;
};

// Function to validate registration format by airline
const isValidRegistration = (registration, airline) => {
  if (!registration || registration === 'None') return false;
  
  // Validate Japan Airlines registrations must start with JA
  if (airline === 'JL' && !registration.startsWith('JA')) {
    return false;
  }
  
  return true;
};

// Helper function to get ontime status
const getOntimeStatus = (ontime, date) => {
  if (!ontime) return null;
  
  if (ontime === 'CANCELED') {
    return {
      color: '#000000',
      text: 'Canceled'
    };
  }

  // Check for diverted flights
  if (ontime.startsWith('Diverted to')) {
    return {
      color: '#9c27b0', // Purple
      text: ontime
    };
  }

  // Check if the flight is in the future
  const flightDate = new Date(date);
  const today = new Date();
  const isFuture = flightDate > today;
  
  // Check if the flight is more than 2 days old
  const diffTime = Math.abs(today - flightDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (ontime === 'N/A') {
    if (isFuture) {
      return null; // Don't show anything for future flights with N/A
    }
    if (diffDays > 2) {
      return {
        color: '#9e9e9e', // Grey color for historical N/A
        text: 'No info'
      };
    }
    return null; // Don't show anything for recent N/A
  }

  const minutes = parseInt(ontime);
  if (isNaN(minutes)) return null;

  let color, text;
  
  if (minutes <= 0) {
    color = '#4caf50'; // Green
  } else if (minutes < 30) {
    color = '#ffc107'; // Yellow
  } else {
    color = '#f44336'; // Red
  }

  if (minutes === 0) {
    text = 'Arrived on time';
  } else if (minutes < 0) {
    text = `Arrived ${Math.abs(minutes)}m early`;
  } else {
    // Format time for delays over 60 minutes
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      const timeStr = remainingMinutes > 0 
        ? `${hours}h${remainingMinutes}m`
        : `${hours}h`;
      text = `Arrived ${timeStr} late`;
    } else {
      text = `Arrived ${minutes}m late`;
    }
  }

  return { color, text };
};

// Calendar component exactly matching NormalRouteBuilderCalendar
const RegistrationCalendar = ({ registrationData = [], airline, flightNumber, seatData }) => {
  const [currentDate, setCurrentDate] = useState(dayjs().utc());
  
  const goToPrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const year = currentDate.year();
  const month = currentDate.month();
  const monthName = monthNames[month];
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  
  // Create a map of dates to registration numbers and ontime data
  const registrationByDate = {};
  registrationData.forEach(item => {
    // If we already have data for this date, only update if current registration is valid and previous was N/A
    if (registrationByDate[item.date]) {
      if (item.registration !== 'N/A' && registrationByDate[item.date].registration === 'N/A') {
        registrationByDate[item.date] = {
          registration: item.registration,
          ontime: item.ontime,
          date: item.date
        };
      }
    } else {
      // First entry for this date
      registrationByDate[item.date] = {
        registration: item.registration,
        ontime: item.ontime,
        date: item.date
      };
    }
  });

  return (
    <div style={{ width: 'fit-content' }}>
      {/* Month navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <Button 
          type="primary"
          onClick={goToPrevMonth}
          style={{ backgroundColor: '#000000' }}
        >
          &larr;
        </Button>
        <Title level={4} style={{ margin: 0 }}>{monthName} {year}</Title>
        <Button 
          type="primary"
          onClick={goToNextMonth}
          style={{ backgroundColor: '#000000' }}
        >
          &rarr;
        </Button>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 190px)',
        gap: '1px',
        backgroundColor: '#f0f0f0',
        width: 'fit-content',
        border: '1px solid #f0f0f0'
      }}>
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} style={{
            backgroundColor: '#f5f5f5',
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
            backgroundColor: '#f5f5f5',
            padding: '8px',
            width: '190px',
            minHeight: '150px'
          }} />
        ))}
        
        {/* Days of the month */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const date = new Date(Date.UTC(year, month, day));
          const dateStr = date.toISOString().split('T')[0];
          const dayData = registrationByDate[dateStr];
          const registration = dayData?.registration;
          const ontime = dayData?.ontime;
          const aircraftDetails = registration && registration !== 'N/A' ? getAircraftDetails(registration, airline, seatData, dateStr) : null;
          const status = getOntimeStatus(ontime, dateStr);
          
          return (
            <div key={i} style={{
              backgroundColor: 'white',
              padding: '8px',
              minHeight: '150px',
              width: '190px',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'center',
              position: 'relative'
            }}>
              <div style={{ 
                marginBottom: '16px',
                fontWeight: 'bold',
                paddingBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                fontSize: '14px'
              }}>
                {/* Status group */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  position: 'absolute',
                  left: 0,
                  fontSize: '12px'
                }}>
                  {status && (
                    <>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: status.color,
                        border: '1px solid #ddd',
                        flexShrink: 0
                      }} />
                      <span style={{
                        fontSize: '12px',
                        color: status.color,
                        whiteSpace: 'nowrap',
                        fontWeight: 'bold'
                      }}>
                        {status.text}
                      </span>
                    </>
                  )}
                </div>
                {/* Date number - always on the right */}
                <span style={{ marginLeft: 'auto' }}>{day}</span>
              </div>
              {registration && registration !== 'N/A' && (
                <div style={{ 
                  fontSize: '13px', 
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: 'black'
                }}>
                  {aircraftDetails ? (
                    <>
                      <div style={{ 
                        fontWeight: 'bold',
                        marginBottom: '6px',
                        fontSize: '15px'
                      }}>
                        {aircraftDetails.aircraftType} ({aircraftDetails.variant})
                      </div>
                      <div style={{ 
                        marginBottom: '6px',
                        fontSize: '12px'
                      }}>
                        {aircraftDetails.config}
                      </div>
                      <div style={{ 
                        fontStyle: 'italic', 
                        marginBottom: '8px',
                        fontSize: '12px'
                      }}>
                        <SeatMapTooltip airline={airline} variant={aircraftDetails.variant} aircraftType={aircraftDetails.aircraftType}>
                          {aircraftDetails.note}
                        </SeatMapTooltip>
                      </div>
                      <div style={{ 
                        fontWeight: 'bold',
                        fontSize: '15px',
                        marginTop: 'auto',
                        backgroundColor: aircraftDetails.color,
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'inline-block'
                      }}>
                        {registration}
                        {seatData.aircraft_names && seatData.aircraft_names[registration] && (
                          <>
                            <br />
                            <span style={{ fontSize: '12px', opacity: 0.9 }}>
                              {seatData.aircraft_names[registration]}
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontWeight: 'bold' }}>
                      {registration}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Analysis component for variant statistics
const VariantAnalysis = ({ registrationData, airline, seatData }) => {
  // Available variants with count information
  const variantStats = useMemo(() => {
    if (!registrationData || !airline || !seatData) {
      return [];
    }

    const variantCounts = new Map();
    const variantInfo = new Map();
    const validData = registrationData.filter(item => isValidRegistration(item.registration, airline));
    
    // Count each variant appearance
    validData.forEach(item => {
      let variant = seatData.tail_number_distribution[item.registration];
      
      // Handle date-based configuration changes
      if (variant && typeof variant === 'object' && variant.changes) {
        // Sort changes by date in descending order
        const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Find the most recent change that applies to the given date
        const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
        
        // Use the applicable change's variant, or fall back to default
        variant = applicableChange ? applicableChange.variant : variant.default;
      }
      
      // Handle special case for object variants
      if (variant && typeof variant === 'object' && variant.default) {
        variant = variant.default;
      }
      
      if (variant) {
        variantCounts.set(variant, (variantCounts.get(variant) || 0) + 1);
        
        // Get aircraft type and note for this variant
        if (!variantInfo.has(variant)) {
          const configsByType = seatData.configs_by_type || seatData.configurations_by_type;
          for (const [aircraftType, configs] of Object.entries(configsByType || {})) {
            const config = configs.find(c => c.variant === variant);
            if (config) {
              variantInfo.set(variant, {
                aircraftType,
                note: config.note,
                color: config.color
              });
              break;
            }
          }
        }
      }
    });
    
    // Convert to array and sort by count (most frequent first)
    const stats = Array.from(variantCounts.entries()).map(([variant, count]) => ({
      variant,
      count,
      percentage: (count / validData.length) * 100,
      aircraftType: variantInfo.get(variant)?.aircraftType || '',
      note: variantInfo.get(variant)?.note || '',
      color: variantInfo.get(variant)?.color || '#000'
    }));
    
    return stats.sort((a, b) => b.count - a.count);
  }, [registrationData, airline, seatData]);
  
  // Default to the most frequent variant
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  // Set the most frequent variant as default when data changes
  useEffect(() => {
    if (variantStats.length > 0 && !selectedVariant) {
      setSelectedVariant(variantStats[0].variant);
    }
  }, [variantStats, selectedVariant]);
  
  // Calculate time-based percentages
  const timeAnalysis = useMemo(() => {
    if (!selectedVariant || !registrationData || !seatData) return [];
    
    const now = new Date();
    const periodLabels = ['Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 28 days', 'Last 60 days', 'Last 180 days', 'Last 360 days'];
    const periods = [3, 7, 14, 28, 60, 180, 360];
    
    return periods.map((days, index) => {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // First filter by date range and valid registration
      const allFlightsInPeriod = registrationData.filter(item => {
        if (!isValidRegistration(item.registration, airline)) return false;
        
        const [year, month, day] = item.date.split('-').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= cutoffDate && itemDate <= now;
      });
      
      // Then count ones matching the selected variant
      const variantCount = allFlightsInPeriod.filter(item => {
        let variant = seatData.tail_number_distribution[item.registration];
        
        // Handle date-based configuration changes
        if (variant && typeof variant === 'object' && variant.changes) {
          // Sort changes by date in descending order
          const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
          
          // Find the most recent change that applies to the given date
          const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
          
          // Use the applicable change's variant, or fall back to default
          variant = applicableChange ? applicableChange.variant : variant.default;
        }
        
        // Handle special case for object variants
        if (variant && typeof variant === 'object' && variant.default) {
          variant = variant.default;
        }
        
        return variant === selectedVariant;
      }).length;
      
      const totalCount = allFlightsInPeriod.length;
      
      return {
        label: periodLabels[index],
        percentage: totalCount === 0 ? 0 : (variantCount / totalCount) * 100,
        variantCount,
        totalCount
      };
    });
  }, [selectedVariant, registrationData, seatData, airline]);
  
  // Calculate day-of-week percentages
  const dayAnalysis = useMemo(() => {
    if (!selectedVariant || !registrationData || !seatData) return [];
    
    const dayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = Array(7).fill(0).map(() => ({ total: 0, variant: 0 }));
    
    registrationData.forEach(item => {
      if (!isValidRegistration(item.registration, airline)) return;
      
      // Parse the date string into a Date object
      const [year, month, day] = item.date.split('-').map(Number);
      const date = new Date(year, month - 1, day); // Month is 0-based in JS Date
      
      const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
      
      if (dayOfWeek >= 0 && dayOfWeek < 7) {
        dayStats[dayOfWeek].total++;
        
        let variant = seatData.tail_number_distribution[item.registration];
        
        // Handle date-based configuration changes
        if (variant && typeof variant === 'object' && variant.changes) {
          // Sort changes by date in descending order
          const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
          
          // Find the most recent change that applies to the given date
          const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
          
          // Use the applicable change's variant, or fall back to default
          variant = applicableChange ? applicableChange.variant : variant.default;
        }
        
        // Handle special case for object variants
        if (variant && typeof variant === 'object' && variant.default) {
          variant = variant.default;
        }
        
        if (variant === selectedVariant) {
          dayStats[dayOfWeek].variant++;
        }
      }
    });
    
    return dayStats.map((stats, index) => ({
      label: dayLabels[index],
      percentage: stats.total === 0 ? 0 : (stats.variant / stats.total) * 100,
      variantCount: stats.variant,
      totalCount: stats.total
    }));
  }, [selectedVariant, registrationData, seatData, airline]);
  
  // Get color for selected variant
  const selectedVariantColor = useMemo(() => {
    const variant = variantStats.find(v => v.variant === selectedVariant);
    return variant?.color || '#1890ff';
  }, [selectedVariant, variantStats]);
  
  if (variantStats.length === 0) return null;
  
  return (
    <div style={{ marginTop: '20px', width: '100%', maxWidth: '1340px' }}>
      <div 
        style={{ 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          backgroundColor: 'white',
          border: '1px solid #f0f0f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <BarChartOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
            <Title level={5} style={{ margin: 0 }}>Aircraft Variant Analysis</Title>
          </div>
          
          <Select
            value={selectedVariant}
            onChange={setSelectedVariant}
            style={{ width: '750px !important', minWidth: '750px', maxWidth: '100%' }}
            placeholder="Select variant to analyze"
            className="variant-select-dropdown"
          >
            {variantStats.map(stat => (
              <Option key={stat.variant} value={stat.variant}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    backgroundColor: stat.color,
                    marginRight: '8px',
                    borderRadius: '2px'
                  }} />
                  <span style={{ fontWeight: 'bold' }}>
                    {stat.aircraftType} ({stat.variant})
                  </span>
                  <span style={{ fontStyle: 'italic', marginLeft: '8px' }}>
                    - {stat.note}
                  </span>
                </div>
              </Option>
            ))}
          </Select>
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <Text style={{ marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>
            By Time Period
          </Text>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '8px'
          }}>
            {timeAnalysis.map((period, index) => {
              // Calculate flight counts for this period
              const now = new Date();
              const cutoffDate = new Date(now);
              cutoffDate.setDate(cutoffDate.getDate() - [3, 7, 14, 28, 60, 180, 360][index]);
              
              // First filter by date range and valid registration
              const allFlightsInPeriod = registrationData.filter(item => {
                if (!isValidRegistration(item.registration, airline)) return false;
                
                const [year, month, day] = item.date.split('-').map(Number);
                const itemDate = new Date(year, month - 1, day);
                return itemDate >= cutoffDate && itemDate <= now;
              });
              
              // Then count ones matching the selected variant
              const variantCount = allFlightsInPeriod.filter(item => {
                let variant = seatData.tail_number_distribution[item.registration];
                
                // Handle date-based configuration changes
                if (variant && typeof variant === 'object' && variant.changes) {
                  // Sort changes by date in descending order
                  const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
                  
                  // Find the most recent change that applies to the given date
                  const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
                  
                  // Use the applicable change's variant, or fall back to default
                  variant = applicableChange ? applicableChange.variant : variant.default;
                }
                
                // Handle special case for object variants
                if (variant && typeof variant === 'object' && variant.default) {
                  variant = variant.default;
                }
                
                return variant === selectedVariant;
              }).length;
              
              const totalCount = allFlightsInPeriod.length;
              
              return (
                <div 
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    border: `1px solid ${selectedVariantColor}20`,
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: `${period.percentage}%`,
                    backgroundColor: `${selectedVariantColor}20`,
                    zIndex: 0
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      {period.label}
                    </Text>
                    <Text style={{ fontWeight: 'bold', fontSize: '18px', color: selectedVariantColor }}>
                      {period.percentage.toFixed(1)}%
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>
                      {variantCount} / {totalCount} flights
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <div>
          <Text style={{ marginBottom: '10px', display: 'block', fontWeight: 'bold' }}>
            By Day of Week
          </Text>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(7, 1fr)', 
            gap: '8px'
          }}>
            {dayAnalysis.map((day, index) => {
              // Calculate flight counts for this day with proper filtering
              const dayStats = { total: 0, variant: 0 };
              
              // Only iterate through valid registrations
              registrationData.filter(item => isValidRegistration(item.registration, airline))
                .forEach(item => {
                  const [year, month, day] = item.date.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  
                  const dayOfWeek = date.getDay();
                  
                  if (dayOfWeek === index) {
                    dayStats.total++;
                    
                    let variant = seatData.tail_number_distribution[item.registration];
                    
                    // Handle date-based configuration changes
                    if (variant && typeof variant === 'object' && variant.changes) {
                      // Sort changes by date in descending order
                      const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
                      
                      // Find the most recent change that applies to the given date
                      const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
                      
                      // Use the applicable change's variant, or fall back to default
                      variant = applicableChange ? applicableChange.variant : variant.default;
                    }
                    
                    // Handle special case for object variants
                    if (variant && typeof variant === 'object' && variant.default) {
                      variant = variant.default;
                    }
                    
                    if (variant === selectedVariant) {
                      dayStats.variant++;
                    }
                  }
                });
              
              return (
                <div 
                  key={index}
                  style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    border: `1px solid ${selectedVariantColor}20`,
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: `${day.percentage}%`,
                    backgroundColor: `${selectedVariantColor}20`,
                    zIndex: 0
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      {day.label}
                    </Text>
                    <Text style={{ fontWeight: 'bold', fontSize: '18px', color: selectedVariantColor }}>
                      {day.percentage.toFixed(1)}%
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>
                      {dayStats.variant} / {dayStats.total} flights
                    </Text>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analysis component for delay statistics
const DelayAnalysis = ({ registrationData }) => {
  // Helper function to get color based on delay
  const getDelayColor = (delay, canceledPercentage = 0) => {
    if (canceledPercentage >= 50) return '#000000'; // Black for majority canceled
    if (delay <= 0) return '#4caf50'; // Green
    if (delay >= 120) return '#f44336'; // Red
    
    // Linear interpolation between colors
    const ratio = delay / 120;
    if (delay <= 30) {
      // Green to Yellow
      const r = Math.round(76 + (255 - 76) * (delay / 30));
      const g = Math.round(175 + (193 - 175) * (delay / 30));
      const b = Math.round(80 + (7 - 80) * (delay / 30));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to Red
      const r = Math.round(255 + (244 - 255) * ((delay - 30) / 90));
      const g = Math.round(193 + (67 - 193) * ((delay - 30) / 90));
      const b = Math.round(7 + (54 - 7) * ((delay - 30) / 90));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Helper function to get delay category
  const getDelayCategory = (delay) => {
    if (delay === 'CANCELED') return 'Canceled';
    if (delay.startsWith('Diverted to')) return 'Diverted';
    if (delay <= 0) return 'On Time';
    if (delay <= 15) return '0-15 min';
    if (delay <= 30) return '15-30 min';
    if (delay <= 60) return '30-60 min';
    if (delay <= 120) return '1-2 hours';
    return '2+ hours';
  };

  // Calculate delay statistics
  const delayStats = useMemo(() => {
    if (!registrationData) return null;

    const now = new Date();
    const periodLabels = ['Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 28 days', 'Last 60 days', 'Last 180 days', 'Last 360 days'];
    const periods = [3, 7, 14, 28, 60, 180, 360];
    
    return periods.map((days, index) => {
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      // Filter flights in the period
      const flightsInPeriod = registrationData.filter(item => {
        const [year, month, day] = item.date.split('-').map(Number);
        const itemDate = new Date(year, month - 1, day);
        return itemDate >= cutoffDate && itemDate <= now && item.ontime !== 'N/A';
      });
      
      // Calculate statistics
      const totalFlights = flightsInPeriod.length;
      if (totalFlights === 0) return null;

      const onTimeFlights = flightsInPeriod.filter(item => parseInt(item.ontime) <= 0).length;
      const onTimePercentage = (onTimeFlights / totalFlights) * 100;
      
      // Calculate average delay (including all flights)
      const totalDelay = flightsInPeriod.reduce((sum, item) => {
        const delay = parseInt(item.ontime);
        return isNaN(delay) ? sum : sum + delay;
      }, 0);
      const averageDelay = totalDelay / totalFlights;

      // Calculate delay distribution
      const delayCategories = {
        'Canceled': 0,
        'Diverted': 0,
        'On Time': 0,
        '0-15 min': 0,
        '15-30 min': 0,
        '30-60 min': 0,
        '1-2 hours': 0,
        '2+ hours': 0
      };

      flightsInPeriod.forEach(item => {
        const category = getDelayCategory(item.ontime);
        delayCategories[category]++;
      });

      // Calculate canceled percentage
      const canceledPercentage = (delayCategories['Canceled'] / totalFlights) * 100;

      // Format average delay
      let formattedDelay;
      if (averageDelay >= 60) {
        const hours = Math.floor(averageDelay / 60);
        const minutes = Math.round(averageDelay % 60);
        formattedDelay = minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
      } else {
        formattedDelay = `${Math.round(averageDelay)}m`;
      }

      return {
        label: periodLabels[index],
        onTimePercentage,
        averageDelay: formattedDelay,
        rawAverageDelay: averageDelay,
        totalFlights,
        onTimeFlights,
        delayDistribution: delayCategories,
        canceledPercentage
      };
    }).filter(Boolean);
  }, [registrationData]);

  if (!delayStats || delayStats.length === 0) return null;

  return (
    <div style={{ marginTop: '20px', width: '100%', maxWidth: '1340px' }}>
      <div 
        style={{ 
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          padding: '24px',
          backgroundColor: 'white',
          border: '1px solid #f0f0f0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <BarChartOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
          <Title level={5} style={{ margin: 0 }}>Delay Analysis</Title>
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '8px'
        }}>
          {delayStats.map((period, index) => {
            const color = getDelayColor(period.rawAverageDelay, period.canceledPercentage);
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div 
                  style={{
                    padding: '12px',
                    backgroundColor: 'white',
                    border: '1px solid #4caf5020',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    width: '100%',
                    height: `${period.onTimePercentage}%`,
                    backgroundColor: '#4caf5020',
                    zIndex: 0
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <Text style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      {period.label}
                    </Text>
                    <Text style={{ fontWeight: 'bold', fontSize: '18px', color: color }}>
                      {period.averageDelay} ({period.onTimePercentage.toFixed(1)}%)
                    </Text>
                    <Text style={{ fontSize: '11px', color: '#888', display: 'block', marginTop: '4px' }}>
                      {period.onTimeFlights} / {period.totalFlights} flights on time
                    </Text>
                  </div>
                </div>
                
                {/* Delay Distribution Bar Chart */}
                <div style={{ 
                  padding: '8px',
                  backgroundColor: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '10px'
                }}>
                  {Object.entries(period.delayDistribution)
                    .sort(([a], [b]) => {
                      // Custom order: On Time -> 0-15 -> 15-30 -> 30-60 -> 1-2 -> 2+ -> Diverted -> Canceled
                      const order = {
                        'On Time': 0,
                        '0-15 min': 1,
                        '15-30 min': 2,
                        '30-60 min': 3,
                        '1-2 hours': 4,
                        '2+ hours': 5,
                        'Diverted': 6,
                        'Canceled': 7
                      };
                      return (order[a] || 0) - (order[b] || 0);
                    })
                    .map(([category, count]) => {
                    const percentage = (count / period.totalFlights) * 100;
                    let categoryColor;
                    switch(category) {
                      case 'Canceled': categoryColor = '#000000'; break;
                      case 'Diverted': categoryColor = '#9c27b0'; break;
                      case 'On Time': categoryColor = '#4caf50'; break;
                      case '0-15 min': categoryColor = '#8bc34a'; break;
                      case '15-30 min': categoryColor = '#ffc107'; break;
                      case '30-60 min': categoryColor = '#ff9800'; break;
                      case '1-2 hours': categoryColor = '#ff5722'; break;
                      case '2+ hours': categoryColor = '#f44336'; break;
                      default: categoryColor = '#9e9e9e';
                    }
                    
                    return (
                      <div key={category} style={{ marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span>{category}</span>
                          <span>{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div style={{ 
                          width: '100%', 
                          height: '4px', 
                          backgroundColor: '#f0f0f0',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: categoryColor,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper function to parse search input (copied from SearchForm)
const parseSearchInput = (inputValue) => {
  if (!inputValue) return '';
  try {
    if (typeof inputValue === 'object' && inputValue !== null) {
      if (inputValue._searchText) {
        return String(inputValue._searchText).toLowerCase();
      } else if (inputValue.input) {
        return String(inputValue.input).toLowerCase();
      } else if (inputValue.searchText) {
        return String(inputValue.searchText).toLowerCase();
      } else if (inputValue.value) {
        return String(inputValue.value).toLowerCase();
      } else if (inputValue.searchValue) {
        return String(inputValue.searchValue).toLowerCase();
      } else {
        const str = String(inputValue);
        if (str.startsWith('{') && str.includes('searchValue')) {
          try {
            const parsed = JSON.parse(str);
            if (parsed.searchValue) {
              return String(parsed.searchValue).toLowerCase();
            }
          } catch (e) {}
        }
        return '';
      }
    } else {
      return String(inputValue || '').toLowerCase();
    }
  } catch (error) {
    return '';
  }
};

// Helper: SeatMapTooltip
const SeatMapTooltip = ({ airline, variant, children, aircraftType }) => {
  const [imgSize, setImgSize] = useState(300); // Default size for 1920px width

  // Calculate image size based on viewport width
  useEffect(() => {
    const calculateSize = () => {
      const viewportWidth = window.innerWidth;
      // Calculate size as percentage of viewport width (300px is ~15.6% of 1920px)
      const newSize = Math.round(viewportWidth * 0.156);
      setImgSize(newSize);
    };

    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, []);

  const [imgExists, setImgExists] = React.useState(false);
  const [checked, setChecked] = React.useState(false);
  const [img1Exists, setImg1Exists] = React.useState(false);
  const [img2Exists, setImg2Exists] = React.useState(false);
  const [checkedDouble, setCheckedDouble] = React.useState(false);
  const [modalVisible, setModalVisible] = React.useState(false);

  const isDoubleDecker = aircraftType && (aircraftType.includes('747') || aircraftType.includes('380'));
  const url = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}.png`;
  const url1 = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}-1.png`;
  const url2 = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}-2.png`;

  // Single deck logic
  React.useEffect(() => {
    if (!airline || !variant || isDoubleDecker) return;
    setChecked(false);
    setImgExists(false);
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImgExists(true);
      setChecked(true);
    };
    img.onerror = () => {
      setImgExists(false);
      setChecked(true);
    };
    // eslint-disable-next-line
  }, [airline, variant, isDoubleDecker]);

  // Double deck logic
  React.useEffect(() => {
    if (!airline || !variant || !isDoubleDecker) return;
    setCheckedDouble(false);
    setImg1Exists(false);
    setImg2Exists(false);
    let loaded = 0;
    const done = () => { loaded++; if (loaded === 2) setCheckedDouble(true); };
    const img1 = new window.Image();
    img1.src = url1;
    img1.onload = () => { setImg1Exists(true); done(); };
    img1.onerror = () => { setImg1Exists(false); done(); };
    const img2 = new window.Image();
    img2.src = url2;
    img2.onload = () => { setImg2Exists(true); done(); };
    img2.onerror = () => { setImg2Exists(false); done(); };
    // eslint-disable-next-line
  }, [airline, variant, isDoubleDecker]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setModalVisible(true);
  };

  if (!airline || !variant) return children;
  if (isDoubleDecker) {
    if (!checkedDouble) return children;
    if (!img1Exists && !img2Exists) return children;
    return (
      <>
        <Tooltip
          title={
            <div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto' }}>
                {img1Exists && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={url1} alt="Lower Deck" style={{ maxWidth: '48vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                    <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>Lower Deck</div>
                  </div>
                )}
                {img2Exists && (
                  <div style={{ textAlign: 'center' }}>
                    <img src={url2} alt="Upper Deck" style={{ maxWidth: '48vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                    <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>Upper Deck</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#fff', marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
            </div>
          }
          overlayStyle={{ padding: 0, maxWidth: 1400, overflowX: 'auto' }}
          mouseEnterDelay={0.2}
          placement="right"
        >
          <span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={handleClick}>{children}</span>
        </Tooltip>
        <Modal
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width="auto"
          style={{ top: 20 }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16, 
            padding: 16,
            alignItems: 'center'
          }}>
            {img2Exists && (
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{ 
                  fontSize: 16,
                  fontWeight: 'bold'
                }}>Upper Deck</div>
                <div style={{ 
                  textAlign: 'center',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  width: `${imgSize}px`,
                  height: `${imgSize}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '8px'
                }}>
                  <img 
                    src={url2} 
                    alt="Upper Deck" 
                    style={{ 
                      width: `${imgSize}px`,
                      height: 'auto',
                      display: 'block'
                    }} 
                    loading="lazy" 
                  />
                </div>
              </div>
            )}
            {img1Exists && (
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8
              }}>
                <div style={{ 
                  fontSize: 16,
                  fontWeight: 'bold'
                }}>Lower Deck</div>
                <div style={{ 
                  textAlign: 'center',
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  width: `${imgSize}px`,
                  height: `${imgSize}px`,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '8px'
                }}>
                  <img 
                    src={url1} 
                    alt="Lower Deck" 
                    style={{ 
                      width: `${imgSize}px`,
                      height: 'auto',
                      display: 'block'
                    }} 
                    loading="lazy" 
                  />
                </div>
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
          </div>
        </Modal>
      </>
    );
  }
  // Single deck
  if (!checked) return children;
  if (!imgExists) return children;
  return (
    <>
      <Tooltip
        title={
          <div>
            <img src={url} alt="Seat map" style={{ maxWidth: 1200, maxHeight: 900, display: 'block' }} loading="lazy" />
            <div style={{ fontSize: 12, color: '#fff', marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
          </div>
        }
        overlayStyle={{ padding: 0 }}
        mouseEnterDelay={0.2}
        placement="right"
      >
        <span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={handleClick}>{children}</span>
      </Tooltip>
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="auto"
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          padding: 16
        }}>
          <div style={{ 
            textAlign: 'center',
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            width: `${imgSize}px`,
            height: `${imgSize}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '8px'
          }}>
            <img 
              src={url} 
              alt="Seat map" 
              style={{ 
                width: `${imgSize}px`,
                height: 'auto',
                display: 'block'
              }} 
              loading="lazy" 
            />
          </div>
          <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
        </div>
      </Modal>
    </>
  );
};

const SeatTypeViewer = () => {
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [flightNumber, setFlightNumber] = useState('');
  const [registrationData, setRegistrationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState([]);
  const [availableVariants, setAvailableVariants] = useState([]);
  const [seatData, setSeatData] = useState(null);
  const [seatDataLoading, setSeatDataLoading] = useState(false);
  // Advanced search state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [origin, setOrigin] = useState(null);
  const [arrival, setArrival] = useState(null);

  // Filter and sort allowed airlines
  const sortedAirlines = airlines
    .filter(airline => ALLOWED_AIRLINES.includes(airline.value))
    .sort((a, b) => a.label.localeCompare(b.label));

  // Fetch seat data when airline changes
  useEffect(() => {
    if (selectedAirline) {
      const fetchSeatData = async () => {
        setSeatDataLoading(true);
        try {
          // Fetch from URL for all airlines including AF
          const response = await fetch(getSeatConfigUrl(selectedAirline));
          if (!response.ok) {
            throw new Error(`Failed to fetch seat data for ${selectedAirline}`);
          }
          const data = await response.json();
          setSeatData(data);
        } catch (error) {
          console.error('Error fetching seat data:', error);
          message.error(`No seat configuration data available for ${selectedAirline}`);
          setSeatData(null);
        } finally {
          setSeatDataLoading(false);
        }
      };
      
      fetchSeatData();
    }
  }, [selectedAirline]);

  const handleSearch = async () => {
    if (!selectedAirline || !flightNumber) {
      return;
    }
    // Clear previous data when starting a new search
    setRegistrationData([]);
    setDataFetched(false);
    setSelectedVariants([]);
    setAvailableVariants([]);
    setLoading(true);
    try {
      // Build API URL with optional origin/destination
      let apiUrl = `${API_BASE_URL}/api/flightradar24/${selectedAirline}${flightNumber}`;
      const params = [];
      if (origin) params.push(`origin=${encodeURIComponent(origin)}`);
      if (arrival) params.push(`destination=${encodeURIComponent(arrival)}`);
      if (params.length > 0) {
        apiUrl += `?${params.join('&')}`;
      }
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      console.log('Flight data response:', data);
      setRegistrationData(data);
      setDataFetched(true);
      
      // Extract unique variants for filter options
      if (seatData) {
        console.log('Seat data:', seatData);
        const variants = new Set();
        const variantInfo = new Map();
        
        // Only collect variants that appear in the registration data
        data.forEach(item => {
          if (!isValidRegistration(item.registration, selectedAirline)) return;
          
          let variant = seatData.tail_number_distribution[item.registration];
          
          // Handle date-based configuration changes
          if (variant && typeof variant === 'object' && variant.changes) {
            // Sort changes by date in descending order
            const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Find the most recent change that applies to the given date
            const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
            
            // Use the applicable change's variant, or fall back to default
            variant = applicableChange ? applicableChange.variant : variant.default;
          }
          
          // Handle special case for object variants
          if (variant && typeof variant === 'object' && variant.default) {
            variant = variant.default;
          }
          
          if (variant) {
            variants.add(variant);
            
            // Get aircraft type and note for this variant
            if (!variantInfo.has(variant)) {
              const configsByType = seatData.configs_by_type || seatData.configurations_by_type;
              for (const [aircraftType, configs] of Object.entries(configsByType || {})) {
                const config = configs.find(c => c.variant === variant);
                if (config) {
                  variantInfo.set(variant, {
                    aircraftType,
                    note: config.note
                  });
                  break;
                }
              }
            }
          }
        });
        
        console.log('Available variants:', Array.from(variants));
        
        const variantOptions = Array.from(variants).map(variant => {
          const info = variantInfo.get(variant);
          const option = {
            value: variant,
            label: variant,
            aircraftType: info?.aircraftType || '',
            note: info?.note || ''
          };
          console.log('Created variant option:', option);
          return option;
        });
        
        console.log('Final variant options:', variantOptions);
        setAvailableVariants(variantOptions);
        setSelectedVariants([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to fetch flight data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = checkedValues => {
    setSelectedVariants(checkedValues);
  };

  const getFilteredRegistrationData = () => {
    if (selectedVariants.length === 0 || !seatData) {
      return registrationData.filter(item => isValidRegistration(item.registration, selectedAirline));
    }
    
    return registrationData.filter(item => {
      if (!isValidRegistration(item.registration, selectedAirline)) return false;
      
      let variant = seatData.tail_number_distribution[item.registration];
      
      // Handle date-based configuration changes
      if (variant && typeof variant === 'object' && variant.changes) {
        // Sort changes by date in descending order
        const sortedChanges = [...variant.changes].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Find the most recent change that applies to the given date
        const applicableChange = sortedChanges.find(change => new Date(item.date) >= new Date(change.date));
        
        // Use the applicable change's variant, or fall back to default
        variant = applicableChange ? applicableChange.variant : variant.default;
      }
      
      // Handle special case for object variants
      if (variant && typeof variant === 'object' && variant.default) {
        variant = variant.default;
      }
      
      return variant && selectedVariants.includes(variant);
    });
  };

  const renderAirlineOption = (airline) => {
    const airlineCode = airline.value;
    const airlineName = airline.label.replace(`(${airlineCode})`, '').trim();
    
    return {
      value: airlineCode,
      label: (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img
            src={`/${airlineCode}.png`}
            alt={airlineCode}
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
          <span style={{ fontSize: '14px' }}>
            {airlineName} - <strong>{airlineCode}</strong>
          </span>
        </div>
      )
    };
  };

  // Airport options (copied from SearchForm)
  const airports = require('../data/airports').airports || require('../data/airports');
  const airportSelectProps = {
    showSearch: true,
    allowClear: true,
    suffixIcon: null,
    options: airports.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.CityName} (${airport.Country})`,
      iata: airport.IATA,
      name: airport.CityName,
      country: airport.Country
    })),
    optionRender: (option) => {
      const iataCode = option.value;
      const airportName = option.data.name;
      const country = option.data.country;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
          <span style={{ fontWeight: 'bold' }}>{iataCode}</span>
          <span style={{ fontSize: '12px', color: '#666' }}>
            {airportName} ({country})
          </span>
        </div>
      );
    },
    filterOption: (input, option) => {
      if (!input) return true;
      const searchText = parseSearchInput(input);
      const iata = String(option.value || '').toLowerCase();
      const label = String(option.label || '').toLowerCase();
      return iata.includes(searchText) || label.includes(searchText);
    },
    filterSort: (optionA, optionB, inputValue) => {
      if (!inputValue) return String(optionA.value || '').localeCompare(String(optionB.value || ''));
      const input = parseSearchInput(inputValue);
      const iataA = String(optionA.value || '').toLowerCase();
      const iataB = String(optionB.value || '').toLowerCase();
      let scoreA = 0;
      let scoreB = 0;
      if (iataA === input) scoreA = 1000;
      if (iataB === input) scoreB = 1000;
      if (iataA.startsWith(input) && iataA !== input) scoreA = 500;
      if (iataB.startsWith(input) && iataB !== input) scoreB = 500;
      if (iataA.includes(input) && !iataA.startsWith(input)) scoreA = 200;
      if (iataB.includes(input) && !iataB.startsWith(input)) scoreB = 200;
      const labelA = String(optionA.label || '').toLowerCase();
      const labelB = String(optionB.label || '').toLowerCase();
      if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
      if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return String(iataA).localeCompare(String(iataB));
    },
    listHeight: 256,
    virtual: true,
    dropdownStyle: {
      maxHeight: 400,
      padding: '8px 0',
      boxShadow: '0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05)',
      borderRadius: '8px',
      zIndex: 1050,
      overflowY: 'auto',
      overflowAnchor: 'none'
    }
  };

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      margin: '24px auto',
      padding: '0 16px'
    }}>
      <div
        style={{
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 'fit-content',
          background: '#fff',
          marginBottom: 16
        }}
      >
        <Space size="middle" align="center">
          <Select
            showSearch
            style={{ width: 300 }}
            placeholder="Select an airline"
            onChange={value => setSelectedAirline(value)}
            options={sortedAirlines.map(renderAirlineOption)}
            filterOption={(input, option) => {
              const airlineCode = option.value.toLowerCase();
              const airlineName = option.label.props.children[1].props.children[0].toLowerCase();
              input = input.toLowerCase();
              return airlineCode.includes(input) || airlineName.includes(input);
            }}
          />
          <Input
            placeholder="Flight #"
            value={flightNumber}
            onChange={e => setFlightNumber(e.target.value)}
            style={{ width: 120 }}
            maxLength={4}
          />
          <Button
            type="text"
            size="small"
            style={{ padding: 0, marginLeft: 0, marginRight: 4, verticalAlign: 'middle' }}
            icon={isAdvancedOpen ? <UpOutlined /> : <DownOutlined />}
            onClick={() => setIsAdvancedOpen(v => !v)}
            aria-label={isAdvancedOpen ? 'Hide advanced search' : 'Show advanced search'}
          />
          <Button 
            type="primary"
            onClick={handleSearch}
            disabled={!selectedAirline || !flightNumber || seatDataLoading}
            loading={loading}
          >
            Search
          </Button>
        </Space>
        {isAdvancedOpen && (
          <div style={{ marginTop: 16, display: 'flex', gap: 16, alignItems: 'center', flexDirection: 'row' }}>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Origin</div>
              <Select
                {...airportSelectProps}
                value={origin}
                onChange={setOrigin}
                placeholder="Select origin airport..."
                style={{ width: 260 }}
              />
            </div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Arrival</div>
              <Select
                {...airportSelectProps}
                value={arrival}
                onChange={setArrival}
                placeholder="Select arrival airport..."
                style={{ width: 260 }}
              />
            </div>
          </div>
        )}
      </div>
      
      {dataFetched && (
        <div 
          style={{ 
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            marginTop: '20px',
            padding: '24px',
            width: 'fit-content',
            overflow: 'visible',
            backgroundColor: 'white',
            border: '1px solid #f0f0f0'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilterModalVisible(true)}
              disabled={availableVariants.length === 0}
            >
              Filter Variants
            </Button>
          </div>

          <RegistrationCalendar 
            registrationData={getFilteredRegistrationData()} 
            airline={selectedAirline}
            flightNumber={flightNumber}
            seatData={seatData}
          />
        </div>
      )}
      
      {dataFetched && seatData && (
        <>
          <VariantAnalysis
            registrationData={registrationData}
            airline={selectedAirline}
            seatData={seatData}
          />
          <DelayAnalysis
            registrationData={registrationData}
          />
        </>
      )}
      
      <Modal
        title="Filter Aircraft Variants"
        open={filterModalVisible}
        onOk={() => setFilterModalVisible(false)}
        onCancel={() => setFilterModalVisible(false)}
        width={600}
      >
        <Checkbox.Group 
          style={{ width: '100%' }}
          value={selectedVariants}
          onChange={handleVariantChange}
        >
          <Row gutter={[16, 16]}>
            {availableVariants.map(variant => {
              console.log('Rendering variant checkbox:', variant);
              return (
                <Col span={24} key={variant.value}>
                  <Checkbox value={variant.value}>
                    <span style={{ fontWeight: 'bold' }}>
                      {variant.aircraftType} ({variant.value})
                    </span>
                    <span style={{ fontStyle: 'italic', marginLeft: '10px' }}>
                      - {variant.note}
                    </span>
                  </Checkbox>
                </Col>
              );
            })}
          </Row>
        </Checkbox.Group>
        
        {selectedVariants.length > 0 && (
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <Button 
              type="link" 
              onClick={() => setSelectedVariants([])}
            >
              Clear All
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeatTypeViewer; 