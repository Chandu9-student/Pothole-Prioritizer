import React from 'react';
import Card from '../components/Card';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoleSelect: (role: 'citizen' | 'authority') => void;
  action: 'login' | 'signup';
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({
  isOpen,
  onClose,
  onRoleSelect,
  action
}) => {
  if (!isOpen) return null;

  const handleRoleSelection = (role: 'citizen' | 'authority') => {
    onRoleSelect(role);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="p-8 relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-3xl">🛣️</span>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Choose Your Account Type
            </h2>
            <p className="text-lg text-gray-600">
              Select whether you're a citizen or government official to {action === 'login' ? 'sign in' : 'create an account'}
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Citizen Card */}
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-300 hover:scale-105"
                  onClick={() => handleRoleSelection('citizen')}>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-white">👥</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Citizen
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Report potholes in your area, track repair status, and help improve road safety in your community.
                </p>
                <div className="space-y-2 text-xs text-gray-500">
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
                </div>
                <div className="mt-4">
                  <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium">
                    {action === 'login' ? 'Sign In as Citizen' : 'Sign Up as Citizen'}
                  </div>
                </div>
              </div>
            </Card>

            {/* Authority Card */}
            <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-orange-300 hover:scale-105"
                  onClick={() => handleRoleSelection('authority')}>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-white">🏛️</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Road Authority
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  Manage pothole reports, coordinate repairs, and oversee road maintenance operations.
                </p>
                <div className="space-y-2 text-xs text-gray-500">
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
                </div>
                <div className="mt-4">
                  <div className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium">
                    {action === 'login' ? 'Sign In as Authority' : 'Sign Up as Authority'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Cancel */}
          <div className="text-center mt-6">
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelectionModal;
