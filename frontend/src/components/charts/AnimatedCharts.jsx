// src/components/charts/AnimatedCharts.jsx
import React, { useEffect, useState, useRef } from 'react'; // Added useRef import
import { Pie, Radar, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';

// Make sure to import the registration
import './ChartRegistration';

export const AnimatedPieChart = ({ data, options, className = '' }) => {
  const [animatedData, setAnimatedData] = useState({
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      data: Array(dataset.data.length).fill(0),
    }))
  });
  const chartRef = useRef(null);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    };
  }, []);

  // Update data with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 400);
    
    return () => clearTimeout(timer);
  }, [data]);

  // Enhanced options with better sizing defaults
  const enhancedOptions = {
    ...options,
    maintainAspectRatio: false,
    responsive: true,
    plugins: {
      ...options?.plugins,
      legend: {
        ...options?.plugins?.legend,
        position: options?.plugins?.legend?.position || 'right',
        labels: {
          ...options?.plugins?.legend?.labels,
          boxWidth: 15,
          padding: 15,
          font: {
            size: 12,
            ...options?.plugins?.legend?.labels?.font
          }
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '300px' }} // Ensure minimum height
    >
      <Pie 
        ref={chartRef}
        data={animatedData} 
        options={enhancedOptions} 
      />
    </motion.div>
  );
};

export const AnimatedRadarChart = ({ data, options, className = '' }) => {
  const [animatedData, setAnimatedData] = useState({
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      data: Array(dataset.data.length).fill(0),
    }))
  });
  const chartRef = useRef(null);

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    };
  }, []);

  // Update data with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 400);
    
    return () => clearTimeout(timer);
  }, [data]);

  // Enhanced options with better sizing
  const enhancedOptions = {
    ...options,
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      ...options?.scales,
      r: {
        ...options?.scales?.r,
        pointLabels: {
          ...options?.scales?.r?.pointLabels,
          font: {
            size: 12,
            ...options?.scales?.r?.pointLabels?.font
          }
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '300px' }} // Ensure minimum height
    >
      <Radar
        ref={chartRef}
        data={animatedData} 
        options={enhancedOptions}
      />
    </motion.div>
  );
};

export const AnimatedBarChart = ({ data, options, className = '' }) => {
  const [animatedData, setAnimatedData] = useState({
    ...data,
    datasets: data.datasets.map(dataset => ({
      ...dataset,
      data: Array(dataset.data.length).fill(0),
    }))
  });
  const chartRef = useRef(null); // Added missing chartRef definition

  // Handle cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current && chartRef.current.chartInstance) {
        chartRef.current.chartInstance.destroy();
      }
    };
  }, []);

  // Update data with animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedData(data);
    }, 400);
    
    return () => clearTimeout(timer);
  }, [data]);

  // Enhanced options with better sizing
  const enhancedOptions = {
    ...options,
    maintainAspectRatio: false,
    responsive: true,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full h-full ${className}`}
      style={{ minHeight: '300px' }} // Ensure minimum height
    >
      <Bar 
        ref={chartRef}
        data={animatedData} 
        options={enhancedOptions}
      />
    </motion.div>
  );
};