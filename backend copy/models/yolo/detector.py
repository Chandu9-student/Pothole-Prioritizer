from ultralytics import YOLO
import os
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import tempfile
import time

_model = None

def get_model():
    global _model
    if _model is None:
        # Use relative path that works both locally and on Render
        # Get the directory where this file is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up two levels to reach 'backend copy' directory
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        model_path = os.path.join(backend_dir, 'best.pt')
        
        print(f"Looking for model at: {model_path}")
        
        if os.path.exists(model_path):
            print(f"Loading model weights from {model_path}")
            _model = YOLO(model_path)
            print(f"Loaded model classes: {_model.names}")
        else:
            print(f"Model not found at {model_path}, trying yolov8n.pt in same directory")
            fallback_path = os.path.join(backend_dir, 'yolov8n.pt')
            if os.path.exists(fallback_path):
                print(f"Loading fallback model from {fallback_path}")
                _model = YOLO(fallback_path)
            else:
                print("No local models found, using default YOLOv8n")
                _model = YOLO('yolov8n.pt')
    return _model

def detect_potholes(image):
    if image is None:
        raise ValueError("Input image is None")
    
    print(f"Detecting potholes in image of shape {image.shape}")
    model = get_model()
    # Ensure image is RGB numpy array
    if isinstance(image, np.ndarray) and image.shape[2] == 3:
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    # Define class names as per your trained model
    class_names = ["minor_pothole", "medium_pothole", "severe_pothole"]
    results = model(image, verbose=False)

    detections = []
    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = box.xyxyn[0].tolist()
            confidence = box.conf[0].item()
            class_idx = int(box.cls[0].item())
            class_name = class_names[class_idx] if class_idx < len(class_names) else f"class_{class_idx}"

            # Calculate area for additional severity assessment
            width = (x2 - x1) * 100
            height = (y2 - y1) * 100
            area = width * height
            
            # Filter out very low confidence detections (likely false positives)
            if confidence < 0.4:
                print(f"Skipping low confidence detection: class={class_name}, confidence={confidence:.2f}")
                continue
            
            # Map YOLO model classes to base severity levels
            # Your model classes: ["minor_pothole", "medium_pothole", "severe_pothole"]
            base_severity_mapping = {
                "minor_pothole": 1,
                "medium_pothole": 2, 
                "severe_pothole": 3
            }
            
            # Get base severity score from model prediction
            base_severity = base_severity_mapping.get(class_name, 2)
            
            # Adjust severity based on pothole size/area
            # Large potholes should be more critical regardless of model prediction
            area_multiplier = 1.0
            if area > 20:  # Very large pothole
                area_multiplier = 1.5
            elif area > 10:  # Large pothole
                area_multiplier = 1.2
            elif area > 5:   # Medium-large pothole
                area_multiplier = 1.1
            
            # CONFIDENCE-BASED SEVERITY CLASSIFICATION
            # Initialize variables for logging
            confidence_multiplier = 1.0
            final_severity_score = 0.0
            
            # Pure confidence-based severity mapping
            if confidence >= 0.85:     # 85%+ confidence = critical
                severity = "critical"
                confidence_multiplier = 4.0  # For logging purposes
                final_severity_score = base_severity * area_multiplier * confidence_multiplier
            elif confidence >= 0.75:  # 75-84% confidence = high
                severity = "high"
                confidence_multiplier = 3.0  # For logging purposes
                final_severity_score = base_severity * area_multiplier * confidence_multiplier
            elif confidence >= 0.50:  # 50-74% confidence = medium
                severity = "medium"
                confidence_multiplier = 2.0  # For logging purposes
                final_severity_score = base_severity * area_multiplier * confidence_multiplier
            else:                      # Below 50% confidence = low
                severity = "low"
                confidence_multiplier = 1.0  # For logging purposes
                final_severity_score = base_severity * area_multiplier * confidence_multiplier
            
            print(f"Detection: class={class_name}, confidence={confidence:.2f}, area={area:.1f}, base_severity={base_severity}, area_mult={area_multiplier:.1f}, conf_mult={confidence_multiplier:.1f}, final_score={final_severity_score:.2f}, severity={severity}")

            detections.append({
                "class": class_name,
                "bbox": [x1 * 100, y1 * 100, x2 * 100, y2 * 100],  # Frontend expects [x1, y1, x2, y2]
                "confidence": confidence,
                "severity": severity
            })

    print(f"Found {len(detections)} potholes")
    return detections

