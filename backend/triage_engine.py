import re
import uuid
from datetime import datetime
from typing import Tuple, List, Dict, Any
from .models import TriageRequest, TriageAssessment, TriageTier, PatientVitals

RED_FLAG_KEYWORDS = [
    "छाती में दर्द", "chest pain", "saans lene me dikkat", "breathless", "breathing difficulty",
    "saans phool", "saas ful", "chhati me dard", "dora", "seizure", "mirgi", "behosh",
    "unconscious", "khoon ki ulti", "blood in vomit", "hemoptysis", "stroke", "lakwa",
    "paralysis", "chehra tedha", "chhati dabav", "severe bleeding", "khoon beh", "asahay dard"
]

YELLOW_KEYWORDS = [
    "tez bukhar", "high fever", "3 din se bukhar", "ulti", "vomiting", "pet me dard",
    "abdominal pain", "dast", "diarrhea", "loose motion", "chakkar", "dizziness",
    "kamzori", "dehydration", "gale me jalan", "urine me jalan", "infection"
]

def analyze_spoken_transcript(transcript: str, language: str = "Hindi") -> Tuple[List[str], List[str]]:
    text = transcript.lower()
    complaints = []
    red_flags = []
    
    for kw in RED_FLAG_KEYWORDS:
        if kw in text:
            red_flags.append(f"Critical Flag: {kw.title()}")
            complaints.append(kw.title())
            
    for kw in YELLOW_KEYWORDS:
        if kw in text:
            complaints.append(kw.title())
            
    if not complaints:
        clean_text = re.sub(r'[^a-zA-Z0-9\s\u0900-\u097F]', '', transcript)
        complaints.append(clean_text[:60] if clean_text else "General indisposition / consultation")
        
    return list(set(complaints)), list(set(red_flags))

def evaluate_vitals_guardrails(vitals: PatientVitals, age: int, is_pregnant: bool = False) -> Tuple[int, List[str]]:
    vital_alarms = []
    esi = 5
    
    if vitals.spo2 is not None:
        if vitals.spo2 < 90.0:
            esi = min(esi, 1)
            vital_alarms.append(f"Severe Hypoxia: SpO2 {vitals.spo2}% (< 90%) - Immediate O2 required")
        elif vitals.spo2 < 94.0:
            esi = min(esi, 2)
            vital_alarms.append(f"Borderline Hypoxemia: SpO2 {vitals.spo2}% (90-93%)")

    if vitals.systolic_bp is not None:
        if vitals.systolic_bp < 80:
            esi = min(esi, 1)
            vital_alarms.append(f"Hypotensive Shock Risk: SBP {vitals.systolic_bp} mmHg (< 80)")
        elif vitals.systolic_bp >= 180 or (vitals.diastolic_bp and vitals.diastolic_bp >= 115):
            esi = min(esi, 2)
            vital_alarms.append(f"Hypertensive Crisis Risk: BP {vitals.systolic_bp}/{vitals.diastolic_bp} mmHg")
        elif vitals.systolic_bp >= 150:
            esi = min(esi, 3)

    if vitals.pulse_rate is not None:
        if vitals.pulse_rate > 135 or vitals.pulse_rate < 45:
            esi = min(esi, 2)
            vital_alarms.append(f"Dangerous Dysrhythmia: Pulse {vitals.pulse_rate} bpm")
        elif vitals.pulse_rate > 105 or vitals.pulse_rate < 55:
            esi = min(esi, 3)

    if vitals.temperature_f is not None:
        if vitals.temperature_f >= 104.0:
            esi = min(esi, 2)
            vital_alarms.append(f"Severe Hyperpyrexia: Temp {vitals.temperature_f}°F")
        elif vitals.temperature_f >= 101.5:
            esi = min(esi, 3)

    if vitals.pain_scale is not None and vitals.pain_scale >= 8:
        esi = min(esi, 2)
        vital_alarms.append(f"Severe Acute Pain: Score {vitals.pain_scale}/10")
        
    if is_pregnant:
        if (vitals.systolic_bp and vitals.systolic_bp >= 140) or (vitals.diastolic_bp and vitals.diastolic_bp >= 90):
            esi = min(esi, 2)
            vital_alarms.append("High-Risk Pregnancy: Potential Pre-eclampsia warning")

    return esi, vital_alarms

