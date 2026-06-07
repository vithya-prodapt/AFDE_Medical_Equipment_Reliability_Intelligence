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

    # ── Backup / Rollback ────────────────────────────────────────────────────

    @property
    def _backup_name(self) -> str:
        return f"{COLLECTION_NAME}_backup"

    def backup_collection(self) -> bool:
        """
        Copies the current collection into a backup collection before a
        destructive re-ingest. Safe to call even when no data exists.
        Returns True on success.
        """
        count = self.get_count()
        if count == 0:
            print("[VectorStore] Nothing to back up — collection is empty.")
            return True
        try:
            # Drop old backup if present
            try:
                self.client.delete_collection(self._backup_name)
            except Exception:
                pass

            backup_col = self.client.get_or_create_collection(
                name=self._backup_name,
                metadata={"hnsw:space": "cosine"},
            )

            data = self.collection.get(
                limit=min(count, 10000),
                include=["documents", "metadatas", "embeddings"],
            )
            if data["ids"]:
                batch_size = 100
                for i in range(0, len(data["ids"]), batch_size):
                    backup_col.add(
                        ids=data["ids"][i: i + batch_size],
                        embeddings=data["embeddings"][i: i + batch_size],
                        documents=data["documents"][i: i + batch_size],
                        metadatas=data["metadatas"][i: i + batch_size],
                    )
            print(f"[VectorStore] Backup created: {len(data['ids'])} records → '{self._backup_name}'.")
            return True
        except Exception as e:
            print(f"[VectorStore] Backup failed: {e}")
            return False

    def restore_from_backup(self) -> bool:
        """
        Restores the main collection from the backup.
        Returns True on success.
        """
        try:
            backup_col = self.client.get_collection(self._backup_name)
        except Exception:
            print("[VectorStore] No backup collection found.")
            return False

        backup_count = backup_col.count()
        if backup_count == 0:
            print("[VectorStore] Backup collection is empty — nothing to restore.")
            return False

        try:
            self.delete_collection()
            data = backup_col.get(
                limit=min(backup_count, 10000),
                include=["documents", "metadatas", "embeddings"],
            )
            if data["ids"]:
                batch_size = 100
                for i in range(0, len(data["ids"]), batch_size):
                    self.collection.add(
                        ids=data["ids"][i: i + batch_size],
                        embeddings=data["embeddings"][i: i + batch_size],
                        documents=data["documents"][i: i + batch_size],
                        metadatas=data["metadatas"][i: i + batch_size],
                    )
            print(f"[VectorStore] Restored {len(data['ids'])} records from backup.")
            return True
        except Exception as e:
            print(f"[VectorStore] Restore failed: {e}")
            return False

    def has_backup(self) -> bool:
        """Returns True if a non-empty backup collection exists."""
        try:
            col = self.client.get_collection(self._backup_name)
            return col.count() > 0
        except Exception:
            return False

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
