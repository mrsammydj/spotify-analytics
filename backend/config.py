import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

class Config:
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-default-secret-key')
    
    # SQLite database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///instance/spotify_analytics.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Spotify API
    SPOTIFY_CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID')
    SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET')
    SPOTIFY_REDIRECT_URI = os.environ.get('SPOTIFY_REDIRECT_URI', 'http://localhost:5000/callback')
    
    # JWT settings for token handling
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = 3600  # 1 hour