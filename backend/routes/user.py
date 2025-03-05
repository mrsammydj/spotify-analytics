from flask import Blueprint, request, jsonify, current_app
import jwt
from functools import wraps
from models import User, db
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import traceback  # Added for better error tracking

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
            print("AUTH ERROR - Token is missing")
            return jsonify({'error': 'Token is missing'}), 401
            
        try:
            # Decode JWT token
            payload = jwt.decode(
                token,
                current_app.config.get('JWT_SECRET_KEY'),
                algorithms=['HS256']
            )
            user_id = payload['sub']
            print(f"TOKEN AUTH - JWT user_id: {user_id}")
            
            # Get user from database
            current_user = User.query.get(user_id)
            
            if not current_user:
                print(f"AUTH ERROR - User not found for ID: {user_id}")
                return jsonify({'error': 'User not found'}), 404
                
            print(f"AUTH SUCCESS - DB ID: {current_user.id}, Spotify ID: {current_user.spotify_id}")
                
        except jwt.ExpiredSignatureError:
            print("AUTH ERROR - Token expired")
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            print("AUTH ERROR - Invalid token")
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            print(f"AUTH ERROR - Unexpected error: {str(e)}")
            print(traceback.format_exc())
            return jsonify({'error': 'Authentication error'}), 500
            
        return f(current_user, *args, **kwargs)
    return decorated

# Helper to get a Spotify client for a user
def get_spotify_client(user):
    try:
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
            print(f"Refresh token updated for user: {user.spotify_id}")
            
        # Return Spotify client
        return spotipy.Spotify(auth=access_token)
    
    except Exception as e:
        print(f"ERROR getting Spotify client: {str(e)}")
        print(traceback.format_exc())
        raise

@user_bp.route('/profile')
@token_required
def get_profile(current_user):
    """
    Get the user's Spotify profile
    """
    try:
        sp = get_spotify_client(current_user)
        profile = sp.me()
        
        print(f"PROFILE REQUEST - User ID: {current_user.id}, Spotify ID: {current_user.spotify_id}")
        print(f"SPOTIFY PROFILE - ID: {profile['id']}, Name: {profile['display_name']}")
        
        # Verify the retrieved profile matches our database user
        if profile['id'] != current_user.spotify_id:
            print(f"WARNING: Profile ID mismatch - DB: {current_user.spotify_id}, Spotify: {profile['id']}")
        
        return jsonify({
            'id': profile['id'],
            'display_name': profile['display_name'],
            'email': profile.get('email'),
            'images': profile.get('images', []),
            'country': profile.get('country'),
            'product': profile.get('product')
        })
    except Exception as e:
        print(f"Error getting profile: {str(e)}")
        print(traceback.format_exc())
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
        
        return jsonify({
            'items': playlists['items'],
            'total': playlists['total']
        })
    except Exception as e:
        print(f"Error getting playlists: {str(e)}")
        return jsonify({'error': str(e)}), 500