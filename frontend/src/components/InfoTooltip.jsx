import React, { useState } from 'react';

const InfoTooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        className="w-4 h-4 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center focus:outline-none"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="More information"
      >
        i
      </button>
      
      {showTooltip && (
        <div className="absolute z-10 w-64 p-2 text-xs bg-gray-800 text-white rounded shadow-lg -left-32 bottom-full mb-2">
          <div className="relative">
            {text}
            <div className="absolute w-3 h-3 bg-gray-800 transform rotate-45 left-32 -bottom-1"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;