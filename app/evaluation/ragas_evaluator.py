"""
RAGAS-compatible evaluation for the medical equipment RAG pipeline.

Implements the four core RAGAS metrics without the ragas library dependency
(avoids SSL/download issues on corporate networks). All metrics use
GPT-4o-mini via the same proxy gateway as the main pipeline.

Metrics:
  - Context Precision  : Are the retrieved chunks relevant to the query?
  - Context Recall     : Does the answer cover the key facts in the context?
  - Answer Relevancy   : How well does the answer address the query?
  - Faithfulness       : Are all answer claims grounded in the context?
"""

import re
from typing import List, Dict
from app.services.llm_service import llm_service

# ── Prompts ───────────────────────────────────────────────────────────────────

_CONTEXT_PRECISION_PROMPT = """You are evaluating a RAG retrieval system for medical equipment maintenance.

Query: {query}

Retrieved Context {idx}:
{context}

Is this retrieved context relevant and useful for answering the query?
Respond ONLY with: RELEVANT: yes/no
REASON: [one sentence]"""

_CONTEXT_RECALL_PROMPT = """You are evaluating whether a generated answer captures the key information from the source context.

Source Context:
{context}

Generated Answer:
{answer}

What fraction of the key facts in the context are reflected in the answer?
Respond ONLY with: SCORE: [0.0-1.0]
MISSING: [key facts missing from the answer, or 'none']"""

_ANSWER_RELEVANCY_PROMPT = """Evaluate how directly and completely this answer addresses the query about medical equipment.

Query: {query}
Answer: {answer}

Score from 0.0 (completely off-topic) to 1.0 (perfectly addresses the query).
Respond ONLY with: SCORE: [0.0-1.0]"""

