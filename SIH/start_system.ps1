Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host "   SIH 2026 PROTOTYPE: NH-313 DIBANG VALLEY MOUNTAIN LOGISTICS (PS 26002)" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python run_backend.py"

Write-Host "[2/2] Starting React + Leaflet Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host ""
Write-Host "System launched! Open your browser at http://localhost:5173" -ForegroundColor Cyan

