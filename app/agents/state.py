from typing import TypedDict, Optional, List, Dict, Any
from app.models.schemas import MaintenanceIncident, ReliabilityAnalysis, MaintenancePlan


class AgentState(TypedDict):
    # ── Input ──────────────────────────────────────────────────────────────────
    query: str
    equipment_type: Optional[str]
    hospital_unit: Optional[str]
    severity: Optional[str]
    top_k: int
    enable_evaluation: bool

    # ── Stage 1: Retrieval ─────────────────────────────────────────────────────
    retrieved_incidents: List[MaintenanceIncident]
    retrieval_message: str

    # ── Stage 2: Reliability ───────────────────────────────────────────────────
    reliability_analysis: Optional[ReliabilityAnalysis]

    # ── Stage 3: Maintenance ───────────────────────────────────────────────────
    maintenance_plan: Optional[MaintenancePlan]

    # ── Stage 4: Recommendation ────────────────────────────────────────────────
    recommendation: str
    confidence_score: float
    supporting_evidence: List[str]
    evaluation_results: Optional[Dict[str, Any]]

    # ── Metadata ───────────────────────────────────────────────────────────────
    token_usage: Dict[str, int]
