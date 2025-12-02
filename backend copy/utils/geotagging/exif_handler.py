from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io

def convert_to_degrees(value):
    """
    Helper function to convert GPS coordinates to degrees.
    
    Args:
        value: GPS coordinate value from EXIF
        
    Returns:
        float: Decimal degrees
    """
    try:
        if isinstance(value, (list, tuple)) and len(value) >= 3:
            degrees = float(value[0])
            minutes = float(value[1])
            seconds = float(value[2])
            return degrees + (minutes / 60.0) + (seconds / 3600.0)
        elif isinstance(value, (int, float)):
            return float(value)
        else:
            return None
    except (ValueError, TypeError, ZeroDivisionError):
        return None

def get_exif_data(image_file):
    """
    Extract EXIF data from image file.
    
    Args:
        image_file: File object containing the image
        
    Returns:
        dict: EXIF data
    """
    try:
        # Save the current position of file pointer
        image_file.seek(0)
        image = Image.open(image_file)
        exif = image._getexif()
        if exif is None:
            return None
        
        exif_data = {}
        for tag_id in exif:
            tag = TAGS.get(tag_id, tag_id)
            data = exif[tag_id]
            if tag == "GPSInfo":
                gps_data = {}
                for gps_tag in data:
                    sub_tag = GPSTAGS.get(gps_tag, gps_tag)
                    gps_data[sub_tag] = data[gps_tag]
                exif_data[tag] = gps_data
            else:
                exif_data[tag] = data
                
        return exif_data
    except Exception as e:
        print(f"Error reading EXIF data: {str(e)}")
        return None

def convert_to_degrees(value):
    """
    Convert GPS coordinates to degrees.
    """
    d, m, s = value
    return d + (m / 60.0) + (s / 3600.0)

def extract_gps_info(image_file):
    """
    Extract GPS coordinates from image EXIF data.
    
    Args:
        image_file: File object containing the image
        
    Returns:
        dict: GPS coordinates with additional metadata
    """
    exif_data = get_exif_data(image_file)
    if not exif_data or 'GPSInfo' not in exif_data:
        return None
    
    gps_info = exif_data['GPSInfo']
    
    try:
        # Extract latitude
        lat = None
        lat_ref = None
        if 'GPSLatitude' in gps_info and 'GPSLatitudeRef' in gps_info:
            lat = convert_to_degrees(gps_info['GPSLatitude'])
            lat_ref = gps_info['GPSLatitudeRef']
            if lat_ref == 'S':
                lat = -lat
        
        # Extract longitude
        lon = None
        lon_ref = None
        if 'GPSLongitude' in gps_info and 'GPSLongitudeRef' in gps_info:
            lon = convert_to_degrees(gps_info['GPSLongitude'])
            lon_ref = gps_info['GPSLongitudeRef']
            if lon_ref == 'W':
                lon = -lon
        
        # Extract altitude
        altitude = None
        if 'GPSAltitude' in gps_info:
            altitude = float(gps_info['GPSAltitude'])
            if 'GPSAltitudeRef' in gps_info and gps_info['GPSAltitudeRef'] == 1:
                altitude = -altitude  # Below sea level
        
        # Extract timestamp
        timestamp = None
        if 'GPSTimeStamp' in gps_info:
            time_stamp = gps_info['GPSTimeStamp']
            if len(time_stamp) >= 3:
                hours = int(time_stamp[0])
                minutes = int(time_stamp[1])
                seconds = int(time_stamp[2])
                timestamp = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        
        if lat is not None and lon is not None:
            return {
                'latitude': round(lat, 6),
                'longitude': round(lon, 6),
                'altitude': altitude,
                'timestamp': timestamp,
                'accuracy': 'high' if altitude else 'medium',
                'source': 'exif'
            }
        
        return None
        
    except Exception as e:
        print(f"Error extracting GPS info: {str(e)}")
        return None
    
    gps_info = exif_data['GPSInfo']
    
    try:
        if 'GPSLatitude' in gps_info and 'GPSLongitude' in gps_info:
            lat = convert_to_degrees(gps_info['GPSLatitude'])
            lon = convert_to_degrees(gps_info['GPSLongitude'])
            
            # Account for N/S and E/W
            if gps_info['GPSLatitudeRef'] == 'S':
                lat = -lat
            if gps_info['GPSLongitudeRef'] == 'W':
                lon = -lon
                
            return {
                'latitude': lat,
                'longitude': lon
            }
    except Exception as e:
        print(f"Error converting GPS data: {str(e)}")
    
    return None
