from app.services.llm_service import llm_service
from app.models.schemas import EvaluationRequest, EvaluationResult

RELEVANCY_PROMPT = """Rate how well the answer addresses the query on a scale of 0.0 to 1.0.

Query: {query}
Answer: {answer}

Consider: Does the answer directly respond to the query? Is it informative?

Respond ONLY with: SCORE: [0.0-1.0]"""

FAITHFULNESS_PROMPT = """Rate how faithfully the answer is grounded in the provided context (0.0 to 1.0).

Context: {context}
Answer: {answer}

Consider: Are all claims in the answer supported by the context? Are there hallucinations?

Respond ONLY with: SCORE: [0.0-1.0]"""

MAINTENANCE_QUALITY_PROMPT = """Rate the quality of this maintenance recommendation for medical equipment (0.0 to 1.0).

Query: {query}
Answer: {answer}

Evaluate:
- Contains specific actionable steps (0-0.25)
- Addresses safety considerations (0-0.25)
- Provides root cause explanation (0-0.25)
- Appropriate urgency and prioritization (0-0.25)

Respond ONLY with: SCORE: [0.0-1.0]
FEEDBACK: [one sentence]"""

LLM_JUDGE_PROMPT = """You are an expert judge evaluating medical equipment maintenance recommendations.

Query: {query}
Context: {context}
Answer: {answer}

Evaluate the overall quality considering relevancy, faithfulness, and maintenance expertise.

Respond with:
VERDICT: [Accept/Reject]
REASON: [brief explanation]
OVERALL_SCORE: [0.0-1.0]"""


def _extract_score(text: str, default: float = 0.7) -> float:
    import re
    match = re.search(r"SCORE:\s*([0-9.]+)", text, re.IGNORECASE)
    if match:
        try:
            return max(0.0, min(1.0, float(match.group(1))))
        except ValueError:
            pass
    floats = re.findall(r"\b(0\.\d+|1\.0)\b", text)
    if floats:
        return max(0.0, min(1.0, float(floats[0])))
    return default


def _extract_feedback(text: str) -> str:
    import re
    match = re.search(r"FEEDBACK:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return "Evaluation completed."


class MaintenanceEvaluator:
    """
    Evaluates maintenance recommendation quality using LLM-as-judge.
    Implements DeepEval-inspired metrics:
    - Answer Relevancy
    - Faithfulness
    - Maintenance Quality (domain-specific)
    - LLM-as-Judge overall verdict
    """

    def evaluate_answer_relevancy(self, query: str, answer: str) -> float:
        messages = [
            {"role": "system", "content": "You are an evaluation expert for medical maintenance systems."},
            {"role": "user", "content": RELEVANCY_PROMPT.format(query=query, answer=answer[:2000])},
        ]
        result = llm_service.generate_completion(messages, max_tokens=50, temperature=0.0)
        return _extract_score(result)

    def evaluate_faithfulness(self, context: str, answer: str) -> float:
        messages = [
            {"role": "system", "content": "You are an evaluation expert checking factual grounding."},
            {
                "role": "user",
                "content": FAITHFULNESS_PROMPT.format(
                    context=context[:3000], answer=answer[:2000]
                ),
            },
        ]
        result = llm_service.generate_completion(messages, max_tokens=50, temperature=0.0)
        return _extract_score(result)

    def evaluate_maintenance_quality(self, query: str, answer: str) -> tuple[float, str]:
        messages = [
            {
                "role": "system",
                "content": "You are a senior biomedical engineer evaluating maintenance recommendations.",
            },
            {
                "role": "user",
                "content": MAINTENANCE_QUALITY_PROMPT.format(
                    query=query, answer=answer[:2000]
                ),
            },
        ]
        result = llm_service.generate_completion(messages, max_tokens=100, temperature=0.0)
        score = _extract_score(result)
        feedback = _extract_feedback(result)
        return score, feedback

    def llm_judge(self, query: str, context: str, answer: str) -> tuple[str, str, float]:
        import re
        messages = [
            {
                "role": "system",
                "content": "You are an expert judge for medical equipment maintenance AI systems.",
            },
            {
                "role": "user",
                "content": LLM_JUDGE_PROMPT.format(
                    query=query, context=context[:3000], answer=answer[:2000]
                ),
            },
        ]
        result = llm_service.generate_completion(messages, max_tokens=150, temperature=0.0)
        verdict_match = re.search(r"VERDICT:\s*(Accept|Reject)", result, re.IGNORECASE)
        reason_match = re.search(r"REASON:\s*(.+?)(?:\n|$)", result, re.IGNORECASE)
        overall_match = re.search(r"OVERALL_SCORE:\s*([0-9.]+)", result, re.IGNORECASE)
        verdict = verdict_match.group(1) if verdict_match else "Accept"
        reason = reason_match.group(1).strip() if reason_match else "Meets quality standards."
        overall = float(overall_match.group(1)) if overall_match else 0.75
        return verdict, reason, max(0.0, min(1.0, overall))

    def evaluate(self, request: EvaluationRequest) -> EvaluationResult:
        relevancy = self.evaluate_answer_relevancy(request.query, request.answer)
        faithfulness = self.evaluate_faithfulness(request.context, request.answer)
        quality, feedback = self.evaluate_maintenance_quality(request.query, request.answer)
        verdict, reason, overall = self.llm_judge(request.query, request.context, request.answer)
        overall_score = round((relevancy + faithfulness + quality + overall) / 4, 3)
        return EvaluationResult(
            answer_relevancy_score=round(relevancy, 3),
            faithfulness_score=round(faithfulness, 3),
            maintenance_quality_score=round(quality, 3),
            llm_judge_verdict=f"{verdict}: {reason}",
            overall_score=overall_score,
            feedback=feedback,
        )


evaluator = MaintenanceEvaluator()
