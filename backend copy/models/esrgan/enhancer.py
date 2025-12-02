import cv2
import numpy as np

def enhance_image(image):
    """
    Enhance low-light or poor quality images.
    
    Args:
        image: numpy.ndarray in RGB format
        
    Returns:
        numpy.ndarray: Enhanced image
    """
    if image is None:
        raise ValueError("Input image is None")
        
    print(f"Enhancing image of shape {image.shape}")
    
    # Convert to LAB color space
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    
    # Apply CLAHE to L channel
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
    l = clahe.apply(l)
    
    # Merge channels
    enhanced_lab = cv2.merge((l,a,b))
    
    # Convert back to RGB
    enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
    return enhanced
