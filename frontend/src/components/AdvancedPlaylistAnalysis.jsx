import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AnimatedPieChart, 
  AnimatedRadarChart, 
  AnimatedBarChart,
  getEnhancedChartOptions, 
  generateChartColors 
} from '../components/charts';
import { DataStateHandler, SkeletonCard } from '../components/loading';
import api from '../services/api';

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
  
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-block ml-1">
      <button
        className="w-4 h-4 rounded-full bg-spotify-gray-600 text-white text-xs flex items-center justify-center focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="More information"
      >
        i
      </button>
      
      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 text-xs bg-spotify-gray-900 text-white rounded shadow-lg -left-32 bottom-full mb-2 border border-gray-700">
          <div className="relative">
            {descriptions[feature] || "No description available"}
            <div className="absolute w-3 h-3 bg-spotify-gray-900 transform rotate-45 left-32 -bottom-1.5 border-r border-b border-gray-700"></div>
          </div>
        </div>
      )}
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
          const data = response.data; // Store response data in a local variable
          
          // Set selected cluster FIRST from the response data
          if (data?.base_analysis?.clusters && data.base_analysis.clusters.length > 0) {
            setSelectedCluster(data.base_analysis.clusters[0]);
          }
          
          // Then update state
          setAnalysisData(data);
          setAnalysisMethod('hybrid');
          console.log('Advanced analysis success');
        } catch (err) {
          console.error('Advanced analysis failed, falling back to simple analysis', err);
          // Fall back to simple analysis if the advanced one fails
          const fallbackResponse = await api.get(`/stats/simple-playlist-analysis/${playlistId}`);
          const fallbackData = { 
            base_analysis: fallbackResponse.data,
            specialized_insights: {} 
          };
          
          // Set selected cluster FIRST from the fallback data
          if (fallbackData.base_analysis?.clusters && fallbackData.base_analysis.clusters.length > 0) {
            setSelectedCluster(fallbackData.base_analysis.clusters[0]);
          }
          
          // Then update state
          setAnalysisData(fallbackData);
          setAnalysisMethod('simple');
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

  // Distribution chart data for base analysis
  const prepareBaseDistributionData = () => {
    if (!analysisData || !analysisData.base_analysis || !analysisData.base_analysis.clusters) return null;
    
    const clusters = analysisData.base_analysis.clusters;
    const { colors, transparentColors } = generateChartColors(clusters.length, 240); // Blue hue
    
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
          backgroundColor: 'rgba(29, 185, 84, 0.2)',
          borderColor: 'rgb(29, 185, 84)',
          pointBackgroundColor: 'rgb(29, 185, 84)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(29, 185, 84)',
          borderWidth: 2
        }
      ]
    };
  };

  // Genre clusters chart data
  const prepareGenreData = () => {
    if (!hasGenreAnalysis()) return null;
    
    const clusters = analysisData.specialized_insights.genre_clusters.clusters;
    const { colors, transparentColors } = generateChartColors(clusters.length, 290); // Purple hue
    
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
    const { colors, transparentColors } = generateChartColors(clusters.length, 180); // Teal hue
    
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
  const pieOptions = getEnhancedChartOptions({
    plugins: {
      legend: {
        position: 'right',
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
  });

  const radarOptions = getEnhancedChartOptions({
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
  });

  const barOptions = getEnhancedChartOptions({
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        grid: {
          display: false
        },
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
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-spotify-gray-800 p-6 rounded-lg shadow-lg"
    >
      <DataStateHandler
        isLoading={loading}
        error={error}
        loadingComponent={
          <div className="space-y-6">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <SkeletonCard height="h-6" width="w-48" />
                <SkeletonCard height="h-4" width="w-32" />
              </div>
            </div>
            <div className="mb-6">
              <SkeletonCard height="h-10" />
            </div>
            <SkeletonCard height="h-64" />
          </div>
        }
      >
        <div className="mb-6">
          <h3 className="text-xl font-medium mb-2">AI-Powered Music Analysis</h3>
          
          {analysisMethod === 'hybrid' ? (
            <p className="text-gray-400 text-sm">
              Our algorithm has identified patterns across genres, artists, and eras in this playlist.
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              Our algorithm has identified {analysisData?.base_analysis?.clusters?.length || 0} distinct musical patterns in this playlist.
            </p>
          )}
        </div>

        {/* Analysis Type Tabs */}
        <div className="mb-6">
          <motion.div 
            className="flex space-x-1 bg-spotify-gray-900 p-1 rounded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {hasGenreAnalysis() && (
              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('genres')}
                className={`flex-1 py-2 px-4 rounded transition-colors ${
                  activeTab === 'genres' ? 'bg-spotify-green' : ''
                }`}
              >
                Genre Insights
              </motion.button>
            )}
            
            {hasTemporalAnalysis() && (
              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('eras')}
                className={`flex-1 py-2 px-4 rounded transition-colors ${
                  activeTab === 'eras' ? 'bg-spotify-green' : ''
                }`}
              >
                Era Analysis
              </motion.button>
            )}
            
            {hasArtistAnalysis() && (
              <motion.button
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('artists')}
                className={`flex-1 py-2 px-4 rounded transition-colors ${
                  activeTab === 'artists' ? 'bg-spotify-green' : ''
                }`}
              >
                Artist Networks
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Base Analysis View */}
          {activeTab === 'base' && (
            <motion.div
              key="base-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Distribution Chart */}
              <div className="h-80 mb-6">
                <h4 className="text-lg font-medium mb-2">Track Distribution</h4>
                {analysisData?.base_analysis?.clusters && (
                  <AnimatedPieChart 
                    data={prepareBaseDistributionData()} 
                    options={pieOptions} 
                  />
                )}
              </div>

              {/* Cluster Selector */}
              {analysisData?.base_analysis?.clusters && (
                <div className="mb-4">
                  <label className="block text-gray-400 text-sm mb-2">Select a Cluster</label>
                  <select
                    className="w-full bg-spotify-gray-700 border border-spotify-gray-600 rounded py-2 px-3 text-white"
                    value={selectedCluster ? selectedCluster.id : ''}
                    onChange={(e) => {
                      const clusterId = parseInt(e.target.value);
                      const cluster = analysisData.base_analysis.clusters.find(c => c.id === clusterId);
                      setSelectedCluster(cluster);
                    }}
                  >
                    {analysisData.base_analysis.clusters.map(cluster => (
                      <option key={cluster.id} value={cluster.id}>
                        {cluster.name} ({cluster.count} tracks)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selected Cluster Details */}
              {selectedCluster && (
                <div className="space-y-6">
                  {/* Audio Profile */}
                  <div className="h-80 md:h-96">
                    <h4 className="text-lg font-medium mb-2">Audio Profile</h4>
                    <AnimatedRadarChart 
                      data={prepareRadarData(selectedCluster)} 
                      options={radarOptions} 
                    />
                  </div>

                  {/* Sample Tracks */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="text-lg font-medium mb-2">Sample Tracks</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selectedCluster.tracks.map((track, index) => (
                        <motion.div 
                          key={index} 
                          className="flex items-center bg-spotify-gray-700 p-2 rounded"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          whileHover={{ 
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            x: 5
                          }}
                        >
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
                        </motion.div>
                      ))}
                      {selectedCluster.total_tracks > selectedCluster.tracks.length && (
                        <p className="text-center text-gray-500 text-sm pt-2">
                          + {selectedCluster.total_tracks - selectedCluster.tracks.length} more tracks
                        </p>
                      )}
                    </div>
                  </motion.div>

                  {/* Understanding This Cluster */}
                  <motion.div 
                    className="bg-gradient-to-r from-spotify-gray-700 to-spotify-gray-800 p-4 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
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
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* Genre Analysis View */}
          {activeTab === 'genres' && hasGenreAnalysis() && (
            <motion.div
              key="genre-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Genre Distribution</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Tracks grouped by genre similarities based on artist metadata
                </p>
              </div>
              
              <div className="h-80 mb-6">
                <AnimatedPieChart data={prepareGenreData()} options={pieOptions} />
              </div>
              
              <div className="space-y-4">
                {analysisData.specialized_insights.genre_clusters.clusters.map((cluster, index) => (
                  <motion.div 
                    key={cluster.id} 
                    className="bg-gradient-to-r from-spotify-gray-700 to-spotify-gray-800 p-4 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                  >
                    <h5 className="font-medium">{cluster.name}</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cluster.genre_tags && cluster.genre_tags.map(genre => (
                        <span key={genre} className="px-2 py-1 bg-spotify-gray-600 rounded text-xs">
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Era Analysis View */}
          {activeTab === 'eras' && hasTemporalAnalysis() && (
            <motion.div
              key="eras-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Music By Era</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Tracks grouped by release decade
                </p>
              </div>
              
              <div className="h-80 mb-6">
                <AnimatedBarChart 
                  data={{
                    labels: analysisData.specialized_insights.temporal_clusters.clusters.map(c => c.name || c.year_range),
                    datasets: [{
                      data: analysisData.specialized_insights.temporal_clusters.clusters.map(c => c.track_count),
                      backgroundColor: 'rgba(29, 185, 84, 0.6)',
                      borderColor: 'rgb(29, 185, 84)',
                      borderWidth: 1
                    }]
                  }} 
                  options={barOptions} 
                />
              </div>
              
              <motion.div 
                className="bg-gradient-to-r from-spotify-gray-700 to-spotify-gray-800 p-4 rounded-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
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
              </motion.div>
            </motion.div>
          )}

          {/* Artist Networks View */}
          {activeTab === 'artists' && hasArtistAnalysis() && (
            <motion.div
              key="artists-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4">
                <h4 className="text-lg font-medium mb-2">Artist Networks</h4>
                <p className="text-gray-400 text-sm mb-4">
                  Tracks grouped by artist relationships
                </p>
              </div>
              
              <div className="space-y-4">
                {analysisData.specialized_insights.artist_clusters.clusters.map((cluster, index) => (
                  <motion.div 
                    key={cluster.id} 
                    className="bg-gradient-to-r from-spotify-gray-700 to-spotify-gray-800 p-4 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                  >
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
                            <span key={artist} className="px-2 py-1 bg-spotify-gray-600 rounded text-xs">
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
                        {cluster.tracks.slice(0, 3).map((track, idx) => (
                          <div key={idx} className="text-sm truncate">
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
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Information Notes - Keeping this important section */}
        <motion.div 
          className="mt-6 text-xs text-gray-400 border-t border-gray-700 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
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
        </motion.div>
      </DataStateHandler>
    </motion.div>
  );
};

export default AdvancedPlaylistAnalysis;