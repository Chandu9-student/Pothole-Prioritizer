import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../components/Card';

const RoleSelection: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'citizen' | 'government') => {
    // Navigate to login with role parameter
    navigate(`/login?role=${role}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">🛣️</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Account Type
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select whether you're a citizen reporting potholes or a government official managing road maintenance
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Citizen Card */}
          <Card className="p-8 hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 border-transparent hover:border-blue-300"
                onClick={() => handleRoleSelection('citizen')}>
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl text-white">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Citizen
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Report potholes in your area, track repair status, and help improve road safety in your community.
              </p>
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Report potholes with photos</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Track repair progress</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>View community statistics</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Receive notifications</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Government Official Card */}
          <Card className="p-8 hover:shadow-xl transition-shadow duration-300 cursor-pointer border-2 border-transparent hover:border-orange-300"
                onClick={() => handleRoleSelection('government')}>
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl text-white">🏛️</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Government Official
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Manage pothole reports, coordinate repairs, and oversee road maintenance across your jurisdiction.
              </p>
              <div className="space-y-3 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>Manage repair assignments</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>Monitor jurisdiction performance</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>Access analytics dashboard</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-orange-500">✓</span>
                  <span>Hierarchical administration</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
