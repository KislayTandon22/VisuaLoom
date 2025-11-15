
# ======================================================
# 📁 Helper Functions for Folder Navigation
# ======================================================
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import open_clip
import numpy as np
from PIL import Image
import os
import platform
from pathlib import Path
from typing import List, Optional
from uuid import uuid4
import mimetypes

from image_manager import add_image, delete_image
from image_indexer import index_images
from search_engine import SearchEngine
from config import IMAGE_DIR
from database import get_all_folders as get_folders_from_db

IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.heic', '.tiff', '.svg', '.raw'}

def is_image_file(filename: str) -> bool:
    """Check if file is an image based on extension."""
    return Path(filename).suffix.lower() in IMAGE_EXTENSIONS


def get_folder_stats(folder_path: Path):
    """Get statistics about a folder (image count, subfolder count)."""
    try:
        items = list(folder_path.iterdir())
        subfolders = [item for item in items if item.is_dir() and not item.name.startswith('.')]
        images = [item for item in items if item.is_file() and is_image_file(item.name)]
        
        return {
            "subfolder_count": len(subfolders),
            "image_count": len(images),
            "total_items": len(items)
        }
    except PermissionError:
        return {
            "subfolder_count": 0,
            "image_count": 0,
            "total_items": 0,
            "permission_denied": True
        }


def get_root_folders():
    """Return all major system directories for browsing."""
    system = platform.system()
    folders = []

    if system == "Darwin":  # macOS
        roots = [
            Path("/"),             # FULL system root
            Path("/Applications"),
            Path("/Library"),
            Path("/System"),
            Path("/Users"),        # contains all users
            Path("/Users/Shared"),
            Path("/Volumes"),
            Path("/private"),
            Path("/opt"),
            Path.home(),           
        ]

    elif system == "Windows":
        roots = [Path.home()]
        for drive in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            p = Path(f"{drive}:/")
            if p.exists():
                roots.append(p)

    else:  # Linux
        roots = [
            Path("/"),
            Path("/home"),
            Path("/mnt"),
            Path("/media"),
            Path.home(),
        ]

    for p in roots:
        if p.exists() and p.is_dir():
            try:
                stats = get_folder_stats(p)
                folders.append({
                    "path": str(p),
                    "name": p.name if p.name else "/",
                    "type": "root",
                    "readable": not stats.get("permission_denied", False),
                    **stats
                })
            except Exception:
                pass

    return folders



def list_folder_contents(folder_path: str, include_files: bool = False):
    """List contents of a folder with image counts."""
    try:
        path = Path(folder_path)
        
        if not path.exists():
            raise HTTPException(status_code=404, detail="Folder not found")
        
        if not path.is_dir():
            raise HTTPException(status_code=400, detail="Path is not a directory")
        
        items = []
        
        try:
            for item in path.iterdir():
                # Skip hidden files/folders
                if item.name.startswith('.'):
                    continue
                
                if item.is_dir():
                    stats = get_folder_stats(item)
                    items.append({
                        "path": str(item),
                        "name": item.name,
                        "type": "folder",
                        "readable": not stats.get("permission_denied", False),
                        **stats
                    })
                elif include_files and item.is_file() and is_image_file(item.name):
                    items.append({
                        "path": str(item),
                        "name": item.name,
                        "type": "image",
                        "size": item.stat().st_size,
                        "modified": item.stat().st_mtime
                    })
        except PermissionError:
            raise HTTPException(status_code=403, detail=f"Permission denied to access {folder_path}")
        
        # Sort: folders first, then by name
        items.sort(key=lambda x: (x["type"] != "folder", x["name"].lower()))
        
        return items
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def search_folders_with_images(base_path: str, query: str = "", max_results: int = 100):
    """Search for folders containing images, optionally matching a query."""
    results = []
    base = Path(base_path)
    
    if not base.exists() or not base.is_dir():
        return results
    
    def search_recursive(path: Path, depth: int = 0):
        if len(results) >= max_results or depth > 5:
            return
        
        try:
            for item in path.iterdir():
                if len(results) >= max_results:
                    break
                
                if item.is_dir() and not item.name.startswith('.'):
                    stats = get_folder_stats(item)
                    
                    # If folder has images and matches query (if provided)
                    if stats["image_count"] > 0:
                        if not query or query.lower() in item.name.lower():
                            results.append({
                                "path": str(item),
                                "name": item.name,
                                "type": "folder",
                                "readable": not stats.get("permission_denied", False),
                                **stats
                            })
                    
                    # Continue searching subdirectories
                    if depth < 5:
                        search_recursive(item, depth + 1)
                        
        except PermissionError:
            pass
        except Exception:
            pass
    
    search_recursive(base)
    return results


def validate_path(path: str) -> dict:
    """Validate a local path and return simple metadata about accessibility."""
    try:
        p = Path(path)
        if not p.exists():
            return {"valid": False, "error": "Path does not exist", "path": path}
        if not p.is_dir():
            return {"valid": False, "error": "Path is not a directory", "path": path}

        stats = get_folder_stats(p)
        return {
            "valid": True,
            "path": str(p),
            "readable": not stats.get("permission_denied", False),
            **stats,
        }
    except PermissionError:
        return {"valid": True, "path": path, "readable": False, "error": "Permission denied"}
    except Exception as e:
        return {"valid": False, "path": path, "error": str(e)}


def count_total_images_recursive(folder_path: str) -> int:
    """Recursively count image files under folder_path. Safe against permission errors."""
    base = Path(folder_path)
    if not base.exists() or not base.is_dir():
        return 0

    total = 0
    try:
        for root, dirs, files in os.walk(base, topdown=True):
            # skip hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for f in files:
                if is_image_file(f):
                    total += 1
    except PermissionError:
        return total
    except Exception:
        return total

    return total


def get_folder_thumbnail_images(folder_path: str, limit: int = 6) -> List[str]:
    """Return up to `limit` image file paths (strings) from the given folder for thumbnail previews.

    This returns top-level images only (does not recurse). It avoids raising on permission errors and
    returns absolute paths as strings.
    """
    p = Path(folder_path)
    results: List[str] = []
    if not p.exists() or not p.is_dir():
        return results

    try:
        for item in p.iterdir():
            if item.is_file() and is_image_file(item.name) and not item.name.startswith('.'):
                results.append(str(item))
                if len(results) >= limit:
                    break
    except PermissionError:
        return results
    except Exception:
        return results

    return results

# ======================================================
# 🌐 API Endpoints
# ======================================================