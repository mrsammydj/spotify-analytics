import React, { useState, useEffect } from 'react';
import { Pie, Radar, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import api from '../services/api';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Tooltip component for explaining audio features
const FeatureTooltip = ({ feature }) => {
  const descriptions = {
    danceability: "How suitable a track is for dancing based on tempo, rhythm stability, beat strength, and overall regularity.",
    energy: "A measure of intensity and activity. Energetic tracks feel fast, loud, and noisy.",
    acousticness: "A confidence measure of whether the track is acoustic (non-electronic).",
    instrumentalness: "Predicts whether a track contains no vocals. Values above 0.5 are intended to represent instrumental tracks.",
    valence: "A measure of musical positiveness. High valence tracks sound more positive (happy, cheerful, euphoric), while low valence tracks sound more negative (sad, depressed, angry).",
    speechiness: "Detects the presence of spoken words in a track. Values above 0.33 indicate speech-like tracks.",
    liveness: "Detects the presence of an audience in the recording. Higher values represent higher probability that the track was performed live.",
    tempo: "The overall estimated tempo of a track in beats per minute (BPM)."
  };
  
  return (
    <div className="relative inline-block ml-1 group">
      <svg className="h-4 w-4 text-gray-400 cursor-help" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12zm-1-5h2v2H9v-2zm0-4h2v3H9V7z" clipRule="evenodd" />
      </svg>
      <div className="hidden group-hover:block absolute z-10 w-64 p-2 -mt-1 ml-6 text-xs bg-gray-900 text-white rounded shadow-lg">
        {descriptions[feature] || "No description available"}
      </div>
    </div>
  );
};

const MLPlaylistClusters = ({ playlistId }) => {
  const [clusterData, setClusterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [activeTab, setActiveTab] = useState('distribution');

  useEffect(() => {
    // In MLPlaylistClusters.jsx
    const fetchClusterData = async () => {
        if (!playlistId) return;
        
        setLoading(true);
        try {
        // Try ML analysis first
        console.log(`Fetching ML analysis for playlist: ${playlistId}`);
        let response;
        try {
            response = await api.get(`/stats/ml-playlist-analysis/${playlistId}`);
        } catch (err) {
            // If ML analysis fails, fall back to simple analysis
            console.log('ML analysis failed, falling back to simple analysis');
            response = await api.get(`/stats/simple-playlist-analysis/${playlistId}`);
        }
        
        console.log('Analysis response:', response.data);
        setClusterData(response.data);
        
        // Set first cluster as selected by default
        if (response.data.clusters && response.data.clusters.length > 0) {
            setSelectedCluster(response.data.clusters[0]);
        }
        } catch (err) {
        console.error('Error fetching cluster data:', err);
        const errorMessage = err.response?.data?.error || 
                            'Failed to load analysis for this playlist.';
        setError(errorMessage);
        } finally {
        setLoading(false);
        }
    };
  
    fetchClusterData();
  }, [playlistId]);

  // Generate random colors for chart segments
  const generateColors = (count) => {
    const colors = [];
    const transparentColors = [];
    
    for (let i = 0; i < count; i++) {
      const hue = Math.floor(i * (360 / count));
      const saturation = 65 + Math.random() * 10;
      const lightness = 45 + Math.random() * 10;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const transparentColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
      
      colors.push(color);
      transparentColors.push(transparentColor);
    }
    
    return { colors, transparentColors };
  };

  // Distribution chart data
  const prepareDistributionData = () => {
    if (!clusterData || !clusterData.clusters) return null;
    
    const { colors, transparentColors } = generateColors(clusterData.clusters.length);
    
    return {
      labels: clusterData.clusters.map(cluster => {
        const name = cluster.name.split(':')[1].trim();
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
      }),
      datasets: [
        {
          data: clusterData.clusters.map(cluster => cluster.count),
          backgroundColor: transparentColors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Audio profile radar chart data
  const prepareRadarData = () => {
    if (!selectedCluster) return null;
    
    const audioProfile = selectedCluster.audio_profile;
    
    return {
      labels: [
        'Danceability',
        'Energy',
        'Acousticness',
        'Instrumentalness',
        'Valence (Mood)', 
        'Speechiness',
        'Liveness'
      ],
      datasets: [
        {
          label: 'Audio Profile',
          data: [
            audioProfile.danceability,
            audioProfile.energy,
            audioProfile.acousticness,
            audioProfile.instrumentalness,
            audioProfile.valence,
            audioProfile.speechiness,
            audioProfile.liveness
          ],
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgb(75, 192, 192)',
          pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(75, 192, 192)',
          borderWidth: 2
        }
      ]
    };
  };

  // Chart options
  const pieOptions = {
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#fff',
          padding: 15,
          usePointStyle: true,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const value = context.raw;
            const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${value} tracks (${percentage}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  const radarOptions = {
    scales: {
      r: {
        min: 0,
        max: 1,
        ticks: {
          backdropColor: 'transparent',
          color: '#adb5bd'
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        angleLines: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        pointLabels: {
          color: '#fff',
          font: {
            size: 10
          }
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${(context.raw * 100).toFixed(0)}%`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center" style={{ height: '400px' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error && error.includes('Not enough tracks')) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center" style={{ height: '400px' }}>
        <div className="text-yellow-400 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mb-2 font-medium">This playlist needs more tracks for AI analysis</p>
        <p className="text-gray-400 text-sm">
          Our algorithm works best with playlists containing at least 5 tracks.
          Try selecting a larger playlist.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center" style={{ height: '400px' }}>
        <div className="text-red-400 mb-4">
          <svg className="h-12 w-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!clusterData || !clusterData.clusters || clusterData.clusters.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center flex-col" style={{ height: '400px' }}>
        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-400">No cluster data available for this playlist.</p>
      </div>
    );
  }

  const distributionData = prepareDistributionData();
  const radarData = prepareRadarData();

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-medium mb-2">AI-Powered Music Analysis</h3>
        <p className="text-gray-400 text-sm">
          Our algorithm has identified {clusterData.optimal_clusters} distinct musical patterns in this playlist.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-900 p-1 rounded">
          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex-1 py-2 px-4 rounded ${
              activeTab === 'distribution' ? 'bg-green-600' : 'hover:bg-gray-700'
            }`}
          >
            Distribution
          </button>
          <button
            onClick={() => setActiveTab('clusters')}
            className={`flex-1 py-2 px-4 rounded ${
              activeTab === 'clusters' ? 'bg-green-600' : 'hover:bg-gray-700'
            }`}
          >
            Cluster Details
          </button>
        </div>
      </div>

      {/* Distribution View */}
      {activeTab === 'distribution' && (
        <div className="h-80">
          <Pie data={distributionData} options={pieOptions} />
        </div>
      )}

      {/* Cluster Details View */}
      {activeTab === 'clusters' && (
        <div>
          {/* Cluster Selector */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Select a Cluster</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white"
              value={selectedCluster ? selectedCluster.id : ''}
              onChange={(e) => {
                const clusterId = parseInt(e.target.value);
                const cluster = clusterData.clusters.find(c => c.id === clusterId);
                setSelectedCluster(cluster);
              }}
            >
              {clusterData.clusters.map(cluster => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name} ({cluster.count} tracks)
                </option>
              ))}
            </select>
          </div>

          {selectedCluster && (
            <div className="space-y-6">
              {/* Audio Profile */}
              <div className="h-64">
                <Radar data={radarData} options={radarOptions} />
              </div>

              {/* Sample Tracks */}
              <div>
                <h4 className="text-lg font-medium mb-2">Sample Tracks</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCluster.tracks.map((track, index) => (
                    <div key={index} className="flex items-center bg-gray-700 p-2 rounded">
                      {track.image_url && (
                        <img 
                          src={track.image_url} 
                          alt={track.name}
                          className="w-10 h-10 object-cover rounded mr-3"
                        />
                      )}
                      <div className="overflow-hidden">
                        <p className="font-medium truncate">{track.name}</p>
                        <p className="text-sm text-gray-400 truncate">{track.artists.join(', ')}</p>
                      </div>
                    </div>
                  ))}
                  {selectedCluster.total_tracks > selectedCluster.tracks.length && (
                    <p className="text-center text-gray-500 text-sm pt-2">
                      + {selectedCluster.total_tracks - selectedCluster.tracks.length} more tracks
                    </p>
                  )}
                </div>
              </div>

              {/* Understanding This Cluster */}
              <div className="bg-gray-700 p-4 rounded">
                <h4 className="font-medium mb-2">Understanding This Cluster</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Tempo:</span>
                    <span className="font-medium">
                      {Math.round(selectedCluster.audio_profile.tempo)} BPM
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mood:</span>
                    <span className="font-medium">
                      {selectedCluster.audio_profile.valence < 0.33 ? 'Melancholic' :
                       selectedCluster.audio_profile.valence > 0.66 ? 'Uplifting' : 'Balanced'}
                      <FeatureTooltip feature="valence" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Energy:</span>
                    <span className="font-medium">
                      {selectedCluster.audio_profile.energy < 0.33 ? 'Calm' :
                       selectedCluster.audio_profile.energy > 0.66 ? 'Energetic' : 'Moderate'}
                      <FeatureTooltip feature="energy" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sound:</span>
                    <span className="font-medium">
                      {selectedCluster.audio_profile.acousticness > 0.66 ? 'Acoustic' :
                       selectedCluster.audio_profile.acousticness < 0.33 ? 'Electronic' : 'Mixed'}
                      <FeatureTooltip feature="acousticness" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vocals:</span>
                    <span className="font-medium">
                      {selectedCluster.audio_profile.instrumentalness > 0.5 ? 'Mostly Instrumental' :
                       selectedCluster.audio_profile.speechiness > 0.33 ? 'Vocal-heavy' : 'Balanced'}
                      <FeatureTooltip feature="instrumentalness" />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Danceability:</span>
                    <span className="font-medium">
                      {selectedCluster.audio_profile.danceability < 0.33 ? 'Low' :
                       selectedCluster.audio_profile.danceability > 0.66 ? 'High' : 'Medium'}
                      <FeatureTooltip feature="danceability" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information Notes */}
      <div className="mt-6 text-xs text-gray-400 border-t border-gray-700 pt-4">
        <p>
          This analysis uses machine learning (K-means clustering) to group tracks based on their audio features.
          Each cluster represents a distinct pattern in your music that might transcend traditional genre boundaries.
          Perfect for discovering connections between songs you might not have noticed before!
        </p>
      </div>
    </div>
  );
};

export default MLPlaylistClusters;