import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from sqlalchemy import text
from models import db  # Import db from models.py

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Update CORS configuration
    allowed_origins = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')
    CORS(app, resources={
        r"/api/*": {"origins": allowed_origins.split(',')}, 
        r"/debug/*": {"origins": allowed_origins.split(',')},
        # Make sure to add all HTTP methods for preflight requests
    }, supports_credentials=True)
    
    # Rest of your app configuration...
    
    # Initialize extensions
    db.init_app(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.user import user_bp
    from routes.stats import stats_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(stats_bp, url_prefix='/api/stats')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Debug route for database inspection
    @app.route('/debug/db-info')
    def db_info():
        """Debugging endpoint to get database information"""
        try:
            # Check database connection
            connection_test = db.session.execute(text("SELECT 1")).scalar()
            
            # Get database path
            db_path = app.config.get('SQLALCHEMY_DATABASE_URI')
            
            # Get list of tables
            tables = db.session.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
            table_names = [table[0] for table in tables]
            
            # Get schema for each table
            schema_info = {}
            for table in table_names:
                if table.startswith('sqlite_'):
                    continue
                try:
                    columns = db.session.execute(text(f"PRAGMA table_info({table})")).fetchall()
                    schema_info[table] = [
                        {
                            'name': col[1],
                            'type': col[2],
                            'notnull': col[3],
                            'default': col[4],
                            'pk': col[5]
                        }
                        for col in columns
                    ]
                except Exception as e:
                    schema_info[table] = {'error': str(e)}
            
            # Get user count
            user_count = 0
            if 'user' in table_names:
                user_count = db.session.execute(text("SELECT COUNT(*) FROM user")).scalar()
            
            # Get user sample
            user_sample = []
            if 'user' in table_names:
                users = db.session.execute(text("SELECT id, spotify_id, email, display_name FROM user LIMIT 10")).fetchall()
                user_sample = [
                    {
                        'id': user[0],
                        'spotify_id': user[1],
                        'email': user[2],
                        'display_name': user[3]
                    }
                    for user in users
                ]
            
            return jsonify({
                'connection_test': bool(connection_test),
                'db_path': db_path,
                'tables': table_names,
                'schema': schema_info,
                'user_count': user_count,
                'user_sample': user_sample
            })
        except Exception as e:
            import traceback
            return jsonify({
                'error': str(e),
                'traceback': traceback.format_exc()
            }), 500
            
    # Debug route to completely reset the database
    @app.route('/debug/reset-db', methods=['POST'])
    def reset_db():
        """Debug endpoint to drop all tables and recreate them"""
        try:
            with app.app_context():
                # Drop all tables
                db.drop_all()
                
                # Create all tables
                db.create_all()
                
                return jsonify({
                    'success': True,
                    'message': 'Database reset successful'
                })
        except Exception as e:
            import traceback
            return jsonify({
                'success': False,
                'error': str(e),
                'traceback': traceback.format_exc()
            }), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)