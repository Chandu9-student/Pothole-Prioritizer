# Dataset configuration
DATASET_CONFIG = {
    'pothole600': {
        'url': 'https://universe.roboflow.com/ds/YOUR_POTHOLE600_KEY',
        'format': 'yolov8',
        'classes': ['pothole']
    },
    'pothole1k': {
        'url': 'YOUR_POTHOLE1K_URL',
        'format': 'yolov8',
        'classes': ['pothole']
    },
    'potholex': {
        'url': 'YOUR_POTHOLEX_URL',
        'format': 'yolov8',
        'classes': ['pothole']
    }
}

# Model configuration
MODEL_CONFIG = {
    'detection': {
        'base_model': 'yolov8n.pt',
        'seg_model': 'yolov8n-seg.pt',
        'epochs': 100,
        'batch_size': 16,
        'image_size': 640
    },
    'enhancement': {
        'model': 'ESRGAN',
        'scale': 4,
        'arch': 'RRDB_net'
    }
}
