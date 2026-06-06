# AI-Powered Medical Equipment Reliability Intelligence Assistant

A multi-agent RAG system for biomedical equipment maintenance intelligence. Retrieves historical incident records, analyzes failure patterns, generates structured maintenance plans, and produces explainable recommendations — powered by GPT-4o-mini and hybrid vector + keyword search.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Setup](#project-setup)
- [Equipment Data Ingestion](#equipment-data-ingestion)
- [Running the Application](#running-the-application)
- [Sample Maintenance Query](#sample-maintenance-query)
- [Example Reliability Recommendation](#example-reliability-recommendation)
- [API Usage Examples](#api-usage-examples)
- [Frontend Login Credentials](#frontend-login-credentials)
- [Project Structure](#project-structure)

---

## Architecture Overview

```
User Query
    │
    ▼
[FastAPI REST API]
    │
    ▼
[Guardrails] — Input validation, PII masking, injection detection
    │
    ▼
[LangGraph Orchestrator] — 4-agent sequential pipeline
    │
    ├─ 1. Retrieval Agent   → Hybrid Search (ChromaDB + BM25 → RRF fusion)
    ├─ 2. Reliability Agent → Anomaly detection + LLM failure analysis
    ├─ 3. Maintenance Agent → Structured maintenance plan (LLM)
    └─ 4. Recommendation Agent → Final recommendation + LLM-as-Judge
    │
    ▼
[React + Vite Frontend] — Dashboard, Analyze, Reports
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Agent Orchestration | LangGraph StateGraph |
| LLM | GPT-4o-mini (via proxy gateway) |
| Embeddings | OpenAI text-embedding-3-small |
| Vector Store | ChromaDB (HNSW, Cosine Similarity) |
| Keyword Search | BM25 (rank-bm25) |
| Search Fusion | Reciprocal Rank Fusion (Vector 0.6 + BM25 0.4) |
| PII Detection | Presidio Analyzer + Regex fallback |
| Data Processing | Pandas, NumPy |
| Frontend | React 18 + Vite 5 |

---

## Project Setup

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- pip

### 1. Clone the Repository

```bash
git clone <repository-url>
cd medical-equipment-ai
```

### 2. Create and Activate Virtual Environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://keygateway.arshnivlabs.com/v1
LLM_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small
CHROMA_PERSIST_DIR=/tmp/chroma_db
COLLECTION_NAME=medical_equipment_incidents
MAX_RETRIEVAL_RESULTS=10
EMBEDDING_BATCH_SIZE=50
APP_PORT=8000
APP_HOST=0.0.0.0
SAMPLE_DATA_SIZE=5000
```

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | API key for the LLM gateway | `learner042` |
| `OPENAI_BASE_URL` | Proxy gateway base URL | keygateway URL |
| `LLM_MODEL` | LLM model name | `gpt-4o-mini` |
| `EMBEDDING_MODEL` | Embedding model name | `text-embedding-3-small` |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path | `/tmp/chroma_db` |
| `SAMPLE_DATA_SIZE` | Number of synthetic incidents to generate | `5000` |
| `APP_PORT` | Server port | `8000` |

### 5. Build the Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

---

## Equipment Data Ingestion

### How It Works

On startup, the application automatically ingests equipment maintenance data in the background:

1. **Load** — Reads the AI4I Predictive Maintenance CSV dataset or generates synthetic incidents
2. **Clean** — Handles missing values, maps failure codes to descriptions
3. **Embed** — Generates embeddings via text-embedding-3-small (batches of 50)
4. **Index** — Stores vectors in ChromaDB and builds an in-memory BM25 keyword index

The API is available immediately; ingestion runs as a background task. Check status via `GET /health`.

### Failure Type Mapping

| Code | Description |
|---|---|
| TWF | Component Wear Failure |
| HDF | Heat Dissipation Failure |
| PWF | Power System Failure |
| OSF | Mechanical Overstrain Failure |
| RNF | Unexpected System Failure |
| No Failure | Routine Maintenance Check |

### Equipment Categories

| Risk Level | Equipment Types |
|---|---|
| High | MRI System, CT Scanner, PET Scanner, Digital X-Ray System |
| Medium | Ventilator, Ultrasound Scanner, Anesthesia Machine, Dialysis Machine |
| Low | Patient Monitor, Infusion Pump, ECG Monitor, Pulse Oximeter, Defibrillator |

### Hospital Units

ICU Ward A, ICU Ward B, Emergency Department, Radiology Department, Surgical Unit, Cardiac Care Unit, Neurology Department, Oncology Unit

### Manual Ingestion (via API)

```bash
# Default — generates 5000 synthetic incidents
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"sample_size": 5000, "force_reingest": false}'

# Force re-ingest (clears existing data)
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"sample_size": 5000, "force_reingest": true}'

# Ingest from your own CSV file
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"data_path": "/path/to/your/dataset.csv", "force_reingest": true}'
```

**Response:**
```json
{
  "status": "success",
  "records_ingested": 5000,
  "collection_size": 5000,
  "message": "Ingested 5000 records into collection 'medical_equipment_incidents'."
}
```

---

## Running the Application

### Start the Backend Server

```bash
python -m app.main
```

Or with Uvicorn directly:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

| URL | Purpose |
|---|---|
| `http://localhost:8000` | Frontend UI (served from `frontend/dist/`) |
| `http://localhost:8000/docs` | Interactive Swagger API docs |
| `http://localhost:8000/redoc` | ReDoc API reference |

### Development Mode (Frontend Hot Reload)

```bash
# Terminal 1 — Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend dev server
cd frontend
npm run dev
# Runs at http://localhost:5173
```

---

## Sample Maintenance Query

### Request

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "MRI system showing intermittent shutdown with elevated temperature readings",
    "equipment_type": "MRI System",
    "hospital_unit": "Radiology Department",
    "severity": "High",
    "top_k": 5,
    "enable_evaluation": false
  }'
```

### Query Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `query` | string | Yes | Plain-language description of the equipment issue (3–1000 chars) |
| `equipment_type` | string | No | Filter by equipment type (e.g. `MRI System`, `Ventilator`) |
| `hospital_unit` | string | No | Filter by department (e.g. `Radiology Department`, `ICU Ward A`) |
| `severity` | string | No | Filter severity: `Low`, `Medium`, `High`, `Critical` |
| `top_k` | integer | No | Number of similar incidents to retrieve (1–20, default 10) |
| `enable_evaluation` | boolean | No | Run LLM-as-Judge evaluation on the recommendation |

---

## Example Reliability Recommendation

### Full Response

```json
{
  "query": "MRI system showing intermittent shutdown with elevated temperature readings",
  "retrieved_incidents": [
    {
      "incident_id": "INC-00342",
      "equipment_type": "MRI System",
      "hospital_unit": "Radiology Department",
      "failure_type": "Heat Dissipation Failure",
      "severity": "High",
      "air_temperature": 318.2,
      "process_temperature": 309.7,
      "rotational_speed": 1432,
      "torque": 47.3,
      "tool_wear": 214,
      "machine_failure": true,
      "hybrid_score": 0.751
    }
  ],
  "reliability_analysis": {
    "failure_pattern": "Recurring Heat Dissipation Failures linked to elevated ambient temperature",
    "anomaly_indicators": [
      "Air temperature 318.2K exceeds safe threshold of 315K",
      "Process temperature delta of 8.5K above baseline",
      "Tool wear at 214 min approaching critical threshold of 300 min"
    ],
    "risk_level": "High",
    "correlation_findings": [
      "Temperature spikes correlate with peak imaging workload (09:00–13:00)",
      "3 of 5 similar incidents occurred within 30 days of each other"
    ],
    "equipment_health_score": 0.42,
    "trend_analysis": "Degrading — health score declined from 0.71 to 0.42 over last 6 incidents"
  },
  "maintenance_plan": {
    "immediate_actions": [
      "Shut down MRI system and allow full cooling cycle (minimum 4 hours)",
      "Inspect cooling fans and heat exchangers for blockage or failure",
      "Verify ambient room temperature is within manufacturer specification (18–22°C)"
    ],
    "short_term_actions": [
      "Replace thermal compound on gradient amplifier heat sink",
      "Clean all cooling vents and air filters",
      "Schedule thermal imaging scan of power electronics"
    ],
    "long_term_actions": [
      "Upgrade HVAC capacity in Radiology Department",
      "Install continuous temperature monitoring with automated alerts",
      "Implement load-balancing schedule to reduce peak thermal stress"
    ],
    "estimated_downtime_hours": 12,
    "priority_level": "High",
    "parts_to_inspect": [
      "Cooling fans", "Heat exchangers", "Gradient amplifier",
      "Air filters", "Thermal sensors"
    ]
  },
  "recommendation": "The MRI System is exhibiting a clear pattern of Heat Dissipation Failures driven by sustained elevated operating temperatures. Root cause analysis points to insufficient cooling capacity combined with peak-load thermal stress during morning imaging sessions. Immediate shutdown is recommended to prevent permanent damage to gradient coils. Priority actions: cooling system inspection and room temperature verification before restart. Patient safety impact: reroute critical MRI capacity to the backup unit in ICU Ward B during downtime.",
  "confidence_score": 0.78,
  "token_usage": {
    "prompt_tokens": 1842,
    "completion_tokens": 487,
    "total_tokens": 2329
  },
  "evaluation_results": null
}
```

---

## API Usage Examples

### 1. Health Check

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "healthy",
  "collection_size": 5000,
  "bm25_index_size": 5000,
  "model": "gpt-4o-mini",
  "embedding_model": "text-embedding-3-small",
  "ingestion_state": "done",
  "ingestion_message": "Ingested 5000 records successfully."
}
```

---

### 2. Submit a Maintenance Query

```bash
curl -X POST http://localhost:8000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Ventilator pressure alarm triggering repeatedly in ICU",
    "equipment_type": "Ventilator",
    "hospital_unit": "ICU Ward A",
    "top_k": 5
  }'
```

---

### 3. Quick Hybrid Search (no LLM pipeline)

Returns raw ranked incidents without running agents — useful for fast lookups.

```bash
curl "http://localhost:8000/api/search?q=CT+scanner+overheating&top_k=5&equipment_type=CT+Scanner"
```

```json
{
  "query": "CT scanner overheating",
  "total_results": 5,
  "incidents": [
    {
      "incident_id": "INC-01847",
      "equipment_type": "CT Scanner",
      "hospital_unit": "Radiology Department",
      "failure_type": "Heat Dissipation Failure",
      "severity": "High",
      "machine_failure": true,
      "hybrid_score": 0.823
    }
  ]
}
```

---

### 4. Get Knowledge Base Statistics

```bash
curl http://localhost:8000/api/stats
```

```json
{
  "total_records": 5000,
  "equipment_type_distribution": {
    "MRI System": 312,
    "CT Scanner": 287,
    "Ventilator": 445
  },
  "severity_distribution": {
    "Low": 2140,
    "Medium": 1680,
    "High": 890,
    "Critical": 290
  },
  "failure_type_distribution": {
    "Heat Dissipation Failure": 743,
    "Component Wear Failure": 612,
    "Power System Failure": 389
  },
  "hospital_unit_distribution": {
    "ICU Ward A": 648,
    "Radiology Department": 521,
    "Emergency Department": 734
  }
}
```

---

### 5. Dashboard Filter (by Equipment + Department)

```bash
curl "http://localhost:8000/api/dashboard-filter?equipment_type=MRI+System&hospital_unit=Radiology+Department"
```

---

### 6. LLM Monitoring Stats

```bash
curl http://localhost:8000/api/monitoring
```

```json
{
  "llm_stats": {
    "total_calls": 142,
    "error_calls": 3,
    "error_rate_pct": 2.11,
    "avg_latency_ms": 1847.3,
    "total_prompt_tokens": 284610,
    "total_completion_tokens": 69174
  }
}
```

---

### 7. Run LLM-as-Judge Evaluation

Evaluates a recommendation on 4 dimensions: relevancy, faithfulness, maintenance quality, overall score.

```bash
curl -X POST http://localhost:8000/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "query": "MRI overheating issue",
    "recommendation": "Inspect cooling fans and replace heat sink compound...",
    "context": "Incident INC-00342: MRI System, Heat Dissipation Failure, High severity..."
  }'
```

```json
{
  "answer_relevancy": 0.88,
  "faithfulness": 0.91,
  "maintenance_quality": 0.84,
  "overall_score": 0.876,
  "llm_judge_verdict": "Accept — recommendation is grounded in retrieved incidents and provides specific, safe, prioritized actions."
}
```

---

### 8. Reset Knowledge Base

Clears ChromaDB collection and BM25 index. Use before re-ingesting with new data.

```bash
curl -X DELETE http://localhost:8000/api/reset
```

---

## Frontend Login Credentials

| Role | Username | Password | Access |
|---|---|---|---|
| Administrator | `admin` | `admin@123` | Dashboard, Analyze, Reports, Monitoring |
| Biomedical Engineer | `biomedical` | `biomed@123` | Dashboard, Analyze, Reports, Monitoring |
| Maintenance Technician | `technician` | `tech@123` | Dashboard, Analyze, Reports only |

---

## Project Structure

```
medical-equipment-ai/
│
├── app/                            # FastAPI backend
│   ├── main.py                     # Entry point, lifespan, router mounting
│   ├── config.py                   # Environment config, equipment taxonomy
│   │
│   ├── agents/                     # LangGraph multi-agent pipeline
│   │   ├── orchestrator.py         # StateGraph definition and routing
│   │   ├── state.py                # AgentState TypedDict
│   │   ├── retrieval_agent.py      # Query validation, expansion, hybrid search
│   │   ├── reliability_agent.py    # Anomaly detection + LLM analysis
│   │   ├── maintenance_agent.py    # Structured maintenance plan generation
│   │   └── recommendation_agent.py # Final recommendation + LLM-as-Judge
│   │
│   ├── services/                   # Shared infrastructure
│   │   ├── llm_service.py          # OpenAI wrapper, 500-token cap, call logging
│   │   ├── embedding_service.py    # Batch embeddings with retry logic
│   │   ├── vector_store.py         # ChromaDB CRUD and analytics
│   │   ├── hybrid_search.py        # BM25 index + RRF fusion
│   │   └── guardrails.py           # Input validation, PII masking
│   │
│   ├── data/
│   │   ├── preprocessor.py         # Synthetic incident generation + CSV loader
│   │   └── ingest.py               # Ingestion pipeline orchestrator
│   │
│   ├── models/
│   │   └── schemas.py              # All Pydantic request/response models
│   │
│   ├── routers/
│   │   ├── health.py               # GET /health
│   │   ├── query.py                # POST /api/query, /evaluate; GET /search
│   │   └── admin.py                # POST /api/ingest; GET /api/stats, /monitoring
│   │
│   └── evaluation/
│       └── evaluator.py            # LLM-as-Judge 4-metric evaluation
│
├── frontend/                       # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                 # Root: auth, routing, filter state
│   │   ├── index.css               # Global styles
│   │   └── components/
│   │       ├── Login.jsx           # Role-based login screen
│   │       ├── Sidebar.jsx         # Navigation + filters
│   │       ├── MainDashboard.jsx   # KPI cards, stacked bar chart, line chart
│   │       ├── AnalysisPage.jsx    # Query form + pipeline results
│   │       ├── Reports.jsx         # Analytics report (9 chart panels)
│   │       ├── Dashboard.jsx       # LLM monitoring (admin/biomedical only)
│   │       ├── GuardrailsPanel.jsx # Pre/post processing checks display
│   │       └── EvaluationPanel.jsx # LLM judge verdict display
│   ├── package.json
│   └── vite.config.js
│
├── logs/
│   └── llm_calls.log               # Rotating LLM call logs (5 MB × 3 backups)
│
├── requirements.txt
├── .env.example
├── render.yaml                     # Render.com deployment config
└── README.md
```

---

## Notes

- **Token limit** — The API gateway enforces a hard cap of 500 output tokens per LLM call. All agent prompts are designed to fit within this constraint.
- **ChromaDB persistence** — Default path is `/tmp/chroma_db`. On ephemeral filesystems (e.g. Render free tier), data re-ingests automatically on each cold start.
- **PII handling** — Queries are scanned for PII (emails, phone numbers, NHS numbers) before reaching the LLM. Detected entities are masked with placeholder tokens.
- **Evaluation is optional** — Set `"enable_evaluation": true` in the query request to activate LLM-as-Judge scoring. This adds approximately 1–2 extra LLM calls per query.
- **Ingestion on startup** — Data ingestion runs as a background task; the API responds immediately. Poll `GET /health` to confirm `ingestion_state: "done"` before submitting queries.
