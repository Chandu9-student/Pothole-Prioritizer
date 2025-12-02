import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from utils.data.dataset_downloader import DatasetDownloader

def main():
    # Initialize downloader
    downloader = DatasetDownloader()
    
    # Download all datasets
    downloader.download_all()

if __name__ == "__main__":
    main()
