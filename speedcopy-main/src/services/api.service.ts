import axios, { type AxiosInstance, AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config/api.config';

const isAuthenticationFailure = (error: AxiosError) => {
  const message = String((error.response?.data as any)?.message || '').toLowerCase();
  const hasToken = !!localStorage.getItem('auth_token');
  return (
    (error.response?.status === 401 && !hasToken) ||
    message.includes('invalid or expired token') ||
    message.includes('invalid token') ||
    message.includes('token expired') ||
    message.includes('jwt expired') ||
    message.includes('jwt malformed') ||
    message.includes('no token provided')
  );
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    // Debug logging for authentication
    if (!token) {
      console.warn('⚠️ No auth_token found in localStorage for request:', config.url);
    } else {
      console.log('✅ Auth token present for request:', config.url, '| Token preview:', token.substring(0, 20) + '...');
    }
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      delete (config.headers as any)['Content-Type'];
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: AxiosError) => {
    // Log error details for debugging
    if (error.response) {
      console.error('❌ API Error:', {
        status: error.response.status,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        message: (error.response?.data as any)?.message || 'Unknown error',
        data: error.response.data,
      });
    }

    // Handle 400 Bad Request
    if (error.response?.status === 400) {
      const message = (error.response?.data as any)?.message || 'Bad request';
      console.error('🔴 Bad Request (400):', message);
      console.error('Request details:', {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
      });
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      const message = (error.response?.data as any)?.message || 'Endpoint not found';
      console.error('🔍 Not Found (404):', message);
      console.error('Requested URL:', error.config?.url);
      console.error('💡 Tip: Check if this endpoint exists in the backend gateway');
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (isAuthenticationFailure(error)) {
      console.warn('🔒 Authentication failed (401) - clearing session');
      console.warn('Failed request:', error.config?.url);
      console.warn('Error message:', (error.response?.data as any)?.message);
      
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // Avoid hard redirects on auth failures; let the app decide how to respond.
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('🚫 Access forbidden (403)');
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('💥 Server error (500)');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
