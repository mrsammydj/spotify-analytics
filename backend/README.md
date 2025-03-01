# Spotify Analytics Backend

The backend API for the Spotify Analytics application, built with Flask and Spotipy.

## Tech Stack

- **Flask**: Lightweight Python web framework
- **SQLite**: File-based database for storing user data and listening history
- **Spotipy**: Python library for the Spotify Web API
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

### User Data

- `GET /api/user/profile`: Get current user profile
- `GET /api/user/playlists`: Get user's playlists

### Statistics

- `GET /api/stats/recently-played`: Get recently played tracks
- `GET /api/stats/top-tracks`: Get user's top tracks
- `GET /api/stats/top-artists`: Get user's top artists
- `GET /api/stats/genre-distribution`: Get genre distribution

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
- Cache responses where appropriate
- Implement exponential backoff for retries
- Batch requests when possible

## Resources

- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Spotipy Documentation](https://spotipy.readthedocs.io/)
- [Spotify Web API Documentation](https://developer.spotify.com/documentation/web-api/)