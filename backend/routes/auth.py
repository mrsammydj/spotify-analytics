from flask import Blueprint, redirect, request, jsonify, current_app, url_for
import os
import requests
import uuid
import jwt
from datetime import datetime, timedelta
import json
import time
from models import User, db
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import traceback
from sqlalchemy import text

# Create Blueprint
auth_bp = Blueprint('auth', __name__)

# Helper function to create a JWT token
def create_token(user_id):
    payload = {
        'exp': datetime.utcnow() + timedelta(days=1),
        'iat': datetime.utcnow(),
        'sub': user_id
    }
    return jwt.encode(
        payload,
        current_app.config.get('JWT_SECRET_KEY'),
        algorithm='HS256'
    )

# Helper to get Spotify OAuth manager with custom cache path
def get_spotify_oauth(cache_path=None):
    """Get a SpotifyOAuth instance with optional custom cache path"""
    cache_path = cache_path or '.spotify_cache'
    return SpotifyOAuth(
        client_id=current_app.config.get('SPOTIFY_CLIENT_ID'),
        client_secret=current_app.config.get('SPOTIFY_CLIENT_SECRET'),
        redirect_uri=current_app.config.get('SPOTIFY_REDIRECT_URI'),
        scope="user-read-recently-played user-top-read user-read-email user-read-private playlist-read-private",
        cache_path=cache_path,
        show_dialog=True  # Force Spotify to show the auth dialog, important for testing multiple accounts
    )

@auth_bp.route('/login')
def login():
    """
    Generate the Spotify authorization URL and redirect the user
    """
    # Clear any existing cache to force a fresh login
    cache_path = f".spotify_cache_{int(time.time())}"
    sp_oauth = get_spotify_oauth(cache_path)
    
    # Add state parameter for security
    state = str(uuid.uuid4())
    auth_url = sp_oauth.get_authorize_url(state=state)
    
    # Add cache path to auth URL so we can retrieve it in the callback
    auth_url = f"{auth_url}&cache_path={cache_path}"
    
    return jsonify({'auth_url': auth_url})

@auth_bp.route('/callback')
def callback():
    """
    Handle the Spotify OAuth callback
    """
    print("\n\n===== SPOTIFY AUTH CALLBACK STARTED =====")
    frontend_url = current_app.config.get('FRONTEND_URL')
    
    # Get the authorization code and state from the request
    code = request.args.get('code')
    cache_path = request.args.get('cache_path', '.spotify_cache')
    
    if not code:
        print("ERROR: No authorization code received")
        return redirect(f"{frontend_url}?error=missing_code")
    
    try:
        # Get the SpotifyOAuth manager with the same cache path
        sp_oauth = get_spotify_oauth(cache_path)
        
        # Exchange the code for tokens
        print(f"Exchanging code for tokens using cache path: {cache_path}")
        token_info = sp_oauth.get_access_token(code, check_cache=False)
        
        if 'access_token' not in token_info:
            print("ERROR: No access token returned from Spotify")
            return redirect(f"{frontend_url}?error=no_access_token")
        
        # Get user profile directly from access token
        access_token = token_info['access_token']
        refresh_token = token_info['refresh_token']
        
        # Create a Spotify client
        sp = spotipy.Spotify(auth=access_token)
        spotify_user = sp.me()
        
        # Print user info for debugging
        print("\nSPOTIFY USER INFO:")
        print(f"ID: {spotify_user['id']}")
        print(f"Display Name: {spotify_user.get('display_name')}")
        print(f"Email: {spotify_user.get('email')}")
        
        # Check if a user with this Spotify ID already exists
        existing_user = User.query.filter_by(spotify_id=spotify_user['id']).first()
        
        # Clear the database session to avoid any cached data
        db.session.close()
        
        if existing_user:
            print(f"Updating existing user - ID: {existing_user.id}, Spotify ID: {existing_user.spotify_id}")
            existing_user.refresh_token = refresh_token
            existing_user.last_login = datetime.utcnow()
            if spotify_user.get('email'):
                existing_user.email = spotify_user.get('email')
            if spotify_user.get('display_name'):
                existing_user.display_name = spotify_user.get('display_name')
            user = existing_user
        else:
            print(f"Creating new user - Spotify ID: {spotify_user['id']}")
            user = User(
                spotify_id=spotify_user['id'],
                email=spotify_user.get('email'),
                display_name=spotify_user.get('display_name'),
                refresh_token=refresh_token
            )
            db.session.add(user)
        
        # Commit the changes
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Database error: {str(e)}")
            print(traceback.format_exc())
            return redirect(f"{frontend_url}?error=database_error")
        
        # Query again to get the updated/created user
        user = User.query.filter_by(spotify_id=spotify_user['id']).first()
        
        if not user:
            print("ERROR: User not found after save operation!")
            return redirect(f"{frontend_url}?error=user_not_saved")
        
        # Create JWT token with the user's ID
        jwt_token = create_token(user.id)
        
        # Include access token in response to avoid immediate refresh
        token_expires = int(time.time()) + token_info['expires_in']
        
        # Decode token for debugging
        try:
            payload = jwt.decode(jwt_token, current_app.config.get('JWT_SECRET_KEY'), algorithms=['HS256'])
            print(f"JWT token created with user_id: {payload['sub']}")
        except Exception as e:
            print(f"Error decoding JWT token: {str(e)}")
        
        # List all users in the database
        all_users = User.query.all()
        print("\nAll users in database:")
        for u in all_users:
            print(f"ID: {u.id}, Spotify ID: {u.spotify_id}, Email: {u.email}")
        
        print("===== SPOTIFY AUTH CALLBACK COMPLETED SUCCESSFULLY =====\n")
        
        # Include the access token and expiration in the redirect URL
        return redirect(
            f"{frontend_url}/callback?token={jwt_token}&access_token={access_token}&expires_at={token_expires}"
        )
        
    except Exception as e:
        print(f"Error during Spotify authentication: {str(e)}")
        print(traceback.format_exc())
        return redirect(f"{frontend_url}?error=authentication_failed&details={str(e)}")

