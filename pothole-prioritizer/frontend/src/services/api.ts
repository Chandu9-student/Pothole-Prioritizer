import axios from 'axios';
import { DetectionResult, Pothole } from '../types/index';
import { API_BASE_URL } from '../config/api';

// API_BASE_URL is now imported from centralized config

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Explicitly set for Chrome compatibility
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add Authorization header if token exists
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('Response Error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later.');
    }
    
    if (error.response?.status === 404) {
      throw new Error('Service not found. Please check your connection.');
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please try again.');
    }
    
    if (!error.response) {
      throw new Error('Network error. Please check your connection.');
    }
    
    throw error;
  }
);

export const apiService = {
  // Health check
  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      throw new Error('Backend service is not available');
    }
  },

  // Pothole detection
  async detectPotholes(imageFile: File): Promise<DetectionResult> {
    try {
      console.log('API: Starting detectPotholes with file:', imageFile.name, imageFile.size, imageFile.type);
      
      const formData = new FormData();
      formData.append('image', imageFile);
      
      console.log('API: FormData created, sending request to:', `${API_BASE_URL}/api/analyze`);

      const response = await api.post('/api/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // Extended timeout for AI processing
        withCredentials: false, // Chrome compatibility
      });

      console.log('API: Response received:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('API: Detection failed:', error);
      console.error('API: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      throw new Error('Failed to analyze image. Please try again.');
    }
  },

  // Video pothole detection
  async detectPotholesInVideo(videoFile: File): Promise<DetectionResult> {
    try {
      console.log('API: Starting detectPotholesInVideo with file:', videoFile.name, videoFile.size, videoFile.type);
      
      const formData = new FormData();
      formData.append('video', videoFile);
      
      console.log('API: FormData created, sending request to:', `${API_BASE_URL}/api/analyze-video`);

      const response = await api.post('/api/analyze-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes timeout for video processing
        withCredentials: false,
      });

      console.log('API: Video response received:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('API: Video detection failed:', error);
      console.error('API: Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Video processing timeout. Please try with a shorter video.');
      }
      
      throw new Error('Failed to analyze video. Please try again.');
    }
  },

  // Report a new pothole
  async reportPothole(data: {
    latitude: number;
    longitude: number;
    severity: string;
    description: string;
    reporter_name: string;
    image?: File;
    force_create?: boolean;
  }): Promise<{ pothole?: Pothole; status?: string; nearby_potholes?: any[]; message?: string }> {
    try {
      const formData = new FormData();
      
      formData.append('latitude', data.latitude.toString());
      formData.append('longitude', data.longitude.toString());
      formData.append('severity', data.severity);
      formData.append('description', data.description);
      formData.append('reporter_name', data.reporter_name);
      
      // Add force_create flag if specified
      if (data.force_create) {
        formData.append('force_create', 'true');
      }
      
      if (data.image) {
        formData.append('image', data.image);
      }

      const response = await api.post('/api/report', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Report submission failed:', error);
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      throw new Error('Failed to submit report. Please try again.');
    }
  },

  // Track pothole by reference number
  async trackPothole(referenceNumber: string): Promise<any> {
    try {
      const response = await api.get(`/api/track/${referenceNumber}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to track pothole:', error);
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      throw new Error('Failed to track pothole. Please try again.');
    }
  },

  // Get all potholes
  async getPotholes(): Promise<Pothole[]> {
    try {
      const response = await api.get('/api/potholes');
      return response.data?.potholes || [];
    } catch (error: any) {
      console.error('Failed to fetch potholes:', error);
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      throw new Error('Failed to load pothole data. Please try again.');
    }
  },

  // Get pothole by ID
  async getPotholeById(id: number): Promise<Pothole> {
    try {
      const response = await api.get(`/api/map/potholes/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch pothole:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Pothole not found');
      }
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      throw new Error('Failed to load pothole details. Please try again.');
    }
  },

  // Update pothole status
  async updatePotholeStatus(id: number, status: string): Promise<Pothole> {
    try {
      const response = await api.patch(`/api/map/potholes/${id}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error('Failed to update pothole status:', error);
      
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      
      throw new Error('Failed to update pothole status. Please try again.');
    }
  }
};

export default apiService;