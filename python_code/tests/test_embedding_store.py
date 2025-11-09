import sys, os
import pytest
import numpy as np

# Add parent directory of python_code/tests to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from embedding_store import EmbeddingStore, load_json, save_json


@pytest.fixture
def temp_json(tmp_path):
    """Fixture to create a temporary JSON database path."""
    db_path = tmp_path / "test_db.json"
    return str(db_path)


def test_load_json_empty(temp_json):
    """Should return empty list if file doesn't exist."""
    assert load_json(temp_json) == []


def test_save_and_load_json(temp_json):
    """Should save and load JSON correctly."""
    data = [{"id": "1", "embedding": [0.1, 0.2, 0.3]}]
    save_json(temp_json, data)
    loaded = load_json(temp_json)
    assert loaded == data


def test_embedding_store_add_and_search(temp_json):
    """Test adding embeddings and performing a search."""
    store = EmbeddingStore(db_path=temp_json)

    # Add sample embeddings
    store.add_embedding({"id": "img1", "embedding": [1.0, 0.0, 0.0]})
    store.add_embedding({"id": "img2", "embedding": [0.0, 1.0, 0.0]})

    # Check embeddings loaded
    assert store.embeddings is not None
    assert len(store.embeddings["ids"]) == 2

    # Search for a similar vector
    query = np.array([1.0, 0.0, 0.0], dtype=np.float32)
    results = store.search(query, top_k=1)

    assert len(results) == 1
    assert results[0]["entry"]["id"] == "img1"
    assert "score" in results[0]
    assert isinstance(results[0]["score"], float)


def test_remove_embedding(temp_json):
    """Test removing embeddings."""
    store = EmbeddingStore(db_path=temp_json)
    store.add_embedding({"id": "img1", "embedding": [1.0, 0.0, 0.0]})
    store.add_embedding({"id": "img2", "embedding": [0.0, 1.0, 0.0]})

    # Remove one entry
    store.remove_embedding("img1")

    ids = [e["id"] for e in store.data]
    assert "img1" not in ids
    assert "img2" in ids
