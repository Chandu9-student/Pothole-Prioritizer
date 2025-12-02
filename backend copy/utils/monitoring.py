import logging
import time
from typing import Dict, List, Tuple, Any
import numpy as np
from pathlib import Path
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('model_performance.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ModelMonitor:
    def __init__(self, metrics_file: str = 'model_metrics.json'):
        self.metrics_file = Path(metrics_file)
        self.metrics: Dict[str, List[float]] = {
            'inference_times': [],
            'detection_counts': [],
            'confidence_scores': [],
            'processing_times': []
        }
        self.load_metrics()

    def load_metrics(self):
        """Load existing metrics from file"""
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r') as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.error(f"Failed to load metrics: {e}")

    def save_metrics(self):
        """Save current metrics to file"""
        try:
            with open(self.metrics_file, 'w') as f:
                json.dump(self.metrics, f)
        except Exception as e:
            logger.error(f"Failed to save metrics: {e}")

    def log_inference(
        self,
        processing_time: float,
        num_detections: int,
        confidence_scores: List[float],
        inference_time: float
    ):
        """Log a single inference event"""
        self.metrics['inference_times'].append(inference_time)
        self.metrics['detection_counts'].append(num_detections)
        self.metrics['confidence_scores'].extend(confidence_scores)
        self.metrics['processing_times'].append(processing_time)
        
        # Log the event
        logger.info(
            f"Inference completed - Time: {inference_time:.3f}s, "
            f"Detections: {num_detections}, "
            f"Avg Confidence: {np.mean(confidence_scores):.3f}"
        )
        
        self.save_metrics()

    def get_statistics(self) -> Dict[str, Any]:
        """Calculate and return current statistics"""
        if not self.metrics['inference_times']:
            return {
                'status': 'No data available'
            }

        avg_inference_time = np.mean(self.metrics['inference_times'])
        avg_detections = np.mean(self.metrics['detection_counts'])
        avg_confidence = np.mean(self.metrics['confidence_scores'])
        total_inferences = len(self.metrics['inference_times'])

        return {
            'average_inference_time': float(avg_inference_time),
            'average_detections_per_image': float(avg_detections),
            'average_confidence': float(avg_confidence),
            'total_inferences': total_inferences,
            'performance_metrics': {
                'inference_time_p95': float(np.percentile(self.metrics['inference_times'], 95)),
                'max_inference_time': float(np.max(self.metrics['inference_times'])),
                'min_inference_time': float(np.min(self.metrics['inference_times']))
            }
        }

# Global monitor instance
monitor = ModelMonitor()

def log_inference_metrics(
    processing_time: float,
    num_detections: int,
    image_size: Tuple[int, int, int],
    confidence_scores: List[float] = None
) -> None:
    """Log metrics for a single inference"""
    if confidence_scores is None:
        confidence_scores = []
    
    inference_time = processing_time - 0.1  # Subtract approximate preprocessing time
    
    monitor.log_inference(
        processing_time=processing_time,
        num_detections=num_detections,
        confidence_scores=confidence_scores,
        inference_time=inference_time
    )

def get_model_stats() -> Dict[str, Any]:
    """Get current model statistics"""
    return monitor.get_statistics()
