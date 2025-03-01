import React from 'react';
import { useAuth } from '../context/AuthContext';
import spotifyLogo from '../assets/Spotify_Primary_Logo_RGB_Green.png';

const Login = () => {
  console.log('Login component rendering');
  const { login } = useAuth();

  const handleLoginClick = () => {
    console.log("Login button clicked");
    login().catch(error => {
      console.error("Login error:", error);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Spotify Analytics Dashboard</h1>
        
        <p className="mb-8 text-gray-300">
          Get insights and visualizations about your listening habits on Spotify.
        </p>
        
        <div className="mb-8">
          <img 
            src={spotifyLogo} 
            alt="Spotify Logo" 
            className="w-32 mx-auto" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/150?text=Spotify';
            }}
          />
          <div className="text-green-500 text-4xl font-bold">Spotify Analytics</div>
        </div>
        
        <button
        onClick={handleLoginClick}  // Use the new handler
        className="w-full py-3 px-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full transition-colors"
        >
          Login with Spotify
        </button>
        
        <div className="mt-6 text-sm text-gray-400">
          <p>This app will request access to:</p>
          <ul className="mt-2 list-disc list-inside">
            <li>Your recently played tracks</li>
            <li>Your top artists and tracks</li>
            <li>Your playlists</li>
          </ul>
        </div>
      </div>
      
      <div className="mt-8 text-gray-500 text-sm">
        <p>
          Created with Flask, React, and the Spotify Web API
        </p>
      </div>
    </div>
  );
};

export default Login;