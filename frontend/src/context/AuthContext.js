import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(null);
  const [accessTokenExpiry, setAccessTokenExpiry] = useState(null);

  // Check if user is authenticated on load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('spotifyToken');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        // Verify token with backend
        const response = await api.get('/auth/verify-token');
        
        if (response.data.valid) {
          setIsAuthenticated(true);
          
          // Get user profile
          const profileResponse = await api.get('/user/profile');
          setUser(profileResponse.data);
        } else {
          // Invalid token, remove it
          console.log('Token invalid, logging out');
          localStorage.removeItem('spotifyToken');
          localStorage.removeItem('spotifyAccessToken');
          localStorage.removeItem('spotifyAccessTokenExpiry');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        
        // Check if token is expired or invalid
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.log('Token expired or invalid, logging out');
          localStorage.removeItem('spotifyToken');
          localStorage.removeItem('spotifyAccessToken');
          localStorage.removeItem('spotifyAccessTokenExpiry');
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Login function
  const login = async () => {
    try {
      const response = await api.get('/auth/login');
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('spotifyToken');
      localStorage.removeItem('spotifyAccessToken');
      localStorage.removeItem('spotifyAccessTokenExpiry');
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      setAccessTokenExpiry(null);
    }
  };

  // Set token after successful authentication
  const setToken = (token, initialAccessToken = null, expiresAt = null) => {
    localStorage.setItem('spotifyToken', token);
    
    // Store access token if provided
    if (initialAccessToken) {
      localStorage.setItem('spotifyAccessToken', initialAccessToken);
      localStorage.setItem('spotifyAccessTokenExpiry', expiresAt.toString());
      setAccessToken(initialAccessToken);
      setAccessTokenExpiry(parseInt(expiresAt));
    }
    
    setIsAuthenticated(true);
  };

  // Get Spotify access token (with automatic refresh if needed)
  const getSpotifyToken = async () => {
    try {
      // Check if we have a valid access token
      const token = localStorage.getItem('spotifyAccessToken');
      const expiry = localStorage.getItem('spotifyAccessTokenExpiry');
      
      if (token && expiry && parseInt(expiry) > Math.floor(Date.now() / 1000)) {
        // Token is still valid
        return token;
      }
      
      // Token expired or not present, refresh it
      const response = await api.post('/auth/refresh-token');
      
      // Update stored tokens
      const newToken = response.data.access_token;
      const expiresIn = response.data.expires_in;
      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
      
      localStorage.setItem('spotifyAccessToken', newToken);
      localStorage.setItem('spotifyAccessTokenExpiry', expiresAt.toString());
      
      setAccessToken(newToken);
      setAccessTokenExpiry(expiresAt);
      
      return newToken;
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      
      // Check if token is revoked or invalid
      if (error.response && error.response.status === 401 && 
          error.response.data && error.response.data.error === 'refresh_token_revoked') {
        // Need to re-authenticate
        console.log('Refresh token revoked, logging out');
        logout();
        // Notify user (optional)
        alert('Your session has expired. Please log in again.');
      }
      
      throw error;
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    setToken,
    getSpotifyToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};