import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const isActive = (path: string) => location.pathname === path;
  
  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Get role display name
  const getRoleDisplay = (role: string) => {
    const roleMap: { [key: string]: string } = {
      'panchayath_admin': 'Panchayat Admin',
      'municipality_admin': 'Municipal Admin',
      'district_authority': 'District Authority',
      'state_authority': 'State Authority',
      'national_authority': 'National Authority',
      'national_admin': 'National Admin',
      'district_admin': 'District Admin',
      'state_admin': 'State Admin'
    };
    return roleMap[role] || role;
  };

  const handleLoginClick = () => {
    navigate('/login?role=government');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <img 
                src="/logo.png" 
                alt="Pothole Prioritizer Logo" 
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  // Fallback to styled background if logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.classList.remove('hidden');
                  }
                }}
              />
              <div className="hidden w-12 h-12 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">🛣️</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-wide">Pothole Prioritizer</h1>
            </div>
          </div>

          {/* Navigation - Role Based */}
          <nav className="hidden md:flex items-center space-x-2">
            {isAuthenticated && user ? (
              // Authority Navigation (Logged In)
              <>
                {/* Map for authorities (manage potholes) */}
                {['panchayath_admin', 'municipality_admin', 'district_authority', 'state_authority', 'national_authority'].includes(user.role) && (
                  <Link
                    to="/map"
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/map')
                        ? 'bg-green-100 text-green-700 shadow-sm'
                        : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                    }`}
                  >
                    Map
                  </Link>
                )}
                
                {/* Dashboard for authorities */}
                {['panchayath_admin', 'municipality_admin', 'district_authority', 'state_authority', 'national_authority'].includes(user.role) && (
                  <Link
                    to="/admin"
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/admin')
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                )}
                
                {/* Invites - Only for admins */}
                {['state_admin', 'district_admin', 'national_admin'].includes(user.role) && (
                  <Link
                    to="/admin-panel"
                    className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      isActive('/admin-panel')
                        ? 'bg-orange-100 text-orange-700 shadow-sm'
                        : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                    }`}
                  >
                    Invites
                  </Link>
                )}
              </>
            ) : (
              // Citizen Navigation (No Login Required)
              <>
                <Link
                  to="/"
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/')
                      ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/about"
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/about')
                      ? 'bg-teal-100 text-teal-700 shadow-sm'
                      : 'text-gray-600 hover:text-teal-600 hover:bg-teal-50'
                  }`}
                >
                  About
                </Link>
                <Link
                  to="/detection"
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/detection')
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  Detect
                </Link>
                <Link
                  to="/map"
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/map')
                      ? 'bg-purple-100 text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                >
                  Map
                </Link>
                <Link
                  to="/track"
                  className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive('/track')
                      ? 'bg-amber-100 text-amber-700 shadow-sm'
                      : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                >
                  Track
                </Link>
              </>
            )}
          </nav>

          {/* User Authentication */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  {/* User Avatar */}
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                    {getUserInitials(user.name)}
                  </div>
                  {/* Dropdown Icon */}
                  <svg 
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showUserDropdown ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowUserDropdown(false)}
                    ></div>
                    
                    {/* Dropdown Content */}
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
                        {user.role && (
                          <span className="inline-block mt-2 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                            {getRoleDisplay(user.role)}
                          </span>
                        )}
                      </div>
                      
                      {/* Logout Button */}
                      <button
                        onClick={() => {
                          setShowUserDropdown(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={handleLoginClick}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm"
              >
                Authority Login
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-gray-600 hover:text-green-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {isAuthenticated && user ? (
              // Authority Mobile Navigation
              <>
                {['panchayath_admin', 'municipality_admin', 'district_authority', 'state_authority', 'national_authority'].includes(user.role) && (
                  <>
                    <Link
                      to="/map"
                      className={`block px-3 py-2 rounded-lg font-medium ${
                        isActive('/map')
                          ? 'bg-green-100 text-green-700'
                          : 'text-gray-600 hover:text-green-600 hover:bg-green-50'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Map
                    </Link>
                    <Link
                      to="/admin"
                      className={`block px-3 py-2 rounded-lg font-medium ${
                        isActive('/admin')
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                      }`}
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Dashboard
                    </Link>
                  </>
                )}
                
                {['state_admin', 'district_admin', 'national_admin'].includes(user.role) && (
                  <Link
                    to="/admin-panel"
                    className={`block px-3 py-2 rounded-lg font-medium ${
                      isActive('/admin-panel')
                        ? 'bg-orange-100 text-orange-700'
                        : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                    }`}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Invites
                  </Link>
                )}
                
                {/* User Info */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">
                      {getRoleDisplay(user.role)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 mt-1 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              // Citizen Mobile Navigation (No Login)
              <>
                <Link
                  to="/"
                  className={`block px-3 py-2 rounded-lg font-medium ${
                    isActive('/')
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  Home
                </Link>
                
                <Link
                  to="/about"
                  className={`block px-3 py-2 rounded-lg font-medium ${
                    isActive('/about')
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-gray-600 hover:text-teal-600 hover:bg-teal-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  About
                </Link>
                
                <Link
                  to="/detection"
                  className={`block px-3 py-2 rounded-lg font-medium ${
                    isActive('/detection')
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  Detect
                </Link>
                
                <Link
                  to="/map"
                  className={`block px-3 py-2 rounded-lg font-medium ${
                    isActive('/map')
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  Map
                </Link>
                
                <Link
                  to="/track"
                  className={`block px-3 py-2 rounded-lg font-medium ${
                    isActive('/track')
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-600 hover:text-amber-600 hover:bg-amber-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  Track
                </Link>
                
                {/* Authority Login Button */}
                <div className="border-t border-gray-200 mt-2 pt-2">
                  <Link
                    to="/login"
                    className="block px-3 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 text-center transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Authority Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;