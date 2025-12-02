import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import AuthGuard from './components/AuthGuard';
import Header from './components/Header';
import LandingPage from './pages/Landing';
import Detection from './pages/PotholeDetection';
import Map from './pages/Map';
import About from './pages/About';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminPanel from './pages/AdminPanel';
import TrackPothole from './pages/TrackPothole';
import IntegrationDemo from './pages/IntegrationDemo';
import AuthTest from './components/AuthTest';
import Card from './components/Card';
import Button from './components/Button';

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="App min-h-screen bg-green-50">
          <Header />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              },
              success: {
                style: {
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                },
              },
              error: {
                style: {
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                },
              },
            }}
          />
          
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/detection" element={<Detection />} />
            <Route path="/map" element={<Map />} />
            <Route path="/track" element={<TrackPothole />} />
            <Route path="/about" element={<About />} />
            <Route path="/demo" element={<IntegrationDemo />} />
            <Route path="/auth-test" element={<AuthTest />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard requireAuth={true}>
                  <UserDashboard />
                </AuthGuard>
              }
            />
            <Route 
              path="/admin" 
              element={
                <AuthGuard requireAuth={true} requiredRole="authority">
                  <AdminDashboard />
                </AuthGuard>
              }
            />
            <Route 
              path="/admin-panel" 
              element={
                <AuthGuard requireAuth={true} requiredRole="authority">
                  <AdminPanel />
                </AuthGuard>
              }
            />
            
            {/* Unauthorized page */}
            <Route 
              path="/unauthorized" 
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <Card className="p-8 max-w-md text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                    <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
                    <Button onClick={() => window.history.back()}>Go Back</Button>
                  </Card>
                </div>
              }
            />
            
            {/* Redirect unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
