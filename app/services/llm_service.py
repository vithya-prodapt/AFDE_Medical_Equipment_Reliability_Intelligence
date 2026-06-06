import logging
import os
import time
from logging.handlers import RotatingFileHandler
from openai import OpenAI
from typing import List, Dict
import httpx
from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, LLM_MODEL

MAX_CONTEXT_TOKENS = 8000
CHARS_PER_TOKEN = 4

_http_client = httpx.Client(verify=False, timeout=120.0)

os.makedirs("logs", exist_ok=True)
_file_handler = RotatingFileHandler(
    "logs/llm_calls.log", maxBytes=5 * 1024 * 1024, backupCount=3
)
_file_handler.setFormatter(
    logging.Formatter("%(asctime)s %(levelname)s %(message)s")
)
_llm_logger = logging.getLogger("llm_service")
_llm_logger.setLevel(logging.INFO)
_llm_logger.addHandler(_file_handler)


class LLMService:
    def __init__(self):
        self.client = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            http_client=_http_client,
        )
        self.model = LLM_MODEL
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0
        self._total_calls = 0
        self._error_calls = 0
        self._total_latency_ms = 0

    def generate_completion(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 500,
        temperature: float = 0.3,
    ) -> str:
        max_tokens = min(max_tokens, 500)
        start = time.time()
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
            latency_ms = round((time.time() - start) * 1000)
            self._total_calls += 1
            self._total_latency_ms += latency_ms
            if response.usage:
                self.total_prompt_tokens += response.usage.prompt_tokens
                self.total_completion_tokens += response.usage.completion_tokens
                _llm_logger.info(
                    f"OK model={self.model} max_tokens={max_tokens} "
                    f"prompt_tokens={response.usage.prompt_tokens} "
                    f"completion_tokens={response.usage.completion_tokens} "
                    f"latency_ms={latency_ms}"
                )
            return response.choices[0].message.content.strip()
        except Exception as e:
            latency_ms = round((time.time() - start) * 1000)
            self._error_calls += 1
            _llm_logger.error(
                f"ERROR model={self.model} max_tokens={max_tokens} "
                f"error={type(e).__name__}: {e} latency_ms={latency_ms}"
            )
            raise

    def get_monitoring_stats(self) -> Dict:
        avg_latency = (
            round(self._total_latency_ms / self._total_calls)
            if self._total_calls > 0 else 0
        )
        error_rate = (
            round(self._error_calls / self._total_calls * 100, 1)
            if self._total_calls > 0 else 0.0
        )
        return {
            "total_calls": self._total_calls,
            "error_calls": self._error_calls,
            "error_rate_pct": error_rate,
            "avg_latency_ms": avg_latency,
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
        }

    def token_count_estimate(self, text: str) -> int:
        return len(text) // CHARS_PER_TOKEN

    def truncate_to_token_limit(self, text: str, max_tokens: int) -> str:
        max_chars = max_tokens * CHARS_PER_TOKEN
        if len(text) <= max_chars:
            return text
        return text[:max_chars] + "\n[Context truncated]"

    def build_optimized_context(self, incidents: list, max_tokens: int = MAX_CONTEXT_TOKENS) -> str:
        context_parts = []
        used_tokens = 0
        for i, inc in enumerate(incidents):
            chunk = f"Incident {i+1}:\n{inc.incident_narrative}\n"
            chunk_tokens = self.token_count_estimate(chunk)
            if used_tokens + chunk_tokens > max_tokens:
                remaining = max_tokens - used_tokens
                chunk = self.truncate_to_token_limit(chunk, remaining)
                context_parts.append(chunk)
                break
            context_parts.append(chunk)
            used_tokens += chunk_tokens
        return "\n---\n".join(context_parts)

    def get_token_usage(self) -> Dict[str, int]:
        return {
            "total_prompt_tokens": self.total_prompt_tokens,
            "total_completion_tokens": self.total_completion_tokens,
            "total_tokens": self.total_prompt_tokens + self.total_completion_tokens,
        }

    def reset_token_usage(self):
        self.total_prompt_tokens = 0
        self.total_completion_tokens = 0


llm_service = LLMService()
