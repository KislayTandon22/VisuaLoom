import os
import uuid
from typing import Dict, Any, List
from file_manager import save_image, create_thumbnail, load_json, save_json
from image_indexer import extract_metadata
from embedding_store import EmbeddingStore
from config import IMAGE_DB_PATH, IMAGE_DIR, EMBEDDING_STORE_PATH

# Initialize global embedding store
embedding_store = EmbeddingStore(EMBEDDING_STORE_PATH)

def add_image(file, filename:str, embed_model) -> Dict[str, Any]:
    """
    Add an image: save file, create thumbnail, extract metadata, generate embedding.
    """
    image_path = save_image(file, filename)
    thumb_path = create_thumbnail(image_path)
    metadata = extract_metadata(image_path)
    if not metadata:
        raise ValueError("Unable to read image metadata.")
    metadata["id"] = str(uuid.uuid4())
    metadata["path"] = image_path
    metadata["thumbnail"] = thumb_path
    metadata["tags"] = []
    metadata["faces"]=[]
    try: 
        embedding = embed_model.get_image_embedding(image_path)
        embedding_store.add_embedding(metadata["id"], embedding)
    except Exception as e:
        print(f"❌ Error generating embedding: {e}")

    embedding_store.add_embedding(metadata)
    print(f"✅ Added image {filename} with ID {metadata['id']}")
    return metadata

def delete_image(image_id: str):
    data = load_json(IMAGE_DB_PATH)
    image_entry = next((img for img in data if img.get("id") == image_id), None)
    if not image_entry:
        print(f"⚠️ Image ID {image_id} not found in database.")
        return
    updated_data = [img for img in data if img.get("id") != image_id]
    save_json(IMAGE_DB_PATH, updated_data)
    embedding_store.remove_embedding(image_id)
    print(f"✅ Deleted image ID {image_id} from database and embedding store.")

def list_images() -> List[Dict[str, Any]]:
    """
    Return all images stored in the JSON database.
    """
    return load_json(IMAGE_DB_PATH)



        
