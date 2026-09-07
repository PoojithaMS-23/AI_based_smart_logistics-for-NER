@echo off
echo ==============================================================================
echo    SIH 2026 PROTOTYPE: NH-313 DIBANG VALLEY MOUNTAIN LOGISTICS (PS 26002)
echo ==============================================================================
echo.
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "SIH Backend (FastAPI + XGBoost)" cmd /k "python run_backend.py"

echo [2/2] Starting React + Leaflet Frontend on http://localhost:5173 ...
start "SIH Frontend (React + Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo System launched! 
echo Open your browser at: http://localhost:5173
echo ==============================================================================