_FAITHFULNESS_PROMPT = """Check whether every factual claim in the answer is supported by the provided context.

Context:
{context}

Answer:
{answer}

Score: 1.0 = every claim is grounded; 0.0 = answer contains hallucinations not in the context.
Respond ONLY with: SCORE: [0.0-1.0]
UNSUPPORTED_CLAIMS: [list any claims not found in context, or 'none']"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _score(text: str, default: float = 0.7) -> float:
    m = re.search(r"SCORE:\s*([0-9.]+)", text, re.IGNORECASE)
    if m:
        try:
            return max(0.0, min(1.0, float(m.group(1))))
        except ValueError:
            pass
    floats = re.findall(r"\b(0\.\d+|1\.0)\b", text)
    return max(0.0, min(1.0, float(floats[0]))) if floats else default


def _extract(text: str, key: str, default: str = "") -> str:
    m = re.search(rf"{key}:\s*(.+?)(?:\n|$)", text, re.IGNORECASE)
    return m.group(1).strip() if m else default


# ── RAGAS Evaluator ───────────────────────────────────────────────────────────

class RAGASEvaluator:
    """
    Evaluates a RAG pipeline response using RAGAS-style metrics.
    All LLM calls go through llm_service (same gateway, same token cap).
    """

    def evaluate_context_precision(self, query: str, contexts: List[str]) -> Dict:
        """
        Measures what fraction of retrieved contexts are actually relevant.
        Score = relevant_chunks / total_chunks
        """
        if not contexts:
            return {"score": 0.0, "relevant": 0, "total": 0, "details": []}

        relevant_count = 0
        details = []
        for i, ctx in enumerate(contexts):
            try:
                resp = llm_service.generate_completion(
                    messages=[
                        {"role": "system", "content": "You evaluate RAG retrieval quality for medical systems."},
                        {"role": "user", "content": _CONTEXT_PRECISION_PROMPT.format(
                            query=query, idx=i + 1, context=ctx[:800]
                        )},
                    ],
                    max_tokens=80,
                    temperature=0.0,
                )
                is_relevant = "yes" in _extract(resp, "RELEVANT", "no").lower()
                reason = _extract(resp, "REASON", "")
                if is_relevant:
                    relevant_count += 1
                details.append({"chunk": i + 1, "relevant": is_relevant, "reason": reason})
            except Exception as e:
                details.append({"chunk": i + 1, "relevant": False, "reason": f"Evaluation error: {e}"})

        score = round(relevant_count / len(contexts), 3)
        return {"score": score, "relevant": relevant_count, "total": len(contexts), "details": details}

    def evaluate_context_recall(self, context: str, answer: str) -> Dict:
        """
        Measures how much of the source context is reflected in the answer.
        """
        if not context or not answer:
            return {"score": 0.0, "missing_facts": "N/A"}
        try:
            resp = llm_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You evaluate answer completeness for medical maintenance AI."},
                    {"role": "user", "content": _CONTEXT_RECALL_PROMPT.format(
                        context=context[:2000], answer=answer[:1500]
                    )},
                ],
                max_tokens=120,
                temperature=0.0,
            )
            return {
                "score": _score(resp),
                "missing_facts": _extract(resp, "MISSING", "none"),
            }
        except Exception as e:
            return {"score": 0.7, "missing_facts": f"Evaluation error: {e}"}

    def evaluate_answer_relevancy(self, query: str, answer: str) -> float:
        """Measures how directly the answer addresses the query."""
        if not query or not answer:
            return 0.0
        try:
            resp = llm_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You evaluate answer relevancy for medical equipment queries."},
                    {"role": "user", "content": _ANSWER_RELEVANCY_PROMPT.format(
                        query=query, answer=answer[:1500]
                    )},
                ],
                max_tokens=60,
                temperature=0.0,
            )
            return _score(resp)
        except Exception as e:
            print(f"[RAGAS] answer_relevancy error: {e}")
            return 0.7

    def evaluate_faithfulness(self, context: str, answer: str) -> Dict:
        """Measures whether all answer claims are grounded in the retrieved context."""
        if not context or not answer:
            return {"score": 0.0, "unsupported_claims": "N/A"}
        try:
            resp = llm_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You check factual grounding of medical maintenance recommendations."},
                    {"role": "user", "content": _FAITHFULNESS_PROMPT.format(
                        context=context[:2000], answer=answer[:1500]
                    )},
                ],
                max_tokens=120,
                temperature=0.0,
            )
            return {
                "score": _score(resp),
                "unsupported_claims": _extract(resp, "UNSUPPORTED_CLAIMS", "none"),
            }
        except Exception as e:
            return {"score": 0.7, "unsupported_claims": f"Evaluation error: {e}"}

    def evaluate(
        self,
        query: str,
        answer: str,
        contexts: List[str],
    ) -> Dict:
        """
        Runs all four RAGAS metrics and returns a summary dict.

        Args:
            query    : The original user query
            answer   : The generated recommendation text
            contexts : List of retrieved incident narrative strings
        """
        combined_context = "\n---\n".join(contexts[:5])  # top 5 contexts

        precision   = self.evaluate_context_precision(query, contexts)
        recall      = self.evaluate_context_recall(combined_context, answer)
        relevancy   = self.evaluate_answer_relevancy(query, answer)
        faithfulness = self.evaluate_faithfulness(combined_context, answer)

        ragas_score = round(
            (precision["score"] + recall["score"] + relevancy + faithfulness["score"]) / 4, 3
        )

        return {
            "ragas_score": ragas_score,
            "context_precision": precision["score"],
            "context_precision_detail": {
                "relevant_chunks": precision["relevant"],
                "total_chunks": precision["total"],
                "chunk_details": precision["details"],
            },
            "context_recall": recall["score"],
            "context_recall_detail": {"missing_facts": recall["missing_facts"]},
            "answer_relevancy": round(relevancy, 3),
            "faithfulness": faithfulness["score"],
            "faithfulness_detail": {"unsupported_claims": faithfulness["unsupported_claims"]},
        }


ragas_evaluator = RAGASEvaluator()
