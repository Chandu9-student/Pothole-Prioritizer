// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://pothole-prioritizer.onrender.com';

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Helper for image URLs
export const getImageUrl = (path: string): string => {
  if (!path) return '';
  // If path already includes the domain, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};
