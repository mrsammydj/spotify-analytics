import React from 'react';
import { useAuth } from '../context/AuthContext';
import spotifyLogo from '../assets/Spotify_Primary_Logo_RGB_Green.png';
import { motion } from 'framer-motion';

// Mock images for feature previews
const FEATURE_IMAGES = {
  dashboard: '/api/placeholder/500/300',
  recentlyPlayed: '/api/placeholder/500/300',
  topItems: '/api/placeholder/500/300',
  playlistAnalysis: '/api/placeholder/500/300'
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

const Login = () => {
  const { login } = useAuth();

  const handleLoginClick = () => {
    console.log("Login button clicked");
    login().catch(error => {
      console.error("Login error:", error);
    });
  };

  const features = [
    {
      title: "Personalized Dashboard",
      description: "Get a snapshot of your listening habits with recently played tracks, top artists, and favorite genres all in one place.",
      image: FEATURE_IMAGES.dashboard,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      title: "Listening History Timeline",
      description: "Explore your recently played tracks with timestamps and visualize your daily listening patterns.",
      image: FEATURE_IMAGES.recentlyPlayed,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Top Artists & Tracks Analysis",
      description: "Discover which artists and tracks you've been listening to most across different time periods.",
      image: FEATURE_IMAGES.topItems,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: "AI-Powered Playlist Insights",
      description: "Uncover hidden patterns in your playlists with our machine learning algorithm that groups similar tracks and visualizes audio characteristics.",
      image: FEATURE_IMAGES.playlistAnalysis,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-spotify-gray-900 to-spotify-dark text-white">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative overflow-hidden py-16 md:py-24 px-4"
      >
        {/* Background Gradients */}
        <motion.div 
          className="absolute top-0 left-0 w-full h-full -z-10 opacity-30"
          animate={{
            background: [
              "radial-gradient(circle at 20% 20%, rgba(29, 185, 84, 0.4) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(29, 185, 84, 0.4) 0%, transparent 50%)",
              "radial-gradient(circle at 50% 80%, rgba(29, 185, 84, 0.4) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 20%, rgba(29, 185, 84, 0.4) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />

        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            {/* Left side hero content */}
            <motion.div 
              className="lg:w-1/2 text-center lg:text-left mb-10 lg:mb-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex justify-center lg:justify-start items-center mb-6">
                <img 
                  src={spotifyLogo} 
                  alt="Spotify Logo" 
                  className="h-10 mr-4" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/150?text=Spotify';
                  }}
                />
                <h1 className="text-5xl font-bold text-spotify-green">Musilyze</h1>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Unlock the Patterns in Your 
                <motion.span 
                  className="text-transparent bg-clip-text bg-gradient-to-r from-spotify-green to-blue-400 ml-2"
                  animate={{ 
                    backgroundPosition: ["0% center", "100% center"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                  style={{
                    backgroundSize: "200%"
                  }}
                >
                  Music Taste
                </motion.span>
              </h2>
              
              <p className="text-lg text-gray-300 mb-8">
                Musilyze transforms your Spotify listening data into beautiful visualizations 
                and insightful analytics, helping you discover patterns and connections in your 
                musical journey.
              </p>
              
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: '#1ed760' }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLoginClick}
                className="py-3 px-8 bg-spotify-green hover:bg-spotify-light text-white font-bold rounded-full text-lg shadow-lg transition-colors"
              >
                <div className="flex items-center">
                  <span>Login with Spotify</span>
                  <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </motion.button>
            </motion.div>
            
            {/* Right side hero image/graphic */}
            <motion.div 
              className="lg:w-1/2 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative w-full h-64 md:h-96 bg-spotify-gray-800 rounded-xl overflow-hidden">
                {/* This would be a hero image or graphic representation of the app */}
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-br from-spotify-green/30 to-blue-500/30"
                  animate={{
                    background: [
                      "linear-gradient(to bottom right, rgba(29, 185, 84, 0.3), rgba(59, 130, 246, 0.3))",
                      "linear-gradient(to bottom right, rgba(59, 130, 246, 0.3), rgba(29, 185, 84, 0.3))",
                      "linear-gradient(to bottom right, rgba(29, 185, 84, 0.3), rgba(59, 130, 246, 0.3))"
                    ]
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                />
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/api/placeholder/550/350" 
                    alt="Dashboard Preview" 
                    className="rounded-lg shadow-xl max-w-full max-h-full object-cover" 
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
      
      {/* Features Section */}
      <motion.div 
        className="py-16 px-4 bg-spotify-gray-900/50"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="container mx-auto max-w-7xl">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            variants={itemVariants}
          >
            Discover What <span className="text-spotify-green">Musilyze</span> Can Do For You
          </motion.h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                className="bg-spotify-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                variants={itemVariants}
                whileHover={{ y: -5 }}
              >
                <div className="h-48 relative overflow-hidden">
                  <img 
                    src={feature.image} 
                    alt={feature.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-spotify-gray-900 to-transparent"></div>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-spotify-green bg-opacity-20 flex items-center justify-center text-spotify-green mr-3">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                  </div>
                  <p className="text-gray-400">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* How It Works Section */}
      <motion.div 
        className="py-16 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="container mx-auto max-w-7xl">
          <motion.h2 
            className="text-3xl font-bold text-center mb-12"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            How It Works
          </motion.h2>
          
          <div className="flex flex-col md:flex-row justify-between space-y-6 md:space-y-0 md:space-x-4">
            {[
              {
                step: "1",
                title: "Connect Your Spotify",
                description: "Securely log in with your Spotify account. We only request read access to your listening data.",
                color: "from-purple-600 to-spotify-green"
              },
              {
                step: "2",
                title: "We Analyze Your Data",
                description: "Our algorithms process your listening history, playlists, and preferences to generate insights.",
                color: "from-blue-600 to-purple-600"
              },
              {
                step: "3",
                title: "Discover Insights",
                description: "Explore interactive visualizations and AI-powered analysis of your musical taste and patterns.",
                color: "from-spotify-green to-blue-600"
              }
            ].map((step, index) => (
              <motion.div 
                key={index}
                className="bg-spotify-gray-800 rounded-xl p-6 flex-1"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 + index * 0.2 }}
                whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
              >
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-lg mb-4`}>
                  {step.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-gray-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
      
      {/* Call to Action */}
      <motion.div 
        className="py-16 px-4 bg-spotify-gray-900/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div 
            className="bg-gradient-to-r from-spotify-green/20 to-blue-600/20 rounded-xl p-8 shadow-lg"
            whileHover={{ boxShadow: '0 15px 30px -10px rgba(0, 0, 0, 0.4)' }}
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Discover Your Music DNA?</h2>
            <p className="text-gray-300 mb-8">
              Connect your Spotify account now to unlock insights about your listening habits and musical preferences.
            </p>
            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: '#1ed760' }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLoginClick}
              className="py-3 px-8 bg-spotify-green hover:bg-spotify-light text-white font-bold rounded-full text-lg shadow-lg transition-colors"
            >
              <div className="flex items-center">
                <svg className="w-6 h-6 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.36.12-.78-.12-.9-.48-.12-.36.12-.78.48-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.66.36 1.021zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span>Login with Spotify</span>
              </div>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Footer */}
      <motion.div 
        className="py-8 px-4 bg-spotify-gray-900 border-t border-gray-800"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="container mx-auto max-w-7xl">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">
              Musilyze is not affiliated with Spotify. Created using Flask, React, and the Spotify Web API.
            </p>
            <p>
              Your privacy matters - we only analyze what you allow, and never share your data.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;