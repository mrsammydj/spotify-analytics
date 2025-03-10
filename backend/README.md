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

## Directory Structure

```
backend/
├── routes/                # API endpoints organized by resource
│   ├── auth.py            # Authentication endpoints
│   ├── stats.py           # Statistics and analytics endpoints
│   └── user.py            # User data endpoints
├── services/              # Business logic
│   ├── spotify.py         # Spotify API integration
│   └── analytics.py       # Data processing for analytics
├── cache/                 # Cache storage for analysis results
├── app.py                 # Flask application setup
├── config.py              # Configuration management
├── models.py              # Database models
├── database.py            # Database connection
├── requirements.txt       # Python dependencies
└── instance/              # SQLite database location (gitignored)
```

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Spotify API Credentials
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
SPOTIFY_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Security
SECRET_KEY=your_flask_secret_key_here
JWT_SECRET_KEY=your_jwt_secret_key_here

# URLs
FRONTEND_URL=http://localhost:3000
```

## Setup and Installation

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   ```

2. **Activate the virtual environment**:
   - Windows: `venv\Scripts\activate`
   - macOS/Linux: `source venv/bin/activate`

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   Create a `.env` file as described above.

5. **Initialize the database**:
   ```bash
   flask run
   ```
   The database will be automatically created on first run.

## Running the Server

```bash
# Ensure virtual environment is activated
flask run
```

The server will start at http://localhost:5000 by default.

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

## Spotify API Limitations

As of early 2025, Spotify has restricted access to certain API endpoints for new developer applications:

1. **Restricted Endpoints**:
   - Audio Features
   - Audio Analysis
   - Recommendations
   - Related Artists
   - 30-second preview URLs

2. **Adaptation Strategy**:
   - Using alternative data sources such as artist metadata, genres, and release dates
   - Implementing ML clustering on available data
   - Creating approximated audio profiles based on playlist context
   - Providing graceful fallbacks when data is limited

## Database Models

The application uses the following main models:

- **User**: Spotify user information and authentication
- **Track**: Information about Spotify tracks
- **Artist**: Information about Spotify artists
- **ListeningHistory**: Record of user's listening activity

## Deployment

### Railway Deployment

1. Sign up for [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Create a new project from the repository
4. Add environment variables in the Railway dashboard
5. The application will be automatically deployed

### Environment Variables for Production

For production, set these additional environment variables:

```
# Update to production URLs
SPOTIFY_REDIRECT_URI=https://your-production-url.com/api/auth/callback
FRONTEND_URL=https://your-frontend-url.vercel.app
```

## Common Issues

### Database Errors

If you encounter database errors, you may need to delete the instance directory and restart the application to recreate the database:

```bash
rm -rf instance
flask run
```

### Spotify API Rate Limits

The Spotify API has rate limits. To avoid hitting these limits:
- The application uses caching for analysis results
- Batch requests are used when possible
- Error handling includes exponential backoff for retries

### Audio Features Access

If your application doesn't have access to audio features (403 Forbidden errors), the system will automatically use the simplified analysis approach.

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Spotipy Documentation](https://spotipy.readthedocs.io/)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)
- [scikit-learn Documentation](https://scikit-learn.org/stable/documentation.html)