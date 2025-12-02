import sys
import os
# Add project root to sys.path for absolute imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
import time
import uuid
import math
import jwt
import hashlib
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, request, jsonify
from utils.preprocessing.image_processor import process_image
from utils.geotagging.exif_handler import extract_gps_info
from models.yolo.detector import detect_potholes, detect_potholes_with_visualization, process_video_file
from models.esrgan.enhancer import enhance_image

main_bp = Blueprint('main', __name__)

# Import database operations
from api.database import (
    create_user, get_user_by_email, get_user_by_id, update_user_password,
    create_pothole, get_all_potholes as db_get_all_potholes, get_pothole_by_id, get_pothole_by_reference,
    update_pothole_status as db_update_pothole_status, update_pothole_priority,
    find_nearby_potholes, create_invitation_code, get_invitation_code,
    get_all_invitation_codes, mark_invitation_used, delete_invitation_code,
    upload_pothole_image
)

# JWT Configuration
JWT_SECRET_KEY = "pothole-prioritizer-secret-key-2025"  # In production, use environment variable
JWT_ALGORITHM = "HS256"

# Reverse geocoding helper function
def get_region_from_coordinates(latitude, longitude):
    """
    Extract state, district, and mandal from GPS coordinates using Nominatim.
    Returns actual place names from OpenStreetMap data.
    Mandal is used for panchayat/municipal level administration.
    """
    # Import at function level to avoid scope issues
    from geopy.geocoders import Nominatim
    from geopy.exc import GeocoderTimedOut, GeocoderServiceError
    import ssl
    import urllib3
    
    try:
        # Disable SSL warnings
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        
        # Create SSL context that doesn't verify certificates (for development)
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        
        import geopy.geocoders
        geopy.geocoders.options.default_ssl_context = ctx
        
        geolocator = Nominatim(user_agent="pothole-prioritizer", timeout=10)
        location = geolocator.reverse(f"{latitude}, {longitude}", language='en')
        
        if location and location.raw:
            address = location.raw.get('address', {})
            
            # Print full address components for debugging
            print(f"Full address components for {latitude},{longitude}: {address}")
            
            # In India, mandal/tehsil/taluk is typically stored in 'county' or 'state_district' in OSM
            # The hierarchy is: state > district > mandal/tehsil > village/town
            
            # Mandal: Check county first (this usually contains mandal/tehsil in India)
            # Then fall back to municipality, town, or suburb
            mandal = (
                address.get('county') or          # Often contains mandal in India
                address.get('municipality') or 
                address.get('town') or
                address.get('suburb') or
                address.get('city') or
                address.get('village') or
                'Unknown'
            )
            
            # District: state_district is the main district
            district = (
                address.get('state_district') or 
                address.get('district') or
                'Unknown'
            )
            
            # State
            state = address.get('state') or 'Unknown'
            
            print(f"Geocoded: {latitude},{longitude} -> State: {state}, District: {district}, Mandal: {mandal}")
            
            return {
                'state': state,
                'district': district,
                'mandal': mandal
            }
            
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"Geocoding service error: {e}")
    except Exception as e:
        print(f"Geocoding error: {e}")
    
    # Fallback to coordinate-based mapping if geocoding fails
    return _map_coordinates_to_india_regions(latitude, longitude)

def _map_coordinates_to_india_regions(latitude, longitude):
    """
    Simple mapping of coordinates to Indian regions for demonstration.
    In production, use proper geocoding API.
    """
    # Very basic mapping - covers just a few major Indian cities
    # In production, use a proper database or API
    
    # Sample regions for testing
    regions = [
        # Karnataka
        {
            'bounds': {'lat_min': 12.8, 'lat_max': 13.2, 'lon_min': 77.4, 'lon_max': 77.8},
            'state': 'Karnataka',
            'district': 'Bengaluru Urban',
            'mandal': 'Bengaluru'
        },
        # Delhi
        {
            'bounds': {'lat_min': 28.5, 'lat_max': 28.8, 'lon_min': 77.0, 'lon_max': 77.3},
            'state': 'Delhi',
            'district': 'Central Delhi',
            'mandal': 'Connaught Place'
        },
        # Tamil Nadu
        {
            'bounds': {'lat_min': 12.8, 'lat_max': 13.3, 'lon_min': 79.8, 'lon_max': 80.3},
            'state': 'Tamil Nadu',
            'district': 'Chennai',
            'mandal': 'Egmore'
        },
    ]
    
    # Check if coordinates fall within any region
    for region in regions:
        bounds = region['bounds']
        if (bounds['lat_min'] <= latitude <= bounds['lat_max'] and 
            bounds['lon_min'] <= longitude <= bounds['lon_max']):
            return {
                'state': region['state'],
                'district': region['district'],
                'mandal': region['mandal']
            }
    
    # Default for unknown locations (use generic naming)
    return {
        'state': f'State_{int(latitude)}',
        'district': f'District_{int(latitude)}_{int(longitude)}',
        'mandal': f'Mandal_{int(latitude)}_{int(longitude)}'
    }

def hash_password(password):
    """Hash password using werkzeug (scrypt)"""
    from werkzeug.security import generate_password_hash
    return generate_password_hash(password)

def verify_password(password, hashed_password):
    """Verify password against hash"""
    from werkzeug.security import check_password_hash
    return check_password_hash(hashed_password, password)

def generate_token(user_id, email, role):
    """Generate JWT token for user"""
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.utcnow() + timedelta(days=7)  # Token expires in 7 days
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token):
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if token:
            try:
                token = token.split(' ')[1]  # Remove 'Bearer ' prefix
                payload = verify_token(token)
                if payload:
                    request.current_user = payload
                    return f(*args, **kwargs)
            except IndexError:
                pass
        return jsonify({'error': 'Valid token required'}), 401
    return decorated

def is_valid_gps(gps):
    """Helper function to validate GPS coordinates"""
    try:
        lat = float(gps.get('latitude', 0))
        lng = float(gps.get('longitude', 0))
        return -90 <= lat <= 90 and -180 <= lng <= 180
    except Exception:
        return False

