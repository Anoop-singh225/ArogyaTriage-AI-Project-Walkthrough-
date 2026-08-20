from fastapi import APIRouter
from typing import List, Dict, Any
from ..database import get_live_queue, update_patient_status, save_doctor_note
from ..models import DoctorConsultationNote

router = APIRouter(prefix="/api/queue", tags=["Doctor Queue"])

@router.get("/live")
async def get_queue():
    return get_live_queue()

@router.post("/call/{assessment_id}")
async def call_patient(assessment_id: str):
    update_patient_status(assessment_id, "IN_CONSULTATION")
    return {"status": "success", "message": f"Patient {assessment_id} called"}

@router.post("/consultation/save")
async def save_consultation(note: DoctorConsultationNote):
    save_doctor_note(note)
    return {"status": "success", "message": "Consultation saved"}
