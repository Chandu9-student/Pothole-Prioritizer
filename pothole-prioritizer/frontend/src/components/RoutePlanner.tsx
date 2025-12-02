import React, { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import Card from './Card';

interface Pothole {
  id: number;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
}

interface RoutePlannerProps {
  potholes: Pothole[];
  userLocation: [number, number] | null;
}

interface RouteInfo {
  distance: number; // in km
  duration: number; // in minutes
  potholeCount: number;
  criticalPotholes: number;
  routeCoordinates: [number, number][];
}

const RoutePlanner: React.FC<RoutePlannerProps> = ({ potholes, userLocation }) => {
  const map = useMap();
  const [isActive, setIsActive] = useState(false);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteInfo[]>([]);
  const [routingControl, setRoutingControl] = useState<any>(null);
  const [startMarker, setStartMarker] = useState<L.Marker | null>(null);
  const [endMarker, setEndMarker] = useState<L.Marker | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0); // 0 = main route, 1+ = alternatives
  const [routePolylines, setRoutePolylines] = useState<L.Polyline[]>([]);
  const polylinesRef = React.useRef<L.Polyline[]>([]); // Use ref for immediate access

  // Custom icons
  const startIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMCAwIDYgNCA2IDlDNiAxNSAxNSAzMCAxNSAzMEMxNSAzMCAyNCAxNSAyNCA5QzI0IDQgMjAgMCAxNSAwWiIgZmlsbD0iIzEwYjk4MSIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iOSIgcj0iNCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });

  const endIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAzMCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTUgMEMxMCAwIDYgNCA2IDlDNiAxNSAxNSAzMCAxNSAzMEMxNSAzMCAyNCAxNSAyNCA5QzI0IDQgMjAgMCAxNSAwWiIgZmlsbD0iI2VmNDQ0NCIvPjxjaXJjbGUgY3g9IjE1IiBjeT0iOSIgcj0iNCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
    iconSize: [30, 40],
    iconAnchor: [15, 40],
  });

  // Calculate potholes near a route
  const calculatePotholesAlongRoute = (routeCoords: [number, number][]): { count: number; critical: number } => {
    let count = 0;
    let critical = 0;
    const threshold = 0.05; // 50 meters threshold

    potholes.forEach(pothole => {
      const lat = pothole.lat ?? pothole.latitude;
      const lng = pothole.lng ?? pothole.longitude;
      if (!lat || !lng) return;

      // Check if pothole is near any segment of the route
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const dist = pointToSegmentDistance(
          { lat, lng },
          { lat: routeCoords[i][0], lng: routeCoords[i][1] },
          { lat: routeCoords[i + 1][0], lng: routeCoords[i + 1][1] }
        );
        
        if (dist < threshold) {
          count++;
          if (pothole.severity === 'critical' || pothole.severity === 'high') {
            critical++;
          }
          break; // Count each pothole only once
        }
      }
    });

    return { count, critical };
  };

  // Distance from point to line segment
  const pointToSegmentDistance = (
    point: { lat: number; lng: number },
    start: { lat: number; lng: number },
    end: { lat: number; lng: number }
  ): number => {
    const A = point.lat - start.lat;
    const B = point.lng - start.lng;
    const C = end.lat - start.lat;
    const D = end.lng - start.lng;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = start.lat;
      yy = start.lng;
    } else if (param > 1) {
      xx = end.lat;
      yy = end.lng;
    } else {
      xx = start.lat + param * C;
      yy = start.lng + param * D;
    }

    const dx = point.lat - xx;
    const dy = point.lng - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

    // Handle map clicks to set start/end points
  useEffect(() => {
    if (!isActive) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!startPoint) {
        // First click - set start point
        setStartPoint([e.latlng.lat, e.latlng.lng]);
        const marker = L.marker(e.latlng, { icon: startIcon }).addTo(map);
        setStartMarker(marker);
      } else if (!endPoint) {
        // Second click - set end point
        setEndPoint([e.latlng.lat, e.latlng.lng]);
        const marker = L.marker(e.latlng, { icon: endIcon }).addTo(map);
        setEndMarker(marker);
      } else {
        // Third click - reset and start over
        try {
          if (startMarker) startMarker.remove();
          if (endMarker) endMarker.remove();
          if (routingControl) {
            map.removeControl(routingControl);
            setRoutingControl(null);
          }
        polylinesRef.current.forEach(polyline => {
          try {
            if (map.hasLayer(polyline)) {
              map.removeLayer(polyline);
            }
          } catch (e) {
            // Ignore errors
          }
        });
      } catch (error) {
        console.warn('Error during reset:', error);
      }
      
      setStartPoint([e.latlng.lat, e.latlng.lng]);
      setEndPoint(null);
      setRouteInfo(null);
      setAlternativeRoutes([]);
      setSelectedRouteIndex(0);
      setRoutePolylines([]);
      polylinesRef.current = [];        const marker = L.marker(e.latlng, { icon: startIcon }).addTo(map);
        setStartMarker(marker);
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, startPoint, endPoint, map, startMarker, endMarker, routingControl, routePolylines]);

  // Calculate route when both points are set
  useEffect(() => {
    if (!startPoint || !endPoint || !isActive) return;

    // Remove existing routing control safely
    if (routingControl) {
      try {
        map.removeControl(routingControl);
      } catch (error) {
        console.warn('Error removing routing control:', error);
      }
    }

    // Clear existing polylines
    polylinesRef.current.forEach(polyline => {
      try {
        if (map.hasLayer(polyline)) {
          map.removeLayer(polyline);
        }
      } catch (error) {
        console.warn('Error removing polyline:', error);
      }
    });
    setRoutePolylines([]);
    polylinesRef.current = [];

    // Create custom Line class that doesn't draw anything
    const NoOpLine = L.LayerGroup.extend({
      initialize: function() {
        L.LayerGroup.prototype.initialize.call(this);
      },
      addTo: function() {
        return this;
      },
      getBounds: function() {
        return L.latLngBounds([startPoint, endPoint]);
      }
    });

    const control = (L as any).Routing.control({
      waypoints: [
        L.latLng(startPoint[0], startPoint[1]),
        L.latLng(endPoint[0], endPoint[1])
      ],
      routeWhileDragging: false,
      addWaypoints: false,
      fitSelectedRoutes: false,
      showAlternatives: true,
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1'
      }),
      lineOptions: {
        styles: []
      },
      altLineOptions: {
        styles: []
      },
      createMarker: () => null,
      // Override line creation
      line: NoOpLine,
      createLine: function() {
        return new NoOpLine();
      }
    });

    control.on('routesfound', (e: any) => {
      const routes = e.routes;
      console.log('🛣️ Routes found:', routes.length, 'routes');
      
      // Immediately remove any lines that the control creates
      setTimeout(() => {
        try {
          if (control._line && map.hasLayer(control._line)) {
            map.removeLayer(control._line);
          }
          if (control._altLines) {
            control._altLines.forEach((line: any) => {
              if (map.hasLayer(line)) {
                map.removeLayer(line);
              }
            });
          }
        } catch (err) {
          console.warn('Could not remove default lines:', err);
        }
      }, 0);
      
      const mainRoute = routes[0];
      
      // Extract coordinates from the main route
      const coords: [number, number][] = mainRoute.coordinates.map((c: any) => [c.lat, c.lng]);
      
      // Calculate potholes along this route
      const { count, critical } = calculatePotholesAlongRoute(coords);
      
      setRouteInfo({
        distance: mainRoute.summary.totalDistance / 1000, // Convert to km
        duration: mainRoute.summary.totalTime / 60, // Convert to minutes
        potholeCount: count,
        criticalPotholes: critical,
        routeCoordinates: coords
      });

      // Process alternative routes
      const alternatives: RouteInfo[] = routes.slice(1).map((route: any) => {
        const routeCoords: [number, number][] = route.coordinates.map((c: any) => [c.lat, c.lng]);
        const { count: altCount, critical: altCritical } = calculatePotholesAlongRoute(routeCoords);
        
        return {
          distance: route.summary.totalDistance / 1000,
          duration: route.summary.totalTime / 60,
          potholeCount: altCount,
          criticalPotholes: altCritical,
          routeCoordinates: routeCoords
        };
      });

      setAlternativeRoutes(alternatives);

      // Create custom polylines for all routes that we can control
      const newPolylines: L.Polyline[] = [];
      
      // Main route polyline (index 0)
      const mainPolyline = L.polyline(coords, {
        color: '#3b82f6',
        weight: 7,
        opacity: 1.0
      }).addTo(map);
      mainPolyline.bringToFront();
      newPolylines.push(mainPolyline);

      // Alternative route polylines (index 1, 2, ...)
      console.log('📍 Creating', alternatives.length, 'alternative route polylines');
      alternatives.forEach((alt, index) => {
        console.log(`🛣️ Alternative ${index + 1}: ${alt.routeCoordinates.length} coordinates`);
        const altPolyline = L.polyline(alt.routeCoordinates, {
          color: 'gray',
          weight: 5,
          opacity: 0.5
        }).addTo(map);
        
        console.log(`✅ Alternative ${index + 1} polyline added to map`);
        
        // Make alternative routes clickable
        altPolyline.on('click', () => {
          console.log('Alternative route clicked:', index + 1);
          setSelectedRouteIndex(index + 1);
          // Highlight this route
          newPolylines.forEach((poly, i) => {
            if (i === index + 1) {
              poly.setStyle({ color: '#3b82f6', weight: 7, opacity: 1.0 });
              poly.bringToFront();
            } else {
              poly.setStyle({ color: 'gray', weight: 5, opacity: 0.4 });
            }
          });
          map.fitBounds(altPolyline.getBounds(), { padding: [50, 50] });
        });
        
        newPolylines.push(altPolyline);
      });

      // Make main route clickable too
      mainPolyline.on('click', () => {
        console.log('Main route clicked');
        setSelectedRouteIndex(0);
        newPolylines.forEach((poly, i) => {
          if (i === 0) {
            poly.setStyle({ color: '#3b82f6', weight: 7, opacity: 1.0 });
            poly.bringToFront();
          } else {
            poly.setStyle({ color: 'gray', weight: 5, opacity: 0.4 });
          }
        });
        map.fitBounds(mainPolyline.getBounds(), { padding: [50, 50] });
      });

      // Store in both state and ref for immediate access
      setRoutePolylines(newPolylines);
      polylinesRef.current = newPolylines;
      console.log('Created polylines:', newPolylines.length, '- Main + Alternatives');
    });

    // Add control to map AFTER setting up event listeners
    map.addControl(control);
    setRoutingControl(control);

    return () => {
      if (control) {
        try {
          map.removeControl(control);
        } catch (error) {
          console.warn('Error removing control on cleanup:', error);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPoint, endPoint, isActive, potholes]);

  // Function to highlight selected route
  const highlightRoute = (index: number) => {
    console.log('Button clicked - Highlighting route index:', index);
    setSelectedRouteIndex(index);
    
    // Use ref for immediate access to polylines
    const polylines = polylinesRef.current;
    
    if (polylines.length === 0) {
      console.warn('No polylines available to highlight');
      return;
    }

    console.log('Total polylines available:', polylines.length);

    polylines.forEach((polyline, i) => {
      try {
        if (i === index) {
          // Highlight selected route
          polyline.setStyle({
            color: '#3b82f6',
            weight: 7,
            opacity: 1.0
          });
          polyline.bringToFront();
          console.log('✅ Highlighted polyline', i, 'with blue color');
        } else {
          // Dim other routes
          polyline.setStyle({
            color: 'gray',
            weight: 5,
            opacity: 0.4
          });
          console.log('⚪ Dimmed polyline', i);
        }
      } catch (error) {
        console.error('❌ Error styling polyline', i, error);
      }
    });

    // Fit map to show selected route
    if (polylines[index]) {
      try {
        map.fitBounds(polylines[index].getBounds(), { padding: [50, 50] });
        console.log('📍 Map fitted to route', index);
      } catch (error) {
        console.error('❌ Error fitting bounds:', error);
      }
    } else {
      console.warn('⚠️ Polyline at index', index, 'not found');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (routingControl && map.hasControl && map.hasControl(routingControl)) {
          map.removeControl(routingControl);
        }
        if (startMarker && map.hasLayer(startMarker)) {
          map.removeLayer(startMarker);
        }
        if (endMarker && map.hasLayer(endMarker)) {
          map.removeLayer(endMarker);
        }
        polylinesRef.current.forEach(polyline => {
          try {
            if (map.hasLayer(polyline)) {
              map.removeLayer(polyline);
            }
          } catch (e) {
            // Ignore errors during cleanup
          }
        });
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [routingControl, startMarker, endMarker, map]);

  const getSafetyRating = (potholeCount: number, criticalCount: number): { label: string; color: string; emoji: string } => {
    if (criticalCount > 2) return { label: 'High Risk', color: 'text-red-600', emoji: '⚠️' };
    if (potholeCount > 5) return { label: 'Moderate Risk', color: 'text-orange-600', emoji: '⚡' };
    if (potholeCount > 0) return { label: 'Low Risk', color: 'text-yellow-600', emoji: '✓' };
    return { label: 'Safe Route', color: 'text-green-600', emoji: '✓✓' };
  };

  const getBestRoute = (): 'main' | number | null => {
    if (!routeInfo) return null;
    
    let bestRoute: 'main' | number = 'main';
    let lowestScore = routeInfo.criticalPotholes * 10 + routeInfo.potholeCount;

    alternativeRoutes.forEach((route, index) => {
      const score = route.criticalPotholes * 10 + route.potholeCount;
      if (score < lowestScore) {
        lowestScore = score;
        bestRoute = index;
      }
    });

    return bestRoute;
  };

  // Auto-activate when component mounts
  useEffect(() => {
    setIsActive(true);
    // Don't auto-set location - let user choose both points
  }, []);

  return (
    <div className="absolute bottom-4 left-4 right-4 md:bottom-20 md:left-4 md:right-auto z-[1000]">
      <Card className="w-full md:w-80 max-h-[60vh] md:max-h-[70vh] overflow-y-auto">
          <div className="p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base md:text-lg font-bold text-gray-900">🗺️ Route Planner</h3>
              <div className="text-xs text-gray-500 hidden md:block">Click to close button on left</div>
            </div>

            {/* Point Selection */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📍</span>
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Start Point</div>
                  <div className="text-sm font-medium">
                    {startPoint ? `${startPoint[0].toFixed(4)}, ${startPoint[1].toFixed(4)}` : 'Click on map'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <div className="flex-1">
                  <div className="text-xs text-gray-500">Destination</div>
                  <div className="text-sm font-medium">
                    {endPoint ? `${endPoint[0].toFixed(4)}, ${endPoint[1].toFixed(4)}` : 'Click on map'}
                  </div>
                </div>
              </div>
            </div>

            {/* Route Information */}
            {routeInfo && (
              <div className="space-y-3 pt-3 border-t">
                <button
                  onClick={() => highlightRoute(0)}
                  className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                    selectedRouteIndex === 0 
                      ? 'bg-blue-100 border-2 border-blue-500' 
                      : 'bg-blue-50 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-blue-900">Main Route {selectedRouteIndex === 0 && '🔵'}</span>
                    {getBestRoute() === 'main' && (
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Recommended</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-gray-600">Distance</div>
                      <div className="font-semibold">{routeInfo.distance.toFixed(1)} km</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Time</div>
                      <div className="font-semibold">{Math.round(routeInfo.duration)} min</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Potholes</div>
                      <div className="font-semibold">{routeInfo.potholeCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Critical</div>
                      <div className="font-semibold text-red-600">{routeInfo.criticalPotholes}</div>
                    </div>
                  </div>
                  <div className={`mt-2 font-semibold text-sm ${getSafetyRating(routeInfo.potholeCount, routeInfo.criticalPotholes).color}`}>
                    {getSafetyRating(routeInfo.potholeCount, routeInfo.criticalPotholes).emoji}{' '}
                    {getSafetyRating(routeInfo.potholeCount, routeInfo.criticalPotholes).label}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    👆 Click to show on map
                  </div>
                </button>

                {/* Alternative Routes */}
                {alternativeRoutes.map((route, index) => (
                  <button
                    key={index}
                    onClick={() => highlightRoute(index + 1)}
                    className={`w-full text-left p-3 rounded-lg transition-all cursor-pointer hover:shadow-md ${
                      selectedRouteIndex === index + 1 
                        ? 'bg-blue-100 border-2 border-blue-500' 
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-700">Alternative {index + 1} {selectedRouteIndex === index + 1 && '🔵'}</span>
                      {getBestRoute() === index && (
                        <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">Recommended</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-600">Distance</div>
                        <div className="font-semibold">{route.distance.toFixed(1)} km</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Time</div>
                        <div className="font-semibold">{Math.round(route.duration)} min</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Potholes</div>
                        <div className="font-semibold">{route.potholeCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Critical</div>
                        <div className="font-semibold text-red-600">{route.criticalPotholes}</div>
                      </div>
                    </div>
                    <div className={`mt-2 font-semibold text-sm ${getSafetyRating(route.potholeCount, route.criticalPotholes).color}`}>
                      {getSafetyRating(route.potholeCount, route.criticalPotholes).emoji}{' '}
                      {getSafetyRating(route.potholeCount, route.criticalPotholes).label}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      👆 Click to show on map
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Instructions */}
            {!routeInfo && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold mb-1">How to use:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Set your start point{userLocation ? ' (current location)' : ''}</li>
                  <li>Click on the map to set destination</li>
                  <li>View routes with pothole counts</li>
                  <li>Choose the safest route!</li>
                </ol>
              </div>
            )}
          </div>
        </Card>
    </div>
  );
};

export default RoutePlanner;
