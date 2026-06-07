import re
from typing import Optional, Tuple, List
from app.config import HOSPITAL_UNITS, EQUIPMENT_TYPES
from app.models.schemas import SeverityLevel

PROMPT_INJECTION_PATTERNS = [
    "ignore previous", "bypass", "disregard instructions", "override", "no input validation",
    "do not follow", "malicious", "reverse the prompt", "reveal hidden", "system prompt", "jailbreak"
]

VALID_EQUIPMENT_TYPES = {
    eq_name.lower()
    for group in EQUIPMENT_TYPES.values()
    for eq_name in group
}
VALID_EQUIPMENT_TYPES.add("all")
VALID_SEVERITIES = {severity.value.lower() for severity in SeverityLevel}
VALID_HOSPITAL_UNITS = {unit.lower() for unit in HOSPITAL_UNITS}

# ── Presidio PII engine (pattern-only, no spaCy model download required) ─────
_analyzer = None
_anonymizer = None

# Pattern-based entities that work without a spaCy NLP model
PII_ENTITIES = [
    "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD",
    "IBAN_CODE", "IP_ADDRESS", "UK_NHS", "US_SSN",
]

# Regex fallback patterns for environments where Presidio fails
_REGEX_PII = [
    ("EMAIL",        re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.I)),
    ("PHONE",        re.compile(r"\b(?:\+?\d[\d\s\-().]{7,14}\d)\b")),
    ("NHS_NUMBER",   re.compile(r"\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b")),
    ("CREDIT_CARD",  re.compile(r"\b(?:\d[ \-]?){13,16}\b")),
    ("IP_ADDRESS",   re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b")),
    ("POSTCODE",     re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b", re.I)),
]


def _get_presidio():
    global _analyzer, _anonymizer
    if _analyzer is None:
        try:
            from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
            from presidio_analyzer.nlp_engine import NlpEngineProvider
            from presidio_anonymizer import AnonymizerEngine

            # Use a blank spaCy pipeline — no model download required
            import spacy
            nlp = spacy.blank("en")

            class _BlankNlpEngine:
                def __init__(self, nlp_obj):
                    self.nlp = {"en": nlp_obj}

                def process_text(self, text, language):
                    doc = self.nlp[language](text)
                    class _Res:
                        entities = []
                        tokens = [t.text for t in doc]
                        lemmas = [t.lemma_ for t in doc]
                    return _Res()

                def is_loaded(self, language):
                    return language == "en"

                def get_supported_languages(self):
                    return ["en"]

            from presidio_analyzer import AnalyzerEngine, RecognizerRegistry
            registry = RecognizerRegistry()
            registry.load_predefined_recognizers(languages=["en"])

            _analyzer = AnalyzerEngine(
                nlp_engine=_BlankNlpEngine(nlp),
                registry=registry,
            )
            _anonymizer = AnonymizerEngine()
            print("[Guardrails] Presidio loaded with pattern-based PII detection.")
        except Exception as e:
            print(f"[Guardrails] Presidio init failed ({e}). Using regex fallback.")
            _analyzer = False
    return _analyzer, _anonymizer


def _regex_mask_pii(text: str) -> Tuple[str, List[str]]:
    """Regex-based PII masking used when Presidio is unavailable."""
    detected = []
    masked = text
    for label, pattern in _REGEX_PII:
        if pattern.search(masked):
            detected.append(label)
            masked = pattern.sub(f"<{label}>", masked)
    return masked, detected


def detect_and_mask_pii(text: str) -> Tuple[str, List[str]]:
    """
    Scans text for PII using Presidio (pattern-based, no model download needed).
    Falls back to regex if Presidio is unavailable.
    Returns (masked_text, list_of_entity_types_found).
    """
    if not text:
        return text, []

    analyzer, anonymizer = _get_presidio()

    if not analyzer:
        return _regex_mask_pii(text)

    try:
        results = analyzer.analyze(text=text, entities=PII_ENTITIES, language="en")
        if not results:
            # Also run regex pass to catch names / patterns Presidio may miss
            return _regex_mask_pii(text)
        masked = anonymizer.anonymize(text=text, analyzer_results=results)
        detected = list({r.entity_type for r in results})
        return masked.text, detected
    except Exception as e:
        print(f"[Guardrails] PII scan error ({e}). Falling back to regex.")
        return _regex_mask_pii(text)


# ── Existing guardrail functions ─────────────────────────────────────────────

def sanitize_text(text: str) -> str:
    if text is None:
        return ""
    sanitized = re.sub(r"\s+", " ", text).strip()
    return sanitized


def is_prompt_injection(text: str) -> bool:
    if not text:
        return False
    lowered = text.lower()
    return any(pattern in lowered for pattern in PROMPT_INJECTION_PATTERNS)


def validate_query_text(query: str) -> Tuple[bool, str]:
    if not query or len(query.strip()) < 3:
        return False, "Query too short. Please provide more detail."
    if len(query) > 1000:
        return False, "Query too long. Please limit to 1000 characters."
    if is_prompt_injection(query):
        return False, "Query appears to contain unsafe or injected instructions. Please rephrase."
    return True, "Valid query."


def validate_filters(
    equipment_type: Optional[str],
    hospital_unit: Optional[str],
    severity: Optional[str],
) -> Tuple[bool, str]:
    if equipment_type:
        equipment_type_normalized = equipment_type.strip().lower()
        if equipment_type_normalized not in VALID_EQUIPMENT_TYPES:
            return False, f"Invalid equipment_type filter: {equipment_type}."
    if hospital_unit:
        if hospital_unit.strip().lower() not in VALID_HOSPITAL_UNITS:
            return False, f"Invalid hospital_unit filter: {hospital_unit}."
    if severity:
        if severity.strip().lower() not in VALID_SEVERITIES:
            return False, f"Invalid severity filter: {severity}."
    return True, "Filters valid."


def validate_recommendation(output: str) -> str:
    text = sanitize_text(output)
    if is_prompt_injection(text):
        return "One or more recommendation results were unsafe to return. Please retry with a safer query."
    if len(text) > 1200:
        return text[:1200].rstrip() + "..."
    return text


def validate_plan(output: str) -> str:
    text = sanitize_text(output)
    if is_prompt_injection(text):
        return "Maintenance plan contains unsafe content and could not be generated."
    return text


# ── Output Safety Guardrails ─────────────────────────────────────────────────

UNSAFE_OUTPUT_PATTERNS = [
    "do not call a doctor", "no need for professional", "ignore safety",
    "stop medication", "remove the device without", "disable the alarm",
    "override safety", "bypass the safety", "without medical supervision",
    "self-medicate", "guaranteed to fix", "no risk involved",
]

COMPLETENESS_MIN_LENGTH = 50


def validate_output_safety(output: str) -> Tuple[bool, str]:
    """
    Checks LLM output for dangerous medical advice patterns.
    Returns (is_safe, reason).
    """
    if not output or not output.strip():
        return False, "Output is empty."
    lowered = output.lower()
    for pattern in UNSAFE_OUTPUT_PATTERNS:
        if pattern in lowered:
            return False, f"Output contains potentially unsafe guidance: '{pattern}'. Review before use."
    return True, "Output passed safety check."


def check_response_completeness(recommendation: str, plan: dict) -> Tuple[bool, List[str]]:
    """
    Verifies all required response fields are meaningfully populated.
    Returns (is_complete, list_of_missing_fields).
    """
    missing = []
    if not recommendation or len(recommendation.strip()) < COMPLETENESS_MIN_LENGTH:
        missing.append("recommendation is too short or empty")
    if not plan.get("immediate_actions"):
        missing.append("immediate_actions is empty")
    if not plan.get("short_term_actions"):
        missing.append("short_term_actions is empty")
    if not plan.get("priority_level"):
        missing.append("priority_level is missing")
    if not plan.get("parts_to_inspect"):
        missing.append("parts_to_inspect is empty")
    return len(missing) == 0, missing
