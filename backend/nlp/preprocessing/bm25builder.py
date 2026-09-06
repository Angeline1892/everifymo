from pathlib import Path
import pandas as pd
import pickle
from rank_bm25 import BM25Okapi

#### Tokenization of both dataframes ####

BASE_DIR = Path(__file__).resolve().parent
asset_dir = BASE_DIR.parent / "assets"
asset_dir.mkdir(parents=True, exist_ok=True)

registered = pd.read_pickle(asset_dir / "Registered_cleaned.pkl")
unregistered = pd.read_pickle(asset_dir / "Unregistered_cleaned.pkl")

registered['full_product_info'] = (
    registered['BRAND_NAME'].fillna('') + ' ' +
    registered['PRODUCT_NAME'].fillna('')
)

registered['tokens'] = registered['full_product_info'].str.split()
unregistered['tokens'] = unregistered['Product Title'].str.split()

with open(asset_dir / "Registered_cleaned.pkl", 'wb') as f:
    pickle.dump(registered, f)

with open(asset_dir / "Unregistered_cleaned.pkl", 'wb') as f:
    pickle.dump(unregistered, f)

#### ========== Build the BM25 index ============= ####


#create document indexes for registered
tokenized_reg_corpus = registered['tokens'].tolist()

# Filter out NaN values from the tokenized_reg_corpus
tokenized_reg_corpus = [doc if isinstance(doc, list) else [] for doc in tokenized_reg_corpus]
bm25_registered = BM25Okapi(tokenized_reg_corpus)

#save bm25 as pickle
with open(asset_dir / "bm25_registered.pkl", 'wb') as f:
    pickle.dump(bm25_registered, f)



#for unregistered products titles
tokenized_unreg_corpus = unregistered['tokens'].tolist()

# Filter out NaN values from the tokenized_unreg_corpus
tokenized_unreg_corpus = [doc if isinstance(doc, list) else [] for doc in tokenized_unreg_corpus]
bm25_unregistered = BM25Okapi(tokenized_unreg_corpus)

with open(asset_dir / "bm25_unregistered.pkl", 'wb') as f:
    pickle.dump(bm25_unregistered, f)