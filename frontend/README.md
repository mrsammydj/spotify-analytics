# Spotify Analytics Frontend

The React frontend for the Spotify Analytics application, featuring data visualization with Chart.js and styling with Tailwind CSS.

## Tech Stack

- **React**: JavaScript library for building the user interface
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Chart.js**: JavaScript library for data visualization
- **Axios**: Promise-based HTTP client for API requests

## Directory Structure

```
frontend/
├── public/               # Static files
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── AdvancedPlaylistAnalysis.jsx  # New hybrid analysis component
│   │   ├── InfoTooltip.jsx
│   │   └── Navbar.jsx
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.js
│   ├── pages/            # Page components
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── RecentlyPlayed.jsx
│   │   ├── TopItems.jsx
│   │   └── Playlists.jsx
│   ├── services/         # API service functions
│   │   └── api.js
│   ├── context/          # React context providers
│   │   └── AuthContext.js
│   ├── App.jsx           # Main application component
│   └── index.js          # Entry point
├── package.json          # Dependencies and scripts
└── tailwind.config.js    # Tailwind CSS configuration
```


## Key Components

### Analytics Visualizations

- **AdvancedPlaylistAnalysis**: React component for multi-dimensional playlist analysis, featuring:
  - Tabbed interface for different analysis types
  - Distribution charts for clusters
  - Radar charts for audio profiles
  - Detailed information about each cluster
  - Automatic fallback mechanisms

- **PlaylistGenreChart**: Displays genre distribution within playlists using Pie charts

- **TopItemsChart**: Renders bar charts and doughnut charts for top tracks, artists, and genres

### Pages

- **Home**: Landing page with login button
- **Dashboard**: Main dashboard with charts and statistics
- **TopItems**: Detailed view of top tracks and artists
- **RecentlyPlayed**: Timeline of recently played tracks
- **Playlists**: Analysis of user playlists with ML-powered insights

### Services

- **api.js**: Handles API requests to the backend server and manages authentication
- **AuthContext.js**: Provides authentication state and functionality throughout the application

## Authentication Flow

1. User clicks the login button on the Home page
2. The application redirects to Spotify's authorization page
3. After authorization, Spotify redirects back to the application
4. The backend exchanges the authorization code for access and refresh tokens
5. The frontend receives a JWT token and stores it in localStorage
6. Subsequent API requests include this token in the Authorization header

## Advanced Analytics Features

### Hybrid Analysis Approach

The frontend now supports a hybrid analysis approach that includes:

1. **Base Analysis**: Shows track distribution and audio profiles
2. **Genre Insights**: Displays genre-based clustering from ML analysis
3. **Era Analysis**: Visualizes tracks grouped by release decades
4. **Artist Networks**: Shows relationships between artists

### Dynamic Component Loading

The application dynamically shows or hides analysis types based on data availability:

```jsx
{hasGenreAnalysis() && (
  <button
    onClick={() => setActiveTab('genres')}
    className={`flex-1 py-2 px-4 rounded ${
      activeTab === 'genres' ? 'bg-green-600' : 'hover:bg-gray-700'
    }`}
  >
    Genre Insights
  </button>
)}
```

### Graceful Fallbacks

The frontend implements error handling and fallbacks when backend analysis fails:

```jsx
try {
  // Try to use the advanced hybrid analysis first
  const response = await api.get(`/stats/advanced-playlist-analysis/${playlistId}`);
  setAnalysisData(response.data);
} catch (err) {
  console.error('Advanced analysis failed, falling back to simple analysis', err);
  // Fall back to simple analysis if the advanced one fails
  const fallbackResponse = await api.get(`/stats/simple-playlist-analysis/${playlistId}`);
  setAnalysisData({ 
    base_analysis: fallbackResponse.data,
    specialized_insights: {} 
  });
}
```

## Styling

This project uses Tailwind CSS for styling. The main configuration is in `tailwind.config.js`.

### Custom Colors

The application includes custom Spotify-themed colors:

```css
.text-spotify-green {
  color: #1DB954;
}

.bg-spotify-green {
  background-color: #1DB954;
}
```

## State Management

This application uses React's built-in state management with hooks:

- `useState` for component-local state
- `useEffect` for side effects like API calls
- `useContext` for sharing authentication state


### Environment Variables for Production

For production, update the API URL:

```
REACT_APP_API_URL=https://your-backend-url.railway.app/api
```

## Browser Compatibility

This application is designed to work with modern browsers (last 2 versions of Chrome, Firefox, Safari, and Edge).

## Performance Considerations

- Lazy load components for pages that aren't immediately visible
- Use React.memo for components that don't need to re-render often
- Optimize Chart.js rendering for large datasets
- Implement caching for API responses

## Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Spotify Design Guidelines](https://developer.spotify.com/documentation/general/design-and-branding/)
