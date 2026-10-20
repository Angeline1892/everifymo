#Building the faiss index
import faiss
import numpy as np
from pathlib import Path
from embeddingbuilder import sbert_registered_embeddings_finetuned, sbert_unregistered_embeddings_finetuned

BASE_DIR = Path(__file__).resolve().parent
asset_dir = BASE_DIR.parent / "assets"
asset_dir.mkdir(parents=True, exist_ok=True)

if 'registered_embeddings' not in globals():
    registered_embeddings = np.load(asset_dir / "sbert_registered_embeddings_finetuned.npy")

if 'unregistered_embeddings' not in globals():
    unregistered_embeddings = np.load(asset_dir / "sbert_unregistered_embeddings_finetuned.npy")

faiss.normalize_L2(registered_embeddings)
faiss.normalize_L2(unregistered_embeddings)

d = registered_embeddings.shape[1]
registered_index = faiss.IndexFlatIP(d)
registered_index.add(registered_embeddings)

d2 = unregistered_embeddings.shape[1]
unregistered_index = faiss.IndexFlatIP(d2)
unregistered_index.add(unregistered_embeddings)


faiss.write_index(registered_index, str(asset_dir / "faiss_registered.index"))
faiss.write_index(unregistered_index, str(asset_dir / "faiss_unregistered.index"))