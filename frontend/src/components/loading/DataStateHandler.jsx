import React from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

const DataStateHandler = ({ 
  isLoading, 
  error, 
  emptyMessage = "No data found", 
  isEmpty = false,
  retryFn,
  loadingComponent,
  children
}) => {
  // Loading state
  if (isLoading) {
    if (loadingComponent) return loadingComponent;
    
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="large" />
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/20 p-6 rounded-lg text-center"
      >
        <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xl mb-4">{typeof error === 'string' ? error : 'An error occurred while loading data.'}</p>
        {retryFn && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={retryFn} 
            className="mt-2 px-6 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
          >
            Retry
          </motion.button>
        )}
      </motion.div>
    );
  }
  
  // Empty state
  if (isEmpty) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center"
      >
        <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-gray-400">{emptyMessage}</p>
      </motion.div>
    );
  }
  
  // Data loaded successfully
  return children;
};

export default DataStateHandler;