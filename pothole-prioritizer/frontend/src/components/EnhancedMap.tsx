import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { UserReport } from '../types/user';
import Card from '../components/Card';
import Button from '../components/Button';

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  reports?: UserReport[];
  onReportClick?: (report: UserReport) => void;
  showVoting?: boolean;
  showFilters?: boolean;
}

const EnhancedMap: React.FC<MapProps> = ({
  center = { lat: 12.9716, lng: 77.5946 }, // Default to Bangalore
  zoom = 12,
  reports = [],
  onReportClick,
  showVoting = true,
  showFilters = true
}) => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyReports, setNearbyReports] = useState<UserReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<UserReport | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentLocation();
    loadNearbyReports();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(coords);
        },
        (error) => {
          console.warn('Location access denied:', error);
          toast.error('Location access denied. Using default location.');
        }
      );
    }
  };

  const loadNearbyReports = async () => {
    try {
      setIsLoading(true);
      // Mock data for now - replace with actual API call
      const mockReports: UserReport[] = [
        {
          id: '1',
          latitude: 12.9716,
          longitude: 77.5946,
          severity: 'critical',
          aiConfidence: 0.95,
          description: 'Large pothole causing traffic issues on MG Road',
          status: 'reported',
          priorityScore: 145,
          voteCount: 28,
          imagePaths: ['image1.jpg'],
          address: 'MG Road, Bangalore, Karnataka',
          createdAt: '2025-09-06T08:30:00Z',
          updatedAt: '2025-09-06T08:30:00Z'
        },
        {
          id: '2',
          latitude: 12.9756,
          longitude: 77.5986,
          severity: 'high',
          aiConfidence: 0.87,
          description: 'Deep pothole near school causing safety concerns',
          status: 'in_progress',
          priorityScore: 120,
          voteCount: 15,
          imagePaths: ['image2.jpg'],
          address: 'Brigade Road, Bangalore, Karnataka',
          createdAt: '2025-09-06T07:15:00Z',
          updatedAt: '2025-09-06T09:00:00Z'
        },
        {
          id: '3',
          latitude: 12.9676,
          longitude: 77.5906,
          severity: 'medium',
          aiConfidence: 0.78,
          description: 'Moderate pothole affecting vehicle alignment',
          status: 'reported',
          priorityScore: 85,
          voteCount: 8,
          imagePaths: ['image3.jpg'],
          address: 'Commercial Street, Bangalore, Karnataka',
          createdAt: '2025-09-06T06:45:00Z',
          updatedAt: '2025-09-06T06:45:00Z'
        }
      ];
      setNearbyReports(mockReports);
    } catch (error) {
      toast.error('Failed to load nearby reports');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (reportId: string, voteType: 'up' | 'down') => {
    if (!user) {
      toast.error('Please login to vote');
      return;
    }

    try {
      // TODO: API call to submit vote
      toast.success(`Vote ${voteType === 'up' ? 'added' : 'removed'} successfully`);
      
      // Update local state
      setNearbyReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, voteCount: report.voteCount + (voteType === 'up' ? 1 : -1) }
          : report
      ));
    } catch (error) {
      toast.error('Failed to submit vote');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444'; // red-500
      case 'high': return '#f97316'; // orange-500
      case 'medium': return '#eab308'; // yellow-500
      case 'low': return '#22c55e'; // green-500
      default: return '#6b7280'; // gray-500
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reported': return '🔍';
      case 'in_progress': return '🔧';
      case 'completed': return '✅';
      case 'rejected': return '❌';
      default: return '📍';
    }
  };

  const filteredReports = nearbyReports.filter(report => {
    if (filterSeverity !== 'all' && report.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && report.status !== filterStatus) return false;
    return true;
  });

  const renderMapPlaceholder = () => (
    <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">🗺️</div>
        <div className="text-lg font-medium text-gray-700 mb-2">Interactive Map</div>
        <div className="text-sm text-gray-500">
          Map integration with Google Maps or Mapbox would go here
        </div>
        {userLocation && (
          <div className="mt-2 text-xs text-blue-600">
            Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </div>
        )}
      </div>
    </div>
  );

  const renderReportCard = (report: UserReport) => (
    <Card 
      key={report.id} 
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => {
        setSelectedReport(report);
        if (onReportClick) onReportClick(report);
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded-full" 
            style={{ backgroundColor: getSeverityColor(report.severity) }}
          ></div>
          <span className="font-medium text-gray-900 capitalize">{report.severity}</span>
          <span className="text-lg">{getStatusIcon(report.status)}</span>
        </div>
        <div className="text-sm text-gray-500">
          {Math.round(report.aiConfidence * 100)}% confidence
        </div>
      </div>
      
      <p className="text-gray-700 mb-2 line-clamp-2">{report.description}</p>
      <p className="text-sm text-gray-500 mb-3">{report.address}</p>
      
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Priority: {report.priorityScore} • {new Date(report.createdAt).toLocaleDateString()}
        </div>
        
        {showVoting && (
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVote(report.id, 'up');
              }}
              className="flex items-center space-x-1 px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
            >
              <span>👍</span>
              <span className="text-sm font-medium">{report.voteCount}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleVote(report.id, 'down');
              }}
              className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              👎
            </button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Severity:</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="reported">Reported</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <Button size="sm" onClick={loadNearbyReports}>
              🔄 Refresh
            </Button>
            
            <Button size="sm" onClick={getCurrentLocation}>
              📍 My Location
            </Button>
          </div>
        </Card>
      )}

      {/* Map */}
      <Card className="p-4">
        <div ref={mapRef}>
          {renderMapPlaceholder()}
        </div>
      </Card>

      {/* Reports List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Nearby Potholes ({filteredReports.length})
          </h3>
          {isLoading && (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map(renderReportCard)}
        </div>
        
        {filteredReports.length === 0 && !isLoading && (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No potholes found!</h3>
            <p className="text-gray-600">
              {nearbyReports.length === 0 
                ? "Great news! No potholes reported in this area."
                : "No potholes match your current filters."
              }
            </p>
          </Card>
        )}
      </div>

      {/* Selected Report Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Pothole Details</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: getSeverityColor(selectedReport.severity) }}
                ></div>
                <span className="font-medium capitalize">{selectedReport.severity} Severity</span>
                <span>{getStatusIcon(selectedReport.status)}</span>
              </div>
              
              <p className="text-gray-700">{selectedReport.description}</p>
              <p className="text-sm text-gray-500">{selectedReport.address}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">AI Confidence:</span>
                  <div>{Math.round(selectedReport.aiConfidence * 100)}%</div>
                </div>
                <div>
                  <span className="font-medium">Priority Score:</span>
                  <div>{selectedReport.priorityScore}</div>
                </div>
                <div>
                  <span className="font-medium">Votes:</span>
                  <div>{selectedReport.voteCount}</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="capitalize">{selectedReport.status.replace('_', ' ')}</div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Reported: {new Date(selectedReport.createdAt).toLocaleString()}
              </div>
            </div>
            
            {showVoting && (
              <div className="flex items-center justify-center space-x-4 mt-6 pt-4 border-t">
                <Button
                  onClick={() => handleVote(selectedReport.id, 'up')}
                  className="flex items-center space-x-2"
                >
                  <span>👍</span>
                  <span>Vote Up</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleVote(selectedReport.id, 'down')}
                  className="flex items-center space-x-2"
                >
                  <span>👎</span>
                  <span>Vote Down</span>
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default EnhancedMap;
