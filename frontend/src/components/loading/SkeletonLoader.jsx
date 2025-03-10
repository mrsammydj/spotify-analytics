import React from 'react';
import { motion } from 'framer-motion';

export const SkeletonCard = ({ height = 'h-24' }) => {
  return (
    <div className={`w-full ${height} bg-spotify-gray-800 rounded-lg overflow-hidden relative`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-spotify-gray-700/30 to-transparent"
        animate={{
          x: ['0%', '100%', '0%'],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: 2,
          ease: "linear"
        }}
      />
    </div>
  );
};

export const SkeletonText = ({ width = 'w-full', height = 'h-4' }) => {
  return (
    <div className={`${width} ${height} bg-spotify-gray-800 rounded relative overflow-hidden`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-spotify-gray-700/30 to-transparent"
        animate={{
          x: ['0%', '100%', '0%'],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: 2,
          ease: "linear"
        }}
      />
    </div>
  );
};

export const SkeletonCircle = ({ size = 'h-12 w-12' }) => {
  return (
    <div className={`${size} bg-spotify-gray-800 rounded-full relative overflow-hidden`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-spotify-gray-700/30 to-transparent"
        animate={{
          x: ['0%', '100%', '0%'],
        }}
        transition={{
          repeat: Infinity,
          repeatType: "loop",
          duration: 2,
          ease: "linear"
        }}
      />
    </div>
  );
};