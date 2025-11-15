import os
from typing import List
from file_manager import load_json
from config import IMAGE_DB_PATH


def get_all_folders() -> List[str]:
    """
    Return a unique list of all folders that have indexed images.
    """
    data = load_json(IMAGE_DB_PATH)
    if not data:
        return []

    # Extract directory names from image paths
    folders = list({os.path.dirname(img["path"]) for img in data if "path" in img})
    folders.sort()
    return folders
