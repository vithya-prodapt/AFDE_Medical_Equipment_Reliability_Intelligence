from fastapi import APIRouter, HTTPException
from typing import Optional
from app.models.schemas import QueryRequest, QueryResponse, EvaluationRequest, EvaluationResult
from app.agents.orchestrator import orchestrator
from app.evaluation.evaluator import evaluator
from app.services.vector_store import vector_store

router = APIRouter(prefix="/api", tags=["Query"])


@router.post("/query", response_model=QueryResponse)
async def query_equipment(request: QueryRequest):
    if vector_store.get_count() == 0:
        raise HTTPException(
            status_code=503,
            detail="Knowledge base is empty. Please run /api/ingest first.",
        )
    try:
        return orchestrator.process_query(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query processing failed: {str(e)}")


@router.post("/evaluate", response_model=EvaluationResult)
async def evaluate_recommendation(request: EvaluationRequest):
    try:
        return evaluator.evaluate(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/search")
async def quick_search(
    q: str,
    top_k: int = 5,
    equipment_type: Optional[str] = None,
    hospital_unit: Optional[str] = None,
    severity: Optional[str] = None,
):
    if vector_store.get_count() == 0:
        raise HTTPException(status_code=503, detail="Knowledge base is empty.")
    if len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="Query too short.")
    try:
        from app.services.hybrid_search import hybrid_search
        incidents = hybrid_search.search(
            query=q,
            n_results=top_k,
            equipment_type=equipment_type,
            hospital_unit=hospital_unit,
            severity=severity,
        )
        return {
            "query": q,
            "total_results": len(incidents),
            "incidents": [
                {
                    "incident_id": inc.incident_id,
                    "equipment_type": inc.equipment_type,
                    "hospital_unit": inc.hospital_unit,
                    "failure_type": inc.failure_type,
                    "severity": inc.severity,
                    "machine_failure": inc.machine_failure,
                    "hybrid_score": inc.hybrid_score,
                }
                for inc in incidents
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
