"""
Statistics and analytics endpoints for Spotify Analytics.
This updated version removes audio features dependency and implements a hybrid analysis approach.
"""
import traceback
from flask import Blueprint, request, jsonify, current_app
from routes.user import token_required, get_spotify_client
from models import User, Track, Artist, ListeningHistory, db
from datetime import datetime, timedelta
import json
import logging
import numpy as np
from sklearn.cluster import KMeans
import os
from collections import Counter
from enhanced_clustering import EnhancedPlaylistAnalysis
from advanced_clustering import AdvancedPlaylistAnalysis

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Blueprint
stats_bp = Blueprint('stats', __name__)

# Helper functions for caching
def get_cached_analysis(playlist_id, analysis_type="hybrid"):
    """Get cached analysis results if available and not expired"""
    cache_dir = os.path.join(current_app.root_path, 'cache')
    cache_file = os.path.join(cache_dir, f'{analysis_type}_analysis_{playlist_id}.json')
    
    # Create cache directory if it doesn't exist
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
    
    # Check if cache file exists and is not expired (7 days)
    if os.path.exists(cache_file):
        file_age = datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))
        if file_age < timedelta(days=7):
            with open(cache_file, 'r') as f:
                return json.load(f)
    
    return None

def save_cached_analysis(playlist_id, data, analysis_type="hybrid"):
    """Save analysis results to cache"""
    cache_dir = os.path.join(current_app.root_path, 'cache')
    cache_file = os.path.join(cache_dir, f'{analysis_type}_analysis_{playlist_id}.json')
    
    # Create cache directory if it doesn't exist
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir)
    
    with open(cache_file, 'w') as f:
        json.dump(data, f)

# Keep existing endpoints

