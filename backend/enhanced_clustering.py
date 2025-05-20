"""
Enhanced machine learning clustering implementations for Spotify Analytics.
This module provides improved clustering algorithms that work with limited Spotify API data.
"""
import numpy as np
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from scipy.signal import argrelextrema
import re
from collections import Counter
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedPlaylistAnalysis:
    """
    Improved clustering and analysis system for Spotify playlists.
    Works around Spotify API limitations by using metadata, artist information,
    and contextual clues rather than direct audio features.
    """
    
    def __init__(self, playlist_id=None, tracks=None, playlist_name="", playlist_description=""):
        """Initialize with either playlist_id or tracks data"""
        self.playlist_id = playlist_id
        self.tracks = tracks or []
        self.playlist_name = playlist_name
        self.playlist_description = playlist_description
        self.artist_data = {}  # Will store artist information keyed by ID
        self.feature_vectors = None
        self.optimal_clusters = 4  # Default, will be calculated
        self.context_themes = None  # Will store extracted themes from playlist metadata
        
    def extract_playlist_context(self):
        """Extract semantic features from playlist name and description"""
        # Combine text
        combined_text = (self.playlist_name + " " + self.playlist_description).lower()
        
        # Basic tokenization and cleaning
        tokens = re.findall(r'\w+', combined_text)
        # Simple stopwords list (we'd use NLTK in production)
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'to', 'for', 'in', 'on', 'by', 'with'}
        tokens = [t for t in tokens if t not in stop_words]
        
        # Check for key themes
        themes = {
            'mood': ['happy', 'sad', 'chill', 'relax', 'energetic', 'calm', 'focus', 'study', 'party', 'upbeat', 'melancholy'],
            'genre': ['rock', 'pop', 'hip', 'hop', 'rap', 'jazz', 'classical', 'electronic', 'dance', 'metal', 'country', 'folk', 'indie'],
            'activity': ['workout', 'run', 'gym', 'sleep', 'drive', 'commute', 'work', 'coding', 'reading'],
            'time': ['morning', 'night', 'evening', 'weekend', 'summer', 'winter', 'spring', 'fall'],
        }
        
        context = {theme_type: [] for theme_type in themes}
        
        for token in tokens:
            for theme_type, theme_words in themes.items():
                if token in theme_words:
                    context[theme_type].append(token)
        
        self.context_themes = context
        return context
    
    def fetch_artist_data(self, sp_client):
        """Fetch artist data for all tracks in the playlist"""
        if not self.tracks:
            raise ValueError("No tracks available for analysis")
            
        # Extract all unique artist IDs
        artist_ids = set()
        for track in self.tracks:
            if not track.get('track'):
                continue
                
            for artist in track['track'].get('artists', []):
                if artist.get('id'):
                    artist_ids.add(artist['id'])
        
        # Fetch artist data in batches of 50 (Spotify API limit)
        artist_ids_list = list(artist_ids)
        
        for i in range(0, len(artist_ids_list), 50):
            batch_ids = artist_ids_list[i:i+50]
            try:
                artists_response = sp_client.artists(batch_ids)
                for artist in artists_response.get('artists', []):
                    self.artist_data[artist['id']] = artist
            except Exception as e:
                logger.error(f"Error fetching artist data: {str(e)}")
                
        logger.info(f"Fetched data for {len(self.artist_data)} artists")
        return self.artist_data
    
    def create_enhanced_feature_vectors(self):
        """Create rich feature vectors from track and artist metadata"""
        if not self.tracks:
            raise ValueError("No tracks available for analysis")
            
        # Create a genre vocabulary from all artists
        all_genres = set()
        for artist_id, artist in self.artist_data.items():
            genres = artist.get('genres', [])
            all_genres.update(genres)
            
        genre_list = sorted(list(all_genres))
        genre_index = {genre: i for i, genre in enumerate(genre_list)}
        
        # Create feature vectors
        vectors = []
        processed_tracks = []
        track_data = []
        
        for item in self.tracks:
            if not item.get('track'):
                continue
                
            track = item['track']
            
            # Skip tracks without crucial data
            if not track.get('id') or not track.get('artists') or not track.get('name'):
                continue
                
            # Basic track info for later use
            track_info = {
                'id': track['id'],
                'name': track['name'],
                'artists': [artist['name'] for artist in track.get('artists', [])],
                'primary_artist': track['artists'][0]['name'] if track.get('artists') else 'Unknown',
                'artist_id': track['artists'][0]['id'] if track.get('artists') else None,
                'album': track.get('album', {}).get('name', 'Unknown'),
                'popularity': track.get('popularity', 50),
                'added_at': item.get('added_at'),
                'release_date': track.get('album', {}).get('release_date', ''),
                'image_url': (track.get('album', {}).get('images', [{}])[0].get('url') 
                            if track.get('album', {}).get('images') else None),
                'explicit': track.get('explicit', False)
            }
            
            # Store for later
            track_data.append(track_info)
            
            # 1. Base feature vector
            vector = []
            
            # 2. Popularity feature (normalized to 0-1)
            popularity = track.get('popularity', 50) / 100.0
            vector.append(popularity)
            
            # 3. Release year feature (normalized by decade)
            release_date = track.get('album', {}).get('release_date', '')
            year_value = 0.5  # Default
            if release_date and len(release_date) >= 4:
                try:
                    year = int(release_date[:4])
                    # Normalize: 2020s = 1.0, 1950s = 0.0
                    year_value = min(1.0, max(0.0, (year - 1950) / 70.0))
                except ValueError:
                    pass
            vector.append(year_value)
            
            # 4. Explicit content feature
            vector.append(1.0 if track.get('explicit', False) else 0.0)
            
            # 5. Track number / position in album
            position_value = 0.5  # Default
            if track.get('track_number') and track.get('album') and track['album'].get('total_tracks', 0) > 0:
                position_value = min(1.0, max(0.0, track['track_number'] / track['album']['total_tracks']))
            vector.append(position_value)
            
            # 6. Artist popularity
            artist_id = track['artists'][0]['id'] if track.get('artists') else None
            artist_popularity = 0.5  # Default
            if artist_id and artist_id in self.artist_data:
                artist_popularity = self.artist_data[artist_id].get('popularity', 50) / 100.0
            vector.append(artist_popularity)
            
            # 7. Genre vector (one-hot encoding) - simplified for memory efficiency
            # We'll use a much smaller approach - just count genre occurrences for main categories
            genre_counts = {
                'rock': 0,
                'pop': 0,
                'electronic': 0,
                'hip_hop': 0,
                'jazz': 0,
                'classical': 0,
                'folk': 0,
                'country': 0
            }
            
            if artist_id and artist_id in self.artist_data:
                artist_genres = self.artist_data[artist_id].get('genres', [])
                
                for genre in artist_genres:
                    genre_lower = genre.lower()
                    if 'rock' in genre_lower:
                        genre_counts['rock'] += 1
                    if 'pop' in genre_lower:
                        genre_counts['pop'] += 1
                    if any(term in genre_lower for term in ['electronic', 'techno', 'house', 'edm']):
                        genre_counts['electronic'] += 1
                    if any(term in genre_lower for term in ['hip hop', 'rap', 'trap']):
                        genre_counts['hip_hop'] += 1
                    if 'jazz' in genre_lower:
                        genre_counts['jazz'] += 1
                    if any(term in genre_lower for term in ['classical', 'orchestra', 'piano']):
                        genre_counts['classical'] += 1
                    if any(term in genre_lower for term in ['folk', 'indie', 'acoustic']):
                        genre_counts['folk'] += 1
                    if 'country' in genre_lower:
                        genre_counts['country'] += 1
            
            # Normalize and add to vector
            for genre_count in genre_counts.values():
                vector.append(min(1.0, genre_count / 3.0))  # Cap at 1.0
            
            # 8. Added date feature (if available)
            added_value = 0.5  # Default
            if item.get('added_at'):
                # Just check if it's a recent addition (last 6 months)
                try:
                    from datetime import datetime, timedelta
                    added_date = datetime.strptime(item['added_at'].split('T')[0], '%Y-%m-%d')
                    now = datetime.utcnow()
                    days_ago = (now - added_date).days
                    # Normalize: 0 days = 1.0, 180 days = 0.0
                    added_value = min(1.0, max(0.0, 1.0 - (days_ago / 180.0)))
                except Exception:
                    pass
            vector.append(added_value)
            
            # Store the complete vector
            vectors.append(vector)
            processed_tracks.append(track_info)
            
        if not vectors:
            raise ValueError("No valid tracks for feature extraction")
            
        # Store for later use
        self.feature_vectors = np.array(vectors)
        
        return self.feature_vectors, processed_tracks, track_data
    
    def determine_optimal_clusters(self, min_clusters=2, max_clusters=8):
        """Determine optimal number of clusters using Elbow method and silhouette scores"""
        if self.feature_vectors is None or len(self.feature_vectors) < 3:
            logger.warning("Not enough feature vectors for optimal cluster detection")
            return min(3, len(self.feature_vectors))
            
        # If very few tracks, just use minimum clusters
        if len(self.feature_vectors) < 5:
            return min_clusters
            
        # For larger playlists, ensure we have at least 3-4 clusters to avoid oversized clusters
        if len(self.feature_vectors) > 20:
            min_clusters = max(3, min_clusters)
        if len(self.feature_vectors) > 50:
            min_clusters = max(4, min_clusters)
        if len(self.feature_vectors) > 100:
            min_clusters = max(5, min_clusters)
            
        # Maximum clusters shouldn't exceed number of tracks or the parameter max_clusters
        max_possible = min(len(self.feature_vectors) - 1, max_clusters)
        
        if max_possible <= min_clusters:
            return min_clusters
            
        # Apply PCA to reduce dimensionality if needed
        if self.feature_vectors.shape[1] > 10:
            pca = PCA(n_components=min(10, len(self.feature_vectors) - 1))
            X_pca = pca.fit_transform(self.feature_vectors)
        else:
            X_pca = self.feature_vectors
            
        # Normalize
        X_scaled = StandardScaler().fit_transform(X_pca)
        
        inertia_values = []
        silhouette_scores = []
        balance_scores = []  # Track cluster size balance
        
        # Try different numbers of clusters
        for n in range(min_clusters, max_possible + 1):
            try:
                kmeans = KMeans(n_clusters=n, random_state=42, n_init=10)
                labels = kmeans.fit_predict(X_scaled)
                inertia_values.append(kmeans.inertia_)
                
                # Calculate cluster balance score (higher is better)
                unique_labels, counts = np.unique(labels, return_counts=True)
                max_cluster_size = np.max(counts) / len(labels)
                
                # Heavily penalize clusters that contain more than 60% of points
                balance_penalty = 5.0 if max_cluster_size > 0.6 else 1.0
                cluster_balance = (1.0 - max_cluster_size) / balance_penalty
                balance_scores.append(cluster_balance)
                
                # Only calculate silhouette if we have enough data
                if len(X_scaled) >= n + 2:  # Need at least 2 more points than clusters
                    silhouette = silhouette_score(X_scaled, labels)
                    # Adjust silhouette score based on cluster balance
                    adjusted_silhouette = silhouette * (1.0 + cluster_balance)
                    silhouette_scores.append(adjusted_silhouette)
                else:
                    silhouette_scores.append(0)
                    
            except Exception as e:
                logger.warning(f"Error calculating clusters for n={n}: {str(e)}")
                inertia_values.append(float('inf'))
                silhouette_scores.append(0)
                balance_scores.append(0)
                
        # Find elbow using second derivative
        if len(inertia_values) > 2:
            # Compute second derivative (approximation via finite differences)
            deltas = np.diff(inertia_values)
            second_deltas = np.diff(deltas)
            
            # Find local maxima in second derivative
            local_maxima_indices = argrelextrema(np.array(second_deltas), np.greater)[0]
            
            if len(local_maxima_indices) > 0:
                elbow_idx = local_maxima_indices[0]
                elbow_n_clusters = elbow_idx + min_clusters + 1  # +1 due to double diff
                
                # Verify against silhouette score and cluster balance
                if elbow_idx < len(silhouette_scores) and silhouette_scores[elbow_idx] > 0.1:
                    # Check if this creates a balanced clustering
                    if balance_scores[elbow_idx] > 0.5:  # Reasonable balance threshold
                        self.optimal_clusters = elbow_n_clusters
                        return elbow_n_clusters
                    
        # Adjust selection to consider both silhouette and balance
        if silhouette_scores and balance_scores:
            # Combine silhouette and balance with more weight on balance
            combined_scores = [s * (1 + 2 * b) for s, b in zip(silhouette_scores, balance_scores)]
            best_idx = np.argmax(combined_scores)
            best_n_clusters = best_idx + min_clusters
            self.optimal_clusters = best_n_clusters
            return best_n_clusters
            
        # Final fallback with focus on avoiding oversized clusters
        logger.warning("Using conservative fallback for cluster count")
        playlist_size = len(self.feature_vectors)
        if playlist_size < 20:
            return 3
        elif playlist_size < 50:
            return 4
        elif playlist_size < 100:
            return 5
        else:
            return 6  # For very large playlists
    
    def perform_clustering(self, n_clusters=None):
        """Perform clustering using the optimal or specified number of clusters"""
        if self.feature_vectors is None:
            raise ValueError("Feature vectors must be created before clustering")
            
        if n_clusters is None:
            n_clusters = self.optimal_clusters
            
        # Apply PCA for dimensionality reduction
        if self.feature_vectors.shape[1] > 10:
            pca = PCA(n_components=min(10, len(self.feature_vectors) - 1))
            X_pca = pca.fit_transform(self.feature_vectors)
        else:
            X_pca = self.feature_vectors
            
        # Scale the data
        X_scaled = StandardScaler().fit_transform(X_pca)
        
        # Perform multiple clustering methods and choose the best
        clustering_results = {}
        silhouette_values = {}
        
        # 1. K-means clustering
        try:
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            kmeans_labels = kmeans.fit_predict(X_scaled)
            
            if len(set(kmeans_labels)) > 1:  # Ensure we have more than one cluster
                sil_score = silhouette_score(X_scaled, kmeans_labels)
                clustering_results['kmeans'] = kmeans_labels
                silhouette_values['kmeans'] = sil_score
        except Exception as e:
            logger.warning(f"K-means clustering failed: {str(e)}")
            
        # 2. Agglomerative clustering
        try:
            agg = AgglomerativeClustering(n_clusters=n_clusters)
            agg_labels = agg.fit_predict(X_scaled)
            
            if len(set(agg_labels)) > 1:
                sil_score = silhouette_score(X_scaled, agg_labels)
                clustering_results['agglomerative'] = agg_labels
                silhouette_values['agglomerative'] = sil_score
        except Exception as e:
            logger.warning(f"Agglomerative clustering failed: {str(e)}")
            
        # 3. DBSCAN with adaptive epsilon
        try:
            from sklearn.neighbors import NearestNeighbors
            
            # Find a good eps value
            neighbors = NearestNeighbors(n_neighbors=min(5, len(X_scaled) - 1))
            neighbors.fit(X_scaled)
            distances, _ = neighbors.kneighbors(X_scaled)
            distances = np.sort(distances[:, 1:], axis=0)
            eps = np.median(distances[:, 0])  # Use median of nearest neighbor distances
            
            dbscan = DBSCAN(eps=eps, min_samples=min(3, len(X_scaled) // 5))
            dbscan_labels = dbscan.fit_predict(X_scaled)
            
            # Check if DBSCAN produced a reasonable clustering
            # (not all points as noise or in one cluster)
            unique_labels = set(dbscan_labels)
            if len(unique_labels) > 1 and -1 not in unique_labels:
                sil_score = silhouette_score(X_scaled, dbscan_labels)
                clustering_results['dbscan'] = dbscan_labels
                silhouette_values['dbscan'] = sil_score
            elif len(unique_labels) > 1 and -1 in unique_labels:
                # Some points are classified as noise (-1)
                # For our purposes, we can keep this and treat noise as its own cluster
                # But we need to convert -1s to a valid cluster number for silhouette
                noise_free_labels = dbscan_labels.copy()
                noise_free_labels[noise_free_labels == -1] = max(unique_labels) + 1
                
                # Only calculate if we have at least 2 clusters after conversion
                if len(set(noise_free_labels)) > 1:
                    sil_score = silhouette_score(X_scaled, noise_free_labels)
                    clustering_results['dbscan'] = dbscan_labels  # Keep original with noise
                    silhouette_values['dbscan'] = sil_score
        except Exception as e:
            logger.warning(f"DBSCAN clustering failed: {str(e)}")
            
        # Choose the best clustering method
        if silhouette_values:
            best_method = max(silhouette_values, key=silhouette_values.get)
            best_labels = clustering_results[best_method]
            logger.info(f"Selected {best_method} clustering with silhouette score: {silhouette_values[best_method]:.3f}")
        else:
            # Fallback to a simple k-means if all else fails
            logger.warning("All clustering methods failed, falling back to basic K-means")
            kmeans = KMeans(n_clusters=min(n_clusters, len(X_scaled) - 1), random_state=42, n_init=10)
            best_labels = kmeans.fit_predict(X_scaled)
            
        return best_labels
    
    def generate_enhanced_audio_profile(self, cluster_tracks, style="default"):
        """Generate enhanced audio profiles based on available metadata"""
        if not cluster_tracks:
            return self._get_base_audio_profile(style)
            
        # Start with base profile
        profile = self._get_base_audio_profile(style)
        
        # Extract context from playlist metadata if we haven't already
        if self.context_themes is None:
            self.extract_playlist_context()
            
        # Adjust profile based on track metadata
        genre_counts = Counter()
        years = []
        popularities = []
        explicit_count = 0
        
        for track in cluster_tracks:
            # Collect data for later analysis
            if track.get('release_date') and len(track['release_date']) >= 4:
                try:
                    years.append(int(track['release_date'][:4]))
                except ValueError:
                    pass
                    
            popularities.append(track.get('popularity', 50))
            
            if track.get('explicit'):
                explicit_count += 1
                
            # Get artist id and check for genres
            artist_id = track.get('artist_id')
            if artist_id and artist_id in self.artist_data:
                artist = self.artist_data[artist_id]
                for genre in artist.get('genres', []):
                    genre_counts[genre] += 1
                    
        # Get most common genres
        top_genres = genre_counts.most_common(5)
        
        # Adjust profile based on genre prevalence
        for genre, count in top_genres:
            genre_lower = genre.lower()
            
            # Define genre-specific adjustments
            if 'rock' in genre_lower or 'metal' in genre_lower:
                profile['energy'] = min(1.0, profile['energy'] + 0.15 * (count / len(cluster_tracks)))
                profile['acousticness'] = max(0.0, profile['acousticness'] - 0.15 * (count / len(cluster_tracks)))
                
            elif any(g in genre_lower for g in ['classical', 'piano', 'orchestra']):
                profile['acousticness'] = min(1.0, profile['acousticness'] + 0.2 * (count / len(cluster_tracks)))
                profile['energy'] = max(0.0, profile['energy'] - 0.1 * (count / len(cluster_tracks)))
                profile['instrumentalness'] = min(1.0, profile['instrumentalness'] + 0.3 * (count / len(cluster_tracks)))
                
            elif any(g in genre_lower for g in ['electronic', 'techno', 'house', 'edm']):
                profile['danceability'] = min(1.0, profile['danceability'] + 0.15 * (count / len(cluster_tracks)))
                profile['energy'] = min(1.0, profile['energy'] + 0.1 * (count / len(cluster_tracks)))
                profile['acousticness'] = max(0.0, profile['acousticness'] - 0.2 * (count / len(cluster_tracks)))
                
            elif any(g in genre_lower for g in ['hip hop', 'rap', 'trap']):
                profile['speechiness'] = min(1.0, profile['speechiness'] + 0.2 * (count / len(cluster_tracks)))
                profile['danceability'] = min(1.0, profile['danceability'] + 0.1 * (count / len(cluster_tracks)))
                
            elif 'jazz' in genre_lower:
                profile['instrumentalness'] = min(1.0, profile['instrumentalness'] + 0.15 * (count / len(cluster_tracks)))
                profile['acousticness'] = min(1.0, profile['acousticness'] + 0.1 * (count / len(cluster_tracks)))
                
            elif any(g in genre_lower for g in ['folk', 'acoustic', 'singer-songwriter']):
                profile['acousticness'] = min(1.0, profile['acousticness'] + 0.25 * (count / len(cluster_tracks)))
                profile['energy'] = max(0.0, profile['energy'] - 0.1 * (count / len(cluster_tracks)))
                
            elif 'pop' in genre_lower:
                profile['danceability'] = min(1.0, profile['danceability'] + 0.1 * (count / len(cluster_tracks)))
                profile['valence'] = min(1.0, profile['valence'] + 0.1 * (count / len(cluster_tracks)))
                
        # Adjust based on average popularity
        if popularities:
            avg_popularity = sum(popularities) / len(popularities)
            popularity_factor = avg_popularity / 100.0  # 0-1 scale
            
            # Popular tracks tend to be more danceable, energetic, and have higher valence
            profile['danceability'] = 0.6 * profile['danceability'] + 0.4 * (0.5 + 0.3 * popularity_factor)
            profile['energy'] = 0.6 * profile['energy'] + 0.4 * (0.5 + 0.3 * popularity_factor)
            profile['valence'] = 0.6 * profile['valence'] + 0.4 * (0.5 + 0.2 * popularity_factor)
            
        # Adjust based on release year distribution
        if years:
            avg_year = sum(years) / len(years)
            
            # Set tempo based on era
            if avg_year < 1970:
                profile['tempo'] = 85 + 10 * np.random.random()
                profile['energy'] = max(0.1, min(0.8, profile['energy'] - 0.1))
            elif avg_year < 1990:
                profile['tempo'] = 95 + 15 * np.random.random()
            elif avg_year < 2010:
                profile['tempo'] = 105 + 15 * np.random.random()
            else:
                profile['tempo'] = 115 + 15 * np.random.random()
                
        # Adjust based on explicit content percentage
        if cluster_tracks:
            explicit_percentage = explicit_count / len(cluster_tracks)
            if explicit_percentage > 0.3:
                profile['speechiness'] = min(1.0, profile['speechiness'] + 0.15)
                
        # Consider playlist context themes
        if self.context_themes:
            self._adjust_profile_by_context(profile)
            
        # Add small random variations to make each profile unique
        self._add_profile_variations(profile)
        
        return profile
        
    def _adjust_profile_by_context(self, profile):
        """Adjust audio profile based on playlist context themes"""
        if not self.context_themes:
            return profile
            
        # Mood adjustments
        for mood in self.context_themes.get('mood', []):
            if mood in ['chill', 'relax']:
                profile['energy'] = max(0.1, profile['energy'] - 0.15)
                profile['tempo'] = max(70, profile['tempo'] - 15)
                
            elif mood in ['energetic', 'party', 'upbeat']:
                profile['energy'] = min(1.0, profile['energy'] + 0.15)
                profile['tempo'] = min(180, profile['tempo'] + 15)
                profile['danceability'] = min(1.0, profile['danceability'] + 0.1)
                
            elif mood in ['focus', 'study', 'concentration']:
                profile['instrumentalness'] = min(1.0, profile['instrumentalness'] + 0.2)
                profile['energy'] = max(0.2, min(0.7, profile['energy']))
                
            elif mood in ['sad', 'melancholy']:
                profile['valence'] = max(0.1, profile['valence'] - 0.2)
                profile['tempo'] = max(65, profile['tempo'] - 20)
                
            elif mood in ['happy', 'joy']:
                profile['valence'] = min(1.0, profile['valence'] + 0.2)
                
        # Activity adjustments
        for activity in self.context_themes.get('activity', []):
            if activity in ['workout', 'run', 'gym']:
                profile['energy'] = min(1.0, profile['energy'] + 0.2)
                profile['tempo'] = min(180, profile['tempo'] + 20)
                profile['valence'] = min(1.0, profile['valence'] + 0.1)
                
            elif activity in ['sleep', 'relaxation']:
                profile['energy'] = max(0.05, profile['energy'] - 0.3)
                profile['tempo'] = max(60, profile['tempo'] - 25)
                profile['acousticness'] = min(1.0, profile['acousticness'] + 0.2)
                
        return profile
    
    def _add_profile_variations(self, profile):
        """Add small random variations to make profiles unique"""
        for key in profile:
            if key == 'tempo':
                # Tempo can have larger variations
                profile[key] += np.random.uniform(-5, 5)
            else:
                # Properties in 0-1 range get smaller variations
                variation = profile[key] * np.random.uniform(-0.05, 0.05)
                profile[key] += variation
                # Keep in 0-1 range
                if key != 'tempo':
                    profile[key] = max(0.01, min(0.99, profile[key]))
                    
        return profile
    
    def _get_base_audio_profile(self, style="default"):
        """Get a base audio profile template"""
        # These profiles match your existing implementation but are more differentiated
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
        
        return profiles.get(style, profiles["default"]).copy()
    
    def create_cluster_name(self, cluster_idx, cluster_tracks):
        """Generate a meaningful name for a cluster based on its contents"""
        if not cluster_tracks:
            return f"Cluster {cluster_idx + 1}"
            
        # Count genres, artists, years
        genre_counts = Counter()
        artist_counts = Counter()
        years = []
        
        for track in cluster_tracks:
            # Get artist id and check for genres
            artist_id = track.get('artist_id')
            if artist_id and artist_id in self.artist_data:
                artist = self.artist_data[artist_id]
                for genre in artist.get('genres', []):
                    genre_counts[genre] += 1
                    
            # Count artist names
            if track.get('primary_artist'):
                artist_counts[track['primary_artist']] += 1
                
            # Extract years
            if track.get('release_date') and len(track['release_date']) >= 4:
                try:
                    years.append(int(track['release_date'][:4]))
                except ValueError:
                    pass
        
        # Try to name by top dominant genres
        if genre_counts:
            top_genres = genre_counts.most_common(5)  # Get more genres to choose from
            
            if len(top_genres) > 0:
                primary_genre = top_genres[0][0].title()
                
                # If there's only one genre or it's very dominant, use it alone
                if len(top_genres) == 1 or top_genres[0][1] > len(cluster_tracks) * 0.7:
                    return f"Cluster {cluster_idx + 1}: {primary_genre}"
                
                # Check for redundancy in genre names
                if len(top_genres) >= 2:
                    # Get second genre that's not redundant with the first
                    for genre, count in top_genres[1:]:
                        # Skip if second genre is contained in first or vice versa (e.g., "rap" in "melodic rap")
                        if genre.lower() in primary_genre.lower() or primary_genre.lower() in genre.lower():
                            continue
                            
                        # Skip if they share similar roots (rap/hip hop, etc)
                        similar_pairs = [
                            ('rap', 'hip hop'), ('electronic', 'edm'), ('rock', 'metal'),
                            ('pop', 'dance pop'), ('r&b', 'soul'), ('country', 'folk')
                        ]
                        
                        is_similar = False
                        for term1, term2 in similar_pairs:
                            if ((term1 in genre.lower() and term2 in primary_genre.lower()) or
                                (term2 in genre.lower() and term1 in primary_genre.lower())):
                                is_similar = True
                                break
                                
                        if not is_similar:
                            # Found a good second genre
                            return f"Cluster {cluster_idx + 1}: {primary_genre} & {genre.title()}"
                    
                    # If we couldn't find a good second genre, try a different approach
                    # Use an adjective based on audio characteristics
                    profile = self.generate_enhanced_audio_profile(cluster_tracks)
                    
                    if profile['energy'] > 0.7:
                        return f"Cluster {cluster_idx + 1}: Energetic {primary_genre}"
                    elif profile['energy'] < 0.3:
                        return f"Cluster {cluster_idx + 1}: Chill {primary_genre}"
                    elif profile['acousticness'] > 0.7:
                        return f"Cluster {cluster_idx + 1}: Acoustic {primary_genre}"
                    elif profile['danceability'] > 0.7:
                        return f"Cluster {cluster_idx + 1}: Danceable {primary_genre}"
                    elif profile['instrumentalness'] > 0.6:
                        return f"Cluster {cluster_idx + 1}: Instrumental {primary_genre}"
                    elif profile['valence'] > 0.7:
                        return f"Cluster {cluster_idx + 1}: Upbeat {primary_genre}"
                    elif profile['valence'] < 0.3:
                        return f"Cluster {cluster_idx + 1}: Melancholic {primary_genre}"
                    else:
                        # If nothing stands out, just use the primary genre
                        return f"Cluster {cluster_idx + 1}: {primary_genre}"
        
        # Try to name by dominant artist if they have multiple tracks
        if artist_counts:
            top_artist = artist_counts.most_common(1)[0]
            if top_artist[1] > 1 and top_artist[1] > len(cluster_tracks) * 0.3:
                return f"Cluster {cluster_idx + 1}: {top_artist[0]}'s Sound"
        
        # Try to name by decade
        if years and len(years) > len(cluster_tracks) * 0.3:
            avg_year = sum(years) / len(years)
            decade = int(avg_year) // 10 * 10
            return f"Cluster {cluster_idx + 1}: {decade}s Music"
        
        # Try to name by audio characteristics if we have multiple tracks
        if len(cluster_tracks) >= 2:
            audio_profile = self.generate_enhanced_audio_profile(cluster_tracks)
            
            if audio_profile['energy'] > 0.7:
                return f"Cluster {cluster_idx + 1}: Energetic Tracks"
            elif audio_profile['energy'] < 0.3:
                return f"Cluster {cluster_idx + 1}: Calm Tracks"
            elif audio_profile['acousticness'] > 0.7:
                return f"Cluster {cluster_idx + 1}: Acoustic Tracks"
            elif audio_profile['danceability'] > 0.7:
                return f"Cluster {cluster_idx + 1}: Danceable Tracks"
            elif audio_profile['instrumentalness'] > 0.6:
                return f"Cluster {cluster_idx + 1}: Instrumental Tracks"
            elif audio_profile['valence'] > 0.7:
                return f"Cluster {cluster_idx + 1}: Upbeat Tracks"
            elif audio_profile['valence'] < 0.3:
                return f"Cluster {cluster_idx + 1}: Melancholic Tracks"
        
        # Default fallback - add more uniqueness
        return f"Cluster {cluster_idx + 1}: Music Group {cluster_idx + 1}"
    

    def analyze_playlist(self, sp_client, max_clusters=8):
        """
        Main method to analyze a playlist with guaranteed balanced clusters
        """
        # Fetch artist data if not already done
        if not self.artist_data:
            self.fetch_artist_data(sp_client)
        
        # Create feature vectors
        feature_vectors, processed_tracks, track_data = self.create_enhanced_feature_vectors()
        
        # Extract playlist context
        self.extract_playlist_context()
        
        # Special handling for very small playlists
        if len(processed_tracks) < 4:
            logger.info(f"Playlist too small for clustering ({len(processed_tracks)} tracks), using simplified approach")
            return self._create_simplified_analysis(processed_tracks)
        
        # Determine optimal number of clusters - more conservative approach
        if not self.optimal_clusters:
            playlist_size = len(processed_tracks)
            # Force more clusters for larger playlists to prevent imbalance
            if playlist_size < 15:
                self.optimal_clusters = min(2, playlist_size - 1) if playlist_size > 1 else 1
            elif playlist_size < 30:
                self.optimal_clusters = 3
            elif playlist_size < 60:
                self.optimal_clusters = 4
            elif playlist_size < 100:
                self.optimal_clusters = 5
            else:
                self.optimal_clusters = min(6, max_clusters)
        
        n_clusters = min(self.optimal_clusters, len(processed_tracks))
        
        # Use our guaranteed balanced clustering method
        try:
            # Import sklearn here to ensure it's available
            from sklearn.cluster import KMeans
            
            # First try our standard clustering with balance checks
            cluster_labels = self.perform_clustering(n_clusters)
            
            # Check if result is balanced
            unique_labels, counts = np.unique(cluster_labels, return_counts=True)
            max_ratio = np.max(counts) / len(cluster_labels)
            
            # If still unbalanced, use our stronger balanced approach
            if max_ratio > 0.4:  # Lower threshold for stricter enforcement
                logger.warning(f"Still unbalanced clustering: {max_ratio:.2f}, using guaranteed balanced approach")
                cluster_labels = self.guaranteed_balanced_clustering(feature_vectors, n_clusters)
        except Exception as e:
            logger.error(f"Error in standard clustering: {str(e)}")
            try:
                # Fall back to guaranteed method
                cluster_labels = self.guaranteed_balanced_clustering(feature_vectors, n_clusters)
            except Exception as e2:
                logger.error(f"Guaranteed clustering also failed: {str(e2)}")
                return self._create_simplified_analysis(processed_tracks)
        
        # Organize tracks by cluster
        clusters = {}
        for i, label in enumerate(cluster_labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(processed_tracks[i])
        
        # Get unique cluster names
        unique_cluster_names = self.create_unique_cluster_names(clusters, processed_tracks)
        print(f"DEBUG: Unique cluster names: {unique_cluster_names}")
        
        # Create final result
        result = {
            "clusters": [],
            "total_tracks": len(processed_tracks),
            "analyzed_tracks": len(processed_tracks),
            "optimal_clusters": len(clusters),
            "silhouette_score": 0.5,  # Placeholder
            "method": "enhanced-balanced-clustering"
        }
        
        # Create detailed cluster data
        for cluster_idx, (label, tracks) in enumerate(clusters.items()):
            # Sort tracks by popularity for better samples
            sorted_tracks = sorted(tracks, key=lambda x: x.get('popularity', 0), reverse=True)
            
            # Create audio profile
            audio_profile = self.generate_enhanced_audio_profile(tracks)
            
            # Get the unique cluster name
            cluster_name = unique_cluster_names.get(label, f"Cluster {cluster_idx + 1}")
            print(f"DEBUG: Cluster {cluster_idx+1}: Label: {label}, Using name: '{cluster_name}'")
            
            # Create cluster object
            cluster = {
                "id": cluster_idx + 1,
                "name": cluster_name,
                "count": len(tracks),
                "percentage": round((len(tracks) / len(processed_tracks)) * 100, 1),
                "tracks": sorted_tracks[:10],  # First 10 tracks as samples
                "total_tracks": len(tracks),
                "audio_profile": audio_profile
            }
            
            result["clusters"].append(cluster)
        
        # Enhanced result with additional insights
        result["additional_insights"] = {
            "context_themes": self.context_themes,
            "cluster_genre_distributions": {},
            "playlist_year_span": self._get_year_span(processed_tracks)
        }
        
        # Add genre distribution for each cluster
        for cluster_idx, cluster in enumerate(result["clusters"]):
            cluster_tracks = clusters[cluster_idx]
            genre_counts = Counter()
            
            for track in cluster_tracks:
                artist_id = track.get('artist_id')
                if artist_id and artist_id in self.artist_data:
                    for genre in self.artist_data[artist_id].get('genres', []):
                        genre_counts[genre] += 1
                        
            # Store top genres for the cluster
            result["additional_insights"]["cluster_genre_distributions"][cluster_idx] = genre_counts.most_common(5)
            
        return result
            
    def _get_year_span(self, tracks):
        """Calculate the year span of the tracks"""
        years = []
        for track in tracks:
            if track.get('release_date') and len(track['release_date']) >= 4:
                try:
                    years.append(int(track['release_date'][:4]))
                except ValueError:
                    pass
                    
        if not years:
            return None
            
        return {
            "earliest": min(years),
            "latest": max(years),
            "span": max(years) - min(years)
        }
    

    def guaranteed_balanced_clustering(self, X, n_clusters):
        """
        Force balanced clusters using a size-constrained approach.
        This method guarantees more balanced clusters by directly enforcing size constraints.
        """
        # If very few samples, just use K-means with multiple restarts
        if len(X) < 20 or n_clusters <= 1:
            best_balance = 0
            best_labels = None
            
            for seed in range(10):  # Try different random seeds
                kmeans = KMeans(n_clusters=max(2, n_clusters), random_state=seed, n_init=10)
                labels = kmeans.fit_predict(X)
                
                # Calculate balance
                unique_labels, counts = np.unique(labels, return_counts=True)
                max_ratio = np.max(counts) / len(labels)
                balance = 1.0 - max_ratio
                
                if balance > best_balance:
                    best_balance = balance
                    best_labels = labels
            
            return best_labels
        
        # For larger datasets, use a size-constrained approach
        # Step 1: Scale the data for better distance calculations
        X_scaled = StandardScaler().fit_transform(X)
        
        # Step 2: Calculate distance matrix
        from sklearn.metrics import pairwise_distances
        distances = pairwise_distances(X_scaled)
        
        # Step 3: Initialize centroids using K-means++ strategy
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=n_clusters, n_init=10, random_state=42)
        kmeans.fit(X_scaled)
        centroids = kmeans.cluster_centers_
        
        # Step 4: Get initial distances to centroids
        centroid_distances = np.zeros((len(X_scaled), n_clusters))
        for i in range(n_clusters):
            centroid_distances[:, i] = np.sqrt(np.sum((X_scaled - centroids[i])**2, axis=1))
        
        # Step 5: Determine target cluster sizes (balanced)
        target_size = len(X_scaled) // n_clusters
        remainder = len(X_scaled) % n_clusters
        target_sizes = [target_size + 1 if i < remainder else target_size for i in range(n_clusters)]
        
        # Step 6: Assign points to clusters with size constraints
        labels = np.full(len(X_scaled), -1)
        cluster_sizes = np.zeros(n_clusters, dtype=int)
        
        # Sort points by distance to nearest centroid
        point_nearest_distances = np.min(centroid_distances, axis=1)
        point_order = np.argsort(point_nearest_distances)
        
        # First pass: assign each point to its closest centroid if there's room
        for idx in point_order:
            best_centroid = np.argmin(centroid_distances[idx])
            
            # If this cluster has room, assign point to it
            if cluster_sizes[best_centroid] < target_sizes[best_centroid]:
                labels[idx] = best_centroid
                cluster_sizes[best_centroid] += 1
            else:
                # Find the next best centroid with room
                sorted_centroids = np.argsort(centroid_distances[idx])
                for centroid in sorted_centroids:
                    if cluster_sizes[centroid] < target_sizes[centroid]:
                        labels[idx] = centroid
                        cluster_sizes[centroid] += 1
                        break
        
        # In the unlikely case that some points weren't assigned
        if -1 in labels:
            # Find clusters with room
            for idx in np.where(labels == -1)[0]:
                for j in range(n_clusters):
                    if cluster_sizes[j] < target_sizes[j]:
                        labels[idx] = j
                        cluster_sizes[j] += 1
                        break
                # If still not assigned, force into smallest cluster
                if labels[idx] == -1:
                    smallest_cluster = np.argmin(cluster_sizes)
                    labels[idx] = smallest_cluster
                    cluster_sizes[smallest_cluster] += 1
        
        # Verify we have a valid balanced clustering
        unique_labels, counts = np.unique(labels, return_counts=True)
        max_ratio = np.max(counts) / len(labels)
        
        logger.info(f"Guaranteed balanced clustering created with max ratio: {max_ratio:.2f}")
        return labels


    def create_unique_cluster_names(self, clusters, processed_tracks):
        """
        Creates unique names for all clusters, ensuring no duplicates
        Handles cases with similar genres or characteristics
        """
        print(f"DEBUG: Creating unique names for {len(clusters)} clusters")
        print(f"DEBUG: Cluster keys: {list(clusters.keys())}")

        # First, create base names
        base_names = {}
        for cluster_idx, tracks in clusters.items():
            base_names[cluster_idx] = self.create_cluster_name(cluster_idx, tracks)
        
        # Check for duplicates and add differentiators
        used_names = set()
        final_names = {}
        
        # Group clusters by base name
        name_groups = {}
        for idx, name in base_names.items():
            if name not in name_groups:
                name_groups[name] = []
            name_groups[name].append(idx)
        
        # Process each group of similar names
        for base_name, indices in name_groups.items():
            # If unique, keep it
            if len(indices) == 1:
                final_names[indices[0]] = base_name
                used_names.add(base_name)
                continue
            
            # If duplicate, find differentiators
            clusters_to_name = [(idx, clusters[idx]) for idx in indices]
            
            # Try different differentiation strategies
            self._differentiate_by_era(clusters_to_name, final_names, used_names, base_name)
            
            # If still duplicates, try by size
            remaining = [idx for idx in indices if idx not in final_names]
            if remaining:
                clusters_to_name = [(idx, clusters[idx]) for idx in remaining]
                self._differentiate_by_size(clusters_to_name, final_names, used_names, base_name)
            
            # If still duplicates, try audio characteristics
            remaining = [idx for idx in indices if idx not in final_names]
            if remaining:
                clusters_to_name = [(idx, clusters[idx]) for idx in remaining]
                self._differentiate_by_audio_profile(clusters_to_name, final_names, used_names, base_name)
            
            # Final fallback: just number them
            remaining = [idx for idx in indices if idx not in final_names]
            for i, idx in enumerate(remaining):
                fallback_name = f"{base_name} Group {i+1}"
                counter = 1
                while fallback_name in used_names:
                    counter += 1
                    fallback_name = f"{base_name} Group {counter}"
                
                final_names[idx] = fallback_name
                used_names.add(fallback_name)
        
        return final_names

    def _differentiate_by_era(self, clusters, final_names, used_names, base_name):
        """Differentiate clusters by era/years"""
        if len(clusters) <= 1:
            return
        
        # Calculate average year for each cluster
        cluster_years = {}
        for idx, tracks in clusters:
            years = []
            for track in tracks:
                if track.get('release_date') and len(track['release_date']) >= 4:
                    try:
                        years.append(int(track['release_date'][:4]))
                    except ValueError:
                        pass
            
            if years:
                avg_year = sum(years) / len(years)
                cluster_years[idx] = avg_year
        
        # If we have year data, differentiate by decade or era
        if len(cluster_years) > 1:
            # Sort clusters by year
            sorted_clusters = sorted(cluster_years.items(), key=lambda x: x[1])
            
            # Label as Classic, Modern, etc.
            if len(sorted_clusters) == 2:
                # Two clusters - use simple Classic vs Modern
                oldest_idx = sorted_clusters[0][0]
                newest_idx = sorted_clusters[1][0]
                
                oldest_name = f"{base_name} (Classic)"
                newest_name = f"{base_name} (Modern)"
                
                # Check if names are unique
                if oldest_name not in used_names:
                    final_names[oldest_idx] = oldest_name
                    used_names.add(oldest_name)
                
                if newest_name not in used_names:
                    final_names[newest_idx] = newest_name
                    used_names.add(newest_name)
            else:
                # More than two clusters - use decades or periods
                for i, (idx, year) in enumerate(sorted_clusters):
                    decade = int(year) // 10 * 10
                    decade_name = f"{base_name} ({decade}s)"
                    
                    # Try different era names if decade doesn't work
                    if decade_name in used_names:
                        if i == 0:
                            decade_name = f"{base_name} (Early)"
                        elif i == len(sorted_clusters) - 1:
                            decade_name = f"{base_name} (Recent)"
                        else:
                            decade_name = f"{base_name} (Mid-Era)"
                    
                    # If still not unique, add a qualifier
                    counter = 1
                    original_name = decade_name
                    while decade_name in used_names:
                        counter += 1
                        decade_name = f"{original_name} {counter}"
                    
                    final_names[idx] = decade_name
                    used_names.add(decade_name)

    def _differentiate_by_size(self, clusters, final_names, used_names, base_name):
        """Differentiate clusters by size"""
        if len(clusters) <= 1:
            return
        
        # Sort clusters by size
        sorted_clusters = sorted(clusters, key=lambda x: len(x[1]), reverse=True)
        
        if len(sorted_clusters) == 2:
            # Two clusters - use simple Main vs Alternative
            largest_idx = sorted_clusters[0][0]
            smallest_idx = sorted_clusters[1][0]
            
            main_name = f"{base_name} (Main)"
            alt_name = f"{base_name} (Alternative)"
            
            # Check if names are unique
            if main_name not in used_names:
                final_names[largest_idx] = main_name
                used_names.add(main_name)
            
            if alt_name not in used_names:
                final_names[smallest_idx] = alt_name
                used_names.add(alt_name)
        else:
            # More than two clusters - use size descriptors
            for i, (idx, tracks) in enumerate(sorted_clusters):
                if i == 0:
                    size_name = f"{base_name} (Primary)"
                elif i == 1:
                    size_name = f"{base_name} (Secondary)"
                else:
                    size_name = f"{base_name} ({len(tracks)} tracks)"
                
                # Ensure uniqueness
                counter = 1
                original_name = size_name
                while size_name in used_names:
                    counter += 1
                    size_name = f"{original_name} {counter}"
                
                final_names[idx] = size_name
                used_names.add(size_name)

    def _differentiate_by_audio_profile(self, clusters, final_names, used_names, base_name):
        """Differentiate clusters by audio characteristics"""
        if len(clusters) <= 1:
            return
        
        # Get audio profiles for each cluster
        for idx, tracks in clusters:
            # Skip if already named
            if idx in final_names:
                continue
                
            # Generate audio profile
            profile = self.generate_enhanced_audio_profile(tracks)
            
            # Create descriptor based on dominant characteristics
            descriptor = None
            
            # Check for distinctive characteristics
            if profile['energy'] > 0.7:
                descriptor = "Energetic"
            elif profile['energy'] < 0.4:
                descriptor = "Calm"
                
            if not descriptor:
                if profile['acousticness'] > 0.6:
                    descriptor = "Acoustic"
                elif profile['acousticness'] < 0.3:
                    descriptor = "Electronic"
                    
            if not descriptor:
                if profile['valence'] > 0.7:
                    descriptor = "Upbeat"
                elif profile['valence'] < 0.3:
                    descriptor = "Melancholic"
                    
            if not descriptor:
                if profile['danceability'] > 0.7:
                    descriptor = "Danceable"
                elif profile['instrumentalness'] > 0.5:
                    descriptor = "Instrumental"
                else:
                    # Default descriptor based on tempo
                    descriptor = "Uptempo" if profile['tempo'] > 120 else "Downtempo"
            
            # Create name with descriptor
            profile_name = f"{base_name} ({descriptor})"
            
            # Ensure uniqueness
            counter = 1
            original_name = profile_name
            while profile_name in used_names:
                counter += 1
                profile_name = f"{original_name} {counter}"
            
            final_names[idx] = profile_name
            used_names.add(profile_name)

    def _create_simplified_analysis(self, processed_tracks):
        """Create a simplified analysis for very small playlists"""
        logger.info("Creating simplified analysis for small playlist")
        
        # For tiny playlists, just create one or two clusters based on simple criteria
        clusters = []
        
        if len(processed_tracks) == 0:
            return {
                "clusters": [],
                "total_tracks": 0,
                "analyzed_tracks": 0,
                "optimal_clusters": 0,
                "method": "minimal-analysis"
            }
        
        # If only 1-3 tracks, create a single cluster
        if len(processed_tracks) <= 3:
            audio_profile = self.generate_enhanced_audio_profile(processed_tracks)
            cluster = {
                "id": 1,
                "name": "All Tracks",
                "count": len(processed_tracks),
                "percentage": 100.0,
                "tracks": processed_tracks,
                "total_tracks": len(processed_tracks),
                "audio_profile": audio_profile
            }
            clusters.append(cluster)
        else:
            # With 4+ tracks, try to create 2 clusters by some simple criteria
            # Like recent vs older tracks, or by primary artist
            
            # Try splitting by date if available
            tracks_with_dates = []
            for track in processed_tracks:
                if track.get('release_date') and len(track['release_date']) >= 4:
                    try:
                        year = int(track['release_date'][:4])
                        tracks_with_dates.append((track, year))
                    except ValueError:
                        tracks_with_dates.append((track, 0))
                else:
                    tracks_with_dates.append((track, 0))
                    
            if any(year > 0 for _, year in tracks_with_dates):
                # Sort by year
                tracks_with_dates.sort(key=lambda x: x[1], reverse=True)
                mid_point = len(tracks_with_dates) // 2
                
                recent_tracks = [t for t, _ in tracks_with_dates[:mid_point]]
                older_tracks = [t for t, _ in tracks_with_dates[mid_point:]]
                
                # Create two clusters
                recent_profile = self.generate_enhanced_audio_profile(recent_tracks)
                older_profile = self.generate_enhanced_audio_profile(older_tracks)
                
                clusters.append({
                    "id": 1,
                    "name": "Recent Tracks",
                    "count": len(recent_tracks),
                    "percentage": round(len(recent_tracks) / len(processed_tracks) * 100, 1),
                    "tracks": recent_tracks,
                    "total_tracks": len(recent_tracks),
                    "audio_profile": recent_profile
                })
                
                clusters.append({
                    "id": 2,
                    "name": "Older Tracks",
                    "count": len(older_tracks),
                    "percentage": round(len(older_tracks) / len(processed_tracks) * 100, 1),
                    "tracks": older_tracks,
                    "total_tracks": len(older_tracks),
                    "audio_profile": older_profile
                })
            else:
                # Fallback: just create one cluster
                audio_profile = self.generate_enhanced_audio_profile(processed_tracks)
                cluster = {
                    "id": 1,
                    "name": "All Tracks",
                    "count": len(processed_tracks),
                    "percentage": 100.0,
                    "tracks": processed_tracks,
                    "total_tracks": len(processed_tracks),
                    "audio_profile": audio_profile
                }
                clusters.append(cluster)
        
        # Create result structure
        result = {
            "clusters": clusters,
            "total_tracks": len(processed_tracks),
            "analyzed_tracks": len(processed_tracks),
            "optimal_clusters": len(clusters),
            "silhouette_score": 0.5,  # Placeholder
            "method": "simplified-analysis"
        }
        
        # Add basic additional insights
        result["additional_insights"] = {
            "context_themes": self.context_themes,
            "playlist_year_span": self._get_year_span(processed_tracks)
        }
        
        return result