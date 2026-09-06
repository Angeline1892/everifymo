
import pandas as pd
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
asset_dir = BASE_DIR.parent / "assets"
asset_dir.mkdir(parents=True, exist_ok=True)

SBERT_MODEL_PATH = Path(__file__).resolve().parent
sbert_dir = SBERT_MODEL_PATH.parent / "finetuned_sbert"

finetuned_model = SentenceTransformer(str(sbert_dir))

registered = pd.read_pickle(asset_dir / "Registered_cleaned.pkl")
unregistered = pd.read_pickle(asset_dir / "Unregistered_cleaned.pkl")

sbert_registered_embeddings_finetuned = finetuned_model.encode(
    registered['full_product_info'].fillna('').astype(str).tolist(),
    show_progress_bar=True
)

sbert_unregistered_embeddings_finetuned = finetuned_model.encode(
    unregistered['Product Title'].fillna('').astype(str).tolist(),
    show_progress_bar=True
)

np.save(asset_dir / "sbert_registered_embeddings_finetuned.npy", sbert_registered_embeddings_finetuned)
np.save(asset_dir / "sbert_unregistered_embeddings_finetuned.npy", sbert_unregistered_embeddings_finetuned)