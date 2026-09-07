import asyncio
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import reset_corridor_to_normal
from backend.triage_engine import reset_all_cargo

client = TestClient(app)

def run_tests():
    print("--- 1. Testing GET /api/corridor ---")
    res = client.get("/api/corridor")
    assert res.status_code == 200, res.text
    data = res.json()
    print(f"Nodes count: {len(data['nodes'])}, Segments count: {len(data['segments'])}")
    print(f"Initial Optimal Path: {data['optimal_route']['path_nodes']}")
    print(f"Bypass Active: {data['optimal_route']['bypass_active']}")
    assert data['optimal_route']['bypass_active'] == False, "Expected bypass not active in normal state"

    print("\n--- 2. Testing POST /api/simulation/rainfall (Heavy Rain -> HIGH-RISK -> Reroute) ---")
    res = client.post("/api/simulation/rainfall", json={"segment_id": "SEG-06", "rainfall_mm": 190.0})
    assert res.status_code == 200, res.text
    sim_data = res.json()["corridor"]
    seg6 = next(s for s in sim_data["segments"] if s["id"] == "SEG-06")
    print(f"SEG-06 State after 190mm rain: {seg6['state']}, Risk: {seg6['risk_score']}")
    print(f"New Optimal Path: {sim_data['optimal_route']['path_nodes']}")
    print(f"Bypass Active: {sim_data['optimal_route']['bypass_active']}")
    assert seg6['state'] == "HIGH-RISK", "Expected SEG-06 to be HIGH-RISK"
    assert sim_data['optimal_route']['bypass_active'] == True, "Expected bypass to activate on high-risk"

    print("\n--- 3. Testing POST /api/reports (Ground Truth Override -> BLOCKED) ---")
    res = client.post("/api/reports", json={
        "segment_id": "SEG-07",
        "hazard_type": "Landslide",
        "severity": "Severe",
        "reporter_id": "BRO Patrol Unit 12",
        "notes": "Massive rockfall blocking entire carriageway"
    })
    assert res.status_code == 200, res.text
    rpt_data = res.json()["corridor"]
    seg7 = next(s for s in rpt_data["segments"] if s["id"] == "SEG-07")
    print(f"SEG-07 State after field report: {seg7['state']}, Reason: {seg7['override_reason']}")
    assert seg7['state'] == "BLOCKED", "Expected SEG-07 to be BLOCKED"

    print("\n--- 4. Testing Cargo Priority Triage (BLOCKED -> CONSTRAINED triggers Priority Dispatch) ---")
    # Reset cargo to test dispatch
    client.post("/api/cargo/reset")
    # Transition SEG-07 to CONSTRAINED
    res = client.post("/api/segments/SEG-07/state", json={
        "state": "CONSTRAINED",
        "override_reason": "Single lane opened under BRO convoy escort"
    })
    assert res.status_code == 200, res.text
    triage_dispatch = res.json()["triage_dispatch"]
    print(f"Dispatched vehicles count: {triage_dispatch['dispatched_count']}")
    dispatched = triage_dispatch["dispatched_vehicles"]
    for v in dispatched:
        print(f"  -> Dispatched: [{v['vehicle_id']}] {v['cargo_type']} (Tier {v['priority_tier']})")
    
    # Check that priority 1 (Medicines) was dispatched before lower priority
    tiers = [v["priority_tier"] for v in dispatched]
    print(f"Dispatched Priority Tiers: {tiers}")
    assert tiers == sorted(tiers), f"Expected sorted priority order, got {tiers}"
    assert 1 in tiers, "Expected Medicine/Vaccines (Tier 1) to be dispatched first!"

    print("\n--- 5. Testing Demo Preset 'normal' ---")
    res = client.post("/api/demo/preset", json={"preset_name": "normal"})
    assert res.status_code == 200, res.text
    norm_data = res.json()["corridor"]
    assert norm_data["optimal_route"]["bypass_active"] == False

    print("\nALL BACKEND VERIFICATION CHECKS PASSED PERFECTLY!")

if __name__ == "__main__":
    run_tests()
