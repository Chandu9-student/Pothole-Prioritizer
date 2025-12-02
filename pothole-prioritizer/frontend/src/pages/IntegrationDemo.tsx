import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import ReportSubmission from '../components/ReportSubmission';
import EnhancedMap from '../components/EnhancedMap';
import Card from '../components/Card';
import Button from '../components/Button';

const IntegrationDemo: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeDemo, setActiveDemo] = useState<'report' | 'map' | 'overview'>('overview');
  const [showReportSubmission, setShowReportSubmission] = useState(false);

  const demoFeatures = [
    {
      id: 'ai-detection',
      title: '🤖 AI-Powered Detection',
      description: 'Upload photos for instant pothole analysis using YOLOv8',
      status: '✅ Integrated',
      details: [
        'Custom trained YOLOv8 model with 3 severity classes',
        'Confidence-based severity classification (85%+ = Critical)',
        'Area-based priority scoring',
        'Real-time image analysis via Flask API'
      ]
    },
    {
      id: 'smart-reporting',
      title: '📱 Smart Report Submission',
      description: 'Multi-step guided workflow with GPS and AI analysis',
      status: '✅ Ready',
      details: [
        'GPS location capture with high accuracy',
        'Multi-image upload (up to 5 photos)',
        'AI analysis integration with manual override',
        'Review and submit workflow'
      ]
    },
    {
      id: 'user-management',
      title: '👥 Authentication System',
      description: 'Role-based access with hierarchical permissions',
      status: '✅ Complete',
      details: [
        'JWT-based authentication',
        'Hierarchical admin roles (Panchayath → National)',
        'Guest user access',
        'Protected routes and API calls'
      ]
    },
    {
      id: 'voting-system',
      title: '🗳️ Community Voting',
      description: 'Citizen engagement for priority scoring',
      status: '✅ Built',
      details: [
        'Vote-based priority calculation',
        'Community consensus for severity',
        'Real-time vote tracking',
        'Anti-spam vote validation'
      ]
    },
    {
      id: 'admin-dashboard',
      title: '⚙️ Government Dashboard',
      description: 'Administrative tools for pothole management',
      status: '✅ Functional',
      details: [
        'Jurisdiction-based report management',
        'Status tracking (Reported → In Progress → Complete)',
        'Analytics and performance metrics',
        'Priority-based workflow'
      ]
    },
    {
      id: 'enhanced-map',
      title: '🗺️ Interactive Map',
      description: 'Location-based pothole discovery and management',
      status: '✅ Available',
      details: [
        'Filter by severity and status',
        'Real-time report locations',
        'Click-to-vote functionality',
        'Mobile-responsive touch interface'
      ]
    }
  ];

  const apiStatus = [
    { endpoint: '/analyze', description: 'Image analysis with YOLOv8', status: 'Active' },
    { endpoint: '/video', description: 'Video frame processing', status: 'Active' },
    { endpoint: '/health', description: 'Service health check', status: 'Active' },
    { endpoint: '/reports', description: 'Report management', status: 'Ready for backend' },
    { endpoint: '/auth', description: 'User authentication', status: 'Ready for backend' },
    { endpoint: '/votes', description: 'Voting system', status: 'Ready for backend' }
  ];

  const testAIConnection = async () => {
    try {
      const response = await fetch('http://localhost:5002/health');
      if (response.ok) {
        toast.success('✅ AI Service is running and ready!');
      } else {
        toast.error('❌ AI Service responded but may have issues');
      }
    } catch (error) {
      toast.error('❌ Cannot connect to AI Service. Is the backend running?');
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Status */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">🔄 Integration Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {demoFeatures.map((feature) => (
            <Card key={feature.id} className="p-4 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{feature.title}</h4>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {feature.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
              <ul className="text-xs text-gray-500 space-y-1">
                {feature.details.map((detail, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Card>

      {/* API Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">🔌 API Endpoints</h3>
          <Button size="sm" onClick={testAIConnection}>
            Test AI Connection
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {apiStatus.map((api, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-mono text-sm font-medium">{api.endpoint}</div>
                <div className="text-xs text-gray-600">{api.description}</div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                api.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {api.status}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">🚀 Try It Out</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => setActiveDemo('report')}
            className="h-20 flex flex-col items-center justify-center"
          >
            <span className="text-2xl mb-1">📸</span>
            <span>Submit Report</span>
          </Button>
          <Button
            onClick={() => setActiveDemo('map')}
            className="h-20 flex flex-col items-center justify-center"
            variant="secondary"
          >
            <span className="text-2xl mb-1">🗺️</span>
            <span>View Map</span>
          </Button>
          <Button
            onClick={() => window.open('/admin', '_blank')}
            className="h-20 flex flex-col items-center justify-center"
            variant="secondary"
            disabled={!isAuthenticated || !user?.role.includes('admin')}
          >
            <span className="text-2xl mb-1">⚙️</span>
            <span>Admin Panel</span>
          </Button>
        </div>
        {!isAuthenticated && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            Login to access all features • <a href="/login" className="text-blue-600 hover:underline">Sign In</a>
          </p>
        )}
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🔗 AI Integration Demo</h1>
          <p className="text-gray-600 mt-1">
            Complete pothole management system with YOLOv8 AI integration
          </p>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'System Overview', icon: '📊' },
              { id: 'report', label: 'Report Submission', icon: '📱' },
              { id: 'map', label: 'Interactive Map', icon: '🗺️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemo(tab.id as any)}
                className={`flex items-center space-x-2 pb-3 border-b-2 font-medium text-sm ${
                  activeDemo === tab.id
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
        {activeDemo === 'overview' && renderOverview()}
        
        {activeDemo === 'report' && (
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">📸 AI-Powered Report Submission</h3>
              <p className="text-gray-600 mb-6">
                Test the complete workflow: GPS → Photos → AI Analysis → Submit
              </p>
              {!isAuthenticated ? (
                <div className="space-y-4">
                  <p className="text-gray-500">Please login to submit reports</p>
                  <Button onClick={() => window.location.href = '/login'}>
                    Go to Login
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowReportSubmission(true)}>
                  🚀 Start New Report
                </Button>
              )}
            </Card>
            
            {showReportSubmission && (
              <ReportSubmission
                onSubmitSuccess={() => {
                  setShowReportSubmission(false);
                  toast.success('🎉 Report submitted successfully!');
                }}
                onCancel={() => setShowReportSubmission(false)}
              />
            )}
          </div>
        )}
        
        {activeDemo === 'map' && (
          <div className="space-y-6">
            <Card className="p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🗺️ Interactive Pothole Map</h3>
              <p className="text-gray-600 mb-4">
                Explore potholes with voting, filtering, and real-time updates
              </p>
            </Card>
            <EnhancedMap showVoting={true} showFilters={true} />
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationDemo;
