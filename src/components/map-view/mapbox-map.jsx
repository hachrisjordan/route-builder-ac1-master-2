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
const MapboxMap = ({ airlinesFilter, onAirportSelect = () => {} }) => {
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
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [airportsGeojson, setAirportsGeojson] = useState(null);

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
      mapRef.current.setPaintProperty('airport-circles', 'circle-opacity', 1);
      mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
        'case',
        ['==', ['get', 'iata'], hoveredIataRef.current],
        '#00E5FF',
        [
          'match',
          ['get', 'size'],
          'XL', '#ff3b30',
          'L', '#ff9500',
          'M', '#34c759',
          'S', '#007aff',
          '#007aff'
        ]
      ]);
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
        setRoutesGeojson(data);
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

  // Filter routes based on selected airport and airline filter
  const filterRoutesByAirport = (iata) => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;
    if (!mapRef.current.getLayer('route-lines')) {
      console.log('Route layer not yet initialized');
      return;
    }
    console.log('Filtering routes for airport:', iata);
    if (!iata) {
      mapRef.current.setFilter('route-lines', ['==', ['get', 'from'], '']);
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
      const routes = routesGeojson.features.filter(f => 
        f.properties.from === iata || f.properties.to === iata
      );

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
    const routes = routesGeojson.features.filter(f => {
      const matchesAirport = f.properties.from === iata || f.properties.to === iata;
      const matchesAirline = airlinesFilter.mode === 'include' 
        ? airlinesFilter.airlines.includes(f.properties.carrier)
        : !airlinesFilter.airlines.includes(f.properties.carrier);
      return matchesAirport && matchesAirline;
    });

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

  // Update route filter when airline filter changes
  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded() && selectedIataRef.current) {
      filterRoutesByAirport(selectedIataRef.current);
    }
  }, [airlinesFilter]);

  // Create the map only once
  useEffect(() => {
    if (!mapContainerRef.current || !routesGeojson || !airportsGeojson) return;

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
        width: 500px;
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
        margin: 0 0 20px;
        color: #333;
        font-size: 20px;
        font-weight: 600;
        padding-bottom: 12px;
        border-bottom: 2px solid #f0f0f0;
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
          data: routesGeojson,
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

            // Find and highlight the route between them
            const route = routesGeojson.features.find(f => 
              (f.properties.from === selectedIataRef.current && f.properties.to === iata) ||
              (f.properties.from === iata && f.properties.to === selectedIataRef.current)
            );

            if (route) {
              setSelectedRoute(route);
              
              // Find all unique routes from first to second airport only
              const allRoutes = routesGeojson.features.filter(f => 
                f.properties.from === selectedIataRef.current && f.properties.to === iata
          );

              // Remove duplicate routes (same carrier and aircraft)
              const uniqueRoutes = allRoutes.reduce((acc, route) => {
                const key = `${route.properties.carrier}-${route.properties.aircraft_codes}`;
                if (!acc[key]) {
                  acc[key] = route;
                }
                return acc;
              }, {});

              // Filter routes based on airline filter if active
              const filteredRoutes = Object.values(uniqueRoutes).filter(route => {
                if (!airlinesFilter?.airlines?.length) return true;
                
                if (airlinesFilter.mode === 'include') {
                  return airlinesFilter.airlines.includes(route.properties.carrier);
            } else {
                  return !airlinesFilter.airlines.includes(route.properties.carrier);
                }
              });

              // Show popup for second airport
              const secondAirport = airportsGeojson.features.find(f => f.properties.iata === iata);
              if (secondAirport) {
                secondPopupRef.current
                  .setLngLat(secondAirport.geometry.coordinates)
                  .setHTML(`
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="overflow: hidden; text-overflow: ellipsis;">${secondAirport.properties.cityName} (${iata})</span>
                      <button class="close-button" onclick="window.handleDeselect()">×</button>
                    </div>
                  `)
                  .addTo(mapRef.current);
              }

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
                  ${filteredRoutes.map((route, index) => {
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
                `;
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
          handleDeselect();
        }
      });
    });
    // Clean up on unmount
    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [routesGeojson, airportsGeojson]);

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