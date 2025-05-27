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


## Getting Started

See the README files in the [backend](./backend/README.md) and [frontend](./frontend/README.md) directories for more details.


### Quick Start


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


## Spotify API Limitations

As of early 2025, Spotify has restricted access to certain API endpoints for new developer applications:

**Restricted Endpoints**:
   - Audio Features
   - Audio Analysis
   - Recommendations
   - Related Artists
   - 30-second preview URLs

**Adaptation Strategy**:
   - Using alternative data sources such as artist metadata, genres, and release dates
   - Implementing ML clustering on available data
   - Creating approximated audio profiles based on playlist context
   - Providing graceful fallbacks when data is limited


## Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for providing the data
- [Spotipy](https://spotipy.readthedocs.io/) for the Python Spotify client
- [Chart.js](https://www.chartjs.org/) for visualization capabilities
- [scikit-learn](https://scikit-learn.org/) for machine learning algorithms
