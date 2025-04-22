# Spotify Analytics Backend

The backend API for the Spotify Analytics application, built with Flask and Spotipy.

## Tech Stack

- **Flask**: Lightweight Python web framework
- **SQLite**: File-based database for storing user data and listening history
- **Spotipy**: Python library for the Spotify Web API
- **scikit-learn**: Machine learning library for clustering and analysis
- **NumPy**: Scientific computing library
- **Flask-SQLAlchemy**: ORM for database operations
- **Flask-CORS**: Cross-origin resource sharing support


## API Endpoints

### Authentication

- `GET /api/auth/login`: Get Spotify authorization URL
- `GET /api/auth/callback`: Spotify OAuth callback handler
- `GET /api/auth/verify-token`: Verify JWT token validity
- `POST /api/auth/refresh-token`: Refresh Spotify access token

### User Data

- `GET /api/user/profile`: Get current user profile
- `GET /api/user/playlists`: Get user's playlists

### Statistics

- `GET /api/stats/recently-played`: Get recently played tracks
- `GET /api/stats/top-tracks`: Get user's top tracks
- `GET /api/stats/top-artists`: Get user's top artists
- `GET /api/stats/genre-distribution`: Get genre distribution

### Playlist Analysis

- `GET /api/stats/playlist-tracks/<playlist_id>`: Get tracks in a playlist
- `GET /api/stats/playlist-genres/<playlist_id>`: Get genre distribution in a playlist
- `GET /api/stats/simple-playlist-analysis/<playlist_id>`: Get basic playlist analysis
- `GET /api/stats/advanced-playlist-analysis/<playlist_id>`: Get multi-dimensional analysis of a playlist

## Analysis Features

### Hybrid Analysis System

The backend implements a hybrid analysis approach that combines traditional data processing with machine learning techniques:

1. **Base Analysis**: Context-aware grouping of tracks by artist, album, and metadata
2. **Genre Clustering**: K-means clustering based on artist genre relationships
3. **Temporal Analysis**: Grouping tracks by release decades and musical eras
4. **Artist Network Analysis**: Identifying artist relationships and collaborations

### Caching System

Analysis results are cached to improve performance and reduce API calls:

- Cache location: `backend/cache/`
- Cache duration: 7 days by default
- Cache naming: `{analysis_type}_analysis_{playlist_id}.json`


## Database Models

The application uses the following main models:

- **User**: Spotify user information and authentication
- **Track**: Information about Spotify tracks
- **Artist**: Information about Spotify artists
- **ListeningHistory**: Record of user's listening activity


## Common Issues


### Spotify API Rate Limits

The Spotify API has rate limits. To avoid hitting these limits:
- The application uses caching for analysis results
- Batch requests are used when possible
- Error handling includes exponential backoff for retries

### Audio Features Access

If the application doesn't have access to audio features (403 Forbidden errors), the system will automatically use the simplified analysis approach.

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Spotipy Documentation](https://spotipy.readthedocs.io/)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
- [scikit-learn Documentation](https://scikit-learn.org/stable/documentation.html)
