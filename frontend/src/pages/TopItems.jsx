import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import InfoTooltip from '../components/InfoTooltip';
import api from '../services/api';
import { DataStateHandler } from '../components/loading';

const TopItems = () => {
  const [activeTab, setActiveTab] = useState('tracks');
  const [timeRange, setTimeRange] = useState('medium_term');
  const [topTracks, setTopTracks] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const timeRangeOptions = [
    { value: 'short_term', label: 'Last 4 Weeks' },
    { value: 'medium_term', label: 'Last 6 Months' },
    { value: 'long_term', label: 'All Time' }
  ];

  useEffect(() => {
    const fetchTopItems = async () => {
      setLoading(true);
      try {
        // Fetch data based on active tab and time range
        if (activeTab === 'tracks' || activeTab === 'both') {
          const tracksResponse = await api.get(`/stats/top-tracks?time_range=${timeRange}`);
          setTopTracks(tracksResponse.data.items);
        }
        
        if (activeTab === 'artists' || activeTab === 'both') {
          const artistsResponse = await api.get(`/stats/top-artists?time_range=${timeRange}`);
          setTopArtists(artistsResponse.data.items);
        }
        
        setError(null);
      } catch (error) {
        console.error('Error fetching top items:', error);
        setError('Failed to load your top items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopItems();
  }, [activeTab, timeRange]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Render track item
  const renderTrack = (track, index) => (
    <motion.div 
      key={track.id}
      variants={itemVariants}
      className="bg-spotify-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center"
      whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="text-center mr-4 w-8">
        <span className="text-2xl font-bold text-gray-500">{index + 1}</span>
      </div>
      
      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
        <motion.img 
          src={track.album && track.album.images.length > 0 ? track.album.images[0].url : 'https://via.placeholder.com/64'} 
          alt={track.name} 
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
        />
      </div>
      
      <div className="ml-4 flex-grow">
        <h3 className="font-medium text-lg">{track.name}</h3>
        <p className="text-gray-400">{track.artists.map(artist => artist.name).join(', ')}</p>
        {track.album && <p className="text-gray-500 text-sm">{track.album.name}</p>}
      </div>
      
      <div className="text-right">
        <div className="text-xs px-2 py-1 bg-spotify-gray-700 rounded text-gray-300 flex items-center">
          Popularity: {track.popularity}
          <InfoTooltip text="Track popularity is a value between 0 and 100, with 100 being the most popular. The popularity is calculated based on the total number of recent plays and how recent those plays are. Newer plays count more than older ones." />
        </div>
      </div>
    </motion.div>
  );

  // Render artist item
  const renderArtist = (artist, index) => (
    <motion.div 
      key={artist.id}
      variants={itemVariants}
      className="bg-spotify-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow flex items-center"
      whileHover={{ x: 5, backgroundColor: 'rgba(255,255,255,0.05)' }}
    >
      <div className="text-center mr-4 w-8">
        <span className="text-2xl font-bold text-gray-500">{index + 1}</span>
      </div>
      
      <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded-full">
        <motion.img 
          src={artist.images && artist.images.length > 0 ? artist.images[0].url : 'https://via.placeholder.com/64'} 
          alt={artist.name} 
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
        />
      </div>
      
      <div className="ml-4 flex-grow">
        <h3 className="font-medium text-lg">{artist.name}</h3>
        <p className="text-gray-400 text-sm">
          {artist.genres && artist.genres.length > 0 
            ? artist.genres.slice(0, 3).join(', ') 
            : 'No genres available'}
        </p>
      </div>
      
      <div className="text-right">
        <div className="text-xs px-2 py-1 bg-spotify-gray-700 rounded text-gray-300 flex items-center">
          Popularity: {artist.popularity}
          <InfoTooltip text="Artist popularity is a value between 0 and 100, with 100 being the most popular. The popularity is calculated based on the popularity of the artist's tracks, their number of followers, and other metrics Spotify uses. Popularity values are updated periodically to reflect current trends." />
        </div>
      </div>
    </motion.div>
  );

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
          Your Top Items
        </motion.h1>
        
        {/* Tab navigation */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex space-x-1 bg-spotify-gray-800 p-1 rounded-lg shadow-lg">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'tracks' 
                  ? 'bg-spotify-green text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Top Tracks
            </button>
            <button
              onClick={() => setActiveTab('artists')}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'artists' 
                  ? 'bg-spotify-green text-white' 
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Top Artists
            </button>
          </div>
        </motion.div>
        
        {/* Time range selector */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-spotify-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-medium mb-2">Time Range</h2>
            <div className="flex flex-wrap gap-2">
              {timeRangeOptions.map(option => (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTimeRange(option.value)}
                  className={`py-1 px-3 rounded-full text-sm transition-colors ${
                    timeRange === option.value 
                      ? 'bg-spotify-green text-white' 
                      : 'bg-spotify-gray-700 hover:bg-spotify-gray-600'
                  }`}
                >
                  {option.label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
        
        {/* Content based on active tab */}
        <DataStateHandler 
          isLoading={loading}
          error={error}
          isEmpty={activeTab === 'tracks' ? topTracks.length === 0 : topArtists.length === 0}
          emptyMessage={activeTab === 'tracks' ? "No top tracks found for this time period." : "No top artists found for this time period."}
        >
          {activeTab === 'tracks' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold mb-4">Your Top Tracks</h2>
              {topTracks.map(renderTrack)}
            </motion.div>
          )}
          
          {activeTab === 'artists' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold mb-4">Your Top Artists</h2>
              {topArtists.map(renderArtist)}
            </motion.div>
          )}
        </DataStateHandler>
      </motion.div>
    </div>
  );
};

export default TopItems;