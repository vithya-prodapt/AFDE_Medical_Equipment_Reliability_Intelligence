from typing import List
from app.models.schemas import MaintenanceIncident, ReliabilityAnalysis
from app.services.llm_service import llm_service

RELIABILITY_ANALYSIS_PROMPT = """Biomedical reliability expert. Analyze these incidents concisely.

Query: {query}

Incidents:
{context}

Reply with ONLY these labeled lines (keep each value brief):
FAILURE_PATTERN: [1 sentence]
ANOMALY_INDICATORS: [2-3 items separated by semicolons]
RISK_LEVEL: [Low/Medium/High/Critical]
CORRELATION_FINDINGS: [2-3 items separated by semicolons]
EQUIPMENT_HEALTH_SCORE: [0.0-1.0]
TREND_ANALYSIS: [1 sentence]"""


def _parse_float(text: str, key: str) -> float:
    import re
    pattern = rf"{key}:\s*([0-9.]+)"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            val = float(match.group(1))
            return max(0.0, min(1.0, val))
        except ValueError:
            pass
    return 0.7


def _parse_list(text: str, key: str) -> List[str]:
    import re
    pattern = rf"{key}:\s*(.+?)(?:\n[A-Z_]+:|$)"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        raw = match.group(1).strip()
        items = [item.strip().lstrip("-•*") for item in re.split(r";|\n-|\n•|\n\*", raw) if item.strip()]
        return [i for i in items if i][:5]
    return []


def _parse_value(text: str, key: str) -> str:
    import re
    pattern = rf"{key}:\s*(.+?)(?:\n[A-Z_]+:|$)"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()
    return "Analysis not available."


class ReliabilityAnalysisAgent:
    """
    Analyzes retrieved maintenance incidents to identify patterns,
    correlate operational parameters, and assess equipment health.
    """

    def _compute_health_score(self, incidents: List[MaintenanceIncident]) -> float:
        if not incidents:
            return 1.0
        failure_count = sum(1 for inc in incidents if inc.machine_failure)
        failure_ratio = failure_count / len(incidents)
        severity_weights = {"Low": 0.1, "Medium": 0.3, "High": 0.6, "Critical": 1.0}
        avg_severity = sum(
            severity_weights.get(inc.severity, 0.3) for inc in incidents
        ) / len(incidents)
        health = max(0.0, 1.0 - (0.5 * failure_ratio + 0.5 * avg_severity))
        return round(health, 3)

    def _detect_anomalies(self, incidents: List[MaintenanceIncident]) -> List[str]:
        if not incidents:
            return []
        anomalies = []
        temps = [inc.process_temperature_k for inc in incidents]
        avg_temp = sum(temps) / len(temps)
        if avg_temp > 315:
            anomalies.append(f"Elevated process temperature detected (avg: {avg_temp:.1f} K)")
        deltas = [inc.process_temperature_k - inc.air_temperature_k for inc in incidents]
        avg_delta = sum(deltas) / len(deltas)
        if avg_delta > 12:
            anomalies.append(f"High temperature differential (avg: {avg_delta:.1f} K) suggesting cooling issues")
        wear_values = [inc.tool_wear_min for inc in incidents]
        max_wear = max(wear_values)
        if max_wear > 300:
            anomalies.append(f"High component wear detected (max: {max_wear:.0f} min)")
        rpms = [inc.rotational_speed_rpm for inc in incidents if inc.rotational_speed_rpm > 0]
        if rpms:
            avg_rpm = sum(rpms) / len(rpms)
            if any(abs(r - avg_rpm) / avg_rpm > 0.3 for r in rpms):
                anomalies.append("Rotational speed variance indicates mechanical instability")
        failure_types = [inc.failure_type for inc in incidents if inc.machine_failure]
        from collections import Counter
        if failure_types:
            common = Counter(failure_types).most_common(1)[0]
            anomalies.append(f"Recurring failure pattern: {common[0]} ({common[1]} occurrences)")
        return anomalies[:5]

    def analyze(self, incidents: List[MaintenanceIncident], query: str) -> ReliabilityAnalysis:
        if not incidents:
            return ReliabilityAnalysis(
                failure_pattern="No incidents retrieved for analysis.",
                anomaly_indicators=[],
                risk_level="Unknown",
                correlation_findings=[],
                equipment_health_score=1.0,
                trend_analysis="Insufficient data for trend analysis.",
            )

        health_score = self._compute_health_score(incidents)
        detected_anomalies = self._detect_anomalies(incidents)
        context = llm_service.build_optimized_context(incidents, max_tokens=1500)

        messages = [
            {
                "role": "system",
                "content": "You are an expert biomedical equipment reliability engineer with 20 years of hospital maintenance experience.",
            },
            {
                "role": "user",
                "content": RELIABILITY_ANALYSIS_PROMPT.format(query=query, context=context),
            },
        ]

        analysis_text = llm_service.generate_completion(messages, max_tokens=800, temperature=0.2)

        failure_pattern = _parse_value(analysis_text, "FAILURE_PATTERN")
        anomaly_indicators = _parse_list(analysis_text, "ANOMALY_INDICATORS") or detected_anomalies
        risk_level = _parse_value(analysis_text, "RISK_LEVEL").split()[0] if _parse_value(analysis_text, "RISK_LEVEL") else "Medium"
        correlation_findings = _parse_list(analysis_text, "CORRELATION_FINDINGS")
        llm_health = _parse_float(analysis_text, "EQUIPMENT_HEALTH_SCORE")
        combined_health = round((health_score + llm_health) / 2, 3)
        trend_analysis = _parse_value(analysis_text, "TREND_ANALYSIS")

        valid_risks = {"Low", "Medium", "High", "Critical"}
        if risk_level not in valid_risks:
            risk_level = "Medium"

        return ReliabilityAnalysis(
            failure_pattern=failure_pattern or "Multiple failure modes detected across equipment.",
            anomaly_indicators=anomaly_indicators or detected_anomalies,
            risk_level=risk_level,
            correlation_findings=correlation_findings or ["Insufficient data for correlation analysis."],
            equipment_health_score=combined_health,
            trend_analysis=trend_analysis or "Trend analysis not available.",
        )
