import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';

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
        <h1 className="text-3xl font-bold mb-6">Recently Played Tracks</h1>
        
        {tracks.length === 0 ? (
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
            <p>No recently played tracks found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tracks.map((track, index) => (
              <div key={index} className="bg-gray-800 p-4 rounded-lg shadow flex items-center">
                <div className="w-16 h-16 flex-shrink-0">
                  <img 
                    src={track.image_url || 'https://via.placeholder.com/64'} 
                    alt={track.name} 
                    className="w-full h-full object-cover rounded"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentlyPlayed;