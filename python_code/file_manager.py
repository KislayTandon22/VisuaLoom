"""
file_manager.py
----------------
Handles reading/writing images and metadata files.
"""

import os
import json
from typing import List, Dict, Any, Optional
from PIL import Image
from config import IMAGE_DB_PATH, IMAGE_DIR, THUMBNAIL_DIR

# -----------------------------
# JSON Database Helpers
# -----------------------------

def load_json(path: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Load JSON data from disk.
    - If no path provided, defaults to IMAGE_DB_PATH.
    - Returns [] if file does not exist or is invalid.
    """
    path = path or IMAGE_DB_PATH
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"⚠️ Corrupted JSON file detected: {path}. Resetting to empty list.")
        return []
    except Exception as e:
        print(f"❌ Error loading JSON {path}: {e}")
        return []


def save_json(data: List[Dict[str, Any]]):
    """Save the image metadata database."""
    with open(IMAGE_DB_PATH, "w") as f:
        json.dump(data, f, indent=4)

# -----------------------------
# Image Utilities
# -----------------------------

def save_image(file, filename: str) -> str:
    """Save uploaded image file to IMAGE_DIR."""
    image_path = os.path.join(IMAGE_DIR, filename)
    file.save(image_path)
    return image_path

def create_thumbnail(image_path: str, size=(256, 256)) -> str:
    """Generate and save a thumbnail for an image."""
    thumb_path = os.path.join(THUMBNAIL_DIR, os.path.basename(image_path))
    try:
        img = Image.open(image_path)
        img.thumbnail(size)
        img.save(thumb_path)
    except Exception as e:
        print(f"❌ Error creating thumbnail: {e}")
    return thumb_path

def delete_image(image_id: str):
    """Delete an image and its metadata from storage."""
    data = load_json()
    updated = [img for img in data if img.get("id") != image_id]
    if len(updated) < len(data):
        save_json(updated)
    else:
        print(f"⚠️ Image ID {image_id} not found in database.")
