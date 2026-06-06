import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "learner042")
OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://keygateway.arshnivlabs.com/v1")
LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "/tmp/chroma_db")
COLLECTION_NAME: str = os.getenv("COLLECTION_NAME", "medical_equipment_incidents")

MAX_RETRIEVAL_RESULTS: int = int(os.getenv("MAX_RETRIEVAL_RESULTS", "10"))
EMBEDDING_BATCH_SIZE: int = int(os.getenv("EMBEDDING_BATCH_SIZE", "50"))
SAMPLE_DATA_SIZE: int = int(os.getenv("SAMPLE_DATA_SIZE", "500"))

APP_HOST: str = os.getenv("APP_HOST", "0.0.0.0")
APP_PORT: int = int(os.getenv("PORT", os.getenv("APP_PORT", "8000")))

EQUIPMENT_TYPES = {
    "L": ["Patient Monitor", "Infusion Pump", "ECG Monitor", "Pulse Oximeter", "Defibrillator"],
    "M": ["Ventilator", "Ultrasound Scanner", "Anesthesia Machine", "Dialysis Machine"],
    "H": ["MRI System", "CT Scanner", "PET Scanner", "Dig ital X-Ray System"],
}

HOSPITAL_UNITS = [
    "ICU Ward A", "ICU Ward B", "Emergency Department",
    "Radiology Department", "Surgical Unit", "Cardiac Care Unit",
    "Neurology Department", "Oncology Unit",
]

FAILURE_TYPE_MAP = {
    "TWF": "Component Wear Failure",
    "HDF": "Heat Dissipation Failure",
    "PWF": "Power System Failure",
    "OSF": "Mechanical Overstrain Failure",
    "RNF": "Unexpected System Failure",
    "No Failure": "Routine Maintenance Check",
}
