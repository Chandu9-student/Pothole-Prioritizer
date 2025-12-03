import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Card from '../components/Card';
import Button from '../components/Button';
import { MapPinIcon, ClockIcon, UserIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface PotholeTrackingInfo {
  reference_number: string;
  status: string;
  severity: string;
  description: string;
  reported_date: string;
  location: {
    latitude: number;
    longitude: number;
  };
  reporter_name: string;
  updates: Array<{
    status: string;
    date: string;
    note?: string;
  }>;
}

const TrackPothole: React.FC = () => {
  const navigate = useNavigate();
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState<PotholeTrackingInfo | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async () => {
    if (!referenceNumber.trim()) {
      toast.error('Please enter a reference number');
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setTrackingInfo(null);

    try {
      const response = await fetch(getApiUrl(`api/track/${referenceNumber.trim()}`));
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Map backend response to frontend interface
        const pothole = data.pothole;
        const mappedData = {
          ...pothole,
          reported_date: pothole.created_at || pothole.reported_date,
          location: pothole.location || {
            latitude: pothole.latitude,
            longitude: pothole.longitude
          },
          updates: [] // Backend doesn't provide updates array yet
        };
        setTrackingInfo(mappedData);
        toast.success('Pothole tracking information found!');
      } else {
        setNotFound(true);
        toast.error(data.error || 'Pothole not found');
      }
    } catch (error) {
      console.error('Error tracking pothole:', error);
      toast.error('Failed to track pothole. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'reported': return 'bg-yellow-500 text-white border-2 border-yellow-600';
      case 'in_progress': return 'bg-blue-500 text-white border-2 border-blue-600';
      case 'fixed': return 'bg-green-500 text-white border-2 border-green-600';
      case 'completed': return 'bg-green-500 text-white border-2 border-green-600';
      case 'rejected': return 'bg-red-500 text-white border-2 border-red-600';
      case 'closed': return 'bg-gray-500 text-white border-2 border-gray-600';
      default: return 'bg-gray-500 text-white border-2 border-gray-600';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      case 'critical': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-2xl md:max-w-4xl mx-auto px-2 md:px-4">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-4">
            Track Your Pothole Report
          </h1>
          <p className="text-sm md:text-lg text-gray-600">
            Enter your reference number to check the status of your pothole report
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6 md:mb-8">
          <div className="p-3 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:gap-4">
              <div className="flex-1">
                <label htmlFor="reference" className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                  Reference Number
                </label>
                <input
                  type="text"
                  id="reference"
                  placeholder="e.g., PH-2025-ABC123"
                  className="w-full px-2 md:px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleTrack}
                  disabled={isLoading}
                  className="w-full md:w-auto"
                >
                  {isLoading ? 'Tracking...' : 'Track Pothole'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Loading Spinner */}
        {isLoading && (
          <Card className="mb-6 md:mb-8">
            <div className="p-6 md:p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              </div>
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                Tracking Pothole...
              </h3>
              <p className="text-xs md:text-sm text-gray-600">
                Please wait while we fetch the latest information
              </p>
            </div>
          </Card>
        )}

        {/* Not Found Message */}
        {notFound && !isLoading && (
          <Card className="mb-6 md:mb-8">
            <div className="p-3 md:p-6 text-center">
              <InformationCircleIcon className="h-8 md:h-12 w-8 md:w-12 text-gray-400 mx-auto mb-2 md:mb-4" />
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-1 md:mb-2">
                Pothole Not Found
              </h3>
              <p className="text-xs md:text-sm text-gray-600">
                No pothole found with reference number "{referenceNumber}". 
                Please check the reference number and try again.
              </p>
            </div>
          </Card>
        )}

        {/* Tracking Information */}
        {trackingInfo && !isLoading && (
          <div className="space-y-4 md:space-y-6">
            {/* Main Info Card */}
            <Card>
              <div className="p-3 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-2 md:mb-4 gap-2 md:gap-0">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900">
                    {trackingInfo.reference_number}
                  </h2>
                  <span className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow-md ${getStatusColor(trackingInfo.status)}`}>
                    {trackingInfo.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <div className="space-y-3 md:space-y-4">
                    {trackingInfo.location && trackingInfo.location.latitude && trackingInfo.location.longitude ? (
                      <div className="flex items-start space-x-2 md:space-x-3">
                        <MapPinIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-900">Location</p>
                          <p className="text-xs md:text-sm text-gray-600">
                            {trackingInfo.location.latitude.toFixed(6)}, {trackingInfo.location.longitude.toFixed(6)}
                          </p>
                          <button
                            onClick={() => navigate('/map', { 
                              state: { 
                                focusLocation: {
                                  lat: trackingInfo.location.latitude,
                                  lng: trackingInfo.location.longitude
                                },
                                selectedPothole: trackingInfo
                              }
                            })}
                            className="inline-flex items-center text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium bg-transparent border-none cursor-pointer mt-1"
                          >
                            📍 View on Map →
                          </button>
                        </div>
                      </div>
                    ) : trackingInfo.latitude && trackingInfo.longitude ? (
                      <div className="flex items-start space-x-2 md:space-x-3">
                        <MapPinIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-400 mt-1" />
                        <div>
                          <p className="text-xs md:text-sm font-medium text-gray-900">Location</p>
                          <p className="text-xs md:text-sm text-gray-600">
                            {(trackingInfo as any).latitude.toFixed(6)}, {(trackingInfo as any).longitude.toFixed(6)}
                          </p>
                          <button
                            onClick={() => navigate('/map', { 
                              state: { 
                                focusLocation: {
                                  lat: (trackingInfo as any).latitude,
                                  lng: (trackingInfo as any).longitude
                                },
                                selectedPothole: trackingInfo
                              }
                            })}
                            className="inline-flex items-center text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium bg-transparent border-none cursor-pointer mt-1"
                          >
                            📍 View on Map →
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-start space-x-2 md:space-x-3">
                      <ClockIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs md:text-sm font-medium text-gray-900">Reported Date</p>
                        <p className="text-xs md:text-sm text-gray-600">
                          {formatDate(trackingInfo.reported_date)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-start space-x-2 md:space-x-3">
                      <UserIcon className="h-4 md:h-5 w-4 md:w-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-xs md:text-sm font-medium text-gray-900">Reported By</p>
                        <p className="text-xs md:text-sm text-gray-600">{trackingInfo.reporter_name}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-900 mb-1">Severity</p>
                      <p className={`text-xs md:text-sm font-semibold ${getSeverityColor(trackingInfo.severity)}`}>
                        {trackingInfo.severity.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {trackingInfo.description && (
                  <div className="mt-4 md:mt-6">
                    <p className="text-xs md:text-sm font-medium text-gray-900 mb-1 md:mb-2">Description</p>
                    <p className="text-xs md:text-sm text-gray-600 bg-gray-50 p-2 md:p-3 rounded-md">
                      {trackingInfo.description}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Status Updates */}
            {trackingInfo.updates && trackingInfo.updates.length > 0 && (
              <Card>
                <div className="p-3 md:p-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2 md:mb-4">
                    Status Updates
                  </h3>
                  <div className="space-y-3 md:space-y-4">
                    {trackingInfo.updates.map((update, index) => (
                      <div key={index} className="flex items-start space-x-2 md:space-x-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        <div>
                          <div className="flex items-center space-x-1 md:space-x-2">
                            <span className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium ${getStatusColor(update.status)}`}>
                              {update.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(update.date)}
                            </span>
                          </div>
                          {update.note && (
                            <p className="text-xs md:text-sm text-gray-600 mt-1">{update.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="mt-6 md:mt-8">
          <div className="p-3 md:p-6 bg-blue-50">
            <h3 className="text-base md:text-lg font-semibold text-blue-900 mb-1 md:mb-2">
              How to Track Your Pothole
            </h3>
            <div className="text-xs md:text-sm text-blue-800 space-y-1 md:space-y-2">
              <p>• Your reference number was provided when you submitted your pothole report</p>
              <p>• Reference numbers are in the format: PH-YYYY-XXXXXX (e.g., PH-2025-ABC123)</p>
              <p>• You can check the status anytime without creating an account</p>
              <p>• Save your reference number to track progress updates</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TrackPothole;