import re
import sys
from pathlib import Path

import faiss
import numpy as np
import pandas as pd
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

from nlp.common.clean import clean_title

DEFAULT_PROTECTED_VOCAB = {
    "wipes",
    "baby",
    "sunscreen",
    "face",
    "skin",
    "serum",
    "lotion",
    "cream",
    "cleanser",
    "treatment",
    "shampoo",
    "conditioner",
    "soap",
    "powder",
    "vitamin",
    "oil",
    "spray",
}

ASSET_DIR = Path(__file__).resolve().parents[1] / "assets"
ASSET_DIR.mkdir(parents=True, exist_ok=True)

_model = None
_registered_df = None
_unregistered_df = None
_bm25_registered = None
_bm25_unregistered = None
_registered_embeddings = None
_unregistered_embeddings = None


def _load_retrieval_assets():
    global _model, _registered_df, _unregistered_df
    global _bm25_registered, _bm25_unregistered
    global _registered_embeddings, _unregistered_embeddings

    if _model is not None and _registered_df is not None and _unregistered_df is not None:
        return

    _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    registered_path = ASSET_DIR / "Registered_cleaned.pkl"
    unregistered_path = ASSET_DIR / "Unregistered_cleaned.pkl"

    if not registered_path.exists():
        raise FileNotFoundError(f"Missing registered asset: {registered_path}")
    if not unregistered_path.exists():
        raise FileNotFoundError(f"Missing unregistered asset: {unregistered_path}")

    _registered_df = pd.read_pickle(registered_path)
    _unregistered_df = pd.read_pickle(unregistered_path)

    registered_title_col = _resolve_title_column(_registered_df)
    unregistered_title_col = _resolve_title_column(_unregistered_df)

    registered_tokens = _registered_df[registered_title_col].fillna("").astype(str).apply(lambda text: clean_title(text).split()).tolist()
    unregistered_tokens = _unregistered_df[unregistered_title_col].fillna("").astype(str).apply(lambda text: clean_title(text).split()).tolist()

    _bm25_registered = BM25Okapi(registered_tokens)
    _bm25_unregistered = BM25Okapi(unregistered_tokens)

    registered_embeddings_path = ASSET_DIR / "registered_embeddings.npy"
    if registered_embeddings_path.exists():
        _registered_embeddings = np.load(registered_embeddings_path)
    else:
        _registered_embeddings = _model.encode(_registered_df[registered_title_col].fillna("").astype(str).tolist())
        np.save(registered_embeddings_path, _registered_embeddings)

    unregistered_embeddings_path = ASSET_DIR / "unregistered_embeddings.npy"
    if unregistered_embeddings_path.exists():
        _unregistered_embeddings = np.load(unregistered_embeddings_path)
    else:
        _unregistered_embeddings = _model.encode(_unregistered_df[unregistered_title_col].fillna("").astype(str).tolist())
        np.save(unregistered_embeddings_path, _unregistered_embeddings)


def _resolve_title_column(df):
    available = ["full_product_info", "PRODUCT_NAME", "product_name", "Product Title"]
    for col in available:
        if col in df.columns:
            return col
    raise KeyError(f"No suitable title column found in dataset. Available columns: {list(df.columns)}")


def is_quantity_token(word):
    return bool(re.match(r"^\d+(s|ml|g|kg|mg|pcs|pc|2w)?$", str(word)))


def has_attribute_conflict(query_tokens, candidate_tokens, protected_vocab=None):
    if protected_vocab is None:
        protected_vocab = DEFAULT_PROTECTED_VOCAB

    query_attrs = set(str(token).lower() for token in (query_tokens or [])) & set(protected_vocab)
    candidate_attrs = set(str(token).lower() for token in (candidate_tokens or [])) & set(protected_vocab)
    return bool(query_attrs - candidate_attrs)


def _json_safe(value):
    if isinstance(value, dict):
        cleaned = {}
        for key, nested_value in value.items():
            if key == "embedding":
                continue
            cleaned[key] = _json_safe(nested_value)
        return cleaned

    if isinstance(value, list):
        return [_json_safe(item) for item in value]

    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]

    if isinstance(value, np.ndarray):
        return [_json_safe(item) for item in value.tolist()]

    if isinstance(value, np.generic):
        return value.item()

    return value


