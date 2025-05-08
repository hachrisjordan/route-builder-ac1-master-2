import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import airlines from '../../data/airlines_full';
import { aircraftCodes } from '../../data/aircraft_codes';

// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiYmluYmluaGloaSIsImEiOiJjbWFjcmN4MHIwNms3MndvbHZoNGQ3OTllIn0.lkCw6r7uEE_gEgx3jrs68Q';

// Custom popup class for selected airports
class SelectedPopup extends mapboxgl.Popup {
  constructor(options) {
    super({
      ...options,
      className: 'selected-airport-popup',
      offset: 15,
      anchor: 'bottom'
    });
  }
}

// Custom popup class for hover state
class HoverPopup extends mapboxgl.Popup {
  constructor(options) {
    super({
      ...options,
      className: 'hover-airport-popup',
      offset: 15,
      anchor: 'top'
    });
  }
}

/**
 * MapboxMap displays a responsive Mapbox GL JS map with 3D globe projection and airport markers.
 * Airports are selectable (clickable) and highlight on selection.
 * Hovering animates the marker and shows a popup with city name.
 * Clicking outside any point unselects.
 * Routes are shown when an airport is selected.
 */
const MapboxMap = ({ airlinesFilter, onAirportSelect = () => {}, routesData }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedIataRef = useRef(null);
  const secondIataRef = useRef(null);
  const hoveredIataRef = useRef(null);
  const firstPopupRef = useRef(null);
  const secondPopupRef = useRef(null);
  const hoverPopupRef = useRef(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [airportsGeojson, setAirportsGeojson] = useState(null);
  const [filteredRoutes, setFilteredRoutes] = useState([]);

  // Log state changes
  useEffect(() => {
    console.log('Map State Changed:', {
      selectedIata: selectedIataRef.current,
      secondIata: secondIataRef.current,
      selectedAirport,
      selectedRoute
    });
  }, [selectedAirport, selectedRoute]);

  // Create a function to handle deselection
  const handleDeselect = () => {
    console.log('Deselecting airports');
    
    // Clear all local refs and state
    selectedIataRef.current = null;
    secondIataRef.current = null;
    setSelectedAirport(null);
    setSelectedRoute(null);

    // Remove popups
    if (firstPopupRef.current) firstPopupRef.current.remove();
    if (secondPopupRef.current) secondPopupRef.current.remove();

    // Reset map visual state
    if (mapRef.current) {
      mapRef.current.setLayoutProperty('route-lines', 'visibility', 'none');
      
      // Reset airport colors
      mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
        'case',
        ['==', ['get', 'iata'], hoveredIataRef.current],
        '#00E5FF',
        [
          'match', ['get', 'size'],
          'XL', '#ff3b30',
          'L', '#ff9500',
          'M', '#34c759',
          'S', '#007aff',
          '#007aff'
        ]
      ]);

      // Reset airport sizes
      mapRef.current.setPaintProperty('airport-circles', 'circle-radius', [
        'case',
        ['==', ['get', 'iata'], hoveredIataRef.current],
        6,
        4
      ]);

      // Reset airport opacity
      mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', 1);
    }

    // Hide flight info panel
    const panel = document.querySelector('.flight-info-panel');
    if (panel) {
      panel.classList.remove('visible');
    }

    // Notify parent component to clear both airports
    console.log('Notifying parent: clearing airports');
    onAirportSelect({ departure: null, arrival: null });
  };

  // Make the handler and ref available globally
  useEffect(() => {
    window.handleDeselect = handleDeselect;
    window.selectedIataRef = selectedIataRef;
    return () => {
      delete window.handleDeselect;
      delete window.selectedIataRef;
    };
  }, []);

  // Fetch routes GeoJSON at runtime
  useEffect(() => {
    fetch('https://storage.googleapis.com/exchange-rates-fabled-emblem-451602/routes.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch routes.geojson');
        return res.json();
      })
      .then(data => {
        console.log('Loaded routes GeoJSON:', data.features?.length, 'features');
      })
      .catch(err => {
        console.error('Failed to load routes GeoJSON:', err);
      });
  }, []);

  // Fetch airports GeoJSON at runtime
  useEffect(() => {
    fetch('https://storage.googleapis.com/exchange-rates-fabled-emblem-451602/airports.geojson')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch airports.geojson');
        return res.json();
      })
      .then(data => {
        setAirportsGeojson(data);
        console.log('Loaded airports GeoJSON:', data.features?.length, 'features');
      })
      .catch(err => {
        console.error('Failed to load airports GeoJSON:', err);
      });
  }, []);

  // Update filteredRoutes when airline filter changes
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    // If no airports are selected but airline filter is active
    if (!selectedIataRef.current && airlinesFilter?.airlines?.length > 0) {
      // Get all routes for the selected airlines
      const relevantRoutes = routesData.features.filter(route => {
        if (airlinesFilter.mode === 'include') {
          return airlinesFilter.airlines.includes(route.properties.carrier);
        } else {
          return !airlinesFilter.airlines.includes(route.properties.carrier);
        }
      });

      setFilteredRoutes(relevantRoutes);

      // Get all airports that have routes with ANY of the selected airlines
      const relevantAirports = new Set();
      relevantRoutes.forEach(route => {
        relevantAirports.add(route.properties.from);
        relevantAirports.add(route.properties.to);
      });

      console.log('Relevant airports for airlines:', Array.from(relevantAirports));

      // Update airport opacity
      mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', [
        'case',
        ['in', ['get', 'iata'], ['literal', Array.from(relevantAirports)]],
        1,
        0.2
      ]);

      // Hide all routes
      mapRef.current.setLayoutProperty('route-lines', 'visibility', 'none');
    } else if (selectedIataRef.current) {
      // If an airport is selected, use the existing filter logic
      filterRoutesByAirport(selectedIataRef.current);
    } else {
      // If no filter is active, reset everything
      setFilteredRoutes([]);
      mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', 1);
      mapRef.current.setLayoutProperty('route-lines', 'visibility', 'none');
    }
  }, [airlinesFilter, routesData]);

  // Update filteredRoutes when an airport is selected
  const filterRoutesByAirport = (iata) => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    if (!mapRef.current.getLayer('route-lines')) {
      console.log('Route layer not yet initialized');
      return;
    }
    console.log('Filtering routes for airport:', iata);
    if (!iata) {
      mapRef.current.setFilter('route-lines', ['==', ['get', 'from'], '']);
      setFilteredRoutes([]);
      return;
    }

    // Base filter for airport
    const airportFilter = [
      'any',
      ['==', ['get', 'from'], iata],
      ['==', ['get', 'to'], iata]
    ];

    // If no airline filter is active, just use the airport filter
    if (!airlinesFilter?.airlines?.length) {
      mapRef.current.setFilter('route-lines', airportFilter);
      
      // Get all routes from the selected airport
      const routes = routesData.features.filter(f => 
        f.properties.from === iata || f.properties.to === iata
      );
      setFilteredRoutes(routes);

      // Get unique connected airports
      const connectedAirports = new Set();
      routes.forEach(route => {
        if (route.properties.from === iata) {
          connectedAirports.add(route.properties.to);
        } else {
          connectedAirports.add(route.properties.from);
        }
      });

      // Update airport opacity
      mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', [
        'case',
        ['==', ['get', 'iata'], iata],
        1,
        ['in', ['get', 'iata'], ['literal', Array.from(connectedAirports)]],
        1,
        0.2
      ]);
      return;
    }

    // Combine airport filter with airline filter
    const combinedFilter = [
      'all',
      airportFilter,
      [
        airlinesFilter.mode === 'include' ? 'any' : 'none',
        ...airlinesFilter.airlines.map(airline => ['==', ['get', 'carrier'], airline])
      ]
    ];

    console.log('Applying combined filter:', JSON.stringify(combinedFilter));
    mapRef.current.setFilter('route-lines', combinedFilter);

    // Get filtered routes
    const routes = routesData.features.filter(f => {
      const matchesAirport = f.properties.from === iata || f.properties.to === iata;
      const matchesAirline = airlinesFilter.mode === 'include' 
        ? airlinesFilter.airlines.includes(f.properties.carrier)
        : !airlinesFilter.airlines.includes(f.properties.carrier);
      return matchesAirport && matchesAirline;
    });
    setFilteredRoutes(routes);

    // Get unique connected airports from filtered routes
    const connectedAirports = new Set();
    routes.forEach(route => {
      if (route.properties.from === iata) {
        connectedAirports.add(route.properties.to);
      } else {
        connectedAirports.add(route.properties.from);
      }
    });

    // Update airport opacity based on filtered routes
    mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', [
      'case',
      ['==', ['get', 'iata'], iata],
      1,
      ['in', ['get', 'iata'], ['literal', Array.from(connectedAirports)]],
      1,
      0.2
    ]);
  };

  // Create the map only once
  useEffect(() => {
    if (!mapContainerRef.current || !routesData || !airportsGeojson) return;

    // Initialize popups with custom classes
    firstPopupRef.current = new SelectedPopup({
      closeButton: false,
      closeOnClick: false
    });

    secondPopupRef.current = new SelectedPopup({
      closeButton: false,
      closeOnClick: false
    });

    hoverPopupRef.current = new HoverPopup({
      closeButton: false,
      closeOnClick: false
    });

    // Add custom styles for popups and side panel
    const style = document.createElement('style');
    style.textContent = `
      .selected-airport-popup .mapboxgl-popup-content {
        font-size: 13px;
        font-weight: 600;
        color: #9B59B6;
        background: white;
        padding: 8px 32px 8px 12px;
        border-radius: 6px;
        box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        border: 2px solid #9B59B6;
        position: relative;
        min-width: 100px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .selected-airport-popup .mapboxgl-popup-tip {
        display: none;
      }
      .selected-airport-popup .close-button {
        position: absolute;
        right: 6px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #9B59B6;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        padding: 0;
        border: none;
        flex-shrink: 0;
      }
      .selected-airport-popup .close-button:hover {
        background: #8e44ad;
      }
      .hover-airport-popup .mapboxgl-popup-content {
        font-size: 12px;
        font-weight: 500;
        color: #666;
        background: rgba(255, 255, 255, 0.95);
        padding: 6px 10px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border: 1px solid #eee;
        min-width: 80px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .hover-airport-popup .mapboxgl-popup-tip {
        display: none;
      }
      .flight-info-panel {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 600px;
        background: white;
        box-shadow: 2px 0 8px rgba(0,0,0,0.1);
        z-index: 1;
        padding: 20px;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        overflow-y: auto;
      }
      .flight-info-panel.visible {
        transform: translateX(0);
      }
      .flight-info-panel h3 {
        margin: 20px 0 12px;
        color: #333;
        font-size: 18px;
        font-weight: 600;
        padding-bottom: 8px;
        border-bottom: 1px solid #f0f0f0;
      }
      .flight-info-panel h3:first-child {
        margin-top: 0;
      }
      .flight-card {
        background: #fff;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        border: 1px solid #eee;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .flight-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      }
      .flight-route {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
        padding-bottom: 4px;
        border-bottom: 1px solid #f0f0f0;
      }
      .flight-route .route {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      .flight-route .airline {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .flight-route .airline-logo {
        width: 24px;
        height: 24px;
        object-fit: contain;
        border-radius: 4px;
      }
      .flight-route .airline-name {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }
      .flight-details {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      .flight-detail {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .flight-detail-label {
        font-size: 12px;
        color: #666;
        font-weight: 500;
      }
      .flight-detail-value {
        font-size: 14px;
        color: #333;
        font-weight: 500;
      }
      .flight-detail-value.aircraft {
        color: #9B59B6;
      }
      .flight-detail-value.duration {
        color: #2ecc71;
      }
      .flight-detail-value.distance {
        color: #3498db;
      }
      .flight-legs {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 12px 0;
        padding: 12px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .flight-leg {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .leg-route {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 4px;
      }
      .leg-details {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .leg-detail {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .leg-detail-label {
        font-size: 11px;
        color: #666;
        font-weight: 500;
      }
      .leg-detail-value {
        font-size: 13px;
        color: #333;
        font-weight: 500;
      }
      .total-duration {
        font-size: 14px;
        color: #666;
        font-weight: 500;
      }
      .total-distance {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #eee;
        font-size: 13px;
        color: #666;
        font-weight: 500;
        text-align: right;
      }
      .leg-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 8px;
      }
      .airline-logos {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .leg-distance {
        color: #666;
        font-size: 13px;
        font-weight: 500;
      }
      .airline-logo-container {
        cursor: pointer;
      }
      .airline-logo {
        width: 32px;
        height: 32px;
        object-fit: contain;
        border-radius: 4px;
        border: 2px solid transparent;
        transition: border-color 0.2s ease;
      }
      .airline-logo:hover {
        border-color: #9B59B6;
      }
      .airline-details {
        display: none;
        background: #f8f9fa;
        border-radius: 8px;
        padding: 12px;
        margin-top: 12px;
        transition: all 0.3s ease;
      }
      .airline-details.expanded {
        display: block;
      }
      .airline-details .airline-name {
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
      }
      .airline-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .info-item {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
      }
      .info-item .label {
        color: #666;
      }
      .info-item .value {
        color: #333;
        font-weight: 500;
      }
      .route-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        transition: background-color 0.2s ease;
      }
      .route-info:hover {
        background-color: #f8f9fa;
      }
      .route {
        font-weight: 500;
        color: #333;
      }
      .right-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    `;
    document.head.appendChild(style);

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [105.854444, 21.028511],
      zoom: 3,
      attributionControl: false,
      projection: 'globe',
    });

    mapRef.current.on('style.load', () => {
      if (mapRef.current.getProjection().name !== 'globe') {
        mapRef.current.setProjection('globe');
      }

      // Hide all layers except land, sea, background, hillshade, and country borders
      const style = mapRef.current.getStyle();
      if (style && style.layers) {
        style.layers.forEach(layer => {
          const id = layer.id || '';
          if (
            !id.includes('background') &&
            !id.includes('hillshade') &&
            !id.includes('admin-0-boundary') &&
            !id.includes('land') &&
            !id.includes('water') &&
            !id.includes('ocean')
          ) {
            mapRef.current.setLayoutProperty(id, 'visibility', 'none');
          }
        });
      }

      // Add airports source without clustering
      if (!mapRef.current.getSource('airports')) {
        mapRef.current.addSource('airports', {
          type: 'geojson',
          data: airportsGeojson
        });
      }

      // Add routes source and line layer (initially hidden)
      if (!mapRef.current.getSource('routes')) {
        console.log('Adding routes source');
        mapRef.current.addSource('routes', {
          type: 'geojson',
          data: routesData,
        });
      }

      mapRef.current.on('sourcedata', (e) => {
        if (e.sourceId === 'routes' && e.isSourceLoaded) {
          console.log('Routes source loaded');
          if (!mapRef.current.getLayer('route-lines')) {
            console.log('Adding route lines layer');
            mapRef.current.addLayer({
              id: 'route-lines',
              type: 'line',
              source: 'routes',
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
                'visibility': 'none'  // Hide routes by default
              },
              paint: {
                'line-color': '#000',
                'line-width': 2,
                'line-blur': 0.5,
                'line-opacity': 1
              },
            }, 'airport-circles');

            // If there's a selected airport, apply the filter
            if (selectedIataRef.current) {
              filterRoutesByAirport(selectedIataRef.current);
            }
          }
        }
      });

      // Add airport markers layer
      if (!mapRef.current.getLayer('airport-circles')) {
        mapRef.current.addLayer({
          id: 'airport-circles',
          type: 'circle',
          source: 'airports',
          paint: {
            'circle-color': [
              'case',
              ['==', ['get', 'iata'], selectedIataRef.current],
              '#9B59B6',
              ['==', ['get', 'iata'], hoveredIataRef.current],
              '#00E5FF',
              [
                'match', ['get', 'size'],
                'XL', '#ff3b30',
                'L', '#ff9500',
                'M', '#34c759',
                'S', '#007aff',
                '#007aff'
              ]
            ],
            'circle-radius': [
              'case',
              ['==', ['get', 'iata'], selectedIataRef.current],
              8,
              ['==', ['get', 'iata'], hoveredIataRef.current],
              6,
              4
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': '#fff',
            'circle-opacity': [
              'case',
              ['==', ['get', 'iata'], selectedIataRef.current],
              1,
              ['in', ['get', 'iata'], ['literal', []]],
              1,
              0.2
            ]
          }
        });
      }

      // Cursor pointer on hover
      mapRef.current.on('mouseenter', 'airport-circles', (e) => {
        mapRef.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const iata = feature.properties.iata;
          
          // Only show hover popup if this is not the selected airport
          if (iata !== selectedIataRef.current) {
            const cityName = feature.properties.cityName;
            hoverPopupRef.current
              .setLngLat(feature.geometry.coordinates)
              .setHTML(`${cityName} (${iata})`)
              .addTo(mapRef.current);
          }

          hoveredIataRef.current = iata;
          // Animate color only
          mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
            'case',
              ['==', ['get', 'iata'], selectedIataRef.current], '#9B59B6',
              ['==', ['get', 'iata'], iata], '#00E5FF',
              [
                'match', ['get', 'size'],
                'XL', '#ff3b30',
                'L', '#ff9500',
                'M', '#34c759',
                'S', '#007aff',
                '#007aff'
              ]
          ]);
        }
      });

      mapRef.current.on('mouseleave', 'airport-circles', (e) => {
        mapRef.current.getCanvas().style.cursor = '';
        hoveredIataRef.current = null;
        
        // Only remove hover popup
        hoverPopupRef.current.remove();
        
        mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
          'case',
            ['==', ['get', 'iata'], selectedIataRef.current], '#9B59B6',
            [
              'match', ['get', 'size'],
              'XL', '#ff3b30',
              'L', '#ff9500',
              'M', '#34c759',
              'S', '#007aff',
              '#007aff'
            ]
        ]);
      });

      // Modify the click handler for airport selection
      mapRef.current.on('click', 'airport-circles', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const iata = feature.properties.iata;
          const cityName = feature.properties.cityName;
          
          console.log('Airport clicked:', {
            iata,
            currentSelected: selectedIataRef.current,
            currentSecond: secondIataRef.current
          });
          
          if (selectedIataRef.current === iata || secondIataRef.current === iata) {
            console.log('Clicking selected airport - deselecting');
            handleDeselect();
            return;
          }

          if (selectedIataRef.current) {
            console.log('Setting second airport:', iata);
            // If first airport is selected, set this as second airport
            secondIataRef.current = iata;
            
            // Notify parent component about both airports
            console.log('Notifying parent: setting both airports', {
              departure: selectedIataRef.current,
              arrival: iata
            });
            onAirportSelect({
              departure: selectedIataRef.current,
              arrival: iata
            });
            
            // Also dispatch event for backward compatibility
            window.dispatchEvent(new CustomEvent('airportSelected', {
              detail: { selectedAirport: iata }
            }));
            
            // Show second airport popup
            secondPopupRef.current
              .setLngLat(feature.geometry.coordinates)
              .setHTML(`
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="overflow: hidden; text-overflow: ellipsis;">${cityName} (${iata})</span>
                  <button class="close-button" onclick="window.handleDeselect()">×</button>
                </div>
              `)
              .addTo(mapRef.current);

            // Update airport colors
          mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
            'case',
              ['==', ['get', 'iata'], selectedIataRef.current], '#9B59B6',
              ['==', ['get', 'iata'], iata], '#9B59B6',
              ['==', ['get', 'iata'], hoveredIataRef.current], '#00E5FF',
              [
                'match', ['get', 'size'],
                'XL', '#ff3b30',
                'L', '#ff9500',
                'M', '#34c759',
                'S', '#007aff',
                '#007aff'
              ]
          ]);

            // Update airport sizes
            mapRef.current.setPaintProperty('airport-circles', 'circle-radius', [
              'case',
              ['==', ['get', 'iata'], selectedIataRef.current], 8,
              ['==', ['get', 'iata'], iata], 8,
              ['==', ['get', 'iata'], hoveredIataRef.current], 6,
              4
            ]);
            
            // Find and highlight the route between them
            const route = routesData.features.find(f => 
              (f.properties.from === selectedIataRef.current && f.properties.to === iata) ||
              (f.properties.from === iata && f.properties.to === selectedIataRef.current)
            );

            console.log('Direct route search:', {
              from: selectedIataRef.current,
              to: iata,
              found: !!route,
              totalRoutes: routesData.features.length
            });

            // Find one-stop routes
            const fromAirport = airportsGeojson.features.find(f => f.properties.iata === selectedIataRef.current);
            const toAirport = airportsGeojson.features.find(f => f.properties.iata === iata);
            
            console.log('Finding one-stop routes:', {
              from: fromAirport?.properties.iata,
              to: toAirport?.properties.iata,
              fromFound: !!fromAirport,
              toFound: !!toAirport
            });

            const oneStopRoutes = findOneStopRoutes(fromAirport, toAirport, routesData, airportsGeojson);

            console.log('One-stop routes found:', {
              count: oneStopRoutes.length,
              routes: oneStopRoutes.map(r => ({
                via: r.connection.properties.iata,
                firstLeg: `${r.firstLeg.properties.from}-${r.firstLeg.properties.to}`,
                secondLeg: `${r.secondLeg.properties.from}-${r.secondLeg.properties.to}`
              }))
            });

            // Sort one-stop routes by total duration
            const sortedOneStopRoutes = [...oneStopRoutes].sort((a, b) => 
              a.totalDuration - b.totalDuration
            );

            // If no direct routes and fewer than 5 one-stop routes, find two-stop routes
            let sortedTwoStopRoutes = [];
            if (!route && sortedOneStopRoutes.length < 5) {
              console.log('No direct routes and fewer than 5 one-stop routes, finding two-stop routes');
              const twoStopRoutes = findTwoStopRoutes(fromAirport, toAirport, routesData, airportsGeojson);
              console.log('Two-stop routes found:', {
                count: twoStopRoutes.length,
                routes: twoStopRoutes.map(r => ({
                  via: `${r.firstConnection.properties.iata}-${r.secondConnection.properties.iata}`,
                  firstLeg: `${r.firstLeg.properties.from}-${r.firstLeg.properties.to}`,
                  secondLeg: `${r.secondLeg.properties.from}-${r.secondLeg.properties.to}`,
                  finalLeg: `${r.finalLeg.properties.from}-${r.finalLeg.properties.to}`
                }))
              });
              sortedTwoStopRoutes = [...twoStopRoutes].sort((a, b) => a.totalDuration - b.totalDuration);
            }

            if (route) {
              setSelectedRoute(route);
              
              // Find all unique routes from first to second airport only
              const allRoutes = routesData.features.filter(f => 
                f.properties.from === selectedIataRef.current && f.properties.to === iata
              );

              console.log('All routes found:', {
                count: allRoutes.length,
                routes: allRoutes.map(r => ({
                  from: r.properties.from,
                  to: r.properties.to,
                  carrier: r.properties.carrier
                }))
              });

              // Remove duplicate routes (same carrier and aircraft)
              const uniqueRoutes = allRoutes.reduce((acc, route) => {
                const key = `${route.properties.carrier}-${route.properties.aircraft_codes}`;
                if (!acc[key]) {
                  acc[key] = route;
                }
                return acc;
              }, {});

              console.log('Unique routes:', {
                count: Object.keys(uniqueRoutes).length,
                routes: Object.values(uniqueRoutes).map(r => ({
                  from: r.properties.from,
                  to: r.properties.to,
                  carrier: r.properties.carrier
                }))
              });

              // Filter routes based on airline filter if active
              const filteredRoutes = Object.values(uniqueRoutes).filter(route => {
                if (!airlinesFilter?.airlines?.length) return true;
                
                if (airlinesFilter.mode === 'include') {
                  return airlinesFilter.airlines.includes(route.properties.carrier);
                } else {
                  return !airlinesFilter.airlines.includes(route.properties.carrier);
                }
              });

              console.log('Filtered routes:', {
                count: filteredRoutes.length,
                routes: filteredRoutes.map(r => ({
                  from: r.properties.from,
                  to: r.properties.to,
                  carrier: r.properties.carrier
                }))
              });

              // Sort direct routes by duration
              const sortedDirectRoutes = [...filteredRoutes].sort((a, b) => 
                a.properties.duration - b.properties.duration
              );

              // Show flight info panel
              const panel = document.querySelector('.flight-info-panel');
              if (panel) {
                const formatDuration = (minutes) => {
                  const hours = Math.floor(minutes / 60);
                  const remainingMinutes = minutes % 60;
                  return `${hours}h ${remainingMinutes}m`;
                };

                const formatDistance = (miles) => {
                  const kilometers = (miles * 1.60934).toFixed(1);
                  return `${miles.toFixed(1)} mi (${kilometers} km)`;
                };

                const getAirlineInfo = (code) => {
                  const airline = airlines.find(a => a.value === code);
                  return {
                    name: airline.label,
                    logo: `/${code.toLowerCase()}.png`
                  };
                };

                const getAircraftInfo = (code) => {
                  return aircraftCodes[code] || code;
                };

                panel.innerHTML = `
                  <h3>Direct Flights</h3>
                  ${sortedDirectRoutes.map((route, index) => {
                    const airline = getAirlineInfo(route.properties.carrier);
                    const aircraftList = route.properties.aircraft_codes.split(',').map(code => getAircraftInfo(code.trim())).join('<br>');
                    return `
                      <div class="flight-card">
                        <div class="flight-route">
                          <div class="route">${route.properties.from} → ${route.properties.to}</div>
                          <div class="airline">
                            <img src="${airline.logo}" alt="${airline.name}" class="airline-logo" />
                            <span class="airline-name">${airline.name}</span>
                          </div>
                        </div>
                        <div class="flight-details">
                          <div class="flight-detail">
                            <div class="flight-detail-label">Duration</div>
                            <div class="flight-detail-value duration">${formatDuration(route.properties.duration)}</div>
                          </div>
                          <div class="flight-detail">
                            <div class="flight-detail-label">Aircraft</div>
                            <div class="flight-detail-value aircraft">${aircraftList}</div>
                          </div>
                          <div class="flight-detail">
                            <div class="flight-detail-label">Distance</div>
                            <div class="flight-detail-value distance">${formatDistance(route.properties.distance)}</div>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}

                  ${sortedOneStopRoutes.length > 0 ? `
                    <h3>Other Options</h3>
                    ${sortedOneStopRoutes.map((route, index) => {
                      // Get all unique airlines for each leg
                      const firstLegAirlines = new Map();
                      const secondLegAirlines = new Map();

                      route.firstLegOptions.forEach(leg => {
                        if (!firstLegAirlines.has(leg.properties.carrier)) {
                          firstLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });

                      route.secondLegOptions.forEach(leg => {
                        if (!secondLegAirlines.has(leg.properties.carrier)) {
                          secondLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });
                      
                      return `
                        <div class="flight-card one-stop-route" 
                             data-index="${index}"
                             onmouseenter="window.mapRef.current.setFilter('route-lines', [
                               'any',
                               ['all', ['==', ['get', 'from'], '${route.firstLeg.properties.from}'], ['==', ['get', 'to'], '${route.firstLeg.properties.to}']],
                               ['all', ['==', ['get', 'from'], '${route.secondLeg.properties.from}'], ['==', ['get', 'to'], '${route.secondLeg.properties.to}']]
                             ]); window.mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');"
                             onmouseleave="window.mapRef.current.setFilter('route-lines', [
                               'any',
                               ['all', 
                                 ['==', ['get', 'from'], '${selectedIataRef.current}'],
                                 ['==', ['get', 'to'], '${secondIataRef.current}']
                               ],
                               ['all',
                                 ['==', ['get', 'from'], '${secondIataRef.current}'],
                                 ['==', ['get', 'to'], '${selectedIataRef.current}']
                               ]
                             ]);">
                          <div class="flight-route collapsed-view" onclick="this.parentElement.classList.toggle('expanded')">
                            <div class="route">Via ${route.connection.properties.cityName}</div>
                            <div class="total-duration">${formatDuration(route.totalDuration)}</div>
                          </div>
                          <div class="flight-legs">
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.firstLeg.properties.from} → ${route.firstLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(firstLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#first-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.firstLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(firstLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="first-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.secondLeg.properties.from} → ${route.secondLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(secondLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#second-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.secondLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(secondLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="second-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                          </div>
                          <div class="total-distance">
                            Total Distance: ${formatDistance(route.totalDistance)}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  ` : ''}
                `;

                // Add styles for the new layout
                const style = document.createElement('style');
                style.textContent = `
                  .one-stop-route {
                    cursor: pointer;
                    transition: background-color 0.2s ease;
                  }

                  .one-stop-route:hover {
                    background-color: #f8f9fa;
                  }

                  .one-stop-route .flight-legs,
                  .one-stop-route .total-distance {
                    display: none;
                  }
                  .one-stop-route.expanded .flight-legs,
                  .one-stop-route.expanded .total-distance {
                    display: block;
                  }
                  .one-stop-route .collapsed-view {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    margin-bottom: 0;
                  }
                  .one-stop-route .collapsed-view .route {
                    flex: 1;
                  }
                  .one-stop-route .collapsed-view .total-duration {
                    margin-left: auto;
                    margin-right: 8px;
                    font-weight: 500;
                    color: #666;
                  }
                  .one-stop-route .collapsed-view:hover {
                    background: #e9ecef;
                  }
                  .one-stop-route .collapsed-view::after {
                    content: '▼';
                    font-size: 12px;
                    color: #666;
                    transition: transform 0.2s ease;
                  }
                  .one-stop-route.expanded .collapsed-view::after {
                    transform: rotate(180deg);
                  }
                  .flight-legs {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin: 16px 0;
                    padding: 16px;
                    background: #f8f9fa;
                    border-radius: 8px;
                  }
                  .flight-leg {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding: 16px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                  }
                  .flight-leg:not(:last-child) {
                    border-bottom: 1px dashed #e9ecef;
                    padding-bottom: 20px;
                  }
                  .flight-leg .leg-route {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                  }
                  .airline-logos {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                  }
                  .airline-logo-container {
                    position: relative;
                    cursor: pointer;
                  }
                  .airline-logo-container .airline-logo {
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                    border-radius: 4px;
                    border: 2px solid transparent;
                    transition: border-color 0.2s ease;
                  }
                  .airline-logo-container:hover .airline-logo {
                    border-color: #9B59B6;
                  }
                  .airline-logo-container .airline-details {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    padding: 12px;
                    min-width: 200px;
                    z-index: 10;
                    margin-top: 8px;
                  }
                  .airline-logo-container.expanded .airline-details {
                    display: block;
                  }
                  .airline-details::before {
                    content: '';
                    position: absolute;
                    top: -6px;
                    left: 50%;
                    transform: translateX(-50%);
                    border-left: 6px solid transparent;
                    border-right: 6px solid transparent;
                    border-bottom: 6px solid white;
                  }
                  .airline-details .airline-name {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 8px;
                    text-align: center;
                  }
                  .airline-info {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                  }
                  .info-item {
                    display: flex;
                    justify-content: space-between;
                    font-size: 13px;
                  }
                  .info-item .label {
                    color: #666;
                  }
                  .info-item .value {
                    color: #333;
                    font-weight: 500;
                  }
                  .total-distance {
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid #e9ecef;
                    font-size: 13px;
                    color: #666;
                    font-weight: 500;
                    text-align: right;
                  }
                `;
                document.head.appendChild(style);

                panel.classList.add('visible');
              }

              // Highlight only the selected routes
              mapRef.current.setFilter('route-lines', [
                'any',
                ...filteredRoutes.map(route => [
                  'all',
                  ['==', ['get', 'from'], route.properties.from],
                  ['==', ['get', 'to'], route.properties.to]
                ])
              ]);
              mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');

              // Update airport opacity based on filtered routes
              mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', [
                'case',
                ['in', ['get', 'iata'], ['literal', [selectedIataRef.current, iata]]],
                1,
                0.2
              ]);
            } else {
              // No direct routes, show one-stop and two-stop routes
              const panel = document.querySelector('.flight-info-panel');
              if (panel) {
                const formatDuration = (minutes) => {
                  const hours = Math.floor(minutes / 60);
                  const remainingMinutes = minutes % 60;
                  return `${hours}h ${remainingMinutes}m`;
                };

                const formatDistance = (miles) => {
                  const kilometers = (miles * 1.60934).toFixed(1);
                  return `${miles.toFixed(1)} mi (${kilometers} km)`;
                };

                const getAirlineInfo = (code) => {
                  const airline = airlines.find(a => a.value === code);
                  return {
                    name: airline.label,
                    logo: `/${code.toLowerCase()}.png`
                  };
                };

                const getAircraftInfo = (code) => {
                  return aircraftCodes[code] || code;
                };

                panel.innerHTML = `
                  ${sortedOneStopRoutes.length > 0 ? `
                    <h3>Available Routes</h3>
                    ${sortedOneStopRoutes.map((route, index) => {
                      // Get all unique airlines for each leg
                      const firstLegAirlines = new Map();
                      const secondLegAirlines = new Map();

                      route.firstLegOptions.forEach(leg => {
                        if (!firstLegAirlines.has(leg.properties.carrier)) {
                          firstLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });

                      route.secondLegOptions.forEach(leg => {
                        if (!secondLegAirlines.has(leg.properties.carrier)) {
                          secondLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });
                      
                      return `
                        <div class="flight-card one-stop-route" 
                             data-index="${index}"
                             onmouseenter="window.mapRef.current.setFilter('route-lines', [
                               'any',
                               ['all', ['==', ['get', 'from'], '${route.firstLeg.properties.from}'], ['==', ['get', 'to'], '${route.firstLeg.properties.to}']],
                               ['all', ['==', ['get', 'from'], '${route.secondLeg.properties.from}'], ['==', ['get', 'to'], '${route.secondLeg.properties.to}']]
                             ]); window.mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');"
                             onmouseleave="window.mapRef.current.setFilter('route-lines', [
                               'any',
                               ['all', 
                                 ['==', ['get', 'from'], '${selectedIataRef.current}'],
                                 ['==', ['get', 'to'], '${secondIataRef.current}']
                               ],
                               ['all',
                                 ['==', ['get', 'from'], '${secondIataRef.current}'],
                                 ['==', ['get', 'to'], '${selectedIataRef.current}']
                               ]
                             ]);">
                          <div class="flight-route collapsed-view" onclick="this.parentElement.classList.toggle('expanded')">
                            <div class="route">Via ${route.connection.properties.cityName}</div>
                            <div class="total-duration">${formatDuration(route.totalDuration)}</div>
                          </div>
                          <div class="flight-legs">
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.firstLeg.properties.from} → ${route.firstLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(firstLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#first-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.firstLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(firstLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="first-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.secondLeg.properties.from} → ${route.secondLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(secondLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#second-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.secondLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(secondLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="second-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                          </div>
                          <div class="total-distance">
                            Total Distance: ${formatDistance(route.totalDistance)}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  ` : ''}

                  ${sortedTwoStopRoutes.length > 0 ? `
                    <h3>Other Options</h3>
                    ${sortedTwoStopRoutes.map((route, index) => {
                      // Get all unique airlines for each leg
                      const firstLegAirlines = new Map();
                      const secondLegAirlines = new Map();
                      const finalLegAirlines = new Map();

                      route.firstLegOptions.forEach(leg => {
                        if (!firstLegAirlines.has(leg.properties.carrier)) {
                          firstLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });

                      route.secondLegOptions.forEach(leg => {
                        if (!secondLegAirlines.has(leg.properties.carrier)) {
                          secondLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });

                      route.finalLegOptions.forEach(leg => {
                        if (!finalLegAirlines.has(leg.properties.carrier)) {
                          finalLegAirlines.set(leg.properties.carrier, {
                            airline: getAirlineInfo(leg.properties.carrier),
                            duration: leg.properties.duration,
                            aircraft: getAircraftInfo(leg.properties.aircraft_codes.split(',')[0]),
                            distance: leg.properties.distance
                          });
                        }
                      });
                      
                      return `
                        <div class="flight-card one-stop-route" 
                             data-index="${index}"
                             onmouseenter="window.mapRef.current.setFilter('route-lines', [
                               'any',
                               ['all', ['==', ['get', 'from'], '${route.firstLeg.properties.from}'], ['==', ['get', 'to'], '${route.firstLeg.properties.to}']],
                               ['all', ['==', ['get', 'from'], '${route.secondLeg.properties.from}'], ['==', ['get', 'to'], '${route.secondLeg.properties.to}']],
                               ['all', ['==', ['get', 'from'], '${route.finalLeg.properties.from}'], ['==', ['get', 'to'], '${route.finalLeg.properties.to}']]
                             ]); window.mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');"
                             onmouseleave="window.mapRef.current.setFilter('route-lines', [
                               'any',
                               ['all', 
                                 ['==', ['get', 'from'], '${selectedIataRef.current}'],
                                 ['==', ['get', 'to'], '${secondIataRef.current}']
                               ],
                               ['all',
                                 ['==', ['get', 'from'], '${secondIataRef.current}'],
                                 ['==', ['get', 'to'], '${selectedIataRef.current}']
                               ]
                             ]);">
                          <div class="flight-route collapsed-view" onclick="this.parentElement.classList.toggle('expanded')">
                            <div class="route">Via ${route.firstConnection.properties.cityName} and ${route.secondConnection.properties.cityName}</div>
                            <div class="total-duration">${formatDuration(route.totalDuration)}</div>
                          </div>
                          <div class="flight-legs">
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.firstLeg.properties.from} → ${route.firstLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(firstLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#first-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.firstLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(firstLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="first-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.secondLeg.properties.from} → ${route.secondLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(secondLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#second-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.secondLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(secondLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="second-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                            <div class="flight-leg">
                              <div class="leg-route">
                                <div class="route-info">
                                  <div class="route">${route.finalLeg.properties.from} → ${route.finalLeg.properties.to}</div>
                                  <div class="right-content">
                                    <div class="airline-logos">
                                      ${Array.from(finalLegAirlines.values()).map((option, i) => `
                                        <div class="airline-logo-container">
                                          <img src="${option.airline.logo}" 
                                               alt="${option.airline.name}" 
                                               class="airline-logo"
                                               onclick="event.stopPropagation(); document.querySelector('#final-leg-airline-${index}-${i}').classList.toggle('expanded')" />
                                        </div>
                                      `).join('')}
                                    </div>
                                    <div class="leg-distance">${formatDistance(route.finalLeg.properties.distance)}</div>
                                  </div>
                                </div>
                                ${Array.from(finalLegAirlines.values()).map((option, i) => `
                                  <div class="airline-details" id="final-leg-airline-${index}-${i}">
                                    <div class="airline-name">${option.airline.name}</div>
                                    <div class="airline-info">
                                      <div class="info-item">
                                        <span class="label">Duration:</span>
                                        <span class="value">${formatDuration(option.duration)}</span>
                                      </div>
                                      <div class="info-item">
                                        <span class="label">Aircraft:</span>
                                        <span class="value">${option.aircraft}</span>
                                      </div>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            </div>
                          </div>
                          <div class="total-distance">
                            Total Distance: ${formatDistance(route.totalDistance)}
                          </div>
                        </div>
                      `;
                    }).join('')}
                  ` : ''}
                `;

                panel.classList.add('visible');
              }

              // Show all one-stop and two-stop routes on the map
              const routeFilters = [
                ...sortedOneStopRoutes.map(route => [
                  'any',
                  ['all', ['==', ['get', 'from'], route.firstLeg.properties.from], ['==', ['get', 'to'], route.firstLeg.properties.to]],
                  ['all', ['==', ['get', 'from'], route.secondLeg.properties.from], ['==', ['get', 'to'], route.secondLeg.properties.to]]
                ]),
                ...sortedTwoStopRoutes.map(route => [
                  'any',
                  ['all', ['==', ['get', 'from'], route.firstLeg.properties.from], ['==', ['get', 'to'], route.firstLeg.properties.to]],
                  ['all', ['==', ['get', 'from'], route.secondLeg.properties.from], ['==', ['get', 'to'], route.secondLeg.properties.to]],
                  ['all', ['==', ['get', 'from'], route.finalLeg.properties.from], ['==', ['get', 'to'], route.finalLeg.properties.to]]
                ])
              ];

              if (routeFilters.length > 0) {
                mapRef.current.setFilter('route-lines', ['any', ...routeFilters]);
                mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');
              }

              // Update airport opacity to show all connection airports
              const connectionAirports = new Set([
                selectedIataRef.current,
                iata,
                ...sortedOneStopRoutes.map(r => r.connection.properties.iata),
                ...sortedTwoStopRoutes.map(r => r.firstConnection.properties.iata),
                ...sortedTwoStopRoutes.map(r => r.secondConnection.properties.iata)
              ]);

              mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', [
                'case',
                ['in', ['get', 'iata'], ['literal', Array.from(connectionAirports)]],
                1,
                0.2
              ]);
            }
          } else {
            console.log('Setting first airport:', iata);
            // First airport selection
            selectedIataRef.current = iata;
            setSelectedAirport(iata);
            
            // Notify parent component about the first airport
            console.log('Notifying parent: setting first airport', {
              departure: iata,
              arrival: null
            });
            onAirportSelect({
              departure: iata,
              arrival: null
            });
            
            // Also dispatch event for backward compatibility
            window.dispatchEvent(new CustomEvent('airportSelected', {
              detail: { selectedAirport: iata }
            }));
            
            // Show first airport popup
            firstPopupRef.current
              .setLngLat(feature.geometry.coordinates)
              .setHTML(`
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="overflow: hidden; text-overflow: ellipsis;">${cityName} (${selectedIataRef.current})</span>
                  <button class="close-button" onclick="window.handleDeselect()">×</button>
                </div>
              `)
              .addTo(mapRef.current);

            // Show all routes from this airport
            filterRoutesByAirport(iata);
            mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');
          }
        }
      });

      // Modify the click outside handler
      mapRef.current.on('click', (e) => {
        const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['airport-circles'] });
        if (!features.length) {
          // Only deselect airports, don't reset the filter
          selectedIataRef.current = null;
          secondIataRef.current = null;
          setSelectedAirport(null);
          setSelectedRoute(null);

          // Remove popups
          if (firstPopupRef.current) firstPopupRef.current.remove();
          if (secondPopupRef.current) secondPopupRef.current.remove();
          
          // Reset map visual state but maintain filter
          if (mapRef.current) {
          mapRef.current.setLayoutProperty('route-lines', 'visibility', 'none');
          
            // If airline filter is active, maintain the opacity
            if (airlinesFilter?.airlines?.length > 0) {
              // Get all routes for the selected airlines
              const relevantRoutes = routesData.features.filter(route => {
                if (airlinesFilter.mode === 'include') {
                  return airlinesFilter.airlines.includes(route.properties.carrier);
                } else {
                  return !airlinesFilter.airlines.includes(route.properties.carrier);
                }
              });

              // Get all airports that have routes with ANY of the selected airlines
              const relevantAirports = new Set();
              relevantRoutes.forEach(route => {
                relevantAirports.add(route.properties.from);
                relevantAirports.add(route.properties.to);
              });

              console.log('Maintaining filter for airports:', Array.from(relevantAirports));

              mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', [
            'case',
                ['in', ['get', 'iata'], ['literal', Array.from(relevantAirports)]],
                1,
                0.2
              ]);
            } else {
              mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', 1);
            }
          }

          // Hide flight info panel
          const panel = document.querySelector('.flight-info-panel');
          if (panel) {
            panel.classList.remove('visible');
          }

          // Notify parent component to clear both airports
          console.log('Notifying parent: clearing airports');
          onAirportSelect({ departure: null, arrival: null });
        }
      });
    });
    // Clean up on unmount
    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [routesData, airportsGeojson]);

  // Add effect to handle parent airport selection
  useEffect(() => {
    const handleParentAirportSelect = (event) => {
      console.log('Received parent airport selection:', event.detail);
      const { departure, arrival } = event.detail;
      
      // Clear current selection
      handleDeselect();
      
      // If new airports are provided, select them
      if (departure) {
        console.log('Selecting departure airport:', departure);
        selectedIataRef.current = departure;
        setSelectedAirport(departure);
        
        // Find and show the airport on map
        const airport = airportsGeojson?.features.find(f => f.properties.iata === departure);
        if (airport) {
          firstPopupRef.current
            .setLngLat(airport.geometry.coordinates)
            .setHTML(`
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="overflow: hidden; text-overflow: ellipsis;">${airport.properties.cityName} (${departure})</span>
                <button class="close-button" onclick="window.handleDeselect()">×</button>
              </div>
            `)
            .addTo(mapRef.current);
        }
        
        // If arrival is also provided
        if (arrival) {
          console.log('Selecting arrival airport:', arrival);
          secondIataRef.current = arrival;
          
          // Find and show the arrival airport on map
          const arrivalAirport = airportsGeojson?.features.find(f => f.properties.iata === arrival);
          if (arrivalAirport) {
            secondPopupRef.current
              .setLngLat(arrivalAirport.geometry.coordinates)
              .setHTML(`
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="overflow: hidden; text-overflow: ellipsis;">${arrivalAirport.properties.cityName} (${arrival})</span>
                  <button class="close-button" onclick="window.handleDeselect()">×</button>
                </div>
              `)
              .addTo(mapRef.current);
          }
          
          // Show routes between airports
          filterRoutesByAirport(departure);
          mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');
        }
      }
    };

    window.addEventListener('parentAirportSelect', handleParentAirportSelect);
    return () => {
      window.removeEventListener('parentAirportSelect', handleParentAirportSelect);
    };
  }, [airportsGeojson]);

  // Helper function to calculate Haversine distance between two points
  const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Helper function to find one-stop routes
  const findOneStopRoutes = (fromAirport, toAirport, routesData, airportsData) => {
    const directDistance = calculateHaversineDistance(
      fromAirport.geometry.coordinates[1],
      fromAirport.geometry.coordinates[0],
      toAirport.geometry.coordinates[1],
      toAirport.geometry.coordinates[0]
    );

    const maxTotalDistance = directDistance * 1.2;

    // Get all possible connecting airports
    const possibleConnections = new Set();
    routesData.features.forEach(route => {
      if (route.properties.from === fromAirport.properties.iata || 
          route.properties.to === fromAirport.properties.iata) {
        possibleConnections.add(route.properties.from === fromAirport.properties.iata ? 
          route.properties.to : route.properties.from);
      }
    });

    const oneStopRoutes = [];

    // For each possible connection, find routes
    possibleConnections.forEach(connectionIata => {
      // Find all first legs (from -> connection)
      const firstLegs = routesData.features.filter(route => 
        route.properties.from === fromAirport.properties.iata && 
        route.properties.to === connectionIata
      );

      // Find all second legs (connection -> to)
      const secondLegs = routesData.features.filter(route => 
        route.properties.from === connectionIata && 
        route.properties.to === toAirport.properties.iata
      );

      // If we have both legs, calculate total distance
      if (firstLegs.length > 0 && secondLegs.length > 0) {
        const connectionAirport = airportsData.features.find(a => 
          a.properties.iata === connectionIata
        );

        if (connectionAirport) {
          // Apply airline filter to both legs
          const filteredFirstLegs = firstLegs.filter(route => {
            if (!airlinesFilter?.airlines?.length) return true;
            if (airlinesFilter.mode === 'include') {
              return airlinesFilter.airlines.includes(route.properties.carrier);
            } else {
              return !airlinesFilter.airlines.includes(route.properties.carrier);
            }
          });

          const filteredSecondLegs = secondLegs.filter(route => {
            if (!airlinesFilter?.airlines?.length) return true;
            if (airlinesFilter.mode === 'include') {
              return airlinesFilter.airlines.includes(route.properties.carrier);
            } else {
              return !airlinesFilter.airlines.includes(route.properties.carrier);
            }
          });

          // Only add routes where both legs pass the filter
          if (filteredFirstLegs.length > 0 && filteredSecondLegs.length > 0) {
            // Find the best combination (shortest total duration)
            let bestFirstLeg = filteredFirstLegs[0];
            let bestSecondLeg = filteredSecondLegs[0];
            let bestTotalDuration = bestFirstLeg.properties.duration + bestSecondLeg.properties.duration;

            // Try all combinations to find the shortest total duration
            filteredFirstLegs.forEach(firstLeg => {
              filteredSecondLegs.forEach(secondLeg => {
                const totalDuration = firstLeg.properties.duration + secondLeg.properties.duration;
                if (totalDuration < bestTotalDuration) {
                  bestFirstLeg = firstLeg;
                  bestSecondLeg = secondLeg;
                  bestTotalDuration = totalDuration;
                }
              });
            });

            const firstLegDistance = bestFirstLeg.properties.distance;
            const secondLegDistance = bestSecondLeg.properties.distance;
            const totalDistance = firstLegDistance + secondLegDistance;

            // Only add route if total distance is within 1.2x direct distance
            if (totalDistance <= maxTotalDistance) {
              oneStopRoutes.push({
                connection: connectionAirport,
                firstLeg: bestFirstLeg,
                secondLeg: bestSecondLeg,
                totalDistance,
                totalDuration: bestTotalDuration,
                firstLegOptions: filteredFirstLegs,
                secondLegOptions: filteredSecondLegs
              });
            }
          }
        }
      }
    });

    return oneStopRoutes;
  };

  // Helper function to find two-stop routes
  const findTwoStopRoutes = (fromAirport, toAirport, routesData, airportsData) => {
    const directDistance = calculateHaversineDistance(
      fromAirport.geometry.coordinates[1],
      fromAirport.geometry.coordinates[0],
      toAirport.geometry.coordinates[1],
      toAirport.geometry.coordinates[0]
    );

    const maxTotalDistance = directDistance * 1.2;

    // Get all possible first connections
    const firstConnections = new Set();
    routesData.features.forEach(route => {
      if (route.properties.from === fromAirport.properties.iata) {
        firstConnections.add(route.properties.to);
      }
    });

    const twoStopRoutes = [];

    // For each first connection, find possible second connections
    firstConnections.forEach(firstConnectionIata => {
      const secondConnections = new Set();
      routesData.features.forEach(route => {
        if (route.properties.from === firstConnectionIata) {
          secondConnections.add(route.properties.to);
        }
      });

      // For each second connection, check if there's a route to destination
      secondConnections.forEach(secondConnectionIata => {
        const finalLegs = routesData.features.filter(route => 
          route.properties.from === secondConnectionIata && 
          route.properties.to === toAirport.properties.iata
        );

        if (finalLegs.length > 0) {
          // Find all first legs (from -> first connection)
          const firstLegs = routesData.features.filter(route => 
            route.properties.from === fromAirport.properties.iata && 
            route.properties.to === firstConnectionIata
          );

          // Find all second legs (first connection -> second connection)
          const secondLegs = routesData.features.filter(route => 
            route.properties.from === firstConnectionIata && 
            route.properties.to === secondConnectionIata
          );

          if (firstLegs.length > 0 && secondLegs.length > 0) {
            const firstConnectionAirport = airportsData.features.find(a => 
              a.properties.iata === firstConnectionIata
            );
            const secondConnectionAirport = airportsData.features.find(a => 
              a.properties.iata === secondConnectionIata
            );

            if (firstConnectionAirport && secondConnectionAirport) {
              // Apply airline filter to all legs
              const filteredFirstLegs = firstLegs.filter(route => {
                if (!airlinesFilter?.airlines?.length) return true;
                if (airlinesFilter.mode === 'include') {
                  return airlinesFilter.airlines.includes(route.properties.carrier);
                } else {
                  return !airlinesFilter.airlines.includes(route.properties.carrier);
                }
              });

              const filteredSecondLegs = secondLegs.filter(route => {
                if (!airlinesFilter?.airlines?.length) return true;
                if (airlinesFilter.mode === 'include') {
                  return airlinesFilter.airlines.includes(route.properties.carrier);
                } else {
                  return !airlinesFilter.airlines.includes(route.properties.carrier);
                }
              });

              const filteredFinalLegs = finalLegs.filter(route => {
                if (!airlinesFilter?.airlines?.length) return true;
                if (airlinesFilter.mode === 'include') {
                  return airlinesFilter.airlines.includes(route.properties.carrier);
                } else {
                  return !airlinesFilter.airlines.includes(route.properties.carrier);
                }
              });

              if (filteredFirstLegs.length > 0 && filteredSecondLegs.length > 0 && filteredFinalLegs.length > 0) {
                // Find the best combination (shortest total duration)
                let bestFirstLeg = filteredFirstLegs[0];
                let bestSecondLeg = filteredSecondLegs[0];
                let bestFinalLeg = filteredFinalLegs[0];
                let bestTotalDuration = bestFirstLeg.properties.duration + 
                                     bestSecondLeg.properties.duration + 
                                     bestFinalLeg.properties.duration;

                // Try all combinations to find the shortest total duration
                filteredFirstLegs.forEach(firstLeg => {
                  filteredSecondLegs.forEach(secondLeg => {
                    filteredFinalLegs.forEach(finalLeg => {
                      const totalDuration = firstLeg.properties.duration + 
                                         secondLeg.properties.duration + 
                                         finalLeg.properties.duration;
                      if (totalDuration < bestTotalDuration) {
                        bestFirstLeg = firstLeg;
                        bestSecondLeg = secondLeg;
                        bestFinalLeg = finalLeg;
                        bestTotalDuration = totalDuration;
                      }
                    });
                  });
                });

                const totalDistance = bestFirstLeg.properties.distance + 
                                   bestSecondLeg.properties.distance + 
                                   bestFinalLeg.properties.distance;

                // Only add route if total distance is within 1.2x direct distance
                if (totalDistance <= maxTotalDistance) {
                  twoStopRoutes.push({
                    firstConnection: firstConnectionAirport,
                    secondConnection: secondConnectionAirport,
                    firstLeg: bestFirstLeg,
                    secondLeg: bestSecondLeg,
                    finalLeg: bestFinalLeg,
                    totalDistance,
                    totalDuration: bestTotalDuration,
                    firstLegOptions: filteredFirstLegs,
                    secondLegOptions: filteredSecondLegs,
                    finalLegOptions: filteredFinalLegs
                  });
                }
              }
            }
          }
        }
      });
    });

    return twoStopRoutes;
  };

  // Make the map reference and filtered routes available globally
  useEffect(() => {
    window.mapRef = mapRef;
    window.filteredRoutes = filteredRoutes;
    return () => {
      delete window.mapRef;
      delete window.filteredRoutes;
    };
  }, [filteredRoutes]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        minHeight: 400,
        height: '100%',
        boxShadow: undefined,
        margin: 0,
        borderRadius: 0,
        overflow: 'hidden',
      }}
      tabIndex={0}
      aria-label="Map with selectable airports"
    />
      <div className="flight-info-panel" />
    </div>
  );
};

export default MapboxMap; 