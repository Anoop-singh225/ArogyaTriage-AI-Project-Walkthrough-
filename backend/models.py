from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class TriageTier(str, Enum):
    RED = "RED"       # ESI Level 1 or 2 (Immediate / Resuscitation / Emergent)
    YELLOW = "YELLOW" # ESI Level 3 (Urgent / Moderate Risk)
    GREEN = "GREEN"   # ESI Level 4 or 5 (Non-urgent / Routine)

class PatientVitals(BaseModel):
    spo2: Optional[float] = Field(None, description="Oxygen Saturation percentage, e.g. 96")
    systolic_bp: Optional[int] = Field(None, description="Systolic Blood Pressure, e.g. 120")
    diastolic_bp: Optional[int] = Field(None, description="Diastolic Blood Pressure, e.g. 80")
    pulse_rate: Optional[int] = Field(None, description="Heart beats per minute, e.g. 78")
    temperature_f: Optional[float] = Field(None, description="Body Temperature in Fahrenheit, e.g. 98.6")
    respiratory_rate: Optional[int] = Field(None, description="Breaths per minute, e.g. 18")
    blood_glucose: Optional[int] = Field(None, description="Blood glucose mg/dL, e.g. 110")
    pain_scale: Optional[int] = Field(0, description="Pain scale 0 to 10")

class TriageRequest(BaseModel):
    patient_id: Optional[str] = None
    full_name: str
    age: int
    gender: str
    contact: Optional[str] = None
    village_zone: str = "Sector 1 - North Village"
    spoken_language: str = "Hindi"
    raw_symptom_audio_transcript: str
    vitals: PatientVitals
    asha_worker_id: Optional[str] = "ASHA-GWL-104"
    pregnancy_status: Optional[bool] = False
    is_offline_submission: Optional[bool] = False

class TriageAssessment(BaseModel):
    id: str
    patient_id: str
    full_name: str
    age: int
    gender: str
    village_zone: str
    triage_tier: TriageTier
    esi_level: int
    urgency_label: str
    chief_complaints: List[str]
    red_flag_triggers: List[str]
    clinical_summary: str
    differential_considerations: List[str]
    vitals: PatientVitals
    recommended_disposition: str
    created_at: datetime
    status: str = "WAITING"

class DoctorConsultationNote(BaseModel):
    assessment_id: str
    doctor_name: str
    diagnosis: str
    prescription: str
    disposition: str
    referral_reason: Optional[str] = None
    additional_notes: Optional[str] = None
