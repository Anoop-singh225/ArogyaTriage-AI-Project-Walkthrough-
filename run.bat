@echo off
title ArogyaTriage AI — Rural PHC Clinical Prioritization Platform
echo =========================================================================
echo   AROGYATRIAGE AI — RURAL PHC CLINICAL PRIORITIZATION PLATFORM
echo   OMNIKON National Hackathon 2026 • Omni_BioTech_3
echo =========================================================================
echo.
echo Starting FastAPI Backend Server on http://127.0.0.1:8000 ...
start http://127.0.0.1:8000
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
