import sqlite3
import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from .models import TriageAssessment, TriageTier, PatientVitals, DoctorConsultationNote

DB_PATH = os.path.join(os.path.dirname(__file__), "arogya_triage.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        full_name TEXT,
        age INTEGER,
        gender TEXT,
        village_zone TEXT,
        triage_tier TEXT,
        esi_level INTEGER,
        urgency_label TEXT,
        chief_complaints TEXT,
        red_flag_triggers TEXT,
        clinical_summary TEXT,
        differential_considerations TEXT,
        vitals_json TEXT,
        recommended_disposition TEXT,
        created_at TEXT,
        status TEXT
    )
    ''')
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS consultation_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assessment_id TEXT,
        doctor_name TEXT,
        diagnosis TEXT,
        prescription TEXT,
        disposition TEXT,
        referral_reason TEXT,
        additional_notes TEXT,
        created_at TEXT,
        FOREIGN KEY (assessment_id) REFERENCES assessments (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    seed_initial_data()

def seed_initial_data():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM assessments")
    count = cur.fetchone()[0]
    
    if count == 0:
        initial_cases = [
            {
                "id": "TRG-RED-001",
                "patient_id": "PAT-98214",
                "full_name": "Rameshwar Sharma",
                "age": 58,
                "gender": "Male",
                "village_zone": "Sector 3 - Piproli Village",
                "triage_tier": "RED",
                "esi_level": 1,
                "urgency_label": "IMMEDIATE RESUSCITATION",
                "chief_complaints": ["Severe Chest Pain", "Diaphoresis", "Breathlessness"],
                "red_flag_triggers": ["Critical Flag: Chhati Me Dard (Chest Pain)", "Borderline Hypoxemia: SpO2 89% (< 90%)"],
                "clinical_summary": "🚨 PRIORITY RED: Rameshwar Sharma, 58y Male. Acute crushing retrosternal chest pain radiating to left arm with severe sweating and dyspnea. SpO2 89%, BP 178/104. High risk of Acute Myocardial Infarction. Immediate ECG and O2 required.",
                "differential_considerations": ["Acute Coronary Syndrome (STEMI / NSTEMI)", "Aortic Dissection", "Hypertensive Urgency"],
                "vitals_json": json.dumps({"spo2": 89.0, "systolic_bp": 178, "diastolic_bp": 104, "pulse_rate": 118, "temperature_f": 98.4, "respiratory_rate": 26, "blood_glucose": 165, "pain_scale": 9}),
                "recommended_disposition": "IMMEDIATE STABILIZE / HIGH PRIORITY SECONDARY REFERRAL",
                "created_at": datetime.utcnow().isoformat(),
                "status": "WAITING"
            },
            {
                "id": "TRG-YEL-002",
                "patient_id": "PAT-77341",
                "full_name": "Sunita Devi",
                "age": 32,
                "gender": "Female",
                "village_zone": "Sector 1 - Morar Rural",
                "triage_tier": "YELLOW",
                "esi_level": 3,
                "urgency_label": "URGENT / MODERATE RISK",
                "chief_complaints": ["High Fever (3 Days)", "Persistent Vomiting", "Dehydration"],
                "red_flag_triggers": ["Severe Hyperpyrexia: Temp 102.8°F"],
                "clinical_summary": "⚠️ PRIORITY YELLOW: Sunita Devi, 32y Female. 3-day continuous high-grade fever with chills, body ache, and inability to retain fluids. SpO2 97%, Pulse 102, Temp 102.8°F. Suspected Acute Febrile Illness (Dengue/Malaria). Needs NS drip & blood panel.",
                "differential_considerations": ["Dengue Fever / Thrombocytopenia", "Falciparum Malaria", "Acute Viral Gastroenteritis"],
                "vitals_json": json.dumps({"spo2": 97.0, "systolic_bp": 108, "diastolic_bp": 72, "pulse_rate": 102, "temperature_f": 102.8, "respiratory_rate": 20, "blood_glucose": 95, "pain_scale": 6}),
                "recommended_disposition": "URGENT PHC INVESTIGATIONS & IV HYDRATION",
                "created_at": datetime.utcnow().isoformat(),
                "status": "WAITING"
            },
            {
                "id": "TRG-GRN-003",
                "patient_id": "PAT-33829",
                "full_name": "Kishan Lal",
                "age": 45,
                "gender": "Male",
                "village_zone": "Sector 2 - Maharajpura",
                "triage_tier": "GREEN",
                "esi_level": 4,
                "urgency_label": "LESS URGENT",
                "chief_complaints": ["Mild Knee Joint Pain", "Hypertension Medication Refill"],
                "red_flag_triggers": [],
                "clinical_summary": "🟢 PRIORITY GREEN: Kishan Lal, 45y Male. Routine chronic hypertension follow-up and chronic bilateral knee joint stiffness for 2 months. Vitals completely stable: SpO2 99%, BP 128/82, Pulse 74. Suitable for routine prescription renewal.",
                "differential_considerations": ["Osteoarthritis Knee", "Essential Hypertension on regular Rx"],
                "vitals_json": json.dumps({"spo2": 99.0, "systolic_bp": 128, "diastolic_bp": 82, "pulse_rate": 74, "temperature_f": 98.2, "respiratory_rate": 16, "blood_glucose": 110, "pain_scale": 3}),
                "recommended_disposition": "ROUTINE OUTPATIENT MEDICINE DISPENSARY",
                "created_at": datetime.utcnow().isoformat(),
                "status": "WAITING"
            }
        ]
        
        for c in initial_cases:
            cur.execute('''
            INSERT INTO assessments (
                id, patient_id, full_name, age, gender, village_zone, triage_tier,
                esi_level, urgency_label, chief_complaints, red_flag_triggers,
                clinical_summary, differential_considerations, vitals_json,
                recommended_disposition, created_at, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                c["id"], c["patient_id"], c["full_name"], c["age"], c["gender"],
                c["village_zone"], c["triage_tier"], c["esi_level"], c["urgency_label"],
                json.dumps(c["chief_complaints"]), json.dumps(c["red_flag_triggers"]),
                c["clinical_summary"], json.dumps(c["differential_considerations"]),
                c["vitals_json"], c["recommended_disposition"], c["created_at"], c["status"]
            ))
        conn.commit()
    conn.close()

