import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { DataStateHandler } from '../components/loading';

const RecentlyPlayed = () => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentlyPlayed = async () => {
      setLoading(true);
      try {
        const response = await api.get('/stats/recently-played');
        setTracks(response.data.items);
        setError(null);
      } catch (error) {
        console.error('Error fetching recently played tracks:', error);
        setError('Failed to load your recently played tracks. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentlyPlayed();
  }, []);

  // Helper to format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-spotify-gray-900 to-spotify-dark text-white">
      <Navbar />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-8"
      >
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-3xl font-bold mb-6"
        >
          Recently Played Tracks
        </motion.h1>
        
        <DataStateHandler
          isLoading={loading}
          error={error}
          isEmpty={tracks.length === 0}
          emptyMessage="No recently played tracks found."
        >
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-4"
          >
            {tracks.map((track, index) => (
              <motion.div 
                key={index} 
                variants={itemVariants}
                whileHover={{ 
                  x: 5,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
                className="bg-spotify-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-all flex items-center"
              >
                <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                  <motion.img 
                    src={track.image_url || 'https://via.placeholder.com/64'} 
                    alt={track.name} 
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.1 }}
                  />
                </div>
                
                <div className="ml-4 flex-grow">
                  <h3 className="font-medium text-lg">{track.name}</h3>
                  <p className="text-gray-400">{track.artist}</p>
                  {track.album && <p className="text-gray-500 text-sm">{track.album}</p>}
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  <p>Played at:</p>
                  <p>{formatDate(track.played_at)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </DataStateHandler>
      </motion.div>
    </div>
  );
};

export default RecentlyPlayed;