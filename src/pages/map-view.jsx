import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Tabs } from 'antd';
import { SearchOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import { airports } from '../data/airports';
import styles from '../styles/MapView.module.css';
import MapboxMap from '../components/map-view/mapbox-map';

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

// Haversine formula to compute distance in miles between two [lon, lat] points
function haversine([lon1, lat1], [lon2, lat2]) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const MapView = () => {
  const [departure, setDeparture] = useState(null);
  const [arrival, setArrival] = useState(null);
  const [routesData, setRoutesData] = useState(null);
  const [displayRoutes, setDisplayRoutes] = useState(null);
  const [selectedPathKey, setSelectedPathKey] = useState(null);

  // Load routes-arcs.geojson on mount
  useEffect(() => {
    fetch('/routes-arcs.geojson')
      .then(res => res.json())
      .then(data => setRoutesData(data))
      .catch(err => console.error('Failed to load routes-arcs.geojson:', err));
  }, []);

  // Only add individual airports, not groups
  const airportSelectProps = {
    showSearch: true,
    allowClear: true,
    suffixIcon: null,
    options: airports.map(airport => ({
      value: airport.IATA,
      label: `${airport.IATA} - ${airport.Name} (${airport.Country})`,
      iata: airport.IATA,
      name: airport.Name,
      country: airport.Country,
      isGroup: false
    })),
    optionRender: (option) => (
      <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
        <span style={{ fontWeight: 'bold' }}>{option.value}</span>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {option.data.name} ({option.data.country})
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

  // Helper to find all direct, 1-stop, and 2-stop routes
  const findRoutes = (departureIata, arrivalIata) => {
    if (!routesData || !routesData.features) return null;
    const features = routesData.features;
    // Index by origin for fast lookup
    const byOrigin = {};
    for (const f of features) {
      const o = f.properties.origin;
      if (!byOrigin[o]) byOrigin[o] = [];
      byOrigin[o].push(f);
    }
    // Get coordinates for direct distance
    const depFeature = features.find(f => f.properties.origin === departureIata) || features.find(f => f.properties.destination === departureIata);
    const arrFeature = features.find(f => f.properties.origin === arrivalIata) || features.find(f => f.properties.destination === arrivalIata);
    let depCoord = null, arrCoord = null;
    if (depFeature) depCoord = depFeature.geometry.coordinates[0];
    if (arrFeature) arrCoord = arrFeature.geometry.coordinates[1];
    if (!depCoord || !arrCoord) return { type: 'FeatureCollection', features: [] };
    const directDistance = haversine(depCoord, arrCoord);

    // Direct
    const direct = features.filter(f => f.properties.origin === departureIata && f.properties.destination === arrivalIata)
      .map(f => ({ ...f, properties: { ...f.properties, routeType: 'direct', pathKey: `${departureIata}-${arrivalIata}` } }));
    // 1-stop
    let onestop = [];
    if (byOrigin[departureIata]) {
      for (const firstLeg of byOrigin[departureIata]) {
        const mid = firstLeg.properties.destination;
        if (mid === departureIata || mid === arrivalIata) continue;
        if (byOrigin[mid]) {
          for (const secondLeg of byOrigin[mid]) {
            if (secondLeg.properties.destination === arrivalIata) {
              const totalDist = (firstLeg.properties.distance_miles || 0) + (secondLeg.properties.distance_miles || 0);
              if (totalDist <= 2 * directDistance) {
                const pathKey = `${departureIata}-${mid}-${arrivalIata}`;
                onestop.push(
                  { ...firstLeg, properties: { ...firstLeg.properties, routeType: 'onestop', stop: mid, leg: 1, pathKey } },
                  { ...secondLeg, properties: { ...secondLeg.properties, routeType: 'onestop', stop: mid, leg: 2, pathKey } }
                );
              }
            }
          }
        }
      }
    }
    // 2-stop
    let twostop = [];
    if (byOrigin[departureIata]) {
      for (const firstLeg of byOrigin[departureIata]) {
        const mid1 = firstLeg.properties.destination;
        if (mid1 === departureIata || mid1 === arrivalIata) continue;
        if (byOrigin[mid1]) {
          for (const secondLeg of byOrigin[mid1]) {
            const mid2 = secondLeg.properties.destination;
            if (mid2 === departureIata || mid2 === arrivalIata || mid2 === mid1) continue;
            if (byOrigin[mid2]) {
              for (const thirdLeg of byOrigin[mid2]) {
                if (thirdLeg.properties.destination === arrivalIata) {
                  const totalDist =
                    (firstLeg.properties.distance_miles || 0) +
                    (secondLeg.properties.distance_miles || 0) +
                    (thirdLeg.properties.distance_miles || 0);
                  if (totalDist <= 2 * directDistance) {
                    const pathKey = `${departureIata}-${mid1}-${mid2}-${arrivalIata}`;
                    twostop.push(
                      { ...firstLeg, properties: { ...firstLeg.properties, routeType: 'twostop', stops: [mid1, mid2], leg: 1, pathKey } },
                      { ...secondLeg, properties: { ...secondLeg.properties, routeType: 'twostop', stops: [mid1, mid2], leg: 2, pathKey } },
                      { ...thirdLeg, properties: { ...thirdLeg.properties, routeType: 'twostop', stops: [mid1, mid2], leg: 3, pathKey } }
                    );
                  }
                }
              }
            }
          }
        }
      }
    }
    // Combine all
    const all = [...direct, ...onestop, ...twostop];
    return {
      type: 'FeatureCollection',
      features: all
    };
  };

  // Extract unique route paths from displayRoutes
  const routePaths = React.useMemo(() => {
    if (!displayRoutes || !displayRoutes.features) return [];
    const pathMap = new Map();
    for (const f of displayRoutes.features) {
      const key = f.properties.pathKey;
      if (!pathMap.has(key)) {
        // Build label: HAN → CDG → PER
        let stops = [];
        if (f.properties.routeType === 'direct') {
          stops = [f.properties.origin, f.properties.destination];
        } else if (f.properties.routeType === 'onestop') {
          stops = [f.properties.origin, f.properties.stop, f.properties.destination];
        } else if (f.properties.routeType === 'twostop') {
          stops = [f.properties.origin, ...(f.properties.stops || []), f.properties.destination];
        }
        const label = stops.join(' → ');
        pathMap.set(key, {
          key,
          label,
          stops,
          routeType: f.properties.routeType,
          numStops: stops.length - 2,
        });
      }
    }
    return Array.from(pathMap.values());
  }, [displayRoutes]);

  // Filter displayRoutes by selectedPathKey if set
  const filteredDisplayRoutes = React.useMemo(() => {
    if (!displayRoutes || !displayRoutes.features) return displayRoutes;
    if (!selectedPathKey) return displayRoutes;
    return {
      type: 'FeatureCollection',
      features: displayRoutes.features.filter(f => f.properties.pathKey === selectedPathKey)
    };
  }, [displayRoutes, selectedPathKey]);

  const handleSearch = () => {
    if (!departure || !arrival) return;
    const result = findRoutes(departure, arrival);
    // Find the minimum number of stops present
    let minStops = 2;
    if (result && result.features.length > 0) {
      const hasDirect = result.features.some(f => f.properties.routeType === 'direct');
      const hasOnestop = result.features.some(f => f.properties.routeType === 'onestop');
      if (hasDirect) minStops = 0;
      else if (hasOnestop) minStops = 1;
    }
    // Filter to only show the minimum stop routes
    const filtered = result && result.features.length > 0
      ? {
          type: 'FeatureCollection',
          features: result.features.filter(f =>
            (minStops === 0 && f.properties.routeType === 'direct') ||
            (minStops === 1 && f.properties.routeType === 'onestop') ||
            (minStops === 2 && f.properties.routeType === 'twostop')
          )
        }
      : result;
    setDisplayRoutes(filtered);
    setSelectedPathKey(null);
    console.log('Searching with:', { departure, arrival, allFound: result, shown: filtered });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Tab bar for route paths */}
      {routePaths.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 20,
          width: 320,
          background: '#fff',
          boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 64,
        }}>
          <Tabs
            tabPosition="left"
            activeKey={selectedPathKey || ''}
            onChange={key => setSelectedPathKey(key === selectedPathKey ? null : key)}
            style={{ height: '100%' }}
            items={routePaths.map((route, idx) => ({
              key: route.key,
              label: (
                <span>
                  {route.label}
                  <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>
                    {route.numStops === 0 ? 'Direct' : `${route.numStops} stop${route.numStops > 1 ? 's' : ''}`}
                  </span>
                </span>
              ),
            }))}
          />
        </div>
      )}
      {/* Map fills the parent */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <MapboxMap displayRoutes={filteredDisplayRoutes} selectedPathKey={selectedPathKey} />
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
          justifyContent: 'center',
          pointerEvents: 'none',
          width: '100%',
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
              value={departure}
              onChange={setDeparture}
              placeholder="Select departure airport..."
              className={styles.airportSelect}
              style={{ width: 260, maxWidth: '90vw' }}
            />
          </div>
          <div style={{ marginRight: 16 }}>
            <div className={styles.elementLabel}>Arrival Airport:</div>
            <Select
              {...airportSelectProps}
              value={arrival}
              onChange={setArrival}
              placeholder="Select arrival airport..."
              className={styles.airportSelect}
              style={{ width: 260, maxWidth: '90vw' }}
            />
          </div>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            className={styles.searchButton}
          >
            Search
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MapView; 