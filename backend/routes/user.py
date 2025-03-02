from flask import Blueprint, request, jsonify, current_app
import jwt
from functools import wraps
from models import User, db
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
user_bp = Blueprint('user', __name__)

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
            
        try:
            payload = jwt.decode(
                token,
                current_app.config.get('JWT_SECRET_KEY'),
                algorithms=['HS256']
            )
            user_id = payload['sub']
            current_user = User.query.get(user_id)
            
            # Add debug logging
            logger.info(f"User authenticated: ID={user_id}, Email={current_user.email if current_user else 'None'}")
            
            if not current_user:
                return jsonify({'error': 'User not found'}), 404
                
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

# Helper to get a Spotify client for a user
def get_spotify_client(user):
    logger.info(f"Creating Spotify client for user: ID={user.id}, Spotify ID={user.spotify_id}")
    
    sp_oauth = SpotifyOAuth(
        client_id=current_app.config.get('SPOTIFY_CLIENT_ID'),
        client_secret=current_app.config.get('SPOTIFY_CLIENT_SECRET'),
        redirect_uri=current_app.config.get('SPOTIFY_REDIRECT_URI'),
        scope="user-read-recently-played user-top-read user-read-email user-read-private playlist-read-private"
    )
    
    # Get new access token using refresh token
    token_info = sp_oauth.refresh_access_token(user.refresh_token)
    access_token = token_info['access_token']
    
    # Update refresh token if provided
    if 'refresh_token' in token_info:
        user.refresh_token = token_info['refresh_token']
        db.session.commit()
        
    # Return Spotify client
    return spotipy.Spotify(auth=access_token)

@user_bp.route('/profile')
@token_required
def get_profile(current_user):
    """
    Get the user's Spotify profile
    """
    try:
        sp = get_spotify_client(current_user)
        profile = sp.me()
        
        # Add debug logging
        logger.info(f"Profile fetched for user: ID={current_user.id}, Spotify ID={profile['id']}")
        
        return jsonify({
            'id': profile['id'],
            'display_name': profile['display_name'],
            'email': profile.get('email'),
            'images': profile.get('images', []),
            'country': profile.get('country'),
            'product': profile.get('product')
        })
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': str(e)}), 500

@user_bp.route('/playlists')
@token_required
def get_playlists(current_user):
    """
    Get the user's playlists
    """
    try:
        sp = get_spotify_client(current_user)
        playlists = sp.current_user_playlists()
        
        # Add debug logging
        logger.info(f"Playlists fetched for user: ID={current_user.id}, Count={playlists['total']}")
        
        return jsonify({
            'items': playlists['items'],
            'total': playlists['total']
        })
    except Exception as e:
        logger.error(f"Error fetching playlists: {str(e)}")
        return jsonify({'error': str(e)}), 500