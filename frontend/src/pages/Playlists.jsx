import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import PlaylistGenreChart from '../components/PlaylistGenreChart';
import AdvancedPlaylistAnalysis from '../components/AdvancedPlaylistAnalysis';
import api from '../services/api';
import { DataStateHandler } from '../components/loading';

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's playlists
  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      try {
        const response = await api.get('/user/playlists');
        setPlaylists(response.data.items);
        
        // Select the first playlist by default
        if (response.data.items.length > 0) {
          setSelectedPlaylist(response.data.items[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching playlists:', err);
        setError('Failed to load your playlists. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  // Fetch tracks for the selected playlist
  useEffect(() => {
    const fetchPlaylistTracks = async () => {
      if (!selectedPlaylist) return;
      
      setTracksLoading(true);
      try {
        const response = await api.get(`/stats/playlist-tracks/${selectedPlaylist.id}`);
        setPlaylistTracks(response.data.items);
      } catch (err) {
        console.error('Error fetching playlist tracks:', err);
        // Just set to empty array on error - we'll still show the genre chart
        setPlaylistTracks([]);
      } finally {
        setTracksLoading(false);
      }
    };

    fetchPlaylistTracks();
  }, [selectedPlaylist]);

  const handlePlaylistSelect = (playlist) => {
    setSelectedPlaylist(playlist);
  };

  // Animation variants
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

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-spotify-gray-900 to-spotify-dark text-white">
      <Navbar />
      
      <DataStateHandler
        isLoading={loading}
        error={error}
        isEmpty={playlists.length === 0}
        emptyMessage="No playlists found. Create playlists in your Spotify app to see them here."
      >
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
            Your Playlists
          </motion.h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playlists Sidebar */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="bg-spotify-gray-800 p-6 rounded-lg shadow-lg lg:col-span-1 overflow-auto"
              style={{ maxHeight: '80vh' }}
            >
              <h2 className="text-xl font-bold mb-4">Select a Playlist</h2>
              <div className="space-y-2">
                {playlists.map((playlist, index) => (
                  <motion.div 
                    key={playlist.id}
                    variants={itemVariants}
                    whileHover={{ 
                      x: 5, 
                      backgroundColor: selectedPlaylist && selectedPlaylist.id === playlist.id 
                        ? 'rgba(29, 185, 84, 0.3)' 
                        : 'rgba(255,255,255,0.1)' 
                    }}
                    onClick={() => handlePlaylistSelect(playlist)}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                      selectedPlaylist && selectedPlaylist.id === playlist.id 
                        ? 'bg-spotify-green bg-opacity-20'
                        : ''
                    }`}
                  >
                    <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded">
                      <motion.img 
                        src={playlist.images && playlist.images.length > 0 
                          ? playlist.images[0].url 
                          : 'https://via.placeholder.com/60?text=Playlist'}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                        whileHover={{ scale: 1.1 }}
                      />
                    </div>
                    <div className="ml-3 overflow-hidden">
                      <p className="font-medium truncate">{playlist.name}</p>
                      <p className="text-sm text-gray-400 truncate">
                        {playlist.tracks ? `${playlist.tracks.total} tracks` : '0 tracks'}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            {/* Playlist Analysis */}
            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedPlaylist ? (
                  <motion.div 
                    key={selectedPlaylist.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Playlist Header */}
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-spotify-gray-800 p-6 rounded-lg shadow-lg"
                    >
                      <div className="flex flex-col md:flex-row items-start md:items-center">
                        <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 overflow-hidden rounded">
                          <motion.img
                            whileHover={{ scale: 1.05 }}
                            src={selectedPlaylist.images && selectedPlaylist.images.length > 0
                              ? selectedPlaylist.images[0].url
                              : 'https://via.placeholder.com/160?text=Playlist'}
                            alt={selectedPlaylist.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="md:ml-6 mt-4 md:mt-0">
                          <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
                          <p className="text-gray-400">
                            By {selectedPlaylist.owner.display_name}
                          </p>
                          <p className="text-sm text-gray-500 mt-2">
                            {selectedPlaylist.description || 'No description'}
                          </p>
                          <p className="mt-2">
                            {selectedPlaylist.tracks ? `${selectedPlaylist.tracks.total} tracks` : '0 tracks'}
                          </p>
                          <motion.a
                            whileHover={{ scale: 1.05, backgroundColor: '#1ed760' }}
                            whileTap={{ scale: 0.95 }}
                            href={selectedPlaylist.external_urls.spotify}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-4 px-4 py-2 bg-spotify-green hover:bg-spotify-light rounded-full text-sm transition-colors"
                          >
                            Open in Spotify
                          </motion.a>
                        </div>
                      </div>
                    </motion.div>
                    
                    {/* Genre Distribution Chart */}
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      {selectedPlaylist && (
                        <PlaylistGenreChart playlistId={selectedPlaylist.id} />
                      )}
                    </motion.div>
                    
                    {/* AI-Powered Analysis */}
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-6"
                    >
                      <h3 className="text-xl font-bold mb-4">AI-Powered Music Analysis</h3>
                      {selectedPlaylist && (
                        <AdvancedPlaylistAnalysis playlistId={selectedPlaylist.id} />
                      )}
                    </motion.div>

                    {/* Tracks Preview */}
                    <motion.div 
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="bg-spotify-gray-800 p-6 rounded-lg shadow-lg"
                    >
                      <h3 className="text-lg font-medium mb-4">Tracks in this Playlist</h3>
                      
                      <DataStateHandler
                        isLoading={tracksLoading}
                        isEmpty={playlistTracks.length === 0}
                        emptyMessage="No tracks found in this playlist."
                      >
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {playlistTracks.slice(0, 10).map((item, index) => (
                            <motion.div 
                              key={index} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ 
                                x: 5, 
                                backgroundColor: 'rgba(255,255,255,0.05)' 
                              }}
                              className="flex items-center p-2 rounded-lg"
                            >
                              <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded">
                                <motion.img
                                  whileHover={{ scale: 1.1 }}
                                  src={item.track?.album?.images?.[2]?.url || 'https://via.placeholder.com/40'}
                                  alt={item.track?.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="ml-3 overflow-hidden">
                                <p className="font-medium truncate">{item.track?.name}</p>
                                <p className="text-sm text-gray-400 truncate">
                                  {item.track?.artists.map(a => a.name).join(', ')}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                          {playlistTracks.length > 10 && (
                            <p className="text-center text-gray-400 text-sm pt-2">
                              + {playlistTracks.length - 10} more tracks
                            </p>
                          )}
                        </div>
                      </DataStateHandler>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-spotify-gray-800 p-8 rounded-lg shadow-lg text-center"
                  >
                    <p className="text-xl">Select a playlist to view its analysis</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </DataStateHandler>
    </div>
  );
};

export default Playlists;