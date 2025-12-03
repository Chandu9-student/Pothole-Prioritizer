from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

def create_app():
    app = Flask(__name__)
    
    # Initialize rate limiter
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"
    )
    
    # Store limiter in app config for access in routes
    app.limiter = limiter
    
    # Configure CORS
    allowed_origins = [
        "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001",
        "https://pothole-prioritizer-frontend.onrender.com"
    ]
    CORS(app, resources={
        r"/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Add a root route
    @app.route('/')
    def index():
        return jsonify({
            'message': 'Pothole Detection API',
            'status': 'running',
            'endpoints': {
                'analyze': '/api/analyze',
                'map': '/api/map/potholes'
            }
        })
    
    # Serve static files (images)
    @app.route('/manual_reports/<filename>')
    def serve_manual_reports(filename):
        manual_reports_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'manual_reports')
        return send_from_directory(manual_reports_dir, filename)
    
    @app.route('/uploads/<filename>')
    def serve_uploads(filename):
        uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
        return send_from_directory(uploads_dir, filename)
    
    # Import and register blueprints
    from api.routes import main_bp
    from api.mapping import mapping_bp
    # from api.auth_routes import auth_bp  # Disabled - using auth routes in main_bp instead
    
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(mapping_bp, url_prefix='/api/map')
    # app.register_blueprint(auth_bp, url_prefix='/api/auth')  # Disabled - using auth routes in main_bp instead
    
    # Add health endpoint at root level
    @app.route('/health')
    def health():
        return jsonify({'status': 'healthy', 'service': 'pothole-detection-api'})
    
    return app
