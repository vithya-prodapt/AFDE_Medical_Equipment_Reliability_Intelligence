from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from typing import Optional
from app.models.schemas import IngestRequest, IngestResponse, StatsResponse
from app.data.ingest import ingestion_pipeline
from app.services.vector_store import vector_store
from app.services.llm_service import llm_service

router = APIRouter(prefix="/api", tags=["Administration"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_data(request: IngestRequest):
    try:
        result = ingestion_pipeline.run(
            data_path=request.data_path,
            sample_size=request.sample_size,
            force_reingest=request.force_reingest,
        )
        return IngestResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")


@router.get("/stats", response_model=StatsResponse)
async def get_stats():
    try:
        stats = vector_store.get_stats()
        return StatsResponse(
            collection_size=stats["total_documents"],
            bm25_index_size=stats["total_documents"],
            equipment_type_distribution=stats.get("equipment_type_distribution", {}),
            severity_distribution=stats.get("severity_distribution", {}),
            failure_type_distribution=stats.get("failure_type_distribution", {}),
            hospital_unit_distribution=stats.get("hospital_unit_distribution", {}),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats unavailable: {str(e)}")


@router.get("/monitoring")
async def get_monitoring():
    try:
        stats = vector_store.get_stats()
        return {
            "llm": llm_service.get_monitoring_stats(),
            "equipment_type_distribution": stats.get("equipment_type_distribution", {}),
            "severity_distribution": stats.get("severity_distribution", {}),
            "failure_type_distribution": stats.get("failure_type_distribution", {}),
            "hospital_unit_distribution": stats.get("hospital_unit_distribution", {}),
            "total_records": stats.get("total_documents", 0),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monitoring unavailable: {str(e)}")


@router.get("/equipment-risk")
async def get_equipment_risk(
    equipment_type: Optional[str] = Query(None),
    hospital_unit: Optional[list[str]] = Query(None),
):
    try:
        breakdown = vector_store.get_equipment_severity_breakdown(equipment_type, hospital_unit)
        return {"breakdown": breakdown}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard-filter")
async def dashboard_filter(
    equipment_type: Optional[str] = Query(None),
    hospital_unit: Optional[list[str]] = Query(None),
):
    try:
        stats = vector_store.get_filtered_stats(equipment_type, hospital_unit)
        breakdown = vector_store.get_equipment_severity_breakdown(equipment_type, hospital_unit)
        return {
            "total_records": stats["total_documents"],
            "severity_distribution": stats["severity_distribution"],
            "failure_type_distribution": stats["failure_type_distribution"],
            "equipment_type_distribution": stats["equipment_type_distribution"],
            "hospital_unit_distribution": stats["hospital_unit_distribution"],
            "breakdown": breakdown,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reset")
async def reset_collection():
    try:
        vector_store.delete_collection()
        from app.services.hybrid_search import hybrid_search
        hybrid_search.bm25_index = None
        hybrid_search.bm25_corpus = []
        hybrid_search.bm25_metadatas = []
        hybrid_search.bm25_ids = []
        return {"status": "success", "message": "Collection reset successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {str(e)}")


@router.post("/rollback")
async def rollback_collection():
    """
    Restores the knowledge base to the last backup taken before a re-ingest.
    A backup is created automatically whenever force_reingest=true is used.
    """
    if not vector_store.has_backup():
        raise HTTPException(
            status_code=404,
            detail="No backup found. Run /api/ingest with force_reingest=true first to create one.",
        )
    try:
        restored = vector_store.restore_from_backup()
        if not restored:
            raise HTTPException(status_code=500, detail="Restore failed — backup may be empty.")
        from app.services.hybrid_search import hybrid_search
        from app.data.ingest import ingestion_pipeline
        ingestion_pipeline._rebuild_bm25_index()
        return {
            "status": "success",
            "collection_size": vector_store.get_count(),
            "message": "Knowledge base rolled back to previous backup successfully.",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rollback failed: {str(e)}")


@router.get("/backup-status")
async def backup_status():
    """Returns whether a backup collection exists and how large it is."""
    has_bk = vector_store.has_backup()
    return {
        "has_backup": has_bk,
        "message": "Backup available — use POST /api/rollback to restore." if has_bk
                   else "No backup available.",
    }


@router.post("/evaluate-ragas")
async def evaluate_ragas(request: dict):
    """
    Runs RAGAS-compatible evaluation on a query+answer+contexts set.
    Body: { "query": "...", "answer": "...", "contexts": ["...", "..."] }
    """
    try:
        from app.evaluation.ragas_evaluator import ragas_evaluator
        query = request.get("query", "")
        answer = request.get("answer", "")
        contexts = request.get("contexts", [])
        if not query or not answer:
            raise HTTPException(status_code=400, detail="query and answer are required.")
        result = ragas_evaluator.evaluate(query=query, answer=answer, contexts=contexts)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAGAS evaluation failed: {str(e)}")
