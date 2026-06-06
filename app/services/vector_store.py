import chromadb
from typing import List, Dict, Optional, Any
import os
from app.config import CHROMA_PERSIST_DIR, COLLECTION_NAME


class VectorStoreService:
    def __init__(self):
        os.makedirs(CHROMA_PERSIST_DIR, exist_ok=True)
        try:
            self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        except Exception:
            self.client = chromadb.EphemeralClient()
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]],
    ) -> int:
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            self.collection.add(
                ids=ids[i: i + batch_size],
                embeddings=embeddings[i: i + batch_size],
                documents=documents[i: i + batch_size],
                metadatas=metadatas[i: i + batch_size],
            )
        return len(ids)

    def query(
        self,
        query_embedding: List[float],
        n_results: int = 10,
        where_filter: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        kwargs: Dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(n_results, self.get_count()),
            "include": ["documents", "metadatas", "distances", "embeddings"],
        }
        if where_filter:
            kwargs["where"] = where_filter
        if kwargs["n_results"] == 0:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        return self.collection.query(**kwargs)

    def get_count(self) -> int:
        return self.collection.count()

    def get_all_documents(self, limit: int = 10000) -> Dict[str, Any]:
        count = self.get_count()
        if count == 0:
            return {"ids": [], "documents": [], "metadatas": []}
        return self.collection.get(
            limit=min(limit, count),
            include=["documents", "metadatas"],
        )

    def get_equipment_severity_breakdown(self, equipment_type: str = None, hospital_units: list = None) -> dict:
        count = self.get_count()
        if count == 0:
            return {}
        data = self.collection.get(limit=min(count, 10000), include=["metadatas"])
        unit_set = set(hospital_units) if hospital_units else None
        breakdown = {}
        for meta in data["metadatas"]:
            eq = meta.get("equipment_type", "Unknown")
            unit = meta.get("hospital_unit", "Unknown")
            sev = meta.get("severity", "Unknown")
            if equipment_type and eq != equipment_type:
                continue
            if unit_set and unit not in unit_set:
                continue
            if eq not in breakdown:
                breakdown[eq] = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
            if sev in breakdown[eq]:
                breakdown[eq][sev] += 1
        return breakdown

    def get_filtered_stats(self, equipment_type: str = None, hospital_units: list = None) -> dict:
        count = self.get_count()
        if count == 0:
            return {"total_documents": 0}
        data = self.collection.get(limit=min(count, 10000), include=["metadatas"])
        unit_set = set(hospital_units) if hospital_units else None
        severity_dist: Dict[str, int] = {}
        failure_dist: Dict[str, int] = {}
        equipment_dist: Dict[str, int] = {}
        unit_dist: Dict[str, int] = {}
        total = 0
        for meta in data["metadatas"]:
            eq = meta.get("equipment_type", "Unknown")
            unit = meta.get("hospital_unit", "Unknown")
            sev = meta.get("severity", "Unknown")
            ft = meta.get("failure_type", "Unknown")
            if equipment_type and eq != equipment_type:
                continue
            if unit_set and unit not in unit_set:
                continue
            total += 1
            severity_dist[sev] = severity_dist.get(sev, 0) + 1
            failure_dist[ft] = failure_dist.get(ft, 0) + 1
            equipment_dist[eq] = equipment_dist.get(eq, 0) + 1
            unit_dist[unit] = unit_dist.get(unit, 0) + 1
        return {
            "total_documents": total,
            "severity_distribution": severity_dist,
            "failure_type_distribution": failure_dist,
            "equipment_type_distribution": equipment_dist,
            "hospital_unit_distribution": unit_dist,
        }

    def delete_collection(self):
        self.client.delete_collection(COLLECTION_NAME)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def get_stats(self) -> Dict[str, Any]:
        count = self.get_count()
        if count == 0:
            return {"total_documents": 0}
        data = self.collection.get(limit=min(count, 10000), include=["metadatas"])
        equipment_dist: Dict[str, int] = {}
        severity_dist: Dict[str, int] = {}
        failure_dist: Dict[str, int] = {}
        unit_dist: Dict[str, int] = {}
        for meta in data["metadatas"]:
            eq = meta.get("equipment_type", "Unknown")
            sv = meta.get("severity", "Unknown")
            ft = meta.get("failure_type", "Unknown")
            un = meta.get("hospital_unit", "Unknown")
            equipment_dist[eq] = equipment_dist.get(eq, 0) + 1
            severity_dist[sv] = severity_dist.get(sv, 0) + 1
            failure_dist[ft] = failure_dist.get(ft, 0) + 1
            unit_dist[un] = unit_dist.get(un, 0) + 1
        return {
            "total_documents": count,
            "equipment_type_distribution": equipment_dist,
            "severity_distribution": severity_dist,
            "failure_type_distribution": failure_dist,
            "hospital_unit_distribution": unit_dist,
        }


vector_store = VectorStoreService()
