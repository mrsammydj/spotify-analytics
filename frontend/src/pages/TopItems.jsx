import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import InfoTooltip from '../components/InfoTooltip';
import api from '../services/api';

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
      } catch (error) {
        console.error('Error fetching top items:', error);
        setError('Failed to load your top items. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTopItems();
  }, [activeTab, timeRange]);

  // Popularity description text
  const trackPopularityText = "Track popularity is a value between 0 and 100, with 100 being the most popular. The popularity is calculated based on the total number of recent plays and how recent those plays are. Newer plays count more than older ones.";
  
  const artistPopularityText = "Artist popularity is a value between 0 and 100, with 100 being the most popular. The popularity is calculated based on the popularity of the artist's tracks, their number of followers, and other metrics Spotify uses. Popularity values are updated periodically to reflect current trends.";

  // Render track item
  const renderTrack = (track, index) => (
    <div key={track.id} className="bg-gray-800 p-4 rounded-lg shadow flex items-center">
      <div className="text-center mr-4 w-8">
        <span className="text-2xl font-bold text-gray-500">{index + 1}</span>
      </div>
      
      <div className="w-16 h-16 flex-shrink-0">
        <img 
          src={track.album && track.album.images.length > 0 ? track.album.images[0].url : 'https://via.placeholder.com/64'} 
          alt={track.name} 
          className="w-full h-full object-cover rounded"
        />
      </div>
      
      <div className="ml-4 flex-grow">
        <h3 className="font-medium text-lg">{track.name}</h3>
        <p className="text-gray-400">{track.artists.map(artist => artist.name).join(', ')}</p>
        {track.album && <p className="text-gray-500 text-sm">{track.album.name}</p>}
      </div>
      
      <div className="text-right">
        <div className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 flex items-center">
          Popularity: {track.popularity}
          <InfoTooltip text={trackPopularityText} />
        </div>
      </div>
    </div>
  );

  // Render artist item
  const renderArtist = (artist, index) => (
    <div key={artist.id} className="bg-gray-800 p-4 rounded-lg shadow flex items-center">
      <div className="text-center mr-4 w-8">
        <span className="text-2xl font-bold text-gray-500">{index + 1}</span>
      </div>
      
      <div className="w-16 h-16 flex-shrink-0">
        <img 
          src={artist.images && artist.images.length > 0 ? artist.images[0].url : 'https://via.placeholder.com/64'} 
          alt={artist.name} 
          className="w-full h-full object-cover rounded-full"
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
        <div className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 flex items-center">
          Popularity: {artist.popularity}
          <InfoTooltip text={artistPopularityText} />
        </div>
      </div>
    </div>
  );

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
        <h1 className="text-3xl font-bold mb-6">Your Top Items</h1>
        
        {/* Tab navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg shadow-lg">
            <button
              onClick={() => setActiveTab('tracks')}
              className={`flex-1 py-2 px-4 rounded-md ${
                activeTab === 'tracks' ? 'bg-green-600' : 'hover:bg-gray-700'
              }`}
            >
              Top Tracks
            </button>
            <button
              onClick={() => setActiveTab('artists')}
              className={`flex-1 py-2 px-4 rounded-md ${
                activeTab === 'artists' ? 'bg-green-600' : 'hover:bg-gray-700'
              }`}
            >
              Top Artists
            </button>
          </div>
        </div>
        
        {/* Time range selector */}
        <div className="mb-6">
          <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-medium mb-2">Time Range</h2>
            <div className="flex flex-wrap gap-2">
              {timeRangeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`py-1 px-3 rounded-full text-sm ${
                    timeRange === option.value 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Content based on active tab */}
        {activeTab === 'tracks' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Your Top Tracks</h2>
            {topTracks.length === 0 ? (
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                <p>No top tracks found for this time period.</p>
              </div>
            ) : (
              topTracks.map(renderTrack)
            )}
          </div>
        )}
        
        {activeTab === 'artists' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">Your Top Artists</h2>
            {topArtists.length === 0 ? (
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center">
                <p>No top artists found for this time period.</p>
              </div>
            ) : (
              topArtists.map(renderArtist)
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopItems;