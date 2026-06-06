from typing import Literal

from langgraph.graph import StateGraph, END

from app.agents.state import AgentState
from app.agents.retrieval_agent import EquipmentRetrievalAgent
from app.agents.reliability_agent import ReliabilityAnalysisAgent
from app.agents.maintenance_agent import MaintenanceAgent
from app.agents.recommendation_agent import RecommendationAgent
from app.models.schemas import (
    QueryRequest,
    QueryResponse,
    ReliabilityAnalysis,
    MaintenancePlan,
)
from app.services.llm_service import llm_service

# ── Agent singletons ───────────────────────────────────────────────────────────
_retrieval = EquipmentRetrievalAgent()
_reliability = ReliabilityAnalysisAgent()
_maintenance = MaintenanceAgent()
_recommendation = RecommendationAgent()


# ── Node functions ─────────────────────────────────────────────────────────────

def retrieval_node(state: AgentState) -> dict:
    incidents, message = _retrieval.retrieve(
        query=state["query"],
        top_k=state["top_k"],
        equipment_type=state.get("equipment_type"),
        hospital_unit=state.get("hospital_unit"),
        severity=state.get("severity"),
    )
    return {"retrieved_incidents": incidents, "retrieval_message": message}


def route_after_retrieval(state: AgentState) -> Literal["analyze", "empty_response"]:
    return "empty_response" if not state["retrieved_incidents"] else "analyze"


def empty_response_node(state: AgentState) -> dict:
    return {
        "reliability_analysis": ReliabilityAnalysis(
            failure_pattern="No incidents found for the given query.",
            anomaly_indicators=[],
            risk_level="Unknown",
            correlation_findings=[],
            equipment_health_score=1.0,
            trend_analysis="No data available.",
        ),
        "maintenance_plan": MaintenancePlan(
            immediate_actions=["Verify query terms and data availability"],
            short_term_actions=["Re-run data ingestion pipeline if needed"],
            long_term_actions=["Ensure equipment records are up to date"],
            estimated_downtime_hours=0.0,
            priority_level="Low",
            parts_to_inspect=[],
        ),
        "recommendation": state["retrieval_message"],
        "confidence_score": 0.0,
        "supporting_evidence": [],
        "evaluation_results": None,
        "token_usage": llm_service.get_token_usage(),
    }


def reliability_node(state: AgentState) -> dict:
    analysis = _reliability.analyze(state["retrieved_incidents"], state["query"])
    return {"reliability_analysis": analysis}


def maintenance_node(state: AgentState) -> dict:
    plan = _maintenance.plan(
        state["retrieved_incidents"],
        state["reliability_analysis"],
        state["query"],
    )
    return {"maintenance_plan": plan}


def recommendation_node(state: AgentState) -> dict:
    recommendation, confidence, judge_results = _recommendation.recommend(
        query=state["query"],
        incidents=state["retrieved_incidents"],
        analysis=state["reliability_analysis"],
        plan=state["maintenance_plan"],
        enable_judge=state["enable_evaluation"],
    )
    supporting_evidence = [
        f"{inc.incident_id}: {inc.failure_type} ({inc.equipment_type})"
        for inc in state["retrieved_incidents"][:5]
    ]
    return {
        "recommendation": recommendation,
        "confidence_score": confidence,
        "supporting_evidence": supporting_evidence,
        "evaluation_results": judge_results if judge_results else None,
        "token_usage": llm_service.get_token_usage(),
    }


# ── Graph construction ─────────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("retrieve", retrieval_node)
    graph.add_node("analyze", reliability_node)
    graph.add_node("plan", maintenance_node)
    graph.add_node("recommend", recommendation_node)
    graph.add_node("empty_response", empty_response_node)

    graph.set_entry_point("retrieve")

    graph.add_conditional_edges(
        "retrieve",
        route_after_retrieval,
        {"analyze": "analyze", "empty_response": "empty_response"},
    )

    graph.add_edge("analyze", "plan")
    graph.add_edge("plan", "recommend")
    graph.add_edge("recommend", END)
    graph.add_edge("empty_response", END)

    return graph.compile()


_graph = _build_graph()


# ── Public orchestrator ────────────────────────────────────────────────────────

class AgentOrchestrator:
    """
    LangGraph-backed orchestrator.

    Pipeline:
        retrieve → [conditional] → analyze → plan → recommend → END
                                 ↘ empty_response → END
    """

    def process_query(self, request: QueryRequest) -> QueryResponse:
        llm_service.reset_token_usage()

        initial_state: AgentState = {
            "query": request.query,
            "equipment_type": request.equipment_type,
            "hospital_unit": request.hospital_unit,
            "severity": request.severity,
            "top_k": request.top_k,
            "enable_evaluation": request.enable_evaluation,
            "retrieved_incidents": [],
            "retrieval_message": "",
            "reliability_analysis": None,
            "maintenance_plan": None,
            "recommendation": "",
            "confidence_score": 0.0,
            "supporting_evidence": [],
            "evaluation_results": None,
            "token_usage": {},
        }

        final_state = _graph.invoke(initial_state)

        return QueryResponse(
            query=request.query,
            retrieved_incidents=final_state["retrieved_incidents"],
            reliability_analysis=final_state["reliability_analysis"],
            maintenance_plan=final_state["maintenance_plan"],
            recommendation=final_state["recommendation"],
            confidence_score=final_state["confidence_score"],
            supporting_evidence=final_state["supporting_evidence"],
            token_usage=final_state["token_usage"],
            evaluation_results=final_state.get("evaluation_results"),
        )


orchestrator = AgentOrchestrator()
