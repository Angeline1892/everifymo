#Building the faiss index
import faiss
import numpy as np
from pathlib import Path
from embeddingbuilder import registered_embeddings

BASE_DIR = Path(__file__).resolve().parent
asset_dir = BASE_DIR.parent / "assets"
asset_dir.mkdir(parents=True, exist_ok=True)

if 'registered_embeddings' not in globals():
    registered_embeddings = np.load(asset_dir / "registered_embeddings.npy")

faiss.normalize_L2(registered_embeddings)

# np.linalg.norm(registered_embeddings[0]) -- for checking if normalization is successful

d = registered_embeddings.shape[1]

registered_index = faiss.IndexFlatIP(d)

registered_index.add(registered_embeddings)

#save registered_index as index
faiss.write_index(registered_index, str(asset_dir / "registered.index"))