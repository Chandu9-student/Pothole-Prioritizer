"""
User management and authentication models
"""
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Simple in-memory user storage (for development)
# In production, this would be a proper database
users_db = []
sessions_db = {}

class User:
    def __init__(self, id: int, email: str, password_hash: str, name: str, role: str = 'citizen'):
        self.id = id
        self.email = email
        self.password_hash = password_hash
        self.name = name
        self.role = role  # 'citizen' or 'authority'
        self.created_at = datetime.now().isoformat()
        self.is_active = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert user to dictionary (excluding sensitive data)"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'created_at': self.created_at,
            'is_active': self.is_active
        }

    def check_password(self, password: str) -> bool:
        """Check if provided password matches stored hash"""
        return self.password_hash == hash_password(password)

    @staticmethod
    def create(email: str, password: str, name: str, role: str = 'citizen') -> 'User':
        """Create a new user"""
        user_id = len(users_db) + 1
        password_hash = hash_password(password)
        user = User(user_id, email, password_hash, name, role)
        users_db.append(user)
        return user

    @staticmethod
    def find_by_email(email: str) -> Optional['User']:
        """Find user by email"""
        for user in users_db:
            if user.email == email and user.is_active:
                return user
        return None

    @staticmethod
    def find_by_id(user_id: int) -> Optional['User']:
        """Find user by ID"""
        for user in users_db:
            if user.id == user_id and user.is_active:
                return user
        return None

def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = "pothole_detection_salt"  # In production, use random salt per user
    return hashlib.sha256((password + salt).encode()).hexdigest()

def generate_jwt_token(user: User, secret_key: str) -> str:
    """Generate JWT token for user"""
    payload = {
        'user_id': user.id,
        'email': user.email,
        'role': user.role,
        'exp': datetime.utcnow() + timedelta(hours=24),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret_key, algorithm='HS256')

def verify_jwt_token(token: str, secret_key: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# Initialize with demo users
def initialize_demo_users():
    """Create demo users for testing"""
    if not users_db:  # Only initialize if empty
        # Demo citizen
        User.create(
            email="citizen@demo.com",
            password="citizen123",
            name="Demo Citizen",
            role="citizen"
        )
        
        # Demo authority users
        User.create(
            email="admin@city.gov",
            password="admin123",
            name="City Administrator",
            role="authority"
        )
        
        User.create(
            email="supervisor@roads.gov", 
            password="super123",
            name="Road Supervisor",
            role="authority"
        )
        
        User.create(
            email="inspector@municipal.gov",
            password="inspect123", 
            name="Field Inspector",
            role="authority"
        )

# Initialize demo users
initialize_demo_users()