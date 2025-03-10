import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Recently Played', path: '/recently-played' },
    { name: 'Top Items', path: '/top-items' },
    { name: 'Playlists', path: '/playlists' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-gray-800 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/dashboard" className="text-xl font-bold text-green-500">
            Spotify Analytics
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`hover:text-green-400 transition-colors ${
                  isActive(item.path) ? 'text-green-500 font-medium' : 'text-gray-300'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          {/* User Profile & Logout */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <div className="flex items-center">
                {user.images && user.images.length > 0 ? (
                  <img
                    src={user.images[0].url}
                    alt={user.display_name}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                    <span className="text-sm font-medium">
                      {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium mr-4">{user.display_name}</span>
              </div>
            )}
            <button
              onClick={logout}
              className="py-1 px-3 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
            >
              Logout
            </button>
          </div>
          
          {/* Mobile Menu Button */}
          <button
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
          </button>
        </div>
        
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden py-3 border-t border-gray-700">
            <div className="space-y-1 pb-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block py-2 px-4 rounded ${
                    isActive(item.path)
                      ? 'bg-gray-900 text-green-500'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
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
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                      <span className="text-sm font-medium">
                        {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium">{user.display_name}</span>
                </div>
              )}
              <div className="px-4 pt-2">
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 rounded text-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;