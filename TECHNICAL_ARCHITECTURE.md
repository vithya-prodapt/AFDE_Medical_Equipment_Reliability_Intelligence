# AI-Powered Medical Equipment Reliability Intelligence Assistant
## Technical Architecture & Stack Documentation

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Tech Stack with Reasons](#3-tech-stack-with-reasons)
4. [Layer-by-Layer Code Explanation](#4-layer-by-layer-code-explanation)
   - 4.1 Frontend Layer
   - 4.2 API Layer
   - 4.3 Guardrails Layer
   - 4.4 Multi-Agent Intelligence Pipeline (LangGraph)
   - 4.5 Hybrid Retrieval Layer
   - 4.6 Data Ingestion Pipeline
   - 4.7 Storage & Embedding Layer
   - 4.8 Evaluation & Monitoring
5. [Data Flow: End-to-End Request Lifecycle](#5-data-flow-end-to-end-request-lifecycle)
6. [Key Design Decisions](#6-key-design-decisions)
7. [File Structure Reference](#7-file-structure-reference)

---

## 1. System Overview

This system is a **Retrieval-Augmented Generation (RAG)** application built for biomedical engineers and hospital maintenance teams. It accepts natural language queries about medical equipment failures, retrieves similar historical incidents from a vector knowledge base, and produces:

- Root cause analysis
- Structured maintenance plans (immediate / short-term / long-term)
- Explainable AI recommendations
- LLM-as-Judge quality evaluation

The system uses a **4-agent sequential pipeline** orchestrated by **LangGraph**, a **hybrid search engine** combining semantic vectors and keyword matching, and an **LLM** (GPT-4o-mini) for all generation tasks.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER (Browser)                           │
│              React 18 SPA  ·  Vite Dev Server                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP / REST
┌──────────────────────────▼──────────────────────────────────────┐
│                     API LAYER (FastAPI)                         │
│         /api/query · /api/ingest · /health · /api/stats         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   GUARDRAILS LAYER                              │
│    Input: Query validation · PII · Injection detection          │
│    Output: Hallucination · Toxicity · Schema validation         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│          LANGGRAPH MULTI-AGENT PIPELINE                         │
│                                                                 │
│  [Retrieval Agent] → [Reliability Agent] → [Maintenance Agent]  │
│                                         → [Recommendation Agent]│
└────────┬──────────────────────────────────────────┬────────────┘
         │                                          │
┌────────▼────────┐                      ┌──────────▼──────────┐
│  HYBRID SEARCH  │                      │   GPT-4o-mini LLM   │
│  BM25 + Vector  │                      │  (text generation)  │
│  RRF Fusion     │                      └─────────────────────┘
└────────┬────────┘
         │
┌────────▼────────────────────────────────────────────────────────┐
│                    STORAGE LAYER                                │
│   ChromaDB (Vector Store)  ·  BM25 In-Memory Index             │
│   text-embedding-3-small   ·  AI4I Dataset / Synthetic Data     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack with Reasons

### 3.1 Frontend

| Technology | Version | Why It Was Chosen |
|---|---|---|
| **React** | 18.3.1 | Industry-standard UI library. Component-based architecture maps cleanly to the agent pipeline stages (QueryForm, AgentPipelineVisualizer, EvaluationPanel, etc.). Hooks (`useState`, `useEffect`) handle async API calls and real-time state with minimal boilerplate. |
| **Vite** | 5.4.1 | Extremely fast dev server using native ES modules — no bundling on save. Built-in proxy configuration routes `/api` and `/health` to the FastAPI backend on port 8000, eliminating CORS issues during development. |
| **Vanilla CSS** | — | No CSS framework dependency. Custom CSS variables (`--primary`, `--accent`, `--danger`) give full control over the medical-grade color system. Keeps the bundle small and avoids fighting a framework's opinions. |

---

### 3.2 Backend

| Technology | Version | Why It Was Chosen |
|---|---|---|
| **FastAPI** | ≥0.104 | High-performance Python web framework built on Pydantic and Starlette. Automatic OpenAPI docs (`/docs`) for free. Async support means it can handle concurrent requests while the LLM pipeline runs. Pydantic models in `schemas.py` serve as both request validation AND response serialization — no duplication. |
| **Uvicorn** | ≥0.24 | ASGI server required by FastAPI. The `[standard]` extras include `uvloop` and `httptools` for production-grade performance. Supports `--reload` for development hot-reload. |
| **Pydantic** | ≥2.5 | Data validation library. Every schema (`QueryRequest`, `MaintenanceIncident`, `QueryResponse`) is a Pydantic model. This means if an LLM returns a malformed response, the system raises a structured validation error rather than silently passing bad data downstream. |
| **Python-dotenv** | ≥1.0 | Loads `.env` file into `os.getenv()` calls in `config.py`. Keeps secrets out of source code while allowing simple local development. |

---

### 3.3 LLM & Embeddings

| Technology | Why It Was Chosen |
|---|---|
| **GPT-4o-mini** | Instruction-following capability is critical for structured outputs (the agents rely on labeled responses like `FAILURE_PATTERN:`, `RISK_LEVEL:`, etc.). GPT-4o-mini provides GPT-4 quality at a fraction of the cost, which matters since every query runs 4 separate LLM calls. |
| **text-embedding-3-small** | OpenAI's most cost-efficient embedding model. Produces 1536-dimension vectors with strong semantic similarity for technical maintenance language. Used to convert incident narratives into searchable vectors at ingestion time and to embed user queries at search time. |
| **OpenAI Python SDK** | Official SDK with built-in retry logic, timeout handling, and response parsing. The `httpx.Client(verify=False)` override is needed because the system uses a keygateway proxy that has a self-signed certificate. |

---

### 3.4 Orchestration

| Technology | Version | Why It Was Chosen |
|---|---|
| **LangGraph** | ≥0.2.0 | Replaces the old manual Python orchestrator with a formal state machine graph. Key benefits: (1) **Conditional routing** — the graph skips 3 LLM-heavy agents when no incidents are retrieved, saving time and tokens. (2) **Shared typed state** (`AgentState` TypedDict) flows through all nodes, making data handoff explicit and type-safe. (3) **Graph visualization** available via LangGraph Studio. (4) **Future extensibility** — adding parallel branches, retry loops, or human-in-the-loop is a graph edge change, not a code refactor. |
| **langchain-core** | ≥0.2.0 | Required base dependency for LangGraph. Provides the message types and runnable protocol that LangGraph's `StateGraph` is built on. |

**Why not plain LangChain?**
LangChain adds chains, agents, memory, and tool abstractions — most of which this system implements in its own purpose-built agents. Adding all of LangChain would introduce 50+ transitive dependencies for features not needed here. LangGraph is used specifically for the graph orchestration layer, nothing more.

---

### 3.5 Vector & Search

| Technology | Version | Why It Was Chosen |
|---|---|
| **ChromaDB** | ≥1.0.0 | Lightweight, embeddable vector database. No external server required — it persists to disk (`/tmp/chroma_db`) and loads into the process. Uses HNSW (Hierarchical Navigable Small World) index with cosine similarity, which is the correct metric for normalized OpenAI embeddings. Supports `where` filter clauses for metadata filtering (equipment type, severity, hospital unit). |
| **rank-bm25** | ≥0.2.2 | Pure Python implementation of BM25Okapi, the gold standard probabilistic keyword ranking algorithm used by Elasticsearch and Solr. BM25 catches exact technical terms (e.g. "HDF failure", "torque overstrain") that semantic embeddings can miss when terms are rare in the training corpus. Runs entirely in-memory for sub-millisecond keyword search. |

**Why Hybrid Search (BM25 + Vector)?**

| Search Type | Strength | Weakness |
|---|---|---|
| Vector (semantic) | Finds conceptually similar incidents even if different words are used | Misses rare technical terms not well-represented in embedding space |
| BM25 (keyword) | Precisely matches failure codes and technical terms | Cannot handle paraphrasing or conceptual similarity |
| **Hybrid (both)** | Gets the best of both | Requires Reciprocal Rank Fusion to merge ranked lists |

**Reciprocal Rank Fusion (RRF) Formula:**

```
score(d) = (0.6 / (60 + vector_rank)) + (0.4 / (60 + bm25_rank))
```

Vector results are weighted 60%, BM25 40%, giving preference to semantic relevance while still rewarding exact keyword matches.

---

### 3.6 Data

| Technology | Why It Was Chosen |
|---|---|
| **AI4I 2020 Dataset** (UCI) | Real-world predictive maintenance dataset with 10,000 records covering machine temperatures, RPM, torque, tool wear, and failure types (TWF, HDF, PWF, OSF, RNF). Provides a credible foundation for a medical equipment analogy. |
| **Synthetic data generator** | When the AI4I CSV is not provided, `preprocessor.py` generates realistic incidents with equipment-specific parameter ranges (e.g., MRI operates at different RPM/temperature ranges than an Infusion Pump). Allows the system to boot with no external data dependency. |
| **Pandas / NumPy** | Standard data manipulation. Used for loading the AI4I CSV, applying equipment-specific mappings, and generating statistical summaries for the `/api/stats` endpoint. |
| **Scikit-learn / SciPy** | Used in anomaly detection calculations (standard deviation, distance metrics) within the reliability agent. |

---

### 3.7 Evaluation

| Technology | Why It Was Chosen |
|---|---|
| **LLM-as-Judge** (custom) | Instead of a fixed rule-based evaluator, the system uses GPT-4o-mini to score its own outputs on 4 dimensions: Answer Relevancy (0–0.25), Faithfulness (0–0.25), Maintenance Quality (0–0.25), Overall Verdict (0–0.25). This is the approach used by production evaluation frameworks like DeepEval and RAGAS. It catches semantic quality issues that regex or simple metrics would miss. |

---

### 3.8 Deployment

| Technology | Why It Was Chosen |
|---|---|
| **Render.com** | Zero-config Python web service hosting. The `render.yaml` file defines the entire deployment: build command, start command, environment variables, and health check endpoint. ChromaDB persists to `/tmp` (ephemeral on Render free tier — use a persistent disk for production). |

---

## 4. Layer-by-Layer Code Explanation

### 4.1 Frontend Layer — `frontend/src/`

#### Entry Point
```
frontend/index.html          ← HTML shell with <div id="root">
frontend/src/main.jsx        ← ReactDOM.createRoot() mounts App
frontend/src/App.jsx         ← Root component: state + API calls
frontend/src/index.css       ← CSS variables + all layout styles
```

#### React Component Tree
```
App (root state)
├── Header  (status badge)
├── Status Bar  (KB size, BM25 size, model names)
└── Layout (2-column grid)
    ├── Left Panel: Query Console
    │   ├── Form (query, equipment type, hospital unit, severity, top-k)
    │   ├── Example query chips
    │   └── GuardrailsPanel  ← shows validation status live
    └── Right Panel: Result Dashboard
        ├── AgentPipelineVisualizer  ← animates during loading
        ├── Confidence score bar
        ├── Recommendation text
        ├── Score cards (Risk / Health / Downtime)
        ├── Reliability analysis section
        ├── Maintenance plan section
        ├── RetrievedIncidentsPanel  ← similar incidents + hybrid scores
        ├── EvaluationPanel  ← 4 metric bars + verdict
        ├── Supporting evidence list
        └── Token usage footer
```

#### Component Responsibilities

**`AgentPipelineVisualizer`** (`components/AgentPipelineVisualizer.jsx`)
- Uses `useEffect` + `setInterval` to animate through 4 agent steps during loading (cycling every 900ms)
- After result arrives: shows per-agent output (e.g., "5 incidents retrieved", "Risk: High · Health: 0.62")
- Status values: `idle` | `running` | `done` — each maps to a CSS class for color coding

**`GuardrailsPanel`** (`components/GuardrailsPanel.jsx`)
- Stateless display component — derives status from 3 props: `hasQuery`, `loading`, `hasResult`
- Input guardrails turn green as soon as query length ≥ 3 characters
- Output guardrails cycle through running → pass after the API call completes

**`RetrievedIncidentsPanel`** (`components/RetrievedIncidentsPanel.jsx`)
- Renders each `MaintenanceIncident` from `result.retrieved_incidents`
- Color-codes severity with left border (green=Low, orange=Medium, red=High, purple=Critical)
- Shows `hybrid_score` as a proportional progress bar

**`EvaluationPanel`** (`components/EvaluationPanel.jsx`)
- Only renders if `evaluation_results` is present (requires "Enable LLM-as-Judge" checkbox)
- Scores above 0.75 shown in green, 0.5–0.75 in orange, below 0.5 in red
- Individual metric bars multiply score × 4 (since each metric max is 0.25)

---

### 4.2 API Layer — `app/routers/`

**`app/main.py`** — FastAPI application setup
- Mounts all 3 routers: `query`, `admin`, `health`
- CORS enabled for all origins (appropriate for demo; restrict in production)
- `lifespan` context manager runs data ingestion on startup as a background task
- Serves the React `dist/` build as static files at `/` for production

**`app/routers/query.py`** — Core endpoints
```
POST /api/query    → orchestrator.process_query(request) → QueryResponse
POST /api/evaluate → evaluator.evaluate(request)        → EvaluationResult
GET  /api/search   → hybrid_search.search(q, top_k)    → List[MaintenanceIncident]
```

**`app/routers/admin.py`** — Management endpoints
```
POST   /api/ingest  → ingestion_pipeline.run(...)   → IngestResponse
GET    /api/stats   → vector_store.get_stats()      → StatsResponse
DELETE /api/reset   → vector_store.delete_collection()
```

**`app/routers/health.py`** — Liveness check
```
GET /health → { status, collection_size, bm25_index_size, model, ingestion_state }
```

---

### 4.3 Guardrails Layer — `app/services/guardrails.py`

Runs **before** the LLM pipeline (input) and **after** (output).

**Input Guardrails:**
| Check | Implementation |
|---|---|
| Query length | Rejects queries < 3 or > 1000 characters |
| Prompt injection | Regex patterns for 12 known injection phrases (e.g., "ignore previous instructions", "jailbreak") |
| PII detection | Checks for email patterns, phone numbers in query text |
| Metadata validation | Validates equipment_type and hospital_unit against known enums in `config.py` |

**Output Guardrails:**
| Check | Implementation |
|---|---|
| Recommendation quality | `validate_recommendation()` checks length and presence of action keywords |
| Plan format | `validate_plan()` verifies the labeled-line format is intact before parsing |
| Text sanitization | `sanitize_text()` collapses whitespace and strips control characters |

---

### 4.4 Multi-Agent Intelligence Pipeline — LangGraph

#### State Definition — `app/agents/state.py`

```python
class AgentState(TypedDict):
    query: str                                    # Input query
    equipment_type: Optional[str]                 # Filter
    hospital_unit: Optional[str]                  # Filter
    severity: Optional[str]                       # Filter
    top_k: int                                    # How many incidents to retrieve
    enable_evaluation: bool                       # Toggle LLM judge

    retrieved_incidents: List[MaintenanceIncident] # Stage 1 output
    retrieval_message: str                         # Stage 1 status
    reliability_analysis: Optional[ReliabilityAnalysis]  # Stage 2 output
    maintenance_plan: Optional[MaintenancePlan]   # Stage 3 output
    recommendation: str                           # Stage 4 output
    confidence_score: float                       # Stage 4 output
    supporting_evidence: List[str]                # Stage 4 output
    evaluation_results: Optional[Dict[str, Any]] # Stage 4 output
    token_usage: Dict[str, int]                   # Metadata
```

The `AgentState` TypedDict is the **single source of truth** flowing through the entire graph. Each node reads from it and returns a partial dict of keys it updated.

#### Graph Structure — `app/agents/orchestrator.py`

```
          START
            │
       [retrieve]
            │
     ┌──────┴──────────────┐
     │                     │
  incidents == 0      incidents > 0
     │                     │
[empty_response]       [analyze]
     │                     │
    END                [plan]
                           │
                      [recommend]
                           │
                          END
```

**Node: `retrieval_node`**
- Calls `EquipmentRetrievalAgent.retrieve()`
- Validates query, expands terms using LLM, runs hybrid search
- Returns: `retrieved_incidents`, `retrieval_message`

**Conditional edge: `route_after_retrieval`**
- If `retrieved_incidents` is empty → route to `empty_response` (skip 3 LLM calls)
- Otherwise → route to `analyze`

**Node: `reliability_node`**
- Calls `ReliabilityAnalysisAgent.analyze()`
- Computes health score from failure ratio + severity weights
- Detects anomalies from temperature, RPM variance, tool wear
- Calls LLM (800 tokens) to identify failure pattern, risk level, trend
- Returns: `reliability_analysis`

**Node: `maintenance_node`**
- Calls `MaintenanceAgent.plan()`
- Applies risk-based downtime multipliers (Critical = 2.5×, High = 1.5×, etc.)
- Calls LLM (1000 tokens) to generate structured action plan
- Returns: `maintenance_plan`

**Node: `recommendation_node`**
- Calls `RecommendationAgent.recommend()`
- Calls LLM (1500 tokens) for a 300–400 word evidence-based recommendation
- Optionally calls LLM judge (200 tokens) for quality scoring
- Returns: `recommendation`, `confidence_score`, `evaluation_results`, `token_usage`

---

### 4.5 Hybrid Retrieval Layer — `app/services/hybrid_search.py`

#### How it works

**Step 1 — Query Expansion (LLM)**
The retrieval agent sends the query to GPT-4o-mini to extract technical terms:
```
Input:  "MRI machine downtime after preventive maintenance"
Output: "MRI, magnet system, gradient coils, RF amplifier, cooling, downtime, 
         preventive maintenance, calibration, field drift, quench protection"
```
This expanded query is used for both BM25 and vector search.

**Step 2 — Parallel Search**
- **Vector search**: Embeds expanded query → cosine similarity against ChromaDB HNSW index → top-N results with similarity scores
- **BM25 search**: Tokenizes query (lowercase, removes stopwords, min 3 chars) → BM25Okapi scoring against in-memory corpus → top-N results with BM25 scores

**Step 3 — Reciprocal Rank Fusion**
```python
rrf_score = (0.6 / (60 + vector_rank)) + (0.4 / (60 + bm25_rank))
```
Results from both lists are merged by incident ID, scored by RRF, and sorted descending.

**Step 4 — Metadata Filtering**
ChromaDB's `where` clause filters by `equipment_type`, `hospital_unit`, and `severity` before vector search. BM25 results are post-filtered using the same criteria.

---

### 4.6 Data Ingestion Pipeline — `app/data/`

**`app/data/preprocessor.py`** — Data generation
- `generate_synthetic_data(n)`: Creates `n` incidents with equipment-specific parameter ranges
  - MRI: high RPM (2000–5000), high torque (80–120 Nm), high temperatures
  - Infusion Pump: low RPM (200–800), low torque (1–5 Nm)
- `create_incident_narrative(record)`: Converts tabular data into 150-word narrative text for embedding
  - Example: *"MRI System MRI-H-4521 in Radiology Department experienced Heat Dissipation Failure. Process temperature reached 318.4K with rotational speed of 3240 RPM..."*

**`app/data/ingest.py`** — Ingestion pipeline
```
load/generate data
      │
create narratives (one per record)
      │
batch embed (50 per batch, text-embedding-3-small)
      │
store in ChromaDB (100 per batch)
      │
build BM25 index from all narratives
      │
done
```

---

### 4.7 Storage & Embedding Layer

**ChromaDB** (`app/services/vector_store.py`)
- Persistent client: data survives restarts (stored at `CHROMA_PERSIST_DIR`)
- HNSW index with cosine distance: optimal for normalized float embeddings
- Each document stored with metadata: `equipment_type`, `severity`, `hospital_unit`, `failure_type`, `machine_failure`, `incident_id`
- Batch inserts of 100 records to avoid memory spikes during ingestion

**BM25 In-Memory Index** (`app/services/hybrid_search.py`)
- `BM25Okapi` object built from tokenized corpus at startup (or after ingestion)
- Stored in-process — no serialization. Fast to rebuild (< 2 seconds for 5000 records)
- Tokenizer removes 25 common English stopwords and keeps only tokens ≥ 3 characters

**EmbeddingService** (`app/services/embedding_service.py`)
- Batch size: 50 texts per API call (OpenAI rate limit friendly)
- Retry logic: up to 3 attempts with exponential backoff
- 0.3-second delay between batches to avoid rate limits

---

### 4.8 Evaluation & Monitoring — `app/evaluation/evaluator.py`

The evaluator uses GPT-4o-mini to judge the quality of its own outputs (LLM-as-Judge pattern).

**4 Evaluation Metrics:**

| Metric | Max Score | What It Checks |
|---|---|---|
| Answer Relevancy | 0.25 | Does the recommendation directly address the query? |
| Faithfulness | 0.25 | Are claims grounded in the retrieved incident context? |
| Maintenance Quality | 0.25 | Are actions specific, prioritized, and clinically safe? |
| LLM Judge Verdict | 0.25 | Overall Accept / Reject with one-sentence justification |

**Overall Score** = sum of all 4 metric scores (0.0 – 1.0)

This approach is inspired by the **DeepEval** and **RAGAS** frameworks. The advantage over rule-based metrics is that GPT-4o-mini can assess semantic quality — it knows that "check the cooling system" is a relevant action for a heat dissipation failure even if those exact words never appear in the query.

---

## 5. Data Flow: End-to-End Request Lifecycle

```
User types: "CT scanner overheating and cooling system alerts"
               │
               ▼
     [1] React App.jsx sends:
         POST /api/query
         { query, equipment_type, hospital_unit, top_k: 5 }
               │
               ▼
     [2] FastAPI query.py → orchestrator.process_query()
               │
               ▼
     [3] LangGraph graph.invoke(initial_state)
               │
               ▼
     [4] retrieval_node:
         - Validate query (has equipment keywords ✓)
         - LLM expands: "CT scanner, X-ray tube, cooling, HDF, 
                         heat dissipation, thermal protection..."
         - Vector search: embed expanded query → top 10 similar incidents
         - BM25 search: keyword match → top 10 by BM25 score
         - RRF fusion → top 5 deduplicated, ranked incidents
         - Conditional: 5 incidents found → route to "analyze"
               │
               ▼
     [5] reliability_node:
         - Compute health score: 3/5 failed → failure_ratio=0.6
           avg_severity: 3×High + 2×Medium → 0.56
           health = 1.0 - (0.5×0.6 + 0.5×0.56) = 0.42
         - Detect anomalies: avg temp 317.2K (> 315K threshold) ← flagged
         - LLM analyzes context → returns labeled lines:
           FAILURE_PATTERN: Recurring heat dissipation failures...
           RISK_LEVEL: High
           EQUIPMENT_HEALTH_SCORE: 0.45
               │
               ▼
     [6] maintenance_node:
         - CT Scanner default downtime: 6.0h
         - High risk multiplier: 1.5× → 9.0h estimated downtime
         - LLM generates structured plan:
           IMMEDIATE_ACTIONS: Shut down CT for thermal inspection;...
           PARTS_TO_INSPECT: X-ray tube; cooling fan; heat exchanger;...
               │
               ▼
     [7] recommendation_node:
         - LLM generates 300-400 word recommendation
         - If enable_evaluation=true: LLM judge scores quality
         - confidence_score = (health_score + judge_score) / 2
               │
               ▼
     [8] graph returns final_state → QueryResponse built
               │
               ▼
     [9] FastAPI returns JSON response
               │
               ▼
     [10] React renders:
          - AgentPipelineVisualizer: all 4 agents show ✓
          - Confidence bar: 0.71
          - Recommendation text
          - Score cards: Risk=High, Health=0.43, Downtime=9h
          - RetrievedIncidentsPanel: 5 incidents with scores
          - EvaluationPanel: metrics (if enabled)
```

---

## 6. Key Design Decisions

### Why RAG instead of fine-tuning?

| Approach | Pros | Cons |
|---|---|---|
| RAG (this system) | No training cost. Knowledge is updateable — add new incidents without retraining. Grounded in real data = less hallucination. | Retrieval quality determines output quality. Latency from search + LLM calls. |
| Fine-tuning | Faster inference. Knowledge baked into weights. | Expensive training. Knowledge becomes stale. Hard to audit what the model "knows". |

For a medical domain where equipment records change frequently and auditability matters, RAG is the correct choice.

---

### Why LangGraph over plain Python orchestration?

**Old approach (plain Python):**
```python
incidents = retrieval_agent.retrieve(...)
if not incidents:
    return empty_response()
analysis = reliability_agent.analyze(incidents, query)
plan = maintenance_agent.plan(incidents, analysis, query)
recommendation = recommendation_agent.recommend(...)
```

**Problem:** This works but is a dead-end. Adding conditional logic (e.g., "if health score < 0.3, escalate to human review"), parallel agents, or retry loops means restructuring the entire function.

**LangGraph approach:**
- Each agent is a **graph node** — independently testable, swappable
- Routing logic lives in **edge functions** — separate from business logic
- The graph is **declarative** — the structure is visible at a glance
- Adding a new agent = adding one `add_node()` and one `add_edge()` call
- Supports **checkpointing** for long-running pipelines

---

### Why not use LangChain's built-in agents?

LangChain's `AgentExecutor` with tool-calling is designed for **open-ended** agents that decide which tools to call at runtime. This system has a **fixed, predictable pipeline** — the sequence is always Retrieve → Analyze → Plan → Recommend. Using LangChain's agent loop would add unnecessary overhead and unpredictability for a workflow that should be deterministic.

---

### Why 500-token limit was removed

The original system had a hard 500-token cap on all LLM responses because of a keygateway proxy restriction. This limited:
- Reliability analysis to very brief summaries
- Maintenance plans with truncated action lists
- Recommendations to ~120 words (far below the stated 150-180 target)

After removal, new limits per agent:
| Agent | Old Limit | New Limit | Impact |
|---|---|---|---|
| Query expansion | 100 | 150 | More technical terms extracted |
| Reliability analysis | 350 | 800 | Full pattern + anomaly analysis |
| Maintenance plan | 400 | 1000 | Complete 3-tier action plan |
| Recommendation | 480 | 1500 | 300-400 word detailed report |
| LLM judge | 100 | 200 | Detailed verdict explanation |

---

## 7. File Structure Reference

```
medical-equipment-ai/
│
├── app/                          # Backend (FastAPI + Python)
│   ├── main.py                   # App factory, CORS, lifespan, static files
│   ├── config.py                 # All environment variables + domain constants
│   │
│   ├── models/
│   │   └── schemas.py            # Pydantic models: request/response contracts
│   │
│   ├── services/
│   │   ├── llm_service.py        # OpenAI wrapper, token tracking, context builder
│   │   ├── embedding_service.py  # Batch embedding with retry
│   │   ├── vector_store.py       # ChromaDB CRUD operations
│   │   ├── hybrid_search.py      # BM25 + vector + RRF fusion
│   │   └── guardrails.py         # Input/output validation functions
│   │
│   ├── agents/
│   │   ├── state.py              # LangGraph AgentState TypedDict  ← NEW
│   │   ├── orchestrator.py       # LangGraph StateGraph definition  ← REWRITTEN
│   │   ├── retrieval_agent.py    # Query expansion + hybrid retrieval
│   │   ├── reliability_agent.py  # Health scoring + LLM pattern analysis
│   │   ├── maintenance_agent.py  # Structured maintenance plan generation
│   │   └── recommendation_agent.py # Final recommendation + LLM judge
│   │
│   ├── data/
│   │   ├── preprocessor.py       # AI4I loader + synthetic data generator
│   │   └── ingest.py             # Full ingestion pipeline
│   │
│   ├── evaluation/
│   │   └── evaluator.py          # LLM-as-Judge on 4 quality metrics
│   │
│   └── routers/
│       ├── query.py              # /api/query, /api/evaluate, /api/search
│       ├── admin.py              # /api/ingest, /api/stats, /api/reset
│       └── health.py             # /health
│
├── frontend/                     # React SPA (Vite)
│   ├── index.html                # HTML entry point
│   ├── vite.config.js            # Dev server + API proxy config
│   ├── package.json              # React 18 + Vite dependencies
│   └── src/
│       ├── main.jsx              # React root mount
│       ├── App.jsx               # Root component + API state management
│       ├── index.css             # All styles (CSS variables, layout, components)
│       └── components/
│           ├── AgentPipelineVisualizer.jsx  # Animated 4-agent flow
│           ├── GuardrailsPanel.jsx          # Input/output guardrail status
│           ├── RetrievedIncidentsPanel.jsx  # Similar incidents + scores
│           └── EvaluationPanel.jsx          # 4-metric evaluation display
│
├── requirements.txt              # Python dependencies (21 packages)
├── .env.example                  # Environment variable template
├── render.yaml                   # Render.com deployment config
└── TECHNICAL_ARCHITECTURE.md     # This document
```

---

*Document version: 1.0 | Stack: React 18 · FastAPI · LangGraph · ChromaDB · GPT-4o-mini · BM25 · RRF*
