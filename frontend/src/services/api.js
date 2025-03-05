import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add a longer timeout since Spotify API might be slow sometimes
  timeout: 10000, // 10 seconds
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spotifyToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Track ongoing refresh requests to prevent multiple simultaneous refreshes
let isRefreshing = false;
let refreshSubscribers = [];

// Function to add callbacks to refreshSubscribers
const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// Function to notify all subscribers with new token
const onTokenRefreshed = (token) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Function to reject all subscribers
const onRefreshError = (error) => {
  refreshSubscribers.forEach((callback) => callback(null, error));
  refreshSubscribers = [];
};

// Add response interceptor to handle expired tokens
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Get original request configuration
    const originalRequest = error.config;
    
    // Only attempt to refresh token if:
    // 1. Got a 401 error
    // 2. Request doesn't already have a _retry flag
    // 3. It's not a request to refresh the token itself
    // 4. It's not triggered by a token verification failure
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh-token') &&
      !originalRequest.url?.includes('/auth/verify-token')
    ) {
      // Check if we're already refreshing the token
      if (isRefreshing) {
        // Add this request to the subscribers
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token, err) => {
            if (err) {
              return reject(err);
            }
            
            if (token) {
              // Replace the old token with new one
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return resolve(api(originalRequest));
            }
            
            // If no token returned, reject
            return reject(new Error('Failed to refresh token'));
          });
        });
      }
      
      // Mark request as retry and set refreshing flag
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        // Try to refresh the token
        const { data } = await api.post('/auth/refresh-token');
        
        if (data.access_token) {
          // Success - update token in storage
          const newAccessToken = data.access_token;
          localStorage.setItem('spotifyAccessToken', newAccessToken);
          
          // Set expiry if provided
          if (data.expires_in) {
            const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
            localStorage.setItem('spotifyAccessTokenExpiry', expiresAt.toString());
          }
          
          // Update authorization header for original request
          originalRequest.headers.Authorization = `Bearer ${localStorage.getItem('spotifyToken')}`;
          
          // Notify subscribers
          onTokenRefreshed(newAccessToken);
          
          // Reset refreshing flag
          isRefreshing = false;
          
          // Retry the original request
          return api(originalRequest);
        } else {
          // No token returned
          isRefreshing = false;
          onRefreshError(new Error('Failed to refresh token'));
          
          // Redirect to login
          localStorage.removeItem('spotifyToken');
          localStorage.removeItem('spotifyAccessToken');
          localStorage.removeItem('spotifyAccessTokenExpiry');
          window.location.href = '/';
          
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // If refresh fails, log out user
        isRefreshing = false;
        onRefreshError(refreshError);
        
        // Check specific error from backend
        if (refreshError.response?.data?.error === 'refresh_token_revoked') {
          console.log('Refresh token revoked, redirecting to login');
        }
        
        localStorage.removeItem('spotifyToken');
        localStorage.removeItem('spotifyAccessToken');
        localStorage.removeItem('spotifyAccessTokenExpiry');
        window.location.href = '/';
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;