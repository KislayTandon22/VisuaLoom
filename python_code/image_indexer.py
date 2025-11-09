"""
image_indexer.py
----------------
Scans directories for image files (including RAW formats) and indexes metadata.
"""

import os
from typing import List, Dict, Any
from PIL import Image, UnidentifiedImageError
from datetime import datetime
from file_manager import load_json, save_json
from config import IMAGE_DB_PATH

# -----------------------------
# 1️⃣ Supported image formats
# -----------------------------
SUPPORTED_FORMATS = [
    # Common formats
    ".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif", ".webp", ".heic",

    # RAW formats (common camera manufacturers)
    ".cr2", ".cr3", ".nef", ".nrw", ".arw", ".rw2", ".orf", ".raf", ".sr2",
    ".pef", ".dng", ".erf", ".3fr", ".srw", ".x3f", ".mef", ".mos", ".rwl", ".kc2"
]

# -----------------------------
# 2️⃣ Helper: Check if file is an image
# -----------------------------
def is_image_file(filename: str) -> bool:
    """
    Return True if the given file has a supported image or RAW format.
    """
    ext = os.path.splitext(filename.lower())[1]
    return ext in SUPPORTED_FORMATS

# -----------------------------
# 3️⃣ Extract metadata from a single image
# -----------------------------
def extract_metadata(image_path: str) -> Dict[str, Any]:
    """
    Extract metadata for one image file.
    Includes file stats, format, and size (width/height).
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size
            return {
                "id": os.path.basename(image_path),
                "path": image_path,
                "format": img.format,
                "width": width,
                "height": height,
                "size_bytes": os.path.getsize(image_path),
                "created": datetime.fromtimestamp(os.path.getctime(image_path)).isoformat(),
                "modified": datetime.fromtimestamp(os.path.getmtime(image_path)).isoformat(),
            }
    except UnidentifiedImageError:
        print(f"⚠️ Skipping unreadable file: {image_path}")
    except Exception as e:
        print(f"❌ Error reading {image_path}: {e}")
    return {}

# -----------------------------
# 4️⃣ Index all images in a folder
# -----------------------------
def index_images(base_dir: str) -> List[Dict[str, Any]]:
    """
    Recursively scan a directory and index all supported image files.
    Returns list of new entries added.
    """
    all_data = load_json()  # load existing database
    indexed = []            # new images found

    for root, _, files in os.walk(base_dir):
        for file in files:
            if is_image_file(file):
                image_path = os.path.join(root, file)

                # Skip if already indexed
                if any(img["path"] == image_path for img in all_data):
                    continue

                metadata = extract_metadata(image_path)
                if metadata:
                    all_data.append(metadata)
                    indexed.append(metadata)

    if indexed:
        save_json(all_data)
        print(f"✅ Indexed {len(indexed)} new images from {base_dir}")
    else:
        print(f"ℹ️ No new images found in {base_dir}")

    return indexed


# -----------------------------
# 5️⃣ Test entry point
# -----------------------------
if __name__ == "__main__":
    base = os.path.expanduser("~")  # your home directory for testing
    index_images(base)
