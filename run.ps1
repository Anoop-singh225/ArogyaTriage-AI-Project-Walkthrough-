Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host "  AROGYATRIAGE AI — RURAL PHC CLINICAL PRIORITIZATION PLATFORM" -ForegroundColor White
Write-Host "  OMNIKON National Hackathon 2026 • Omni_BioTech_3" -ForegroundColor Yellow
Write-Host "=========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting FastAPI Backend Server on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process "http://127.0.0.1:8000"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
