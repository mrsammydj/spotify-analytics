from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import Config

# Initialize extensions
db = SQLAlchemy()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Initialize extensions
    db.init_app(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.user import user_bp
    from routes.stats import stats_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    
    # Create a root route for testing
    @app.route('/')
    def index():
        return jsonify({
            "message": "Welcome to Spotify Analytics API",
            "status": "online",
            "endpoints": {
                "auth": "/api/auth",
                "user": "/api/user",
                "stats": "/api/stats"
            }
        })
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)