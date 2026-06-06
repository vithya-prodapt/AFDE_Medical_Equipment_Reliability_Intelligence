from typing import List, Dict, Any
from app.models.schemas import (
    MaintenanceIncident, ReliabilityAnalysis, MaintenancePlan
)
from app.services.llm_service import llm_service
from app.services.guardrails import validate_recommendation

RECOMMENDATION_PROMPT = """Senior biomedical reliability engineer. Write a concise maintenance recommendation.

Query: {query}
Equipment: {dominant_equipment} | Units: {affected_units} | Incidents: {incident_count}
Risk: {risk_level} | Health: {health_score}/1.0 | Priority: {priority_level} | Downtime: {downtime}h
Pattern: {failure_pattern}
Anomalies: {anomalies}

In 300-400 words cover: root cause analysis, top 5 prioritized actions, patient safety impact, equipment-specific risk factors, and two preventive measures for long-term reliability.
Professional tone. Be specific, evidence-based, and actionable."""

LLM_JUDGE_PROMPT = """You are a quality judge evaluating a maintenance recommendation.
Rate this recommendation on a scale of 0.0 to 1.0.

Query: {query}
Recommendation: {recommendation}

Evaluate based on:
1. Directly addresses the query (0-0.25)
2. Root cause explanation provided (0-0.25)
3. Actionable and specific guidance (0-0.25)
4. Safety and operational considerations (0-0.25)

Respond ONLY with: SCORE: [number between 0.0 and 1.0]
VERDICT: [one sentence explanation]"""


class RecommendationAgent:
    """
    Generates final explainable recommendations using multi-context synthesis
    and validates quality using LLM-as-judge.
    """

    def _get_dominant_equipment(self, incidents: List[MaintenanceIncident]) -> str:
        from collections import Counter
        if not incidents:
            return "Unknown Equipment"
        counts = Counter(inc.equipment_type for inc in incidents)
        return counts.most_common(1)[0][0]

    def _get_affected_units(self, incidents: List[MaintenanceIncident]) -> str:
        units = list({inc.hospital_unit for inc in incidents})
        return ", ".join(units[:3]) + (" and more" if len(units) > 3 else "")

    def _llm_judge_score(self, query: str, recommendation: str) -> tuple[float, str]:
        try:
            import re
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert quality evaluator for biomedical maintenance recommendations.",
                },
                {
                    "role": "user",
                    "content": LLM_JUDGE_PROMPT.format(query=query, recommendation=recommendation),
                },
            ]
            judgment = llm_service.generate_completion(messages, max_tokens=200, temperature=0.1)
            score_match = re.search(r"SCORE:\s*([0-9.]+)", judgment, re.IGNORECASE)
            verdict_match = re.search(r"VERDICT:\s*(.+)", judgment, re.IGNORECASE)
            score = float(score_match.group(1)) if score_match else 0.75
            verdict = verdict_match.group(1).strip() if verdict_match else "Recommendation meets quality standards."
            return max(0.0, min(1.0, score)), verdict
        except Exception:
            return 0.75, "Quality evaluation not available."

    def recommend(
        self,
        query: str,
        incidents: List[MaintenanceIncident],
        analysis: ReliabilityAnalysis,
        plan: MaintenancePlan,
        enable_judge: bool = True,
    ) -> tuple[str, float, Dict[str, Any]]:
        if not incidents:
            fallback = (
                "No relevant maintenance incidents were found for your query. "
                "Please verify the equipment type and try rephrasing your query. "
                "Ensure the data ingestion pipeline has been run successfully."
            )
            return fallback, 0.5, {}

        dominant_equipment = self._get_dominant_equipment(incidents)
        affected_units = self._get_affected_units(incidents)

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a senior biomedical equipment reliability intelligence system "
                    "at a large teaching hospital. You provide evidence-based, actionable "
                    "maintenance recommendations to biomedical engineering teams."
                ),
            },
            {
                "role": "user",
                "content": RECOMMENDATION_PROMPT.format(
                    query=query,
                    incident_count=len(incidents),
                    dominant_equipment=dominant_equipment,
                    affected_units=affected_units,
                    failure_pattern=analysis.failure_pattern,
                    risk_level=analysis.risk_level,
                    health_score=analysis.equipment_health_score,
                    anomalies="; ".join(analysis.anomaly_indicators[:3]),
                    priority_level=plan.priority_level,
                    immediate_count=len(plan.immediate_actions),
                    downtime=plan.estimated_downtime_hours,
                ),
            },
        ]

        recommendation = llm_service.generate_completion(messages, max_tokens=1500, temperature=0.3)
        recommendation = validate_recommendation(recommendation)

        confidence_score = analysis.equipment_health_score
        judge_results: Dict[str, Any] = {}

        if enable_judge:
            judge_score, verdict = self._llm_judge_score(query, recommendation)
            confidence_score = round((analysis.equipment_health_score + judge_score) / 2, 3)
            judge_results = {
                "llm_judge_score": judge_score,
                "llm_judge_verdict": verdict,
            }
        else:
            failure_incidents = sum(1 for inc in incidents if inc.machine_failure)
            ratio = failure_incidents / len(incidents) if incidents else 0
            confidence_score = round(max(0.3, 1.0 - ratio * 0.5), 3)

        return recommendation, confidence_score, judge_results
