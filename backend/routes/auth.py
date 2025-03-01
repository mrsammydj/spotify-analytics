from flask import Blueprint, redirect, request, jsonify, current_app
import os
import requests
import uuid
import jwt
from datetime import datetime, timedelta
import json
from models import User, db
import spotipy
from spotipy.oauth2 import SpotifyOAuth

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

# Helper to get Spotify OAuth manager
def get_spotify_oauth():
    return SpotifyOAuth(
        client_id=current_app.config.get('SPOTIFY_CLIENT_ID'),
        client_secret=current_app.config.get('SPOTIFY_CLIENT_SECRET'),
        redirect_uri=current_app.config.get('SPOTIFY_REDIRECT_URI'),
        scope="user-read-recently-played user-top-read user-read-email user-read-private playlist-read-private"
    )

@auth_bp.route('/login')
def login():
    """
    Generate the Spotify authorization URL and redirect the user
    """
    sp_oauth = get_spotify_oauth()
    auth_url = sp_oauth.get_authorize_url()
    return jsonify({'auth_url': auth_url})

@auth_bp.route('/callback')
def callback():
    """
    Handle the Spotify OAuth callback
    """
    sp_oauth = get_spotify_oauth()
    frontend_url = current_app.config.get('FRONTEND_URL')
    
    # Get the authorization code from the request
    code = request.args.get('code')
    if not code:
        return redirect(f"{frontend_url}?error=missing_code")
    
    try:
        # Exchange the code for tokens
        token_info = sp_oauth.get_access_token(code)
        access_token = token_info['access_token']
        refresh_token = token_info['refresh_token']
        
        # Create a Spotify client
        sp = spotipy.Spotify(auth=access_token)
        spotify_user = sp.me()
        
        # Check if user exists in our database
        user = User.query.filter_by(spotify_id=spotify_user['id']).first()
        
        if user:
            # Update existing user
            user.refresh_token = refresh_token
            user.last_login = datetime.utcnow()
            if spotify_user.get('email'):
                user.email = spotify_user['email']
            if spotify_user.get('display_name'):
                user.display_name = spotify_user['display_name']
        else:
            # Create new user
            user = User(
                spotify_id=spotify_user['id'],
                email=spotify_user.get('email'),
                display_name=spotify_user.get('display_name'),
                refresh_token=refresh_token
            )
            db.session.add(user)
        
        db.session.commit()
        
        # Create JWT token
        jwt_token = create_token(user.id)
        
        # Redirect to frontend with token
        return redirect(f"{frontend_url}/callback?token={jwt_token}")
        
    except Exception as e:
        print(f"Error during Spotify authentication: {str(e)}")
        return redirect(f"{frontend_url}?error=authentication_failed")

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
        
        # Get the user from the database
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Get the refresh token
        refresh_token = user.refresh_token
        
        # Set up the request to Spotify API
        sp_oauth = get_spotify_oauth()
        
        # Refresh the token
        try:
            token_info = sp_oauth.refresh_access_token(refresh_token)
            access_token = token_info['access_token']
            
            # Update the refresh token if a new one was provided
            if 'refresh_token' in token_info:
                user.refresh_token = token_info['refresh_token']
                db.session.commit()
                
            return jsonify({
                'access_token': access_token,
                'expires_in': token_info['expires_in']
            })
            
        except Exception as e:
            return jsonify({'error': f'Failed to refresh token: {str(e)}'}), 500
            
    except Exception as e:
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
            return jsonify({'valid': False, 'error': 'User not found'}), 404
            
        return jsonify({'valid': True, 'user_id': user_id})
        
    except jwt.ExpiredSignatureError:
        return jsonify({'valid': False, 'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'valid': False, 'error': 'Invalid token'}), 401

@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Log out the user (client-side only as we can't invalidate JWTs)
    """
    # JWT invalidation happens on the client side by removing the token
    # This endpoint exists for consistency and potential future server-side cleanup
    return jsonify({'success': True, 'message': 'Logged out successfully'})