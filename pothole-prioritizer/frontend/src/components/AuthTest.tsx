import React from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthTest: React.FC = () => {
  const { user, isAuthenticated, login } = useAuth();

  const testLogin = async () => {
    try {
      console.log('Testing login...');
      await login('admin@city.gov', 'admin123');
      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const testAPI = async () => {
    try {
      console.log('Testing API connection...');
      const response = await fetch('http://localhost:5002/api/auth/demo-users');
      const data = await response.json();
      console.log('Demo users:', data);
    } catch (error) {
      console.error('API test failed:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Authentication Test</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold">Current Status:</h3>
          <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
          {user && (
            <div>
              <p>Name: {user.name}</p>
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button 
            onClick={testAPI}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test API Connection
          </button>
          
          <button 
            onClick={testLogin}
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Test Login (Admin)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthTest;