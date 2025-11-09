"""
drive_manager.py
----------------
Detects available drives and lists folders/files for indexing.
"""

import os
import psutil
from typing import List, Dict, Any


# -----------------------------------
# Drive Detection
# -----------------------------------

def list_drives() -> List[Dict[str, Any]]:
    """
    List all available drives (internal + external).
    Works on macOS, Windows, and Linux.
    """
    drives = []
    partitions = psutil.disk_partitions(all=False)

    for p in partitions:
        try:
            usage = psutil.disk_usage(p.mountpoint)
            drives.append({
                "device": p.device,
                "mountpoint": p.mountpoint,
                "fstype": p.fstype,
                "total_gb": round(usage.total / (1024**3), 2),
                "used_gb": round(usage.used / (1024**3), 2),
                "free_gb": round(usage.free / (1024**3), 2),
                "percent_used": usage.percent,
            })
        except PermissionError:
            continue  # skip system-reserved partitions

    return drives


# -----------------------------------
# Folder and File Listing
# -----------------------------------

def list_directory(path: str, include_files: bool = True) -> Dict[str, Any]:
    """
    List subfolders and files in a given directory path.
    """
    if not os.path.exists(path):
        return {"error": f"Path not found: {path}"}

    folders = []
    files = []

    try:
        with os.scandir(path) as entries:
            for entry in entries:
                if entry.is_dir(follow_symlinks=False):
                    folders.append({
                        "name": entry.name,
                        "path": entry.path,
                        "type": "folder"
                    })
                elif include_files and entry.is_file(follow_symlinks=False):
                    files.append({
                        "name": entry.name,
                        "path": entry.path,
                        "type": "file",
                        "size_kb": round(entry.stat().st_size / 1024, 2)
                    })
    except PermissionError:
        return {"error": f"Permission denied: {path}"}

    return {"folders": folders, "files": files}


# -----------------------------------
# Utility for API
# -----------------------------------

def get_drive_tree() -> Dict[str, Any]:
    """
    Return structured data of all drives and their top-level folders.
    """
    drives = list_drives()
    result = {}

    for drive in drives:
        path = drive["mountpoint"]
        result[path] = list_directory(path, include_files=False)["folders"]

    return result
