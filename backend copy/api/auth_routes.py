"""
Authentication routes for user management
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
import jwt
from api.auth import User, generate_jwt_token, verify_jwt_token

auth_bp = Blueprint('auth', __name__)

# JWT secret key (in production, use environment variable)
JWT_SECRET_KEY = "pothole_detection_jwt_secret_key_2024"

def token_required(f):
    """Decorator to require JWT token for protected routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            # Verify token
            payload = verify_jwt_token(token, JWT_SECRET_KEY)
            if not payload:
                return jsonify({'error': 'Token is invalid or expired'}), 401
                
            # Get current user
            current_user = User.find_by_id(payload['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
                
        except Exception as e:
            return jsonify({'error': 'Token validation failed'}), 401
        
        # Pass current_user to the route
        return f(current_user, *args, **kwargs)
    
    return decorated

def authority_required(f):
    """Decorator to require authority role"""
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != 'authority':
            return jsonify({'error': 'Authority access required'}), 403
        return f(current_user, *args, **kwargs)
    
    return decorated

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        name = data['name'].strip()
        role = data.get('role', 'citizen')  # Default to citizen
        
        # Validate role
        if role not in ['citizen', 'authority']:
            return jsonify({'error': 'Invalid role. Must be citizen or authority'}), 400
        
        # Check if user already exists
        if User.find_by_email(email):
            return jsonify({'error': 'User already exists with this email'}), 400
        
        # Validate password strength
        if len(password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Create user
        user = User.create(email, password, name, role)
        
        # Generate token
        token = generate_jwt_token(user, JWT_SECRET_KEY)
        
        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict(),
            'token': token
        }), 201
        
    except Exception as e:
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Find user
        user = User.find_by_email(email)
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        if not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate token
        token = generate_jwt_token(user, JWT_SECRET_KEY)
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': token
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/verify', methods=['GET'])
@token_required
def verify_token(current_user):
    """Verify JWT token and return user info"""
    return jsonify({
        'message': 'Token is valid',
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    """Logout user (client should delete token)"""
    return jsonify({
        'message': 'Logout successful'
    }), 200

@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile(current_user):
    """Get current user profile"""
    return jsonify({
        'user': current_user.to_dict()
    }), 200

@auth_bp.route('/users', methods=['GET'])
@token_required
@authority_required
def get_users(current_user):
    """Get all users (authority only)"""
    from api.auth import users_db
    users = [user.to_dict() for user in users_db if user.is_active]
    return jsonify({
        'users': users,
        'total': len(users)
    }), 200

# Demo users endpoint for development
@auth_bp.route('/demo-users', methods=['GET'])
def get_demo_users():
    """Get demo user credentials for testing"""
    return jsonify({
        'demo_users': [
            {
                'email': 'citizen@demo.com',
                'password': 'citizen123',
                'role': 'citizen',
                'name': 'Demo Citizen'
            },
            {
                'email': 'admin@city.gov',
                'password': 'admin123', 
                'role': 'authority',
                'name': 'City Administrator'
            },
            {
                'email': 'supervisor@roads.gov',
                'password': 'super123',
                'role': 'authority', 
                'name': 'Road Supervisor'
            },
            {
                'email': 'inspector@municipal.gov',
                'password': 'inspect123',
                'role': 'authority',
                'name': 'Field Inspector'
            }
        ]
    }), 200