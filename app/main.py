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
    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        ingestion_status = {
            "state": "running",
            "message": f"Ingesting equipment data… (attempt {attempt}/{max_attempts})",
        }
        print(f"[Ingest] Starting attempt {attempt}/{max_attempts}…")
        try:
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, ingestion_pipeline.run)
            ingestion_status = {"state": "done", "message": result["message"]}
            print(f"[Ingest] {result['message']}")
            return
        except Exception as e:
            print(f"[Ingest] Attempt {attempt} failed: {e}")
            if attempt < max_attempts:
                wait = 30 * attempt  # 30s, 60s
                ingestion_status = {
                    "state": "retrying",
                    "message": f"Attempt {attempt} failed. Retrying in {wait}s…",
                }
                await asyncio.sleep(wait)
            else:
                ingestion_status = {
                    "state": "failed",
                    "message": f"All {max_attempts} attempts failed: {e}. Call POST /api/ingest to retry.",
                }
                print(f"[Ingest] All attempts exhausted. Use POST /api/ingest to retry.")


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
    # Serve any file that exists in dist/ directly (CSS, JS, images, fonts).
    # Fall back to index.html for everything else (React SPA client-side routing).
    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        candidate = os.path.join(frontend_dist, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
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
