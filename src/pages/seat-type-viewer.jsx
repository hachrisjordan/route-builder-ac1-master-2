import React, { useState, useEffect, useMemo } from 'react';
import { Select, Input, Button, Space, Card, message, Typography, Modal, Checkbox, Row, Col } from 'antd';
import { LeftOutlined, RightOutlined, FilterOutlined, BarChartOutlined } from '@ant-design/icons';
import airlines from '../data/airlines_full';
import dayjs from 'dayjs';
import seatAF from '../data/seat_AF.json';

const { Title, Text } = Typography;
const { Option } = Select;
const ALLOWED_AIRLINES = ['JL', 'NH', 'QR', 'AF', 'LH','BA','SQ','EK','KE','AI'];
const STORAGE_BASE_URL = 'https://storage.googleapis.com/exchange-rates-fabled-emblem-451602';

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

// Calendar component exactly matching NormalRouteBuilderCalendar
const RegistrationCalendar = ({ registrationData = [], airline, flightNumber, seatData }) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  
  const goToPrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const year = currentDate.year();
  const month = currentDate.month();
  const monthName = monthNames[month];
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create a map of dates to registration numbers
  const registrationByDate = {};
  registrationData.forEach(item => {
    if (isValidRegistration(item.registration, airline)) {
      registrationByDate[item.date] = item.registration;
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
          const date = new Date(year, month, day);
          const dateStr = date.toISOString().split('T')[0];
          const registration = registrationByDate[dateStr];
          const aircraftDetails = getAircraftDetails(registration, airline, seatData, dateStr);
          
          return (
            <div key={i} style={{
              backgroundColor: 'white',
              padding: '8px',
              minHeight: '150px',
              width: '190px',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'center'
            }}>
              <div style={{ 
                marginBottom: '8px', 
                fontWeight: 'bold',
                paddingBottom: '4px',
                textAlign: 'right'
              }}>
                {day}
              </div>
              {registration && (
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
                        {aircraftDetails.note}
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
            style={{ width: '550px !important', minWidth: '550px', maxWidth: '100%' }}
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
                      {variantCount} out of {totalCount} flights
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
                      {dayStats.variant} out of {dayStats.total} flights
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
          const response = await fetch(`${STORAGE_BASE_URL}/seat_${selectedAirline}.json`);
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
      const response = await fetch(`https://backend-284998006367.us-central1.run.app/api/flightradar24/${selectedAirline}${flightNumber}`);
      
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

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      margin: '24px auto',
      padding: '0 16px'
    }}>
      <Card 
        style={{ 
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          padding: '16px',
          display: 'flex',
          justifyContent: 'center',
          width: 'fit-content'
        }}
      >
        <Space size="middle">
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
            type="primary"
            onClick={handleSearch}
            disabled={!selectedAirline || !flightNumber || seatDataLoading}
            loading={loading}
          >
            Search
          </Button>
        </Space>
      </Card>
      
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
        <VariantAnalysis
          registrationData={registrationData}
          airline={selectedAirline}
          seatData={seatData}
        />
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