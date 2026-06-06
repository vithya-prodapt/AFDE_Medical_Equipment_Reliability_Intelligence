import pandas as pd
import numpy as np
import random
from typing import List, Dict, Any, Optional
from app.config import EQUIPMENT_TYPES, HOSPITAL_UNITS, FAILURE_TYPE_MAP, SAMPLE_DATA_SIZE


EQUIPMENT_PARAMS = {
    "MRI System":         {"temp_air": (300, 310), "temp_proc": (305, 318), "rpm": (500, 2000),  "torque": (30, 80),  "wear": (0, 400)},
    "CT Scanner":         {"temp_air": (295, 312), "temp_proc": (298, 315), "rpm": (1500, 4500), "torque": (20, 60),  "wear": (0, 800)},
    "PET Scanner":        {"temp_air": (295, 310), "temp_proc": (298, 314), "rpm": (800, 2500),  "torque": (25, 65),  "wear": (0, 600)},
    "Digital X-Ray System": {"temp_air": (293, 308), "temp_proc": (296, 312), "rpm": (200, 1200), "torque": (10, 40), "wear": (0, 500)},
    "Ventilator":         {"temp_air": (296, 312), "temp_proc": (300, 316), "rpm": (100, 3000),  "torque": (5,  25),  "wear": (0, 600)},
    "Ultrasound Scanner": {"temp_air": (293, 308), "temp_proc": (296, 311), "rpm": (50,  500),   "torque": (2,  15),  "wear": (0, 300)},
    "Anesthesia Machine": {"temp_air": (296, 311), "temp_proc": (299, 314), "rpm": (200, 1500),  "torque": (8,  30),  "wear": (0, 400)},
    "Dialysis Machine":   {"temp_air": (295, 310), "temp_proc": (298, 313), "rpm": (300, 2000),  "torque": (10, 45),  "wear": (0, 350)},
    "Patient Monitor":    {"temp_air": (293, 306), "temp_proc": (295, 308), "rpm": (0,   200),   "torque": (1,  8),   "wear": (0, 100)},
    "Infusion Pump":      {"temp_air": (293, 306), "temp_proc": (295, 308), "rpm": (50,  800),   "torque": (1,  10),  "wear": (0, 200)},
    "ECG Monitor":        {"temp_air": (293, 306), "temp_proc": (295, 308), "rpm": (0,   100),   "torque": (1,  5),   "wear": (0, 80)},
    "Defibrillator":      {"temp_air": (293, 308), "temp_proc": (296, 311), "rpm": (0,   500),   "torque": (2,  12),  "wear": (0, 150)},
}

FAILURE_DESCRIPTIONS = {
    "Component Wear Failure": [
        "excessive component wear detected beyond tolerance limits",
        "mechanical degradation of rotating components observed",
        "bearing wear exceeds manufacturer specifications",
        "component fatigue indicating imminent replacement needed",
    ],
    "Heat Dissipation Failure": [
        "cooling system unable to maintain optimal operating temperature",
        "thermal runaway detected in power electronics",
        "heat exchanger efficiency reduced causing overheating alerts",
        "temperature gradient anomaly in internal subsystems",
    ],
    "Power System Failure": [
        "power supply voltage fluctuation outside acceptable range",
        "electrical fault in primary power circuit",
        "UPS battery capacity degraded below safe operating threshold",
        "power board failure causing intermittent shutdowns",
    ],
    "Mechanical Overstrain Failure": [
        "operational load exceeded mechanical design limits",
        "structural stress beyond rated capacity observed",
        "mechanical overload causing safety shutdown activation",
        "torque exceeded maximum specification during operation",
    ],
    "Unexpected System Failure": [
        "uncharacterized system fault detected during routine operation",
        "multiple sensor anomalies with no clear root cause identified",
        "software-hardware interface failure causing system reset",
        "intermittent fault pattern not matching standard failure modes",
    ],
    "Routine Maintenance Check": [
        "scheduled preventive maintenance inspection completed",
        "routine calibration and performance verification performed",
        "periodic component inspection and lubrication performed",
        "planned maintenance window utilised for system checks",
    ],
}


