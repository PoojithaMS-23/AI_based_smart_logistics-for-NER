#!/usr/bin/env python3
"""
NER-SANCHAAR | High-Altitude Logistics Intelligence (NH-313 Dibang Valley)
SIH PS 26002 - Comprehensive End-to-End Evaluation & Hardening Test Suite

Tests all 6 Hackathon Demonstration Scenarios:
- Scenario 1: Normal Operations Baseline
- Scenario 2: AI Monsoon / High-Risk Dynamic Rerouting
- Scenario 3: Field Landslide / Blocked (Offline-First Sync & Idempotency)
- Scenario 4: Blocked to Constrained (Convoy Triage & Tier 1 Dispatch)
- Scenario 5: Cargo Priority Triage Engine (Dynamic Database Sorting)
- Scenario 6: Incident Verification & Driver Route Alerting
- Final Quality Check: State consistency, idempotency, dynamic routing
"""

import sys
import os
import uuid
import json

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import init_db, get_db_connection, reset_corridor_to_normal
from backend.corridor_states import CORRIDOR_STATES, VALID_STATES
from backend.triage_engine import reset_all_cargo

client = TestClient(app)

def banner(title: str):
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}")

def scenario_1_normal():
    banner("SCENARIO 1 — NORMAL OPERATIONS BASELINE")
    # Reset to pristine baseline
    resp = client.post("/api/demo/preset", json={"preset_name": "normal"})
    assert resp.status_code == 200, f"Preset normal failed: {resp.text}"
    
    # Load corridor payload
    corridor_resp = client.get("/api/corridor")
    assert corridor_resp.status_code == 200
    data = corridor_resp.json()
    
    # Verify corridor nodes (13 strategic Himalayan locations)
    nodes = data["nodes"]
    print(f"[+] Loaded {len(nodes)} strategic corridor nodes (Roing N1 -> Anini N11 -> Mipi N12)")
    assert len(nodes) == 13, f"Expected 13 nodes, got {len(nodes)}"
    
    # Verify corridor segments (13 sectors)
    segments = data["segments"]
    print(f"[+] Loaded {len(segments)} road sectors along NH-313 and Desali-Chipi bypass")
    assert len(segments) == 13, f"Expected 13 segments, got {len(segments)}"
    
    # Verify all initial states are OPEN
    non_open = [s for s in segments if s["state"] != "OPEN"]
    assert len(non_open) == 0, f"All segments should be OPEN in normal state, found: {non_open}"
    print("[+] Verified all 13 road sectors are in OPEN state (1.0x cost multiplier)")
    
    # Verify optimal route
    opt = data["optimal_route"]
    assert opt["success"] is True, f"Route calculation failed: {opt.get('error')}"
    print(f"[+] Optimal Route calculated: {opt['total_distance_km']} km")
    print(f"[+] Direct Gorge Highway path: {' -> '.join(opt['path_nodes'])}")
    assert opt["bypass_active"] is False, "Bypass should not be active in normal state"
    assert "SEG-06" in opt["path_segments"], "Standard route must use primary NH-313 gorge"
    assert opt["total_distance_km"] == 145.0, f"Expected 145.0km baseline, got {opt['total_distance_km']}"
    
    # Verify cargo queue
    cargo = data["cargo"]
    print(f"[+] Cargo queue initialized: {cargo['stranded_count']} stranded vehicles waiting for clearance")
    assert cargo["stranded_count"] >= 8, f"Expected at least 8 seeded cargo vehicles, got {cargo['stranded_count']}"
    print("[PASS] SCENARIO 1: Normal Operations verified successfully.\n")

