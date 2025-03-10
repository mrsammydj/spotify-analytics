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
    """Get a Spotify client for a user with enhanced debugging"""
    try:
        print(f"\n--- SPOTIFY CLIENT DEBUG ---")
        print(f"Getting Spotify client for user ID: {user.id}, Spotify ID: {user.spotify_id}")
        
        # Check if refresh token exists
        if not user.refresh_token:
            print(f"ERROR: User has no refresh token!")
            raise ValueError("User has no refresh token")
            
        print(f"User has refresh token (length: {len(user.refresh_token)})")
        
        # Create SpotifyOAuth instance
        print(f"Creating SpotifyOAuth instance...")
        client_id = current_app.config.get('SPOTIFY_CLIENT_ID')
        client_secret = current_app.config.get('SPOTIFY_CLIENT_SECRET')
        redirect_uri = current_app.config.get('SPOTIFY_REDIRECT_URI')
        
        if not client_id or not client_secret:
            print(f"ERROR: Missing Spotify credentials in config!")
            print(f"  client_id exists: {bool(client_id)}")
            print(f"  client_secret exists: {bool(client_secret)}")
            raise ValueError("Missing Spotify API credentials")
            
        sp_oauth = SpotifyOAuth(
            client_id=client_id,
            client_secret=client_secret,
            redirect_uri=redirect_uri,
            scope="user-read-recently-played user-top-read user-read-email user-read-private playlist-read-private"
        )
        
        # Get new access token using refresh token
        print(f"Refreshing access token...")
        try:
            token_info = sp_oauth.refresh_access_token(user.refresh_token)
            print(f"Access token successfully refreshed")
            
            # Debug token contents (don't print actual tokens)
            print(f"Received new token info with keys: {list(token_info.keys())}")
            if 'expires_in' in token_info:
                print(f"Token expires in: {token_info['expires_in']} seconds")
                
            access_token = token_info['access_token']
            
            # Update refresh token if provided
            if 'refresh_token' in token_info:
                print(f"Received new refresh token, updating in database")
                user.refresh_token = token_info['refresh_token']
                db.session.commit()
            else:
                print(f"No new refresh token provided")
        except Exception as token_error:
            print(f"ERROR refreshing access token: {str(token_error)}")
            print(traceback.format_exc())
            raise
            
        # Create and test Spotify client
        print(f"Creating Spotify client with access token")
        spotify_client = spotipy.Spotify(auth=access_token)
        
        # Test the client with a simple API call
        try:
            print(f"Testing Spotify client with me() API call")
            user_info = spotify_client.me()
            print(f"Client test successful - connected as: {user_info['id']}")
            
            # Verify we're connecting as the expected user
            if user_info['id'] != user.spotify_id:
                print(f"WARNING: Spotify client user ID ({user_info['id']}) doesn't match database user ID ({user.spotify_id})")
        except Exception as api_error:
            print(f"ERROR testing Spotify client: {str(api_error)}")
            print(traceback.format_exc())
            raise
        
        print(f"Spotify client successfully created and tested")
        return spotify_client
    
    except Exception as e:
        print(f"CRITICAL ERROR getting Spotify client: {str(e)}")
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