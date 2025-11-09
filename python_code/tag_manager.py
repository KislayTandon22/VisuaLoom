import json
import uuid
from typing import List, Dict, Any
from file_manager import load_json, save_json
from config import IMAGE_DB_PATH, TAG_DB_PATH

def _generate_tag_id() -> str:
    """Generate a short unique tag ID."""
    return "t" + uuid.uuid4().hex[:6]

def _find_tag_by_name(name: str, tag_data : List[Dict[str,any]] ):
    for tag in tag_data:
        if tag.get("name").lower() == name.lower():
            return tag
    return None

def get_all_tags() -> List[Dict[str, Any]]:
    """Return all tags from the tag database."""
    return load_json(TAG_DB_PATH)

def create_tag(name: str, tag_type: str="custom") -> str:
    """Create a new tag with a unique name and return its ID."""
    tag_data= load_json(TAG_DB_PATH)
    existing_tag = _find_tag_by_name(name, tag_data)
    if existing_tag:
        return existing_tag["id"]
    tag_id = _generate_tag_id()
    tag_data.append({
        "id": tag_id,
        "name": name,
        "type": tag_type
    })
    save_json(TAG_DB_PATH, tag_data)
    return tag_id

def add_tag_to_image(image_id: str, tag_name: str) -> bool:
    tag_data= load_json(TAG_DB_PATH)
    image_data= load_json(IMAGE_DB_PATH)
    tag = _find_tag_by_name(tag_name, tag_data)
    if not tag:
        tag_id = create_tag(tag_name)
    else:
        tag_id = tag["id"]
    updated = False
    for image in image_data:
        if image.get("id") == image_id:
            if "tags" not in image:
                image["tags"] = []
            if tag_id not in image["tags"]:
                image["tags"].append(tag_id)
                updated = True
            break
    if updated:
        save_json(IMAGE_DB_PATH, image_data)
    return updated

def remove_tag_from_image(image_id: str, tag_name: str) -> bool:
    tag_data= load_json(TAG_DB_PATH)
    image_data= load_json(IMAGE_DB_PATH)
    tag = _find_tag_by_name(tag_name, tag_data)
    if not tag:
        return False
    tag_id = tag["id"]
    updated = False
    for image in image_data:
        if image.get("id") == image_id:
            if "tags" in image and tag_id in image["tags"]:
                image["tags"].remove(tag_id)
                updated = True
            break
    if updated:
        save_json(IMAGE_DB_PATH, image_data)
    return updated

def get_images_by_tag_name(tag_name: str) -> List[Dict[str, Any]]:
    """Get all images linked to a tag name."""
    tags = load_json(TAG_DB_PATH)
    tag = _find_tag_by_name(tag_name, tags)
    if not tag:
        return []
    tag_id = tag["id"]

    images = load_json(IMAGE_DB_PATH)
    return [img for img in images if tag_id in img.get("tags", [])]

def get_tag_name(tag_id: str) -> str:
    """Resolve a tag ID back to its name."""
    tags = load_json(TAG_DB_PATH)
    for tag in tags:
        if tag["id"] == tag_id:
            return tag["name"]
    return "Unknown"

