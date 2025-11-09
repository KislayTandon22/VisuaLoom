import os
import json
import numpy as np
from typing import List, Dict, Any

def load_json(db_path: str) -> List[Dict[str,Any]]:
    """Load existing JSON data from disk."""
    """it returns list of values from the json db in form of list of dictonary of key
        value pairs where each dictonary represents one embedding entry
        and key and any data type
        """
       
    if not os.path.exists(db_path):
        return []
    with open(db_path, 'r') as f:
        return json.load(f)
    
def save_json(db_path: str, data: List[Dict[str,Any]]) -> None:
    """Save JSON data to disk."""
    with open(db_path, 'w') as f:
        json.dump(data, f, indent=4)

class EmbeddingStore:
    def __init__(self,db_path="image_data.json"):
        self.db_path = db_path
        self.data = load_json(db_path)
        self.embeddings = self._load_embeddings()
    
    def _load_embeddings(self):
        """
        Convert all stored embeddings (lists) into a NumPy matrix.
        This allows fast math operations.
        """
        vectors = []
        ids = []
        for entry in self.data:
            if  'embedding' in entry:
                vectors.append(np.array(entry['embedding'], dtype=np.float32))

                #extracting the vector part of the embedding entry
                ids.append(entry['id'])
        if len(vectors) == 0:
            return None
        return {"matrix": np.vstack(vectors) , "ids": ids}
    #np.vstack is used to stack arrays in sequence vertically (row wise) 

    def search(self, query_vector: np.ndarray, top_k: int = 5) :
        if self.embeddings is None:
            return []
        # Compute cosine similarities
        matrix = self.embeddings["matrix"]
        query_vector = query_vector/np.linalg.norm(query_vector) #getting unit vector
        matrix_norms =matrix/ np.linalg.norm(matrix, axis=1, keepdims=True) #normalizing each row vector
        similarities = np.dot( matrix_norms, query_vector)

        top_indices = np.argsort(similarities)[::-1][:top_k] # finding top k indices
        results = []
        for idx in top_indices:
            id= self.embeddings["ids"][idx]
            score = similarities[idx]
            entry = next((item for item in self.data if item["id"] == id), None)
            if entry:
                results.append({"entry": entry, "score": float(score)})

        return results


    def add_embedding(self,image_entry: Dict[str,Any]):
        self.data.append(image_entry)
        save_json(self.db_path, self.data)
        self.embeddings = self._load_embeddings()   
    def remove_embedding(self,image_id: str):
        self.data = [entry for entry in self.data if entry["id"] != image_id]
        save_json(self.db_path, self.data)
        self.embeddings = self._load_embeddings()
     
    
    

    
    