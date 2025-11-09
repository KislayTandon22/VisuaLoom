"""
config.py
----------
Stores file paths, constants, and model names used throughout the backend.
"""

import os

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# JSON database for storing image metadata and embeddings
IMAGE_DB_PATH = os.path.join(DATA_DIR, "image_data.json")

# Directory where images are stored
IMAGE_DIR = os.path.join(DATA_DIR, "images")

# Directory where thumbnails are saved
THUMBNAIL_DIR = os.path.join(DATA_DIR, "thumbnails")

# Model names for embeddings
IMAGE_EMBED_MODEL = "clip-ViT-B-32"
TEXT_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# Create directories if they don’t exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)