def save_assessment(a: TriageAssessment):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
    INSERT OR REPLACE INTO assessments (
        id, patient_id, full_name, age, gender, village_zone, triage_tier,
        esi_level, urgency_label, chief_complaints, red_flag_triggers,
        clinical_summary, differential_considerations, vitals_json,
        recommended_disposition, created_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        a.id, a.patient_id, a.full_name, a.age, a.gender, a.village_zone,
        a.triage_tier.value, a.esi_level, a.urgency_label,
        json.dumps(a.chief_complaints), json.dumps(a.red_flag_triggers),
        a.clinical_summary, json.dumps(a.differential_considerations),
        json.dumps(a.vitals.model_dump()), a.recommended_disposition,
        a.created_at.isoformat(), a.status
    ))
    conn.commit()
    conn.close()

def get_live_queue() -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    
    cur.execute('''
    SELECT * FROM assessments
    WHERE status IN ('WAITING', 'IN_CONSULTATION')
    ORDER BY esi_level ASC, created_at ASC
    ''')
    rows = cur.fetchall()
    
    queue = []
    for r in rows:
        d = dict(r)
        d["chief_complaints"] = json.loads(d["chief_complaints"])
        d["red_flag_triggers"] = json.loads(d["red_flag_triggers"])
        d["differential_considerations"] = json.loads(d["differential_considerations"])
        d["vitals"] = json.loads(d["vitals_json"])
        queue.append(d)
        
    conn.close()
    return queue

def get_all_assessments(limit: int = 50) -> List[Dict[str, Any]]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM assessments ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cur.fetchall()
    items = []
    for r in rows:
        d = dict(r)
        d["chief_complaints"] = json.loads(d["chief_complaints"])
        d["red_flag_triggers"] = json.loads(d["red_flag_triggers"])
        d["differential_considerations"] = json.loads(d["differential_considerations"])
        d["vitals"] = json.loads(d["vitals_json"])
        items.append(d)
    conn.close()
    return items

def update_patient_status(assessment_id: str, new_status: str):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("UPDATE assessments SET status = ? WHERE id = ?", (new_status, assessment_id))
    conn.commit()
    conn.close()

def save_doctor_note(note: DoctorConsultationNote):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('''
    INSERT INTO consultation_notes (
        assessment_id, doctor_name, diagnosis, prescription, disposition,
        referral_reason, additional_notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        note.assessment_id, note.doctor_name, note.diagnosis, note.prescription,
        note.disposition, note.referral_reason, note.additional_notes,
        datetime.utcnow().isoformat()
    ))
    final_status = "REFERRED" if note.disposition == "REFERRED_DISTRICT_HOSPITAL" else "COMPLETED"
    cur.execute("UPDATE assessments SET status = ? WHERE id = ?", (final_status, note.assessment_id))
    conn.commit()
    conn.close()