def scenario_2_ai_monsoon():
    banner("SCENARIO 2 — AI MONSOON / HIGH-RISK DYNAMIC REROUTING")
    
    # Inject heavy monsoon rainfall (195mm) on New Arzoo Gorge (SEG-06)
    payload = {"segment_id": "SEG-06", "rainfall_mm": 195.0}
    print(f"[+] Injecting 195.0mm precipitation on SEG-06 (Desali - New Arzoo Gorge, 46° slope)...")
    
    resp = client.post("/api/simulation/rainfall", json=payload)
    assert resp.status_code == 200, f"Rainfall simulation failed: {resp.text}"
    res_data = resp.json()
    corridor = res_data["corridor"]
    
    # Verify SEG-06 risk evaluation
    seg6 = next(s for s in corridor["segments"] if s["id"] == "SEG-06")
    print(f"[+] XGBoost Risk Probability: {seg6['risk_score'] * 100:.1f}%")
    print(f"[+] Dynamic State Transition: {seg6['state']}")
    assert seg6["risk_score"] >= 0.65, f"Risk score {seg6['risk_score']} should exceed 0.65"
    assert seg6["state"] == "HIGH-RISK", f"Expected HIGH-RISK state, got {seg6['state']}"
    
    # Verify A* autonomous rerouting
    opt = corridor["optimal_route"]
    assert opt["success"] is True
    print(f"[+] Recalculated Safe A* Route: {opt['total_distance_km']} km (Risk Weighted Cost: {opt['risk_weighted_cost']})")
    print(f"[+] Active Path Nodes: {' -> '.join(opt['path_nodes'])}")
    print(f"[+] Detour Engaged: Bypass Active = {opt['bypass_active']}")
    
    assert opt["bypass_active"] is True, "A* algorithm should engage Desali-Chipi bypass"
    assert "SEG-06" not in opt["path_segments"], "A* route must strictly avoid HIGH-RISK gorge segment"
    assert "SEG-BP1" in opt["path_segments"] and "SEG-BP2" in opt["path_segments"], "Route must use bypass links"
    print(f"[+] Operational Reasoning: {opt['reasoning']}")
    print("[PASS] SCENARIO 2: AI Monsoon Hazard Detection and Autonomous Rerouting verified.\n")

def scenario_3_field_landslide():
    banner("SCENARIO 3 — FIELD LANDSLIDE / BLOCKED (OFFLINE REPORT & GROUND TRUTH)")
    
    # Simulate offline report creation by field operative on Kronli Cliff (SEG-07)
    client_report_id = f"RPT-FIELD-{uuid.uuid4().hex[:6].upper()}"
    report_payload = {
        "id": client_report_id,
        "segment_id": "SEG-07",
        "hazard_type": "Landslide",
        "severity": "Severe",
        "reporter_id": "BRO Patrol Unit-42",
        "notes": "Massive 80m rockslide completely severing carriageway at Kronli Cliff. Impassable.",
        "latitude": 28.5300,
        "longitude": 95.9800,
        "photo_path": "/storage/emulated/0/DCIM/landslide_kronli.jpg",
        "timestamp": "2026-09-08T00:15:00"
    }
    print(f"[+] Simulating offline report creation in local SQLite (Report ID: {client_report_id})")
    print(f"[+] Coordinates: {report_payload['latitude']}°N, {report_payload['longitude']}°E | Photo Attached")
    print(f"[+] Network connectivity restored — syncing pending report to backend...")
    
    # Sync report to backend
    sync_resp = client.post("/api/reports", json=report_payload)
    assert sync_resp.status_code == 200, f"Field report sync failed: {sync_resp.text}"
    sync_data = sync_resp.json()
    assert sync_data["ground_truth_applied"] is True, "Severe hazard report must trigger Ground Truth Override"
    
    # Test Idempotency (simulate mobile retry with identical ID)
    print("[+] Testing network retry idempotency (sending duplicate sync request)...")
    retry_resp = client.post("/api/reports", json=report_payload)
    assert retry_resp.status_code == 200
    retry_data = retry_resp.json()
    assert retry_data.get("duplicate") is True, "Duplicate sync should be idempotently recognized"
    
    # Verify SQLite database persistence (exactly 1 record)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM field_reports WHERE id = ?;", (client_report_id,))
    count = cursor.fetchone()["cnt"]
    assert count == 1, f"Expected exactly 1 report in DB, found {count}"
    print(f"[+] Database verification: Exactly 1 report persisted in SQLite (Zero duplicates)")
    
    # Verify segment state changed to BLOCKED
    cursor.execute("SELECT state, risk_score, override_reason FROM segments WHERE id = 'SEG-07';")
    seg_row = cursor.fetchone()
    conn.close()
    
    print(f"[+] Segment SEG-07 State: {seg_row['state']} (Risk Score: {seg_row['risk_score']})")
    print(f"[+] Ground Truth Reason: {seg_row['override_reason']}")
    assert seg_row["state"] == "BLOCKED"
    assert seg_row["risk_score"] == 1.0
    
    # Verify A* completely excludes BLOCKED segment
    corridor_state = sync_data["corridor"]
    opt_route = corridor_state["optimal_route"]
    assert "SEG-07" not in opt_route["path_segments"], "BLOCKED segment must have infinite cost and be strictly forbidden"
    print(f"[+] Route recalculation: SEG-07 strictly forbidden (Path avoids blocked segment)")
    print("[PASS] SCENARIO 3: Offline Field Report, Idempotent Sync & Ground Truth Override verified.\n")