def generate_clinical_summary(full_name: str, age: int, gender: str, transcript: str, complaints: List[str], vitals: PatientVitals, red_flags: List[str], esi_level: int) -> Tuple[str, List[str], str]:
    differentials = []
    text_lower = transcript.lower()
    
    if any(k in text_lower for k in ["chest", "chhati", "dhardkan", "palpitation"]) or (vitals.systolic_bp and vitals.systolic_bp >= 160):
        differentials.extend(["Acute Coronary Syndrome (ACS) / Angina", "Hypertensive Urgency", "Musculoskeletal Chest Wall Strain"])
    elif any(k in text_lower for k in ["saans", "breath", "cough", "khansi"]) or (vitals.spo2 and vitals.spo2 < 94):
        differentials.extend(["Acute Exacerbation of COPD / Asthma", "Lower Respiratory Tract Infection (Pneumonia)", "Viral Bronchitis"])
    elif any(k in text_lower for k in ["bukhar", "fever", "thand", "chills"]):
        differentials.extend(["Acute Febrile Illness (Dengue / Malaria screening advised)", "Enteric Fever (Typhoid)", "Viral Upper Respiratory Tract Infection"])
    elif any(k in text_lower for k in ["pet", "abdomen", "ulti", "dast"]):
        differentials.extend(["Acute Gastroenteritis / Dehydration", "Acute Gastritis / Peptic Ulcer Disease", "Suspected Appendicitis / Cholecystitis"])
    else:
        differentials.extend(["Primary Care Evaluation Required", "Chronic Condition Follow-up", "Symptomatic Outpatient Management"])

    vital_str = f"SpO2: {vitals.spo2 or 'N/A'}% | BP: {vitals.systolic_bp or '--'}/{vitals.diastolic_bp or '--'} | Pulse: {vitals.pulse_rate or '--'} bpm | Temp: {vitals.temperature_f or '--'}°F"
    
    if esi_level in [1, 2]:
        disposition = "IMMEDIATE ATTENTION / STABILIZE & PREPARE SECONDARY REFERRAL"
        summary = (
            f"🚨 PRIORITY RED: {full_name}, {age}y {gender}. Presenting with acute distress: {', '.join(complaints)}. "
            f"Vitals: {vital_str}. Critical triggers identified: {', '.join(red_flags) if red_flags else 'Severe Vital Instability'}. "
            f"Immediate physician evaluation and resuscitation/stabilization required."
        )
    elif esi_level == 3:
        disposition = "URGENT PHC CLINICAL EVALUATION / LAB INVESTIGATIONS"
        summary = (
            f"⚠️ PRIORITY YELLOW: {full_name}, {age}y {gender}. Complaints of {', '.join(complaints)}. "
            f"Vitals: {vital_str}. Moderate clinical risk without immediate shock; requires doctor examination and basic diagnostics (CBC, Malaria RDT)."
        )
    else:
        disposition = "STANDARD OUTPATIENT CONSULTATION & MEDICINE DISPENSARY"
        summary = (
            f"🟢 PRIORITY GREEN: {full_name}, {age}y {gender}. Non-emergent presentation: {', '.join(complaints)}. "
            f"Vitals stable: {vital_str}. Suitable for routine primary outpatient consultation and prescription."
        )
        
    return summary, differentials, disposition

def perform_triage(req: TriageRequest) -> TriageAssessment:
    complaints, transcript_red_flags = analyze_spoken_transcript(req.raw_symptom_audio_transcript, req.spoken_language)
    vital_esi, vital_alarms = evaluate_vitals_guardrails(req.vitals, req.age, req.pregnancy_status)
    all_red_flags = list(set(transcript_red_flags + vital_alarms))
    
    if len(transcript_red_flags) > 0 and vital_esi > 2:
        final_esi = 2
    else:
        final_esi = vital_esi
        
    if final_esi > 3 and any(k in req.raw_symptom_audio_transcript.lower() for k in ["bukhar", "fever", "ulti", "pet"]):
        final_esi = 3

    if final_esi in [1, 2]:
        tier = TriageTier.RED
        urgency_label = "IMMEDIATE RESUSCITATION" if final_esi == 1 else "EMERGENT / HIGH RISK"
    elif final_esi == 3:
        tier = TriageTier.YELLOW
        urgency_label = "URGENT / MODERATE RISK"
    elif final_esi == 4:
        tier = TriageTier.GREEN
        urgency_label = "LESS URGENT"
    else:
        tier = TriageTier.GREEN
        urgency_label = "NON-URGENT / ROUTINE"

    summary, differentials, disposition = generate_clinical_summary(
        full_name=req.full_name,
        age=req.age,
        gender=req.gender,
        transcript=req.raw_symptom_audio_transcript,
        complaints=complaints,
        vitals=req.vitals,
        red_flags=all_red_flags,
        esi_level=final_esi
    )

    assessment = TriageAssessment(
        id=f"TRG-{uuid.uuid4().hex[:8].upper()}",
        patient_id=req.patient_id or f"PAT-{uuid.uuid4().hex[:6].upper()}",
        full_name=req.full_name,
        age=req.age,
        gender=req.gender,
        village_zone=req.village_zone,
        triage_tier=tier,
        esi_level=final_esi,
        urgency_label=urgency_label,
        chief_complaints=complaints,
        red_flag_triggers=all_red_flags,
        clinical_summary=summary,
        differential_considerations=differentials,
        vitals=req.vitals,
        recommended_disposition=disposition,
        created_at=datetime.utcnow(),
        status="WAITING"
    )
    
    return assessment