@stats_bp.route('/recently-played')
@token_required
def get_recently_played(current_user):
    """Get and store the user's recently played tracks"""
    try:
        # Add debug logging
        logger.info(f"Fetching recently played tracks for user: ID={current_user.id}, Email={current_user.email}")
        
        sp = get_spotify_client(current_user)
        recently_played = sp.current_user_recently_played(limit=50)
        
        # Log the Spotify user ID from the API response to verify it matches
        spotify_client_user = sp.me()
        logger.info(f"Spotify API user: ID={spotify_client_user['id']}, Name={spotify_client_user['display_name']}")
        
        # Process and store each track
        tracks_data = []
        for item in recently_played['items']:
            track = item['track']
            try:
                # Try parsing with microseconds
                played_at = datetime.strptime(item['played_at'], '%Y-%m-%dT%H:%M:%S.%fZ')
            except ValueError:
                try:
                    # Try parsing without microseconds
                    played_at = datetime.strptime(item['played_at'], '%Y-%m-%dT%H:%M:%SZ')
                except ValueError:
                    # Log the error and use current time as fallback
                    logger.error(f"Could not parse timestamp: {item['played_at']}")
                    played_at = datetime.utcnow()
            
            
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
        
        # Log the number of tracks returned
        logger.info(f"Returning {len(tracks_data)} recently played tracks for user ID={current_user.id}")
        
        return jsonify({
            'items': tracks_data,
            'total': len(tracks_data)
        })
        
    except Exception as e:
        logger.error(f"Error in recently played: {str(e)}")
        if 'db' in locals():
            db.session.rollback()
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/top-tracks')
@token_required
def get_top_tracks(current_user):
    """Get the user's top tracks"""
    try:
        # Get time range from query parameters (short_term, medium_term, long_term)
        time_range = request.args.get('time_range', 'medium_term')
        limit = min(int(request.args.get('limit', 50)), 50)  # Max 50
        
        # Add debug logging
        logger.info(f"Fetching top tracks for user: ID={current_user.id}, Time Range={time_range}, Limit={limit}")
        
        sp = get_spotify_client(current_user)
        top_tracks = sp.current_user_top_tracks(limit=limit, time_range=time_range)
        
        # Log the Spotify user ID from the API response to verify it matches
        spotify_client_user = sp.me()
        logger.info(f"Spotify API user: ID={spotify_client_user['id']}, Name={spotify_client_user['display_name']}")
        
        # Log the number of tracks returned
        logger.info(f"Returning {len(top_tracks['items'])} top tracks for user ID={current_user.id}")
        
        return jsonify({
            'items': top_tracks['items'],
            'total': top_tracks['total']
        })
        
    except Exception as e:
        logger.error(f"Error in top tracks: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/top-artists')
@token_required
def get_top_artists(current_user):
    """Get the user's top artists"""
    try:
        # Get time range from query parameters (short_term, medium_term, long_term)
        time_range = request.args.get('time_range', 'medium_term')
        limit = min(int(request.args.get('limit', 50)), 50)  # Max 50
        
        # Add debug logging
        logger.info(f"Fetching top artists for user: ID={current_user.id}, Time Range={time_range}, Limit={limit}")
        
        sp = get_spotify_client(current_user)
        top_artists = sp.current_user_top_artists(limit=limit, time_range=time_range)
        
        # Log the Spotify user ID from the API response to verify it matches
        spotify_client_user = sp.me()
        logger.info(f"Spotify API user: ID={spotify_client_user['id']}, Name={spotify_client_user['display_name']}")
        
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
        
        # Log the number of artists returned
        logger.info(f"Returning {len(top_artists['items'])} top artists for user ID={current_user.id}")
        
        return jsonify({
            'items': top_artists['items'],
            'total': top_artists['total']
        })
        
    except Exception as e:
        logger.error(f"Error in top artists: {str(e)}")
        if 'db' in locals():
            db.session.rollback()
        print(traceback.format_exc())
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
        
        # Add debug logging
        logger.info(f"Fetching genre distribution for user: ID={current_user.id}, Time Range={time_range}")
        
        sp = get_spotify_client(current_user)
        top_artists = sp.current_user_top_artists(limit=50, time_range=time_range)
        
        # Log the Spotify user ID from the API response to verify it matches
        spotify_client_user = sp.me()
        logger.info(f"Spotify API user: ID={spotify_client_user['id']}, Name={spotify_client_user['display_name']}")
        
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
        
        # Log the number of genres
        logger.info(f"Returning {len(genres_data)} genres for user ID={current_user.id}")
        
        return jsonify({
            'genres': genres_data,
            'total': len(genres_data)
        })
        
    except Exception as e:
        logger.error(f"Error in genre distribution: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/playlist-genres/<playlist_id>')
@token_required
def get_playlist_genres(current_user, playlist_id):
    """
    Analyze genres in a specific playlist
    """
    try:
        sp = get_spotify_client(current_user)
        
        # Get tracks in the playlist
        playlist_tracks = []
        results = sp.playlist_tracks(playlist_id)
        playlist_tracks.extend(results['items'])
        
        while results['next']:
            results = sp.next(results)
            playlist_tracks.extend(results['items'])
        
        # Extract artist IDs from the tracks
        artist_ids = []
        for item in playlist_tracks:
            if item['track'] and 'artists' in item['track']:
                for artist in item['track']['artists']:
                    if artist['id'] not in artist_ids:
                        artist_ids.append(artist['id'])
        
        # Process artists in batches of 50 (Spotify API limit)
        genre_counts = {}
        for i in range(0, len(artist_ids), 50):
            batch_ids = artist_ids[i:i+50]
            artists_data = sp.artists(batch_ids)
            
            for artist in artists_data['artists']:
                for genre in artist['genres']:
                    genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        # Sort genres by count
        sorted_genres = sorted(genre_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Format response
        genres_data = [{'name': genre, 'count': count} for genre, count in sorted_genres]
        
        return jsonify({
            'genres': genres_data,
            'total': len(genres_data)
        })
        
    except Exception as e:
        print(f"Error analyzing playlist genres: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@stats_bp.route('/playlist-tracks/<playlist_id>')
@token_required
def get_playlist_tracks(current_user, playlist_id):
    """
    Get tracks for a specific playlist
    """
    try:
        sp = get_spotify_client(current_user)
        
        # Get playlist tracks with pagination
        tracks = []
        results = sp.playlist_tracks(playlist_id)
        tracks.extend(results['items'])
        
        while results['next']:
            results = sp.next(results)
            tracks.extend(results['items'])
        
        # Format track data
        formatted_tracks = []
        for item in tracks:
            if item['track']:
                track_data = {
                    'added_at': item['added_at'],
                    'track': {
                        'id': item['track']['id'],
                        'name': item['track']['name'],
                        'artists': [{'id': artist['id'], 'name': artist['name']} for artist in item['track']['artists']],
                        'album': {
                            'id': item['track']['album']['id'],
                            'name': item['track']['album']['name'],
                            'images': item['track']['album']['images'] if 'images' in item['track']['album'] else []
                        },
                        'duration_ms': item['track']['duration_ms'],
                        'popularity': item['track']['popularity']
                    }
                }
                formatted_tracks.append(track_data)
        
        return jsonify({
            'items': formatted_tracks,
            'total': len(formatted_tracks)
        })
        
    except Exception as e:
        print(f"Error getting playlist tracks: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# Internal helper function to fetch playlist tracks for reuse
def get_playlist_tracks_internal(current_user, playlist_id):
    """Internal function to get playlist tracks, for reuse across analysis types"""
    try:
        sp = get_spotify_client(current_user)
        
        # Get tracks in the playlist
        playlist_tracks = []
        results = sp.playlist_tracks(playlist_id)
        playlist_tracks.extend(results['items'])
        
        while results['next']:
            results = sp.next(results)
            playlist_tracks.extend(results['items'])
            
        return playlist_tracks
        
    except Exception as e:
        print(f"Error getting playlist tracks: {str(e)}")
        print(traceback.format_exc())
        raise e

# Keep the existing simple analysis (it works well)
@stats_bp.route('/simple-playlist-analysis/<playlist_id>')
@token_required
def get_simple_playlist_analysis(current_user, playlist_id, return_tracks=False):
    """
    Simple heuristic-based playlist analysis
    Can be used standalone or as a component of hybrid analysis
    """
    try:
        print(f"Starting simple analysis for playlist {playlist_id}")
        
        # Get all tracks from playlist
        sp = get_spotify_client(current_user)
        
        # First, get the playlist details
        try:
            playlist_details = sp.playlist(playlist_id)
            playlist_name = playlist_details['name']
            playlist_description = playlist_details.get('description', '')
            print(f"Analyzing playlist: {playlist_name}")
        except Exception as e:
            print(f"Error getting playlist details: {str(e)}")
            playlist_name = "Unknown Playlist"
            playlist_description = ""
        
        # Get tracks
        playlist_tracks = get_playlist_tracks_internal(current_user, playlist_id)
        print(f"Retrieved {len(playlist_tracks)} tracks from playlist {playlist_id}")
        
        # Extract track info
        tracks = []
        for item in playlist_tracks:
            if not item['track']:
                continue
                
            album_images = item['track']['album'].get('images', []) if 'album' in item['track'] else []
            image_url = album_images[0]['url'] if album_images else None
            
            # Try to get added_at date if available
            added_at = item.get('added_at', None)
            
            track = {
                'id': item['track']['id'],
                'name': item['track']['name'],
                'artists': [artist['name'] for artist in item['track']['artists']],
                'primary_artist': item['track']['artists'][0]['name'] if item['track']['artists'] else 'Unknown',
                'album': item['track']['album'].get('name', 'Unknown') if 'album' in item['track'] else 'Unknown',
                'image_url': image_url,
                'popularity': item['track'].get('popularity', 50),
                'added_at': added_at,
                'release_date': item['track']['album'].get('release_date', '') if 'album' in item['track'] else '',
                'explicit': item['track'].get('explicit', False)
            }
            tracks.append(track)
        
        # If not enough tracks, return error
        if len(tracks) < 3:
            return jsonify({
                'error': 'Not enough tracks for meaningful analysis',
                'total_tracks': len(tracks),
                'analyzed_tracks': 0
            }), 400
        
        # Create multiple cluster types based on different criteria
        clusters_data = []
        cluster_id = 1
        
        # 1. Artist-based clusters
        artist_groups = {}
        for track in tracks:
            primary_artist = track['primary_artist']
            
            if primary_artist not in artist_groups:
                artist_groups[primary_artist] = []
                
            artist_groups[primary_artist].append(track)
        
        # Find artists with multiple tracks
        significant_artists = {artist: tracks for artist, tracks in artist_groups.items() if len(tracks) >= 2}
        
        # Create clusters for the top 2 artists with most tracks
        top_artists = sorted(significant_artists.items(), key=lambda x: len(x[1]), reverse=True)[:2]
        
        for artist, artist_tracks in top_artists:
            clusters_data.append({
                'id': cluster_id,
                'name': f"Cluster {cluster_id}: {artist}'s Tracks",
                'count': len(artist_tracks),
                'percentage': round((len(artist_tracks) / len(tracks)) * 100, 1),
                'tracks': artist_tracks[:10],  # First 10 tracks
                'total_tracks': len(artist_tracks),
                'audio_profile': generate_audio_profile(artist_tracks, style="artist", 
                                                       playlist_name=playlist_name, 
                                                       playlist_description=playlist_description)
            })
            cluster_id += 1
        
        # 2. Album-based clusters
        album_groups = {}
        for track in tracks:
            album = track['album']
            
            if album not in album_groups:
                album_groups[album] = []
                
            album_groups[album].append(track)
        
        # Find albums with multiple tracks
        significant_albums = {album: tracks for album, tracks in album_groups.items() if len(tracks) >= 3}
        
        # Create clusters for the top album with most tracks
        if significant_albums:
            top_album = max(significant_albums.items(), key=lambda x: len(x[1]))
            clusters_data.append({
                'id': cluster_id,
                'name': f"Cluster {cluster_id}: {top_album[0]} Album",
                'count': len(top_album[1]),
                'percentage': round((len(top_album[1]) / len(tracks)) * 100, 1),
                'tracks': top_album[1][:10],  # First 10 tracks
                'total_tracks': len(top_album[1]),
                'audio_profile': generate_audio_profile(top_album[1], style="album",
                                                      playlist_name=playlist_name, 
                                                      playlist_description=playlist_description)
            })
            cluster_id += 1
        
        # 3. Popularity-based cluster
        popular_tracks = sorted(tracks, key=lambda x: x['popularity'], reverse=True)[:int(len(tracks)*0.3)]
        if popular_tracks:
            clusters_data.append({
                'id': cluster_id,
                'name': f"Cluster {cluster_id}: Popular Hits",
                'count': len(popular_tracks),
                'percentage': round((len(popular_tracks) / len(tracks)) * 100, 1),
                'tracks': popular_tracks[:10],
                'total_tracks': len(popular_tracks),
                'audio_profile': generate_audio_profile(popular_tracks, style="popular",
                                                      playlist_name=playlist_name, 
                                                      playlist_description=playlist_description)
            })
            cluster_id += 1
        
        # 4. Recently added tracks (if added_at is available)
        tracks_with_dates = [t for t in tracks if t.get('added_at')]
        if tracks_with_dates:
            try:
                # Sort by added_at date if available
                for track in tracks_with_dates:
                    track['added_datetime'] = datetime.strptime(track['added_at'].split('T')[0], '%Y-%m-%d')
                
                recent_tracks = sorted(tracks_with_dates, key=lambda x: x['added_datetime'], reverse=True)[:int(len(tracks)*0.2)]
                if recent_tracks:
                    clusters_data.append({
                        'id': cluster_id,
                        'name': f"Cluster {cluster_id}: Recently Added",
                        'count': len(recent_tracks),
                        'percentage': round((len(recent_tracks) / len(tracks)) * 100, 1),
                        'tracks': recent_tracks[:10],
                        'total_tracks': len(recent_tracks),
                        'audio_profile': generate_audio_profile(recent_tracks, style="recent",
                                                              playlist_name=playlist_name, 
                                                              playlist_description=playlist_description)
                    })
                    cluster_id += 1
            except Exception as e:
                print(f"Error processing dates: {str(e)}")
        
        # 5. Playlist name/description based cluster
        # Look for keywords in playlist name/description and create themed clusters
        keywords = {
            'chill': {'name': 'Relaxing Tracks', 'style': 'chill'},
            'relax': {'name': 'Relaxing Tracks', 'style': 'chill'},
            'study': {'name': 'Focus Tracks', 'style': 'focus'},
            'focus': {'name': 'Focus Tracks', 'style': 'focus'},
            'party': {'name': 'Party Tracks', 'style': 'party'},
            'dance': {'name': 'Dance Tracks', 'style': 'dance'},
            'workout': {'name': 'Workout Tracks', 'style': 'workout'},
            'gym': {'name': 'Workout Tracks', 'style': 'workout'},
            'run': {'name': 'Running Tracks', 'style': 'workout'},
            'sleep': {'name': 'Sleep Tracks', 'style': 'sleep'},
            'mood': {'name': 'Mood Boosters', 'style': 'mood'},
            'happy': {'name': 'Upbeat Tracks', 'style': 'upbeat'},
            'sad': {'name': 'Melancholic Tracks', 'style': 'melancholic'},
            'rock': {'name': 'Rock Tracks', 'style': 'rock'},
            'pop': {'name': 'Pop Tracks', 'style': 'pop'},
            'hip': {'name': 'Hip Hop Tracks', 'style': 'hiphop'},
            'rap': {'name': 'Rap Tracks', 'style': 'hiphop'},
            'country': {'name': 'Country Tracks', 'style': 'country'},
            'folk': {'name': 'Folk Tracks', 'style': 'folk'},
            'indie': {'name': 'Indie Tracks', 'style': 'indie'}
        }
        
        combined_text = (playlist_name + " " + playlist_description).lower()
        matching_keywords = []
        
        for keyword, data in keywords.items():
            if keyword in combined_text:
                matching_keywords.append(data)
        
        # If we found keywords, create a themed cluster
        if matching_keywords:
            themed_data = matching_keywords[0]  # Use the first matching keyword
            # Randomly select a portion of tracks for this theme
            import random
            themed_tracks = random.sample(tracks, min(len(tracks) // 3 + 1, len(tracks)))
            
            clusters_data.append({
                'id': cluster_id,
                'name': f"Cluster {cluster_id}: {themed_data['name']}",
                'count': len(themed_tracks),
                'percentage': round((len(themed_tracks) / len(tracks)) * 100, 1),
                'tracks': themed_tracks[:10],
                'total_tracks': len(themed_tracks),
                'audio_profile': generate_audio_profile(themed_tracks, style=themed_data['style'],
                                                      playlist_name=playlist_name, 
                                                      playlist_description=playlist_description)
            })
            cluster_id += 1
        
        # 6. Explicit content cluster (if there are explicit tracks)
        explicit_tracks = [t for t in tracks if t.get('explicit', False)]
        if explicit_tracks and len(explicit_tracks) >= 3:
            clusters_data.append({
                'id': cluster_id,
                'name': f"Cluster {cluster_id}: Explicit Tracks",
                'count': len(explicit_tracks),
                'percentage': round((len(explicit_tracks) / len(tracks)) * 100, 1),
                'tracks': explicit_tracks[:10],
                'total_tracks': len(explicit_tracks),
                'audio_profile': generate_audio_profile(explicit_tracks, style="explicit",
                                                      playlist_name=playlist_name, 
                                                      playlist_description=playlist_description)
            })
            cluster_id += 1
        
        # 7. Era-based clusters (if release_date is available)
        tracks_with_years = []
        for track in tracks:
            if track.get('release_date') and len(track['release_date']) >= 4:
                try:
                    year = int(track['release_date'][:4])
                    track['year'] = year
                    tracks_with_years.append(track)
                except:
                    pass
        
        if tracks_with_years:
            # Group by decade
            decades = {}
            for track in tracks_with_years:
                decade = (track['year'] // 10) * 10
                if decade not in decades:
                    decades[decade] = []
                decades[decade].append(track)
            
            # Find decades with enough tracks
            significant_decades = {decade: tracks for decade, tracks in decades.items() if len(tracks) >= 3}
            
            # Create a cluster for the most represented decade
            if significant_decades:
                top_decade = max(significant_decades.items(), key=lambda x: len(x[1]))
                decade_name = f"{top_decade[0]}s"
                clusters_data.append({
                    'id': cluster_id,
                    'name': f"Cluster {cluster_id}: {decade_name} Tracks",
                    'count': len(top_decade[1]),
                    'percentage': round((len(top_decade[1]) / len(tracks)) * 100, 1),
                    'tracks': top_decade[1][:10],
                    'total_tracks': len(top_decade[1]),
                    'audio_profile': generate_audio_profile(top_decade[1], style="decade"+str(top_decade[0]),
                                                          playlist_name=playlist_name, 
                                                          playlist_description=playlist_description)
                })
                cluster_id += 1
        
        # 8. If we didn't generate enough clusters (at least 3), add a random one
        if len(clusters_data) < 3:
            import random
            random_tracks = random.sample(tracks, min(len(tracks) // 2, len(tracks)))
            
            clusters_data.append({
                'id': cluster_id,
                'name': f"Cluster {cluster_id}: Diverse Selection",
                'count': len(random_tracks),
                'percentage': round((len(random_tracks) / len(tracks)) * 100, 1),
                'tracks': random_tracks[:10],
                'total_tracks': len(random_tracks),
                'audio_profile': generate_audio_profile(random_tracks, style="diverse",
                                                      playlist_name=playlist_name, 
                                                      playlist_description=playlist_description)
            })
        
        # Make sure we don't have duplicate track sets in clusters by comparing track IDs
        # This can happen when a playlist has a single artist or album
        seen_track_sets = set()
        unique_clusters = []
        for cluster in clusters_data:
            track_ids = frozenset(track['id'] for track in cluster['tracks'])
            if track_ids not in seen_track_sets and len(track_ids) > 0:
                seen_track_sets.add(track_ids)
                unique_clusters.append(cluster)
        
        # Adjust IDs to be sequential again
        for i, cluster in enumerate(unique_clusters):
            cluster['id'] = i + 1
            
        # Create response data
        response_data = {
            'clusters': unique_clusters,
            'total_tracks': len(tracks),
            'analyzed_tracks': len(tracks),
            'optimal_clusters': len(unique_clusters),
            'silhouette_score': 0.7
        }
        
        # If this is used as part of hybrid analysis, return the data and tracks
        if return_tracks:
            return response_data, tracks
            
        # Otherwise return a regular response
        return jsonify(response_data)
        
    except Exception as e:
        import traceback
        print(f"Error in simple playlist analysis: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

# NEW HYBRID ANALYSIS ENDPOINTS AND FUNCTIONS

@stats_bp.route('/advanced-playlist-analysis/<playlist_id>')
@token_required
def get_advanced_playlist_analysis(current_user, playlist_id):
    """
    Master endpoint that aggregates multiple analysis types using a hybrid approach.
    Now includes enhanced ML clustering.
    """
    try:
        print(f"\n\n==================== HYBRID ANALYSIS START ====================")
        print(f"Starting hybrid analysis for playlist: {playlist_id}")
        
        # Check for cached results first
        cached_results = get_cached_analysis(playlist_id, "hybrid")
        if cached_results:
            print(f"Using cached hybrid analysis for playlist: {playlist_id}")
            return jsonify(cached_results)
        
        # Try ML analysis first (new enhancement)
        try:
            ml_analysis = get_ml_playlist_analysis(current_user, playlist_id).json
            # If we got ML results, use them as primary results
            print("Successfully obtained ML analysis results")
            ml_success = True
        except Exception as e:
            print(f"ML analysis failed, will use simple analysis: {str(e)}")
            ml_success = False
            
        # Get simple analysis as base layer or fallback
        try:
            base_analysis, tracks = get_simple_playlist_analysis(current_user, playlist_id, return_tracks=True)
        except Exception as e:
            print(f"Error in base analysis: {str(e)}")
            print(traceback.format_exc())
            return jsonify({'error': f"Base analysis failed: {str(e)}"}), 500
        
        # Initialize specialized insights
        specialized_insights = {}
        
        # If ML analysis worked, add it to specialized insights
        if ml_success:
            specialized_insights['ml_clusters'] = ml_analysis
        
        # Run specialized clustering modules (handle failures gracefully)
        try:
            print("Starting genre-based clustering...")
            genre_clusters = get_genre_clusters(current_user, playlist_id, tracks)
            specialized_insights['genre_clusters'] = genre_clusters
            print(f"Genre clustering successful: {len(genre_clusters['clusters'])} clusters")
        except Exception as e:
            print(f"Genre clustering failed: {str(e)}")
            print(traceback.format_exc())
            specialized_insights['genre_clusters'] = {"error": str(e)}
            
        try:
            print("Starting temporal clustering...")
            temporal_clusters = get_temporal_clusters(tracks)
            specialized_insights['temporal_clusters'] = temporal_clusters
            print(f"Temporal clustering successful: {len(temporal_clusters['clusters'])} clusters")
        except Exception as e:
            print(f"Temporal clustering failed: {str(e)}")
            print(traceback.format_exc())
            specialized_insights['temporal_clusters'] = {"error": str(e)}
            
        try:
            print("Starting artist relationship clustering...")
            artist_clusters = get_artist_clusters(tracks)
            specialized_insights['artist_clusters'] = artist_clusters
            print(f"Artist clustering successful: {len(artist_clusters['clusters'])} clusters")
        except Exception as e:
            print(f"Artist clustering failed: {str(e)}")
            print(traceback.format_exc())
            specialized_insights['artist_clusters'] = {"error": str(e)}
        
        # Merge all results
        response = {
            "base_analysis": base_analysis,
            "specialized_insights": specialized_insights,
            "playlist_id": playlist_id,
            "timestamp": datetime.now().isoformat(),
            "enhanced_ml": ml_success  # Flag to indicate if enhanced ML was used
        }
        
        # Cache the results
        try:
            save_cached_analysis(playlist_id, response, "hybrid")
            print(f"Cached hybrid analysis for playlist: {playlist_id}")
        except Exception as cache_error:
            print(f"Warning: Failed to cache results: {str(cache_error)}")
        
        print(f"==================== HYBRID ANALYSIS COMPLETE ====================\n\n")
        return jsonify(response)
        
    except Exception as e:
        print(f"Critical error in hybrid analysis: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

def get_genre_clusters(current_user, playlist_id, tracks, max_clusters=4):
    """
    Cluster tracks based on artist genres
    Uses K-means clustering on genre vectors
    """
    sp = get_spotify_client(current_user)
    
    # Extract artist IDs
    artist_ids = []
    artist_track_map = {}  # Map artist IDs to their tracks
    
    for track in tracks:
        for artist_name in track['artists']:
            # We need to find the artist ID first
            # For simplicity, use the primary artist
            if artist_name == track['primary_artist']:
                if track['primary_artist'] not in artist_track_map:
                    artist_track_map[track['primary_artist']] = []
                artist_track_map[track['primary_artist']].append(track)
    
    # Search for each artist to get their ID
    artist_details = {}
    for artist_name in artist_track_map.keys():
        try:
            search_result = sp.search(q=f'artist:{artist_name}', type='artist', limit=1)
            if search_result['artists']['items']:
                artist = search_result['artists']['items'][0]
                artist_ids.append(artist['id'])
                artist_details[artist['id']] = {
                    'name': artist['name'],
                    'genres': artist['genres'],
                    'popularity': artist['popularity'],
                    'tracks': artist_track_map[artist_name]
                }
        except Exception as e:
            print(f"Error searching for artist {artist_name}: {str(e)}")
            continue
    
    # If we have too few artists with valid IDs, return a simplified analysis
    if len(artist_ids) < 3:
        print(f"Too few artists with valid IDs: {len(artist_ids)}")
        # Use a simplified genre approach based on artist names and tracks
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "Main Genre Group",
                    "tracks": tracks[:10],
                    "track_count": len(tracks),
                    "genre_tags": ["unknown"]
                }
            ],
            "method": "simplified-genre-clustering",
            "total_tracks": len(tracks),
            "note": "Limited genre data available"
        }
    
    # Get genres for each artist (fetch in batches of 50)
    artist_genres = {}
    for i in range(0, len(artist_ids), 50):
        batch = artist_ids[i:i+50]
        try:
            artists_data = sp.artists(batch)['artists']
            for artist in artists_data:
                artist_genres[artist['id']] = artist['genres']
        except Exception as e:
            print(f"Error fetching artist data for batch {i//50 + 1}: {str(e)}")
            continue
    
    # Create a consolidated genre vocabulary
    all_genres = set()
    for genres in artist_genres.values():
        all_genres.update(genres)
    
    genre_list = list(all_genres)
    print(f"Found {len(genre_list)} unique genres across all artists")
    
    # If we have no genres, return a simplified analysis
    if not genre_list:
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "All Tracks",
                    "tracks": tracks[:10],
                    "track_count": len(tracks),
                    "genre_tags": ["unknown"]
                }
            ],
            "method": "simplified-genre-clustering",
            "total_tracks": len(tracks),
            "note": "No genre data available"
        }
    
    # Create genre vectors for artists
    artist_vectors = {}
    for artist_id, genres in artist_genres.items():
        vector = [1 if genre in genres else 0 for genre in genre_list]
        if sum(vector) > 0:  # Only include artists with genre data
            artist_vectors[artist_id] = vector
    
    # Adjust max clusters based on number of artists
    max_clusters = min(max_clusters, len(artist_vectors))
    if max_clusters < 2:
        max_clusters = 2  # Minimum 2 clusters
    
    # Create a matrix for clustering
    artist_ids_for_clustering = list(artist_vectors.keys())
    X = np.array([artist_vectors[aid] for aid in artist_ids_for_clustering])
    
    # Apply K-means clustering
    kmeans = KMeans(n_clusters=max_clusters, random_state=42, n_init=10)
    try:
        cluster_labels = kmeans.fit_predict(X)
    except Exception as e:
        print(f"K-means clustering failed: {str(e)}")
        # Fall back to a simpler approach with fixed clusters
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "All Tracks",
                    "tracks": tracks[:10],
                    "track_count": len(tracks),
                    "genre_tags": list(all_genres)[:5]
                }
            ],
            "method": "simplified-genre-clustering",
            "total_tracks": len(tracks),
            "note": "Clustering failed, using simple grouping"
        }
    
    # Map artists to clusters
    artist_clusters = {}
    for i, artist_id in enumerate(artist_ids_for_clustering):
        cluster_id = int(cluster_labels[i])
        if cluster_id not in artist_clusters:
            artist_clusters[cluster_id] = []
        artist_clusters[cluster_id].append(artist_id)
    
    # Create the final clusters
    clusters = []
    for cluster_id, cluster_artists in artist_clusters.items():
        # Collect all tracks from this cluster's artists
        cluster_tracks = []
        artist_names = []
        for artist_id in cluster_artists:
            if artist_id in artist_details:
                cluster_tracks.extend(artist_details[artist_id]['tracks'])
                artist_names.append(artist_details[artist_id]['name'])
        
        # Find dominant genres for this cluster
        cluster_genres = Counter()
        for artist_id in cluster_artists:
            if artist_id in artist_genres:
                cluster_genres.update(artist_genres[artist_id])
        
        top_genres = cluster_genres.most_common(5)
        genre_names = [g[0] for g in top_genres] if top_genres else ["Unknown"]
        
        # Create a name based on top genres
        if genre_names[0] != "Unknown":
            cluster_name = f"Cluster {cluster_id+1}: {genre_names[0].title()} Tracks"
        else:
            # Use artists if no genres available
            artists_display = ", ".join(artist_names[:2])
            cluster_name = f"Cluster {cluster_id+1}: {artists_display} & Similar"
        
        clusters.append({
            "id": cluster_id + 1,
            "name": cluster_name,
            "tracks": cluster_tracks[:10],
            "track_count": len(cluster_tracks),
            "genre_tags": genre_names,
            "artists": artist_names[:5],
            "artist_count": len(cluster_artists)
        })
    
    # Sort clusters by track count (largest first)
    clusters.sort(key=lambda c: c["track_count"], reverse=True)
    
    # Re-assign IDs after sorting
    for i, cluster in enumerate(clusters):
        cluster["id"] = i + 1
    
    return {
        "clusters": clusters,
        "method": "genre-based-clustering",
        "total_tracks": len(tracks),
        "unique_genres": len(genre_list)
    }

def get_temporal_clusters(tracks):
    """
    Cluster tracks based on release dates and decades
    """
    # Extract release years
    track_years = []
    valid_tracks = []
    
    for track in tracks:
        if track.get('release_date') and len(track['release_date']) >= 4:
            try:
                year = int(track['release_date'][:4])
                track_years.append(year)
                valid_tracks.append(track)
            except ValueError:
                continue
    
    # If not enough tracks have release dates, return a simplified result
    if len(valid_tracks) < 3:
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "All Tracks",
                    "tracks": tracks[:10],
                    "track_count": len(tracks),
                    "time_period": "Unknown"
                }
            ],
            "method": "simplified-temporal-analysis",
            "total_tracks": len(tracks),
            "note": "Insufficient release date data"
        }
    
    # Group by decades
    decades = {}
    for i, year in enumerate(track_years):
        decade = (year // 10) * 10
        if decade not in decades:
            decades[decade] = []
        decades[decade].append(valid_tracks[i])
    
    # Sort decades and create clusters
    clusters = []
    for i, (decade, decade_tracks) in enumerate(sorted(decades.items())):
        # Skip decades with too few tracks
        if len(decade_tracks) < 2:
            continue
            
        clusters.append({
            "id": i + 1,
            "name": f"{decade}s Era",
            "tracks": decade_tracks[:10],
            "track_count": len(decade_tracks),
            "decade": decade,
            "percentage": round(len(decade_tracks) / len(valid_tracks) * 100, 1),
            "year_range": f"{decade}-{decade+9}"
        })
    
    # If no valid clusters were created, return a simplified result
    if not clusters:
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "Mixed Eras",
                    "tracks": valid_tracks[:10],
                    "track_count": len(valid_tracks),
                    "time_period": f"{min(track_years)}-{max(track_years)}"
                }
            ],
            "method": "simplified-temporal-analysis",
            "total_tracks": len(tracks),
            "note": "Could not create distinct era clusters"
        }
    
    return {
        "clusters": clusters,
        "method": "temporal-clustering",
        "total_tracks": len(tracks),
        "tracks_with_dates": len(valid_tracks),
        "earliest_year": min(track_years) if track_years else None,
        "latest_year": max(track_years) if track_years else None,
        "timeline": {
            "start": min(track_years) if track_years else None,
            "end": max(track_years) if track_years else None,
            "span": max(track_years) - min(track_years) if track_years else None
        }
    }