def _pick(lst: list) -> Any:
    return lst[random.randint(0, len(lst) - 1)]


def _uniform(lo: float, hi: float, decimals: int = 2) -> float:
    return round(random.uniform(lo, hi), decimals)


def generate_synthetic_data(n: int = SAMPLE_DATA_SIZE) -> List[Dict[str, Any]]:
    records = []
    all_equipment = []
    for eq_type, machines in EQUIPMENT_TYPES.items():
        for eq_name in machines:
            if eq_name in EQUIPMENT_PARAMS:
                all_equipment.append((eq_type, eq_name))

    for i in range(n):
        eq_class, eq_name = _pick(all_equipment)
        params = EQUIPMENT_PARAMS[eq_name]
        unit = _pick(HOSPITAL_UNITS)
        machine_id = f"{eq_class}-{eq_name[:3].upper()}-{str(i+1).zfill(5)}"

        air_temp = _uniform(*params["temp_air"])
        proc_temp = _uniform(*params["temp_proc"])
        rpm = _uniform(*params["rpm"], decimals=0)
        torque = _uniform(*params["torque"])
        wear = _uniform(*params["wear"], decimals=0)

        fail_roll = random.random()
        if fail_roll < 0.03:
            failure_type_key = "TWF"
        elif fail_roll < 0.055:
            failure_type_key = "HDF"
        elif fail_roll < 0.075:
            failure_type_key = "PWF"
        elif fail_roll < 0.09:
            failure_type_key = "OSF"
        elif fail_roll < 0.097:
            failure_type_key = "RNF"
        else:
            failure_type_key = "No Failure"

        failure_type = FAILURE_TYPE_MAP[failure_type_key]
        machine_failure = failure_type_key != "No Failure"

        if failure_type_key == "No Failure":
            severity = "Low"
        elif failure_type_key in ("TWF", "HDF"):
            severity = "Medium" if random.random() < 0.6 else "High"
        elif failure_type_key in ("PWF", "OSF"):
            severity = "High" if random.random() < 0.5 else "Critical"
        else:
            severity = _pick(["Medium", "High"])

        temp_delta = round(proc_temp - air_temp, 2)

        records.append({
            "incident_id": f"INC-{str(i+1).zfill(6)}",
            "machine_id": machine_id,
            "equipment_type": eq_name,
            "equipment_class": eq_class,
            "hospital_unit": unit,
            "air_temperature_k": air_temp,
            "process_temperature_k": proc_temp,
            "temperature_delta_k": temp_delta,
            "rotational_speed_rpm": rpm,
            "torque_nm": torque,
            "tool_wear_min": wear,
            "machine_failure": machine_failure,
            "failure_type": failure_type,
            "severity": severity,
        })

    return records


