import React from 'react';
import { motion } from 'framer-motion';

const spinTransition = {
  repeat: Infinity,
  ease: "linear",
  duration: 1
};

const LoadingSpinner = ({ size = 'medium', color = 'spotify-green' }) => {
  const sizes = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  };

  return (
    <div className="flex justify-center items-center">
      <motion.div
        className={`rounded-full border-t-2 border-l-2 border-${color} ${sizes[size]}`}
        animate={{ rotate: 360 }}
        transition={spinTransition}
      />
    </div>
  );
};

export default LoadingSpinner;