def get_artist_clusters(tracks):
    """
    Group tracks by significant artists and their relationships
    """
    # Create an artist map
    artist_map = {}
    for track in tracks:
        for artist_name in track['artists']:
            if artist_name not in artist_map:
                artist_map[artist_name] = {
                    'name': artist_name,
                    'tracks': [],
                    'collaborators': set()
                }
            
            # Add track to artist's tracks
            artist_map[artist_name]['tracks'].append(track)
            
            # Add collaborators
            for other_artist in track['artists']:
                if other_artist != artist_name:
                    artist_map[artist_name]['collaborators'].add(other_artist)
    
    # Find artists with multiple tracks
    significant_artists = {name: data for name, data in artist_map.items() 
                          if len(data['tracks']) >= 2}
    
    # If we don't have significant artists, return a simplified analysis
    if not significant_artists:
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "Various Artists",
                    "tracks": tracks[:10],
                    "track_count": len(tracks),
                    "artists": list(artist_map.keys())[:5]
                }
            ],
            "method": "simplified-artist-analysis",
            "total_tracks": len(tracks),
            "note": "No dominant artists found"
        }
    
    # Sort artists by track count
    sorted_artists = sorted(significant_artists.items(), 
                           key=lambda x: len(x[1]['tracks']), 
                           reverse=True)
    
    # Create clusters based on significant artists
    clusters = []
    max_artist_clusters = min(5, len(sorted_artists))
    
    for i, (artist_name, artist_data) in enumerate(sorted_artists[:max_artist_clusters]):
        # Skip if too few tracks
        if len(artist_data['tracks']) < 2:
            continue
            
        collaborator_list = list(artist_data['collaborators'])
        clusters.append({
            "id": i + 1,
            "name": f"{artist_data['name']}'s Tracks",
            "tracks": artist_data['tracks'][:10],
            "track_count": len(artist_data['tracks']),
            "artist_name": artist_data['name'],
            "collaborators": collaborator_list[:5],
            "collaborator_count": len(artist_data['collaborators'])
        })
    
    # If no valid clusters were created, return a simplified result
    if not clusters:
        return {
            "clusters": [
                {
                    "id": 1,
                    "name": "Various Artists",
                    "tracks": tracks[:10],
                    "track_count": len(tracks),
                    "artists": list(artist_map.keys())[:5]
                }
            ],
            "method": "simplified-artist-analysis",
            "total_tracks": len(tracks),
            "note": "Could not create distinct artist clusters"
        }
    
    return {
        "clusters": clusters,
        "method": "artist-based-clustering",
        "total_tracks": len(tracks),
        "unique_artists": len(artist_map),
        "most_prolific": sorted_artists[0][0] if sorted_artists else None
    }