@auth_bp.route('/refresh-token', methods=['POST'])
def refresh_token():
    """
    Refresh the Spotify access token using a stored refresh token
    """
    try:
        # Get the user ID from the JWT token
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401
            
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(
                token,
                current_app.config.get('JWT_SECRET_KEY'),
                algorithms=['HS256']
            )
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
            
        user_id = payload['sub']
        print(f"Token refresh requested for user ID: {user_id}")
        
        # Get the user from the database
        user = User.query.get(user_id)
        if not user:
            print(f"User not found for ID: {user_id}")
            return jsonify({'error': 'User not found'}), 404
            
        print(f"Found user: {user.spotify_id}, {user.display_name}")
        
        # Use a direct Spotify API call instead of SpotifyOAuth
        try:
            # Set up the request to Spotify API
            token_url = 'https://accounts.spotify.com/api/token'
            client_id = current_app.config.get('SPOTIFY_CLIENT_ID')
            client_secret = current_app.config.get('SPOTIFY_CLIENT_SECRET')
            
            # Prepare the data
            payload = {
                'grant_type': 'refresh_token',
                'refresh_token': user.refresh_token
            }
            
            # Make the request
            response = requests.post(
                token_url,
                auth=(client_id, client_secret),
                data=payload
            )
            
            # Check for errors
            response.raise_for_status()
            
            # Parse the response
            token_info = response.json()
            
            # Save the new refresh token if provided
            if 'refresh_token' in token_info:
                user.refresh_token = token_info['refresh_token']
                db.session.commit()
                
            return jsonify({
                'access_token': token_info['access_token'],
                'expires_in': token_info['expires_in']
            })
            
        except requests.exceptions.RequestException as e:
            print(f"Error refreshing token: {str(e)}")
            
            # If it's an authorization error, the token might be revoked
            if response.status_code == 400 and 'invalid_grant' in response.text:
                print("Refresh token is invalid or revoked. User needs to re-authenticate.")
                return jsonify({
                    'error': 'refresh_token_revoked',
                    'message': 'Your session has expired. Please log in again.'
                }), 401
            
            return jsonify({'error': f'Failed to refresh token: {str(e)}'}), 500
            
    except Exception as e:
        print(f"Server error in refresh-token: {str(e)}")
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@auth_bp.route('/verify-token')
def verify_token():
    """
    Verify that a JWT token is valid
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'valid': False, 'error': 'Missing or invalid token'}), 401
        
    token = auth_header.split(' ')[1]
    
    try:
        payload = jwt.decode(
            token,
            current_app.config.get('JWT_SECRET_KEY'),
            algorithms=['HS256']
        )
        
        # Check if user exists
        user_id = payload['sub']
        user = User.query.get(user_id)
        
        if not user:
            print(f"User not found for ID: {user_id}")
            return jsonify({'valid': False, 'error': 'User not found'}), 404
            
        print(f"Token verified for user: {user.spotify_id}, {user.display_name}")
        return jsonify({
            'valid': True, 
            'user_id': user_id, 
            'spotify_id': user.spotify_id,
            'display_name': user.display_name
        })
        
    except jwt.ExpiredSignatureError:
        return jsonify({'valid': False, 'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'valid': False, 'error': 'Invalid token'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Log out the user (client-side only as we can't invalidate JWTs)
    """
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@auth_bp.route('/debug-users')
def debug_users():
    """
    Debug endpoint to list all users
    """
    try:
        users = User.query.all()
        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'spotify_id': user.spotify_id,
                'email': user.email,
                'display_name': user.display_name,
                'created_at': user.created_at.isoformat() if user.created_at else None,
                'last_login': user.last_login.isoformat() if user.last_login else None
            })
        return jsonify({'users': user_list})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/debug-reset', methods=['GET', 'POST'])
def debug_reset():
    """
    Debug endpoint to reset the database
    """
    try:
        # Delete all users
        User.query.delete()
        db.session.commit()
        return jsonify({'success': True, 'message': 'All users deleted'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@auth_bp.route('/debug-create-test-users', methods=['GET', 'POST'])
def debug_create_test_users():
    """
    Debug endpoint to create test users directly in the database
    """
    try:
        # Create test users with different Spotify IDs
        test_user1 = User(
            spotify_id="test-user-1",
            email="test1@example.com",
            display_name="Test User One",
            refresh_token="dummy-token-1"
        )
        
        test_user2 = User(
            spotify_id="test-user-2",
            email="test2@example.com", 
            display_name="Test User Two",
            refresh_token="dummy-token-2"
        )
        
        # Add both users to the database
        db.session.add(test_user1)
        db.session.add(test_user2)
        
        # Commit the changes
        db.session.commit()
        
        # Retrieve the users to confirm they were created
        users = User.query.filter(User.spotify_id.in_(["test-user-1", "test-user-2"])).all()
        
        user_data = [
            {
                'id': user.id,
                'spotify_id': user.spotify_id,
                'email': user.email,
                'display_name': user.display_name
            }
            for user in users
        ]
        
        return jsonify({
            'success': True,
            'message': f'Created {len(user_data)} test users',
            'users': user_data
        })
        
    except Exception as e:
        import traceback
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500