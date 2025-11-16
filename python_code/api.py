import os
import platform
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

import torch
import open_clip
import numpy as np
from PIL import Image

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import your existing modules
from image_manager import add_image, delete_image
from image_indexer import index_images, extract_metadata, is_image_file
from search_engine import SearchEngine
from config import IMAGE_DIR
from database import get_all_folders as get_folders_from_db
from file_explorer import (
    roots_impl,
    browse_impl,
    search_impl,
    validate_impl,
    thumbnails_impl,
    count_images_impl,
)
from file_manager import load_json, save_json


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


# Initialize CLIP model and search engine
embed_model = CLIPEmbedModel()
search_engine = SearchEngine(embed_model)

# ======================================================
# 🚀 FastAPI Application
# ======================================================

app = FastAPI(title="VisuaLoom API", version="1.0")

# Store background indexing jobs
index_jobs = {}

# ---------------------------------------------------------
# Allowed root directories (configurable)
# ---------------------------------------------------------
ALLOWED_ROOTS = [
    "/",               # Linux / macOS root
    "/mnt/data",       # Docker or cloud environments
    "C:/",             # Windows root
]


# ======================================================
# Startup & Middleware
# ======================================================

@app.on_event("startup")
async def on_startup():
    print("🚀 VisuaLoom API startup — all routes registered")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"--> {request.method} {request.url}")
    response = await call_next(request)
    print(f"<-- {response.status_code} for {request.method} {request.url}")
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# Folders Endpoints (Alias for frontend compatibility)
# ======================================================

@app.get("/folders/roots")
def folders_roots():
    """Get top-level directories."""
    return roots_impl()

@app.get("/folders/browse")
def folders_browse(path: str = Query(...), include_files: bool = False, page: int = 1, per_page: int = 50):
    """Browse folder contents."""
    return browse_impl(path=path, include_files=include_files, page=page, per_page=per_page)

@app.get("/folders/search")
def folders_search(base_path: str = Query(...), query: str = "", max_results: int = 100):
    """Search for folders containing images."""
    return search_impl(base_path=base_path, query=query, max_results=max_results)

@app.post("/folders/validate")
def folders_validate(path: str = Form(...)):
    """Validate a path."""
    return validate_impl(path=path)

@app.get("/folders/thumbnails")
def folders_thumbnails(path: str = Query(...), limit: int = 6):
    """Get thumbnail images from a folder."""
    return thumbnails_impl(path=path, limit=limit)

@app.get("/folders/count")
def folders_count_images(path: str = Query(...)):
    """Count total images in a folder."""
    return count_images_impl(path=path)


# ======================================================
# Helper Functions
# ======================================================

def is_allowed(path: str) -> bool:
    """Ensure the requested path is inside allowed roots."""
    path = os.path.abspath(path)
    for root in ALLOWED_ROOTS:
        try:
            root_abs = os.path.abspath(root)
            if os.path.commonpath([path, root_abs]) == root_abs:
                return True
        except:
            pass
    return False


def list_directory(path: str, include_files: bool = True):
    """List folder contents safely and consistently."""
    path = os.path.abspath(path)

    if not is_allowed(path):
        raise HTTPException(403, "Path not allowed.")

    if not os.path.exists(path):
        raise HTTPException(404, "Path does not exist.")

    # If it's a file, return it directly
    if os.path.isfile(path):
        return {
            "items": [{
                "name": os.path.basename(path),
                "path": path,
                "type": "file"
            }]
        }

    # Directory listing
    items = []
    try:
        with os.scandir(path) as scan:
            for entry in scan:
                try:
                    entry_type = "folder" if entry.is_dir() else "file"
                except:
                    continue

                if entry_type == "file" and not include_files:
                    continue

                items.append({
                    "name": entry.name,
                    "path": entry.path,
                    "type": entry_type
                })
    except PermissionError:
        raise HTTPException(403, "Permission denied.")

    # Sort: folders first, then alphabetically
    items.sort(key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))

    return {"items": items}


# ======================================================
# Pydantic Models
# ======================================================

class IndexRequest(BaseModel):
    paths: List[str]


# ======================================================
# Root & Health Endpoints
# ======================================================

@app.get("/")
async def root():
    return {"message": "🧠 VisuaLoom API with CLIP embeddings!"}


@app.get("/health")
async def health():
    return {"status": "ok"}





# ======================================================
# Image Upload & Search Endpoints
# ======================================================

@app.post("/upload/")
async def upload_image(file: UploadFile = File(...)):
    """Upload and index a single image file."""
    try:
        filename = file.filename
        metadata = add_image(file, filename, embed_model)
        return {"status": "success", "metadata": metadata}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search/")
async def search_images(query: str):
    """Search indexed images using CLIP embeddings."""
    try:
        results = search_engine.search(query)
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# Indexing Endpoints (Combined)
# ======================================================

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


@app.post("/index/files")
@app.post("/index_files")
async def index_files(req: IndexRequest = None, files: List[str] = None):
    """Index a list of image file paths. Supports both request body formats."""
    try:
        # Support both formats
        if req:
            files_to_index = [os.path.expanduser(p) for p in req.paths]
        elif files:
            files_to_index = [os.path.expanduser(p) for p in files]
        else:
            raise HTTPException(status_code=400, detail="No files provided")
        
        all_data = load_json()
        newly_indexed = []

        for fp in files_to_index:
            fp_abs = os.path.abspath(fp)
            
            # Security check
            if not is_allowed(fp_abs):
                raise HTTPException(403, f"Not allowed: {fp}")
            
            if not os.path.exists(fp_abs):
                print(f"⚠️ File not found: {fp_abs}")
                continue
                
            if not os.path.isfile(fp_abs):
                print(f"⚠️ Not a file: {fp_abs}")
                continue
            
            # Ensure it's an image we support
            if not is_image_file(fp_abs):
                print(f"⚠️ Not an image file: {fp_abs}")
                continue

            # Skip if already indexed
            if any(img.get("path") == fp_abs for img in all_data):
                print(f"✓ Already indexed: {fp_abs}")
                continue

            print(f"🔥 Indexing file: {fp_abs}")
            meta = extract_metadata(fp_abs)
            if meta:
                all_data.append(meta)
                newly_indexed.append(meta)

        if newly_indexed:
            save_json(all_data)

        return {
            "status": "ok",
            "indexed_count": len(newly_indexed),
            "indexed": newly_indexed
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# Delete Endpoint
# ======================================================

@app.delete("/delete/{image_id}")
async def delete_image_entry(image_id: str):
    """Delete an indexed image entry."""
    try:
        delete_image(image_id)
        return {"status": "deleted", "id": image_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================
# Run Server (Optional)
# ======================================================
