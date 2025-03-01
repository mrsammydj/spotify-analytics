import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
          localStorage.removeItem('spotifyToken');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('spotifyToken');
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
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  // Set token after successful authentication
  const setToken = (token) => {
    localStorage.setItem('spotifyToken', token);
    setIsAuthenticated(true);
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    setToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};