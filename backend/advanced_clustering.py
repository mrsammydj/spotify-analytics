"""
Advanced clustering implementation for Spotify Analytics using HDBSCAN and UMAP.
This module provides improved, density-based clustering algorithms that work with limited Spotify API data.
"""
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.mixture import GaussianMixture
import umap
import hdbscan
import logging
from collections import Counter, defaultdict
import re
import pandas as pd
from scipy import stats
from datetime import datetime
import traceback

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AdvancedPlaylistAnalysis:
    """
    Enhanced clustering and analysis system for Spotify playlists.
    Uses density-based clustering (HDBSCAN) and dimensionality reduction (UMAP)
    to identify patterns in playlist data without relying on audio features.
    """
    
    def __init__(self, playlist_id=None, tracks=None, playlist_name="", playlist_description=""):
        """Initialize with either playlist_id or tracks data"""
        self.playlist_id = playlist_id
        self.tracks = tracks or []
        self.playlist_name = playlist_name
        self.playlist_description = playlist_description
        self.artist_data = {}  # Will store artist information keyed by ID
        self.feature_vectors = None
        self.optimal_clusters = None  # Will be determined automatically
        self.umap_embedding = None
        self.context_themes = None  # Will store extracted themes from playlist metadata
        self.cluster_profiles = {}  # Will store automatically generated audio profiles
        
    def extract_playlist_context(self):
        """Extract semantic features from playlist name and description using NLP techniques"""
        # Combine text
        combined_text = (self.playlist_name + " " + self.playlist_description).lower()
        
        # Basic tokenization and cleaning
        tokens = re.findall(r'\w+', combined_text)
        # Simple stopwords list
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'to', 'for', 'in', 'on', 'by', 'with', 'of', 'this'}
        tokens = [t for t in tokens if t not in stop_words]
        
        # Check for key themes with expanded vocabulary
        themes = {
            'mood': [
                'happy', 'sad', 'chill', 'relax', 'energetic', 'calm', 'focus', 'study', 'party', 'upbeat', 'melancholy',
                'mellow', 'peaceful', 'aggressive', 'angry', 'emotional', 'dark', 'light', 'dreamy', 'intense', 'nostalgic',
                'uplifting', 'somber', 'reflective', 'contemplative', 'cheerful', 'gloomy', 'atmospheric', 'vibrant'
            ],
            'genre': [
                'rock', 'pop', 'hip', 'hop', 'rap', 'jazz', 'classical', 'electronic', 'dance', 'metal', 'country', 
                'folk', 'indie', 'soul', 'funk', 'blues', 'r&b', 'reggae', 'disco', 'punk', 'grunge', 'techno', 'house',
                'ambient', 'trap', 'edm', 'alternative', 'lo-fi', 'instrumental', 'vocal', 'acoustic', 'experimental'
            ],
            'activity': [
                'workout', 'run', 'gym', 'sleep', 'drive', 'commute', 'work', 'coding', 'reading', 'cooking', 'cleaning',
                'gaming', 'meditation', 'yoga', 'walking', 'hiking', 'biking', 'swimming', 'dinner', 'party', 'concentration',
                'relaxation', 'travel', 'road', 'trip', 'background', 'focus', 'productivity', 'motivation', 'inspiration',
                'dancing', 'exercising', 'cardio', 'strength'
            ],
            'time': [
                'morning', 'night', 'evening', 'weekend', 'summer', 'winter', 'spring', 'fall', 'autumn', 'holiday',
                'christmas', 'halloween', 'new', 'year', 'season', 'daily', 'weekly', 'monthly', 'yearly', 'dawn',
                'dusk', 'afternoon', 'midnight', 'sunrise', 'sunset'
            ],
            'decade': [
                '50s', '60s', '70s', '80s', '90s', '00s', '10s', '20s', 'fifties', 'sixties', 'seventies', 'eighties',
                'nineties', 'aughts', 'tens', 'twenties', 'retro', 'vintage', 'classic', 'modern', 'contemporary',
                'oldies', 'throwback'
            ]
        }
        
        context = {theme_type: [] for theme_type in themes}
        
        for token in tokens:
            for theme_type, theme_words in themes.items():
                if token in theme_words:
                    context[theme_type].append(token)
        
        # Also look for bigrams and trigrams for more context
        if len(tokens) > 1:
            bigrams = [' '.join(tokens[i:i+2]) for i in range(len(tokens)-1)]
            for bigram in bigrams:
                for theme_type, theme_words in themes.items():
                    if bigram in theme_words:
                        context[theme_type].append(bigram)
        
        self.context_themes = context
        logger.info(f"Extracted context themes: {context}")
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
        """
        Create rich feature vectors from track and artist metadata
        with expanded feature set and improved normalization
        """
        if not self.tracks:
            raise ValueError("No tracks available for analysis")
            
        # Create a genre vocabulary from all artists
        all_genres = set()
        for artist_id, artist in self.artist_data.items():
            genres = artist.get('genres', [])
            all_genres.update(genres)
            
        genre_list = sorted(list(all_genres))
        genre_index = {genre: i for i, genre in enumerate(genre_list)}
        
        # Track features we'll extract
        features = {
            'popularity': [],
            'release_year': [],
            'explicit': [],
            'track_position': [],
            'artist_popularity': [],
            'genre_rock': [],
            'genre_pop': [],
            'genre_electronic': [],
            'genre_hip_hop': [],
            'genre_jazz': [],
            'genre_classical': [],
            'genre_folk': [],
            'genre_country': [],
            'added_recency': [],
            'album_popularity': [],
            'artist_followers': [],
            'track_duration': []
        }
        
        # Create feature vectors
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
                'explicit': track.get('explicit', False),
                'duration_ms': track.get('duration_ms', 0)
            }
            
            # Store for later
            track_data.append(track_info)
            
            # Extract Features
            
            # 1. Popularity feature (normalized to 0-1)
            features['popularity'].append(track.get('popularity', 50) / 100.0)
            
            # 2. Release year feature (normalized by decade)
            release_date = track.get('album', {}).get('release_date', '')
            year_value = 0.5  # Default
            year = None
            if release_date and len(release_date) >= 4:
                try:
                    year = int(release_date[:4])
                    # Will be normalized later using z-score
                    features['release_year'].append(year)
                except ValueError:
                    features['release_year'].append(None)
            else:
                features['release_year'].append(None)
            
            # 3. Explicit content feature
            features['explicit'].append(1.0 if track.get('explicit', False) else 0.0)
            
            # 4. Track number / position in album
            position_value = 0.5  # Default
            if track.get('track_number') and track.get('album') and track['album'].get('total_tracks', 0) > 0:
                position_value = track['track_number'] / track['album']['total_tracks']
            features['track_position'].append(position_value)
            
            # 5. Artist popularity
            artist_id = track['artists'][0]['id'] if track.get('artists') else None
            artist_popularity = 0.5  # Default
            if artist_id and artist_id in self.artist_data:
                artist_popularity = self.artist_data[artist_id].get('popularity', 50) / 100.0
            features['artist_popularity'].append(artist_popularity)
            
            # 6. Artist followers (normalized)
            artist_followers = 0.0  # Default
            if artist_id and artist_id in self.artist_data:
                followers = self.artist_data[artist_id].get('followers', {}).get('total', 0)
                # Store raw value, will normalize later
                artist_followers = followers
            features['artist_followers'].append(artist_followers)
            
            # 7. Genre vector (simplified approach)
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
            
            # Add genre features
            for genre, count in genre_counts.items():
                features[f'genre_{genre}'].append(min(1.0, count / 3.0))  # Cap at 1.0
            
            # 8. Added date feature (recency)
            added_value = 0.5  # Default
            if item.get('added_at'):
                # Check how recently it was added
                try:
                    added_date = datetime.strptime(item['added_at'].split('T')[0], '%Y-%m-%d')
                    now = datetime.utcnow()
                    days_ago = (now - added_date).days
                    # Store raw days for later normalization
                    added_value = days_ago
                except Exception:
                    added_value = None
            else:
                added_value = None
            features['added_recency'].append(added_value)
            
            # 9. Album popularity approximation
            # Since we don't have direct album popularity, use average of other tracks
            album_name = track.get('album', {}).get('name', '')
            album_tracks_popularity = []
            for other_item in self.tracks:
                if not other_item.get('track'):
                    continue
                other_track = other_item['track']
                if other_track.get('album', {}).get('name', '') == album_name:
                    album_tracks_popularity.append(other_track.get('popularity', 50))
            
            album_popularity = 0.5  # Default
            if album_tracks_popularity:
                album_popularity = sum(album_tracks_popularity) / (len(album_tracks_popularity) * 100.0)
            features['album_popularity'].append(album_popularity)
            
            # 10. Track duration
            duration_ms = track.get('duration_ms', 0)
            features['track_duration'].append(duration_ms)
            
            # Store the track for processing
            processed_tracks.append(track_info)
            
        if not processed_tracks:
            raise ValueError("No valid tracks for feature extraction")
            
        # Convert to DataFrame for easier processing
        df = pd.DataFrame(features)
        
        # Handle missing values
        for col in df.columns:
            if df[col].isnull().any():
                # Replace with median for numeric columns
                if df[col].dtype.kind in 'fcib':  # float, complex, integer, boolean
                    median_val = df[col].median()
                    df[col].fillna(median_val, inplace=True)
                else:
                    # For non-numeric columns, fill with mode
                    mode_val = df[col].mode()[0] if not df[col].mode().empty else 0
                    df[col].fillna(mode_val, inplace=True)
        
        # Normalize numeric columns that need it
        for col in ['release_year', 'artist_followers', 'added_recency', 'track_duration']:
            if df[col].std() > 0:
                df[col] = (df[col] - df[col].mean()) / df[col].std()
            else:
                df[col] = 0  # If no variation, set to constant
        
        # Convert to numpy array
        self.feature_vectors = df.to_numpy()
        
        logger.info(f"Created feature vectors with shape: {self.feature_vectors.shape}")
        return self.feature_vectors, processed_tracks, track_data
    
    def perform_umap_reduction(self):
        """Apply UMAP to reduce dimensionality of feature vectors for better clustering"""
        if self.feature_vectors is None:
            raise ValueError("Feature vectors must be created before UMAP reduction")
        
        # Standardize the data
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(self.feature_vectors)
        
        # Determine appropriate UMAP parameters based on dataset size
        n_samples = len(X_scaled)
        
        if n_samples < 10:
            # Very small dataset, use PCA instead
            logger.warning("Dataset too small for UMAP, using PCA instead")
            pca = PCA(n_components=2)
            self.umap_embedding = pca.fit_transform(X_scaled)
            return self.umap_embedding
            
        # Adjust parameters based on dataset size
        if n_samples < 50:
            # Small dataset
            n_neighbors = max(3, n_samples // 2)
            min_dist = 0.1
        elif n_samples < 200:
            # Medium dataset
            n_neighbors = max(5, n_samples // 10)
            min_dist = 0.1
        else:
            # Large dataset
            n_neighbors = 15
            min_dist = 0.1
            
        # Apply UMAP
        try:
            reducer = umap.UMAP(
                n_neighbors=n_neighbors,
                min_dist=min_dist,
                n_components=2,
                metric='euclidean',
                random_state=42
            )
            self.umap_embedding = reducer.fit_transform(X_scaled)
            logger.info(f"UMAP reduction successful, output shape: {self.umap_embedding.shape}")
            return self.umap_embedding
        except Exception as e:
            logger.error(f"UMAP reduction failed: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Fall back to PCA
            logger.info("Falling back to PCA for dimensionality reduction")
            pca = PCA(n_components=2)
            self.umap_embedding = pca.fit_transform(X_scaled)
            return self.umap_embedding
    
    def perform_hdbscan_clustering(self):
        """
        Perform HDBSCAN clustering on the UMAP embedding
        with adaptive parameters based on dataset characteristics
        """
        if self.umap_embedding is None:
            raise ValueError("UMAP embedding must be created before clustering")
        
        n_samples = len(self.umap_embedding)
        
        # Return simple clustering for tiny datasets
        if n_samples < 5:
            logger.warning("Dataset too small for meaningful clustering, using single cluster")
            return np.zeros(n_samples, dtype=int)
            
        # Adjust parameters based on dataset size and density
        if n_samples < 20:
            min_cluster_size = 2
            min_samples = 1
        elif n_samples < 50:
            min_cluster_size = 3
            min_samples = 2
        elif n_samples < 100:
            min_cluster_size = 5
            min_samples = 3
        else:
            min_cluster_size = 10
            min_samples = 5
            
        # Analyze embedding density to further adjust parameters
        from scipy.spatial.distance import pdist, squareform
        
        # Calculate pairwise distances between points
        distances = pdist(self.umap_embedding)
        dist_matrix = squareform(distances)
        
        # Calculate average distance to k nearest neighbors
        k = min(5, n_samples - 1)
        sorted_distances = np.sort(dist_matrix, axis=1)
        avg_knn_distance = np.mean(sorted_distances[:, 1:k+1])
        
        # Adjust clustering parameters based on density
        if avg_knn_distance < 0.5:
            # Dense embedding
            cluster_selection_epsilon = 0.05
            cluster_selection_method = 'eom'  # Excess of Mass
        elif avg_knn_distance < 1.0:
            # Medium density
            cluster_selection_epsilon = 0.1
            cluster_selection_method = 'eom'
        else:
            # Sparse embedding
            cluster_selection_epsilon = 0.2
            cluster_selection_method = 'leaf'  # Leaf clustering
            
        # Set a maximum number of clusters based on dataset size
        max_clusters = max(2, min(n_samples // 5, 10))
            
        # Apply HDBSCAN with adaptive parameters
        try:
            logger.info(f"Running HDBSCAN with min_cluster_size={min_cluster_size}, min_samples={min_samples}")
            
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=min_cluster_size,
                min_samples=min_samples,
                cluster_selection_epsilon=cluster_selection_epsilon,
                cluster_selection_method=cluster_selection_method,
                metric='euclidean',
                gen_min_span_tree=True,
                prediction_data=True
            )
            
            cluster_labels = clusterer.fit_predict(self.umap_embedding)
            
            # Count noise points (-1 label)
            n_noise = np.sum(cluster_labels == -1)
            noise_ratio = n_noise / n_samples
            
            logger.info(f"HDBSCAN clustering found {len(np.unique(cluster_labels))} clusters with {n_noise} noise points ({noise_ratio:.2f} ratio)")
            
            # Check if too many noise points or too many clusters
            if noise_ratio > 0.4 or len(np.unique(cluster_labels)) > max_clusters:
                logger.warning(f"HDBSCAN produced too many noise points ({noise_ratio:.2f}) or too many clusters ({len(np.unique(cluster_labels))}), trying GMM")
                return self.perform_gmm_clustering(max_clusters)
            
            # If all points classified as noise, retry with different parameters
            if np.all(cluster_labels == -1):
                logger.warning("All points classified as noise, retrying with more relaxed parameters")
                
                clusterer = hdbscan.HDBSCAN(
                    min_cluster_size=2,
                    min_samples=1,
                    cluster_selection_epsilon=0.5,
                    metric='euclidean'
                )
                
                cluster_labels = clusterer.fit_predict(self.umap_embedding)
                
                # If still all noise, fall back to GMM
                if np.all(cluster_labels == -1):
                    logger.warning("Still all noise points, falling back to GMM")
                    return self.perform_gmm_clustering(max_clusters)
                    
            # Store probabilities for soft clustering
            self.cluster_probabilities = clusterer.probabilities_
            
            # Relabel noise points to their most likely cluster
            if n_noise > 0:
                # Try to assign noise points to closest cluster
                noise_points = np.where(cluster_labels == -1)[0]
                
                # If using HDBSCAN's soft clustering for assignment
                if hasattr(clusterer, 'prediction_data_'):
                    try:
                        # Get soft cluster assignments for noise points
                        soft_clusters = hdbscan.all_points_membership_vectors(clusterer)
                        
                        # For each noise point, assign to highest probability cluster
                        for idx in noise_points:
                            # Skip if all probabilities are very low
                            if np.max(soft_clusters[idx]) > 0.1:
                                cluster_labels[idx] = np.argmax(soft_clusters[idx])
                    except Exception as e:
                        logger.error(f"Error in soft clustering assignment: {str(e)}")
                
                # If we still have noise points, try distance-based assignment
                noise_points = np.where(cluster_labels == -1)[0]
                if len(noise_points) > 0:
                    cluster_centers = {}
                    for label in np.unique(cluster_labels):
                        if label != -1:  # Skip noise
                            mask = cluster_labels == label
                            centers = np.mean(self.umap_embedding[mask], axis=0)
                            cluster_centers[label] = centers
                    
                    # Assign each noise point to nearest cluster center
                    for idx in noise_points:
                        if cluster_centers:  # Check if we have any cluster centers
                            point = self.umap_embedding[idx]
                            distances = {label: np.linalg.norm(point - center) 
                                      for label, center in cluster_centers.items()}
                            closest_cluster = min(distances.items(), key=lambda x: x[1])[0]
                            cluster_labels[idx] = closest_cluster
                        else:
                            # If no cluster centers (all noise), assign to cluster 0
                            cluster_labels[idx] = 0
            
            # Remap labels to be consecutive integers starting from 0
            unique_labels = np.unique(cluster_labels)
            mapping = {old_label: new_label for new_label, old_label in enumerate(unique_labels)}
            remapped_labels = np.array([mapping[label] for label in cluster_labels])
            
            self.optimal_clusters = len(np.unique(remapped_labels))
            
            return remapped_labels
            
        except Exception as e:
            logger.error(f"HDBSCAN clustering failed: {str(e)}")
            logger.error(traceback.format_exc())
            
            # Fall back to GMM clustering
            logger.warning("Falling back to GMM clustering")
            return self.perform_gmm_clustering(max_clusters)
    
    def perform_gmm_clustering(self, max_components=6):
        """Fallback to Gaussian Mixture Models for clustering when HDBSCAN fails"""
        if self.umap_embedding is None:
            raise ValueError("UMAP embedding must be created before GMM clustering")
            
        n_samples = len(self.umap_embedding)
        
        # Set range of components to try
        min_components = min(2, n_samples - 1)
        max_components = min(max_components, n_samples - 1)
        
        if max_components <= min_components:
            # Not enough samples for meaningful BIC search
            n_components = min_components
        else:
            # Find optimal number of components using BIC
            bic_scores = []
            n_components_range = range(min_components, max_components + 1)
            
            for n_components in n_components_range:
                try:
                    gmm = GaussianMixture(
                        n_components=n_components,
                        covariance_type='full',
                        random_state=42,
                        n_init=10
                    )
                    gmm.fit(self.umap_embedding)
                    bic_scores.append(gmm.bic(self.umap_embedding))
                except Exception as e:
                    logger.error(f"Error in GMM with {n_components} components: {str(e)}")
                    bic_scores.append(float('inf'))
            
            # Choose number of components with lowest BIC
            if bic_scores:
                n_components = n_components_range[np.argmin(bic_scores)]
            else:
                # Default if all attempts failed
                n_components = min_components
                
        # Final GMM with optimal components
        try:
            gmm = GaussianMixture(
                n_components=n_components,
                covariance_type='full',
                random_state=42,
                n_init=10
            )
            
            cluster_labels = gmm.fit_predict(self.umap_embedding)
            self.cluster_probabilities = gmm.predict_proba(self.umap_embedding)
            
            logger.info(f"GMM clustering completed with {n_components} components")
            
            self.optimal_clusters = n_components
            return cluster_labels
            
        except Exception as e:
            logger.error(f"GMM clustering failed: {str(e)}")
            
            # Last resort: basic KMeans
            logger.warning("GMM failed, using basic KMeans as last resort")
            from sklearn.cluster import KMeans
            
            k = max(2, min(n_samples // 2, 5))
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(self.umap_embedding)
            
            self.optimal_clusters = k
            return cluster_labels
    
    def generate_adaptive_audio_profile(self, cluster_tracks, genre_distribution=None):
        """
        Generate audio profiles based on track metadata with adaptive thresholds
        derived from data distributions rather than hardcoded values
        """
        if not cluster_tracks:
            return self._get_base_audio_profile()
            
        # Extract context from playlist metadata if needed
        if self.context_themes is None:
            self.extract_playlist_context()
            
        # Initialize audio profile with base values
        profile = self._get_base_audio_profile()
        
        # Collect data for analysis
        years = []
        popularities = []
        explicit_count = 0
        artist_popularity = []
        track_durations = []
        
        # Analyze tracks to extract features
        for track in cluster_tracks:
            # Collect years
            if track.get('release_date') and len(track['release_date']) >= 4:
                try:
                    years.append(int(track['release_date'][:4]))
                except ValueError:
                    pass
                    
            # Track popularity
            popularities.append(track.get('popularity', 50))
            
            # Check for explicit content
            if track.get('explicit'):
                explicit_count += 1
                
            # Track durations
            if 'duration_ms' in track:
                track_durations.append(track['duration_ms'])
                
            # Get artist popularity
            artist_id = track.get('artist_id')
            if artist_id and artist_id in self.artist_data:
                artist_popularity.append(self.artist_data[artist_id].get('popularity', 50))
                
        # Get genre distribution if not provided
        if not genre_distribution:
            genre_distribution = self._extract_genre_distribution(cluster_tracks)
            
        # Adjust audio profile based on genres (with adaptive weights)
        total_tracks = len(cluster_tracks)
        for genre, count in genre_distribution.items():
            # Calculate influence weight based on prevalence
            weight = count / total_tracks
            genre_lower = genre.lower()
            
            # Apply genre-specific adjustments with dynamic weights
            self._apply_genre_adjustments(profile, genre_lower, weight)
                
        # Adjust based on track popularity (percentile-based approach)
        if popularities:
            pop_percentiles = np.percentile(popularities, [25, 50, 75])
            avg_popularity = np.mean(popularities)
            
            # Scale influence based on how extreme the popularity is
            pop_factor = (avg_popularity - 50) / 50  # -1 to 1 scale
            
            # More nuanced adjustments based on percentiles
            if avg_popularity > pop_percentiles[2]:  # Top 25% popularity
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, abs(pop_factor)*0.7)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, abs(pop_factor)*0.6)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.7, abs(pop_factor)*0.5)
            elif avg_popularity > pop_percentiles[1]:  # Top 50% popularity
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.65, abs(pop_factor)*0.5)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.65, abs(pop_factor)*0.4)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.65, abs(pop_factor)*0.3)
            elif avg_popularity < pop_percentiles[0]:  # Bottom 25% popularity
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.4, abs(pop_factor)*0.3)
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.4, abs(pop_factor)*0.5)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.6, abs(pop_factor)*0.4)
            
        # Adjust based on release year (era-specific characteristics)
        if years:
            self._adjust_by_era(profile, years)
                
        # Adjust based on explicit content percentage
        if cluster_tracks:
            explicit_percentage = explicit_count / len(cluster_tracks)
            if explicit_percentage > 0.1:  # Adaptive threshold
                # Gradient based on percentage
                speech_boost = min(0.3, explicit_percentage * 0.5)
                profile['speechiness'] = min(0.9, profile['speechiness'] + speech_boost)
                
                # More explicit content often correlates with less acoustic
                profile['acousticness'] = max(0.1, profile['acousticness'] - speech_boost*0.5)
                
        # Adjust for track duration (affects perception of energy and danceability)
        if track_durations:
            avg_duration = np.mean(track_durations) / 60000  # Convert to minutes
            
            # Very short tracks (<2 min) often have higher energy/dance
            if avg_duration < 2:
                profile['energy'] = min(0.95, profile['energy'] + 0.1)
                profile['danceability'] = min(0.9, profile['danceability'] + 0.1)
                
            # Very long tracks (>5 min) often more instrumental/acoustic
            elif avg_duration > 5:
                profile['energy'] = max(0.05, profile['energy'] - 0.1)
                profile['instrumentalness'] = min(0.9, profile['instrumentalness'] + 0.15)
                
        # Consider playlist context themes
        if self.context_themes:
            self._adjust_profile_by_context(profile)
            
        # Apply tempo adjustments based on all collected data
        self._adjust_tempo(profile, years, popularities, genre_distribution)
        
        # Add small random variations but keep consistency for same input
        # Use a hash of track IDs to seed the randomness
        track_ids_str = ''.join(sorted([t.get('id', '') for t in cluster_tracks]))
        import hashlib
        seed = int(hashlib.md5(track_ids_str.encode()).hexdigest(), 16) % 10000
        np.random.seed(seed)
        
        for key in profile:
            if key == 'tempo':
                # Tempo can have larger variations
                profile[key] += np.random.uniform(-3, 3)
            else:
                # Properties in 0-1 range get smaller variations
                variation = np.random.uniform(-0.03, 0.03)
                profile[key] += variation
                # Keep in 0-1 range
                if key != 'tempo':
                    profile[key] = max(0.01, min(0.99, profile[key]))
        
        return profile
    
    def _weighted_adjust(self, current_value, target_value, weight):
        """Helper to adjust a value toward a target with a weight factor"""
        return (1 - weight) * current_value + weight * target_value
    
    def _extract_genre_distribution(self, tracks):
        """Extract genre distribution from a set of tracks"""
        genre_counts = Counter()
        
        for track in tracks:
            artist_id = track.get('artist_id')
            if artist_id and artist_id in self.artist_data:
                for genre in self.artist_data[artist_id].get('genres', []):
                    genre_counts[genre] += 1
                    
        return genre_counts
    
    def _apply_genre_adjustments(self, profile, genre, weight):
        """Apply genre-specific adjustments to an audio profile"""
        # Rock genres
        if 'rock' in genre:
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.75, weight * 0.6)
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.3, weight * 0.5)
            profile['liveness'] = self._weighted_adjust(profile['liveness'], 0.5, weight * 0.4)
            
            # Sub-genre specifics
            if 'metal' in genre:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.9, weight * 0.8)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.4, weight * 0.5)
            elif 'indie' in genre:
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.5, weight * 0.5)
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.3, weight * 0.4)
                
        # Classical and orchestral music
        elif any(g in genre for g in ['classical', 'piano', 'orchestra', 'composer']):
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.9, weight * 0.8)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.3, weight * 0.6)
            profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.9, weight * 0.8)
            profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.03, weight * 0.9)
                
        # Electronic genres
        elif any(g in genre for g in ['electronic', 'techno', 'house', 'edm', 'dance']):
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.8, weight * 0.7)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.85, weight * 0.6)
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.1, weight * 0.8)
            
            # Sub-genre specifics
            if 'ambient' in genre:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.3, weight * 0.7)
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.8, weight * 0.7)
            elif 'techno' in genre or 'house' in genre:
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.9, weight * 0.8)
                
        # Hip hop, rap, and trap
        elif any(g in genre for g in ['hip hop', 'hip-hop', 'rap', 'trap']):
            profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.6, weight * 0.7)
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.75, weight * 0.6)
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.15, weight * 0.7)
            
            # Sub-genre specifics
            if 'trap' in genre:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, weight * 0.6)
            if 'gangsta' in genre or 'hardcore' in genre:
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.4, weight * 0.5)
                
        # Jazz genres
        elif 'jazz' in genre:
            profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.7, weight * 0.6)
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.8, weight * 0.6)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.4, weight * 0.5)
            
        # Folk and acoustic genres
        elif any(g in genre for g in ['folk', 'acoustic', 'singer-songwriter']):
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.85, weight * 0.8)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.35, weight * 0.6)
            profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.2, weight * 0.5)
            profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.4, weight * 0.5)
            
        # Pop music
        elif 'pop' in genre:
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, weight * 0.6)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.65, weight * 0.5)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, weight * 0.5)
            profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.4, weight * 0.5)
        
        # R&B and Soul
        elif any(g in genre for g in ['r&b', 'soul', 'funk']):
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, weight * 0.6)
            profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.3, weight * 0.5)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.6, weight * 0.5)
            
            if 'funk' in genre:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.75, weight * 0.7)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.8, weight * 0.6)
                
        # Country music
        elif 'country' in genre:
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.7, weight * 0.6)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.6, weight * 0.5)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.5, weight * 0.5)
            profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.2, weight * 0.6)
            
        # Latin music
        elif any(g in genre for g in ['latin', 'salsa', 'reggaeton']):
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.8, weight * 0.7)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.75, weight * 0.6)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.75, weight * 0.6)
            profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.5, weight * 0.5)
    
    def _adjust_by_era(self, profile, years):
        """Adjust audio profile based on release years"""
        if not years:
            return profile
            
        # Calculate year metrics
        avg_year = np.mean(years)
        year_range = max(years) - min(years)
        
        # Modern era (2010s and later)
        if avg_year >= 2010:
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.3, 0.5)
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, 0.5)
            
            # Recent trends (2015+)
            if avg_year >= 2015:
                profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.4, 0.5)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.65, 0.5)
                
        # 2000s
        elif avg_year >= 2000:
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.65, 0.4)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, 0.4)
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.35, 0.4)
            
        # 90s
        elif avg_year >= 1990:
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.75, 0.4)
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.6, 0.4)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.55, 0.3)
            
        # 80s
        elif avg_year >= 1980:
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.8, 0.5)
            profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, 0.5)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.7, 0.4)
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.25, 0.5)
            
        # 70s
        elif avg_year >= 1970:
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, 0.4)
            profile['liveness'] = self._weighted_adjust(profile['liveness'], 0.5, 0.4)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.65, 0.3)
            
        # 60s
        elif avg_year >= 1960:
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.5, 0.4)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.6, 0.4)
            profile['valence'] = self._weighted_adjust(profile['valence'], 0.7, 0.4)
            
        # Pre-60s
        else:
            profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.7, 0.6)
            profile['energy'] = self._weighted_adjust(profile['energy'], 0.4, 0.5)
            profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.4, 0.4)
            profile['liveness'] = self._weighted_adjust(profile['liveness'], 0.6, 0.4)
            
        # Adjust for diversity in years
        if year_range > 20:
            # Wide span of years - likely more diverse
            # We'll make the profile more balanced
            for key in profile:
                if key != 'tempo' and profile[key] < 0.3:
                    profile[key] = max(profile[key], 0.3)
                elif key != 'tempo' and profile[key] > 0.7:
                    profile[key] = min(profile[key], 0.7)
                    
        return profile
    
    def _adjust_profile_by_context(self, profile):
        """Adjust audio profile based on playlist context themes"""
        if not self.context_themes:
            return profile
            
        # Mood adjustments (with variable weights)
        for mood in self.context_themes.get('mood', []):
            weight = 0.5  # Base weight
            
            if mood in ['chill', 'relax', 'relaxing', 'calm', 'peaceful']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.25, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 85, weight*0.5)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.7, weight*0.7)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.5, weight*0.5)
                
            elif mood in ['energetic', 'party', 'upbeat', 'vibrant', 'hype']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.85, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 125, weight*0.5)
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.8, weight*0.7)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.75, weight*0.6)
                
            elif mood in ['focus', 'study', 'concentration', 'work', 'productivity']:
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.6, weight*0.7)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.4, weight*0.6)
                profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.1, weight*0.8)
                
            elif mood in ['sad', 'melancholy', 'emotional', 'somber']:
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.25, weight*0.8)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 90, weight*0.5)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.6, weight*0.5)
                
            elif mood in ['happy', 'joy', 'cheerful', 'uplifting']:
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.8, weight*0.8)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, weight*0.6)
                
            elif mood in ['dreamy', 'atmospheric', 'ambient']:
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.7, weight*0.7)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.6, weight*0.6)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.3, weight*0.7)
                
            elif mood in ['dark', 'intense', 'aggressive', 'angry']:
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.2, weight*0.7)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.8, weight*0.7)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.2, weight*0.6)
                
        # Activity adjustments
        for activity in self.context_themes.get('activity', []):
            weight = 0.5  # Base weight
            
            if activity in ['workout', 'run', 'gym', 'exercise', 'cardio']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.9, weight*0.8)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 130, weight*0.7)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.7, weight*0.6)
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.8, weight*0.6)
                
            elif activity in ['sleep', 'relax', 'meditation', 'yoga']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.1, weight*0.9)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 70, weight*0.8)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.8, weight*0.7)
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.7, weight*0.7)
                
            elif activity in ['dance', 'party', 'club']:
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.9, weight*0.9)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.85, weight*0.8)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 120, weight*0.6)
                
            elif activity in ['drive', 'road', 'trip', 'travel']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, weight*0.6)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.65, weight*0.5)
                
            elif activity in ['coding', 'reading', 'study', 'work']:
                profile['instrumentalness'] = self._weighted_adjust(profile['instrumentalness'], 0.7, weight*0.7)
                profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.1, weight*0.8)
                
        # Decade adjustments
        for decade in self.context_themes.get('decade', []):
            weight = 0.4  # Lighter weight for decade
            
            if decade in ['50s', 'fifties', 'retro', 'vintage', 'oldies']:
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.75, weight)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.6, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 95, weight*0.5)
                
            elif decade in ['60s', 'sixties']:
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.65, weight)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.6, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 105, weight*0.5)
                
            elif decade in ['70s', 'seventies']:
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.7, weight)
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.65, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 110, weight*0.5)
                
            elif decade in ['80s', 'eighties']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.75, weight)
                profile['valence'] = self._weighted_adjust(profile['valence'], 0.7, weight)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.3, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 115, weight*0.5)
                
            elif decade in ['90s', 'nineties']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, weight)
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.65, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 105, weight*0.5)
                
            elif decade in ['00s', 'aughts', '2000s']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.65, weight)
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 110, weight*0.5)
                
            elif decade in ['10s', 'tens', '2010s']:
                profile['energy'] = self._weighted_adjust(profile['energy'], 0.7, weight)
                profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.4, weight)
                profile['acousticness'] = self._weighted_adjust(profile['acousticness'], 0.4, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 105, weight*0.5)
                
            elif decade in ['20s', 'twenties', '2020s', 'modern']:
                profile['speechiness'] = self._weighted_adjust(profile['speechiness'], 0.45, weight)
                profile['danceability'] = self._weighted_adjust(profile['danceability'], 0.7, weight)
                profile['tempo'] = self._weighted_adjust(profile['tempo'], 100, weight*0.5)
                
        return profile
    
    def _adjust_tempo(self, profile, years, popularities, genre_distribution):
        """Set appropriate tempo based on all available data"""
        base_tempo = 115  # Default fallback
        
        # Influences
        tempo_influences = []
        
        # Genre influences
        for genre, count in genre_distribution.items():
            genre_lower = genre.lower()
            weight = min(0.8, count / 10)  # Cap influence
            
            # Dance/EDM: higher tempo
            if any(g in genre_lower for g in ['edm', 'dance', 'techno', 'house', 'trance']):
                tempo_influences.append((128, weight))
                
            # Hip-hop: medium-low tempo
            elif any(g in genre_lower for g in ['hip hop', 'hip-hop', 'rap', 'trap']):
                tempo_influences.append((95, weight))
                
            # Rock: variable tempo
            elif 'rock' in genre_lower:
                if 'metal' in genre_lower or 'hard' in genre_lower:
                    tempo_influences.append((140, weight))
                elif 'punk' in genre_lower:
                    tempo_influences.append((160, weight))
                else:
                    tempo_influences.append((120, weight))
                    
            # Jazz: medium tempo
            elif 'jazz' in genre_lower:
                tempo_influences.append((110, weight))
                
            # Classical: lower tempo
            elif any(g in genre_lower for g in ['classical', 'piano', 'symphony']):
                tempo_influences.append((85, weight))
                
            # Folk/Acoustic: medium-low tempo
            elif any(g in genre_lower for g in ['folk', 'acoustic', 'indie']):
                tempo_influences.append((100, weight))
                
            # Soul/R&B: medium tempo
            elif any(g in genre_lower for g in ['soul', 'r&b', 'funk']):
                tempo_influences.append((105, weight))
                
            # Pop: medium-high tempo
            elif 'pop' in genre_lower:
                tempo_influences.append((115, weight))
                
        # Era influences
        if years:
            avg_year = np.mean(years)
            year_weight = 0.5
            
            if avg_year >= 2010:
                tempo_influences.append((105, year_weight))
            elif avg_year >= 2000:
                tempo_influences.append((110, year_weight))
            elif avg_year >= 1990:
                tempo_influences.append((115, year_weight))
            elif avg_year >= 1980:
                tempo_influences.append((120, year_weight))
            elif avg_year >= 1970:
                tempo_influences.append((110, year_weight))
            elif avg_year >= 1960:
                tempo_influences.append((105, year_weight))
            else:
                tempo_influences.append((90, year_weight))
                
        # Energy/danceability influences tempo
        energy_dance_tempo = (profile['energy'] * 140) + (profile['danceability'] * 130)
        energy_dance_tempo /= (profile['energy'] + profile['danceability']) if (profile['energy'] + profile['danceability']) > 0 else 1
        tempo_influences.append((energy_dance_tempo, 0.6))
        
        # Calculate weighted average
        if tempo_influences:
            weighted_sum = sum(tempo * weight for tempo, weight in tempo_influences)
            total_weight = sum(weight for _, weight in tempo_influences)
            
            if total_weight > 0:
                base_tempo = weighted_sum / total_weight
                
        # Add small variation based on valence (higher valence -> slightly higher tempo)
        valence_adjustment = (profile['valence'] - 0.5) * 10
        base_tempo += valence_adjustment
        
        # Ensure reasonable bounds
        final_tempo = min(180, max(60, base_tempo))
        
        # Add slight random variation for naturalism
        final_tempo += np.random.uniform(-3, 3)
        
        profile['tempo'] = final_tempo
        return profile
    
    def _get_base_audio_profile(self):
        """
        Get a balanced base audio profile as starting point
        """
        base_profile = {
            'danceability': 0.5,
            'energy': 0.5,
            'acousticness': 0.5,
            'instrumentalness': 0.2,
            'valence': 0.5,
            'speechiness': 0.1,
            'liveness': 0.2,
            'tempo': 115.0
        }
        
        return base_profile.copy()
    
    def analyze_playlist(self, sp_client):
        """
        Main analysis method that performs the HDBSCAN + UMAP clustering workflow
        """
        # Step 1: Fetch artist data if needed
        if not self.artist_data:
            self.fetch_artist_data(sp_client)
        
        # Step 2: Create feature vectors
        feature_vectors, processed_tracks, track_data = self.create_enhanced_feature_vectors()
        
        # Step 3: Extract playlist context
        self.extract_playlist_context()
        
        # Step 4: Apply UMAP dimensionality reduction
        umap_embedding = self.perform_umap_reduction()
        
        # Step 5: Perform HDBSCAN clustering
        cluster_labels = self.perform_hdbscan_clustering()
        
        # Step 6: Organize tracks by cluster
        clusters = {}
        for i, label in enumerate(cluster_labels):
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(processed_tracks[i])
        
        # Step 7: Create final result
        result = {
            "clusters": [],
            "total_tracks": len(processed_tracks),
            "analyzed_tracks": len(processed_tracks),
            "optimal_clusters": len(clusters),
            "method": "hdbscan-umap"
        }
        
        # Step 8: Generate detailed cluster data
        cluster_genre_distributions = {}
        
        for cluster_idx, (label, tracks) in enumerate(clusters.items()):
            # Sort tracks by popularity for better samples
            sorted_tracks = sorted(tracks, key=lambda x: x.get('popularity', 0), reverse=True)
            
            # Extract genre distribution for this cluster
            genre_distribution = self._extract_genre_distribution(tracks)
            cluster_genre_distributions[cluster_idx] = genre_distribution.most_common(5)
            
            # Create audio profile using adaptive approach
            audio_profile = self.generate_adaptive_audio_profile(tracks, genre_distribution)
            
            # Determine cluster name
            cluster_name = self._create_descriptive_cluster_name(cluster_idx, tracks, genre_distribution)
            
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
            
        # Step 9: Add 2D coordinates for visualization
        result["visualization"] = {
            "type": "umap",
            "coordinates": []
        }
        
        for i, (x, y) in enumerate(self.umap_embedding):
            track = processed_tracks[i]
            cluster_id = cluster_labels[i] + 1  # 1-based indexing for clusters
            
            result["visualization"]["coordinates"].append({
                "x": float(x),
                "y": float(y),
                "track_id": track['id'],
                "track_name": track['name'],
                "artist": track['primary_artist'],
                "cluster": int(cluster_id)
            })
            
        # Step 10: Add additional insights
        result["additional_insights"] = {
            "context_themes": self.context_themes,
            "cluster_genre_distributions": cluster_genre_distributions,
            "playlist_year_span": self._get_year_span(processed_tracks)
        }
        
        return result
    
    def create_descriptive_cluster_name(self, cluster_idx, tracks, genre_distribution):
        """
        Generate meaningful names for clusters using a hierarchical approach that prioritizes:
        1. Genre distinctions
        2. Mood & emotional tone
        3. Context/activity associations
        4. Artist/era influence
        5. Tempo/energy characteristics 
        6. Instrumentation details
        """
        # Track important attributes for naming
        cluster_attributes = {
            'genres': [],            # List of (genre, count) tuples
            'artists': [],           # List of (artist, count) tuples
            'years': [],             # List of release years
            'moods': [],             # Derived from audio profile and metadata
            'tempo_category': None,  # Slow, Medium, Fast
            'energy_category': None, # Low, Medium, High
            'instrumentation': [],   # Acoustic, Electronic, Instrumental, etc.
            'context_keywords': []   # From playlist context
        }
        
        # 1. Extract genre information
        top_genres = [(genre, count) for genre, count in genre_distribution.most_common(5) 
                    if count >= len(tracks) * 0.2]  # Only genres that apply to at least 20% of tracks
        cluster_attributes['genres'] = top_genres
        
        # 2. Extract artist information
        artists = Counter()
        for track in tracks:
            primary_artist = track.get('primary_artist')
            if primary_artist:
                artists[primary_artist] += 1
        
        top_artists = [(artist, count) for artist, count in artists.most_common(3) 
                    if count >= len(tracks) * 0.3]  # Only artists with at least 30% of tracks
        cluster_attributes['artists'] = top_artists
        
        # 3. Extract years and determine era
        years = []
        for track in tracks:
            if track.get('release_date') and len(track['release_date']) >= 4:
                try:
                    years.append(int(track['release_date'][:4]))
                except ValueError:
                    pass
        
        if years:
            cluster_attributes['years'] = years
            
        # 4. Set tempo and energy categories based on audio profile
        if len(tracks) > 0:
            # Generate an audio profile for this cluster to derive characteristics
            audio_profile = self.generate_adaptive_audio_profile(tracks, genre_distribution)
            
            # Classify tempo
            tempo = audio_profile.get('tempo', 0)
            if tempo < 90:
                cluster_attributes['tempo_category'] = 'Slow'
            elif tempo < 120:
                cluster_attributes['tempo_category'] = 'Medium'
            else:
                cluster_attributes['tempo_category'] = 'Fast'
                
            # Classify energy
            energy = audio_profile.get('energy', 0)
            if energy < 0.33:
                cluster_attributes['energy_category'] = 'Low'
            elif energy < 0.66:
                cluster_attributes['energy_category'] = 'Medium'
            else:
                cluster_attributes['energy_category'] = 'High'
                
            # Determine mood based on valence and energy
            valence = audio_profile.get('valence', 0.5)
            
            # Create mood classifications based on valence and energy values
            if valence < 0.33:
                if energy < 0.33:
                    cluster_attributes['moods'].append('Melancholic')
                elif energy < 0.66:
                    cluster_attributes['moods'].append('Thoughtful')
                else:
                    cluster_attributes['moods'].append('Intense')
            elif valence < 0.66:
                if energy < 0.33:
                    cluster_attributes['moods'].append('Relaxed')
                elif energy < 0.66:
                    cluster_attributes['moods'].append('Balanced')
                else:
                    cluster_attributes['moods'].append('Energetic')
            else:
                if energy < 0.33:
                    cluster_attributes['moods'].append('Peaceful')
                elif energy < 0.66:
                    cluster_attributes['moods'].append('Upbeat')
                else:
                    cluster_attributes['moods'].append('Euphoric')
                    
            # Determine instrumentation characteristics
            acousticness = audio_profile.get('acousticness', 0)
            instrumentalness = audio_profile.get('instrumentalness', 0)
            
            if acousticness > 0.6:
                cluster_attributes['instrumentation'].append('Acoustic')
            elif acousticness < 0.3:
                cluster_attributes['instrumentation'].append('Electronic')
                
            if instrumentalness > 0.5:
                cluster_attributes['instrumentation'].append('Instrumental')
        
        # 5. Extract context keywords from playlist
        if self.context_themes:
            for theme_type, themes in self.context_themes.items():
                cluster_attributes['context_keywords'].extend(themes)
        
        # Now build the name with our priority hierarchy
        
        # 1. Start with genre-based naming (highest priority)
        name_components = []
        
        if cluster_attributes['genres']:
            # If we have multiple meaningful genres, combine them
            if len(cluster_attributes['genres']) >= 2:
                genre1 = cluster_attributes['genres'][0][0].title()
                genre2 = cluster_attributes['genres'][1][0].title()
                name_components.append(f"{genre1} & {genre2}")
            # Otherwise use the primary genre
            elif cluster_attributes['genres']:
                genre = cluster_attributes['genres'][0][0].title()
                name_components.append(genre)
        
        # Check if we need more specificity (all clusters have same primary genre)
        # Check this by comparing with other cluster names in the class variable
        uses_generic_genre = False
        if hasattr(self, 'cluster_names') and self.cluster_names and name_components:
            primary_genre = name_components[0]
            similar_names = 0
            for name in self.cluster_names.values():
                if primary_genre in name:
                    similar_names += 1
            
            # If we have multiple clusters with the same genre, we need more specificity
            if similar_names >= 2:
                uses_generic_genre = True
        
        # If we couldn't get meaningful genre distinction, move to mood/emotional characteristics
        if not name_components or uses_generic_genre:
            # 2. Add mood/emotional tone if available
            if cluster_attributes['moods']:
                mood = cluster_attributes['moods'][0]
                
                # If we already have a genre, combine them
                if name_components:
                    name_components[0] = f"{mood} {name_components[0]}"
                else:
                    name_components.append(mood)
        
        # 3. If still generic, add tempo/energy characteristics
        if uses_generic_genre and cluster_attributes['tempo_category'] and cluster_attributes['energy_category']:
            # Adding tempo/energy can help distinguish similar genre clusters
            if cluster_attributes['tempo_category'] == 'Fast' or cluster_attributes['energy_category'] == 'High':
                name_components[0] = f"Energetic {name_components[0]}"
            elif cluster_attributes['tempo_category'] == 'Slow' and cluster_attributes['energy_category'] == 'Low':
                name_components[0] = f"Mellow {name_components[0]}"
                
        # 4. If dominated by one artist, note this
        if cluster_attributes['artists'] and cluster_attributes['artists'][0][1] > len(tracks) * 0.5:
            artist_name = cluster_attributes['artists'][0][0]
            name_components.append(f"{artist_name}'s Style")
            
        # 5. Add era information if available and relevant
        if cluster_attributes['years'] and max(cluster_attributes['years']) - min(cluster_attributes['years']) < 15:
            avg_year = int(sum(cluster_attributes['years']) / len(cluster_attributes['years']))
            decade = (avg_year // 10) * 10
            
            # Only add if it adds meaningful distinction
            if not any(str(decade) in component for component in name_components):
                name_components.append(f"{decade}s")
                
        # 6. Add instrumentation if we need more specificity 
        if (not name_components or uses_generic_genre) and cluster_attributes['instrumentation']:
            instr = " & ".join(cluster_attributes['instrumentation'])
            if name_components:
                name_components[0] = f"{instr} {name_components[0]}"
            else:
                name_components.append(instr)
        
        # 7. Add context keywords if we still don't have a distinctive name
        if not name_components and cluster_attributes['context_keywords']:
            context = cluster_attributes['context_keywords'][0].title()
            name_components.append(f"{context} Vibes")
            
        # 8. Last resort fallback
        if not name_components:
            name_components.append(f"Cluster {cluster_idx + 1}")
            
        # Create the final name
        cluster_label = f"Cluster {cluster_idx + 1}"
        description = " ".join(name_components)
        
        return f"{cluster_label}: {description}"
    
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