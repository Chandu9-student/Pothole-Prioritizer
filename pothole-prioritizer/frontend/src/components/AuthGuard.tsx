import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: string;
  requireAdmin?: boolean;
  redirectTo?: string;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requireAuth = true, 
  requiredRole,
  requireAdmin = false,
  redirectTo = '/login' 
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check if authentication is required
  if (requireAuth && !isAuthenticated) {
    return React.createElement(Navigate, {
      to: redirectTo,
      state: { from: location },
      replace: true
    });
  }

  // Check role requirements
  if (requiredRole && user) {
    const hasRequiredRole = checkUserRole(user.role, requiredRole);
    if (!hasRequiredRole) {
      return React.createElement(Navigate, {
        to: '/unauthorized',
        replace: true
      });
    }
  }

  // Check admin requirements (authority in our system)
  if (requireAdmin && user) {
    const isAuthority = user.role === 'authority' || user.role?.includes('admin');
    if (!isAuthority) {
      return React.createElement(Navigate, {
        to: '/unauthorized',
        replace: true
      });
    }
  }

  return React.createElement(React.Fragment, null, children);
};

// Helper function to check user roles
const checkUserRole = (userRole: string, requiredRole: string): boolean => {
  console.log('Checking role:', { userRole, requiredRole }); // Debug log
  
  if (requiredRole === 'citizen') {
    return true; // Both citizens and authorities can access citizen features
  }
  if (requiredRole === 'authority') {
    // Authority includes all admin and authority roles
    const isAuthority = userRole === 'authority' || 
                       userRole === 'admin' ||
                       userRole?.endsWith('_admin') ||
                       userRole?.endsWith('_authority') ||
                       userRole?.includes('admin');
    console.log('Is authority?', isAuthority); // Debug log
    return isAuthority;
  }
  return userRole === requiredRole;
};

export default AuthGuard;
