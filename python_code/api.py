"""
api.py
------
Defines REST API routes for image search, upload, tagging, and drive indexing.
Now uses real multimodal embedding models (CLIP for images + text).
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import torch
import open_clip
import numpy as np
from PIL import Image
import os
from typing import List

from image_manager import add_image, delete_image
from image_indexer import index_images
from search_engine import SearchEngine
from config import IMAGE_DIR

# ======================================================
# 🧠 Initialize Real Embedding Model (CLIP)
# ======================================================

class CLIPEmbedModel:
    """Unified model for both text and image embeddings using OpenCLIP."""
    def __init__(self, model_name="ViT-B-32", pretrained="openai"):
        print("🔄 Loading CLIP model... please wait")
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(model_name, pretrained=pretrained)
        self.tokenizer = open_clip.get_tokenizer(model_name)
        self.device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        print(f"✅ CLIP Model loaded on {self.device.upper()}")

    def get_text_embedding(self, text: str):
        """Generate text embedding using CLIP."""
        with torch.no_grad():
            tokens = self.tokenizer([text])
            text_features = self.model.encode_text(tokens.to(self.device))
            text_features /= text_features.norm(dim=-1, keepdim=True)
            return text_features.cpu().numpy().flatten().tolist()

    def get_image_embedding(self, image_path: str):
        """Generate image embedding using CLIP."""
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


# Initialize real model + search engine
embed_model = CLIPEmbedModel()
search_engine = SearchEngine(embed_model)

# ======================================================
# 🚀 FastAPI App
# ======================================================

app = FastAPI(title="VisuaLoom API", version="1.0")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# 🌐 API Routes
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


@app.post("/index/")
async def index_all_images(base_dir: str = Form(IMAGE_DIR)):
    try:
        new_images = index_images(base_dir)
        return {"indexed": len(new_images), "path": base_dir}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete/{image_id}")
async def delete_image_entry(image_id: str):
    try:
        delete_image(image_id)
        return {"status": "deleted", "id": image_id}
    except Exception as e:
        raise
