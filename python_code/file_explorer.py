from fastapi import HTTPException, Query, Form
from pathlib import Path
from typing import Optional

from files_list import (
    get_root_folders,
    list_folder_contents,
    search_folders_with_images,
    validate_path,
    get_folder_stats,
    get_folder_thumbnail_images,
    count_total_images_recursive,
)


def roots_impl():
    """Return top-level directories the user can browse (system roots)."""
    try:
        roots = get_root_folders()
        return {"folders": roots}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def browse_impl(path: str, include_files: bool = False, page: int = 1, per_page: int = 50):
    """Browse a folder's contents with optional pagination."""
    try:
        p = Path(path).expanduser()
        items = list_folder_contents(str(p), include_files)
        start = (page - 1) * per_page
        end = start + per_page
        paginated = items[start:end]
        return {
            "path": str(p),
            "items": paginated,
            "total": len(items),
            "page": page,
            "per_page": per_page,
            "has_more": end < len(items),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def search_impl(base_path: str, query: str = "", max_results: int = 100):
    """Search for folders (within base_path) that contain images and optionally match `query`."""
    try:
        base_path = str(Path(base_path).expanduser())
        results = search_folders_with_images(base_path, query, max_results)
        return {"base_path": base_path, "query": query, "results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def validate_impl(path: str):
    """Validate a path and return accessibility stats."""
    try:
        p = Path(path).expanduser()
        if not p.exists():
            return {"valid": False, "error": "Path does not exist"}
        if not p.is_dir():
            return {"valid": False, "error": "Path is not a directory"}
        stats = get_folder_stats(p)
        return {"valid": True, "path": str(p), "readable": not stats.get("permission_denied", False), **stats}
    except PermissionError:
        return {"valid": True, "path": path, "readable": False, "error": "Permission denied"}
    except Exception as e:
        return {"valid": False, "error": str(e)}

def thumbnails_impl(path: str, limit: int = 6):
    """Return up to `limit` top-level image paths from the folder for thumbnails."""
    try:
        p = Path(path).expanduser()
        imgs = get_folder_thumbnail_images(str(p), limit=limit)
        return {"path": str(p), "thumbnails": imgs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def count_images_impl(path: str):
    """Return total number of images under `path` (recursive)."""
    try:
        p = Path(path).expanduser()
        total = count_total_images_recursive(str(p))
        return {"path": str(p), "total_images": total}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
