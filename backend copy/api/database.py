"""
Database helper functions for Supabase integration
"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime
from typing import Optional, List, Dict, Any

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Use service key for admin operations, anon key for regular operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ============================================================================
# USER OPERATIONS
# ============================================================================

def create_user(email: str, password_hash: str, name: str, role: str, jurisdiction_area: Optional[str] = None) -> Dict[str, Any]:
    """Create a new user in the database"""
    try:
        user_data = {
            'email': email,
            'password_hash': password_hash,
            'name': name,
            'role': role,
            'jurisdiction_area': jurisdiction_area
        }
        
        result = supabase.table('users').insert(user_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating user: {e}")
        raise

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user by email"""
    try:
        result = supabase.table('users').select('*').eq('email', email).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting user by email: {e}")
        return None

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Get user by ID"""
    try:
        result = supabase.table('users').select('*').eq('id', user_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting user by ID: {e}")
        return None

def update_user_password(email: str, new_password_hash: str) -> bool:
    """Update user password"""
    try:
        result = supabase.table('users').update({
            'password_hash': new_password_hash
        }).eq('email', email).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error updating password: {e}")
        return False

# ============================================================================
# POTHOLE OPERATIONS
# ============================================================================

def create_pothole(pothole_data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new pothole in the database"""
    try:
        result = supabase.table('potholes').insert(pothole_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating pothole: {e}")
        raise

def get_all_potholes(jurisdiction_filter: Optional[Dict[str, str]] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all potholes, optionally filtered by jurisdiction and date range"""
    try:
        query = supabase.table('potholes').select('*')
        
        # Apply jurisdiction filters (case-insensitive)
        if jurisdiction_filter:
            if 'mandal' in jurisdiction_filter:
                query = query.ilike('mandal', jurisdiction_filter['mandal'])
            elif 'district' in jurisdiction_filter:
                query = query.ilike('district', jurisdiction_filter['district'])
            elif 'state' in jurisdiction_filter:
                query = query.ilike('state', jurisdiction_filter['state'])
        
        # Apply date range filters
        if date_from:
            query = query.gte('reported_date', date_from)
        if date_to:
            # Add one day to include the entire end date
            from datetime import datetime, timedelta
            end_date = datetime.fromisoformat(date_to.replace('Z', '+00:00')) + timedelta(days=1)
            query = query.lt('reported_date', end_date.isoformat())
        
        result = query.execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"Error getting potholes: {e}")
        return []

def get_pothole_by_id(pothole_id: int) -> Optional[Dict[str, Any]]:
    """Get pothole by ID"""
    try:
        result = supabase.table('potholes').select('*').eq('id', pothole_id).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting pothole: {e}")
        return None

def get_pothole_by_reference(reference_number: str) -> Optional[Dict[str, Any]]:
    """Get pothole by reference number"""
    try:
        result = supabase.table('potholes').select('*').eq('reference_number', reference_number).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting pothole by reference: {e}")
        return None

def update_pothole_status(pothole_id: int, status: str, updated_by: str) -> bool:
    """Update pothole status"""
    try:
        result = supabase.table('potholes').update({
            'status': status,
            'last_priority_update': datetime.utcnow().isoformat()
        }).eq('id', pothole_id).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error updating pothole status: {e}")
        return False

def update_pothole_priority(pothole_id: int, priority_boost: int, reporter_name: str) -> Optional[Dict[str, Any]]:
    """Update pothole priority score"""
    try:
        # Get current pothole
        pothole = get_pothole_by_id(pothole_id)
        if not pothole:
            return None
        
        # Calculate new values
        new_priority = pothole.get('priority_score', 1) + priority_boost
        new_report_count = pothole.get('report_count', 1) + 1
        reporters = pothole.get('reporters', [])
        reporters.append(reporter_name)
        
        # Update
        result = supabase.table('potholes').update({
            'priority_score': new_priority,
            'report_count': new_report_count,
            'reporters': reporters,
            'last_priority_update': datetime.utcnow().isoformat()
        }).eq('id', pothole_id).execute()
        
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error updating pothole priority: {e}")
        return None

def find_nearby_potholes(lat: float, lng: float, radius_meters: int = 25) -> List[Dict[str, Any]]:
    """Find potholes near a location (excluding fixed potholes)"""
    try:
        # Get all non-fixed potholes
        result = supabase.table('potholes').select('*').neq('status', 'fixed').execute()
        potholes = result.data if result.data else []
        
        # Calculate distances
        import math
        nearby = []
        for pothole in potholes:
            p_lat = pothole.get('latitude')
            p_lng = pothole.get('longitude')
            
            if p_lat and p_lng:
                # Haversine formula
                lat1, lon1, lat2, lon2 = map(math.radians, [lat, lng, p_lat, p_lng])
                dlat = lat2 - lat1
                dlon = lon2 - lon1
                a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
                c = 2 * math.asin(math.sqrt(a))
                distance = c * 6371000  # Earth radius in meters
                
                if distance <= radius_meters:
                    nearby.append({
                        'pothole': pothole,
                        'distance': round(distance, 1)
                    })
        
        # Sort by distance
        nearby.sort(key=lambda x: x['distance'])
        return nearby
    except Exception as e:
        print(f"Error finding nearby potholes: {e}")
        return []

# ============================================================================
# INVITATION CODE OPERATIONS
# ============================================================================

def create_invitation_code(code: str, role: str, jurisdiction: str, created_by: str, expires_at: str) -> Dict[str, Any]:
    """Create a new invitation code"""
    try:
        invitation_data = {
            'code': code,
            'role': role,
            'jurisdiction': jurisdiction,
            'created_by': created_by,
            'expires_at': expires_at,
            'is_used': False
        }
        
        result = supabase.table('invitation_codes').insert(invitation_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating invitation code: {e}")
        raise

def get_invitation_code(code: str) -> Optional[Dict[str, Any]]:
    """Get invitation code by code"""
    try:
        result = supabase.table('invitation_codes').select('*').eq('code', code).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error getting invitation code: {e}")
        return None

def get_all_invitation_codes() -> List[Dict[str, Any]]:
    """Get all invitation codes"""
    try:
        result = supabase.table('invitation_codes').select('*').order('created_at', desc=True).execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"Error getting invitation codes: {e}")
        return []

def mark_invitation_used(code: str, used_by: str) -> bool:
    """Mark invitation code as used"""
    try:
        result = supabase.table('invitation_codes').update({
            'is_used': True,
            'used_by': used_by,
            'used_at': datetime.utcnow().isoformat()
        }).eq('code', code).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"Error marking invitation as used: {e}")
        return False

def delete_invitation_code(code: str) -> Dict[str, Any]:
    """Delete invitation code and associated authority account if used"""
    try:
        # First, get the invitation code to check if it was used
        invitation = supabase.table('invitation_codes').select('*').eq('code', code).execute()
        
        if not invitation.data:
            return {'success': False, 'error': 'Invitation code not found'}
        
        invitation_data = invitation.data[0]
        deleted_user = None
        
        # If invitation was used, delete the associated user account
        if invitation_data.get('is_used') and invitation_data.get('used_by'):
            user_email = invitation_data['used_by']
            user_result = supabase.table('users').delete().eq('email', user_email).execute()
            if user_result.data:
                deleted_user = user_email
                print(f"Deleted authority account: {user_email}")
        
        # Delete the invitation code
        result = supabase.table('invitation_codes').delete().eq('code', code).execute()
        
        if len(result.data) > 0:
            return {
                'success': True,
                'deleted_invitation': True,
                'deleted_user': deleted_user
            }
        else:
            return {'success': False, 'error': 'Failed to delete invitation code'}
            
    except Exception as e:
        print(f"Error deleting invitation code: {e}")
        return {'success': False, 'error': str(e)}

# ============================================================================
# STORAGE OPERATIONS
# ============================================================================

def upload_pothole_image(file_data: bytes, filename: str) -> Optional[str]:
    """Upload image to Supabase storage and return public URL"""
    try:
        # Upload to storage bucket (note: bucket name has space)
        result = supabase.storage.from_('pothole images').upload(
            filename,
            file_data,
            {'content-type': 'image/jpeg'}
        )
        
        if result:
            # Get public URL
            url = supabase.storage.from_('pothole images').get_public_url(filename)
            return url
        return None
    except Exception as e:
        print(f"Error uploading image: {e}")
        return None

def delete_pothole_image(filename: str) -> bool:
    """Delete image from Supabase storage"""
    try:
        supabase.storage.from_('pothole images').remove([filename])
        return True
    except Exception as e:
        print(f"Error deleting image: {e}")
        return False
