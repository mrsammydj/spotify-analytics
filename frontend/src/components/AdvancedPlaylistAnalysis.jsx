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

const AdvancedPlaylistAnalysis = ({ playlistId }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('base');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisMethod, setAnalysisMethod] = useState('simple');
  
  useEffect(() => {
    const fetchAnalysisData = async () => {
      if (!playlistId) return;
      
      setLoading(true);
      try {
        console.log(`Fetching advanced analysis for playlist: ${playlistId}`);
        try {
          // Try to use the advanced hybrid analysis first
          const response = await api.get(`/stats/advanced-playlist-analysis/${playlistId}`);
          setAnalysisData(response.data);
          setAnalysisMethod('hybrid');
          console.log('Advanced analysis success');
        } catch (err) {
          console.error('Advanced analysis failed, falling back to simple analysis', err);
          // Fall back to simple analysis if the advanced one fails
          const fallbackResponse = await api.get(`/stats/simple-playlist-analysis/${playlistId}`);
          setAnalysisData({ 
            base_analysis: fallbackResponse.data,
            specialized_insights: {} 
          });
          setAnalysisMethod('simple');
        }
        
        // Set selected cluster from base analysis
        if (analysisData?.base_analysis?.clusters && 
            analysisData.base_analysis.clusters.length > 0) {
          setSelectedCluster(analysisData.base_analysis.clusters[0]);
        }
      } catch (err) {
        console.error('Error fetching analysis data:', err);
        setError(err.response?.data?.error || 'Failed to load analysis data');
      } finally {
        setLoading(false);
      }
    };
  
    fetchAnalysisData();
  }, [playlistId]);

  // Helper to check if specialized analyses are available
  const hasGenreAnalysis = () => {
    return analysisData?.specialized_insights?.genre_clusters && 
           !analysisData.specialized_insights.genre_clusters.error;
  };
  
  const hasTemporalAnalysis = () => {
    return analysisData?.specialized_insights?.temporal_clusters && 
           !analysisData.specialized_insights.temporal_clusters.error;
  };
  
  const hasArtistAnalysis = () => {
    return analysisData?.specialized_insights?.artist_clusters && 
           !analysisData.specialized_insights.artist_clusters.error;
  };

  // Generate random colors for chart segments
  const generateColors = (count) => {
    const colors = [];
    const transparentColors = [];
    
    // Predefined color palette for better visual appeal
    const hues = [
      10,   // Red
      30,   // Orange
      60,   // Yellow
      100,  // Green
      180,  // Cyan
      210,  // Blue
      270,  // Purple
      330   // Pink
    ];
    
    for (let i = 0; i < count; i++) {
      const hueIndex = i % hues.length;
      const hue = hues[hueIndex];
      // Slight variations in saturation and lightness to differentiate clusters of same color family
      const saturation = 65 + ((i / hues.length) * 15) % 15;
      const lightness = 45 + ((i / hues.length) * 10) % 15;
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const transparentColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
      
      colors.push(color);
      transparentColors.push(transparentColor);
    }
    
    return { colors, transparentColors };
  };

  // Distribution chart data for base analysis
  const prepareBaseDistributionData = () => {
    if (!analysisData || !analysisData.base_analysis || !analysisData.base_analysis.clusters) return null;
    
    const clusters = analysisData.base_analysis.clusters;
    const { colors, transparentColors } = generateColors(clusters.length);
    
    return {
      labels: clusters.map(cluster => {
        const name = cluster.name.split(':')[1]?.trim() || cluster.name;
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
      }),
      datasets: [
        {
          data: clusters.map(cluster => cluster.count),
          backgroundColor: transparentColors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Audio profile radar chart data
  const prepareRadarData = (cluster) => {
    if (!cluster || !cluster.audio_profile) return null;
    
    const audioProfile = cluster.audio_profile;
    
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

  // Genre clusters chart data
  const prepareGenreData = () => {
    if (!hasGenreAnalysis()) return null;
    
    const clusters = analysisData.specialized_insights.genre_clusters.clusters;
    const { colors, transparentColors } = generateColors(clusters.length);
    
    return {
      labels: clusters.map(cluster => {
        const name = cluster.name.split(':')[1]?.trim() || cluster.name;
        return name.length > 20 ? name.substring(0, 20) + '...' : name;
      }),
      datasets: [
        {
          data: clusters.map(cluster => cluster.track_count),
          backgroundColor: transparentColors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Temporal analysis chart data
  const prepareTemporalData = () => {
    if (!hasTemporalAnalysis()) return null;
    
    const clusters = analysisData.specialized_insights.temporal_clusters.clusters;
    const { colors, transparentColors } = generateColors(clusters.length);
    
    // Sort the decades in chronological order
    const sortedClusters = [...clusters].sort((a, b) => {
      // Extract decade numbers for sorting
      const decadeA = a.decade || parseInt(a.name.split(' ')[0]) || 0;
      const decadeB = b.decade || parseInt(b.name.split(' ')[0]) || 0;
      return decadeA - decadeB;
    });
    
    return {
      labels: sortedClusters.map(cluster => cluster.name || cluster.decade + 's'),
      datasets: [
        {
          data: sortedClusters.map(cluster => cluster.track_count),
          backgroundColor: transparentColors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
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

  const barOptions = {
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: '#adb5bd'
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: '#fff'
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
            return `${context.formattedValue} tracks`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center" style={{ height: '400px' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center" style={{ height: '400px' }}>
        <div className="text-red-400 mb-4">
          <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

  // No data
  if (!analysisData || !analysisData.base_analysis) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center flex-col" style={{ height: '400px' }}>
        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-400">No analysis data available for this playlist.</p>
      </div>
    );
  }

  const baseDistributionData = prepareBaseDistributionData();
  const genreData = prepareGenreData();
  const temporalData = prepareTemporalData();
  const clusters = analysisData.base_analysis.clusters;

  // Main component render
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-medium mb-2">AI-Powered Music Analysis</h3>
        
        {analysisMethod === 'hybrid' ? (
          <p className="text-gray-400 text-sm">
            Our algorithm has identified patterns across genres, artists, and eras in this playlist.
          </p>
        ) : (
          <p className="text-gray-400 text-sm">
            Our algorithm has identified {clusters.length} distinct musical patterns in this playlist.
          </p>
        )}
      </div>

      {/* Analysis Type Tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-900 p-1 rounded">
          <button
            onClick={() => setActiveTab('base')}
            className={`flex-1 py-2 px-4 rounded ${
              activeTab === 'base' ? 'bg-green-600' : 'hover:bg-gray-700'
            }`}
          >
            Basic Analysis
          </button>
          
          {hasGenreAnalysis() && (
            <button
              onClick={() => setActiveTab('genres')}
              className={`flex-1 py-2 px-4 rounded ${
                activeTab === 'genres' ? 'bg-green-600' : 'hover:bg-gray-700'
              }`}
            >
              Genre Insights
            </button>
          )}
          
          {hasTemporalAnalysis() && (
            <button
              onClick={() => setActiveTab('eras')}
              className={`flex-1 py-2 px-4 rounded ${
                activeTab === 'eras' ? 'bg-green-600' : 'hover:bg-gray-700'
              }`}
            >
              Era Analysis
            </button>
          )}
          
          {hasArtistAnalysis() && (
            <button
              onClick={() => setActiveTab('artists')}
              className={`flex-1 py-2 px-4 rounded ${
                activeTab === 'artists' ? 'bg-green-600' : 'hover:bg-gray-700'
              }`}
            >
              Artist Networks
            </button>
          )}
        </div>
      </div>

      {/* Base Analysis View */}
      {activeTab === 'base' && (
        <div>
          {/* Distribution Chart */}
          <div className="h-80 mb-6">
            <h4 className="text-lg font-medium mb-2">Track Distribution</h4>
            <Pie data={baseDistributionData} options={pieOptions} />
          </div>

          {/* Cluster Selector */}
          <div className="mb-4">
            <label className="block text-gray-400 text-sm mb-2">Select a Cluster</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded py-2 px-3 text-white"
              value={selectedCluster ? selectedCluster.id : ''}
              onChange={(e) => {
                const clusterId = parseInt(e.target.value);
                const cluster = clusters.find(c => c.id === clusterId);
                setSelectedCluster(cluster);
              }}
            >
              {clusters.map(cluster => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name} ({cluster.count} tracks)
                </option>
              ))}
            </select>
          </div>

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <div className="space-y-6">
              {/* Audio Profile */}
              <div className="h-64">
                <h4 className="text-lg font-medium mb-2">Audio Profile</h4>
                <Radar data={prepareRadarData(selectedCluster)} options={radarOptions} />
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

      {/* Genre Analysis View */}
      {activeTab === 'genres' && hasGenreAnalysis() && (
        <div>
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2">Genre Distribution</h4>
            <p className="text-gray-400 text-sm mb-4">
              Tracks grouped by genre similarities based on artist metadata
            </p>
          </div>
          
          <div className="h-80 mb-6">
            <Pie data={genreData} options={pieOptions} />
          </div>
          
          <div className="space-y-4">
            {analysisData.specialized_insights.genre_clusters.clusters.map(cluster => (
              <div key={cluster.id} className="bg-gray-700 p-4 rounded">
                <h5 className="font-medium">{cluster.name}</h5>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cluster.genre_tags && cluster.genre_tags.map(genre => (
                    <span key={genre} className="px-2 py-1 bg-gray-600 rounded text-xs">
                      {genre}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-300">
                  <span>{cluster.track_count} tracks</span>
                  {cluster.artists && (
                    <span className="ml-3">
                      Top artists: {cluster.artists.slice(0, 3).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Era Analysis View */}
      {activeTab === 'eras' && hasTemporalAnalysis() && (
        <div>
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2">Music By Era</h4>
            <p className="text-gray-400 text-sm mb-4">
              Tracks grouped by release decade
            </p>
          </div>
          
          <div className="h-80 mb-6">
            <Bar 
              data={{
                labels: analysisData.specialized_insights.temporal_clusters.clusters.map(c => c.name || c.year_range),
                datasets: [{
                  data: analysisData.specialized_insights.temporal_clusters.clusters.map(c => c.track_count),
                  backgroundColor: 'rgba(75, 192, 192, 0.6)',
                  borderColor: 'rgb(75, 192, 192)',
                  borderWidth: 1
                }]
              }} 
              options={barOptions} 
            />
          </div>
          
          <div className="bg-gray-700 p-4 rounded">
            <h5 className="font-medium mb-2">Timeline Overview</h5>
            <div className="text-sm">
              <div className="flex justify-between mb-2">
                <span>Oldest Track:</span>
                <span className="font-medium">
                  {analysisData.specialized_insights.temporal_clusters.earliest_year || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between mb-2">
                <span>Newest Track:</span>
                <span className="font-medium">
                  {analysisData.specialized_insights.temporal_clusters.latest_year || 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Time Span:</span>
                <span className="font-medium">
                  {analysisData.specialized_insights.temporal_clusters.timeline?.span} years
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Artist Networks View */}
      {activeTab === 'artists' && hasArtistAnalysis() && (
        <div>
          <div className="mb-4">
            <h4 className="text-lg font-medium mb-2">Artist Networks</h4>
            <p className="text-gray-400 text-sm mb-4">
              Tracks grouped by artist relationships
            </p>
          </div>
          
          <div className="space-y-4">
            {analysisData.specialized_insights.artist_clusters.clusters.map(cluster => (
              <div key={cluster.id} className="bg-gray-700 p-4 rounded">
                <h5 className="font-medium">{cluster.name}</h5>
                <div className="mt-2 text-sm text-gray-300">
                  <span>{cluster.track_count} tracks</span>
                  {cluster.collaborator_count > 0 && (
                    <span className="ml-3">
                      Collaborates with {cluster.collaborator_count} artists
                    </span>
                  )}
                </div>
                
                {cluster.collaborators && cluster.collaborators.length > 0 && (
                  <div className="mt-2">
                    <h6 className="text-xs text-gray-400">Frequent collaborators:</h6>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {cluster.collaborators.map(artist => (
                        <span key={artist} className="px-2 py-1 bg-gray-600 rounded text-xs">
                          {artist}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Sample tracks from this artist */}
                <div className="mt-3">
                  <h6 className="text-xs text-gray-400">Sample tracks:</h6>
                  <div className="mt-1 space-y-1">
                    {cluster.tracks.slice(0, 3).map((track, index) => (
                      <div key={index} className="text-sm truncate">
                        {track.name}
                      </div>
                    ))}
                    {cluster.tracks.length > 3 && (
                      <div className="text-xs text-gray-500">
                        + {cluster.tracks.length - 3} more tracks
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Information Notes */}
      <div className="mt-6 text-xs text-gray-400 border-t border-gray-700 pt-4">
        <p>
            This analysis uses machine learning to group tracks based on {analysisMethod === 'hybrid' ? 
            'artist relationships, genres, and release eras' : 
            'artist, album, and playlist context'}. 
            Each cluster represents a distinct pattern in your music that might transcend traditional genre boundaries.
        </p>
        <p className="mt-2">
            <strong>Note:</strong> Due to recent changes in Spotify's API access policies, I no longer have access to detailed audio features 
            (danceability, energy, tempo, etc.) that were previously available. Instead, this analysis now focuses on metadata patterns, 
            artist connections, and contextual information to provide these insights. While the audio profiles are approximations, 
            the groupings themselves are based on real relationships in your music library.
        </p>
        </div>
    </div>
  );
};

export default AdvancedPlaylistAnalysis;