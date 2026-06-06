from rank_bm25 import BM25Okapi
from typing import List, Dict, Optional, Any
import re
from app.services.vector_store import vector_store
from app.services.embedding_service import embedding_service
from app.models.schemas import MaintenanceIncident


def tokenize(text: str) -> List[str]:
    text = text.lower()
    tokens = re.findall(r"\b[a-z][a-z0-9]*\b", text)
    stopwords = {"the", "a", "an", "is", "in", "of", "and", "or", "for", "to", "at", "by", "with"}
    return [t for t in tokens if t not in stopwords and len(t) > 2]


class HybridSearchService:
    def __init__(self):
        self.bm25_index: Optional[BM25Okapi] = None
        self.bm25_corpus: List[str] = []
        self.bm25_metadatas: List[Dict[str, Any]] = []
        self.bm25_ids: List[str] = []

    def build_index(self, documents: List[str], metadatas: List[Dict], ids: List[str]):
        self.bm25_corpus = documents
        self.bm25_metadatas = metadatas
        self.bm25_ids = ids
        tokenized = [tokenize(doc) for doc in documents]
        self.bm25_index = BM25Okapi(tokenized)

    def keyword_search(self, query: str, n_results: int = 20) -> List[Dict[str, Any]]:
        if self.bm25_index is None or len(self.bm25_corpus) == 0:
            return []
        tokens = tokenize(query)
        if not tokens:
            return []
        scores = self.bm25_index.get_scores(tokens)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:n_results]
        results = []
        for rank, idx in enumerate(top_indices):
            if scores[idx] > 0:
                results.append({
                    "id": self.bm25_ids[idx],
                    "document": self.bm25_corpus[idx],
                    "metadata": self.bm25_metadatas[idx],
                    "bm25_score": float(scores[idx]),
                    "bm25_rank": rank + 1,
                })
        return results

    def vector_search(
        self, query: str, n_results: int = 20, where_filter: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        query_embedding = embedding_service.generate_embedding(query)
        raw = vector_store.query(query_embedding, n_results=n_results, where_filter=where_filter)
        results = []
        if not raw["ids"] or not raw["ids"][0]:
            return results
        for i, doc_id in enumerate(raw["ids"][0]):
            distance = raw["distances"][0][i] if raw["distances"] else 1.0
            similarity = 1.0 - distance
            results.append({
                "id": doc_id,
                "document": raw["documents"][0][i],
                "metadata": raw["metadatas"][0][i],
                "vector_score": float(similarity),
                "vector_rank": i + 1,
            })
        return results

    def reciprocal_rank_fusion(
        self,
        vector_results: List[Dict],
        bm25_results: List[Dict],
        k: int = 60,
        vector_weight: float = 0.6,
        bm25_weight: float = 0.4,
    ) -> List[Dict[str, Any]]:
        rrf_scores: Dict[str, float] = {}
        doc_map: Dict[str, Dict] = {}

        for item in vector_results:
            doc_id = item["id"]
            rank = item["vector_rank"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + vector_weight * (1.0 / (k + rank))
            doc_map[doc_id] = item

        for item in bm25_results:
            doc_id = item["id"]
            rank = item["bm25_rank"]
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + bm25_weight * (1.0 / (k + rank))
            if doc_id not in doc_map:
                doc_map[doc_id] = item

        fused = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
        results = []
        for doc_id, score in fused:
            entry = dict(doc_map[doc_id])
            entry["hybrid_score"] = score
            results.append(entry)
        return results

    def search(
        self,
        query: str,
        n_results: int = 10,
        equipment_type: Optional[str] = None,
        hospital_unit: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[MaintenanceIncident]:
        where_filter: Optional[Dict] = None
        conditions = []
        if equipment_type and equipment_type.lower() != "all":
            conditions.append({"equipment_type": {"$eq": equipment_type}})
        if hospital_unit:
            conditions.append({"hospital_unit": {"$eq": hospital_unit}})
        if severity:
            conditions.append({"severity": {"$eq": severity}})
        if len(conditions) == 1:
            where_filter = conditions[0]
        elif len(conditions) > 1:
            where_filter = {"$and": conditions}

        fetch_k = min(n_results * 3, 30)
        vector_results = self.vector_search(query, n_results=fetch_k, where_filter=where_filter)
        bm25_results = self.keyword_search(query, n_results=fetch_k)

        if where_filter:
            bm25_results = [r for r in bm25_results if self._matches_metadata(r["metadata"], where_filter)]
            if vector_results:
                allowed_ids = {r["id"] for r in vector_results}
                bm25_results = [r for r in bm25_results if r["id"] in allowed_ids]

        fused = self.reciprocal_rank_fusion(vector_results, bm25_results)[:n_results]
        incidents = []
        for item in fused:
            meta = item["metadata"]
            vec_score = item.get("vector_score", 0.0)
            bm25_score = item.get("bm25_score", 0.0)
            hybrid_score = item.get("hybrid_score", 0.0)
            incidents.append(
                MaintenanceIncident(
                    incident_id=item["id"],
                    equipment_type=meta.get("equipment_type", "Unknown"),
                    machine_id=meta.get("machine_id", "Unknown"),
                    hospital_unit=meta.get("hospital_unit", "Unknown"),
                    severity=meta.get("severity", "Unknown"),
                    failure_type=meta.get("failure_type", "Unknown"),
                    air_temperature_k=float(meta.get("air_temperature_k", 0.0)),
                    process_temperature_k=float(meta.get("process_temperature_k", 0.0)),
                    rotational_speed_rpm=float(meta.get("rotational_speed_rpm", 0.0)),
                    torque_nm=float(meta.get("torque_nm", 0.0)),
                    tool_wear_min=float(meta.get("tool_wear_min", 0.0)),
                    machine_failure=bool(meta.get("machine_failure", False)),
                    incident_narrative=item["document"],
                    similarity_score=vec_score,
                    bm25_score=bm25_score,
                    hybrid_score=hybrid_score,
                )
            )
        return incidents

    def _matches_metadata(self, metadata: Dict[str, Any], where_filter: Dict[str, Any]) -> bool:
        if not metadata or not where_filter:
            return True
        if "$and" in where_filter:
            return all(self._matches_metadata(metadata, sub) for sub in where_filter["$and"])
        for field, condition in where_filter.items():
            if isinstance(condition, dict) and "$eq" in condition:
                if str(metadata.get(field, "")).strip().lower() != str(condition["$eq"]).strip().lower():
                    return False
            else:
                if str(metadata.get(field, "")).strip().lower() != str(condition).strip().lower():
                    return False
        return True

    def get_index_size(self) -> int:
        return len(self.bm25_corpus)


hybrid_search = HybridSearchService()
