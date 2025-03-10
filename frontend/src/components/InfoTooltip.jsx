import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const InfoTooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <motion.button
        className="w-4 h-4 rounded-full bg-spotify-gray-600 text-white text-xs flex items-center justify-center focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="More information"
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
      >
        i
      </motion.button>
      
      <AnimatePresence>
        {showTooltip && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-10 w-64 p-2 text-xs bg-spotify-gray-800 text-white rounded shadow-lg -left-32 bottom-full mb-2 border border-spotify-gray-700"
          >
            <div className="relative">
              {text}
              <motion.div 
                className="absolute w-3 h-3 bg-spotify-gray-800 transform rotate-45 left-32 -bottom-1.5 border-r border-b border-spotify-gray-700"
                layoutId="tooltip-arrow"
              ></motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfoTooltip;