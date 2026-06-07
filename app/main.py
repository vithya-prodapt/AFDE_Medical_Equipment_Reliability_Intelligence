import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager

from app.routers import health, query, admin
from app.data.ingest import ingestion_pipeline
from app.config import APP_HOST, APP_PORT

# Tracks background ingestion status — readable via /health
ingestion_status: dict = {"state": "pending", "message": "Ingestion not started yet."}


async def _background_ingest():
    global ingestion_status
    ingestion_status = {"state": "running", "message": "Ingesting equipment data…"}
    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, ingestion_pipeline.run)
        ingestion_status = {"state": "done", "message": result["message"]}
        print(f"[Ingest] {result['message']}")
    except Exception as e:
        ingestion_status = {"state": "failed", "message": str(e)}
        print(f"[Ingest] Failed: {e}. Use POST /api/ingest to retry.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Startup] Medical Equipment AI starting up…")
    # Fire-and-forget: API is available immediately; ingestion runs in the background.
    asyncio.create_task(_background_ingest())
    yield
    print("[Shutdown] Medical Equipment AI shutting down.")


app = FastAPI(
    title="AI-Powered Medical Equipment Reliability Intelligence Assistant",
    description=(
        "Multi-agent RAG system for biomedical equipment maintenance intelligence. "
        "Uses hybrid search (vector + BM25), four specialized agents, and LLM-as-judge evaluation."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(query.router)
app.include_router(admin.router)

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
frontend_dist = os.path.join(frontend_dir, "dist")
index_html = os.path.join(frontend_dist, "index.html")

if os.path.isdir(frontend_dist):
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    # Catch-all: serve index.html for every non-API path (React SPA routing)
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        return FileResponse(index_html)
else:
    @app.get("/", include_in_schema=False)
    async def root():
        return {
            "message": "Medical Equipment AI API — frontend not built.",
            "docs": "/docs",
            "health": "/health",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=APP_HOST, port=APP_PORT, reload=False)
