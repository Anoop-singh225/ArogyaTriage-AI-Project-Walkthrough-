# ArogyaTriage AI 🩺⚡
### AI-Powered Multilingual Triage & Clinical Prioritization Ecosystem for Primary Health Centres
**OMNIKON National Hackathon 2026 • Problem ID: `Omni_BioTech_3` • Domain: BioTech & HealthTech**

---

## 🌟 Overview
In rural Primary Health Centres (PHCs), a single medical officer often manages over 100 patients daily. Under a standard first-come-first-served system, critical emergency cases (e.g., silent hypoxia, acute coronary syndrome, pre-eclampsia) often deteriorate while waiting in unorganized queues.

**ArogyaTriage AI** bridges this gap by empowering frontline ASHA workers and clinic staff with a voice-first, multilingual triage assistant. By combining **deterministic clinical safety guardrails** with **Emergency Severity Index (ESI v4)** scoring and clinical NLP, ArogyaTriage dynamically organizes the doctor's queue by medical urgency (**Red: Immediate**, **Yellow: Urgent**, **Green: Stable**), cutting doctor consultation prep time by 60% and preventing diagnostic delays.

---

## 🚀 Key Features

1. **🎙️ Multilingual Indic Voice Intake**:
   - Web Speech API + Indic NLP for capturing patient complaints in Hindi and spoken dialects.
   - Quick preset demo buttons for Cardiac Emergencies, Febrile Outbreaks, and Routine Refills.

2. **🛡️ Dual-Engine Safety Guardrails (Deterministic + AI)**:
   - Hardcoded physiological red-flag filters strictly override AI for abnormal vitals (e.g., SpO2 < 90%, SBP > 180 mmHg).
   - Generates 5-second synthesized doctor pre-consultation summaries with differential considerations.

3. **👨‍⚕️ Doctor's Real-Time Prioritization Dashboard**:
   - Live WebSockets dynamic queue reordering.
   - Visual and audio emergency alerts for inbound Red-tier cases.
   - 1-click clinical notes, prescription orders, and tertiary referral routing.

4. **📡 Outbreak Radar & PHC Analytics**:
   - Real-time GIS village cluster tracking for Dengue/Malaria/Respiratory surges.
   - Key operational metrics (time saved, triage ratio, tertiary referral reduction).

5. **🌐 ABDM / FHIR & Offline Mesh Sync**:
   - Standardized FHIR v4.0.1 JSON bundle generator for Ayushman Bharat Digital Mission.
   - Offline-first SQLite local buffer simulation for zero-connectivity village sub-centres.

---

## 💻 Tech Stack
- **Frontend**: HTML5, Tailwind CSS, Lucide Icons, Chart.js, Web Speech API.
- **Backend**: FastAPI (Python Async Runtime), WebSockets, Pydantic v2.
- **Database**: SQLite with auto-seeded rural clinical test cases.
- **Standards**: Emergency Severity Index (ESI v4), Ayushman Bharat ABDM / FHIR v4.

---

## 🏃 Quickstart Guide

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the Application
Double-click `run.bat` or run:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser at: **`http://127.0.0.1:8000`**

### 3. Run Clinical Test Suite
```bash
python tests/test_triage.py
```
