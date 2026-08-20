import os
import sys

BASE_DIR = r"C:\Users\ANUP SINGH\.gemini\antigravity\scratch\arogya_triage_ai"
sys.path.insert(0, BASE_DIR)

from backend.models import TriageRequest, PatientVitals, TriageTier
from backend.triage_engine import perform_triage, evaluate_vitals_guardrails

def test_cardiac_emergency_triage():
    req = TriageRequest(
        full_name="Rameshwar Sharma",
        age=58,
        gender="Male",
        raw_symptom_audio_transcript="chhati me bahut tez dard aur saans lene me dikkat hai",
        vitals=PatientVitals(spo2=89.0, systolic_bp=178, diastolic_bp=104, pulse_rate=118, pain_scale=9)
    )
    assessment = perform_triage(req)
    assert assessment.triage_tier == TriageTier.RED, f"Expected RED tier, got {assessment.triage_tier}"
    assert assessment.esi_level in [1, 2], f"Expected ESI 1 or 2, got {assessment.esi_level}"
    assert len(assessment.red_flag_triggers) > 0, "Expected red flag triggers"
    print("[PASS] Test 1: Severe Cardiac Emergency correctly triaged to RED (ESI Level 1)")

def test_high_fever_urgent_triage():
    req = TriageRequest(
        full_name="Sunita Devi",
        age=32,
        gender="Female",
        raw_symptom_audio_transcript="3 din se tez bukhar aur bar bar ulti aa rahi hai",
        vitals=PatientVitals(spo2=97.0, systolic_bp=108, diastolic_bp=72, pulse_rate=102, temperature_f=102.8, pain_scale=5)
    )
    assessment = perform_triage(req)
    assert assessment.triage_tier == TriageTier.YELLOW, f"Expected YELLOW tier, got {assessment.triage_tier}"
    assert assessment.esi_level == 3, f"Expected ESI 3, got {assessment.esi_level}"
    print("[PASS] Test 2: Febrile Illness correctly triaged to YELLOW (ESI Level 3)")

def test_routine_refill_green_triage():
    req = TriageRequest(
        full_name="Kishan Lal",
        age=45,
        gender="Male",
        raw_symptom_audio_transcript="ghutno me halka dard hai aur bp ki regular dawai chahiye",
        vitals=PatientVitals(spo2=99.0, systolic_bp=128, diastolic_bp=82, pulse_rate=74, temperature_f=98.2, pain_scale=2)
    )
    assessment = perform_triage(req)
    assert assessment.triage_tier == TriageTier.GREEN, f"Expected GREEN tier, got {assessment.triage_tier}"
    assert assessment.esi_level in [4, 5], f"Expected ESI 4 or 5, got {assessment.esi_level}"
    print("[PASS] Test 3: Routine Chronic Care correctly triaged to GREEN (ESI Level 4/5)")

if __name__ == "__main__":
    print("=========================================================================")
    print("  RUNNING AROGYATRIAGE AI CLINICAL TRIAGE TEST SUITE")
    print("=========================================================================")
    test_cardiac_emergency_triage()
    test_high_fever_urgent_triage()
    test_routine_refill_green_triage()
    print("=========================================================================")
    print("  ALL CLINICAL TRIAGE TESTS PASSED WITH 100% ACCURACY!")
    print("=========================================================================")
