import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import PlaylistGenreChart from '../components/PlaylistGenreChart';
import api from '../services/api';
import AdvancedPlaylistAnalysis from '../components/AdvancedPlaylistAnalysis';

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
        // We need to implement this endpoint in the backend
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-500 bg-opacity-20 p-4 rounded-md text-center">
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-500 rounded-md"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Your Playlists</h1>
        
        {playlists.length === 0 ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <p>No playlists found. Create playlists in your Spotify app to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Playlists Sidebar */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg lg:col-span-1 overflow-auto" style={{ maxHeight: '80vh' }}>
              <h2 className="text-xl font-bold mb-4">Select a Playlist</h2>
              <div className="space-y-2">
                {playlists.map((playlist) => (
                  <div 
                    key={playlist.id}
                    onClick={() => handlePlaylistSelect(playlist)}
                    className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                      selectedPlaylist && selectedPlaylist.id === playlist.id 
                        ? 'bg-green-900 bg-opacity-40'
                        : 'hover:bg-gray-700'
                    }`}
                  >
                    <div className="w-12 h-12 flex-shrink-0">
                      <img 
                        src={playlist.images && playlist.images.length > 0 
                          ? playlist.images[0].url 
                          : 'https://via.placeholder.com/60?text=Playlist'}
                        alt={playlist.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="ml-3 overflow-hidden">
                      <p className="font-medium truncate">{playlist.name}</p>
                      <p className="text-sm text-gray-400 truncate">
                        {playlist.tracks ? `${playlist.tracks.total} tracks` : '0 tracks'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Playlist Analysis */}
            <div className="lg:col-span-2">
              {selectedPlaylist ? (
                <div className="space-y-6">
                  {/* Playlist Header */}
                  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="flex flex-col md:flex-row items-start md:items-center">
                      <div className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0">
                        <img
                          src={selectedPlaylist.images && selectedPlaylist.images.length > 0
                            ? selectedPlaylist.images[0].url
                            : 'https://via.placeholder.com/160?text=Playlist'}
                          alt={selectedPlaylist.name}
                          className="w-full h-full object-cover rounded"
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
                        <a
                          href={selectedPlaylist.external_urls.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-full text-sm transition-colors"
                        >
                          Open in Spotify
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  {/* Genre Distribution Chart */}
                  {selectedPlaylist && (
                    <PlaylistGenreChart playlistId={selectedPlaylist.id} />
                  )}
                  
                  <div className="mt-6">
                    <h3 className="text-xl font-bold mb-4">AI-Powered Music Analysis</h3>
                    {selectedPlaylist && (
                        <AdvancedPlaylistAnalysis playlistId={selectedPlaylist.id} />
                    )}
                  </div>

                  {/* Tracks Preview */}
                  <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-medium mb-4">Tracks in this Playlist</h3>
                    
                    {tracksLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                      </div>
                    ) : playlistTracks.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {playlistTracks.slice(0, 10).map((item, index) => (
                          <div key={index} className="flex items-center">
                            <div className="w-10 h-10 flex-shrink-0">
                              <img
                                src={item.track?.album?.images?.[2]?.url || 'https://via.placeholder.com/40'}
                                alt={item.track?.name}
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                            <div className="ml-3 overflow-hidden">
                              <p className="font-medium truncate">{item.track?.name}</p>
                              <p className="text-sm text-gray-400 truncate">
                                {item.track?.artists.map(a => a.name).join(', ')}
                              </p>
                            </div>
                          </div>
                        ))}
                        {playlistTracks.length > 10 && (
                          <p className="text-center text-gray-400 text-sm pt-2">
                            + {playlistTracks.length - 10} more tracks
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-center py-4">
                        No tracks found in this playlist.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg text-center">
                  <p className="text-xl">Select a playlist to view its analysis</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Playlists;