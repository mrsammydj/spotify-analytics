import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Callback = () => {
  const location = useLocation();
  const { setToken } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = () => {
      try {
        // Get the token from the URL query parameters
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const errorMessage = params.get('error');

        if (errorMessage) {
          setError(errorMessage);
          setIsProcessing(false);
          return;
        }

        if (!token) {
          setError('No authentication token received.');
          setIsProcessing(false);
          return;
        }

        // Store the token and update authentication state
        setToken(token);
        setIsProcessing(false);
      } catch (error) {
        console.error('Error processing callback:', error);
        setError('An error occurred during authentication.');
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [location, setToken]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">Authentication Error</h1>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
        <p>Processing authentication...</p>
      </div>
    );
  }

  // Redirect to dashboard after successful authentication
  return <Navigate to="/dashboard" />;
};

export default Callback;