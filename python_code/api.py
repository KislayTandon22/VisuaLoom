from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import open_clip
import numpy as np
from PIL import Image
import os
from typing import List, Optional
from uuid import uuid4

from image_manager import add_image, delete_image
from image_indexer import index_images
from search_engine import SearchEngine
from config import IMAGE_DIR


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# 🌐 API Endpoints
# ======================================================

@app.get("/")
async def root():
    return {"message": "🧠 VisuaLoom API is running with CLIP embeddings!"}


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
# 🗂 Folder Indexing + Tagging
# ======================================================

index_jobs = {}  # store progress per job id


@app.post("/index/")
async def index_all_images(
    background_tasks: BackgroundTasks,
    base_dir: str = Form(IMAGE_DIR),
    tag: Optional[str] = Form(None)
):
    """Start indexing a directory in the background."""
    if not os.path.isdir(base_dir):
        raise HTTPException(status_code=400, detail=f"Invalid folder path: {base_dir}")

    job_id = str(uuid4())
    index_jobs[job_id] = {"progress": 0, "total": 0, "done": False, "indexed": 0, "path": base_dir}

    def _run_indexing():
        images = index_images(base_dir)
        index_jobs[job_id]["total"] = len(images)
        for i, img in enumerate(images):
            index_jobs[job_id]["progress"] = int((i + 1) / len(images) * 100)
            # optionally add a tag/id
            if tag:
                img["tag"] = tag
        index_jobs[job_id]["done"] = True
        index_jobs[job_id]["indexed"] = len(images)

    background_tasks.add_task(_run_indexing)
    return {"job_id": job_id, "message": f"Indexing started for {base_dir}"}


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
