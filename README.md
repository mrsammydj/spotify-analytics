# Spotify Analytics Dashboard

A full-stack web application that leverages Spotify's API to provide in-depth analytics on your listening habits. This project uses Flask for the backend API, Spotipy for Spotify integration, and React with Chart.js for visualization.

## Features

- **Track Recently Played Songs**: View and analyze your recently played tracks
- **Visualize Top Items**: See your top tracks, artists, and genres with interactive charts
- **Playlist Analysis**: Explore the genres, artist networks, and eras within your playlists using machine learning
- **Listening Trends**: Track your listening habits over time with detailed graphs
- **Multi-dimensional Insights**: Discover patterns in your music that transcend traditional genre classifications

## Tech Stack

### Backend
- **Flask**: Python web framework
- **SQLite**: Lightweight database
- **Spotipy**: Python library for the Spotify Web API
- **scikit-learn**: Machine learning library for clustering analysis
- **NumPy**: Scientific computing library

### Frontend
- **React**: JavaScript library for building user interfaces
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: JavaScript charting library
- **Axios**: Promise-based HTTP client

## Project Structure

```
spotify-analytics/
├── backend/             # Flask API
│   ├── routes/          # API endpoints
│   │   ├── auth.py      # Authentication routes
│   │   ├── stats.py     # Analytics routes
│   │   └── user.py      # User data routes
│   ├── services/        # Business logic
│   ├── cache/           # Analysis cache storage
│   └── ...
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   │   ├── InfoTooltip.jsx
│   │   │   ├── AdvancedPlaylistAnalysis.jsx
│   │   │   └── ...
│   │   ├── pages/       # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Playlists.jsx
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

## Getting Started

See the README files in the [backend](./backend/README.md) and [frontend](./frontend/README.md) directories for detailed setup instructions.

### Quick Start

1. Clone the repository
2. Set up the backend:
   ```
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```
3. Set up the frontend:
   ```
   cd frontend
   npm install
   ```
4. Create `.env` files in both directories (see templates)
5. Start the development servers

## API Usage Notes

This application uses the Spotify Web API for data collection and analysis. Due to recent changes in Spotify's API access policies (as of early 2025), access to certain endpoints including Audio Features and Audio Analysis is restricted for new developer applications. Our application adapts to these limitations by:

1. Using alternative data sources such as artist metadata, genre information, and release dates
2. Implementing machine learning clustering on available data
3. Providing hybrid analysis approaches that combine heuristics with ML techniques

If you have a Spotify Developer account with extended permissions, the application can potentially provide more detailed audio analysis.

## Deployment

This application is designed for deployment on:
- **Backend**: Railway or Render (free tier)
- **Frontend**: Vercel (free tier)

See the [Deployment Guide](./backend/README.md#deployment) for detailed instructions.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for providing the data
- [Spotipy](https://spotipy.readthedocs.io/) for the Python Spotify client
- [Chart.js](https://www.chartjs.org/) for visualization capabilities
- [scikit-learn](https://scikit-learn.org/) for machine learning algorithms