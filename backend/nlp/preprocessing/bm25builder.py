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
    registered['PRODUCT_NAME'].fillna('') + ' ' +
    registered['COMPANY_NAME'].fillna('')
)

registered['tokens'] = registered['full_product_info'].str.split()
unregistered['tokens'] = unregistered['Product Title'].str.split()

pd.set_option('display.max_colwidth', None)
print(registered[['tokens']].head())
print(unregistered[['tokens']].head())


#### Build the BM25 index ####
###!pip install rank-bm25

#create document indexes for registered#
tokenized_reg_corpus = registered['tokens'].tolist()
bm25_registered = BM25Okapi(tokenized_reg_corpus)

#save bm25 as pickle
with open(asset_dir / "bm25_registered.pkl", 'wb') as f:
    pickle.dump(bm25_registered, f)