from fastapi import APIRouter
from ..models import TriageRequest, TriageAssessment
from ..triage_engine import perform_triage
from ..database import save_assessment

router = APIRouter(prefix="/api/triage", tags=["Triage Assessment"])

@router.post("/assess", response_model=TriageAssessment)
async def assess_patient(req: TriageRequest):
    assessment = perform_triage(req)
    save_assessment(assessment)
    return assessment
