import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import airportsGeojson from '../../data/airports-on-routes.geojson';

// Mapbox access token (provided by user)
mapboxgl.accessToken = 'pk.eyJ1IjoiYmluYmluaGloaSIsImEiOiJjbWFjcmN4MHIwNms3MndvbHZoNGQ3OTllIn0.lkCw6r7uEE_gEgx3jrs68Q';

/**
 * MapboxMap displays a responsive Mapbox GL JS map with 3D globe projection, airport markers, and route lines.
 * Airports are selectable (clickable) and highlight on selection.
 * Hovering animates the marker. Clicking outside any point unselects.
 * Clustering is enabled for dense areas.
 * Routes are hidden by default and shown only when an airport is selected.
 */
const MapboxMap = ({ displayRoutes, selectedPathKey }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const selectedIataRef = useRef(null);
  const hoveredIataRef = useRef(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [routesGeojson, setRoutesGeojson] = useState(null);
  const [highlightedPathKey, setHighlightedPathKey] = useState(null);

  // Fetch routes GeoJSON at runtime
  useEffect(() => {
    fetch('/routes-arcs.geojson')
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

  // Filter routes based on selected airport
  const filterRoutesByAirport = (iata) => {
    if (!mapRef.current) return;
    if (!mapRef.current.getLayer('route-lines')) {
      console.log('Route layer not yet initialized');
      return;
    }
    console.log('Filtering routes for airport:', iata);
    if (!iata) {
      mapRef.current.setFilter('route-lines', ['==', ['get', 'iata'], '']);
      return;
    }
    const filter = [
      'any',
      ['==', ['get', 'origin'], iata],
      ['==', ['get', 'destination'], iata]
    ];
    console.log('Applying filter:', JSON.stringify(filter));
    mapRef.current.setFilter('route-lines', filter);
  };

  // Create the map only once
  useEffect(() => {
    if (!mapContainerRef.current || !routesGeojson) return;

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
              },
              paint: {
                'line-color': '#000',
                'line-width': 2,
                'line-blur': 0.5,
              },
            }, 'airport-circles');
            mapRef.current.setFilter('route-lines', ['==', ['get', 'iata'], '']);
          }
        }
      });
      // Add airports source with clustering
      if (!mapRef.current.getSource('airports')) {
        console.log('Adding airports source');
        mapRef.current.addSource('airports', {
          type: 'geojson',
          data: airportsGeojson,
          cluster: false
        });
      }
      // Remove cluster layers if present
      if (mapRef.current.getLayer('airport-clusters')) {
        mapRef.current.removeLayer('airport-clusters');
      }
      if (mapRef.current.getLayer('airport-cluster-count')) {
        mapRef.current.removeLayer('airport-cluster-count');
      }
      // Unclustered airport circles
      if (!mapRef.current.getLayer('airport-circles')) {
        mapRef.current.addLayer({
          id: 'airport-circles',
          type: 'circle',
          source: 'airports',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'match', ['get', 'size'],
              'XL', 10,
              'L', 7.5,
              'M', 5.5,
              'S', 3.5,
              4
            ],
            'circle-color': [
              'case',
                ['==', ['get', 'iata'], selectedIataRef.current], '#9B59B6', // Bright purple for selected
                ['==', ['get', 'iata'], hoveredIataRef.current], '#00E5FF', // Bright cyan for hovered
                [
                  'match', ['get', 'size'],
                  'XL', '#ff3b30',
                  'L', '#ff9500',
                  'M', '#34c759',
                  'S', '#007aff',
                  '#007aff'
                ]
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff',
            'circle-opacity': 0.85,
            'circle-radius-transition': { duration: 200 },
            'circle-color-transition': { duration: 200 },
          },
        });
      }
      // Cursor pointer on hover
      mapRef.current.on('mouseenter', 'airport-circles', (e) => {
        mapRef.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const iata = e.features[0].properties.iata;
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
          console.log('Selected airport:', iata);
          console.log('Airport properties:', feature.properties);
          selectedIataRef.current = iata;
          setSelectedAirport(iata);
          mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
            'case',
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
          // Show routes for selected airport
          filterRoutesByAirport(iata);
        }
      });
      // Modify the click outside handler
      mapRef.current.on('click', (e) => {
        const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['airport-circles'] });
        if (!features.length) {
          console.log('Deselecting airport');
          selectedIataRef.current = null;
          setSelectedAirport(null);
          mapRef.current.setPaintProperty('airport-circles', 'circle-color', [
            'case',
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
          // Hide all routes
          filterRoutesByAirport(null);
        }
      });
      // Cluster click to zoom in
      mapRef.current.on('click', 'airport-clusters', (e) => {
        const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['airport-clusters'] });
        if (!features.length) return;
        const clusterId = features[0].properties.cluster_id;
        mapRef.current.getSource('airports').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          mapRef.current.easeTo({
            center: features[0].geometry.coordinates,
            zoom
          });
        });
      });
    });
    // Clean up on unmount
    return () => {
      if (mapRef.current) mapRef.current.remove();
    };
  }, [routesGeojson]);

  // Helper to get the current highlighted pathKey (selected from prop)
  const currentPathKey = selectedPathKey || highlightedPathKey || '';

  // Update displayRoutes layers without recreating the map
  useEffect(() => {
    if (!mapRef.current) return;
    // Remove old display-routes layer if present
    if (mapRef.current.getLayer('route-lines-search')) mapRef.current.removeLayer('route-lines-search');
    if (mapRef.current.getLayer('route-lines-highlight')) mapRef.current.removeLayer('route-lines-highlight');
    if (mapRef.current.getSource('display-routes')) mapRef.current.removeSource('display-routes');
    if (displayRoutes && displayRoutes.features && displayRoutes.features.length > 0) {
      mapRef.current.addSource('display-routes', {
        type: 'geojson',
        data: displayRoutes,
      });
      // Normal route layer (exclude highlighted pathKey)
      mapRef.current.addLayer({
        id: 'route-lines-search',
        type: 'line',
        source: 'display-routes',
        filter: currentPathKey ? ['!=', ['get', 'pathKey'], currentPathKey] : true,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#0074D9',
          'line-width': 4,
          'line-opacity': 0.9,
        },
      }, 'airport-circles');
      // Highlight layer (above normal)
      mapRef.current.addLayer({
        id: 'route-lines-highlight',
        type: 'line',
        source: 'display-routes',
        filter: ['==', ['get', 'pathKey'], currentPathKey],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#FFD700',
          'line-width': 8,
          'line-opacity': 0.7,
        },
      }, 'route-lines-search');
      // Hide the default route-lines layer if present
      if (mapRef.current.getLayer('route-lines')) {
        mapRef.current.setLayoutProperty('route-lines', 'visibility', 'none');
      }
    } else {
      // If no displayRoutes, show the default route-lines layer
      if (mapRef.current.getLayer('route-lines')) {
        mapRef.current.setLayoutProperty('route-lines', 'visibility', 'visible');
      }
      if (mapRef.current.getLayer('route-lines-search')) mapRef.current.removeLayer('route-lines-search');
      if (mapRef.current.getLayer('route-lines-highlight')) mapRef.current.removeLayer('route-lines-highlight');
      if (mapRef.current.getSource('display-routes')) mapRef.current.removeSource('display-routes');
    }
  }, [displayRoutes]);

  // Attach event handlers for hover only once (selection is now controlled by parent)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const handleMouseEnter = (e) => {
      map.getCanvas().style.cursor = 'pointer';
      if (e.features && e.features.length > 0) {
        setHighlightedPathKey(e.features[0].properties.pathKey);
      }
    };
    const handleMouseLeave = (e) => {
      map.getCanvas().style.cursor = '';
      setHighlightedPathKey(null);
    };
    map.on('mouseenter', 'route-lines-search', handleMouseEnter);
    map.on('mouseleave', 'route-lines-search', handleMouseLeave);
    return () => {
      map.off('mouseenter', 'route-lines-search', handleMouseEnter);
      map.off('mouseleave', 'route-lines-search', handleMouseLeave);
    };
  }, [displayRoutes]);

  // Dynamically update the highlight layer filter and blue layer filter
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapRef.current.getLayer('route-lines-highlight')) {
      mapRef.current.setFilter('route-lines-highlight', ['==', ['get', 'pathKey'], currentPathKey]);
    }
    if (mapRef.current.getLayer('route-lines-search')) {
      mapRef.current.setFilter(
        'route-lines-search',
        currentPathKey ? ['!=', ['get', 'pathKey'], currentPathKey] : true
      );
    }
  }, [highlightedPathKey, selectedPathKey]);

  return (
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
  );
};

export default MapboxMap; 