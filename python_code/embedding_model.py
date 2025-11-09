"""
embedding_model.py
------------------
Provides unified embeddings for images (via CLIP) and text (via Sentence-Transformers).
"""

import torch
from PIL import Image
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import CLIPProcessor, CLIPModel

class EmbeddingModel:
    def __init__(self, image_model_name="openai/clip-vit-base-patch32", text_model_name="sentence-transformers/all-MiniLM-L6-v2"):
        print("🔹 Loading image model:", image_model_name)
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"

        # Load CLIP for image embeddings
        self.image_model = CLIPModel.from_pretrained(image_model_name).to(self.device)
        self.processor = CLIPProcessor.from_pretrained(image_model_name)

        # Load SentenceTransformer for text embeddings
        print("🔹 Loading text model:", text_model_name)
        self.text_model = SentenceTransformer(text_model_name, device=self.device)

    def get_image_embedding(self, image_path: str):
        """Return a normalized image embedding"""
        image = Image.open(image_path).convert("RGB")
        inputs = self.processor(images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            image_embeds = self.image_model.get_image_features(**inputs)
            image_embeds = image_embeds / image_embeds.norm(dim=-1, keepdim=True)

        return image_embeds.squeeze().cpu().numpy().tolist()

    def get_text_embedding(self, text: str):
        """Return a normalized text embedding"""
        emb = self.text_model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
        return emb.tolist()

