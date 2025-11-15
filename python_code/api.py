from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
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

from files_list import (
    get_root_folders,
    list_folder_contents,
    search_folders_with_images,
    validate_path,
    get_folder_stats,
    get_folder_thumbnail_images,
    count_total_images_recursive,
    IMAGE_EXTENSIONS
)

# ======================================================
# 🧠 CLIP Model Wrapper
# ======================================================

class CLIPEmbedModel:
    def __init__(self, model_name="ViT-B-32", pretrained="openai"):
        print("🔄 Loading CLIP model... please wait")
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
        self.tokenizer = open_clip.get_tokenizer(model_name)
        self.device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        print(f"✅ CLIP Model loaded on {self.device.upper()}")

    def get_text_embedding(self, text: str):
        with torch.no_grad():
            tokens = self.tokenizer([text])
            text_features = self.model.encode_text(tokens.to(self.device))
            text_features /= text_features.norm(dim=-1, keepdim=True)
            return text_features.cpu().numpy().flatten().tolist()

    def get_image_embedding(self, image_path: str):
        try:
            image = Image.open(image_path).convert("RGB")
            image_input = self.preprocess(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                image_features = self.model.encode_image(image_input)
                image_features /= image_features.norm(dim=-1, keepdim=True)
                return image_features.cpu().numpy().flatten().tolist()
        except Exception as e:
            print(f"❌ Image embedding error: {e}")
            return np.zeros(512).tolist()


embed_model = CLIPEmbedModel()
search_engine = SearchEngine(embed_model)

# ======================================================
# 🚀 FastAPI Initialization
# ======================================================

app = FastAPI(title="VisuaLoom API", version="1.0")


@app.on_event("startup")
async def on_startup():
    print("🚀 VisuaLoom API startup event — routes should be registered")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Simple request/response logger to help debug 404s from the frontend
    print(f"--> Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"<-- Completed {response.status_code} for {request.method} {request.url}")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "🧠 VisuaLoom API is running with CLIP embeddings!"}


@app.get("/health")
async def health():
    """Simple health check endpoint to confirm server is running."""
    return {"status": "ok"}


@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    try:
        filename = file.filename
        metadata = add_image(file, filename, embed_model)
        return {"status": "success", "metadata": metadata}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search/")
async def search_images(query: str):
    try:
        results = search_engine.search(query)
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# 🗂 Folder Navigation Endpoints
# ======================================================

index_jobs = {}

@app.get("/folders/roots")
async def get_root_folders_endpoint():
    """Get root/system folders to start browsing."""
    try:
        roots = get_root_folders()
        return {
            "folders": roots,
            "system": platform.system()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/folders/browse")
async def browse_folder(
    path: str,
    include_files: bool = False,
    page: int = 1,
    per_page: int = 50
):
    """
    Browse contents of a specific folder.
    Returns subfolders and optionally image files.
    """
    try:
        path = os.path.expanduser(path)
        items = list_folder_contents(path, include_files)
        
        # Pagination
        start = (page - 1) * per_page
        end = start + per_page
        paginated_items = items[start:end]
        
        return {
            "path": path,
            "items": paginated_items,
            "total": len(items),
            "page": page,
            "per_page": per_page,
            "has_more": end < len(items)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/folders/search")
async def search_folders_endpoint(
    base_path: str,
    query: str = "",
    max_results: int = 100
):
    """
    Search for folders containing images within a base path.
    Optionally filter by folder name query.
    """
    try:
        base_path = os.path.expanduser(base_path)
        results = search_folders_with_images(base_path, query, max_results)
        
        return {
            "base_path": base_path,
            "query": query,
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/folders")
@app.get("/folders/")
async def get_indexed_folders():
    """Return all previously indexed folders from database."""
    try:
        folders = get_folders_from_db() if callable(get_folders_from_db) else []
        return {"folders": folders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/folders/validate")
async def validate_folder_access(path: str = Form(...)):
    """Check if a folder path is valid and accessible."""
    try:
        path = os.path.expanduser(path)
        
        if not os.path.exists(path):
            return {"valid": False, "error": "Path does not exist"}
        
        if not os.path.isdir(path):
            return {"valid": False, "error": "Path is not a directory"}
        
        try:
            stats = get_folder_stats(Path(path))
            return {
                "valid": True,
                "path": path,
                "readable": not stats.get("permission_denied", False),
                **stats
            }
        except PermissionError:
            return {"valid": True, "path": path, "readable": False, "error": "Permission denied"}
            
    except Exception as e:
        return {"valid": False, "error": str(e)}


@app.post("/index/")
async def index_folder(
    background_tasks: BackgroundTasks,
    folder_path: str = Form(...),
    tag: Optional[str] = Form(None)
):
    """Start indexing a directory in the background."""
    folder_path = os.path.expanduser(folder_path)
    
    if not os.path.isdir(folder_path):
        raise HTTPException(status_code=400, detail=f"Invalid folder path: {folder_path}")

    # Check permissions
    try:
        list(os.listdir(folder_path))
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=f"No permission to access {folder_path}"
        )

    job_id = str(uuid4())
    index_jobs[job_id] = {
        "progress": 0,
        "total": 0,
        "done": False,
        "indexed": 0,
        "path": folder_path,
        "tag": tag
    }

    def _run_indexing():
        try:
            images = index_images(folder_path)
            index_jobs[job_id]["total"] = len(images)
            
            for i, img in enumerate(images):
                index_jobs[job_id]["progress"] = int((i + 1) / len(images) * 100)
                if tag:
                    img["tag"] = tag
                    
            index_jobs[job_id]["done"] = True
            index_jobs[job_id]["indexed"] = len(images)
        except Exception as e:
            index_jobs[job_id]["error"] = str(e)
            index_jobs[job_id]["done"] = True

    background_tasks.add_task(_run_indexing)
    return {
        "job_id": job_id,
        "message": f"Indexing started for {folder_path}",
        "path": folder_path
    }


@app.get("/index/status/{job_id}")
async def get_index_status(job_id: str):
    """Fetch progress for a background indexing job."""
    job = index_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@app.delete("/delete/{image_id}")
async def delete_image_entry(image_id: str):
    try:
        delete_image(image_id)
        return {"status": "deleted", "id": image_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))