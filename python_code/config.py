"""
config.py
----------
Stores file paths, constants, and model names used throughout the backend.
"""

import os

# -----------------------------
# Base Directories
# -----------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

# -----------------------------
# Storage Paths
# -----------------------------
IMAGE_DB_PATH = os.path.join(DATA_DIR, "image_data.json")
EMBEDDING_STORE_PATH = os.path.join(DATA_DIR, "embedding_store.json")

# Directories for images and thumbnails
IMAGE_DIR = os.path.join(DATA_DIR, "images")
THUMBNAIL_DIR = os.path.join(DATA_DIR, "thumbnails")

# -----------------------------
# Model Names (for embeddings)
# -----------------------------
IMAGE_EMBED_MODEL = "clip-ViT-B-32"
TEXT_EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

# -----------------------------
# Setup directories
# -----------------------------
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)
os.makedirs(THUMBNAIL_DIR, exist_ok=True)
