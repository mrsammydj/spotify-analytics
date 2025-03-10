import React, { useState, useEffect } from 'react';
import { 
  AnimatedPieChart, 
  getEnhancedChartOptions, 
  generateChartColors 
} from '../components/charts';
import { DataStateHandler } from '../components/loading';
import api from '../services/api';

const PlaylistGenreChart = ({ playlistId }) => {
  const [genreData, setGenreData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGenreData = async () => {
      if (!playlistId) return;
      
      setLoading(true);
      try {
        const response = await api.get(`/stats/playlist-genres/${playlistId}`);
        setGenreData(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching playlist genre data:', err);
        setError('Failed to load genre data for this playlist.');
        setLoading(false);
      }
    };

    fetchGenreData();
  }, [playlistId]);

  // Prepare chart data
  const prepareChartData = () => {
    if (!genreData || !genreData.genres || genreData.genres.length === 0) {
      return null;
    }

    // Limit to top 10 genres for better visualization
    const topGenres = genreData.genres.slice(0, 10);
    
    // Generate colors with a specific base hue for consistency
    const { colors, transparentColors } = generateChartColors(topGenres.length, 240); // Blue hue
    
    // Prepare data for Chart.js
    return {
      labels: topGenres.map(genre => genre.name),
      datasets: [
        {
          data: topGenres.map(genre => genre.count),
          backgroundColor: transparentColors,
          borderColor: colors,
          borderWidth: 1,
        },
      ],
    };
  };

  // Enhanced chart options with consistent styling
  const chartOptions = getEnhancedChartOptions({
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
            return `${context.label}: ${value} tracks (${percentage}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false
  });

  const chartData = prepareChartData();
  const isEmpty = !chartData || chartData.labels.length === 0;

  return (
    <div className="bg-spotify-gray-800 p-6 rounded-lg shadow-lg">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Genre Distribution</h3>
        <p className="text-sm text-gray-400">Top genres in this playlist</p>
      </div>
      
      <div className="h-80 md:h-96">
        <DataStateHandler
          isLoading={loading}
          error={error}
          isEmpty={isEmpty}
          emptyMessage="No genre data available for this playlist."
        >
          <AnimatedPieChart data={chartData} options={chartOptions} />
        </DataStateHandler>
      </div>
    </div>
  );
};

export default PlaylistGenreChart;