def load_ai4i_data(filepath: str) -> Optional[List[Dict[str, Any]]]:
    try:
        df = pd.read_csv(filepath)
        df.columns = [c.strip().lower().replace(" ", "_").replace("[", "").replace("]", "") for c in df.columns]

        type_col = next((c for c in df.columns if "type" in c and "failure" not in c), None)
        air_col = next((c for c in df.columns if "air_temp" in c), None)
        proc_col = next((c for c in df.columns if "process_temp" in c), None)
        rpm_col = next((c for c in df.columns if "rotation" in c or "rpm" in c), None)
        torque_col = next((c for c in df.columns if "torque" in c), None)
        wear_col = next((c for c in df.columns if "tool_wear" in c or "wear" in c), None)
        failure_col = next((c for c in df.columns if "machine_failure" in c), None)

        records = []
        eq_type_map = {"L": "L", "M": "M", "H": "H"}
        all_equipment = {k: v for k, v in EQUIPMENT_TYPES.items()}

        for idx, row in df.iterrows():
            eq_class = str(row.get(type_col, "M")).strip().upper() if type_col else "M"
            if eq_class not in all_equipment:
                eq_class = "M"
            eq_options = all_equipment[eq_class]
            eq_name = eq_options[idx % len(eq_options)]
            unit = HOSPITAL_UNITS[idx % len(HOSPITAL_UNITS)]

            failure_keys = ["TWF", "HDF", "PWF", "OSF", "RNF"]
            failure_type_key = "No Failure"
            for fk in failure_keys:
                col = next((c for c in df.columns if fk.lower() in c.lower()), None)
                if col and row.get(col, 0) == 1:
                    failure_type_key = fk
                    break

            machine_failure = bool(row.get(failure_col, 0)) if failure_col else failure_type_key != "No Failure"
            failure_type = FAILURE_TYPE_MAP.get(failure_type_key, "Routine Maintenance Check")

            if failure_type_key == "No Failure":
                severity = "Low"
            elif failure_type_key in ("TWF", "HDF"):
                severity = "Medium"
            elif failure_type_key in ("PWF", "OSF"):
                severity = "High"
            else:
                severity = "Medium"

            records.append({
                "incident_id": f"INC-AI4I-{str(idx+1).zfill(6)}",
                "machine_id": f"{eq_class}-{eq_name[:3].upper()}-{str(idx+1).zfill(5)}",
                "equipment_type": eq_name,
                "equipment_class": eq_class,
                "hospital_unit": unit,
                "air_temperature_k": float(row.get(air_col, 300.0)) if air_col else 300.0,
                "process_temperature_k": float(row.get(proc_col, 310.0)) if proc_col else 310.0,
                "temperature_delta_k": round(
                    float(row.get(proc_col, 310.0)) - float(row.get(air_col, 300.0)), 2
                ) if air_col and proc_col else 10.0,
                "rotational_speed_rpm": float(row.get(rpm_col, 1500.0)) if rpm_col else 1500.0,
                "torque_nm": float(row.get(torque_col, 40.0)) if torque_col else 40.0,
                "tool_wear_min": float(row.get(wear_col, 100.0)) if wear_col else 100.0,
                "machine_failure": machine_failure,
                "failure_type": failure_type,
                "severity": severity,
            })
        return records
    except Exception as e:
        print(f"[WARNING] Could not load AI4I CSV ({e}). Using synthetic data.")
        return None


def create_incident_narrative(record: Dict[str, Any]) -> str:
    ft = record["failure_type"]
    descriptions = FAILURE_DESCRIPTIONS.get(ft, FAILURE_DESCRIPTIONS["Routine Maintenance Check"])
    desc = _pick(descriptions)
    status = "FAILURE DETECTED" if record["machine_failure"] else "OPERATIONAL"
    return (
        f"Equipment: {record['equipment_type']} | Unit: {record['hospital_unit']} | "
        f"Machine ID: {record['machine_id']}\n"
        f"Maintenance Status: {status} | Failure Type: {record['failure_type']} | "
        f"Severity: {record['severity']}\n"
        f"Operational Parameters:\n"
        f"  - Air Temperature: {record['air_temperature_k']} K\n"
        f"  - Process Temperature: {record['process_temperature_k']} K\n"
        f"  - Temperature Delta: {record['temperature_delta_k']} K\n"
        f"  - Rotational Speed: {record['rotational_speed_rpm']} RPM\n"
        f"  - Torque: {record['torque_nm']} Nm\n"
        f"  - Component Wear: {record['tool_wear_min']} minutes\n"
        f"Incident Description: The {record['equipment_type']} in {record['hospital_unit']} "
        f"reported {desc}. "
        f"Current operational temperature differential is {record['temperature_delta_k']} K. "
        f"Rotational speed is {record['rotational_speed_rpm']} RPM with torque at "
        f"{record['torque_nm']} Nm and cumulative component wear of {record['tool_wear_min']} minutes."
    )
