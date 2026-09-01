
import pandas as pd
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer


# Load the SBERT model
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

#Create a precomputed sbert embeddings
BASE_DIR = Path(__file__).resolve().parent
asset_dir = BASE_DIR.parent / "assets"
asset_dir.mkdir(parents=True, exist_ok=True)

registered = pd.read_pickle(asset_dir / "Registered_cleaned.pkl")

if 'full_product_info' in registered.columns:
    texts = registered['full_product_info'].fillna('').astype(str).tolist()
else:
    texts = registered['PRODUCT_NAME'].fillna('').astype(str).tolist()

registered_embeddings = model.encode(texts)

#save registered_embeddings as npy
np.save(asset_dir / "registered_embeddings.npy", registered_embeddings)

print(registered_embeddings.shape)