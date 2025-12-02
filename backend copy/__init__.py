from flask import Flask
from flask_cors import CORS
from backend.api.routes import main_bp

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes

    # Register blueprints
    app.register_blueprint(main_bp, url_prefix='/api')

    return app
