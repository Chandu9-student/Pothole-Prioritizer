#!/usr/bin/env python3
"""
Training script for the pothole detection model.
"""
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from models.yolo.detector import PotholeDetector

def main():
    """
    Main training function
    """
    print("Starting pothole detector training...")
    
    # Initialize detector
    detector = PotholeDetector()
    
    try:
        # Start training with 50 epochs
        detector.train(epochs=50)
    except KeyboardInterrupt:
        print("\nTraining interrupted by user")
    except Exception as e:
        print(f"Error during training: {str(e)}")
        raise
    
if __name__ == "__main__":
    main()