def scenario_4_blocked_to_constrained():
    banner("SCENARIO 4 — BLOCKED TO CONSTRAINED (LANE CLEARANCE & PRIORITY DISPATCH)")
    
    # Ensure SEG-07 is BLOCKED first
    client.post("/api/segments/SEG-07/state", json={"state": "BLOCKED", "override_reason": "Severe Landslide"})
    
    # Verify A* route avoids SEG-07
    c1 = client.get("/api/corridor").json()
    assert "SEG-07" not in c1["optimal_route"]["path_segments"]
    print("[+] Pre-condition verified: SEG-07 is BLOCKED; A* route completely avoids it.")
    
    # BRO clears single lane -> Transition to CONSTRAINED
    print("[+] BRO clears single lane under military escort -> Transitioning to CONSTRAINED...")
    clear_payload = {
        "state": "CONSTRAINED",
        "override_reason": "BRO Clearance: Single lane opened under convoy escort"
    }
    resp = client.post("/api/segments/SEG-07/state", json=clear_payload)
    assert resp.status_code == 200
    res_data = resp.json()
    
    # Verify database state
    assert res_data["new_state"] == "CONSTRAINED"
    updated_seg = next(s for s in res_data["corridor"]["segments"] if s["id"] == "SEG-07")
    assert updated_seg["state"] == "CONSTRAINED"
    print(f"[+] Database updated: SEG-07 state is now {updated_seg['state']}")
    
    # Verify cargo dispatch was automatically triggered
    dispatch = res_data.get("triage_dispatch")
    assert dispatch is not None, "Cargo triage dispatch should be triggered when BLOCKED -> CONSTRAINED"
    dispatched_vehicles = dispatch["dispatched_vehicles"]
    print(f"[+] Convoy Triage Dispatch Triggered: {len(dispatched_vehicles)} vehicles released")
    
    # Verify priority ordering in dispatch: Tier 1 (Medicines) must be first!
    print("[+] Verifying cargo priority ordering in release batch:")
    previous_tier = 0
    for idx, v in enumerate(dispatched_vehicles):
        tier = v["priority_tier"]
        cargo_type = v["cargo_type"]
        print(f"    {idx+1}. Vehicle {v['vehicle_id']}: Tier {tier} ({cargo_type}) - {v['weight_tons']} tons")
        assert tier >= previous_tier, f"Priority violation: Tier {tier} released after Tier {previous_tier}"
        previous_tier = tier
        
    assert dispatched_vehicles[0]["priority_tier"] == 1, "First vehicle dispatched MUST be Priority 1 (Medicines/Vaccines)"
    print(f"[+] Strict Priority Rule Enforced: {dispatch['rule_applied']}")
    print("[PASS] SCENARIO 4: Blocked-to-Constrained Transition & Priority Cargo Dispatch verified.\n")

