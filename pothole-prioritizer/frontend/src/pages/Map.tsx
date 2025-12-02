import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import RoutePlanner from '../components/RoutePlanner';
import { useAuth } from '../hooks/useAuth';

// Component to update map center dynamically
function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    console.log('MapUpdater: Setting view to', center, 'with zoom', zoom);
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  
  return null;
}

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Pothole interface
interface Pothole {
  id: number;
  lat?: number;           // Frontend coordinate format
  lng?: number;           // Frontend coordinate format
  latitude?: number;      // Backend coordinate format
  longitude?: number;     // Backend coordinate format
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'verified' | 'in_progress' | 'fixed' | 'completed';
  description: string;
  reportedAt?: string;
  reported_date?: string; // Backend format
  created_at?: string;    // Anonymous system format
  imageUrl?: string;
  annotatedImageUrl?: string;
  image_path?: string;    // Backend image path
  confidence?: number;
  detection_method?: string;
  reporter?: string;
  reporter_name?: string; // Anonymous reporter name
  reference_number?: string; // Anonymous system reference
  // Priority scoring fields
  priority_score?: number;
  report_count?: number;
  reporters?: string[];
  last_priority_update?: string;
}



const MapView: React.FC = () => {
  const location = useLocation();
  const [potholes, setPotholes] = useState<Pothole[]>([]);
  const [filteredPotholes, setFilteredPotholes] = useState<Pothole[]>([]);
  const [selectedPothole, setSelectedPothole] = useState<Pothole | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(13);
  const [mapKey, setMapKey] = useState(0); // Force re-render counter
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showMapControls, setShowMapControls] = useState(false);
  const [filters, setFilters] = useState({
    distance: 'all', // 'all', '1km', '5km', '10km'
    severity: 'all', // 'all', 'low', 'medium', 'high', 'critical'
    priority: 'all', // 'all', 'high-priority', 'normal'
    timeframe: 'all', // 'all', 'today', 'week', 'month'
    dateFrom: '', // Custom date range start
    dateTo: '' // Custom date range end
  });

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setMapZoom(13); // City-level zoom when user location is found
          setMapKey(prev => prev + 1); // Force re-render
          console.log('User location detected:', latitude, longitude);
        },
        (error) => {
          console.log('Geolocation error:', error);
          console.log('Using default NYC location');
          // Keep default NYC location if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes
        }
      );
    } else {
      console.log('Geolocation not supported, using default NYC location');
    }
  }, []);

  // Handle focus location from tracking page or dashboard
  useEffect(() => {
    const state = location.state as any;
    if (state?.focusLocation) {
      console.log('Focus location received:', state.focusLocation);
      setMapCenter([state.focusLocation.lat, state.focusLocation.lng]);
      setMapZoom(17); // Higher zoom for specific pothole focus
      setMapKey(prev => prev + 1); // Force re-render
      
      // If there's a selected pothole, store it temporarily to match with fetched data
      if (state.selectedPothole) {
        console.log('Selected pothole from navigation:', state.selectedPothole);
        // Store the pothole to be matched after fetch
        setSelectedPothole(state.selectedPothole);
      }
    }
  }, [location.state]);

  // Get authentication token for jurisdiction filtering
  const { token } = useAuth();

  // Fetch real pothole data from backend
  const fetchPotholes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Include token if available for jurisdiction-based filtering
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Build URL with date range query parameters if set
      let url = 'http://localhost:5002/api/potholes';
      const queryParams = new URLSearchParams();
      if (filters.dateFrom) {
        queryParams.append('date_from', filters.dateFrom);
      }
      if (filters.dateTo) {
        queryParams.append('date_to', filters.dateTo);
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
      
      const response = await fetch(url, {
        headers
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns {potholes: [...], total_count: N}, we need the potholes array
        const potholesArray = data.potholes || data || [];
        setPotholes(Array.isArray(potholesArray) ? potholesArray : []);
        console.log('Loaded potholes from backend:', potholesArray.length);
        console.log('Sample pothole data:', potholesArray[0]); // Debug first pothole
        // Debug annotated images
        console.log('Potholes with annotated images:', potholesArray.filter(p => p.annotatedImageUrl).length);
        console.log('Potholes with images:', potholesArray.filter(p => p.imageUrl).length);
      } else {
        setError(`Failed to fetch potholes: ${response.status}`);
        console.error('Failed to fetch potholes:', response.status);
        setPotholes([]); // Set empty array on error
      }
    } catch (error) {
      setError('Unable to connect to backend server');
      console.error('Error fetching potholes:', error);
      setPotholes([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Load real pothole data on component mount and when location or date filters change
  useEffect(() => {
    fetchPotholes();
    
    // Set up polling to get real-time updates every 30 seconds
    const interval = setInterval(fetchPotholes, 30000);
    
    return () => clearInterval(interval); // Cleanup on unmount
  }, [userLocation, filters.dateFrom, filters.dateTo]);

  // Match selected pothole with fetched data after potholes are loaded
  useEffect(() => {
    const state = location.state as any;
    if (state?.selectedPothole && potholes.length > 0) {
      // Find the pothole in fetched data by id or reference number
      const matchedPothole = potholes.find(p => 
        p.id === state.selectedPothole.id || 
        p.reference_number === state.selectedPothole.reference_number
      );
      if (matchedPothole) {
        console.log('Matched pothole from fetched data:', matchedPothole);
        setSelectedPothole(matchedPothole);
        setShowSidebar(true); // Show sidebar with pothole details
      }
    }
  }, [potholes, location.state]);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Apply filters to potholes
  useEffect(() => {
    let filtered = [...potholes];

    // ALWAYS exclude fixed potholes from map display
    filtered = filtered.filter(pothole => pothole.status !== 'fixed');

    // Distance filter
    if (filters.distance !== 'all' && userLocation) {
      const maxDistance = filters.distance === '1km' ? 1 : filters.distance === '5km' ? 5 : 10;
      filtered = filtered.filter(pothole => {
        const lat = pothole.lat ?? pothole.latitude;
        const lng = pothole.lng ?? pothole.longitude;
        if (!lat || !lng) return false;
        
        const distance = calculateDistance(userLocation[0], userLocation[1], lat, lng);
        return distance <= maxDistance;
      });
    }

    // Severity filter
    if (filters.severity !== 'all') {
      filtered = filtered.filter(pothole => pothole.severity === filters.severity);
    }

    // Priority filter
    if (filters.priority === 'high-priority') {
      filtered = filtered.filter(pothole => (pothole.priority_score || 1) > 1);
    }

    // Time filter
    if (filters.timeframe !== 'all') {
      const now = new Date();
      let cutoffDate: Date;
      
      switch (filters.timeframe) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter(pothole => {
        const reportDate = new Date(pothole.created_at || pothole.reportedAt || pothole.reported_date || 0);
        return reportDate >= cutoffDate;
      });
    }

    // Always include the selected pothole in filtered results (even if it doesn't match filters)
    if (selectedPothole && !filtered.find(p => p.id === selectedPothole.id)) {
      filtered.push(selectedPothole);
    }

    setFilteredPotholes(filtered);
  }, [potholes, filters, userLocation, selectedPothole]);

  // Get marker color based on severity
  const getMarkerColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444'; // red
      case 'medium': return '#f97316'; // orange
      case 'low': return '#eab308'; // yellow
      default: return '#6b7280'; // gray
    }
  };

  // Create custom marker icon with priority indication
  const createCustomIcon = (severity: string, priorityScore: number = 1) => {
    const baseColor = getMarkerColor(severity);
    const size = Math.min(Math.max(20 + (priorityScore - 1) * 4, 20), 35); // Scale marker size by priority
    const pulseAnimation = priorityScore > 3 ? 'animation: pulse 2s infinite;' : '';
    
    return new L.DivIcon({
      html: `
        <div style="
          background-color: ${baseColor}; 
          width: ${size}px; 
          height: ${size}px; 
          border-radius: 50%; 
          border: 3px solid white; 
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ${pulseAnimation}
          position: relative;
        ">
          ${priorityScore > 1 ? `<div style="
            position: absolute;
            top: -8px;
            right: -8px;
            background: #ff4444;
            color: white;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            font-size: 10px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid white;
          ">${priorityScore}</div>` : ''}
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `,
      className: 'custom-marker',
      iconSize: [size + 10, size + 10],
      iconAnchor: [(size + 10) / 2, (size + 10) / 2]
    });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm border-b border-gray-200 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
            </div>
            
            {/* Filter Toggle and Stats */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Showing {filteredPotholes.length} of {potholes.length} potholes
              </div>
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM6 5a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1V5z" clipRule="evenodd"/>
                </svg>
                <span>View Reports</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd"/>
                </svg>
                <span>Filters</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              
              {/* Distance Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance from me
                </label>
                <select
                  value={filters.distance}
                  onChange={(e) => setFilters({...filters, distance: e.target.value})}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!userLocation}
                >
                  <option value="all">All distances</option>
                  <option value="1km">Within 1 km</option>
                  <option value="5km">Within 5 km</option>
                  <option value="10km">Within 10 km</option>
                </select>
                {!userLocation && (
                  <p className="text-xs text-gray-500 mt-1">Enable location to use</p>
                )}
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({...filters, severity: e.target.value})}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All severities</option>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Community Priority
                </label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All priorities</option>
                  <option value="high-priority">🔥 High priority (2+ reports)</option>
                  <option value="normal">📍 Single reports</option>
                </select>
              </div>

              {/* Time Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reported
                </label>
                <select
                  value={filters.timeframe}
                  onChange={(e) => setFilters({...filters, timeframe: e.target.value})}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">This week</option>
                  <option value="month">This month</option>
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value, timeframe: 'all'})}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                  max={filters.dateTo || undefined}
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value, timeframe: 'all'})}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-1.5 focus:ring-blue-500 focus:border-blue-500"
                  min={filters.dateFrom || undefined}
                />
              </div>

            </div>
            
            {/* Quick Filter Buttons */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setFilters({...filters, priority: 'high-priority', severity: 'all'})}
                className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
              >
                🔥 Priority Hotspots
              </button>
              <button
                onClick={() => setFilters({...filters, severity: 'high', priority: 'all'})}
                className="text-xs px-3 py-1 bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200 transition-colors"
              >
                🟠 High Severity Only
              </button>
              <button
                onClick={() => setFilters({...filters, timeframe: 'week', priority: 'all', severity: 'all'})}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                📅 Recent Reports
              </button>
              <button
                onClick={() => setFilters({distance: 'all', severity: 'all', priority: 'all', timeframe: 'all', dateFrom: '', dateTo: ''})}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                🔄 Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex ${showFilters ? 'h-[calc(100vh-200px)]' : 'h-[calc(100vh-80px)]'}`}>
        {/* Map Area */}
        <div className={`${showSidebar ? 'flex-1' : 'w-full'} relative`}>
          {/* Error Message */}
          {error && (
            <div className="absolute top-4 left-4 right-4 z-10 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
                <button 
                  onClick={() => setError(null)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* No Results Message */}
          {!isLoading && !error && filteredPotholes.length === 0 && potholes.filter(p => p.status !== 'fixed').length > 0 && (
            <div className="absolute top-4 left-4 right-4 z-10 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">No active potholes match your filters</h3>
                  <p className="text-xs text-yellow-700">Try adjusting your filter settings or clearing all filters to see more results.</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute top-4 left-4 right-4 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <svg className="animate-spin w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Loading potholes...</h3>
                  <p className="text-xs text-blue-700">Fetching the latest pothole data from the server.</p>
                </div>
              </div>
            </div>
          )}

          <MapContainer
            key={`map-${mapKey}`}
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <MapUpdater center={mapCenter} zoom={mapZoom} />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* User Location Marker */}
            {userLocation && (
              <Marker position={userLocation}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-blue-800">Your Location</h3>
                    <p className="text-sm text-gray-600">
                      {userLocation[0].toFixed(4)}, {userLocation[1].toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Pothole Markers */}
            {filteredPotholes.map((pothole) => {
              // Handle coordinate format differences between frontend and backend
              const lat = pothole.lat ?? pothole.latitude;
              const lng = pothole.lng ?? pothole.longitude;
              
              if (!lat || !lng) {
                console.warn('Pothole missing coordinates:', pothole);
                return null;
              }

              return (
                <Marker
                  key={pothole.id}
                  position={[lat, lng]}
                  icon={createCustomIcon(pothole.severity, pothole.priority_score || 1)}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {pothole.reference_number || `Pothole #${pothole.id}`}
                      </h3>
                      {pothole.reporter_name && (
                        <p className="text-xs text-gray-600 mb-2">
                          Reported by: {pothole.reporter_name}
                        </p>
                      )}
                      
                      {/* Display Image */}
                      {(pothole.annotatedImageUrl || pothole.imageUrl || (pothole as any).image_path) && (
                        <div className="mb-3">
                          <img 
                            src={(() => {
                              const imageUrl = pothole.annotatedImageUrl || pothole.imageUrl || (pothole as any).image_path;
                              // If URL starts with http/https, use it directly (Supabase URLs)
                              if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                                return imageUrl;
                              }
                              // Otherwise, it's a relative path from old system
                              return `http://localhost:5002/${imageUrl}`;
                            })()}
                            alt={`${pothole.annotatedImageUrl ? 'Annotated' : 'Original'} detection #${pothole.id}`}
                            className="w-full h-32 object-cover rounded border cursor-pointer"
                            onError={(e) => {
                              console.log('Image failed to load for pothole:', pothole.id);
                              console.log('Tried URL:', (e.target as HTMLImageElement).src);
                              // Hide image container if it fails to load
                              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                            }}
                            onClick={() => {
                              const imageUrl = pothole.annotatedImageUrl || pothole.imageUrl || (pothole as any).image_path;
                              const fullUrl = (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) 
                                ? imageUrl 
                                : `http://localhost:5002/${imageUrl}`;
                              window.open(fullUrl, '_blank');
                            }}
                          />
                          <div className="text-xs text-center mt-1">
                            {pothole.confidence && (
                              <p className="text-blue-700">
                                AI Confidence: {pothole.confidence}%
                              </p>
                            )}
                            {pothole.priority_score && pothole.priority_score > 1 && (
                              <p className="text-red-700 font-semibold">
                                🔥 Priority Score: {pothole.priority_score} ({pothole.report_count} reports)
                              </p>
                            )}
                            <p className="text-gray-600">
                              {pothole.annotatedImageUrl ? 'Annotated Image' : 
                               pothole.imageUrl ? 'Original Image' : 'Reported Image'}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-gray-600">Severity</p>
                          <div className={`mt-1 px-2 py-1 rounded text-xs text-center ${
                            pothole.severity === 'high' ? 'bg-red-100 text-red-800' :
                            pothole.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pothole.severity.toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Status</p>
                          <div className={`mt-1 px-2 py-1 rounded text-xs text-center ${
                            pothole.status === 'fixed' ? 'bg-green-100 text-green-800' :
                            pothole.status === 'completed' ? 'bg-green-100 text-green-800' :
                            pothole.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            pothole.status === 'verified' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {pothole.status.replace('_', ' ').toUpperCase()}
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-2">{pothole.description}</p>
                      <p className="text-xs text-gray-500 mb-2">
                        Reported: {pothole.created_at ? new Date(pothole.created_at).toLocaleDateString() : 
                                  pothole.reportedAt || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Location: {lat.toFixed(4)}, {lng.toFixed(4)}
                      </p>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedPothole(pothole);
                            setShowSidebar(true);
                          }}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          View Details
                        </button>
                        {pothole.imageUrl && (
                          <button 
                            onClick={() => window.open(pothole.imageUrl, '_blank')}
                            className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                          >
                            View Image
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            
            {/* Click to add new pothole - DISABLED */}
            {/* <AddMarkerOnClick onShowReportDialog={showReportDialogAtLocation} /> */}
            
            {/* Route Planner Component - Inside MapContainer */}
            {showRoutePlanner && (
              <RoutePlanner potholes={filteredPotholes} userLocation={userLocation} />
            )}
          </MapContainer>
          
          {/* Collapsible Map Controls */}
          {showLegend && (
            <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
              <h3 className="font-semibold text-sm mb-2">Legend</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>High Priority</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  <span>Medium Priority</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Low Priority</span>
                </div>
                <div className="flex items-center mt-2 pt-1 border-t border-gray-200">
                  <div className="relative mr-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 text-white rounded-full text-xs flex items-center justify-content center" style={{fontSize: '6px', fontWeight: 'bold'}}>2</div>
                  </div>
                  <span>Priority Hotspots (2+ reports)</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Interactive map view</p>
                <button 
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const { latitude, longitude } = position.coords;
                          setUserLocation([latitude, longitude]);
                          setMapCenter([latitude, longitude]);
                          setMapZoom(15); // Close zoom for user location
                          setMapKey(prev => prev + 1); // Force re-render
                        },
                        (error) => alert('Unable to get your location')
                      );
                    }
                  }}
                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 mr-2"
                >
                  📍 Find My Location
                </button>
                <button 
                  onClick={fetchPotholes}
                  disabled={isLoading}
                  className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  🔄 Refresh Data
                </button>
              </div>
            </div>
          )}

          {/* Map Control Button - Single Expandable Menu */}
          <div className="fixed bottom-4 left-4 right-4 md:right-auto z-50">
            {/* Expanded Menu Options */}
            {showMapControls && (
              <div className="mb-2 space-y-2 animate-fadeIn grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-0 md:space-y-2">
                {/* Plan Route Button */}
                <button
                  onClick={() => {
                    if (showRoutePlanner) {
                      // If already open, close it
                      setShowRoutePlanner(false);
                    } else {
                      // If closed, open it
                      setShowRoutePlanner(true);
                    }
                    setShowMapControls(false);
                  }}
                  className={`${showRoutePlanner ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'} rounded-full shadow-lg p-3 hover:bg-blue-700 hover:text-white transition-all duration-200 border border-gray-200 flex items-center gap-2 pr-4`}
                  title="Plan Route"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">{showRoutePlanner ? 'Close Route' : 'Plan Route'}</span>
                </button>

                {/* Reset to India Button */}
                <button
                  onClick={() => {
                    setMapCenter([20.5937, 78.9629]);
                    setMapZoom(5);
                    setMapKey(prev => prev + 1);
                    setUserLocation(null);
                    setShowMapControls(false);
                  }}
                  className="bg-white text-gray-600 rounded-full shadow-lg p-3 hover:bg-gray-50 transition-all duration-200 border border-gray-200 flex items-center gap-2 pr-4"
                  title="Reset to India View"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">Reset View</span>
                </button>

                {/* Legend Toggle Button */}
                <button
                  onClick={() => {
                    setShowLegend(!showLegend);
                    setShowMapControls(false);
                  }}
                  className="bg-white text-gray-600 rounded-full shadow-lg p-3 hover:bg-gray-50 transition-all duration-200 border border-gray-200 flex items-center gap-2 pr-4"
                  title={showLegend ? "Hide Legend" : "Show Legend"}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">{showLegend ? 'Hide' : 'Show'} Legend</span>
                </button>

                {/* Detect Live Location Button */}
                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          const { latitude, longitude } = position.coords;
                          setUserLocation([latitude, longitude]);
                          setMapCenter([latitude, longitude]);
                          setMapZoom(15); // Closer zoom for live location
                          setMapKey(prev => prev + 1);
                          setShowMapControls(false);
                          console.log('Live location detected:', latitude, longitude);
                        },
                        (error) => {
                          console.error('Geolocation error:', error);
                          alert('Unable to detect your location. Please enable location services.');
                        },
                        {
                          enableHighAccuracy: true,
                          timeout: 10000,
                          maximumAge: 0
                        }
                      );
                    } else {
                      alert('Geolocation is not supported by your browser.');
                    }
                  }}
                  className="bg-white text-gray-600 rounded-full shadow-lg p-3 hover:bg-gray-50 transition-all duration-200 border border-gray-200 flex items-center gap-2 pr-4"
                  title="Detect My Location"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" fill="currentColor"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4M2 12h4m12 0h4"/>
                    <circle cx="12" cy="12" r="8" strokeWidth="2"/>
                  </svg>
                  <span className="text-sm font-medium whitespace-nowrap">My Location</span>
                </button>
              </div>
            )}

            {/* Main Control Button */}
            <button
              onClick={() => {
                if (showMapControls) {
                  // Closing the menu - also close all active features
                  setShowMapControls(false);
                  setShowRoutePlanner(false);
                  setShowLegend(false);
                } else {
                  // Opening the menu
                  setShowMapControls(true);
                }
              }}
              className={`${showMapControls ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'} rounded-full shadow-lg p-3 md:p-4 hover:bg-blue-600 hover:text-white transition-all duration-200 border border-gray-200`}
              title="Map Controls"
            >
              {showMapControls ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Collapsible Sidebar */}
        {showSidebar && (
          <div className="w-1/3 bg-white shadow-lg overflow-y-auto">
            <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Dashboard</h2>
            
            {/* Statistics */}
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800">Total Potholes</h3>
                <p className="text-2xl font-bold text-blue-600">{potholes ? potholes.length : 0}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h3 className="font-medium text-orange-800">High Priority</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {potholes ? potholes.filter(p => p.severity === 'high').length : 0}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800">Fixed</h3>
                <p className="text-xl font-bold text-green-900">
                  {potholes ? potholes.filter(p => p.status === 'fixed').length : 0}
                </p>
              </div>
            </div>

            {/* Anonymous System Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">
                🔓 Anonymous Reporting System
              </h3>
              <div className="text-xs text-blue-800 space-y-1">
                <p>• Citizens can report potholes without accounts</p>
                <p>• Each report gets a tracking reference number</p>
                <p>• All reports are visible on this public map</p>
                <p>• Track your report status anytime</p>
              </div>
            </div>

            {/* Recent Reports */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Recent Reports</h3>
              
              <div className="space-y-3">
                {potholes && potholes.length > 0 ? (
                  potholes.slice(0, 5).map((pothole) => (
                    <React.Fragment key={pothole.id}>
                      {/* Report Card */}
                      <div 
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedPothole?.id === pothole.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedPothole(selectedPothole?.id === pothole.id ? null : pothole)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">
                            {pothole.reference_number || `Pothole #${pothole.id}`}
                            {pothole.priority_score && pothole.priority_score > 1 && (
                              <span className="ml-1 text-red-600 font-bold">🔥{pothole.priority_score}</span>
                            )}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            pothole.severity === 'high' ? 'bg-red-100 text-red-800' :
                            pothole.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pothole.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{pothole.description}</p>
                        <p className="text-xs text-gray-500">
                          {pothole.created_at ? new Date(pothole.created_at).toLocaleDateString() : 
                           pothole.reportedAt || pothole.reported_date || 'Unknown date'}
                          {pothole.reporter_name && (
                            <span className="ml-2 text-blue-600">• by {pothole.reporter_name}</span>
                          )}
                          {pothole.report_count && pothole.report_count > 1 && (
                            <span className="ml-2 text-blue-600">• {pothole.report_count} reports</span>
                          )}
                        </p>
                      </div>
                      
                      {/* Expanded Details - Shows right below selected report */}
                      {selectedPothole?.id === pothole.id && (
                        <div className="ml-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500 animate-fadeIn">
                          <h4 className="font-semibold text-blue-800 mb-3 text-sm">Detailed Information</h4>
                          
                          {/* Image Display */}
                          {(selectedPothole.annotatedImageUrl || selectedPothole.imageUrl || (selectedPothole as any).image_path) && (
                            <div className="mb-3">
                              <img 
                                src={(() => {
                                  const imageUrl = selectedPothole.annotatedImageUrl || selectedPothole.imageUrl || (selectedPothole as any).image_path;
                                  // If URL starts with http/https, use it directly (Supabase URLs)
                                  if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
                                    return imageUrl;
                                  }
                                  // Otherwise, it's a relative path from old system
                                  return `http://localhost:5002/${imageUrl}`;
                                })()}
                                alt={`${selectedPothole.annotatedImageUrl ? 'Annotated' : 'Original'} detection #${selectedPothole.id}`}
                                className="w-full h-32 object-cover rounded border cursor-pointer"
                                onError={(e) => {
                                  console.log('Sidebar image failed to load for pothole:', selectedPothole.id);
                                  (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                                }}
                                onClick={() => {
                                  const imageUrl = selectedPothole.annotatedImageUrl || selectedPothole.imageUrl || (selectedPothole as any).image_path;
                                  const fullUrl = (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) 
                                    ? imageUrl 
                                    : `http://localhost:5002/${imageUrl}`;
                                  window.open(fullUrl, '_blank');
                                }}
                              />
                              {selectedPothole.confidence && (
                                <p className="text-xs text-center mt-1 text-blue-700">
                                  AI Confidence: {selectedPothole.confidence}%
                                </p>
                              )}
                            </div>
                          )}
                          
                          <div className="space-y-1.5 text-xs">
                            {selectedPothole.reference_number ? (
                              <p><span className="font-medium">Reference:</span> {selectedPothole.reference_number}</p>
                            ) : (
                              <p><span className="font-medium">ID:</span> #{selectedPothole.id}</p>
                            )}
                            {selectedPothole.reporter_name && (
                              <p><span className="font-medium">Reporter:</span> {selectedPothole.reporter_name}</p>
                            )}
                            <p><span className="font-medium">Location:</span> {(selectedPothole.lat || selectedPothole.latitude)?.toFixed(4)}, {(selectedPothole.lng || selectedPothole.longitude)?.toFixed(4)}</p>
                            <p><span className="font-medium">Severity:</span> {selectedPothole.severity}</p>
                            <p><span className="font-medium">Status:</span> {selectedPothole.status.replace('_', ' ')}</p>
                            <p><span className="font-medium">Reported:</span> {
                              selectedPothole.created_at ? new Date(selectedPothole.created_at).toLocaleDateString() : 
                              selectedPothole.reportedAt || 'Unknown'
                            }</p>
                          </div>
                          
                          {selectedPothole.imageUrl && (
                            <button 
                              onClick={() => window.open(selectedPothole.imageUrl, '_blank')}
                              className="mt-3 w-full text-xs bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700"
                            >
                              View Full Image
                            </button>
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">No potholes reported yet</p>
                    {isLoading && <p className="text-xs mt-1">Loading...</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Removed old Selected Pothole Details section from here */}
            {false && selectedPothole && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">Selected Pothole</h3>
                
                {/* Image Display */}
                {(selectedPothole.annotatedImageUrl || selectedPothole.imageUrl || (selectedPothole as any).image_path) && (
                  <div className="mb-3">
                    <img 
                      src={
                        selectedPothole.annotatedImageUrl || 
                        selectedPothole.imageUrl || 
                        `http://localhost:5002/${(selectedPothole as any).image_path}`
                      }
                      alt={`${selectedPothole.annotatedImageUrl ? 'Annotated' : 'Original'} detection #${selectedPothole.id}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer"
                      onError={(e) => {
                        console.log('Sidebar image failed to load for pothole:', selectedPothole.id);
                        (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                      }}
                      onClick={() => window.open(
                        selectedPothole.annotatedImageUrl || 
                        selectedPothole.imageUrl || 
                        `http://localhost:5002/${(selectedPothole as any).image_path}`, 
                        '_blank'
                      )}
                    />
                    {selectedPothole.confidence && (
                      <p className="text-xs text-center mt-1 text-blue-700">
                        AI Confidence: {selectedPothole.confidence}%
                      </p>
                    )}
                  </div>
                )}
                
                <div className="space-y-2 text-sm">
                  {selectedPothole.reference_number ? (
                    <p><span className="font-medium">Reference:</span> {selectedPothole.reference_number}</p>
                  ) : (
                    <p><span className="font-medium">ID:</span> #{selectedPothole.id}</p>
                  )}
                  {selectedPothole.reporter_name && (
                    <p><span className="font-medium">Reporter:</span> {selectedPothole.reporter_name}</p>
                  )}
                  <p><span className="font-medium">Location:</span> {(selectedPothole.lat || selectedPothole.latitude)?.toFixed(4)}, {(selectedPothole.lng || selectedPothole.longitude)?.toFixed(4)}</p>
                  <p><span className="font-medium">Severity:</span> {selectedPothole.severity}</p>
                  <p><span className="font-medium">Status:</span> {selectedPothole.status.replace('_', ' ')}</p>
                  <p><span className="font-medium">Description:</span> {selectedPothole.description}</p>
                  <p><span className="font-medium">Reported:</span> {
                    selectedPothole.created_at ? new Date(selectedPothole.created_at).toLocaleDateString() : 
                    selectedPothole.reportedAt || 'Unknown'
                  }</p>
                </div>
                
                <div className="flex space-x-2 mt-3">
                  {selectedPothole.imageUrl && (
                    <button 
                      onClick={() => window.open(selectedPothole.imageUrl, '_blank')}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                      View Original
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedPothole(null)}
                    className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;