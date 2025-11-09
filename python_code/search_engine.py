
import re
from typing import List, Dict, Any
import numpy as np
from embedding_store import EmbeddingStore
from file_manager import load_json
from config import EMBEDDING_STORE_PATH, IMAGE_DB_PATH

class SearchEngine:

    def __init__ (self, embed_model):
        self.embed_model = embed_model
        self.embedding_store = EmbeddingStore(EMBEDDING_STORE_PATH)
        self.image_db = load_json(IMAGE_DB_PATH)

        
    def parse_query (self, query: str):
        people = re.findall(r"@(\w+)", query)
        topics = re.findall(r"#(\w+)", query)
        keywords = re.sub(r"[@#]\w+", "", query).split()
        return {
            "people": people,
            "topics": topics,
            "keywords": keywords
        }
    
    def search (self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        parsed_query = self.parse_query(query)
        results = []
        tag_matched_images = []
        if parsed_query["people"] or parsed_query["topics"]:
            for img in self.image_db:
                if any(person in img.get("tags", []) for person in parsed_query["people"]) :
                    tag_matched_images.append(img)
        semantic_matches = []
        if parsed_query["keywords"]:
            try:
                query_vec = self.embed_model.get_text_embedding(" ".join(parsed_query["keywords"]))
                semantic_matches = self.embedding_store.search_similar_embeddings(query_vec, top_k=top_k)
                semantic_matches = [m["entry"] for m in semantic_matches]
            except Exception as e:
                print(f"❌ Error during embedding search: {e}")
        combined_results = {img["id"]: img for img in tag_matched_images + semantic_matches}
        results = list(combined_results.values())
        return results
    
if __name__ == "__main__":
    # ⚙️ Example demo
    class DummyEmbedModel:
        def get_text_embedding(self, text):
            return np.random.rand(512)  # Simulated vector

    engine = SearchEngine(DummyEmbedModel())

    # Test queries
    print(engine.search("@Alice #trip"))
    print(engine.search("sunset beach"))
                

    