def retrieve(query, protected_vocab=None):
    if query is None or not str(query).strip():
        raise ValueError("product title is required")

    _load_retrieval_assets()

    cleaned_query = clean_title(query)
    query_tokens = cleaned_query.split()
    if not query_tokens:
        raise ValueError("product title is required after cleaning")

    cleaned_embedded_query = _model.encode([cleaned_query])
    cleaned_embedded_query = np.array(cleaned_embedded_query, dtype="float32")
    faiss.normalize_L2(cleaned_embedded_query)
    processed_query = cleaned_embedded_query[0]

    scores_reg = _bm25_registered.get_scores(query_tokens)
    top_idx_reg = np.argsort(scores_reg)[::-1][:50]

    candidates_reg = []
    for idx in top_idx_reg:
        candidates_reg.append({
            "index": int(idx),
            "title": str(_registered_df.iloc[idx][_resolve_title_column(_registered_df)]),
            "bm25_score": float(scores_reg[idx]),
            "embedding": _registered_embeddings[idx],
        })

    for candidate in candidates_reg:
        candidate["cosine_similarity"] = float(np.dot(processed_query, np.asarray(candidate["embedding"], dtype="float32")))

    candidates_reg = sorted(candidates_reg, key=lambda item: item["cosine_similarity"], reverse=True)

    scores_unreg = _bm25_unregistered.get_scores(query_tokens)
    top_idx_unreg = np.argsort(scores_unreg)[::-1][:50]

    candidates_unreg = []
    for idx in top_idx_unreg:
        candidates_unreg.append({
            "index": int(idx),
            "title": str(_unregistered_df.iloc[idx]["Product Title"]),
            "bm25_score": float(scores_unreg[idx]),
            "embedding": _unregistered_embeddings[idx],
        })

    for candidate in candidates_unreg:
        candidate["cosine_similarity"] = float(np.dot(processed_query, np.asarray(candidate["embedding"], dtype="float32")))

    candidates_unreg = sorted(candidates_unreg, key=lambda item: item["cosine_similarity"], reverse=True)

    top_registered = candidates_reg[0] if candidates_reg else None
    top_unregistered = candidates_unreg[0] if candidates_unreg else None

    reg_score = float(top_registered["cosine_similarity"]) if top_registered else 0.0
    unreg_score = float(top_unregistered["cosine_similarity"]) if top_unregistered else 0.0
    total = reg_score + unreg_score
    if total <= 0:
        registered_pct = 50.0
        unregistered_pct = 50.0
    else:
        registered_pct = (reg_score / total) * 100.0
        unregistered_pct = (unreg_score / total) * 100.0

    attribute_conflict = False
    if top_registered is not None:
        attribute_conflict = has_attribute_conflict(query_tokens, top_registered["title"].split(), protected_vocab or DEFAULT_PROTECTED_VOCAB)

    margin = 0.05
    if reg_score < 0.75:
        verdict = "not verified"
    elif attribute_conflict:
        verdict = "not verified (attribute mismatch)"
    elif unreg_score >= (reg_score - margin):
        verdict = "ambiguous — flag for review"
    else:
        verdict = "verified"

    result = {
        "query": query,
        "cleaned_query": cleaned_query,
        "query_tokens": query_tokens,
        "status": "registered" if verdict == "verified" else "unverified",
        "registered": candidates_reg,
        "unregistered": candidates_unreg,
        "top_registered_match": top_registered,
        "top_unregistered_match": top_unregistered,
        "registered_likelihood": round(registered_pct, 2),
        "unregistered_likelihood": round(unregistered_pct, 2),
        "attribute_conflict": attribute_conflict,
        "verdict": verdict,
    }
    return _json_safe(result)


def run_retrieval_pipeline(title: str, top_k: int = 5):
    result = retrieve(title)
    result["results"] = [
        {
            "title": item["title"],
            "bm25_score": item["bm25_score"],
            "cosine_similarity": item["cosine_similarity"],
        }
        for item in result["registered"][:top_k]
    ]
    result["top_match"] = result["top_registered_match"]
    return result


def print_retrieval_summary(result):
    top_registered = result.get("top_registered_match") or {}
    top_unregistered = result.get("top_unregistered_match") or {}
    print(f"Top registered match: {top_registered.get('title', 'N/A')}")
    print(f"Top unregistered match: {top_unregistered.get('title', 'N/A')}")
    print(f"Registered likelihood: {result.get('registered_likelihood', 0):.2f}%")
    print(f"Unregistered likelihood: {result.get('unregistered_likelihood', 0):.2f}%")
    print(f"Attribute conflict: {result.get('attribute_conflict', False)}")
    print(f"Verdict: {result.get('verdict', 'not verified')}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = input("Enter extracted product title: ").strip()

    result = retrieve(query)
    print_retrieval_summary(result)