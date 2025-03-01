from flask import Blueprint, request, jsonify, current_app
from routes.user import token_required, get_spotify_client
from models import User, Track, Artist, ListeningHistory, db
from datetime import datetime
import json

# Create Blueprint
stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/recently-played')
@token_required
def get_recently_played(current_user):
    """
    Get and store the user's recently played tracks
    """
    try:
        sp = get_spotify_client(current_user)
        recently_played = sp.current_user_recently_played(limit=50)
        
        # Process and store each track
        tracks_data = []
        for item in recently_played['items']:
            track = item['track']
            played_at = datetime.strptime(item['played_at'], '%Y-%m-%dT%H:%M:%S.%fZ')
            
            # Check if track exists in database
            db_track = Track.query.filter_by(spotify_id=track['id']).first()
            if not db_track:
                # Create new track
                db_track = Track(
                    spotify_id=track['id'],
                    name=track['name'],
                    artist=track['artists'][0]['name'],
                    album=track['album']['name'] if track['album'] else None,
                    image_url=track['album']['images'][0]['url'] if track['album'] and track['album']['images'] else None,
                    popularity=track['popularity'],
                    preview_url=track['preview_url']
                )
                db.session.add(db_track)
                db.session.flush()  # Get ID without committing
            
            # Check if this play is already recorded
            existing_play = ListeningHistory.query.filter_by(
                user_id=current_user.id,
                track_id=db_track.id,
                played_at=played_at
            ).first()
            
            if not existing_play:
                # Record the play
                history = ListeningHistory(
                    user_id=current_user.id,
                    track_id=db_track.id,
                    played_at=played_at
                )
                db.session.add(history)
            
            # Add to response data
            tracks_data.append({
                'id': track['id'],
                'name': track['name'],
                'artist': track['artists'][0]['name'],
                'album': track['album']['name'] if track['album'] else None,
                'image_url': track['album']['images'][0]['url'] if track['album'] and track['album']['images'] else None,
                'played_at': item['played_at']
            })
        
        # Commit all database changes
        db.session.commit()
        
        return jsonify({
            'items': tracks_data,
            'total': len(tracks_data)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/top-tracks')
@token_required
def get_top_tracks(current_user):
    """
    Get the user's top tracks
    """
    try:
        # Get time range from query parameters (short_term, medium_term, long_term)
        time_range = request.args.get('time_range', 'medium_term')
        limit = min(int(request.args.get('limit', 50)), 50)  # Max 50
        
        sp = get_spotify_client(current_user)
        top_tracks = sp.current_user_top_tracks(limit=limit, time_range=time_range)
        
        return jsonify({
            'items': top_tracks['items'],
            'total': top_tracks['total']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/top-artists')
@token_required
def get_top_artists(current_user):
    """
    Get the user's top artists
    """
    try:
        # Get time range from query parameters (short_term, medium_term, long_term)
        time_range = request.args.get('time_range', 'medium_term')
        limit = min(int(request.args.get('limit', 50)), 50)  # Max 50
        
        sp = get_spotify_client(current_user)
        top_artists = sp.current_user_top_artists(limit=limit, time_range=time_range)
        
        # Store artists in database
        for artist in top_artists['items']:
            db_artist = Artist.query.filter_by(spotify_id=artist['id']).first()
            if not db_artist:
                # Create new artist
                genres = ','.join(artist.get('genres', []))
                db_artist = Artist(
                    spotify_id=artist['id'],
                    name=artist['name'],
                    genres=genres,
                    popularity=artist['popularity'],
                    image_url=artist['images'][0]['url'] if artist['images'] else None
                )
                db.session.add(db_artist)
        
        db.session.commit()
        
        return jsonify({
            'items': top_artists['items'],
            'total': top_artists['total']
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/genre-distribution')
@token_required
def get_genre_distribution(current_user):
    """
    Get distribution of genres from user's top artists
    """
    try:
        # Get time range from query parameters (short_term, medium_term, long_term)
        time_range = request.args.get('time_range', 'medium_term')
        
        sp = get_spotify_client(current_user)
        top_artists = sp.current_user_top_artists(limit=50, time_range=time_range)
        
        # Count genres
        genre_counts = {}
        for artist in top_artists['items']:
            for genre in artist.get('genres', []):
                if genre in genre_counts:
                    genre_counts[genre] += 1
                else:
                    genre_counts[genre] = 1
        
        # Sort by count
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Format response
        genres_data = [{'name': genre, 'count': count} for genre, count in sorted_genres]
        
        return jsonify({
            'genres': genres_data,
            'total': len(genres_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500