import numpy as np

from nlp.retrieval import retrieval


class DummyModel:
    def encode(self, texts):
        return np.array([[1.0, 0.0, 0.0], [0.9, 0.1, 0.0], [0.7, 0.3, 0.0]], dtype="float32")


class DummyBM25:
    def __init__(self, scores):
        self._scores = np.asarray(scores, dtype="float32")

    def get_scores(self, tokens):
        return self._scores


def test_retrieval_pipeline_returns_verdict_summary(monkeypatch):
    fake_assets = {
        "model": DummyModel(),
        "bm25RegisteredObj": DummyBM25([0.9, 0.7, 0.2]),
        "registeredCleanedDf": {
            "full_product_info": [
                "Biore UV Aqua Rich Watery Essence Sunscreen Face",
                "Biore UV Aqua Rich Essence Lotion",
                "Generic Face Wash",
            ]
        },
        "registeredEmbeddingsArray": np.array([
            [1.0, 0.0, 0.0],
            [0.8, 0.2, 0.0],
            [0.0, 0.0, 1.0],
        ], dtype="float32"),
        "bm25UnregisteredObj": DummyBM25([0.6, 0.5, 0.4]),
        "unregisteredCleanedDf": {
            "Product Title": [
                "Flashh Skinzz Moist Sunscreen",
                "Generic Sunscreen",
                "Other Product",
            ]
        },
        "unregisteredEmbeddingsArray": np.array([
            [0.8, 0.1, 0.0],
            [0.5, 0.5, 0.0],
            [0.0, 0.7, 0.3],
        ], dtype="float32"),
    }

    monkeypatch.setattr(retrieval, "load_all_assets", lambda: fake_assets)

    result = retrieval.run_retrieval_pipeline("Biore UV Aqua Rich Watery Essence Sunscreen for Face", top_k=2)

    assert result["query"] == "Biore UV Aqua Rich Watery Essence Sunscreen for Face"
    assert result["cleaned_query"] == "biore uv aqua rich watery essence sunscreen for face"
    assert result["top_registered_match"]["title"]
    assert result["top_unregistered_match"]["title"]
    assert "registered_likelihood" in result
    assert "unregistered_likelihood" in result
    assert "attribute_conflict" in result
    assert "verdict" in result
    assert result["status"] in {"registered", "unregistered", "unverified"}
