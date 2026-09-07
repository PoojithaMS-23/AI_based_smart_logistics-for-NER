import sys
import os
import uvicorn

# Ensure parent directory (SIH) and current directory (backend) are in sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PARENT_DIR = os.path.dirname(CURRENT_DIR)
for p in [CURRENT_DIR, PARENT_DIR]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.database import init_db
    from backend.ml_risk_model import load_risk_model
except ImportError:
    from database import init_db
    from ml_risk_model import load_risk_model

if __name__ == "__main__":
    print("==============================================================================")
    print("🚀 Initializing NH-313 Corridor Database & AI Risk Model...")
    init_db()
    load_risk_model()
    print("🌐 Starting Mountain Logistics Intelligence API on http://127.0.0.1:8000")
    print("📖 Interactive Swagger API Docs: http://127.0.0.1:8000/docs")
    print("==============================================================================")
    # Support both "backend.main:app" (if run from parent) and "main:app" (if run inside backend directory)
    app_target = "main:app" if os.getcwd() == CURRENT_DIR else "backend.main:app"
    uvicorn.run(app_target, host="127.0.0.1", port=8000, reload=True)