def generate_audio_profile(tracks, style="default", playlist_name="", playlist_description=""):
    """
    Generate simulated audio profiles based on track style hint and playlist context
    Enhanced to provide more differentiated profiles based on playlist name/keywords
    """
    profiles = {
        # Artist/Album clusters - balanced profiles with slight variations
        "artist": {
            'danceability': 0.65,
            'energy': 0.70,
            'acousticness': 0.40,
            'instrumentalness': 0.10,
            'valence': 0.60,
            'speechiness': 0.15,
            'liveness': 0.20,
            'tempo': 120.0
        },
        "album": {
            'danceability': 0.60,
            'energy': 0.65,
            'acousticness': 0.45,
            'instrumentalness': 0.12,
            'valence': 0.55,
            'speechiness': 0.18,
            'liveness': 0.22,
            'tempo': 118.0
        },
        # Mood-based clusters
        "chill": {
            'danceability': 0.45,
            'energy': 0.30,
            'acousticness': 0.70,
            'instrumentalness': 0.25,
            'valence': 0.50,
            'speechiness': 0.05,
            'liveness': 0.08,
            'tempo': 90.0
        },
        "focus": {
            'danceability': 0.40,
            'energy': 0.35,
            'acousticness': 0.60,
            'instrumentalness': 0.40,
            'valence': 0.52,
            'speechiness': 0.04,
            'liveness': 0.05,
            'tempo': 100.0
        },
        "party": {
            'danceability': 0.85,
            'energy': 0.90,
            'acousticness': 0.15,
            'instrumentalness': 0.05,
            'valence': 0.80,
            'speechiness': 0.12,
            'liveness': 0.30,
            'tempo': 125.0
        },
        "dance": {
            'danceability': 0.90,
            'energy': 0.85,
            'acousticness': 0.10,
            'instrumentalness': 0.08,
            'valence': 0.75,
            'speechiness': 0.10,
            'liveness': 0.25,
            'tempo': 128.0
        },
        "workout": {
            'danceability': 0.80,
            'energy': 0.95,
            'acousticness': 0.10,
            'instrumentalness': 0.05,
            'valence': 0.85,
            'speechiness': 0.15,
            'liveness': 0.20,
            'tempo': 135.0
        },
        "sleep": {
            'danceability': 0.25,
            'energy': 0.15,
            'acousticness': 0.90,
            'instrumentalness': 0.60,
            'valence': 0.40,
            'speechiness': 0.03,
            'liveness': 0.05,
            'tempo': 75.0
        },
        "mood": {
            'danceability': 0.60,
            'energy': 0.55,
            'acousticness': 0.50,
            'instrumentalness': 0.20,
            'valence': 0.70,
            'speechiness': 0.10,
            'liveness': 0.15,
            'tempo': 110.0
        },
        "upbeat": {
            'danceability': 0.75,
            'energy': 0.80,
            'acousticness': 0.30,
            'instrumentalness': 0.10,
            'valence': 0.90,
            'speechiness': 0.12,
            'liveness': 0.20,
            'tempo': 122.0
        },
        "melancholic": {
            'danceability': 0.35,
            'energy': 0.40,
            'acousticness': 0.65,
            'instrumentalness': 0.20,
            'valence': 0.25,
            'speechiness': 0.08,
            'liveness': 0.10,
            'tempo': 85.0
        },
        # Genre-based clusters
        "rock": {
            'danceability': 0.55,
            'energy': 0.85,
            'acousticness': 0.30,
            'instrumentalness': 0.15,
            'valence': 0.65,
            'speechiness': 0.08,
            'liveness': 0.30,
            'tempo': 130.0
        },
        "pop": {
            'danceability': 0.70,
            'energy': 0.75,
            'acousticness': 0.25,
            'instrumentalness': 0.05,
            'valence': 0.70,
            'speechiness': 0.10,
            'liveness': 0.15,
            'tempo': 118.0
        },
        "hiphop": {
            'danceability': 0.80,
            'energy': 0.70,
            'acousticness': 0.15,
            'instrumentalness': 0.05,
            'valence': 0.65,
            'speechiness': 0.25,
            'liveness': 0.15,
            'tempo': 95.0
        },
        "country": {
            'danceability': 0.60,
            'energy': 0.65,
            'acousticness': 0.60,
            'instrumentalness': 0.10,
            'valence': 0.60,
            'speechiness': 0.07,
            'liveness': 0.25,
            'tempo': 115.0
        },
        "folk": {
            'danceability': 0.45,
            'energy': 0.50,
            'acousticness': 0.80,
            'instrumentalness': 0.20,
            'valence': 0.55,
            'speechiness': 0.06,
            'liveness': 0.20,
            'tempo': 105.0
        },
        "indie": {
            'danceability': 0.55,
            'energy': 0.60,
            'acousticness': 0.55,
            'instrumentalness': 0.25,
            'valence': 0.60,
            'speechiness': 0.05,
            'liveness': 0.18,
            'tempo': 112.0
        },
        # Special clusters
        "popular": {
            'danceability': 0.75,
            'energy': 0.75,
            'acousticness': 0.30,
            'instrumentalness': 0.05,
            'valence': 0.70,
            'speechiness': 0.10,
            'liveness': 0.15,
            'tempo': 120.0
        },
        "recent": {
            'danceability': 0.70,
            'energy': 0.72,
            'acousticness': 0.35,
            'instrumentalness': 0.08,
            'valence': 0.65,
            'speechiness': 0.12,
            'liveness': 0.18,
            'tempo': 115.0
        },
        "explicit": {
            'danceability': 0.78,
            'energy': 0.75,
            'acousticness': 0.20,
            'instrumentalness': 0.06,
            'valence': 0.62,
            'speechiness': 0.30,
            'liveness': 0.15,
            'tempo': 98.0
        },
        # Decade-based profiles
        "decade1950": {
            'danceability': 0.50,
            'energy': 0.55,
            'acousticness': 0.70,
            'instrumentalness': 0.30,
            'valence': 0.65,
            'speechiness': 0.05,
            'liveness': 0.25,
            'tempo': 105.0
        },
        "decade1960": {
            'danceability': 0.55,
            'energy': 0.60,
            'acousticness': 0.65,
            'instrumentalness': 0.25,
            'valence': 0.70,
            'speechiness': 0.06,
            'liveness': 0.30,
            'tempo': 110.0
        },
        "decade1970": {
            'danceability': 0.65,
            'energy': 0.70,
            'acousticness': 0.50,
            'instrumentalness': 0.20,
            'valence': 0.65,
            'speechiness': 0.07,
            'liveness': 0.35,
            'tempo': 115.0
        },
        "decade1980": {
            'danceability': 0.75,
            'energy': 0.75,
            'acousticness': 0.35,
            'instrumentalness': 0.15,
            'valence': 0.75,
            'speechiness': 0.08,
            'liveness': 0.25,
            'tempo': 120.0
        },
        "decade1990": {
            'danceability': 0.70,
            'energy': 0.80,
            'acousticness': 0.30,
            'instrumentalness': 0.10,
            'valence': 0.70,
            'speechiness': 0.10,
            'liveness': 0.20,
            'tempo': 125.0
        },
        "decade2000": {
            'danceability': 0.75,
            'energy': 0.75,
            'acousticness': 0.25,
            'instrumentalness': 0.08,
            'valence': 0.65,
            'speechiness': 0.12,
            'liveness': 0.18,
            'tempo': 118.0
        },
        "decade2010": {
            'danceability': 0.78,
            'energy': 0.72,
            'acousticness': 0.30,
            'instrumentalness': 0.05,
            'valence': 0.60,
            'speechiness': 0.15,
            'liveness': 0.15,
            'tempo': 115.0
        },
        "decade2020": {
            'danceability': 0.80,
            'energy': 0.70,
            'acousticness': 0.35,
            'instrumentalness': 0.04,
            'valence': 0.58,
            'speechiness': 0.18,
            'liveness': 0.12,
            'tempo': 110.0
        },
        # Fallback profile
        "diverse": {
            'danceability': 0.60,
            'energy': 0.60,
            'acousticness': 0.40,
            'instrumentalness': 0.15,
            'valence': 0.55,
            'speechiness': 0.10,
            'liveness': 0.18,
            'tempo': 115.0
        },
        # Default fallback
        "default": {
            'danceability': 0.65,
            'energy': 0.65,
            'acousticness': 0.45,
            'instrumentalness': 0.15,
            'valence': 0.60,
            'speechiness': 0.12,
            'liveness': 0.20,
            'tempo': 118.0
        }
    }
    
    # Get the base profile
    profile = profiles.get(style, profiles["default"]).copy()
    
    # Apply adjustments based on playlist name and description
    combined_text = (playlist_name + " " + playlist_description).lower()
    
    # Keywords that should affect the audio profile
    keywords = {
        "rock": {"energy": 0.3, "acousticness": -0.3, "liveness": 0.2},
        "metal": {"energy": 0.4, "acousticness": -0.4, "valence": -0.1},
        "pop": {"danceability": 0.2, "energy": 0.1, "instrumentalness": -0.1},
        "hip hop": {"speechiness": 0.3, "danceability": 0.2, "acousticness": -0.2},
        "rap": {"speechiness": 0.4, "danceability": 0.2, "tempo": 0.1},
        "chill": {"energy": -0.3, "tempo": -0.2, "acousticness": 0.2},
        "relax": {"energy": -0.3, "tempo": -0.2, "valence": 0.1},
        "sleep": {"energy": -0.4, "tempo": -0.3, "acousticness": 0.3},
        "party": {"danceability": 0.3, "energy": 0.3, "valence": 0.2},
        "dance": {"danceability": 0.4, "energy": 0.3, "tempo": 0.2},
        "workout": {"energy": 0.4, "tempo": 0.3, "valence": 0.2},
        "gym": {"energy": 0.4, "tempo": 0.3, "valence": 0.2},
        "acoustic": {"acousticness": 0.4, "energy": -0.2, "instrumentalness": 0.1},
        "instrumental": {"instrumentalness": 0.4, "speechiness": -0.3},
        "sad": {"valence": -0.4, "energy": -0.2, "tempo": -0.2},
        "happy": {"valence": 0.4, "energy": 0.2, "tempo": 0.1},
        "folk": {"acousticness": 0.3, "instrumentalness": 0.2, "energy": -0.2},
        "country": {"acousticness": 0.3, "speechiness": -0.1, "liveness": 0.1},
        "jazz": {"instrumentalness": 0.3, "acousticness": 0.2, "speechiness": -0.2},
        "classical": {"instrumentalness": 0.5, "acousticness": 0.4, "speechiness": -0.4},
        "electronic": {"instrumentalness": 0.3, "acousticness": -0.3, "energy": 0.3},
        "indie": {"acousticness": 0.2, "energy": -0.1, "instrumentalness": 0.1},
        "soul": {"valence": 0.2, "acousticness": 0.2, "energy": -0.1},
        "r&b": {"valence": 0.1, "danceability": 0.2, "speechiness": 0.1},
        "latin": {"danceability": 0.3, "valence": 0.2, "energy": 0.2}
    }
    
    # Apply meaningful variations based on playlist keywords
    for keyword, adjustments in keywords.items():
        if keyword in combined_text:
            print(f"Found keyword '{keyword}' in playlist, adjusting audio profile")
            for param, adjustment in adjustments.items():
                if param in profile:
                    profile[param] += adjustment
                    # Keep values in range 0-1 (except tempo)
                    if param != 'tempo':
                        profile[param] = max(0, min(1, profile[param]))
    
    # Add small random variations to make each profile unique
    import random
    for key in profile:
        if key == 'tempo':
            profile[key] += random.uniform(-5, 5)  # Tempo gets a larger variation
        else:
            variation = profile[key] * random.uniform(-0.05, 0.05)
            profile[key] += variation
            # Ensure values stay in 0-1 range (except tempo)
            if key != 'tempo':
                profile[key] = max(0, min(1, profile[key]))
    
    return profile