def draw_detections_on_image(image, detections):
    """
    Draw bounding boxes and labels on the image for detected potholes
    """
    # Convert numpy array to PIL Image if needed
    if isinstance(image, np.ndarray):
        if len(image.shape) == 3 and image.shape[2] == 3:
            # Convert BGR to RGB for PIL
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(image)
    else:
        pil_image = image
    
    # Create a drawing context
    draw = ImageDraw.Draw(pil_image)
    
    # Get image dimensions
    img_width, img_height = pil_image.size
    
    # Define colors for different severity levels (brighter, more visible)
    severity_colors = {
        'critical': '#FF0000',  # Bright Red
        'high': '#FF8C00',      # Dark Orange  
        'medium': '#FFD700',    # Gold
        'low': '#00FF00'        # Bright Green
    }
    
    # Try to load a font, fallback to default if not available
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
            except:
                font = ImageFont.load_default()
    
    print(f"Drawing {len(detections)} detections on image of size {img_width}x{img_height}")
    
    for i, detection in enumerate(detections):
        # Convert normalized coordinates to pixel coordinates
        x1 = int((detection['bbox'][0] / 100) * img_width)
        y1 = int((detection['bbox'][1] / 100) * img_height)
        x2 = int((detection['bbox'][2] / 100) * img_width)
        y2 = int((detection['bbox'][3] / 100) * img_height)
        
        print(f"Detection {i+1}: bbox=({x1},{y1},{x2},{y2}), severity={detection['severity']}")
        
        # Get color for this severity
        color = severity_colors.get(detection['severity'], '#FFFFFF')
        
        # Draw multiple bounding boxes for better visibility
        for width in range(5, 0, -1):
            draw.rectangle([x1, y1, x2, y2], outline=color, width=width)
        
        # Add a semi-transparent fill to make the detection more visible
        overlay = Image.new('RGBA', pil_image.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        
        # Convert hex color to RGB and add transparency
        hex_color = color.lstrip('#')
        rgb_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        rgba_color = rgb_color + (60,)  # 60/255 transparency
        
        overlay_draw.rectangle([x1, y1, x2, y2], fill=rgba_color)
        pil_image = Image.alpha_composite(pil_image.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(pil_image)  # Recreate draw object
        
        # Create label text
        confidence_pct = detection['confidence'] * 100
        label = f"🚨 Pothole #{i+1}\n🔴 {detection['severity'].upper()}\n📊 {confidence_pct:.1f}%"
        
        # Calculate text size and background
        bbox = draw.textbbox((0, 0), label, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Position label above the bounding box, or below if too close to top
        label_x = max(0, x1)  # Ensure label doesn't go off screen
        label_y = y1 - text_height - 10 if y1 > text_height + 15 else y2 + 10
        
        # Ensure label fits within image bounds
        if label_x + text_width + 12 > img_width:
            label_x = img_width - text_width - 12
        if label_y + text_height + 8 > img_height:
            label_y = y1 - text_height - 10
        if label_y < 0:
            label_y = y2 + 10
            
        # Draw background rectangle for text with border
        padding = 6
        bg_rect = [label_x - padding, label_y - padding, 
                   label_x + text_width + padding, label_y + text_height + padding]
        
        # Draw black border for better visibility
        draw.rectangle(bg_rect, fill='black', outline='white', width=2)
        
        # Draw colored background
        inner_rect = [label_x - padding + 2, label_y - padding + 2,
                      label_x + text_width + padding - 2, label_y + text_height + padding - 2]
        draw.rectangle(inner_rect, fill=color, outline=color)
        
        # Draw text in white with black outline for better visibility
        # Draw text outline
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx != 0 or dy != 0:
                    draw.text((label_x + dx, label_y + dy), label, fill='black', font=font)
        
        # Draw main text
        draw.text((label_x, label_y), label, fill='white', font=font)
        
    print(f"✅ Finished drawing {len(detections)} annotations")
    
    return pil_image

def detect_potholes_with_visualization(image):
    """
    Detect potholes and return both detections and annotated image
    """
    detections = detect_potholes(image)
    annotated_image = draw_detections_on_image(image, detections)
    
    # Convert PIL image to base64 for frontend
    buffer = BytesIO()
    annotated_image.save(buffer, format='JPEG', quality=95)
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return {
        'detections': detections,
        'annotated_image': f"data:image/jpeg;base64,{img_base64}",
        'detection_count': len(detections)
    }

def detect_potholes_in_video(video_path, output_path=None):
    """
    Process video file for pothole detection
    
    Args:
        video_path: Path to input video file
        output_path: Path for output video (optional, will create temp file if not provided)
    
    Returns:
        dict: {
            'output_video_path': str,
            'total_detections': int, 
            'frames_processed': int,
            'detection_summary': dict
        }
    """
    print(f"🎬 Starting video processing: {video_path}")
    
    # Open video file
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")
    
    # Get video properties
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    print(f"📹 Video info: {frame_width}x{frame_height}, {fps} FPS, {total_frames} frames")
    
    # Create output video writer
    if output_path is None:
        # Create temporary file for output
        temp_dir = tempfile.gettempdir()
        timestamp = int(time.time())
        output_path = os.path.join(temp_dir, f"pothole_detection_{timestamp}.mp4")
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (frame_width, frame_height))
    
    # Process video frame by frame
    frame_count = 0
    total_detections = 0
    detection_summary = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    all_detections = []  # Store all individual detections with frame info
    
    print(f"🔄 Processing video frames...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        frame_count += 1
        
        # Process every frame (or every Nth frame for performance)
        # For now, process every frame for maximum accuracy
        try:
            # Convert frame to RGB for YOLO
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Detect potholes in current frame
            detections = detect_potholes(frame_rgb)
            
            if detections:
                total_detections += len(detections)
                
                # Store individual detections with frame information
                for i, detection in enumerate(detections):
                    severity = detection.get('severity', 'low')
                    detection_summary[severity] = detection_summary.get(severity, 0) + 1
                    
                    # Add frame information to each detection
                    frame_detection = {
                        **detection,  # Copy all original detection data
                        'frame_number': frame_count,
                        'frame_timestamp': frame_count / fps,  # Time in seconds
                        'detection_id': f"frame_{frame_count}_detection_{i+1}"
                    }
                    all_detections.append(frame_detection)
                
                # Draw detections on frame
                annotated_pil = draw_detections_on_image(frame_rgb, detections)
                
                # Convert back to BGR for video output
                annotated_frame = cv2.cvtColor(np.array(annotated_pil), cv2.COLOR_RGB2BGR)
                
                # Add frame counter and detection info
                cv2.putText(annotated_frame, f"Frame: {frame_count}/{total_frames}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(annotated_frame, f"Detections: {len(detections)}", 
                           (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            else:
                # No detections, use original frame
                annotated_frame = frame
                cv2.putText(annotated_frame, f"Frame: {frame_count}/{total_frames}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(annotated_frame, "No potholes detected", 
                           (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            
            # Write frame to output video
            out.write(annotated_frame)
            
            # Progress logging
            if frame_count % 30 == 0:  # Log every 30 frames
                progress = (frame_count / total_frames) * 100
                print(f"📊 Progress: {progress:.1f}% ({frame_count}/{total_frames} frames)")
                
        except Exception as e:
            print(f"❌ Error processing frame {frame_count}: {str(e)}")
            # Write original frame on error
            out.write(frame)
    
    # Clean up
    cap.release()
    out.release()
    
    print(f"✅ Video processing complete!")
    print(f"📁 Output saved to: {output_path}")
    print(f"📊 Total detections: {total_detections}")
    print(f"🎯 Detection summary: {detection_summary}")
    print(f"📋 Individual detections collected: {len(all_detections)}")
    
    return {
        'output_video_path': output_path,
        'total_detections': total_detections,
        'frames_processed': frame_count,
        'detection_summary': detection_summary,
        'all_detections': all_detections  # Include individual detections
    }

def process_video_file(video_file_data, filename):
    """
    Process video file uploaded from frontend
    
    Args:
        video_file_data: Binary video file data
        filename: Original filename
    
    Returns:
        dict: Video processing results with base64 encoded output (first frame) and stats
    """
    print(f"🎬 Processing uploaded video: {filename}")
    
    # Create temporary file for input video
    temp_dir = tempfile.gettempdir()
    timestamp = int(time.time())
    input_path = os.path.join(temp_dir, f"input_video_{timestamp}_{filename}")
    
    # Save uploaded video data to temporary file
    with open(input_path, 'wb') as f:
        f.write(video_file_data)
    
    try:
        # Process the video
        result = detect_potholes_in_video(input_path)
        
        # Get the first frame of the output video for preview
        cap = cv2.VideoCapture(result['output_video_path'])
        ret, first_frame = cap.read()
        cap.release()
        
        preview_base64 = None
        if ret:
            # Convert first frame to base64 for frontend preview
            _, buffer = cv2.imencode('.jpg', first_frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            preview_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Read the output video file for download
        with open(result['output_video_path'], 'rb') as f:
            output_video_data = f.read()
            output_video_base64 = base64.b64encode(output_video_data).decode('utf-8')
        
        return {
            'success': True,
            'total_detections': result['total_detections'],
            'frames_processed': result['frames_processed'],
            'detection_summary': result['detection_summary'],
            'all_detections': result['all_detections'],  # Include individual detections
            'preview_image': f"data:image/jpeg;base64,{preview_base64}" if preview_base64 else None,
            'output_video_base64': output_video_base64,
            'output_filename': f"detected_{filename}"
        }
        
    except Exception as e:
        print(f"❌ Error processing video: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }
    
    finally:
        # Clean up temporary files
        try:
            if os.path.exists(input_path):
                os.remove(input_path)
            if 'result' in locals() and os.path.exists(result['output_video_path']):
                os.remove(result['output_video_path'])
        except Exception as cleanup_error:
            print(f"⚠️ Warning: Could not clean up temporary files: {cleanup_error}")
