from typing import List, Optional
from app.services.hybrid_search import hybrid_search
from app.services.llm_service import llm_service
from app.services.guardrails import validate_filters, validate_query_text, sanitize_text, detect_and_mask_pii
from app.models.schemas import MaintenanceIncident

QUERY_EXPANSION_PROMPT = """You are a biomedical equipment maintenance expert.
Given a query from a biomedical engineer, extract and expand the key technical terms.
Return ONLY a comma-separated list of relevant technical terms (max 10 terms).

Query: {query}

Technical terms:"""


class EquipmentRetrievalAgent:
    """
    Retrieves relevant maintenance incidents using hybrid search.
    Handles query understanding, validation, and ranked retrieval.
    """

    VALID_EQUIPMENT_KEYWORDS = {
        "mri", "ct", "scanner", "ventilator", "infusion", "pump", "monitor",
        "ecg", "ultrasound", "xray", "x-ray", "defibrillator", "dialysis",
        "anesthesia", "equipment", "device", "machine", "system",
    }

    def validate_query(self, query: str) -> tuple[bool, str]:
        is_valid, validation_msg = validate_query_text(query)
        if not is_valid:
            return False, validation_msg

        lowered = query.lower()
        has_equipment = any(kw in lowered for kw in self.VALID_EQUIPMENT_KEYWORDS)
        maintenance_keywords = {
            "failure", "maintenance", "repair", "alert", "issue", "problem",
            "anomaly", "downtime", "calibration", "inspection", "fault", "error",
            "malfunction", "breakdown", "service", "check", "warning",
        }
        has_maintenance = any(kw in lowered for kw in maintenance_keywords)
        if not has_equipment and not has_maintenance:
            return False, (
                "Query does not appear to be equipment-related. "
                "Please describe a medical equipment maintenance issue."
            )
        return True, "Valid query."

    def expand_query(self, query: str) -> str:
        try:
            messages = [
                {"role": "system", "content": "You are a biomedical equipment expert."},
                {"role": "user", "content": QUERY_EXPANSION_PROMPT.format(query=query)},
            ]
            expanded_terms = llm_service.generate_completion(messages, max_tokens=100, temperature=0.1)
            return f"{query} {expanded_terms}"
        except Exception:
            return query

    def retrieve(
        self,
        query: str,
        top_k: int = 10,
        equipment_type: Optional[str] = None,
        hospital_unit: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> tuple[List[MaintenanceIncident], str]:
        is_valid, validation_msg = self.validate_query(query)
        if not is_valid:
            return [], validation_msg

        filter_valid, filter_msg = validate_filters(equipment_type, hospital_unit, severity)
        if not filter_valid:
            return [], filter_msg

        # Mask any PII before the query reaches the LLM
        query, pii_found = detect_and_mask_pii(query)
        if pii_found:
            print(f"[Guardrails] PII masked in query: {pii_found}")

        expanded_query = self.expand_query(query)
        expanded_query = sanitize_text(expanded_query)

        incidents = hybrid_search.search(
            query=expanded_query,
            n_results=top_k,
            equipment_type=equipment_type,
            hospital_unit=hospital_unit,
            severity=severity,
        )
        return incidents, f"Retrieved {len(incidents)} incidents using hybrid search."
