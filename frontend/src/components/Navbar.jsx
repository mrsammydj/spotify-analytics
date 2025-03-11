// Updated Navbar.jsx with properly contained indicator

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import musilyzelogo from '../assets/musilyze.png';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Recently Played', path: '/recently-played', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Top Items', path: '/top-items', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Playlists', path: '/playlists', icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <motion.nav 
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-spotify-gray-800 text-white shadow-lg"
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/dashboard" className="text-xl font-bold">
            <motion.div 
              whileHover={{ scale: 1.05 }} 
              className="flex items-center"
            >
              <img 
                src={musilyzelogo} 
                alt="Musilyze Logo" 
                className="h-8 mr-2" 
              />
              <span className="white">Musilyze</span>
            </motion.div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="group flex items-center hover:text-spotify-green transition-colors relative py-2"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span>{item.name}</span>
                
                {/* FIXED: Contains the indicator within the nav item with overflow-hidden */}
                <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
                  {isActive(item.path) && (
                    <motion.div
                      className="h-full bg-spotify-green"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      exit={{ scaleX: 0 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </div>
              </Link>
            ))}
          </div>
          
          {/* User Profile & Logout */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center"
              >
                {user.images && user.images.length > 0 ? (
                  <motion.img
                    whileHover={{ scale: 1.1 }}
                    src={user.images[0].url}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full mr-2 ring-2 ring-spotify-green ring-offset-2 ring-offset-spotify-gray-800"
                  />
                ) : (
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center mr-2"
                  >
                    <span className="text-sm font-medium">
                      {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </motion.div>
                )}
                <span className="text-sm font-medium mr-4">{user.display_name}</span>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="py-1 px-3 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
            >
              Logout
            </motion.button>
          </div>
          
          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="md:hidden text-gray-300 hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </motion.button>
        </div>
        
        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden py-3 border-t border-gray-700 overflow-hidden"
          >
            <div className="space-y-1 pb-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center py-2 px-4 rounded ${
                    isActive(item.path)
                      ? 'bg-spotify-green text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  {item.name}
                </Link>
              ))}
            </div>
            
            {/* Mobile User Profile & Logout */}
            <div className="pt-4 pb-3 border-t border-gray-700">
              {user && (
                <div className="flex items-center px-4 py-2">
                  {user.images && user.images.length > 0 ? (
                    <img
                      src={user.images[0].url}
                      alt={user.display_name}
                      className="w-8 h-8 rounded-full mr-2"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-spotify-green flex items-center justify-center mr-2">
                      <span className="text-sm font-medium">
                        {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium">{user.display_name}</span>
                </div>
              )}
              <div className="px-4 pt-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  Logout
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default Navbar;