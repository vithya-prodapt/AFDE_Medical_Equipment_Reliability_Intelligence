from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class EquipmentType(str, Enum):
    MRI = "MRI System"
    CT = "CT Scanner"
    VENTILATOR = "Ventilator"
    INFUSION_PUMP = "Infusion Pump"
    PATIENT_MONITOR = "Patient Monitor"
    ULTRASOUND = "Ultrasound Scanner"
    ECG = "ECG Monitor"
    XRAY = "Digital X-Ray System"
    ALL = "all"


class SeverityLevel(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=1000, description="Natural language query about equipment")
    equipment_type: Optional[str] = Field(None, description="Filter by equipment type")
    hospital_unit: Optional[str] = Field(None, description="Filter by hospital unit")
    severity: Optional[str] = Field(None, description="Filter by severity level")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of incidents to retrieve")
    enable_evaluation: bool = Field(default=False, description="Run LLM-as-judge evaluation")


class MaintenanceIncident(BaseModel):
    incident_id: str
    equipment_type: str
    machine_id: str
    hospital_unit: str
    severity: str
    failure_type: str
    air_temperature_k: float
    process_temperature_k: float
    rotational_speed_rpm: float
    torque_nm: float
    tool_wear_min: float
    machine_failure: bool
    incident_narrative: str
    similarity_score: float = 0.0
    bm25_score: float = 0.0
    hybrid_score: float = 0.0


class ReliabilityAnalysis(BaseModel):
    failure_pattern: str
    anomaly_indicators: List[str]
    risk_level: str
    correlation_findings: List[str]
    equipment_health_score: float = Field(ge=0.0, le=1.0)
    trend_analysis: str


class MaintenancePlan(BaseModel):
    immediate_actions: List[str]
    short_term_actions: List[str]
    long_term_actions: List[str]
    estimated_downtime_hours: float
    priority_level: str
    parts_to_inspect: List[str]


class QueryResponse(BaseModel):
    query: str
    retrieved_incidents: List[MaintenanceIncident]
    reliability_analysis: ReliabilityAnalysis
    maintenance_plan: MaintenancePlan
    recommendation: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    supporting_evidence: Optional[List[str]] = None
    token_usage: Dict[str, int] = {}
    evaluation_results: Optional[Dict[str, Any]] = None


class IngestRequest(BaseModel):
    data_path: Optional[str] = Field(None, description="Path to AI4I CSV file; generates synthetic data if None")
    sample_size: Optional[int] = Field(None, ge=100, le=15000, description="Number of records to ingest")
    force_reingest: bool = Field(default=False, description="Re-ingest even if data exists")


class IngestResponse(BaseModel):
    status: str
    records_ingested: int
    collection_size: int
    message: str


class EvaluationRequest(BaseModel):
    query: str
    context: str
    answer: str


class EvaluationResult(BaseModel):
    answer_relevancy_score: float = Field(ge=0.0, le=1.0)
    faithfulness_score: float = Field(ge=0.0, le=1.0)
    maintenance_quality_score: float = Field(ge=0.0, le=1.0)
    llm_judge_verdict: str
    overall_score: float = Field(ge=0.0, le=1.0)
    feedback: str


class HealthResponse(BaseModel):
    status: str
    collection_size: int
    bm25_index_size: int
    model: str
    embedding_model: str


class StatsResponse(BaseModel):
    collection_size: int
    bm25_index_size: int
    equipment_type_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
    failure_type_distribution: Dict[str, int]
    hospital_unit_distribution: Dict[str, int]
