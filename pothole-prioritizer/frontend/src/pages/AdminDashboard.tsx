import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import apiService from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';

interface PotholeReport {
  id: number;
  reference_number: string;
  latitude: number;
  longitude: number;
  severity: string;
  description: string;
  reporter_name: string;
  status: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [potholes, setPotholes] = useState<PotholeReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    fetchPotholes();
  }, [dateFrom, dateTo]);

  const fetchPotholes = async () => {
    try {
      setIsLoading(true);
      
      // Build URL with date range parameters
      let url = 'http://localhost:5002/api/potholes';
      const queryParams = new URLSearchParams();
      if (dateFrom) {
        queryParams.append('date_from', dateFrom);
      }
      if (dateTo) {
        queryParams.append('date_to', dateTo);
      }
      if (queryParams.toString()) {
        url += '?' + queryParams.toString();
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        const data = result.potholes || result || [];
        setPotholes(data);
      } else {
        throw new Error('Failed to fetch potholes');
      }
    } catch (error) {
      console.error('Error fetching potholes:', error);
      toast.error('Failed to load pothole data');
    } finally {
      setIsLoading(false);
    }
  };

  const updatePotholeStatus = async (potholeId: number, newStatus: string) => {
    // Show confirmation dialog if changing to 'fixed' status
    if (newStatus === 'fixed') {
      const confirmed = window.confirm(
        '⚠️ WARNING: Once marked as "Fixed", this status cannot be changed!\n\n' +
        'Are you sure this pothole has been completely repaired and the work is verified?'
      );
      
      if (!confirmed) {
        // Reset the select dropdown to current status
        const pothole = potholes.find(p => p.id === potholeId);
        if (pothole) {
          // Force re-render by updating state
          setPotholes([...potholes]);
        }
        return;
      }
    }
    
    try {
      setUpdatingId(potholeId);
      
      const response = await fetch(`http://localhost:5002/api/potholes/${potholeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await response.json();
      
      // Update local state
      setPotholes(potholes.map(p => 
        p.id === potholeId ? { ...p, status: newStatus } : p
      ));
      
      if (newStatus === 'fixed') {
        toast.success('✅ Pothole marked as Fixed! Status is now permanent.');
      } else {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update pothole status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // Check if user has admin access
  console.log('AdminDashboard - User:', user);
  console.log('AdminDashboard - User role:', user?.role);
  
  const isAdmin = user?.role && (
    user.role === 'authority' || 
    user.role.includes('admin') || 
    user.role.endsWith('_admin') ||
    user.role.endsWith('_authority')
  );
  
  console.log('AdminDashboard - isAdmin:', isAdmin);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need authority access to view this dashboard.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Authority Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome, {user.name} • Manage pothole reports from anonymous citizens
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 text-center bg-blue-50 border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{potholes.length}</div>
            <div className="text-sm font-medium text-blue-700">Total Reports</div>
          </Card>
          
          <Card className="p-6 text-center bg-yellow-50 border-yellow-200">
            <div className="text-3xl font-bold text-yellow-600 mb-2">
              {potholes.filter(p => p.status === 'reported').length}
            </div>
            <div className="text-sm font-medium text-yellow-700">New Reports</div>
          </Card>
          
          <Card className="p-6 text-center bg-indigo-50 border-indigo-200">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {potholes.filter(p => p.status === 'in_progress').length}
            </div>
            <div className="text-sm font-medium text-indigo-700">In Progress</div>
          </Card>
          
          <Card className="p-6 text-center bg-green-50 border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {potholes.filter(p => p.status === 'completed').length}
            </div>
            <div className="text-sm font-medium text-green-700">Completed</div>
          </Card>
        </div>

        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                All Pothole Reports
              </h3>
              <Button onClick={fetchPotholes} className="text-sm">
                Refresh
              </Button>
            </div>
            
            {/* Date Range Filter */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">From:</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    max={dateTo || undefined}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">To:</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    min={dateFrom || undefined}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Clear Dates
                  </button>
                )}
                <div className="flex-1"></div>
                <div className="text-sm text-gray-600">
                  {dateFrom || dateTo ? (
                    <span>Filtered: {dateFrom || 'All'} to {dateTo || 'Now'}</span>
                  ) : (
                    <span>Showing all reports</span>
                  )}
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : potholes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No pothole reports found. Citizens can report potholes anonymously using the app.
              </div>
            ) : (
              <div className="space-y-4">
                {potholes.map((pothole) => (
                  <div key={pothole.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{pothole.reference_number}</h4>
                          <p className="text-sm text-gray-600">by {pothole.reporter_name}</p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityClass(pothole.severity)}`}>
                            {pothole.severity.toUpperCase()}
                          </span>
                          
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusClass(pothole.status)}`}>
                            {pothole.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="text-sm text-gray-600">
                          {pothole.latitude.toFixed(4)}, {pothole.longitude.toFixed(4)}
                        </div>
                        <button
                          onClick={() => {
                            console.log('Navigating to map with pothole:', {
                              id: pothole.id,
                              lat: pothole.latitude,
                              lng: pothole.longitude,
                              reference: pothole.reference_number
                            });
                            navigate('/map', {
                              state: {
                                focusLocation: { lat: pothole.latitude, lng: pothole.longitude },
                                selectedPothole: pothole
                              }
                            });
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
                        >
                          View on Map →
                        </button>
                      </div>
                    </div>
                    
                    {pothole.description && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-700">{pothole.description}</p>
                      </div>
                    )}
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        Reported: {new Date(pothole.created_at).toLocaleDateString()}
                      </div>
                      
                      {/* Status Management */}
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-medium text-gray-700">Update Status:</label>
                        {pothole.status === 'fixed' ? (
                          <div className="flex items-center space-x-2">
                            <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-lg">
                              ✅ Fixed (Permanent)
                            </span>
                            <span className="text-xs text-gray-500 italic">Status locked</span>
                          </div>
                        ) : (
                          <>
                            <select
                              value={pothole.status}
                              onChange={(e) => updatePotholeStatus(pothole.id, e.target.value)}
                              disabled={updatingId === pothole.id}
                              className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="reported">Reported</option>
                              <option value="verified">Verified</option>
                              <option value="in_progress">In Progress</option>
                              <option value="fixed">Fixed</option>
                            </select>
                            {updatingId === pothole.id && (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
        
        <Card className="mt-6">
          <div className="p-6 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Anonymous Reporting System
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• Citizens can report potholes without creating accounts</p>
              <p>• Each report gets a unique reference number for tracking</p>
              <p>• All reports are visible here for authority management</p>
              <p>• Citizens can track progress using their reference numbers</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
