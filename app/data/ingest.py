import os
from typing import Optional, Dict, Any
from app.data.preprocessor import generate_synthetic_data, load_ai4i_data, create_incident_narrative
from app.services.embedding_service import embedding_service
from app.services.vector_store import vector_store
from app.services.hybrid_search import hybrid_search
from app.config import SAMPLE_DATA_SIZE


class DataIngestionPipeline:
    def run(
        self,
        data_path: Optional[str] = None,
        sample_size: Optional[int] = None,
        force_reingest: bool = False,
    ) -> Dict[str, Any]:
        existing_count = vector_store.get_count()
        if existing_count > 0 and not force_reingest:
            print(f"[Ingest] Collection already has {existing_count} records. Rebuilding BM25 index.")
            self._rebuild_bm25_index()
            return {
                "status": "skipped",
                "records_ingested": 0,
                "collection_size": existing_count,
                "message": f"Collection already populated with {existing_count} records.",
            }

        n = sample_size or SAMPLE_DATA_SIZE
        records = None

        if data_path and os.path.isfile(data_path):
            print(f"[Ingest] Loading AI4I dataset from {data_path}")
            records = load_ai4i_data(data_path)

        if records is None:
            print(f"[Ingest] Generating {n} synthetic medical equipment incidents…")
            records = generate_synthetic_data(n)

        if sample_size and len(records) > sample_size:
            records = records[:sample_size]

        print(f"[Ingest] Processing {len(records)} records…")
        narratives, ids, metadatas = [], [], []
        for rec in records:
            narrative = create_incident_narrative(rec)
            narratives.append(narrative)
            ids.append(rec["incident_id"])
            metadatas.append({
                "incident_id": rec["incident_id"],
                "machine_id": rec["machine_id"],
                "equipment_type": rec["equipment_type"],
                "equipment_class": rec["equipment_class"],
                "hospital_unit": rec["hospital_unit"],
                "air_temperature_k": rec["air_temperature_k"],
                "process_temperature_k": rec["process_temperature_k"],
                "temperature_delta_k": rec["temperature_delta_k"],
                "rotational_speed_rpm": rec["rotational_speed_rpm"],
                "torque_nm": rec["torque_nm"],
                "tool_wear_min": rec["tool_wear_min"],
                "machine_failure": rec["machine_failure"],
                "failure_type": rec["failure_type"],
                "severity": rec["severity"],
            })

        if force_reingest and existing_count > 0:
            print("[Ingest] Clearing existing collection…")
            vector_store.delete_collection()

        print(f"[Ingest] Generating embeddings for {len(narratives)} documents…")
        embeddings = embedding_service.generate_batch_embeddings(narratives, delay=0.05)

        print("[Ingest] Storing in ChromaDB…")
        vector_store.add_documents(ids=ids, embeddings=embeddings, documents=narratives, metadatas=metadatas)

        print("[Ingest] Building BM25 index…")
        hybrid_search.build_index(documents=narratives, metadatas=metadatas, ids=ids)

        final_count = vector_store.get_count()
        print(f"[Ingest] Complete. Collection size: {final_count}")
        return {
            "status": "success",
            "records_ingested": len(records),
            "collection_size": final_count,
            "message": f"Successfully ingested {len(records)} medical equipment incidents.",
        }

    def _rebuild_bm25_index(self):
        data = vector_store.get_all_documents()
        if data["ids"]:
            hybrid_search.build_index(
                documents=data["documents"],
                metadatas=data["metadatas"],
                ids=data["ids"],
            )
            print(f"[Ingest] BM25 index rebuilt with {len(data['ids'])} documents.")


ingestion_pipeline = DataIngestionPipeline()
