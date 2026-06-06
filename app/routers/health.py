from fastapi import APIRouter
from app.models.schemas import HealthResponse
from app.services.vector_store import vector_store
from app.services.hybrid_search import hybrid_search
from app.config import LLM_MODEL, EMBEDDING_MODEL

router = APIRouter()


@router.get("/health", tags=["System"])
async def health_check():
    from app.main import ingestion_status
    return {
        "status": "healthy",
        "collection_size": vector_store.get_count(),
        "bm25_index_size": hybrid_search.get_index_size(),
        "model": LLM_MODEL,
        "embedding_model": EMBEDDING_MODEL,
        "ingestion_state": ingestion_status.get("state", "unknown"),
        "ingestion_message": ingestion_status.get("message", ""),
    }
