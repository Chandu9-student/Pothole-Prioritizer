import axios from 'axios';
import { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export class AuthService {
  // Login user
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await api.post('/api/auth/login', credentials);
      const { user, token } = response.data;
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }

  // Register new user
  static async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post('/api/auth/register', userData);
      const { user, token } = response.data;
      
      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }

  // Verify JWT token
  static async verifyToken(): Promise<User> {
    try {
      const response = await api.get('/api/auth/verify');
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Token verification failed');
    }
  }

  // Get current user profile
  static async getProfile(): Promise<User> {
    try {
      const response = await api.get('/api/auth/profile');
      return response.data.user;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Failed to fetch profile');
    }
  }

  // Update user profile
  static async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await api.put('/auth/profile', userData);
      const updatedUser = response.data.user;
      
      // Update local storage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile');
    }
  }

  // Logout user
  static async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage regardless of API call result
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  }

  // Get stored user data
  static getCurrentUser(): User | null {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      localStorage.removeItem('user');
      return null;
    }
  }

  // Get stored token
  static getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Check if user has specific role
  static hasRole(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    if (requiredRole === 'citizen') {
      return true; // Both citizens and authorities can access citizen features
    }
    if (requiredRole === 'authority') {
      return user.role === 'authority';
    }
    return user.role === requiredRole;
  }

  // Check if user is authority
  static isAuthority(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'authority' || false;
  }

  // Check if user is citizen
  static isCitizen(): boolean {
    const user = this.getCurrentUser();
    return user?.role === 'citizen' || false;
  }
}

export default AuthService;
