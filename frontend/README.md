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
│   │   ├── TopItemsChart.jsx
│   │   └── RecentlyPlayedList.jsx
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.js
│   ├── pages/            # Page components
│   │   ├── Home.jsx
│   │   ├── Dashboard.jsx
│   │   ├── RecentlyPlayed.jsx
│   │   └── TopItems.jsx
│   ├── services/         # API service functions
│   │   └── api.js
│   ├── App.jsx           # Main application component
│   └── index.js          # Entry point
├── package.json          # Dependencies and scripts
└── tailwind.config.js    # Tailwind CSS configuration
```

## Environment Variables

Create a `.env` file in the frontend directory with the following variables:

```
REACT_APP_API_URL=http://localhost:5000/api
```

## Setup and Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file as described above.

## Running the Development Server

```bash
npm start
```

The development server will start at http://localhost:3000 by default.

## Building for Production

```bash
npm run build
```

This will create a `build` directory with optimized production files.

## Key Components

### Charts and Visualizations

- **TopItemsChart**: Renders bar charts and doughnut charts for top tracks, artists, and genres
- **RecentlyPlayedList**: Displays recently played tracks with album art and timestamps

### Pages

- **Home**: Landing page with login button
- **Dashboard**: Main dashboard with charts and statistics
- **TopItems**: Detailed view of top tracks and artists
- **RecentlyPlayed**: Timeline of recently played tracks

### Services

- **api.js**: Handles API requests to the backend server and manages authentication

## Authentication Flow

1. User clicks the login button on the Home page
2. The application redirects to Spotify's authorization page
3. After authorization, Spotify redirects back to the application
4. The backend exchanges the authorization code for access and refresh tokens
5. The frontend receives a JWT token and stores it in localStorage
6. Subsequent API requests include this token in the Authorization header

## Styling

This project uses Tailwind CSS for styling. The main configuration is in `tailwind.config.js`.

### Custom Styling

For component-specific styles that go beyond Tailwind's utility classes, add them to the component files directly.

## State Management

This application uses React's built-in state management with hooks:

- `useState` for component-local state
- `useEffect` for side effects like API calls
- `useContext` for sharing authentication state

## Deployment

### Vercel Deployment

1. Sign up for [Vercel](https://vercel.com/)
2. Connect your GitHub repository
3. Create a new project from the repository
4. Add environment variables in the Vercel dashboard
5. The application will be automatically deployed

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

## Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
- [Spotify Design Guidelines](https://developer.spotify.com/documentation/general/design-and-branding/)