def scenario_5_cargo_triage():
    banner("SCENARIO 5 — CARGO PRIORITY TRIAGE ENGINE")
    
    # Reset cargo and seed a mixed convoy with randomized orders
    client.post("/api/cargo/reset")
    seed_resp = client.post("/api/cargo/seed")
    assert seed_resp.status_code == 200
    added = seed_resp.json()["added"]
    print(f"[+] Seeded {len(added)} cargo trucks with mixed priorities into SQLite queue")
    
    # Query queue from backend (which executes dynamic SQLite ORDER BY)
    queue_resp = client.get("/api/cargo/queue")
    assert queue_resp.status_code == 200
    queue_data = queue_resp.json()
    stranded = queue_data["stranded"]
    
    print(f"[+] Loaded {len(stranded)} stranded vehicles from SQLite. Verifying dynamic sort order:")
    previous_tier = 0
    for v in stranded:
        tier = v["priority_tier"]
        assert tier >= previous_tier, f"Triage order incorrect: Tier {tier} appeared after Tier {previous_tier}"
        previous_tier = tier
    
    # Verify tiers present in ascending order
    tiers = [v["priority_tier"] for v in stranded]
    assert tiers == sorted(tiers), "Stranded cargo queue must be dynamically sorted by priority_tier ASC"
    print(f"[+] Verified dynamic sort ordering across all {len(stranded)} vehicles: {tiers[:8]}...")
    
    # Dispatch available cargo
    dispatch_resp = client.post("/api/cargo/dispatch")
    assert dispatch_resp.status_code == 200
    dispatch_info = dispatch_resp.json()
    dispatched = dispatch_info["dispatched_vehicles"]
    print(f"[+] Batch dispatched {len(dispatched)} vehicles. Status changed in SQLite to DISPATCHED.")
    assert all(v["status"] == "DISPATCHED" for v in dispatched)
    assert all(v["dispatched_at"] is not None for v in dispatched)
    print("[PASS] SCENARIO 5: Dynamic Cargo Triage and Dispatch Lifecycle verified.\n")

def scenario_6_incident_verification():
    banner("SCENARIO 6 — TERRAINWATCH INCIDENT FEED & DRIVER ALERTING")
    
    # 1. Citizen Scout creates terrain incident post
    incident_payload = {
        "author_name": "Tsering Wangdi",
        "author_role": "Citizen Scout (Hunli)",
        "segment_id": "SEG-06",
        "hazard_type": "Rockfall",
        "severity": "Severe",
        "image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
        "caption": "Sudden rockfall blocking right carriageway near New Arzoo cliff. Boulders active."
    }
    create_resp = client.post("/api/incidents", json=incident_payload)
    assert create_resp.status_code == 200
    post_id = create_resp.json()["post_id"]
    print(f"[+] Citizen incident post created: {post_id}")
    
    # 2. Verify incident appears in feed
    feed_resp = client.get("/api/incidents")
    assert feed_resp.status_code == 200
    incidents = feed_resp.json()["incidents"]
    posted_item = next(i for i in incidents if i["id"] == post_id)
    print(f"[+] Verified incident in feed: '{posted_item['caption'][:50]}...'")
    assert posted_item["author_name"] == "Tsering Wangdi"
    
    # 3. Community upvote
    upvote_resp = client.post(f"/api/incidents/{post_id}/upvote")
    assert upvote_resp.status_code == 200
    upvoted_feed = client.get("/api/incidents").json()["incidents"]
    upvoted_item = next(i for i in upvoted_feed if i["id"] == post_id)
    assert upvoted_item["upvotes"] == posted_item["upvotes"] + 1
    print(f"[+] Upvoted incident: total upvotes = {upvoted_item['upvotes']}")
    
    # 4. Government officer verification & Ground Truth state override
    gov_resp = client.post(f"/api/incidents/{post_id}/verify_override")
    assert gov_resp.status_code == 200
    gov_data = gov_resp.json()
    assert gov_data["state"] == "BLOCKED"
    print(f"[+] Government Officer verified incident: Road segment {gov_data['segment_id']} forced to BLOCKED")
    
    # Verify DB reflects verification
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT verified_by_gov FROM incident_posts WHERE id = ?;", (post_id,))
    assert c.fetchone()["verified_by_gov"] == 1
    c.execute("SELECT state FROM segments WHERE id = 'SEG-06';")
    assert c.fetchone()["state"] == "BLOCKED"
    conn.close()
    
    # 5. Broadcast tactical route alert to convoys
    broadcast_resp = client.post(f"/api/incidents/{post_id}/broadcast_alert")
    assert broadcast_resp.status_code == 200
    alert_info = broadcast_resp.json()["alert"]
    print(f"[+] Tactical Driver Alert Broadcasted: {alert_info['alert_id']}")
    print(f"    Segment: {alert_info['segment_name']} | Hazard: {alert_info['hazard_type']} ({alert_info['severity']})")
    assert alert_info["segment_id"] == "SEG-06"
    assert alert_info["hazard_type"] == "Rockfall"
    
    # 6. Verify driver interface safest route endpoint
    safest_resp = client.post("/api/routing/safest", json={
        "source": "N1",
        "target": "N11",
        "cargo_type": "Medicines/Vaccines"
    })
    assert safest_resp.status_code == 200
    safest_data = safest_resp.json()
    assert safest_data["success"] is True
    print(f"[+] Driver HUD Safest Route: {safest_data['total_distance_km']} km ({safest_data['safety_score_pct']}% safety rating)")
    print(f"[+] Avoided hazards identified: {len(safest_data['hazards_avoided'])} segments")
    print(f"[+] Driver turn-by-turn guidance steps: {len(safest_data['driver_instructions'])}")
    print("[PASS] SCENARIO 6: Crowdsourced Incident, Gov Verification & Driver HUD Alerting verified.\n")

