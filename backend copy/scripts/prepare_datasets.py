import os
import xml.etree.ElementTree as ET
import numpy as np
from PIL import Image
import shutil
import cv2

def convert_xml_to_yolo(xml_path, image_width, image_height, class_map):
    """Convert XML annotation to YOLO format."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    
    yolo_annotations = []
    
    for obj in root.findall('object'):
        severity_elem = obj.find('n')
        if severity_elem is None or severity_elem.text is None:
            print(f"Warning: No severity found in {xml_path}")
            continue
            
        severity = severity_elem.text.lower()  # Get severity level
        class_id = class_map.get(severity, -1)
        
        if class_id == -1:
            print(f"Warning: Unknown class {severity} in {xml_path}")
            continue
            
        bbox = obj.find('bndbox')
        xmin = float(bbox.find('xmin').text)
        ymin = float(bbox.find('ymin').text)
        xmax = float(bbox.find('xmax').text)
        ymax = float(bbox.find('ymax').text)
        
        # Convert to YOLO format (normalized)
        x_center = ((xmin + xmax) / 2) / image_width
        y_center = ((ymin + ymax) / 2) / image_height
        width = (xmax - xmin) / image_width
        height = (ymax - ymin) / image_height
        
        yolo_annotations.append(f"{class_id} {x_center} {y_center} {width} {height}")
    
    return yolo_annotations

def convert_mask_to_yolo(mask_path, class_id):
    """Convert mask image to YOLO format."""
    mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mask is None:
        return []
        
    # Find contours in the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    height, width = mask.shape
    yolo_annotations = []
    
    for contour in contours:
        # Get bounding box
        x, y, w, h = cv2.boundingRect(contour)
        
        # Convert to YOLO format (normalized)
        x_center = (x + w/2) / width
        y_center = (y + h/2) / height
        width = w / width
        height = h / height
        
        yolo_annotations.append(f"{class_id} {x_center} {y_center} {width} {height}")
    
    return yolo_annotations

def prepare_datasets(base_path):
    """Prepare datasets for training."""
    # Create dataset directories
    dataset_path = os.path.join(base_path, "prepared_dataset")
    os.makedirs(dataset_path, exist_ok=True)
    
    for split in ['train', 'val', 'test']:
        os.makedirs(os.path.join(dataset_path, split, 'images'), exist_ok=True)
        os.makedirs(os.path.join(dataset_path, split, 'labels'), exist_ok=True)
    
    # Class mapping
    class_map = {
        'minor_pothole': 0,
        'medium_pothole': 1,
        'severe_pothole': 2
    }
    
    # Process pothole severity dataset
    severity_path = os.path.join(base_path, "pothole_severity")
    if os.path.exists(severity_path):
        annotations_dir = os.path.join(severity_path, "annotations")
        images_dir = os.path.join(severity_path, "images")
        
        # Split files (80% train, 10% val, 10% test)
        files = [f[:-4] for f in os.listdir(annotations_dir) if f.endswith('.xml')]
        np.random.shuffle(files)
        
        n_files = len(files)
        train_files = files[:int(0.8 * n_files)]
        val_files = files[int(0.8 * n_files):int(0.9 * n_files)]
        test_files = files[int(0.9 * n_files):]
        
        # Process each split
        for split_name, split_files in [('train', train_files), ('val', val_files), ('test', test_files)]:
            for file_base in split_files:
                xml_path = os.path.join(annotations_dir, f"{file_base}.xml")
                img_path = os.path.join(images_dir, f"{file_base}.jpg")
                
                if not os.path.exists(img_path):
                    print(f"Warning: Image {img_path} not found")
                    continue
                
                # Get image dimensions
                with Image.open(img_path) as img:
                    width, height = img.size
                
                # Convert annotations
                yolo_annotations = convert_xml_to_yolo(xml_path, width, height, class_map)
                
                if yolo_annotations:
                    # Copy image
                    shutil.copy2(img_path, os.path.join(dataset_path, split_name, 'images', f"{file_base}.jpg"))
                    
                    # Save annotations
                    with open(os.path.join(dataset_path, split_name, 'labels', f"{file_base}.txt"), 'w') as f:
                        f.write('\n'.join(yolo_annotations))
    
    # Process pothole600 dataset
    pothole600_path = os.path.join(base_path, "pothole600/pothole600")
    if os.path.exists(pothole600_path):
        for split in ['training', 'validation', 'testing']:
            yolo_split = {'training': 'train', 'validation': 'val', 'testing': 'test'}[split]
            
            images_dir = os.path.join(pothole600_path, split, 'rgb')
            masks_dir = os.path.join(pothole600_path, split, 'label')
            
            if not os.path.exists(images_dir) or not os.path.exists(masks_dir):
                continue
                
            for img_file in os.listdir(images_dir):
                if not img_file.endswith('.png'):
                    continue
                    
                mask_path = os.path.join(masks_dir, img_file)
                if not os.path.exists(mask_path):
                    continue
                    
                # Convert mask to YOLO format
                yolo_annotations = convert_mask_to_yolo(mask_path, class_id=1)  # Using class 1 (medium) for pothole600
                
                if yolo_annotations:
                    # Copy image
                    shutil.copy2(os.path.join(images_dir, img_file),
                               os.path.join(dataset_path, yolo_split, 'images', f"pothole600_{img_file}"))
                    
                    # Save annotations
                    with open(os.path.join(dataset_path, yolo_split, 'labels', f"pothole600_{img_file[:-4]}.txt"), 'w') as f:
                        f.write('\n'.join(yolo_annotations))
    
    # Process pothole1k dataset
    pothole1k_path = os.path.join(base_path, "pothole1k/pothole-mix")
    if os.path.exists(pothole1k_path):
        for split in ['training', 'validation', 'testing']:
            yolo_split = {'training': 'train', 'validation': 'val', 'testing': 'test'}[split]
            
            for subset in ['crack500', 'gaps384', 'edmcrack600', 'pothole600']:
                subset_path = os.path.join(pothole1k_path, split, subset)
                if not os.path.exists(subset_path):
                    continue
                    
                images_dir = os.path.join(subset_path, 'images')
                masks_dir = os.path.join(subset_path, 'masks')
                
                if not os.path.exists(images_dir) or not os.path.exists(masks_dir):
                    continue
                    
                for img_file in os.listdir(images_dir):
                    base_name = os.path.splitext(img_file)[0]
                    mask_path = os.path.join(masks_dir, f"{base_name}.png")
                    
                    if not os.path.exists(mask_path):
                        continue
                        
                    # Convert mask to YOLO format
                    yolo_annotations = convert_mask_to_yolo(mask_path, class_id=1)  # Using class 1 (medium) for pothole1k
                    
                    if yolo_annotations:
                        # Copy image
                        shutil.copy2(os.path.join(images_dir, img_file),
                                   os.path.join(dataset_path, yolo_split, 'images', f"pothole1k_{subset}_{img_file}"))
                        
                        # Save annotations
                        with open(os.path.join(dataset_path, yolo_split, 'labels',
                                             f"pothole1k_{subset}_{base_name}.txt"), 'w') as f:
                            f.write('\n'.join(yolo_annotations))
    
    # Create dataset.yaml
    yaml_content = f"""
path: {os.path.abspath(dataset_path)}  # absolute path to dataset
train: train/images  # train images relative to path
val: val/images  # val images relative to path
test: test/images  # test images relative to path

# Classes for pothole severity detection
names:
  0: minor_pothole
  1: medium_pothole
  2: severe_pothole
"""

    model_config_dir = os.path.join(os.path.dirname(base_path), "models", "yolo", "config")
    os.makedirs(model_config_dir, exist_ok=True)
    with open(os.path.join(model_config_dir, "pothole.yaml"), 'w') as f:
        f.write(yaml_content.strip())

if __name__ == "__main__":
    base_path = os.path.dirname(os.path.dirname(__file__))
    prepare_datasets(os.path.join(base_path, "datasets"))
    
    # Create config directory if it doesn't exist
    config_dir = os.path.join(base_path, "models", "yolo", "config")
    os.makedirs(config_dir, exist_ok=True)
