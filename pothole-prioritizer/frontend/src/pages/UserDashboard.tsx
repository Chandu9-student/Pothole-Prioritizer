import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { UserReport } from '../types/user';
import Card from '../components/Card';
import Button from '../components/Button';

const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [reports, setReports] = useState<UserReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'profile'>('overview');

  useEffect(() => {
    fetchUserReports();
  }, []);

  const fetchUserReports = async () => {
    try {
      setIsLoading(true);
      // TODO: Replace with actual API call
      const mockReports: UserReport[] = [
        {
          id: '1',
          latitude: 12.9716,
          longitude: 77.5946,
          severity: 'critical',
          aiConfidence: 0.95,
          description: 'Large pothole on main road',
          status: 'in_progress',
          priorityScore: 125,
          voteCount: 15,
          hasUserVoted: false,
          imagePaths: ['image1.jpg'],
          address: 'MG Road, Bangalore',
          createdAt: '2025-09-01T10:00:00Z',
          updatedAt: '2025-09-03T14:30:00Z'
        },
        {
          id: '2',
          latitude: 12.9716,
          longitude: 77.5946,
          severity: 'high',
          aiConfidence: 0.87,
          description: 'Medium sized pothole',
          status: 'reported',
          priorityScore: 85,
          voteCount: 8,
          hasUserVoted: true,
          imagePaths: ['image2.jpg'],
          address: 'Brigade Road, Bangalore',
          createdAt: '2025-08-28T15:20:00Z',
          updatedAt: '2025-08-28T15:20:00Z'
        }
      ];
      setReports(mockReports);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'reported': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const renderOverview = () => {
    const totalReports = reports.length;
    const activeReports = reports.filter(r => r.status !== 'completed' && r.status !== 'rejected').length;
    const completedReports = reports.filter(r => r.status === 'completed').length;
    const totalVotes = reports.reduce((sum, r) => sum + r.voteCount, 0);

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 text-center bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <div className="text-3xl font-bold text-blue-600 mb-2">{totalReports}</div>
            <div className="text-sm font-medium text-blue-700">Total Reports</div>
          </Card>
          
          <Card className="p-6 text-center bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
            <div className="text-3xl font-bold text-orange-600 mb-2">{activeReports}</div>
            <div className="text-sm font-medium text-orange-700">Active Reports</div>
          </Card>
          
          <Card className="p-6 text-center bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <div className="text-3xl font-bold text-green-600 mb-2">{completedReports}</div>
            <div className="text-sm font-medium text-green-700">Completed</div>
          </Card>
          
          <Card className="p-6 text-center bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="text-3xl font-bold text-purple-600 mb-2">{totalVotes}</div>
            <div className="text-sm font-medium text-purple-700">Total Votes</div>
          </Card>
        </div>

        {/* Recent Reports */}
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Reports</h3>
          {reports.slice(0, 3).map((report) => (
            <div key={report.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getSeverityColor(report.severity)}`}></div>
                <div>
                  <div className="font-medium text-gray-900">{report.address}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                {report.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  const renderReports = () => (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card key={report.id} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`w-12 h-12 rounded-full ${getSeverityColor(report.severity)} flex items-center justify-center text-white font-bold`}>
                {report.severity[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{report.address}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{report.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📅 {new Date(report.createdAt).toLocaleDateString()}</span>
                  <span>👍 {report.voteCount} votes</span>
                  <span>🎯 {Math.round(report.aiConfidence * 100)}% confidence</span>
                  <span>⭐ {report.priorityScore} priority</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderProfile = () => (
    <Card className="p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <div className="text-gray-900">{user?.name}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="text-gray-900">{user?.email}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <div className="text-gray-900 capitalize">{user?.role?.replace('_', ' ')}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Verified</label>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${user?.emailVerified ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-gray-900">{user?.emailVerified ? 'Verified' : 'Not Verified'}</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
          <div className="text-gray-900">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-200">
        <Button onClick={logout} variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
          Sign Out
        </Button>
      </div>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Please log in to view your dashboard</h2>
          <Button onClick={() => window.location.href = '/login'}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name}!</h1>
          <p className="text-gray-600 mt-1">Track your pothole reports and community impact</p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'reports', label: 'My Reports', icon: '📋' },
              { id: 'profile', label: 'Profile', icon: '👤' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 pb-3 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'profile' && renderProfile()}
          </>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;
