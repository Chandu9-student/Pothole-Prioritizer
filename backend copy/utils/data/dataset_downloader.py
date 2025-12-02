import os
import requests
import gdown
import zipfile
import shutil
import kagglehub
from pathlib import Path
from tqdm import tqdm

class DatasetDownloader:
    def __init__(self):
        self.base_dir = Path(__file__).parent.parent.parent / 'datasets'
        self.base_dir.mkdir(exist_ok=True)
        
    def download_file(self, url, filename):
        """Download file with progress bar"""
        response = requests.get(url, stream=True)
        total_size = int(response.headers.get('content-length', 0))
        
        with open(filename, 'wb') as file, tqdm(
            desc=filename.name,
            total=total_size,
            unit='iB',
            unit_scale=True
        ) as pbar:
            for data in response.iter_content(chunk_size=1024):
                size = file.write(data)
                pbar.update(size)

    def download_gdrive(self, file_id, output):
        """Download from Google Drive"""
        url = f'https://drive.google.com/uc?id={file_id}'
        gdown.download(url, str(output), quiet=False)

    def download_pothole600(self):
        """
        Download Pothole-600 dataset from Kaggle
        """
        dataset_dir = self.base_dir / 'pothole600'
        if dataset_dir.exists():
            print("Pothole-600 dataset already exists")
            return dataset_dir
            
        dataset_dir.mkdir(exist_ok=True)
        
        try:
            print("Downloading Pothole-600 dataset from Kaggle...")
            print("Downloading dataset using kagglehub...")
            kaggle_path = kagglehub.dataset_download("rangerfan/pothole-600")
            
            # Handle download results
            if isinstance(kaggle_path, str):
                kaggle_path = [kaggle_path]
            
            # Walk through each path and try to locate and copy files
            for path in kaggle_path:
                path = Path(path)
                print(f"Processing path: {path}")
                
                # Function to recursively copy directory with structure
                def copy_with_structure(src: Path, dst: Path):
                    if src.is_file():
                        print(f"Copying file: {src}")
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, dst)
                        return True
                    elif src.is_dir():
                        copied = False
                        for item in src.glob('*'):
                            # Get the relative path from src root to maintain structure
                            rel_path = item.relative_to(path)
                            copied |= copy_with_structure(item, dataset_dir / rel_path)
                        return copied
                    return False
                
                if path.is_dir():
                    # Find the pothole600 directory
                    pothole_dir = path
                    if (path / 'pothole600').exists():
                        pothole_dir = path / 'pothole600'
                        
                    print(f"Scanning directory: {pothole_dir}")
                    if not copy_with_structure(pothole_dir, dataset_dir):
                        print(f"No files found in {pothole_dir}")
                elif path.is_file():
                    print(f"Copying file: {path}")
                    shutil.copy2(path, dataset_dir / path.name)
                else:
                    print(f"Path does not exist: {path}")
                
            # Verify if any files were copied
            files = list(dataset_dir.glob('**/*'))
            files = [f for f in files if f.is_file()]
            if not files:
                raise Exception("No files were copied to the dataset directory")
                
            print(f"Downloaded Pothole-600 dataset to: {dataset_dir}")
            print(f"Files downloaded: {len(files)}")
            return dataset_dir
            
        except Exception as e:
            print(f"Error downloading Pothole-600: {str(e)}")
            if dataset_dir.exists():
                shutil.rmtree(dataset_dir)
            raise

    def download_pothole1k(self):
        """
        Download Pothole-1K (PothRGBD) dataset from Mendeley Data
        """
        dataset_dir = self.base_dir / 'pothole1k'
        if dataset_dir.exists():
            print("Pothole-1K dataset already exists")
            return dataset_dir
            
        dataset_dir.mkdir(exist_ok=True)
        
        print("Downloading Pothole-1K dataset from Mendeley Data...")
        print("\nIMPORTANT: Manual download required")
        print("1. Visit: https://data.mendeley.com/datasets/kfth5g2xk3/2")
        print("2. Download the dataset ZIP file")
        print(f"3. Extract the contents to: {dataset_dir}")
        print("\nNote: Mendeley Data requires a free account to download.")
        print("After downloading and extracting, the dataset will be ready to use.")
        
        return dataset_dir
        
    def download_pothole_severity(self):
        """
        Download annotated potholes with severity levels dataset from Kaggle
        """
        dataset_dir = self.base_dir / 'pothole_severity'
        if dataset_dir.exists():
            print("Pothole Severity dataset already exists")
            return dataset_dir
            
        dataset_dir.mkdir(exist_ok=True)
        
        try:
            print("Downloading Pothole Severity dataset from Kaggle...")
            print("Downloading dataset using kagglehub...")
            kaggle_path = kagglehub.dataset_download("idanbaru/annotated-potholes-with-severity-levels")
            
            # Handle download results
            if isinstance(kaggle_path, str):
                kaggle_path = [kaggle_path]
            
            # Walk through each path and try to locate and copy files
            for path in kaggle_path:
                path = Path(path)
                print(f"Processing path: {path}")
                
                # Function to recursively copy directory with structure
                def copy_with_structure(src: Path, dst: Path):
                    if src.is_file():
                        print(f"Copying file: {src}")
                        dst.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, dst)
                        return True
                    elif src.is_dir():
                        copied = False
                        for item in src.glob('*'):
                            # Get the relative path from src root to maintain structure
                            rel_path = item.relative_to(path)
                            copied |= copy_with_structure(item, dataset_dir / rel_path)
                        return copied
                    return False
                
                if path.is_dir():
                    print(f"Scanning directory: {path}")
                    if not copy_with_structure(path, dataset_dir):
                        print(f"No files found in {path}")
                elif path.is_file():
                    print(f"Copying file: {path}")
                    shutil.copy2(path, dataset_dir / path.name)
                else:
                    print(f"Path does not exist: {path}")
                
            # Verify if any files were copied
            files = list(dataset_dir.glob('**/*'))
            files = [f for f in files if f.is_file()]
            if not files:
                raise Exception("No files were copied to the dataset directory")
                
            print(f"Downloaded Pothole Severity dataset to: {dataset_dir}")
            print(f"Files downloaded: {len(files)}")
            return dataset_dir
            
        except Exception as e:
            print(f"Error downloading Pothole Severity dataset: {str(e)}")
            if dataset_dir.exists():
                shutil.rmtree(dataset_dir)
            raise

    def download_potholex(self):
        """
        Download PotholeX dataset
        """
        dataset_dir = self.base_dir / 'potholex'
        if dataset_dir.exists():
            print("PotholeX dataset already exists")
            return dataset_dir
            
        dataset_dir.mkdir(exist_ok=True)
        
        # Replace with actual download URL
        URL = "YOUR_POTHOLEX_URL"
        
        try:
            self.download_file(URL, dataset_dir / 'potholex.zip')
            # Extract dataset
            with zipfile.ZipFile(dataset_dir / 'potholex.zip', 'r') as zip_ref:
                zip_ref.extractall(dataset_dir)
            return dataset_dir
        except Exception as e:
            print(f"Error downloading PotholeX: {str(e)}")
            return None

    def download_kitti_subset(self):
        """
        Download relevant subset of KITTI dataset
        """
        dataset_dir = self.base_dir / 'kitti'
        if dataset_dir.exists():
            print("KITTI dataset already exists")
            return dataset_dir
            
        dataset_dir.mkdir(exist_ok=True)
        
        # KITTI download URLs
        URLS = {
            'images': 'https://s3.eu-central-1.amazonaws.com/avg-kitti/data_object_image_2.zip',
            'labels': 'https://s3.eu-central-1.amazonaws.com/avg-kitti/data_object_label_2.zip'
        }
        
        try:
            for name, url in URLS.items():
                self.download_file(url, dataset_dir / f'{name}.zip')
                # Extract dataset
                with zipfile.ZipFile(dataset_dir / f'{name}.zip', 'r') as zip_ref:
                    zip_ref.extractall(dataset_dir)
            return dataset_dir
        except Exception as e:
            print(f"Error downloading KITTI: {str(e)}")
            return None

    def download_all(self):
        """
        Download all datasets
        """
        print("Downloading all datasets...")
        datasets = {
            'Pothole-600': self.download_pothole600(),
            'Pothole-1K': self.download_pothole1k(),
            'PotholeX': self.download_potholex(),
            'KITTI': self.download_kitti_subset()
        }
        
        print("\nDownload Summary:")
        for name, path in datasets.items():
            status = "✓" if path else "✗"
            print(f"{name}: {status}")
