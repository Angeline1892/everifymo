import pickle
from pathlib import Path
import importlib.util
import sys
import pandas as pd
import numpy as np
from rank_bm25 import BM25Okapi
import faiss
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent
ASSET_DIR = BASE_DIR.parent / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

def LoadRegAsset(asset_file: str):
    file_path = ASSET_DIR / asset_file
    try:
        registeredCleanedDf = pd.concat(map(pd.read_pickle, [file_path]))
    except FileNotFoundError:
        raise (FileNotFoundError(f"Asset file not found: {file_path}"))

    return registeredCleanedDf

def BM25RegAsset(asset_file: str):
    file_path = ASSET_DIR / asset_file
    try:
        with open(file_path, 'rb') as file:
            bm25RegisteredObj = pickle.load(file)
    except FileNotFoundError:
        raise (FileNotFoundError(f"Asset file not found: {file_path}"))

    if not isinstance(bm25RegisteredObj, BM25Okapi):
        raise TypeError(f"Expected BM25Okapi object, but got {type(bm25RegisteredObj)}")

    return bm25RegisteredObj

def LoadRegEmbedAsset(asset_file: str):
    file_path = ASSET_DIR / asset_file
    try:
        with open(file_path, 'rb') as file:
            registeredEmbeddingsArray = np.load(file)
        # print(registeredEmbeddingsArray)
    except FileNotFoundError:
        raise (FileNotFoundError(f"Asset file not found: {file_path}"))

    return registeredEmbeddingsArray

def LoadRegFaissIndex(asset_file: str):
    file_path = ASSET_DIR / asset_file
    try:
        faissRegIndexObj = faiss.read_index(str(file_path))
        print(faissRegIndexObj)
    except FileNotFoundError:
        raise (FileNotFoundError(f"Asset file not found: {file_path}"))

    return faissRegIndexObj


def load_all_assets():
    print("Running NLP Load Assets pipeline...")
    registeredCleanedDf = LoadRegAsset("Registered_cleaned.pkl")
    bm25RegisteredObj = BM25RegAsset("bm25_registered.pkl")
    registeredEmbeddingsArray = LoadRegEmbedAsset("registered_embeddings.npy")
    faissRegIndexObj = LoadRegFaissIndex("registered.index")
    print("Successfully loaded NLP assets.")

    model = SentenceTransformer("all-MiniLM-L6-v2")
    print("Model loaded successfully.")

    print("returned all assets successfully.")
    return {
        "registeredCleanedDf": registeredCleanedDf,
        "bm25RegisteredObj": bm25RegisteredObj,
        "registeredEmbeddingsArray": registeredEmbeddingsArray,
        "faissRegIndexObj": faissRegIndexObj,
        "model": model,
    }

if __name__ == "__main__":
    load_all_assets()

