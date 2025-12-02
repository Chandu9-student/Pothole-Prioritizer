
import json
import hashlib
from datetime import datetime
from flask import Blueprint, request, jsonify, url_for, current_app
from utils.geotagging.exif_handler import extract_gps_info

mapping_bp = Blueprint('mapping', __name__)

# In-memory storage for demo (replace with database later)
pothole_database = []  # Cleared fresh - ready for new reports

# User database for authorities
user_database = []  # Stores registered authority accounts

# Initialize with a default admin account
def _hash_password(password):
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

# Add default national admin on startup
default_admin = {
    'id': 'admin-001',
    'email': 'admin@potholeproritizer.com',
    'name': 'National Admin',
    'password': _hash_password('admin123'),  # Password: admin123
    'role': 'national_admin',
    'is_active': True,
    'created_at': datetime.now().isoformat()
}
user_database.append(default_admin)

@mapping_bp.route('/potholes', methods=['GET'])
def get_potholes():
    try:
        from api.routes import verify_token
        
        # Get user info from Authorization header
        user_role = None
        user_jurisdiction_level = None
        user_jurisdiction_area = None
        
        auth_header = request.headers.get('Authorization')
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
                payload = verify_token(token)
                if payload:
                    user_email = payload.get('email')
                    user_role = payload.get('role')
                    
                    # Get user from database to find jurisdiction
                    user = next((u for u in user_database if u['email'] == user_email), None)
                    if user:
                        user_jurisdiction_level = user.get('jurisdiction_level')
                        user_jurisdiction_area = user.get('jurisdiction_area')
                    
                    print(f"GET /potholes - User: {user_email}, Role: {user_role}, Jurisdiction: {user_jurisdiction_area}")
            except Exception as e:
                print(f"GET /potholes - Token verification failed: {e}")
                pass
        
        valid_potholes = []
        filtered_count = 0
        for pothole in pothole_database:
            if pothole.get('latitude') and pothole.get('longitude'):
                # Filter by jurisdiction if user is authority (not admin or citizen)
                authority_roles = ['state_authority', 'district_authority', 'panchayath_admin', 'municipality_admin', 'national_authority']
                if user_role and user_role in authority_roles:
                    # National authority can see all
                    if user_role == 'national_authority':
                        pass  # Show all
                    # State authority only sees their state (case-insensitive)
                    elif user_role == 'state_authority' and user_jurisdiction_area:
                        if pothole.get('state', '').lower().strip() != user_jurisdiction_area.lower().strip():
                            filtered_count += 1
                            continue
                    # District authority only sees their district (case-insensitive)
                    elif user_role == 'district_authority' and user_jurisdiction_area:
                        if pothole.get('district', '').lower().strip() != user_jurisdiction_area.lower().strip():
                            filtered_count += 1
                            continue
                    # Panchayat/Municipal admin only sees their mandal (case-insensitive)
                    elif user_role in ['panchayath_admin', 'municipality_admin'] and user_jurisdiction_area:
                        pothole_mandal = pothole.get('mandal', '').lower().strip()
                        if pothole_mandal != user_jurisdiction_area.lower().strip():
                            filtered_count += 1
                            print(f"Filtered pothole {pothole.get('id')} - mandal '{pothole_mandal}' != '{user_jurisdiction_area.lower().strip()}'")
                            continue
                
                pothole_copy = pothole.copy()
                # Add image_url if image_path exists
                if pothole_copy.get('image_path'):
                    pothole_copy['image_url'] = url_for('serve_manual_reports', filename=pothole_copy['image_path'].split('/')[-1], _external=True)
                else:
                    pothole_copy['image_url'] = ''
                valid_potholes.append(pothole_copy)
        
        print(f"Returning {len(valid_potholes)} potholes (filtered out {filtered_count})")
        
        return jsonify({
            'status': 'success',
            'potholes': valid_potholes,
            'total_count': len(valid_potholes)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mapping_bp.route('/potholes', methods=['POST'])
def add_pothole():
    """
    Add a new pothole to the map.
    
    Expected JSON:
    {
        "latitude": float,
        "longitude": float,
        "severity": string,
        "confidence": float,
        "description": string (optional),
        "image_url": string (optional)
    }
    """
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['latitude', 'longitude', 'severity', 'confidence']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create pothole record
        pothole = {
            'id': len(pothole_database) + 1,
            'latitude': float(data['latitude']),
            'longitude': float(data['longitude']),
            'severity': data['severity'],
            'confidence': float(data['confidence']),
            'description': data.get('description', ''),
            'image_url': data.get('image_url', ''),
            'reported_date': datetime.now().isoformat(),
            'status': 'reported',  # reported, verified, in_progress, fixed
            'reporter': 'anonymous',  # Replace with user system later
            # Region information for filtering
            'state': data.get('state', ''),
            'district': data.get('district', ''),
            'mandal': data.get('mandal', '')
        }
        
        # Add to database
        pothole_database.append(pothole)
        
        return jsonify({
            'status': 'success',
            'pothole': pothole,
            'message': 'Pothole added successfully'
        }), 201
        
    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mapping_bp.route('/potholes/<int:pothole_id>', methods=['PUT'])
def update_pothole_status(pothole_id):
    """
    Update pothole status (for municipal workers).
    """
    try:
        data = request.get_json()
        
        # Find pothole
        pothole = next((p for p in pothole_database if p['id'] == pothole_id), None)
        if not pothole:
            return jsonify({'error': 'Pothole not found'}), 404
        
        # Update status
        if 'status' in data:
            valid_statuses = ['reported', 'verified', 'in_progress', 'fixed']
            if data['status'] in valid_statuses:
                pothole['status'] = data['status']
                pothole['last_updated'] = datetime.now().isoformat()
                
                return jsonify({
                    'status': 'success',
                    'pothole': pothole,
                    'message': 'Pothole status updated'
                })
            else:
                return jsonify({'error': 'Invalid status'}), 400
        
        return jsonify({'error': 'No valid fields to update'}), 400
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mapping_bp.route('/potholes/severe', methods=['GET'])
def get_severe_potholes():
    """
    Get only severe potholes for priority mapping.
    """
    try:
        severe_potholes = [
            pothole for pothole in pothole_database 
            if pothole.get('severity') == 'severe_pothole' and 
               pothole.get('latitude') and pothole.get('longitude')
        ]
        
        return jsonify({
            'status': 'success',
            'severe_potholes': severe_potholes,
            'count': len(severe_potholes)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mapping_bp.route('/potholes/area', methods=['GET'])
def get_potholes_in_area():
    """
    Get potholes within a specific geographic area.
    
    Query parameters:
    - lat_min, lat_max, lng_min, lng_max
    """
    try:
        lat_min = float(request.args.get('lat_min', -90))
        lat_max = float(request.args.get('lat_max', 90))
        lng_min = float(request.args.get('lng_min', -180))
        lng_max = float(request.args.get('lng_max', 180))
        
        area_potholes = [
            pothole for pothole in pothole_database
            if (pothole.get('latitude') and pothole.get('longitude') and
                lat_min <= pothole['latitude'] <= lat_max and
                lng_min <= pothole['longitude'] <= lng_max)
        ]
        
        return jsonify({
            'status': 'success',
            'potholes': area_potholes,
            'area': {
                'lat_min': lat_min,
                'lat_max': lat_max,
                'lng_min': lng_min,
                'lng_max': lng_max
            },
            'count': len(area_potholes)
        })
        
    except ValueError:
        return jsonify({'error': 'Invalid coordinate parameters'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mapping_bp.route('/analytics', methods=['GET'])
def get_pothole_analytics():
    """
    Get analytics data for dashboard.
    """
    try:
        total_potholes = len(pothole_database)
        severity_counts = {}
        status_counts = {}
        
        for pothole in pothole_database:
            # Count by severity
            severity = pothole.get('severity', 'unknown')
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            # Count by status
            status = pothole.get('status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1
        
        return jsonify({
            'status': 'success',
            'analytics': {
                'total_potholes': total_potholes,
                'severity_breakdown': severity_counts,
                'status_breakdown': status_counts,
                'last_updated': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@mapping_bp.route('/potholes/clear', methods=['DELETE'])
def clear_potholes():
    """
    Clear all potholes from the database.
    
    Returns:
        JSON: Success message with count of cleared potholes
    """
    global pothole_database
    
    try:
        cleared_count = len(pothole_database)
        pothole_database.clear()
        
        return jsonify({
            'status': 'success',
            'message': f'Cleared {cleared_count} potholes from database',
            'cleared_count': cleared_count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
