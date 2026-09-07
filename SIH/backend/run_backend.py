import sys
import os

# Set root directory to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.database import init_db
from backend.ml_risk_model import load_risk_model
import uvicorn

if __name__ == "__main__":
    print("==============================================================================")
    print("🚀 Initializing NH-313 Corridor Database & AI Risk Model...")
    init_db()
    load_risk_model()
    print("🌐 Starting Mountain Logistics Intelligence API on http://127.0.0.1:8000")
    print("📖 Interactive Swagger API Docs: http://127.0.0.1:8000/docs")
    print("==============================================================================")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)

