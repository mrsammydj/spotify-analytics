import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Callback from './pages/Callback';
import Dashboard from './pages/Dashboard';
import RecentlyPlayed from './pages/RecentlyPlayed';
import TopItems from './pages/TopItems';
import Playlists from './pages/Playlists';
import './App.css';
import './components/charts/ChartRegistration';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="loading">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Login />} />
            <Route path="/callback" element={<Callback />} />
            
            {/* Protected routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recently-played" 
              element={
                <ProtectedRoute>
                  <RecentlyPlayed />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/top-items" 
              element={
                <ProtectedRoute>
                  <TopItems />
                </ProtectedRoute>
              } 
            />
            {/* New playlists route */}
            <Route 
              path="/playlists" 
              element={
                <ProtectedRoute>
                  <Playlists />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;