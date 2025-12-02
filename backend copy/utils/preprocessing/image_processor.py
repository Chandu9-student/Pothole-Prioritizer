import cv2
import numpy as np
from PIL import Image
import io

def process_image(image_file):
    """
    Process the input image for better pothole detection.
    
    Args:
        image_file: File object containing the image
        
    Returns:
        numpy.ndarray: Processed image
    """
    print("\n=== Starting image processing ===")
    
    try:
        # Debug information
        print("File info:")
        print(f"Name: {image_file.filename}")
        print(f"Content Type: {image_file.content_type}")
        
        # Use PIL to open the image
        print("\nTrying to open with PIL...")
        try:
            image_file.seek(0)
            pil_image = Image.open(image_file)
            print("PIL image info:")
            print(f"Format: {pil_image.format}")
            print(f"Mode: {pil_image.mode}")
            print(f"Size: {pil_image.size}")
            
            # Convert to RGB mode if needed
            if pil_image.mode != 'RGB':
                print(f"Converting from {pil_image.mode} to RGB")
                pil_image = pil_image.convert('RGB')
        except Exception as e:
            print(f"PIL open error: {str(e)}")
            raise
            
        # Convert PIL image to numpy array
        print("\nConverting to numpy array...")
        try:
            image_array = np.array(pil_image)
            print(f"Array info:")
            print(f"Shape: {image_array.shape}")
            print(f"Type: {image_array.dtype}")
            print(f"Min/Max values: {image_array.min()}, {image_array.max()}")
        except Exception as e:
            print(f"Numpy conversion error: {str(e)}")
            raise
            
        if len(image_array.shape) != 3:
            raise ValueError(f"Image must be RGB (got shape {image_array.shape})")
            
        # Convert color space
        print("\nConverting color space...")
        try:
            if image_array.shape[2] == 3:  # Color image
                # Convert to BGR for OpenCV
                if pil_image.mode == 'RGB':
                    image = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
                else:
                    image = image_array  # Assume it's already BGR
                print(f"Final image shape: {image.shape}")
            else:
                raise ValueError(f"Invalid number of channels: {image_array.shape[2]}")
                
            # Basic preprocessing steps
            # 1. Resize if too large
            max_dim = 1024
            height, width = image.shape[:2]
            if height > max_dim or width > max_dim:
                scale = max_dim / max(height, width)
                image = cv2.resize(image, None, fx=scale, fy=scale)
                print(f"Resized image to {image.shape}")
            
            # 2. Convert to RGB for YOLOv8
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            print(f"Converted to RGB: {image_rgb.shape}")
            
            return image_rgb
            
        except Exception as e:
            print(f"Color conversion error: {str(e)}")
            raise
        
        # Basic preprocessing steps
        # 1. Resize if too large
        max_dim = 1024
        height, width = image.shape[:2]
        if height > max_dim or width > max_dim:
            scale = max_dim / max(height, width)
            image = cv2.resize(image, None, fx=scale, fy=scale)
            print(f"Resized image to {image.shape}")
        
        # 2. Convert to RGB (YOLOv8 expects RGB)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Return the processed image
        print("Image processing complete")
        return image_rgb
        
    except Exception as e:
        import traceback
        print(f"Error in process_image: {str(e)}")
        print(traceback.format_exc())
        raise