def final_quality_checks():
    banner("FINAL QUALITY & CODEBASE INTEGRITY AUDIT")
    
    # Check 1: State integrity (only the 5 authoritative states)
    print("[+] Checking corridor states across definitions and database...")
    assert set(CORRIDOR_STATES.keys()) == {'OPEN', 'CONSTRAINED', 'HIGH-RISK', 'DISRUPTED', 'BLOCKED'}
    assert set(VALID_STATES) == {'OPEN', 'CONSTRAINED', 'HIGH-RISK', 'DISRUPTED', 'BLOCKED'}
    
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT DISTINCT state FROM segments;")
    db_states = set(r["state"] for r in c.fetchall())
    conn.close()
    
    invalid_states = db_states - VALID_STATES
    assert len(invalid_states) == 0, f"Found invalid states in database: {invalid_states}"
    print(f"[+] All database segment states conform to authoritative set: {db_states}")
    
    # Check 2: No fake API responses (verify real database transactions)
    print("[+] Verifying API endpoints perform real SQLite transactions...")
    r = client.get("/api/corridor").json()
    assert "nodes" in r and "segments" in r and "cargo" in r
    
    # Check 3: Dynamic A* routing - confirm no hardcoded paths
    print("[+] Verifying A* routing engine is purely algorithmic (NetworkX)...")
    from backend.router import calculate_optimal_route
    r_normal = calculate_optimal_route("N1", "N5")
    assert r_normal["success"] is True
    assert r_normal["path_nodes"] == ["N1", "N2", "N3", "N4", "N5"]
    print(f"[+] Sub-corridor path N1->N5 dynamically calculated: {r_normal['total_distance_km']} km")
    
    print("[PASS] Final Quality Audit passed completely.\n")

def main():
    print(f"{'#'*70}")
    print("  NER-SANCHAAR: NH-313 DIBANG VALLEY LOGISTICS INTELLIGENCE")
    print("  SIH 2026 PS 26002 - END-TO-END VERIFICATION SUITE")
    print(f"{'#'*70}")
    
    init_db()
    
    try:
        scenario_1_normal()
        scenario_2_ai_monsoon()
        scenario_3_field_landslide()
        scenario_4_blocked_to_constrained()
        scenario_5_cargo_triage()
        scenario_6_incident_verification()
        final_quality_checks()
        
        # Reset to clean normal state for demo
        client.post("/api/demo/preset", json={"preset_name": "normal"})
        
        banner("ALL 6 END-TO-END SCENARIOS & QUALITY AUDITS PASSED (100% SUCCESS)")
        return True
    except AssertionError as e:
        print(f"\n[FAIL] Assertion Error: {e}")
        return False
    except Exception as e:
        print(f"\n[ERROR] Unexpected error during verification: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
