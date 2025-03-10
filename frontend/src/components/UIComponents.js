// src/components/UIComponents.js
import React from 'react';
import { motion } from 'framer-motion';

export const AnimatedCard = ({ children, delay = 0, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ 
        y: -5, 
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
      }}
      className={`bg-spotify-gray-800 rounded-lg overflow-hidden shadow-lg ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const GlassCard = ({ children, className = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.02 }}
      className={`backdrop-blur-md bg-white/10 rounded-xl border border-white/20 shadow-xl ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const AnimatedButton = ({ children, onClick, className = '', disabled = false }) => {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`py-2 px-4 rounded-full font-medium transition-colors ${
        disabled 
          ? 'bg-gray-600 cursor-not-allowed' 
          : 'bg-spotify-green hover:bg-spotify-light'
      } ${className}`}
    >
      {children}
    </motion.button>
  );
};

export const PageTransition = ({ children }) => {
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    in: {
      opacity: 1,
      y: 0
    },
    out: {
      opacity: 0,
      y: -20
    }
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.5
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );
};

export const TabTransition = ({ children, id }) => {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  );
};

export const SpotifyGradient = ({ children, className = '' }) => {
  return (
    <div className={`bg-gradient-to-br from-spotify-dark via-spotify-gray-900 to-spotify-gray-800 ${className}`}>
      {children}
    </div>
  );
};