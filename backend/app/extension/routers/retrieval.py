from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nlp.retrieval.retrieval import evaluate_match


class RetrievalRequest(BaseModel):
    title: str
    top_k: int = 5


router = APIRouter()


@router.post("/verify")
async def verify(request: RetrievalRequest):
    if not request.title or not request.title.strip():
        raise HTTPException(status_code=400, detail="title is required")

    try:
        evaluation_result = evaluate_match(request.title)
        verdict = evaluation_result["verdict"]
        return {
            "query": evaluation_result["query"],
            "top5_registered": [
                {
                    "title": candidate["title"],
                    "score": candidate.get("faiss_score", 0),
                }
                for candidate in evaluation_result["top5_registered"]
            ],
            "verdict": verdict,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
