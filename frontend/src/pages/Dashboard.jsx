import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import InfoTooltip from '../components/InfoTooltip';

// Debug Panel Component
const DebugPanel = ({ user }) => {
  // Get token from localStorage
  const token = localStorage.getItem('spotifyToken');
  
  // Parse JWT token to show payload (without verification)
  const parseJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(window.atob(base64));
    } catch (e) {
      return null;
    }
  };
  
  const tokenPayload = parseJwt(token);
  
  return (
    <div className="mt-8 p-4 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2">Debug Information</h2>
      <div className="space-y-2 text-sm">
        <div>
          <strong>Current User ID:</strong> {user?.id}
        </div>
        <div>
          <strong>Display Name:</strong> {user?.display_name}
        </div>
        <div>
          <strong>JWT User ID (sub):</strong> {tokenPayload?.sub}
        </div>
        <div>
          <strong>JWT Expiration:</strong> {tokenPayload?.exp ? new Date(tokenPayload.exp * 1000).toLocaleString() : 'N/A'}
        </div>
        <div>
          <strong>JWT Issued At:</strong> {tokenPayload?.iat ? new Date(tokenPayload.iat * 1000).toLocaleString() : 'N/A'}
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('spotifyToken');
            window.location.href = '/';
          }}
          className="mt-2 px-3 py-1 bg-red-600 rounded text-white text-xs"
        >
          Clear Token & Logout
        </button>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [recentlyPlayed, setRecentlyPlayed] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Popularity description text
  const trackPopularityText = "Track popularity is a value between 0 and 100, with 100 being the most popular. The popularity is calculated based on the total number of recent plays and how recent those plays are. Newer plays count more than older ones.";
  
  const artistPopularityText = "Artist popularity is a value between 0 and 100, with 100 being the most popular. The popularity is calculated based on the popularity of the artist's tracks, their number of followers, and other metrics Spotify uses. Popularity values are updated periodically to reflect current trends.";

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
        {/* Welcome Section */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to Your Spotify Analytics Dashboard
            {user && user.display_name && `, ${user.display_name}`}
          </h1>
          <p className="text-gray-400">
            Explore your listening habits and discover insights about your musical taste
          </p>
        </div>
        
        {/* Dashboard Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Recently Played Section */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recently Played</h2>
              <Link to="/recently-played" className="text-green-500 hover:text-green-400 text-sm">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentlyPlayed.length > 0 ? (
                recentlyPlayed.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-12 h-12 flex-shrink-0">
                      <img 
                        src={item.image_url || 'https://via.placeholder.com/40'} 
                        alt={item.name} 
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="ml-3 overflow-hidden">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-gray-400 truncate">{item.artist}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recently played tracks found</p>
              )}
            </div>
          </div>
          
          {/* Top Artists Section */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-bold">Top Artists</h2>
              </div>
              <Link to="/top-items" className="text-green-500 hover:text-green-400 text-sm">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {topArtists.length > 0 ? (
                topArtists.map((artist, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-12 h-12 flex-shrink-0">
                      <img 
                        src={artist.images && artist.images.length > 0 ? artist.images[2].url : 'https://via.placeholder.com/40'} 
                        alt={artist.name} 
                        className="w-full h-full object-cover rounded-full"
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
                    <div className="ml-2 text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 flex items-center whitespace-nowrap">
                      {artist.popularity}
                      <InfoTooltip text={artistPopularityText} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No top artists found</p>
              )}
            </div>
          </div>
          
          {/* Top Tracks Section */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-bold">Top Tracks</h2>
              </div>
              <Link to="/top-items" className="text-green-500 hover:text-green-400 text-sm">
                View All
              </Link>
            </div>
            
            <div className="space-y-4">
              {topTracks.length > 0 ? (
                topTracks.map((track, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-12 h-12 flex-shrink-0">
                      <img 
                        src={track.album && track.album.images.length > 0 ? track.album.images[2].url : 'https://via.placeholder.com/40'} 
                        alt={track.name} 
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="ml-3 flex-grow overflow-hidden">
                      <p className="truncate font-medium">{track.name}</p>
                      <p className="text-sm text-gray-400 truncate">
                        {track.artists.map(artist => artist.name).join(', ')}
                      </p>
                    </div>
                    <div className="ml-2 text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 flex items-center whitespace-nowrap">
                      {track.popularity}
                      <InfoTooltip text={trackPopularityText} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No top tracks found</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Debug Panel - only visible in development */}
        {process.env.NODE_ENV === 'development' && <DebugPanel user={user} />}
      </div>
    </div>
  );
};

export default Dashboard;