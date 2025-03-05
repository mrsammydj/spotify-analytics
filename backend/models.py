"""
Database models for the Spotify Analytics application.
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Create a db instance without binding it to an app yet
# (this avoids circular imports as app.py imports models.py)
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'user'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    display_name = db.Column(db.String(100), nullable=True)
    refresh_token = db.Column(db.String(250), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<User {self.id}: {self.spotify_id}>'

class Track(db.Model):
    __tablename__ = 'track'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    album = db.Column(db.String(200), nullable=True)
    image_url = db.Column(db.String(250), nullable=True)
    popularity = db.Column(db.Integer, nullable=True)
    preview_url = db.Column(db.String(250), nullable=True)
    
    def __repr__(self):
        return f'<Track {self.id}: {self.name}>'
    
class ListeningHistory(db.Model):
    __tablename__ = 'listening_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=False, index=True)
    played_at = db.Column(db.DateTime, nullable=False)
    
    # Define relationships
    user = db.relationship('User', backref='listening_history')
    track = db.relationship('Track', backref='listening_history')
    
    def __repr__(self):
        return f'<ListeningHistory {self.id}: User {self.user_id}, Track {self.track_id}>'

class Artist(db.Model):
    __tablename__ = 'artist'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    genres = db.Column(db.String(500), nullable=True)  # Stored as comma-separated values
    popularity = db.Column(db.Integer, nullable=True)
    image_url = db.Column(db.String(250), nullable=True)
    
    def __repr__(self):
        return f'<Artist {self.id}: {self.name}>'