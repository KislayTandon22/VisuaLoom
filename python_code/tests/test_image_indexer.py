import os
import sys
import pytest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from image_indexer import index_images

def test_image_indexing(tmp_path):
    img_path = tmp_path / "test_image.jpg"
    
    # Create dummy image
    from PIL import Image
    img = Image.new("RGB", (100, 100), color="red")
    img.save(img_path)

    indexed = index_images(str(tmp_path))
    
    assert len(indexed) == 1
    assert indexed[0]["path"] == str(img_path)
    assert "width" in indexed[0]
    assert "height" in indexed[0]
