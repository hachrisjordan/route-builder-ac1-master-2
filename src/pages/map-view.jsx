import React, { useState, useEffect } from 'react';
import { Select, Dropdown, Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import { airports as airportsData } from '../data/airports';
import airlines from '../data/airlines_full';
import styles from '../styles/MapView.module.css';
import MapboxMap from '../components/map-view/mapbox-map';
import AirlinesFilter from '../components/FlightSearch/calendar/filters/AirlinesFilter';

// Helper function to parse search input
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
          } catch (e) {
            return '';
          }
        }
        return '';
      }
    } else {
      return String(inputValue || '').toLowerCase();
    }
  } catch (error) {
    console.error('Error parsing input value:', error);
    return '';
  }
};

const MapView = () => {
  const [airports, setAirports] = useState({
    departure: null,
    arrival: null
  });
  const [airlinesFilter, setAirlinesFilter] = useState({
    mode: 'include',
    airlines: []
  });
  const [airlinesSearchText, setAirlinesSearchText] = useState('');
  const [availableAirlines, setAvailableAirlines] = useState([]);

  // Transform airports data to array format
  const airportsList = Object.values(airportsData).map(airport => ({
    IATA: airport.IATA,
    CityName: airport.CityName,
    Country: airport.Country,
    Name: airport.Name
  }));

  // Handle airport selection from map
  const handleMapAirportSelect = (selectedAirports) => {
    console.log('Map selected airports:', selectedAirports);
    setAirports(selectedAirports);
  };

  // Handle airport selection from search boxes
  const handleAirportSelect = (type, value) => {
    console.log('Search box selected airport:', { type, value });
    setAirports(prev => {
      const newAirports = { ...prev, [type]: value };
      console.log('New airports state:', newAirports);
      
      // Dispatch event to map component
      window.dispatchEvent(new CustomEvent('parentAirportSelect', {
        detail: newAirports
      }));
      
      return newAirports;
    });
  };

  // Add effect to handle map selection events
  useEffect(() => {
    const handleMapSelection = (e) => {
      console.log('Received map selection event:', e.detail);
      const { selectedAirport } = e.detail;
      
      setAirports(prev => {
        // If no departure is selected, set it as departure
        if (!prev.departure) {
          console.log('Setting as departure:', selectedAirport);
          return { ...prev, departure: selectedAirport };
        }
        // If departure is selected but no arrival, set it as arrival
        else if (!prev.arrival) {
          console.log('Setting as arrival:', selectedAirport);
          return { ...prev, arrival: selectedAirport };
        }
        // If both are selected, update arrival
        else {
          console.log('Updating arrival:', selectedAirport);
          return { ...prev, arrival: selectedAirport };
        }
      });
    };

    window.addEventListener('airportSelected', handleMapSelection);
    return () => window.removeEventListener('airportSelected', handleMapSelection);
  }, []);

  // Add effect to handle map deselection
  useEffect(() => {
    const handleMapDeselection = () => {
      console.log('Map deselected airports');
      setAirports({ departure: null, arrival: null });
    };

    window.addEventListener('airportDeselected', handleMapDeselection);
    return () => window.removeEventListener('airportDeselected', handleMapDeselection);
  }, []);

  // Fetch routes and extract unique airlines
  useEffect(() => {
    fetch('https://storage.googleapis.com/exchange-rates-fabled-emblem-451602/routes.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch routes.geojson');
        return res.json();
      })
      .then(data => {
        // Extract unique airlines from routes
        const uniqueAirlines = new Set();
        data.features.forEach(route => {
          if (route.properties.carrier) {
            uniqueAirlines.add(route.properties.carrier);
          }
        });

        console.log('Found airline codes:', Array.from(uniqueAirlines));

        // Map airline codes to their full data
        const airlinesList = Array.from(uniqueAirlines)
          .map(code => {
            // Find airline by matching the value (which is the IATA code)
            const airline = airlines.find(a => a.value === code);
            if (airline) {
              console.log('Matched airline:', code, airline);
              return {
                code: airline.value,
                name: airline.label
              };
            }
            console.log('No match found for airline code:', code);
            return null;
          })
          .filter(Boolean) // Remove any null entries
          .sort((a, b) => a.name.localeCompare(b.name)); // Sort alphabetically by name

        console.log('Available airlines:', airlinesList);
        setAvailableAirlines(airlinesList);
      })
      .catch(err => {
        console.error('Failed to load routes GeoJSON:', err);
      });
  }, []);

  // Only add individual airports, not groups
  const airportSelectProps = {
    showSearch: true,
    allowClear: true,
    suffixIcon: null,
    options: airportsList.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.CityName} (${airport.Country})`,
      iata: airport.IATA,
      name: airport.Name,
      cityName: airport.CityName,
      country: airport.Country,
      isGroup: false
    })),
    optionRender: (option) => (
      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
        <span style={{ fontWeight: 'bold' }}>{option.value}</span>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {option.data.cityName} ({option.data.country})
        </span>
      </div>
    ),
    filterOption: (input, option) => {
      if (!input) return true;
      const searchText = parseSearchInput(input);
      const iata = String(option.value || '').toLowerCase();
      const label = String(option.label || '').toLowerCase();
      return iata.includes(searchText) || label.includes(searchText);
    },
    filterSort: (optionA, optionB, inputValue) => {
      // Handle case when inputValue is undefined or null
      if (!inputValue) return String(optionA.value || '').localeCompare(String(optionB.value || ''));
      
      // Use the helper function to extract input
      const input = parseSearchInput(inputValue);
      
      // Get IATA codes
      const iataA = String(optionA.value || '').toLowerCase();
      const iataB = String(optionB.value || '').toLowerCase();
      
      // SCORING SYSTEM - higher scores come first
      let scoreA = 0;
      let scoreB = 0;
      
      // Priority 1 (Highest): IATA code exactly matches input
      if (iataA === input) scoreA = 1000;
      if (iataB === input) scoreB = 1000;
      
      // Priority 2: IATA code starts with input
      if (iataA.startsWith(input) && iataA !== input) scoreA = 500;
      if (iataB.startsWith(input) && iataB !== input) scoreB = 500;
      
      // Priority 3: IATA code contains input
      if (iataA.includes(input) && !iataA.startsWith(input)) scoreA = 200;
      if (iataB.includes(input) && !iataB.startsWith(input)) scoreB = 200;
      
      // Priority 4: Label contains input - separated by giving a special score
      // Now check if the labels contain the input
      const labelA = String(optionA.label || '').toLowerCase();
      const labelB = String(optionB.label || '').toLowerCase();
      
      if (scoreA === 0 && labelA.includes(input)) scoreA = 10;
      if (scoreB === 0 && labelB.includes(input)) scoreB = 10;
      
      // Compare scores (higher score first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // If tied on score, sort alphabetically by IATA code
      return String(iataA).localeCompare(String(iataB));
    },
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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Map fills the parent */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapboxMap 
          airlinesFilter={airlinesFilter}
          onAirportSelect={handleMapAirportSelect}
        />
      </div>
      {/* Overlay search bar */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          width: '100%',
          gap: '16px',
        }}
      >
        <div
          style={{
            borderRadius: 8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
            padding: 16,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            background: '#fff',
            pointerEvents: 'auto',
            minWidth: 0,
            maxWidth: '90vw',
          }}
        >
          <div style={{ marginRight: 16 }}>
            <div className={styles.elementLabel}>Departure Airport:</div>
            <Select
              {...airportSelectProps}
              value={airports.departure}
              onChange={(value) => handleAirportSelect('departure', value)}
              placeholder="Select departure airport..."
              className={styles.airportSelect}
              style={{ width: 260, maxWidth: '90vw' }}
            />
          </div>
          <div>
            <div className={styles.elementLabel}>Arrival Airport:</div>
            <Select
              {...airportSelectProps}
              value={airports.arrival}
              onChange={(value) => handleAirportSelect('arrival', value)}
              placeholder="Select arrival airport..."
              className={styles.airportSelect}
              style={{ width: 260, maxWidth: '90vw' }}
            />
          </div>
        </div>

        {/* Airline filter */}
        <div
          style={{
            borderRadius: 8,
            boxShadow: '0 1px 2px rgba(0,0,0,0.10)',
            padding: 16,
            background: '#fff',
            pointerEvents: 'auto',
            minWidth: 0,
            maxWidth: '90vw',
            width: 'fit-content',
          }}
        >
          <div className={styles.elementLabel}>Airlines:</div>
          <Dropdown 
            overlay={
              <AirlinesFilter 
                airlinesFilter={airlinesFilter}
                setAirlinesFilter={setAirlinesFilter}
                airlinesSearchText={airlinesSearchText}
                setAirlinesSearchText={setAirlinesSearchText}
                uniqueAirlines={availableAirlines}
              />
            } 
            trigger={['click']}
          >
            <Button 
              type={airlinesFilter.airlines.length > 0 ? "primary" : "default"}
              size="small"
              icon={<DownOutlined />}
              style={{ 
                fontWeight: airlinesFilter.airlines.length > 0 ? 600 : 400
              }}
          >
              Airlines {airlinesFilter.airlines.length > 0 && `(${airlinesFilter.airlines.length})`}
          </Button>
          </Dropdown>
        </div>
      </div>
    </div>
  );
};

export default MapView; 