def _generate_reference_number():
    """Generate unique reference number for anonymous reports"""
    import random
    import string
    
    # Get current year
    year = datetime.now().year
    
    # Generate random 6-character alphanumeric string
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    # Format: PH-YYYY-XXXXXX
    reference = f"PH-{year}-{random_chars}"
    
    # Check if reference already exists (very unlikely but let's be safe)
    existing_pothole = get_pothole_by_reference(reference)
    while existing_pothole:
        random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        reference = f"PH-{year}-{random_chars}"
        existing_pothole = get_pothole_by_reference(reference)
    
    return reference

def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two GPS coordinates using Haversine formula"""
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    return c * r

# Removed - now using find_nearby_potholes() from database.py

@main_bp.route('/analyze', methods=['POST'])
@main_bp.route('/detect', methods=['POST'])  # Additional route for compatibility
def analyze_image():
    print("\n=== Starting image analysis ===")
    
    try:
        # Validate request
        print("\nValidating request...")
        if 'image' not in request.files:
            print("No image file in request")
            return jsonify({'error': 'No image provided', 'code': 'IMAGE_MISSING'}), 400
        
        image_file = request.files['image']
        print(f"File info: {image_file.filename} ({image_file.content_type})")
        
        # Extract manual coordinates early (before file processing)
        manual_lat = request.form.get('manual_latitude')
        manual_lng = request.form.get('manual_longitude')
        
        # Check for force_create flag (used to bypass duplicate detection)
        force_create = request.form.get('force_create', '').lower() == 'true'
        
        if not image_file.filename:
            print("Empty filename")
            return jsonify({'error': 'Empty file provided', 'code': 'EMPTY_FILE'}), 400
            
        # Validate file type
        allowed_extensions = {'jpg', 'jpeg', 'png'}
        ext = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else ''
        if ext not in allowed_extensions:
            print(f"Invalid extension: {ext}")
            return jsonify({'error': 'Invalid file type', 'code': 'INVALID_FILE_TYPE'}), 400
        
        # Process image with timing metrics
        start_time = time.time()
        
        # Extract GPS data with error handling
        print("\nExtracting GPS data...")
        try:
            image_file.seek(0)
            gps_info = extract_gps_info(image_file)
            print(f"GPS info: {gps_info}")
        except Exception as e:
            print(f"GPS extraction failed: {str(e)}")
            gps_info = {'error': str(e), 'status': 'failed'}
        
        # Process and enhance image
        print("\nProcessing image...")
        
        # Check if the image file is empty
        image_file.seek(0, 2)  # Seek to end
        if image_file.tell() == 0:
            return jsonify({
                'error': 'Empty image file',
                'code': 'EMPTY_FILE',
                'phase': 'validation'
            }), 400
            
        # Reset file pointer to start
        image_file.seek(0)
        
        # Process the image with enhanced error handling
        try:
            processed_image = process_image(image_file)
            if processed_image is None:
                raise ValueError("Process_image returned None")
            print(f"Processed image shape: {processed_image.shape}")
        except Exception as e:
            print("\nImage processing error:")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': 'Image processing failed',
                'details': str(e),
                'code': 'PROCESSING_ERROR',
                'phase': 'processing'
            }), 500
            
        # Enhance the image with error handling
        print("\nEnhancing image...")
        try:
            enhanced_image = enhance_image(processed_image)
            if enhanced_image is None:
                raise ValueError("Enhance_image returned None")
            print(f"Enhanced image shape: {enhanced_image.shape}")
        except Exception as e:
            print("\nImage enhancement error:")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': 'Image enhancement failed',
                'details': str(e),
                'code': 'ENHANCEMENT_ERROR',
                'phase': 'enhancement'
            }), 500
        
        # Detect potholes with visualization
        print("\nDetecting potholes...")
        try:
            print(f"Input image shape: {enhanced_image.shape}")
            detection_result = detect_potholes_with_visualization(enhanced_image)
            detections = detection_result['detections']
            annotated_image = detection_result['annotated_image']
            print(f"Found {len(detections)} detections")
        except Exception as e:
            print(f"Detection error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': 'Detection failed',
                'details': str(e),
                'code': 'DETECTION_ERROR'
            }), 500
        
        process_time = time.time() - start_time
        
        # Auto-add potholes to map if GPS coordinates are available
        # manual_lat and manual_lng were extracted early at the beginning of the function
        
        use_manual_coords = False
        if not (gps_info and is_valid_gps(gps_info)):
            # If manual coordinates provided and valid, use them
            try:
                if manual_lat is not None and manual_lng is not None:
                    lat = float(manual_lat)
                    lng = float(manual_lng)
                    if -90 <= lat <= 90 and -180 <= lng <= 180:
                        gps_info = {'latitude': lat, 'longitude': lng}
                        use_manual_coords = True
                        print(f"Using manual coordinates: lat={lat}, lng={lng}")
            except Exception as e:
                print(f"Failed to parse manual coordinates: {e}")
                pass

        if gps_info and is_valid_gps(gps_info):
            # Check for nearby potholes before saving (duplicate detection)
            # Skip if force_create flag is set
            from api.database import find_nearby_potholes as db_find_nearby
            
            if detections and not force_create:
                # Check if there are nearby potholes for the first detection
                nearby_potholes = db_find_nearby(gps_info['latitude'], gps_info['longitude'], radius_meters=25)
                
                if nearby_potholes:
                    # Found nearby potholes - return them for priority confirmation
                    nearby_info = []
                    for nearby in nearby_potholes:
                        pothole = nearby['pothole']
                        nearby_info.append({
                            'id': pothole.get('id'),
                            'distance': f"{nearby['distance']}m",
                            'severity': pothole.get('severity'),
                            'description': pothole.get('description'),
                            'reported_date': pothole.get('reported_date'),
                            'priority_score': pothole.get('priority_score', 1),
                            'report_count': pothole.get('report_count', 1)
                        })
                    
                    # Upload annotated image for reference
                    annotated_image_url = None
                    if annotated_image:
                        try:
                            import base64
                            image_data = base64.b64decode(annotated_image)
                            unique_filename = f"annotated_{uuid.uuid4().hex[:8]}_{int(time.time())}.jpg"
                            annotated_image_url = upload_pothole_image(image_data, unique_filename)
                            print(f"Annotated image uploaded: {annotated_image_url}")
                        except Exception as e:
                            print(f"Failed to upload annotated image: {str(e)}")
                    
                    return jsonify({
                        'status': 'nearby_found',
                        'message': f'Found {len(nearby_potholes)} pothole(s) within 25 meters',
                        'nearby_potholes': nearby_info,
                        'location': {'latitude': gps_info['latitude'], 'longitude': gps_info['longitude']},
                        'detections': detections,
                        'annotated_image': annotated_image,
                        'annotated_image_url': annotated_image_url
                    }), 200
            
            # Upload annotated image to Supabase if we have any detections
            annotated_image_url = None
            if detections and annotated_image:
                try:
                    # Convert base64 annotated image to bytes and upload to Supabase
                    import base64
                    import io
                    from PIL import Image
                    
                    # Decode base64 image
                    image_data = base64.b64decode(annotated_image)
                    
                    # Generate unique filename
                    unique_filename = f"annotated_{uuid.uuid4().hex[:8]}_{int(time.time())}.jpg"
                    
                    # Upload to Supabase Storage
                    annotated_image_url = upload_pothole_image(image_data, unique_filename)
                    print(f"Annotated image uploaded to Supabase: {annotated_image_url}")
                except Exception as e:
                    print(f"Failed to upload annotated image: {str(e)}")
            
            # Save all detected potholes (not just severe ones)
            for detection in detections:
                # Get region info
                region_info = get_region_from_coordinates(gps_info['latitude'], gps_info['longitude'])
                
                pothole_data = {
                    'reference_number': _generate_reference_number(),
                    'latitude': gps_info['latitude'],
                    'longitude': gps_info['longitude'],
                    'severity': detection['severity'],
                    'confidence': detection['confidence'],
                    'description': f"Auto-detected {detection['severity']} pothole ({detection['confidence']:.1%} confidence)",
                    'reporter_name': 'ai_system',
                    'image_url': annotated_image_url,
                    'status': 'reported',
                    'detection_method': 'manual' if use_manual_coords else 'automatic',
                    'priority_score': 1,
                    'report_count': 1,
                    'reporters': ['ai_system'],
                    'state': region_info.get('state', 'Unknown'),
                    'district': region_info.get('district', 'Unknown'),
                    'mandal': region_info.get('mandal', 'Unknown')
                }
                try:
                    create_pothole(pothole_data)
                except Exception as e:
                    print(f"Failed to save auto-detected pothole: {e}")
        else:
            print("No valid GPS or manual coordinates found. Skipping map addition for automatic detection.")
        
        return jsonify({
            'status': 'success',
            'gps_info': gps_info,
            'detections': detections,
            'annotated_image': annotated_image,
            'processing_time': process_time,
            'metrics': {
                'process_time': f'{process_time:.2f}s',
                'detection_count': len(detections)
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main_bp.route('/analyze-video', methods=['POST'])
def analyze_video():
    """Analyze video for pothole detection"""
    print("\n=== Starting video analysis ===")
    
    try:
        # Validate request
        print("\nValidating video request...")
        if 'video' not in request.files:
            print("No video file in request")
            return jsonify({'error': 'No video provided', 'code': 'VIDEO_MISSING'}), 400
        
        video_file = request.files['video']
        print(f"Video file info: {video_file.filename} ({video_file.content_type})")
        
        if not video_file.filename:
            print("Empty filename")
            return jsonify({'error': 'Empty file provided', 'code': 'EMPTY_FILE'}), 400
            
        # Validate file type
        allowed_extensions = {'mp4', 'avi', 'mov', 'mkv', 'webm'}
        ext = video_file.filename.rsplit('.', 1)[1].lower() if '.' in video_file.filename else ''
        if ext not in allowed_extensions:
            print(f"Invalid extension: {ext}")
            return jsonify({'error': 'Invalid video file type. Supported: MP4, AVI, MOV, MKV, WebM', 'code': 'INVALID_FILE_TYPE'}), 400
        
        # Check if the video file is empty
        video_file.seek(0, 2)  # Seek to end
        if video_file.tell() == 0:
            return jsonify({
                'error': 'Empty video file',
                'code': 'EMPTY_FILE',
                'phase': 'validation'
            }), 400
            
        # Reset file pointer to start
        video_file.seek(0)
        
        # Process video with timing metrics
        start_time = time.time()
        
        print("\nProcessing video...")
        try:
            # Read video file data
            video_data = video_file.read()
            print(f"Video file size: {len(video_data)} bytes")
            
            # Process the video
            result = process_video_file(video_data, video_file.filename)
            
            if not result.get('success'):
                return jsonify({
                    'error': 'Video processing failed',
                    'details': result.get('error', 'Unknown error'),
                    'code': 'PROCESSING_ERROR',
                    'phase': 'video_processing'
                }), 500
                
        except Exception as e:
            print("\nVideo processing error:")
            import traceback
            print(traceback.format_exc())
            return jsonify({
                'error': 'Video processing failed',
                'details': str(e),
                'code': 'PROCESSING_ERROR',
                'phase': 'video_processing'
            }), 500
        
        process_time = time.time() - start_time
        
        # Extract GPS data with error handling (if available in video metadata)
        print("\nExtracting GPS data...")
        try:
            video_file.seek(0)
            gps_info = extract_gps_info(video_file)
            print(f"GPS info: {gps_info}")
        except Exception as e:
            print(f"GPS extraction failed: {str(e)}")
            gps_info = {'error': str(e), 'status': 'failed'}
        
        # Try manual coordinates if GPS not available
        manual_lat = request.form.get('manual_latitude') or request.json.get('manual_latitude') if request.is_json else None
        manual_lng = request.form.get('manual_longitude') or request.json.get('manual_longitude') if request.is_json else None
        
        use_manual_coords = False
        if not (gps_info and is_valid_gps(gps_info)):
            try:
                if manual_lat is not None and manual_lng is not None:
                    lat = float(manual_lat)
                    lng = float(manual_lng)
                    if -90 <= lat <= 90 and -180 <= lng <= 180:
                        gps_info = {'latitude': lat, 'longitude': lng}
                        use_manual_coords = True
            except Exception:
                pass
        
        # Auto-add severe potholes to map if coordinates are available
        if gps_info and is_valid_gps(gps_info) and result['total_detections'] > 0:
            detection_summary = result.get('detection_summary', {})
            severe_count = detection_summary.get('critical', 0) + detection_summary.get('high', 0)
            
            if severe_count > 0:
                try:
                    # Upload preview/annotated image to Supabase if available
                    annotated_image_url = None
                    preview_image = result.get('preview_image')
                    if preview_image:
                        try:
                            import base64
                            # Decode base64 preview image
                            image_data = base64.b64decode(preview_image)
                            
                            # Generate unique filename
                            unique_filename = f"video_preview_{uuid.uuid4().hex[:8]}_{int(time.time())}.jpg"
                            
                            # Upload to Supabase Storage
                            annotated_image_url = upload_pothole_image(image_data, unique_filename)
                            print(f"Video preview uploaded to Supabase: {annotated_image_url}")
                        except Exception as e:
                            print(f"Failed to upload video preview: {str(e)}")
                    
                    # Add video detection to database
                    region_info = get_region_from_coordinates(gps_info['latitude'], gps_info['longitude'])
                    
                    pothole_data = {
                        'reference_number': _generate_reference_number(),
                        'latitude': gps_info['latitude'],
                        'longitude': gps_info['longitude'],
                        'severity': 'critical' if detection_summary.get('critical', 0) > 0 else 'high',
                        'confidence': 0.9,
                        'description': f"Video analysis detected {result['total_detections']} potholes across {result['frames_processed']} frames",
                        'reporter_name': 'ai_system',
                        'image_url': annotated_image_url,
                        'status': 'reported',
                        'detection_method': 'manual' if use_manual_coords else 'automatic',
                        'priority_score': 1,
                        'report_count': 1,
                        'reporters': ['ai_system'],
                        'state': region_info.get('state', 'Unknown'),
                        'district': region_info.get('district', 'Unknown'),
                        'mandal': region_info.get('mandal', 'Unknown')
                    }
                    try:
                        create_pothole(pothole_data)
                    except Exception as e:
                        print(f"Failed to save video detection: {e}")
                    
                except Exception as e:
                    print(f"Failed to save video detection: {str(e)}")
        
        return jsonify({
            'status': 'success',
            'type': 'video',
            'gps_info': gps_info,
            'total_detections': result['total_detections'],
            'frames_processed': result['frames_processed'],
            'detection_summary': result['detection_summary'],
            'all_detections': result.get('all_detections', []),  # Include individual detections
            'preview_image': result.get('preview_image'),
            'output_video_base64': result.get('output_video_base64'),
            'output_filename': result.get('output_filename'),
            'processing_time': process_time,
            'metrics': {
                'process_time': f'{process_time:.2f}s',
                'total_detections': result['total_detections'],
                'frames_processed': result['frames_processed'],
                'detection_rate': f"{result['total_detections'] / max(result['frames_processed'], 1):.3f} detections/frame"
            }
        })
        
    except Exception as e:
        print(f"Video analysis error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@main_bp.route('/report', methods=['POST'])
def manual_report():
    """Manual pothole reporting endpoint"""
    print("\n=== Manual pothole report ===")
    
    try:
        # Extract form data
        latitude = request.form.get('latitude')
        longitude = request.form.get('longitude')
        severity = request.form.get('severity')
        description = request.form.get('description')
        reporter_name = request.form.get('reporter_name')
        
        # Validate required fields
        if not all([latitude, longitude, severity, description, reporter_name]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Convert latitude and longitude to float
        try:
            lat = float(latitude)
            lng = float(longitude)
        except ValueError:
            return jsonify({'error': 'Invalid coordinates'}), 400
        
        # Validate severity
        valid_severities = ['low', 'medium', 'high', 'critical']
        if severity not in valid_severities:
            return jsonify({'error': 'Invalid severity level'}), 400
        
        # Check for force_create flag
        force_create = request.form.get('force_create', '').lower() == 'true'
        
        # Check for nearby potholes (within 25 meters) only if not forcing creation
        if not force_create:
            from api.database import find_nearby_potholes as db_find_nearby
            nearby_potholes = db_find_nearby(lat, lng, radius_meters=25)
            
            if nearby_potholes:
                # Found nearby potholes - return them for priority confirmation
                nearby_info = []
                for nearby in nearby_potholes:
                    pothole = nearby['pothole']
                    nearby_info.append({
                        'id': pothole.get('id'),
                        'distance': f"{nearby['distance']}m",
                        'severity': pothole.get('severity'),
                        'description': pothole.get('description'),
                        'reported_date': pothole.get('reported_date'),
                        'priority_score': pothole.get('priority_score', 1),
                        'report_count': pothole.get('report_count', 1)
                    })
                
                return jsonify({
                    'status': 'nearby_found',
                    'message': f'Found {len(nearby_potholes)} pothole(s) within 25 meters',
                    'nearby_potholes': nearby_info,
                    'location': {'latitude': lat, 'longitude': lng},
                    'reporter': reporter_name
                }), 200
        
        # Handle optional image - upload to Supabase Storage
        image_url = None
        if 'image' in request.files:
            image_file = request.files['image']
            if image_file.filename:
                try:
                    # Generate unique filename
                    file_extension = image_file.filename.rsplit('.', 1)[1].lower() if '.' in image_file.filename else 'jpg'
                    unique_filename = f"pothole_{uuid.uuid4().hex[:8]}_{int(time.time())}.{file_extension}"
                    
                    # Read file data
                    image_file.seek(0)
                    file_data = image_file.read()
                    
                    # Upload to Supabase Storage
                    image_url = upload_pothole_image(file_data, unique_filename)
                    print(f"Image uploaded to Supabase: {image_url}")
                except Exception as e:
                    print(f"Failed to upload image to Supabase: {str(e)}")
                    # Continue without image rather than failing
        
        # Generate unique reference number for tracking
        reference_number = _generate_reference_number()
        
        # Get region information from coordinates
        region_info = get_region_from_coordinates(lat, lng)
        
        # Create pothole entry for Supabase
        pothole_data = {
            'reference_number': reference_number,
            'latitude': lat,
            'longitude': lng,
            'severity': severity,
            'confidence': 100.0,  # Manual reports have 100% confidence
            'description': description,
            'reporter_name': reporter_name,
            'image_url': image_url,
            'status': 'reported',
            'detection_method': 'manual',
            'priority_score': 1,
            'report_count': 1,
            'reporters': [reporter_name],
            'state': region_info['state'],
            'district': region_info['district'],
            'mandal': region_info['mandal']
        }
        
        # Save to Supabase
        pothole_entry = create_pothole(pothole_data)
        
        print(f"Manual report added: {pothole_entry}")
        
        return jsonify({
            'status': 'success',
            'message': 'Pothole reported successfully',
            'pothole': pothole_entry
        })
        
    except Exception as e:
        print(f"Error in manual report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/track/<reference_number>', methods=['GET'])
def track_pothole(reference_number):
    """Track pothole by reference number"""
    try:
        # Find pothole by reference number
        pothole = get_pothole_by_reference(reference_number)
        
        if not pothole:
            return jsonify({
                'error': 'Reference number not found',
                'message': 'No pothole found with this reference number'
            }), 404
        
        return jsonify({
            'status': 'success',
            'pothole': pothole
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main_bp.route('/update-priority', methods=['POST'])
def update_priority_endpoint():
    """Update priority score for existing pothole"""
    try:
        data = request.get_json()
        pothole_id = data.get('pothole_id')
        priority_boost = data.get('priority_boost', 1)  # Default +1 priority
        reporter_name = data.get('reporter_name')
        
        if not pothole_id:
            return jsonify({'error': 'Missing pothole_id'}), 400
        
        # Update pothole priority in database
        from api.database import update_pothole_priority as db_update_priority
        pothole = db_update_priority(int(pothole_id), priority_boost, reporter_name or 'anonymous')
        
        if not pothole:
            return jsonify({'error': 'Pothole not found or update failed'}), 404
        
        print(f"Updated pothole #{pothole_id} priority to {pothole['priority_score']}")
        
        return jsonify({
            'status': 'success',
            'message': 'Priority updated successfully',
            'pothole': pothole
        })
        
    except Exception as e:
        print(f"Error updating priority: {str(e)}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

@main_bp.route('/public-stats', methods=['GET'])
def get_public_stats():
    """Get public statistics for landing page - no authentication required"""
    try:
        all_potholes = db_get_all_potholes()
        total_detected = len(all_potholes)
        
        # Count by status
        fixed_count = len([p for p in all_potholes if p.get('status') == 'fixed'])
        in_progress_count = len([p for p in all_potholes if p.get('status') == 'in_progress'])
        reported_count = len([p for p in all_potholes if p.get('status') == 'reported'])
        
        # Calculate average response time (for fixed potholes)
        fixed_potholes = [p for p in all_potholes if p.get('status') == 'fixed']
        avg_response_days = 0
        if fixed_potholes:
            total_days = 0
            count_with_dates = 0
            for pothole in fixed_potholes:
                reported_date = pothole.get('reported_date') or pothole.get('created_at')
                # Assume fixed within last update time (simplified calculation)
                if reported_date:
                    try:
                        from datetime import datetime
                        if isinstance(reported_date, str):
                            reported_dt = datetime.fromisoformat(reported_date.replace('Z', '+00:00'))
                        else:
                            reported_dt = reported_date
                        # Use current time as proxy for fix time (in reality you'd track this)
                        now = datetime.now(reported_dt.tzinfo)
                        days_diff = (now - reported_dt).days
                        if days_diff >= 0:  # Only count valid durations
                            total_days += days_diff
                            count_with_dates += 1
                    except:
                        pass
            
            if count_with_dates > 0:
                avg_response_days = round(total_days / count_with_dates, 1)
        
        stats = {
            'total_detected': total_detected,
            'fixed_count': fixed_count,
            'pending_count': reported_count + in_progress_count,
            'avg_response_days': avg_response_days if avg_response_days > 0 else 3.2  # Default if no data
        }
        
        return jsonify({'stats': stats})
        
    except Exception as e:
        print(f"Error fetching public stats: {str(e)}")
        # Return default stats on error
        return jsonify({'stats': {
            'total_detected': 0,
            'fixed_count': 0,
            'pending_count': 0,
            'avg_response_days': 0
        }})

@main_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """Get analytics data for dashboard"""
    try:
        all_potholes = db_get_all_potholes()
        total_potholes = len(all_potholes)
        severe_potholes = len([p for p in all_potholes if p.get('severity') in ['critical', 'high']])
        
        analytics = {
            'summary': {
                'total_potholes': total_potholes,
                'average_priority_score': 75.5 if total_potholes > 0 else 0,
                'urgent_repairs_needed': severe_potholes,
                'high_priority_count': severe_potholes
            },
            'severity_distribution': {
                'critical': len([p for p in all_potholes if p.get('severity') == 'critical']),
                'high': len([p for p in all_potholes if p.get('severity') == 'high']),
                'medium': len([p for p in all_potholes if p.get('severity') == 'medium']),
                'low': len([p for p in all_potholes if p.get('severity') == 'low'])
            },
            'detection_trends': [
                {'date': '2025-08-01', 'count': 5},
                {'date': '2025-08-02', 'count': 8},
                {'date': '2025-08-03', 'count': 12},
                {'date': '2025-08-04', 'count': 6},
                {'date': '2025-08-05', 'count': 10},
                {'date': '2025-08-06', 'count': total_potholes}
            ]
        }
        
        return jsonify({'analytics': analytics})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main_bp.route('/potholes', methods=['GET'])
def get_all_potholes():
    """Get all potholes for map display - filtered by user jurisdiction and date range"""
    try:
        # Get user info from Authorization header
        user_role = None
        user_jurisdiction_area = None
        jurisdiction_filter = None
        
        # Get date range from query parameters
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        auth_header = request.headers.get('Authorization')
        print(f"GET /potholes - Authorization header present: {auth_header is not None}")
        print(f"GET /potholes - Date range: {date_from} to {date_to}")
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
                payload = verify_token(token)
                if payload:
                    user_email = payload.get('email')
                    user_role = payload.get('role')
                    
                    # Get user from database to find jurisdiction
                    user = get_user_by_email(user_email)
                    if user:
                        user_jurisdiction_area = user.get('jurisdiction_area')
                    
                    print(f"GET /potholes - User: {user_email}, Role: {user_role}, Jurisdiction: {user_jurisdiction_area}")
                    
                    # Set up jurisdiction filter for database query
                    authority_roles = ['state_authority', 'district_authority', 'panchayath_admin', 'municipality_admin']
                    if user_role and user_role in authority_roles and user_jurisdiction_area:
                        if user_role == 'state_authority':
                            jurisdiction_filter = {'state': user_jurisdiction_area}
                        elif user_role == 'district_authority':
                            jurisdiction_filter = {'district': user_jurisdiction_area}
                        elif user_role in ['panchayath_admin', 'municipality_admin']:
                            jurisdiction_filter = {'mandal': user_jurisdiction_area}
            except Exception as e:
                print(f"GET /potholes - Token verification failed: {e}")
                pass
        
        # Get potholes from database with jurisdiction filter and date range
        print(f"GET /potholes - Jurisdiction filter: {jurisdiction_filter}")
        potholes = db_get_all_potholes(jurisdiction_filter, date_from, date_to)
        print(f"GET /potholes - Found {len(potholes)} potholes after filtering")
        
        # Add backward compatibility for frontend
        for pothole in potholes:
            # Ensure image_path field exists (frontend compatibility)
            if pothole.get('image_url'):
                if not pothole.get('image_path'):
                    pothole['image_path'] = pothole['image_url']
                
                # Add camelCase versions for frontend
                # Check if it's an annotated image (contains 'annotated_' in the filename)
                image_url = pothole['image_url']
                if 'annotated_' in image_url:
                    pothole['annotatedImageUrl'] = image_url
                else:
                    pothole['imageUrl'] = image_url
        
        print(f"Returning {len(potholes)} potholes")
        
        return jsonify({
            'potholes': potholes,
            'total_count': len(potholes)
        })
    except Exception as e:
        print(f"Error in get_all_potholes: {e}")
        return jsonify({'error': str(e)}), 500

@main_bp.route('/seed-test-data', methods=['POST'])
def seed_test_data():
    """Add some test potholes for demonstration"""
    try:
        # Add sample potholes if database is empty
        all_potholes = db_get_all_potholes()
        if len(all_potholes) == 0:
            test_potholes = [
                {
                    'id': 1,
                    'lat': 40.7128,
                    'lng': -74.0060,
                    'latitude': 40.7128,  # Backend uses both formats
                    'longitude': -74.0060,
                    'severity': 'high',
                    'status': 'reported',
                    'description': 'Large pothole detected by AI',
                    'reportedAt': '2025-10-21',
                    'confidence': 94.2,
                    'timestamp': datetime.now().isoformat()
                },
                {
                    'id': 2,
                    'lat': 40.7150,
                    'lng': -74.0070,
                    'latitude': 40.7150,
                    'longitude': -74.0070,
                    'severity': 'medium',
                    'status': 'in-progress',
                    'description': 'Medium pothole on side street',
                    'reportedAt': '2025-10-20',
                    'confidence': 87.5,
                    'timestamp': datetime.now().isoformat()
                }
            ]
            # Note: This endpoint is deprecated - use API to create real potholes instead
            
        all_potholes = db_get_all_potholes()
        return jsonify({
            'message': f'Database has {len(all_potholes)} potholes',
            'potholes': all_potholes
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main_bp.route('/prioritize', methods=['POST'])
def prioritize_potholes():
    """Prioritize potholes based on severity and impact"""
    try:
        # Get all potholes from database
        all_potholes = db_get_all_potholes()
        
        # Simple prioritization algorithm
        prioritized_potholes = []
        
        for i, pothole in enumerate(all_potholes):
            severity = pothole.get('severity', 'low')
            confidence = pothole.get('confidence', 0)
            
            # Calculate priority score
            severity_scores = {'critical': 100, 'high': 75, 'medium': 50, 'low': 25}
            priority_score = severity_scores.get(severity, 25) + (confidence * 0.2)
            
            # Assign priority level
            if priority_score >= 90:
                priority_level = 'urgent'
            elif priority_score >= 70:
                priority_level = 'high'
            elif priority_score >= 50:
                priority_level = 'medium'
            else:
                priority_level = 'low'
            
            pothole_copy = pothole.copy()
            pothole_copy.update({
                'priority_score': priority_score,
                'priority_level': priority_level,
                'priority_rank': i + 1,
                'estimated_urgency': f"{priority_level.title()} - Complete within {'1 day' if priority_level == 'urgent' else '1 week' if priority_level == 'high' else '1 month'}"
            })
            
            prioritized_potholes.append(pothole_copy)
        
        # Sort by priority score descending
        prioritized_potholes.sort(key=lambda x: x['priority_score'], reverse=True)
        
        # Update priority ranks
        for i, pothole in enumerate(prioritized_potholes):
            pothole['priority_rank'] = i + 1
        
        return jsonify({
            'status': 'success',
            'prioritized_potholes': prioritized_potholes,
            'total_count': len(prioritized_potholes),
            'algorithm': 'severity_confidence_based'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================
# AUTHORITY AUTHENTICATION ENDPOINTS
# =============================================

# Removed - now using Supabase database

def generate_invitation_code_data(role, created_by, jurisdiction=''):
    """Generate a new invitation code"""
    import random
    import string
    
    # Generate 8-character code
    random_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    code = f"GOV-{random_code}"
    
    # Set expiration (30 days from now)
    expires_at = (datetime.now() + timedelta(days=30)).isoformat()
    
    # Create invitation code in database
    invitation = create_invitation_code(code, role, jurisdiction, created_by, expires_at)
    return invitation

# Removed - now using get_invitation_code() from database.py

@main_bp.route('/auth/register', methods=['POST'])
def register_authority():
    """Register new authority user (requires invitation code for government roles)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password', 'role']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        name = data['name'].strip()
        email = data['email'].lower().strip()
        password = data['password']
        role = data['role']
        jurisdiction_level = data.get('jurisdictionLevel', '')
        jurisdiction_area = data.get('jurisdictionArea', '')
        invitation_code = data.get('invitationCode', '')
        
        # Validate email format (basic check)
        if '@' not in email or '.' not in email:
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if user already exists
        existing_user = get_user_by_email(email)
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), 400
        
        # Validate role
        valid_roles = ['citizen', 'panchayath_admin', 'municipality_admin', 'district_authority', 'state_authority', 'national_authority', 'district_admin', 'state_admin', 'national_admin']
        if role not in valid_roles:
            return jsonify({'error': 'Invalid role'}), 400
        
        # SECURITY CHECK: Require invitation code for government roles
        government_roles = ['panchayath_admin', 'municipality_admin', 'district_authority', 'state_authority', 'national_authority', 'district_admin', 'state_admin', 'national_admin']
        if role in government_roles:
            if not invitation_code:
                return jsonify({'error': 'Invitation code is required for government account registration'}), 403
            
            # Validate invitation code
            invitation = get_invitation_code(invitation_code)
            if not invitation or invitation['is_used']:
                return jsonify({'error': 'Invalid or already used invitation code'}), 403
            
            # Check if expired (use UTC timezone-aware datetime)
            from datetime import timezone
            expires_at = datetime.fromisoformat(invitation['expires_at'].replace('Z', '+00:00'))
            now_utc = datetime.now(timezone.utc)
            if expires_at < now_utc:
                return jsonify({'error': 'Invitation code has expired'}), 403
            
            # Mark invitation as used
            mark_invitation_used(invitation_code, email)
            
            print(f"Invitation code {invitation_code} used for {email} ({role})")
        
        # Citizens can register freely (no invitation code needed)
        # This maintains the dual system: open citizen registration + restricted authority registration
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Create new user in database
        new_user = create_user(
            email=email,
            password_hash=hashed_password,
            name=name,
            role=role,
            jurisdiction_area=jurisdiction_area
        )
        
        if not new_user:
            return jsonify({'error': 'Failed to create user'}), 500
        
        user_id = new_user['id']
        
        # Generate JWT token
        token = generate_token(user_id, email, role)
        
        # Return user data (without password_hash)
        user_response = new_user.copy()
        user_response.pop('password_hash', None)
        
        print(f"New authority registered: {email} ({role})")
        
        return jsonify({
            'status': 'success',
            'message': 'Registration successful',
            'user': user_response,
            'token': token
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@main_bp.route('/auth/login', methods=['POST'])
def login_authority():
    """Login authority user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].lower().strip()
        password = data['password']
        
        # Find user by email
        user = get_user_by_email(email)
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Verify password
        print(f"Login attempt for: {email}")
        print(f"Password provided: {password[:3]}...")
        print(f"Hash from DB: {user['password_hash'][:30]}...")
        password_valid = verify_password(password, user['password_hash'])
        print(f"Password verification result: {password_valid}")
        
        if not password_valid:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check if user is active
        if not user.get('is_active', True):
            return jsonify({'error': 'Account is deactivated'}), 401
        
        # Generate JWT token
        token = generate_token(user['id'], user['email'], user['role'])
        
        # Return user data (without password_hash)
        user_response = user.copy()
        user_response.pop('password_hash', None)
        
        print(f"Authority logged in: {email} ({user['role']})")
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'user': user_response,
            'token': token
        })
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

# In-memory storage for password reset tokens (for demo purposes)
password_reset_tokens = {}

def generate_reset_token():
    """Generate a unique reset token"""
    return str(uuid.uuid4())

@main_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    """Request password reset email"""
    try:
        data = request.get_json()
        
        if not data.get('email'):
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].lower().strip()
        
        # Find user by email
        user = get_user_by_email(email)
        
        # Always return success (security best practice - don't reveal if email exists)
        # But only generate token if user exists
        if user:
            # Generate reset token
            reset_token = generate_reset_token()
            
            # Store token with expiration (1 hour)
            password_reset_tokens[reset_token] = {
                'email': email,
                'user_id': str(user['id']),  # Convert UUID to string
                'expires_at': (datetime.now() + timedelta(hours=1)).isoformat(),
                'used': False
            }
            
            # In a real application, you would send an email here
            # For demo purposes, we'll just log it
            reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
            print(f"Password reset requested for {email}")
            print(f"Reset link (demo): {reset_link}")
            
            # TODO: Implement email sending
            # send_email(email, "Password Reset", f"Click here to reset: {reset_link}")
        
        return jsonify({
            'status': 'success',
            'message': 'If an account exists with this email, you will receive password reset instructions'
        })
        
    except Exception as e:
        print(f"Forgot password error: {str(e)}")
        return jsonify({'error': 'Failed to process request'}), 500

@main_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    """Reset password using token"""
    try:
        data = request.get_json()
        
        if not data.get('token') or not data.get('password'):
            return jsonify({'error': 'Token and new password are required'}), 400
        
        token = data['token']
        new_password = data['password']
        
        # Validate password length
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Check if token exists and is valid
        if token not in password_reset_tokens:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        reset_data = password_reset_tokens[token]
        
        # Check if token is expired
        if datetime.fromisoformat(reset_data['expires_at']) < datetime.now():
            del password_reset_tokens[token]
            return jsonify({'error': 'Reset token has expired'}), 400
        
        # Check if token was already used
        if reset_data['used']:
            return jsonify({'error': 'Reset token has already been used'}), 400
        
        # Find user and update password
        user_email = reset_data['email']
        success = update_user_password(user_email, hash_password(new_password))
        
        if success:
            reset_data['used'] = True
            print(f"Password reset successful for {user_email}")
            
            return jsonify({
                'status': 'success',
                'message': 'Password has been reset successfully'
            })
        
        return jsonify({'error': 'Failed to update password'}), 500
        
    except Exception as e:
        print(f"Reset password error: {str(e)}")
        return jsonify({'error': 'Failed to reset password'}), 500

@main_bp.route('/auth/verify', methods=['GET'])
@token_required
def verify_authority():
    """Verify JWT token and return user info"""
    try:
        user_id = request.current_user['user_id']
        
        # Find user by ID
        user = get_user_by_id(str(user_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Return user data (without password_hash)
        user_response = user.copy()
        user_response.pop('password_hash', None)
        
        return jsonify({
            'status': 'success',
            'user': user_response
        })
        
    except Exception as e:
        print(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Token verification failed'}), 500

@main_bp.route('/auth/generate-invitation', methods=['POST'])
@token_required
def generate_invitation():
    """Generate invitation code for new authority (admin only)"""
    try:
        user_id = request.current_user['user_id']
        
        # Find current user
        current_user = get_user_by_id(str(user_id))
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if user has permission to generate invitations
        admin_roles = ['state_admin', 'national_admin', 'district_admin']
        if current_user['role'] not in admin_roles:
            return jsonify({'error': 'Insufficient privileges to generate invitation codes'}), 403
        
        data = request.get_json()
        target_role = data.get('role', 'panchayath_admin')
        jurisdiction = data.get('jurisdiction', '')
        
        # Generate invitation code
        invitation = generate_invitation_code_data(target_role, current_user['email'], jurisdiction)
        
        print(f"Invitation code generated: {invitation['code']} for role {target_role} by {current_user['email']}")
        
        return jsonify({
            'status': 'success',
            'invitation': invitation
        })
        
    except Exception as e:
        print(f"Invitation generation error: {str(e)}")
        return jsonify({'error': 'Failed to generate invitation code'}), 500

@main_bp.route('/auth/invitations', methods=['GET'])
@token_required
def list_invitations():
    """List all invitation codes (admin only)"""
    try:
        user_id = request.current_user['user_id']
        
        # Find current user
        current_user = get_user_by_id(str(user_id))
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if user has permission to view invitations
        admin_roles = ['state_admin', 'national_admin', 'district_admin']
        if current_user['role'] not in admin_roles:
            return jsonify({'error': 'Insufficient privileges to view invitation codes'}), 403
        
        # Get all invitation codes from database
        invitations = get_all_invitation_codes()
        
        return jsonify({
            'status': 'success',
            'invitations': invitations
        })
        
    except Exception as e:
        print(f"List invitations error: {str(e)}")
        return jsonify({'error': 'Failed to list invitation codes'}), 500

@main_bp.route('/auth/invitations/<code>', methods=['DELETE'])
@token_required
def delete_invitation(code):
    """Delete invitation code (admin only)"""
    try:
        user_id = request.current_user['user_id']
        
        # Find current user
        current_user = get_user_by_id(str(user_id))
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if user has permission to delete invitations
        admin_roles = ['state_admin', 'national_admin', 'district_admin']
        if current_user['role'] not in admin_roles:
            return jsonify({'error': 'Insufficient privileges to delete invitation codes'}), 403
        
        # Delete invitation code and associated account from database
        result = delete_invitation_code(code)
        
        if not result['success']:
            error_msg = result.get('error', 'Failed to delete invitation code or code not found')
            return jsonify({'error': error_msg}), 404
        
        print(f"Invitation code deleted: {code} by {current_user['email']}")
        
        # Build response message
        message = 'Invitation code deleted successfully'
        if result.get('deleted_user'):
            message += f" and associated authority account ({result['deleted_user']}) removed"
            print(f"Authority account deleted: {result['deleted_user']}")
        
        return jsonify({
            'status': 'success',
            'message': message,
            'deleted_user': result.get('deleted_user')
        })
        
    except Exception as e:
        print(f"Delete invitation error: {str(e)}")
        return jsonify({'error': 'Failed to delete invitation code'}), 500

@main_bp.route('/potholes/<int:pothole_id>', methods=['PUT'])
@token_required
def update_pothole_status(pothole_id):
    """
    Update pothole status.
    Only authorities can update potholes.
    """
    try:
        current_user = request.current_user
        
        # Check if user is authority
        authority_roles = ['panchayath_admin', 'municipality_admin', 
                          'district_authority', 'state_authority', 'national_authority']
        if current_user['role'] not in authority_roles:
            return jsonify({'error': 'Only authorities can update pothole status'}), 403
        
        # Get request data
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status is required'}), 400
        
        # Validate status
        valid_statuses = ['reported', 'verified', 'in_progress', 'fixed']
        if new_status not in valid_statuses:
            return jsonify({'error': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'}), 400
        
        # Find pothole
        pothole = get_pothole_by_id(pothole_id)
        
        if not pothole:
            return jsonify({'error': 'Pothole not found'}), 404
        
        # Check if pothole is already marked as 'fixed' - prevent any changes
        current_status = pothole.get('status')
        if current_status == 'fixed':
            return jsonify({
                'error': 'Cannot update status. This pothole is marked as Fixed and the status is permanent.',
                'message': 'Fixed potholes cannot be modified to maintain data integrity.'
            }), 403
        
        # Check if user has permission to update this pothole (jurisdiction check)
        user = get_user_by_email(current_user['email'])
        if user and current_user['role'] != 'national_authority':
            # Check jurisdiction
            user_jurisdiction = user.get('jurisdiction_area', '').lower().strip()
            pothole_jurisdiction = None
            
            if current_user['role'] == 'state_authority':
                pothole_jurisdiction = pothole.get('state', '').lower().strip()
            elif current_user['role'] == 'district_authority':
                pothole_jurisdiction = pothole.get('district', '').lower().strip()
            elif current_user['role'] in ['panchayath_admin', 'municipality_admin']:
                # Panchayat and Municipal admins use mandal-level jurisdiction
                pothole_jurisdiction = pothole.get('mandal', '').lower().strip()
            
            # Debug logging
            print(f"Jurisdiction check - User: {current_user['email']}, Role: {current_user['role']}")
            print(f"User jurisdiction: '{user_jurisdiction}', Pothole jurisdiction: '{pothole_jurisdiction}'")
            
            # Case-insensitive jurisdiction matching (disabled for panchayat/municipal for now)
            if (user_jurisdiction and pothole_jurisdiction and user_jurisdiction != pothole_jurisdiction):
                return jsonify({'error': f'You can only update potholes in your jurisdiction ({user_jurisdiction}). This pothole is in {pothole_jurisdiction}.'}), 403
        
        # Update status in database
        old_status = pothole.get('status')
        success = db_update_pothole_status(pothole_id, new_status, current_user['email'])
        
        if not success:
            return jsonify({'error': 'Failed to update pothole status'}), 500
        
        # Get updated pothole
        pothole = get_pothole_by_id(pothole_id)
        
        print(f"Pothole {pothole_id} status updated from {old_status} to {new_status} by {current_user['email']}")
        
        return jsonify({
            'status': 'success',
            'message': f'Pothole status updated to {new_status}',
            'pothole': pothole
        }), 200
        
    except Exception as e:
        import traceback
        print(f"Update pothole status error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to update pothole status: {str(e)}'}), 500