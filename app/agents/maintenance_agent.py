import re
from typing import List
from app.models.schemas import MaintenanceIncident, ReliabilityAnalysis, MaintenancePlan
from app.services.llm_service import llm_service
from app.services.guardrails import validate_plan

MAINTENANCE_PLAN_PROMPT = """Biomedical engineer. Respond with ONLY these 6 lines, no extra text:
IMMEDIATE_ACTIONS: action1; action2
SHORT_TERM_ACTIONS: action1; action2
LONG_TERM_ACTIONS: action1; action2
ESTIMATED_DOWNTIME_HOURS: number
PRIORITY_LEVEL: Critical|High|Medium|Low
PARTS_TO_INSPECT: part1; part2; part3

Query: {query}
Risk: {risk_level} | Pattern: {failure_pattern} | Health: {health_score}
Top incidents: {incident_summary}"""

DOWNTIME_DEFAULTS = {
    "MRI System": 8.0,
    "CT Scanner": 6.0,
    "PET Scanner": 6.0,
    "Digital X-Ray System": 4.0,
    "Ventilator": 2.0,
    "Ultrasound Scanner": 3.0,
    "Anesthesia Machine": 4.0,
    "Dialysis Machine": 4.0,
    "Patient Monitor": 1.0,
    "Infusion Pump": 1.0,
    "ECG Monitor": 1.5,
    "Defibrillator": 2.0,
}


_SECTION_LABELS = re.compile(
    r"\b(IMMEDIATE_ACTIONS|SHORT_TERM_ACTIONS|LONG_TERM_ACTIONS|"
    r"ESTIMATED_DOWNTIME_HOURS|PRIORITY_LEVEL|PARTS_TO_INSPECT)\s*:",
    re.IGNORECASE,
)


def _parse_list(text: str, key: str, exclude: set = None) -> List[str]:
    pattern = rf"{key}:\s*\[?(.+?)(?=\n[A-Z_]{{4,}}:|\Z)"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if not match:
        return []
    raw = match.group(1).strip().rstrip("]")
    items = re.split(r";|\n[-•*]|\n\d+[.)]\s*", raw)
    cleaned = []
    for item in items:
        item = item.strip().lstrip("-•*[]1234567890.)").rstrip("]").strip()
        if not item or _SECTION_LABELS.search(item):
            continue
        # Must be at least 10 chars — filters out bare component names like "magnet"
        if len(item) < 10:
            continue
        # Drop items that are just component names leaked from PARTS_TO_INSPECT
        if exclude and item.lower() in exclude:
            continue
        cleaned.append(item)
    return cleaned[:3]


def _parse_float(text: str, key: str, default: float) -> float:
    pattern = rf"{key}:\s*([0-9.]+)"
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    return default


def _parse_value(text: str, key: str) -> str:
    pattern = rf"{key}:\s*\[?(.+?)(?=\n[A-Z_]{{4,}}:|\Z)"
    match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip().rstrip("]").strip()
    return ""


class MaintenanceAgent:
    """
    Generates structured maintenance plans based on reliability analysis
    and historical maintenance incident patterns.
    """

    def _get_dominant_equipment(self, incidents: List[MaintenanceIncident]) -> str:
        from collections import Counter
        if not incidents:
            return "Unknown"
        counts = Counter(inc.equipment_type for inc in incidents)
        return counts.most_common(1)[0][0]

    def _build_incident_summary(self, incidents: List[MaintenanceIncident]) -> str:
        lines = []
        for inc in incidents[:3]:
            status = "FAILED" if inc.machine_failure else "Operational"
            lines.append(
                f"- {inc.equipment_type} ({inc.hospital_unit}): {inc.failure_type} | "
                f"Severity: {inc.severity} | Status: {status} | "
                f"Wear: {inc.tool_wear_min:.0f}min | Temp: {inc.process_temperature_k:.1f}K"
            )
        return "\n".join(lines)

    def plan(
        self,
        incidents: List[MaintenanceIncident],
        analysis: ReliabilityAnalysis,
        query: str,
    ) -> MaintenancePlan:
        if not incidents:
            return MaintenancePlan(
                immediate_actions=["Conduct immediate equipment inspection"],
                short_term_actions=["Review maintenance logs", "Schedule preventive maintenance"],
                long_term_actions=["Update maintenance schedule", "Review equipment lifecycle"],
                estimated_downtime_hours=2.0,
                priority_level="Low",
                parts_to_inspect=["All major components"],
            )

        dominant_equipment = self._get_dominant_equipment(incidents)
        default_downtime = DOWNTIME_DEFAULTS.get(dominant_equipment, 4.0)
        risk_downtime_multipliers = {"Low": 0.5, "Medium": 1.0, "High": 1.5, "Critical": 2.5}
        downtime_multiplier = risk_downtime_multipliers.get(analysis.risk_level, 1.0)
        estimated_downtime = round(default_downtime * downtime_multiplier, 1)

        incident_summary = self._build_incident_summary(incidents)

        messages = [
            {
                "role": "system",
                "content": "You are a certified biomedical equipment maintenance engineer specializing in hospital equipment reliability.",
            },
            {
                "role": "user",
                "content": MAINTENANCE_PLAN_PROMPT.format(
                    query=query,
                    risk_level=analysis.risk_level,
                    failure_pattern=analysis.failure_pattern,
                    health_score=analysis.equipment_health_score,
                    incident_summary=incident_summary,
                ),
            },
        ]

        plan_text = llm_service.generate_completion(messages, max_tokens=1000, temperature=0.2)
        plan_text = validate_plan(plan_text)

        # Parse parts first so their names can be excluded from action lists
        parts = _parse_list(plan_text, "PARTS_TO_INSPECT")
        parts_set = {p.lower() for p in parts}

        immediate = _parse_list(plan_text, "IMMEDIATE_ACTIONS", exclude=parts_set)
        short_term = _parse_list(plan_text, "SHORT_TERM_ACTIONS", exclude=parts_set)
        long_term = _parse_list(plan_text, "LONG_TERM_ACTIONS", exclude=parts_set)
        parsed_downtime = _parse_float(plan_text, "ESTIMATED_DOWNTIME_HOURS", estimated_downtime)
        priority = _parse_value(plan_text, "PRIORITY_LEVEL") or analysis.risk_level

        valid_priorities = {"Critical", "High", "Medium", "Low"}
        if priority not in valid_priorities:
            priority = analysis.risk_level

        return MaintenancePlan(
            immediate_actions=immediate or [
                f"Isolate affected {dominant_equipment} for safety inspection",
                "Notify biomedical engineering team immediately",
                "Check power supply and cooling systems",
            ],
            short_term_actions=short_term or [
                "Schedule full diagnostic assessment",
                "Order replacement components if wear exceeds limits",
                "Update equipment maintenance log",
            ],
            long_term_actions=long_term or [
                "Review and update preventive maintenance schedule",
                "Assess equipment for lifecycle replacement",
                "Implement real-time monitoring for critical parameters",
            ],
            estimated_downtime_hours=min(parsed_downtime, 72.0),
            priority_level=priority,
            parts_to_inspect=parts or [
                "Power supply unit", "Cooling system", "Rotational components",
                "Control board", "Sensors and transducers",
            ],
        )
