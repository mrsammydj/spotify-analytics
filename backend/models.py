from app import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=True)
    display_name = db.Column(db.String(100), nullable=True)
    refresh_token = db.Column(db.String(250), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, default=datetime.utcnow)

class Track(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200), nullable=False)
    album = db.Column(db.String(200), nullable=True)
    image_url = db.Column(db.String(250), nullable=True)
    popularity = db.Column(db.Integer, nullable=True)
    preview_url = db.Column(db.String(250), nullable=True)
    
class ListeningHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('track.id'), nullable=False)
    played_at = db.Column(db.DateTime, nullable=False)
    
    # Define relationships
    user = db.relationship('User', backref='listening_history')
    track = db.relationship('Track', backref='listening_history')

class Artist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(50), unique=True, nullable=False)
    name = db.Column(db.String(200), nullable=False)
    genres = db.Column(db.String(500), nullable=True)  # Stored as comma-separated values
    popularity = db.Column(db.Integer, nullable=True)
    image_url = db.Column(db.String(250), nullable=True)