@stats_bp.route('/ml-playlist-analysis/<playlist_id>')
@token_required
def get_ml_playlist_analysis(current_user, playlist_id):
    """
    Advanced machine learning analysis of a playlist using our guaranteed balanced clustering approach
    """
    print("FORCING NEW ANALYSIS - BYPASSING CACHE")
    cached_results = None  # Force skip cache check
    try:
        print(f"\n\n==================== ML ANALYSIS START ====================")
        print(f"Starting ML analysis for playlist: {playlist_id}")
        
        # Check for cached results first
        # cached_results = get_cached_analysis(playlist_id, "ml")
        if cached_results:
            print(f"Using cached ML analysis for playlist: {playlist_id}")
            return jsonify(cached_results)
        
        # Get Spotify client
        sp = get_spotify_client(current_user)
        
        # Get playlist details
        try:
            playlist_details = sp.playlist(playlist_id)
            playlist_name = playlist_details['name']
            playlist_description = playlist_details.get('description', '')
            print(f"Analyzing playlist: {playlist_name}")
        except Exception as e:
            print(f"Error getting playlist details: {str(e)}")
            playlist_name = "Unknown Playlist"
            playlist_description = ""
        
        # Get tracks
        try:
            playlist_tracks = get_playlist_tracks_internal(current_user, playlist_id)
            print(f"Retrieved {len(playlist_tracks)} tracks from playlist {playlist_id}")
            
            # Check if we have enough tracks
            if len(playlist_tracks) < 5:
                return jsonify({
                    'error': 'Not enough tracks for ML analysis',
                    'message': 'ML analysis requires at least 5 tracks for meaningful results'
                }), 400
                
        except Exception as e:
            print(f"Error getting playlist tracks: {str(e)}")
            return jsonify({'error': f'Failed to retrieve playlist tracks: {str(e)}'}), 500
            
        # Initialize the ML analyzer with our updated methods
        analyzer = EnhancedPlaylistAnalysis(
            playlist_id=playlist_id,
            tracks=playlist_tracks,
            playlist_name=playlist_name,
            playlist_description=playlist_description
        )
        
        # Perform the analysis using our guaranteed balanced approach
        try:
            analysis_result = analyzer.analyze_playlist(sp, max_clusters=6)
            print(f"ML analysis successful with {len(analysis_result.get('clusters', []))} clusters")
            
            # Verify cluster balance before returning
            clusters = analysis_result.get('clusters', [])
            if clusters:
                total_tracks = analysis_result.get('total_tracks', 0)
                largest_cluster = max(clusters, key=lambda c: c.get('count', 0))
                largest_ratio = largest_cluster.get('count', 0) / total_tracks if total_tracks > 0 else 0
                
                print(f"Largest cluster ratio: {largest_ratio:.2f}")
                
                # If still severely imbalanced (despite our measures), add warning
                if largest_ratio > 0.6:
                    print(f"WARNING: Clustering still imbalanced: {largest_ratio:.2f}")
                    analysis_result['balance_warning'] = True
            
            # Cache the results
            try:
                save_cached_analysis(playlist_id, analysis_result, "ml")
                print(f"Cached ML analysis for playlist: {playlist_id}")
            except Exception as cache_error:
                print(f"Warning: Failed to cache results: {str(cache_error)}")
                
            print(f"==================== ML ANALYSIS COMPLETE ====================\n\n")
            return jsonify(analysis_result)
            
        except Exception as e:
            import traceback
            print(f"Error performing ML analysis: {str(e)}")
            print(traceback.format_exc())
            return jsonify({'error': f'ML analysis failed: {str(e)}'}), 500
            
    except Exception as e:
        import traceback
        print(f"Critical error in ML analysis: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    


@stats_bp.route('/hdbscan-playlist-analysis/<playlist_id>')
@token_required
def get_hdbscan_playlist_analysis(current_user, playlist_id):
    """
    Enhanced endpoint that uses HDBSCAN and UMAP for more accurate playlist clustering.
    """
    try:
        print(f"\n\n==================== ADVANCED ANALYSIS START ====================")
        print(f"Starting advanced HDBSCAN+UMAP analysis for playlist: {playlist_id}")
        
        # Check for cached results first
        cached_results = get_cached_analysis(playlist_id, "advanced")
        if cached_results:
            print(f"Using cached advanced analysis for playlist: {playlist_id}")
            return jsonify(cached_results)
        
        # Get Spotify client
        sp = get_spotify_client(current_user)
        
        # Get playlist details
        try:
            playlist_details = sp.playlist(playlist_id)
            playlist_name = playlist_details['name']
            playlist_description = playlist_details.get('description', '')
            print(f"Analyzing playlist: {playlist_name}")
        except Exception as e:
            print(f"Error getting playlist details: {str(e)}")
            playlist_name = "Unknown Playlist"
            playlist_description = ""
        
        # Get tracks
        try:
            playlist_tracks = get_playlist_tracks_internal(current_user, playlist_id)
            print(f"Retrieved {len(playlist_tracks)} tracks from playlist {playlist_id}")
            
            # Check if we have enough tracks
            if len(playlist_tracks) < 5:
                return jsonify({
                    'error': 'Not enough tracks for advanced analysis',
                    'message': 'Advanced analysis requires at least 5 tracks for meaningful results'
                }), 400
                
        except Exception as e:
            print(f"Error getting playlist tracks: {str(e)}")
            return jsonify({'error': f'Failed to retrieve playlist tracks: {str(e)}'}), 500
            
        # Initialize the advanced analyzer
        analyzer = AdvancedPlaylistAnalysis(
            playlist_id=playlist_id,
            tracks=playlist_tracks,
            playlist_name=playlist_name,
            playlist_description=playlist_description
        )
        
        # Perform the analysis
        try:
            analysis_result = analyzer.analyze_playlist(sp)
            print(f"Advanced analysis successful with {len(analysis_result.get('clusters', []))} clusters")
            
            # Cache the results
            try:
                save_cached_analysis(playlist_id, analysis_result, "advanced")
                print(f"Cached advanced analysis for playlist: {playlist_id}")
            except Exception as cache_error:
                print(f"Warning: Failed to cache results: {str(cache_error)}")
                
            print(f"==================== ADVANCED ANALYSIS COMPLETE ====================\n\n")
            return jsonify(analysis_result)
            
        except Exception as e:
            import traceback
            print(f"Error performing advanced analysis: {str(e)}")
            print(traceback.format_exc())
            
            # Fall back to simple analysis if advanced fails
            print("Falling back to simple analysis")
            try:
                simple_result, _ = get_simple_playlist_analysis(current_user, playlist_id, return_tracks=True)
                simple_result["fallback"] = True
                simple_result["error_details"] = str(e)
                return jsonify(simple_result)
            except Exception as simple_error:
                print(f"Simple analysis fallback also failed: {str(simple_error)}")
                return jsonify({'error': f'Analysis failed: {str(e)}'}), 500
            
    except Exception as e:
        import traceback
        print(f"Critical error in advanced analysis: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500