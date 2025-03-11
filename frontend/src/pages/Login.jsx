import React from 'react';
import { useAuth } from '../context/AuthContext';
import spotifyLogo from '../assets/Spotify_Primary_Logo_RGB_Green.png';
import { motion } from 'framer-motion';

const Login = () => {
  const { login } = useAuth();

  const handleLoginClick = () => {
    console.log("Login button clicked");
    login().catch(error => {
      console.error("Login error:", error);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-spotify-gray-900 to-spotify-dark text-white p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-spotify-gray-800 rounded-lg shadow-lg p-8 text-center"
      >
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-3xl font-bold mb-6"
        >
          Musilyze
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8 text-gray-300"
        >
          Get insights and visualizations about your listening habits on Spotify.
        </motion.p>
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8"
        >
          <img 
            src={spotifyLogo} 
            alt="Spotify Logo" 
            className="w-32 mx-auto" 
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/150?text=Spotify';
            }}
          />
          <div className="text-spotify-green text-4xl font-bold mt-4">Musilyze for Spotify</div>
        </motion.div>
        
        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          whileHover={{ scale: 1.05, backgroundColor: '#1ed760' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLoginClick}
          className="w-full py-3 px-4 bg-spotify-green hover:bg-spotify-light text-white font-bold rounded-full transition-colors"
        >
          Login with Spotify
        </motion.button>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 text-sm text-gray-400"
        >
          <p>This app will request access to:</p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center justify-center">
              <svg className="w-4 h-4 text-spotify-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your recently played tracks
            </li>
            <li className="flex items-center justify-center">
              <svg className="w-4 h-4 text-spotify-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your top artists and tracks
            </li>
            <li className="flex items-center justify-center">
              <svg className="w-4 h-4 text-spotify-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your playlists
            </li>
          </ul>
        </motion.div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="mt-8 text-gray-500 text-sm"
      >
        <p>
          Created with Flask, React, and the Spotify Web API
        </p>
      </motion.div>
    </div>
  );
};

export default Login;