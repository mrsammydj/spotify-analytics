import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import InfoTooltip from '../components/InfoTooltip';
import { motion } from 'framer-motion';
import { AnimatedCard, GlassCard } from '../components/UIComponents';

// Container animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

// Item animation variants
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1
  }
};

const Dashboard = () => {
  const { user } = useAuth();
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch data in parallel
        const [recentResponse, artistsResponse, tracksResponse] = await Promise.all([
          api.get('/stats/recently-played'),
          api.get('/stats/top-artists?limit=5'),
          api.get('/stats/top-tracks?limit=5')
        ]);

        setRecentlyPlayed(recentResponse.data.items.slice(0, 5));
        setTopArtists(artistsResponse.data.items);
        setTopTracks(tracksResponse.data.items);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load your Spotify data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-spotify-gray-900 text-white">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <motion.div
            animate={{
              rotate: 360
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear"
            }}
            className="rounded-full h-16 w-16 border-t-4 border-l-4 border-spotify-green"
          ></motion.div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-spotify-gray-900 text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500 bg-opacity-20 p-6 rounded-lg text-center"
          >
            <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl mb-4">{error}</p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => window.location.reload()} 
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
            >
              Retry
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-spotify-gray-900 to-spotify-dark text-white">
      <Navbar />
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 py-8"
      >
        {/* Welcome Section */}
        <motion.div 
          variants={itemVariants}
          className="mb-10 text-center"
        >
          <GlassCard className="p-8 max-w-3xl mx-auto">
            <motion.h1 
              className="text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-spotify-green to-blue-400"
              animate={{ 
                backgroundPosition: ["0% center", "100% center"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{
                backgroundSize: "200%"
              }}
            >
              Welcome to Your Analytics
              {user && user.display_name && `, ${user.display_name}`}
            </motion.h1>
            <p className="text-gray-300 text-lg">
              Explore your listening habits and discover insights about your musical taste
            </p>
          </GlassCard>
        </motion.div>
        
        {/* Dashboard Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recently Played Section */}
          <motion.div variants={itemVariants}>
            <AnimatedCard className="h-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center">
                  <svg className="w-5 h-5 mr-2 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recently Played
                </h2>
                <Link to="/recently-played">
                  <motion.span 
                    whileHover={{ x: 3 }} 
                    className="text-spotify-green hover:text-spotify-light text-sm flex items-center"
                  >
                    View All
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.span>
                </Link>
              </div>
              
              <div className="space-y-4">
                {recentlyPlayed.length > 0 ? (
                  recentlyPlayed.map((item, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ 
                        x: 5, 
                        backgroundColor: "rgba(255,255,255,0.05)",
                        transition: { duration: 0.2 }
                      }}
                      className="flex items-center p-2 rounded-lg"
                    >
                      <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-md">
                        <motion.img 
                          whileHover={{ scale: 1.1 }}
                          src={item.image_url || 'https://via.placeholder.com/40'} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-3 overflow-hidden">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500">No recently played tracks found</p>
                )}
              </div>
            </AnimatedCard>
          </motion.div>
          
          {/* Top Artists Section */}
          <motion.div variants={itemVariants}>
            <AnimatedCard className="h-full p-6" delay={0.1}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold flex items-center">
                    <svg className="w-5 h-5 mr-2 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Top Artists
                  </h2>
                </div>
                <Link to="/top-items">
                  <motion.span 
                    whileHover={{ x: 3 }} 
                    className="text-spotify-green hover:text-spotify-light text-sm flex items-center"
                  >
                    View All
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.span>
                </Link>
              </div>
              
              <div className="space-y-4">
                {topArtists.length > 0 ? (
                  topArtists.map((artist, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ 
                        x: 5, 
                        backgroundColor: "rgba(255,255,255,0.05)",
                        transition: { duration: 0.2 }
                      }}
                      className="flex items-center p-2 rounded-lg"
                    >
                      <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-full">
                        <motion.img 
                          whileHover={{ scale: 1.1 }}
                          src={artist.images && artist.images.length > 0 ? artist.images[2].url : 'https://via.placeholder.com/40'} 
                          alt={artist.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-3 flex-grow overflow-hidden">
                        <p className="font-medium truncate">{artist.name}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {artist.genres && artist.genres.length > 0 
                            ? artist.genres.slice(0, 2).join(', ') 
                            : 'No genres available'}
                        </p>
                      </div>
                      <div className="ml-2 text-xs px-2 py-1 bg-spotify-gray-700 rounded-full text-gray-300 flex items-center whitespace-nowrap">
                        {artist.popularity}
                        <InfoTooltip text="Artist popularity on Spotify (0-100)" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500">No top artists found</p>
                )}
              </div>
            </AnimatedCard>
          </motion.div>
          
          {/* Top Tracks Section */}
          <motion.div variants={itemVariants}>
            <AnimatedCard className="h-full p-6" delay={0.2}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <h2 className="text-xl font-bold flex items-center">
                    <svg className="w-5 h-5 mr-2 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    Top Tracks
                  </h2>
                </div>
                <Link to="/top-items">
                  <motion.span 
                    whileHover={{ x: 3 }} 
                    className="text-spotify-green hover:text-spotify-light text-sm flex items-center"
                  >
                    View All
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </motion.span>
                </Link>
              </div>
              
              <div className="space-y-4">
                {topTracks.length > 0 ? (
                  topTracks.map((track, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ 
                        x: 5, 
                        backgroundColor: "rgba(255,255,255,0.05)",
                        transition: { duration: 0.2 }
                      }}
                      className="flex items-center p-2 rounded-lg"
                    >
                      <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded-md">
                        <motion.img 
                          whileHover={{ scale: 1.1 }}
                          src={track.album && track.album.images.length > 0 ? track.album.images[2].url : 'https://via.placeholder.com/40'} 
                          alt={track.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="ml-3 flex-grow overflow-hidden">
                        <p className="truncate font-medium">{track.name}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {track.artists.map(artist => artist.name).join(', ')}
                        </p>
                      </div>
                      <div className="ml-2 text-xs px-2 py-1 bg-spotify-gray-700 rounded-full text-gray-300 flex items-center whitespace-nowrap">
                        {track.popularity}
                        <InfoTooltip text="Track popularity on Spotify (0-100)" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-gray-500">No top tracks found</p>
                )}
              </div>
            </AnimatedCard>
          </motion.div>
        </div>
        
        {/* New AI-Analysis Announcement */}
        <motion.div 
          variants={itemVariants}
          className="mt-10"
        >
          <GlassCard className="p-6 relative overflow-hidden">
            <motion.div 
              className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-purple-600/20 to-blue-500/20 -z-10"
              animate={{
                backgroundPosition: ["0% center", "100% center"],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                repeatType: "reverse"
              }}
              style={{
                backgroundSize: "200%"
              }}
            />
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-6 md:mb-0 md:mr-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  AI-Powered Music Analysis
                </h2>
                <p className="text-gray-300 mb-4">
                  Discover hidden patterns in your playlists with our machine learning algorithm!
                  See connections beyond traditional genres.
                </p>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link 
                    to="/playlists"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full font-medium transition-all shadow-lg hover:shadow-xl"
                  >
                    Try AI Analysis Now
                  </Link>
                </motion.div>
              </div>
              <motion.div 
                className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 flex items-center justify-center bg-purple-900/30 rounded-full relative"
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <motion.div 
                  className="absolute inset-0 rounded-full"
                  style={{ 
                    background: "conic-gradient(from 0deg, rgba(139, 92, 246, 0.8), rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0))"
                  }}
                />
                <motion.div 
                  className="absolute inset-2 rounded-full bg-spotify-gray-900 flex items-center justify-center"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [0.8, 0.85, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="w-16 h-16 text-blue-300"
                  >
                    <path d="M9.663 17h4.673M12 3v1m0 16v1m-8-9h1m15 0h1m-2.607-6.394l-.707.707m-12.02 12.021l-.707.707m2.05-16.05l.707.707m12.02 12.02l.707.707M6 12a6 6 0 1 1 12 0 6 6 0 0 1-12 0z" />
                  </svg>
                </motion.div>
              </motion.div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;