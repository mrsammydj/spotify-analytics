import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../services/api';

// Register required Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

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
      } catch (err) {
        console.error('Error fetching playlist genre data:', err);
        setError('Failed to load genre data for this playlist.');
      } finally {
        setLoading(false);
      }
    };

    fetchGenreData();
  }, [playlistId]);

  // Generate random color for chart segments
  const generateColors = (count) => {
    const colors = [];
    const transparentColors = [];
    
    for (let i = 0; i < count; i++) {
      // Generate vibrant colors with good contrast
      const hue = Math.floor(i * (360 / count));
      const saturation = 65 + Math.random() * 10; // 65-75%
      const lightness = 45 + Math.random() * 10;  // 45-55%
      
      const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      const transparentColor = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.7)`;
      
      colors.push(color);
      transparentColors.push(transparentColor);
    }
    
    return { colors, transparentColors };
  };

  const prepareChartData = () => {
    if (!genreData || !genreData.genres || genreData.genres.length === 0) {
      return null;
    }

    // Limit to top 10 genres for better visualization
    const topGenres = genreData.genres.slice(0, 10);
    
    // Generate colors
    const { colors, transparentColors } = generateColors(topGenres.length);
    
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

  const chartOptions = {
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#fff',
          padding: 15,
          usePointStyle: true,
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
            return `${context.label}: ${value} tracks (${percentage}%)`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };

  if (loading) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center" style={{ height: '300px' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-center" style={{ height: '300px' }}>
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

  const chartData = prepareChartData();
  
  if (!chartData || chartData.labels.length === 0) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex items-center justify-center flex-col" style={{ height: '300px' }}>
        <svg className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-400">No genre data available for this playlist.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg" style={{ height: '400px' }}>
      <div className="mb-4">
        <h3 className="text-lg font-medium">Genre Distribution</h3>
        <p className="text-sm text-gray-400">Top genres in this playlist</p>
      </div>
      <div className="h-64">
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default PlaylistGenreChart;