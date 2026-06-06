from openai import OpenAI
from typing import List
import time
import httpx
from app.config import OPENAI_API_KEY, OPENAI_BASE_URL, EMBEDDING_MODEL, EMBEDDING_BATCH_SIZE

# Allow self-signed / custom SSL certs on proxy gateways; increase timeout for large batches.
_http_client = httpx.Client(verify=False, timeout=60.0)

MAX_RETRIES = 3
RETRY_DELAY = 2.0


class EmbeddingService:
    def __init__(self):
        self.client = OpenAI(
            api_key=OPENAI_API_KEY,
            base_url=OPENAI_BASE_URL,
            http_client=_http_client,
        )
        self.model = EMBEDDING_MODEL
        self.batch_size = EMBEDDING_BATCH_SIZE

    def _call_with_retry(self, texts: List[str]) -> List[List[float]]:
        last_err = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                response = self.client.embeddings.create(input=texts, model=self.model)
                return [item.embedding for item in sorted(response.data, key=lambda x: x.index)]
            except Exception as e:
                last_err = e
                if attempt < MAX_RETRIES:
                    wait = RETRY_DELAY * attempt
                    print(f"[Embed] Attempt {attempt} failed ({e}). Retrying in {wait}s…")
                    time.sleep(wait)
        raise last_err  # type: ignore[misc]

    def generate_embedding(self, text: str) -> List[float]:
        text = text.replace("\n", " ").strip() or " "
        result = self._call_with_retry([text])
        return result[0]

    def generate_batch_embeddings(self, texts: List[str], delay: float = 0.3) -> List[List[float]]:
        embeddings: List[List[float]] = []
        clean = [t.replace("\n", " ").strip() or " " for t in texts]
        for i in range(0, len(clean), self.batch_size):
            batch = clean[i: i + self.batch_size]
            batch_embeddings = self._call_with_retry(batch)
            embeddings.extend(batch_embeddings)
            if i + self.batch_size < len(clean):
                time.sleep(delay)
        return embeddings


embedding_service = EmbeddingService()
