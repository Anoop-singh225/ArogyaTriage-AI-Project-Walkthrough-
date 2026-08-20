from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from ..models import TriageRequest, TriageAssessment
from ..triage_engine import perform_triage, answer_health_query
from ..database import save_assessment

router = APIRouter(prefix="/api/triage", tags=["Triage Assessment"])

class HealthQueryRequest(BaseModel):
    query: str

@router.post("/assess", response_model=TriageAssessment)
async def assess_patient(req: TriageRequest):
    assessment = perform_triage(req)
    save_assessment(assessment)
    return assessment

@router.post("/ask")
async def ask_health_query(req: HealthQueryRequest):
    return answer_health_query(req.query)
