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
import InfoTooltip from '../components/InfoTooltip';
import api from '../services/api';

const MLPlaylistInsights = ({ playlistId }) => {
  const [analysisData, setAnalysisData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMLAnalysisData = async () => {
      if (!playlistId) return;
      
      setLoading(true);
      try {
        // Try dedicated ML endpoint first
        const response = await api.get(`/stats/ml-playlist-analysis/${playlistId}`);
        setAnalysisData(response.data);
        
        // Initialize selected cluster
        if (response.data.clusters && response.data.clusters.length > 0) {
          setSelectedCluster(response.data.clusters[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching ML analysis data:', err);
        setError(err.response?.data?.error || 'Failed to load ML analysis data.');
      } finally {
        setLoading(false);
      }
    };
  
    fetchMLAnalysisData();
  }, [playlistId]);

  const ClusterQualityAlert = ({ analysisData }) => {
    // Only show if there's a balance warning or very few clusters relative to tracks
    if (!analysisData) return null;
    
    const showWarning = 
      analysisData.balance_warning || 
      (analysisData.clusters?.length < 3 && analysisData.total_tracks > 50);
    
    if (!showWarning) return null;
  
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg"
      >
        <div className="flex items-start">
          <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h5 className="text-sm font-medium text-yellow-500">Clustering Information</h5>
            <p className="text-xs text-gray-300 mt-1">
              Our AI has identified limited distinct patterns in this playlist. Some musical styles may be harder to
              separate into distinct groups due to similar characteristics. You can explore the individual clusters
              to see the specific patterns we detected.
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  // Distribution chart data
  const prepareDistributionData = () => {
    if (!analysisData || !analysisData.clusters) return null;
    
    const clusters = analysisData.clusters;
    const { colors, transparentColors } = generateChartColors(clusters.length, 220); // Purple hue for ML
    
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
          backgroundColor: 'rgba(138, 43, 226, 0.2)', // Purple for ML
          borderColor: 'rgb(138, 43, 226)',
          pointBackgroundColor: 'rgb(138, 43, 226)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(138, 43, 226)',
          borderWidth: 2
        }
      ]
    };
  };

  // Prepare genre data if available
  const prepareGenreData = () => {
    if (!analysisData || !analysisData.additional_insights || 
        !analysisData.additional_insights.cluster_genre_distributions ||
        !selectedCluster) return null;
    
    const clusterIdx = selectedCluster.id - 1;
    const genreData = analysisData.additional_insights.cluster_genre_distributions[clusterIdx];
    
    if (!genreData || genreData.length === 0) return null;
    
    const { colors, transparentColors } = generateChartColors(genreData.length, 260);
    
    return {
      labels: genreData.map(item => item[0]), // Genre names
      datasets: [
        {
          data: genreData.map(item => item[1]), // Counts
          backgroundColor: transparentColors,
          borderColor: colors,
          borderWidth: 1,
        }
      ]
    };
  };

  // Chart options
  const pieOptions = getEnhancedChartOptions({
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: 12,
          padding: 10,
          font: {
            size: 11
          }
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

  // Helper to render mood and energy indicators
  const renderMoodEnergyIndicator = (level) => {
    const levels = {
      veryLow: { color: "bg-blue-500", label: "Very Low" },
      low: { color: "bg-blue-400", label: "Low" },
      medium: { color: "bg-purple-500", label: "Medium" },
      high: { color: "bg-red-400", label: "High" },
      veryHigh: { color: "bg-red-600", label: "Very High" }
    };
    
    const levelInfo = levels[level];
    
    return (
      <span className="flex items-center">
        <span className={`w-3 h-3 rounded-full ${levelInfo.color} mr-1`}></span>
        {levelInfo.label}
      </span>
    );
  };

  // Helper to determine mood level based on valence
  const getMoodLevel = (valence) => {
    if (valence < 0.2) return "veryLow";
    if (valence < 0.4) return "low";
    if (valence < 0.6) return "medium";
    if (valence < 0.8) return "high";
    return "veryHigh";
  };
  
  // Helper to determine energy level
  const getEnergyLevel = (energy) => {
    if (energy < 0.2) return "veryLow";
    if (energy < 0.4) return "low";
    if (energy < 0.6) return "medium";
    if (energy < 0.8) return "high";
    return "veryHigh";
  };

  // Helper to get a readable description of the cluster
  const getClusterDescription = (cluster) => {
    if (!cluster || !cluster.audio_profile) return "";
    
    const profile = cluster.audio_profile;
    let descriptions = [];
    
    // Determine mood (valence)
    if (profile.valence < 0.3) {
      descriptions.push("melancholic");
    } else if (profile.valence > 0.7) {
      descriptions.push("uplifting");
    } else {
      descriptions.push("balanced mood");
    }
    
    // Determine energy
    if (profile.energy < 0.3) {
      descriptions.push("calm");
    } else if (profile.energy > 0.7) {
      descriptions.push("energetic");
    } else {
      descriptions.push("moderate energy");
    }
    
    // Determine acoustic vs electronic
    if (profile.acousticness > 0.7) {
      descriptions.push("acoustic");
    } else if (profile.acousticness < 0.3) {
      descriptions.push("electronic");
    }
    
    // Determine instrumental vs vocal
    if (profile.instrumentalness > 0.5) {
      descriptions.push("mostly instrumental");
    } else if (profile.speechiness > 0.3) {
      descriptions.push("vocal-heavy");
    }
    
    // Determine danceability
    if (profile.danceability > 0.7) {
      descriptions.push("danceable");
    }
    
    // Create a readable sentence
    return `These tracks are characterized by a ${descriptions.join(", ")} sound with an average tempo of ${Math.round(profile.tempo)} BPM.`;
  };

  // Extract context themes if available
  const getContextThemes = () => {
    if (!analysisData || !analysisData.additional_insights || !analysisData.additional_insights.context_themes) {
      return null;
    }
    
    return analysisData.additional_insights.context_themes;
  };

  // Get a formatted text of the year span
  const getYearSpanText = () => {
    if (!analysisData || !analysisData.additional_insights || !analysisData.additional_insights.playlist_year_span) {
      return "Year information not available";
    }
    
    const yearSpan = analysisData.additional_insights.playlist_year_span;
    return `Tracks span from ${yearSpan.earliest} to ${yearSpan.latest} (${yearSpan.span} years)`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gradient-to-br from-spotify-gray-800 to-spotify-gray-900 p-6 rounded-lg shadow-lg"
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
            <h3 className="text-xl font-medium">AI-Powered Music Analysis</h3>
            <div className="flex items-center text-xs px-3 py-1 bg-purple-900/50 rounded-full mt-2 md:mt-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="text-purple-300">Enhanced ML Clustering</span>
            </div>
          </div>
          
          <p className="text-gray-400 text-sm">
            {analysisData ? 
              `Our AI has identified ${analysisData.optimal_clusters} distinct musical patterns across ${analysisData.total_tracks} tracks in this playlist.` :
              "AI analysis provides deeper insights into your playlist's musical patterns."
            }
          </p>
        </div>

        <ClusterQualityAlert analysisData={analysisData} />

        {/* Tab Navigation */}
        <div className="mb-6">
          <motion.div 
            className="flex space-x-1 bg-spotify-gray-900 p-1 rounded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                activeTab === 'overview' ? 'bg-purple-600' : ''
              }`}
            >
              Overview
            </motion.button>
            
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                activeTab === 'details' ? 'bg-purple-600' : ''
              }`}
            >
              Cluster Details
            </motion.button>
            
            <motion.button
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('insights')}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                activeTab === 'insights' ? 'bg-purple-600' : ''
              }`}
            >
              Advanced Insights
            </motion.button>
          </motion.div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Distribution Chart */}
              <div className="h-80 mb-6">
                <h4 className="text-lg font-medium mb-2">Cluster Distribution</h4>
                {analysisData?.clusters && (
                  <AnimatedPieChart 
                    data={prepareDistributionData()} 
                    options={pieOptions} 
                  />
                )}
              </div>

              {/* Cluster Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {analysisData?.clusters?.slice(0, 4).map((cluster) => (
                  <motion.div
                    key={cluster.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * cluster.id }}
                    whileHover={{ 
                      y: -5, 
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                      backgroundColor: 'rgba(255,255,255,0.03)'
                    }}
                    className="bg-spotify-gray-800/50 p-4 rounded-lg border border-gray-700"
                    onClick={() => {
                      setSelectedCluster(cluster);
                      setActiveTab('details');
                    }}
                  >
                    <h5 className="font-medium text-base mb-2">{cluster.name}</h5>
                    <p className="text-sm text-gray-400 mb-2">
                      {getClusterDescription(cluster)}
                    </p>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{cluster.count} tracks ({cluster.percentage}%)</span>
                      <span className="text-purple-400 hover:text-purple-300">
                        View Details →
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Playlist Context */}
              {getContextThemes() && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 bg-gradient-to-r from-spotify-gray-800 to-purple-900/30 rounded-lg border border-gray-700"
                >
                  <h4 className="text-lg font-medium mb-2">Playlist Context</h4>
                  <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(getContextThemes()).map(([themeType, themes]) => {
                      if (themes.length === 0) return null;
                      
                      return (
                        <div key={themeType}>
                          <h5 className="text-purple-400 mb-1 capitalize">{themeType}</h5>
                          <div className="flex flex-wrap gap-2">
                            {themes.map(theme => (
                              <span key={theme} className="px-2 py-1 bg-spotify-gray-700 rounded text-xs">
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Year span info */}
                    <div>
                      <h5 className="text-purple-400 mb-1">Time Span</h5>
                      <span className="px-2 py-1 bg-spotify-gray-700 rounded text-xs">
                        {getYearSpanText()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && selectedCluster && (
            <motion.div
              key="details-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Cluster Selector */}
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Select a Cluster</label>
                <select
                  className="w-full bg-spotify-gray-700 border border-spotify-gray-600 rounded py-2 px-3 text-white"
                  value={selectedCluster ? selectedCluster.id : ''}
                  onChange={(e) => {
                    const clusterId = parseInt(e.target.value);
                    const cluster = analysisData.clusters.find(c => c.id === clusterId);
                    setSelectedCluster(cluster);
                  }}
                >
                  {analysisData.clusters.map(cluster => (
                    <option key={cluster.id} value={cluster.id}>
                      {cluster.name} ({cluster.count} tracks)
                    </option>
                  ))}
                </select>
              </div>

              {/* Cluster Details */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left Column - Audio Profile */}
                <div className="md:w-1/2">
                  <div className="h-64 md:h-80">
                    <h4 className="text-lg font-medium mb-2">Audio Profile</h4>
                    <AnimatedRadarChart 
                      data={prepareRadarData(selectedCluster)} 
                      options={radarOptions} 
                    />
                  </div>
                  
                  {/* Audio Profile Interpretation */}
                  <motion.div 
                    className="bg-gradient-to-r from-spotify-gray-700 to-purple-900/30 p-4 rounded-lg mt-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="font-medium mb-2">Audio Characteristics</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          Mood (Valence):
                        </span>
                        <span className="font-medium">
                          {renderMoodEnergyIndicator(getMoodLevel(selectedCluster.audio_profile.valence))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          Energy:
                        </span>
                        <span className="font-medium">
                          {renderMoodEnergyIndicator(getEnergyLevel(selectedCluster.audio_profile.energy))}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          Tempo:
                        </span>
                        <span className="font-medium">
                          {Math.round(selectedCluster.audio_profile.tempo)} BPM
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          Sound Type:
                        </span>
                        <span className="font-medium">
                          {selectedCluster.audio_profile.acousticness > 0.6 ? 'Mostly Acoustic' :
                           selectedCluster.audio_profile.acousticness < 0.3 ? 'Electronic' : 'Mixed'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          Vocal Content:
                        </span>
                        <span className="font-medium">
                          {selectedCluster.audio_profile.instrumentalness > 0.5 ? 'Mostly Instrumental' :
                           selectedCluster.audio_profile.speechiness > 0.33 ? 'Vocal-heavy' : 'Balanced'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
                          Danceability:
                        </span>
                        <span className="font-medium">
                          {selectedCluster.audio_profile.danceability < 0.33 ? 'Low' :
                           selectedCluster.audio_profile.danceability > 0.66 ? 'High' : 'Medium'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Right Column - Tracks & Genres */}
                <div className="md:w-1/2">
                  {/* Genre Distribution if available */}
                  {prepareGenreData() && (
                    <div className="mb-6">
                      <h4 className="text-lg font-medium mb-2">Genre Distribution</h4>
                      <div className="h-48">
                        <AnimatedPieChart 
                          data={prepareGenreData()} 
                          options={{
                            ...pieOptions,
                            plugins: {
                              ...pieOptions.plugins,
                              legend: {
                                ...pieOptions.plugins.legend,
                                position: 'bottom'
                              }
                            }
                          }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Sample Tracks */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h4 className="text-lg font-medium mb-2">Sample Tracks</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
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
                </div>
              </div>

              {/* Cluster Description */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 p-4 bg-spotify-gray-800 rounded-lg border border-purple-900/30"
              >
                <h4 className="font-medium mb-2">Cluster Summary</h4>
                <p className="text-sm text-gray-300">
                  {getClusterDescription(selectedCluster)}
                </p>
              </motion.div>
            </motion.div>
          )}

          {/* Advanced Insights Tab */}
          {activeTab === 'insights' && (
            <motion.div
              key="insights-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="space-y-6">
                {/* ML Methodology */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-purple-900/30 to-spotify-gray-800 p-4 rounded-lg"
                >
                  <h4 className="text-lg font-medium mb-2">About the AI Analysis</h4>
                  <p className="text-sm text-gray-300">
                    This analysis used enhanced machine learning techniques to discover patterns in your playlist that might not be obvious through traditional categorization. Our algorithm analyzes:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-300">
                    <li className="flex items-start">
                      <svg className="h-4 w-4 text-purple-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span>Artist relationships and collaboration networks</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-4 w-4 text-purple-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span>Genre and subgenre patterns</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-4 w-4 text-purple-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span>Track popularity and temporal relationships</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="h-4 w-4 text-purple-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                      </svg>
                      <span>Playlist context and thematic elements</span>
                    </li>
                  </ul>
                </motion.div>
                
                {/* Contextual Analysis */}
                {getContextThemes() && Object.values(getContextThemes()).some(arr => arr.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-spotify-gray-800 p-4 rounded-lg"
                  >
                    <h4 className="text-lg font-medium mb-2">Contextual Analysis</h4>
                    <p className="text-sm text-gray-300 mb-3">
                      Our AI analyzed your playlist name and description to understand the context in which these tracks are meant to be played.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(getContextThemes()).map(([themeType, themes]) => {
                        if (themes.length === 0) return null;
                        
                        return (
                          <div key={themeType} className="bg-spotify-gray-700/50 p-3 rounded-lg">
                            <h5 className="text-purple-400 text-sm mb-2 capitalize">{themeType} Themes</h5>
                            <div className="flex flex-wrap gap-2">
                              {themes.map(theme => (
                                <span key={theme} className="px-2 py-1 bg-purple-900/30 rounded text-xs">
                                  {theme}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
                
                {/* Advanced Interpretation */}
                {analysisData && analysisData.clusters && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-spotify-gray-800 p-4 rounded-lg"
                  >
                    <h4 className="text-lg font-medium mb-2">Key Insights</h4>
                    
                    <div className="space-y-4">
                      {/* Most popular cluster */}
                      {analysisData.clusters.length > 0 && (
                        <div className="bg-spotify-gray-700/50 p-3 rounded-lg">
                          <h5 className="text-purple-400 text-sm mb-1">Dominant Pattern</h5>
                          <p className="text-sm">
                            <strong>{analysisData.clusters[0].name}</strong> represents {analysisData.clusters[0].percentage}% of your playlist, 
                            suggesting this is the core sound you're drawn to.
                          </p>
                        </div>
                      )}
                      
                      {/* Musical diversity */}
                      {analysisData.clusters.length > 1 && (
                        <div className="bg-spotify-gray-700/50 p-3 rounded-lg">
                          <h5 className="text-purple-400 text-sm mb-1">Musical Diversity</h5>
                          <p className="text-sm">
                            With {analysisData.optimal_clusters} distinct clusters identified, 
                            your playlist shows {analysisData.optimal_clusters > 3 ? 'high' : 'moderate'} musical diversity. 
                            The secondary pattern is <strong>{analysisData.clusters[1].name}</strong>.
                          </p>
                        </div>
                      )}
                      
                      {/* Year span */}
                      {analysisData.additional_insights?.playlist_year_span && (
                        <div className="bg-spotify-gray-700/50 p-3 rounded-lg">
                          <h5 className="text-purple-400 text-sm mb-1">Temporal Analysis</h5>
                          <p className="text-sm">
                            Your playlist spans {analysisData.additional_insights.playlist_year_span.span} years 
                            ({analysisData.additional_insights.playlist_year_span.earliest}-
                            {analysisData.additional_insights.playlist_year_span.latest}), 
                            showing {analysisData.additional_insights.playlist_year_span.span > 20 ? 'broad historical interests' : 
                              analysisData.additional_insights.playlist_year_span.span > 10 ? 'moderate historical range' : 
                              'focus on a specific era'}.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                
                {/* What the AI doesn't see */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-spotify-gray-800/50 p-4 rounded-lg border border-gray-700"
                >
                  <h4 className="text-lg font-medium mb-2 flex items-center">
                    <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    Limitations
                  </h4>
                  <p className="text-sm text-gray-300">
                    Due to recent changes in Spotify's API policies, our algorithm doesn't have access to direct audio features like we used to. Instead, we've developed a hybrid approach using metadata, artist relationships, and contextual signals to approximate audio characteristics. While these approximations are good, they may not capture every nuance of the actual audio.
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Information Notes */}
        <motion.div 
          className="mt-6 text-xs text-gray-400 border-t border-gray-700 pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>
            This enhanced analysis uses machine learning to find patterns in your music that might transcend traditional genre boundaries.
            The AI examines artist relationships, release patterns, and metadata to create meaningful groups of similar tracks.
          </p>
        </motion.div>
      </DataStateHandler>
    </motion.div>
  );
};

export default MLPlaylistInsights;