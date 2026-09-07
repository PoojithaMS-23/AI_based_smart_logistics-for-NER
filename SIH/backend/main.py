import os
import sys
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import (
    init_db,
    get_db_connection,
    reset_corridor_to_normal
)
from ml_risk_model import predict_segment_risk, load_risk_model
from router import calculate_optimal_route, get_safest_ai_route
from triage_engine import (
    get_all_cargo,
    add_cargo_vehicle,
    seed_mixed_convoy,
    dispatch_on_lane_cleared,
    reset_all_cargo
)
from websocket_manager import ws_manager

app = FastAPI(
    title="NER-SANCHAAR | High-Altitude Logistics & Hazard Portal",
    description="Government of India & BRO Mountain Corridor Intelligence (NH-313 Dibang Valley)",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()
    load_risk_model()

# ==================== DATA MODELS ====================

class RainfallSimulationRequest(BaseModel):
    segment_id: Optional[str] = None
    rainfall_mm: float

class FieldReportRequest(BaseModel):
    segment_id: str
    hazard_type: str
    severity: str
    reporter_id: str = "BRO Unit-42 (Dibang)"
    notes: Optional[str] = "Immediate tactical observation from field patrol"

class SegmentStateUpdateRequest(BaseModel):
    state: str
    override_reason: Optional[str] = None

class AddCargoRequest(BaseModel):
    cargo_type: str
    vehicle_id: Optional[str] = None
    weight_tons: float = 8.0
    stranded_at: str = "Hunli Sub-division"
    destination: str = "Anini District HQ"

class DemoPresetRequest(BaseModel):
    preset_name: str

# NEW: NER-SANCHAAR Models
class IncidentCreateRequest(BaseModel):
    author_name: str
    author_role: str = "Citizen Scout"
    segment_id: str
    hazard_type: str
    severity: str
    image_url: str
    caption: str

class TransportScheduleRequest(BaseModel):
    driver_name: str
    driver_phone: str
    vehicle_number: str
    cargo_type: str
    cargo_details: str
    weight_tons: float = 5.0
    source_hub: str = "Roing Base Depot"
    destination_hub: str = "Anini District Hospital"
    scheduled_departure: str = "Today, 07:00 hrs"

class ConfirmReceiptRequest(BaseModel):
    receiver_officer_id: str = "OFFICER-ANINI-881"
    receiver_notes: str = "Consignment received, seals inspected and verified intact."

class SafestRouteRequest(BaseModel):
    source: str = "N1"
    target: str = "N11"
    cargo_type: str = "Medicines/Vaccines"

# ==================== HELPER FUNCTIONS ====================

def get_corridor_payload() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM nodes ORDER BY id ASC;")
    nodes = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM segments ORDER BY id ASC;")
    segments = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM field_reports ORDER BY created_at DESC LIMIT 15;")
    reports = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM incident_posts ORDER BY created_at DESC LIMIT 20;")
    incidents = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM scheduled_transports ORDER BY created_at DESC LIMIT 20;")
    transports = [dict(r) for r in cursor.fetchall()]
    conn.close()

    optimal_route = calculate_optimal_route(source="N1", target="N11")
    safest_route_details = get_safest_ai_route(source="N1", target="N11")
    cargo_data = get_all_cargo()

    return {
        "corridor_name": "NH-313 Dibang Valley Corridor (Roing - Hunli - Anini)",
        "nodes": nodes,
        "segments": segments,
        "optimal_route": optimal_route,
        "safest_ai_route": safest_route_details,
        "recent_reports": reports,
        "cargo": cargo_data,
        "incidents": incidents,
        "transports": transports
    }

# ==================== REST ENDPOINTS ====================

@app.get("/api/corridor")
def get_corridor():
    return get_corridor_payload()

@app.post("/api/simulation/rainfall")
async def simulate_rainfall(payload: RainfallSimulationRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    if payload.segment_id:
        cursor.execute("SELECT * FROM segments WHERE id = ?;", (payload.segment_id,))
        target_segments = [dict(r) for r in cursor.fetchall()]
    else:
        cursor.execute("SELECT * FROM segments WHERE slope_deg >= 32.0;")
        target_segments = [dict(r) for r in cursor.fetchall()]

    updated_ids = []
    for seg in target_segments:
        if seg["override_reason"] and "Ground Truth" in seg["override_reason"]:
            continue

        risk_prob, predicted_state = predict_segment_risk(
            rainfall_mm=payload.rainfall_mm,
            slope_deg=seg["slope_deg"],
            susceptibility=seg["susceptibility"]
        )

        cursor.execute("""
            UPDATE segments 
            SET rainfall_mm = ?,
                risk_score = ?,
                state = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (payload.rainfall_mm, risk_prob, predicted_state, seg["id"]))
        updated_ids.append(seg["id"])

    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {
        "success": True,
        "rainfall_mm": payload.rainfall_mm,
        "updated_segments": updated_ids,
        "corridor": corridor_state
    }

@app.post("/api/reports")
async def submit_field_report(payload: FieldReportRequest):
    report_id = f"RPT-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO field_reports (id, segment_id, hazard_type, severity, reporter_id, notes)
        VALUES (?, ?, ?, ?, ?, ?);
    """, (report_id, payload.segment_id, payload.hazard_type, payload.severity, payload.reporter_id, payload.notes))

    is_severe_hazard = payload.hazard_type in ["Landslide", "Blockade", "Flood"] or payload.severity in ["Severe", "Complete Blockage"]
    
    if is_severe_hazard:
        override_reason = f"Ground Truth Override: {payload.hazard_type} ({payload.severity}) reported by {payload.reporter_id}"
        cursor.execute("""
            UPDATE segments 
            SET state = 'BLOCKED',
                risk_score = 1.0,
                override_reason = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (override_reason, payload.segment_id))
    elif payload.severity in ["Medium", "Constrained"]:
        override_reason = f"Field Advisory: {payload.hazard_type} reported by {payload.reporter_id}"
        cursor.execute("""
            UPDATE segments 
            SET state = 'CONSTRAINED',
                risk_score = 0.55,
                override_reason = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?;
        """, (override_reason, payload.segment_id))

    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("field_report_synced", {
        "report_id": report_id,
        "ground_truth_applied": is_severe_hazard,
        "corridor": corridor_state
    })

    return {
        "success": True,
        "report_id": report_id,
        "ground_truth_applied": is_severe_hazard,
        "corridor": corridor_state
    }

@app.post("/api/segments/{segment_id}/state")
async def update_segment_state(segment_id: str, payload: SegmentStateUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT state FROM segments WHERE id = ?;", (segment_id,))
    prev_row = cursor.fetchone()
    if not prev_row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Segment {segment_id} not found")

    prev_state = prev_row["state"]
    new_state = payload.state.upper()

    cursor.execute("""
        UPDATE segments 
        SET state = ?,
            override_reason = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = ?;
    """, (new_state, payload.override_reason, segment_id))
    conn.commit()
    conn.close()

    triage_dispatch = None
    if prev_state == "BLOCKED" and new_state == "CONSTRAINED":
        triage_dispatch = dispatch_on_lane_cleared(batch_size=4)

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", {
        "corridor": corridor_state,
        "triage_dispatch": triage_dispatch
    })

    return {
        "success": True,
        "segment_id": segment_id,
        "previous_state": prev_state,
        "new_state": new_state,
        "triage_dispatch": triage_dispatch,
        "corridor": corridor_state
    }

# ==================== CARGO & TRIAGE ENDPOINTS ====================

@app.get("/api/cargo/queue")
def list_cargo():
    return get_all_cargo()

@app.post("/api/cargo/seed")
async def seed_cargo():
    added = seed_mixed_convoy(count=6)
    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "added": added, "cargo": get_all_cargo()}

@app.post("/api/cargo/dispatch")
async def manual_dispatch():
    res = dispatch_on_lane_cleared(batch_size=4)
    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return res

@app.post("/api/cargo/reset")
async def reset_cargo():
    reset_all_cargo()
    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "cargo": get_all_cargo()}

# ==================== NEW: INCIDENTS & TERRAINWATCH FEED ====================

@app.get("/api/incidents")
def list_incidents():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incident_posts ORDER BY created_at DESC;")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"incidents": rows}

@app.post("/api/incidents")
async def create_incident(payload: IncidentCreateRequest):
    post_id = f"POST-{uuid.uuid4().hex[:6].upper()}"
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM segments WHERE id = ?;", (payload.segment_id,))
    seg_row = cursor.fetchone()
    seg_name = seg_row["name"] if seg_row else payload.segment_id

    cursor.execute("""
        INSERT INTO incident_posts (id, author_name, author_role, segment_id, segment_name, hazard_type, severity, image_url, caption, upvotes, verified_by_gov, driver_alert_sent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0);
    """, (post_id, payload.author_name, payload.author_role, payload.segment_id, seg_name, payload.hazard_type, payload.severity, payload.image_url, payload.caption))
    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "post_id": post_id, "corridor": corridor_state}

@app.post("/api/incidents/{incident_id}/upvote")
async def upvote_incident(incident_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE incident_posts SET upvotes = upvotes + 1 WHERE id = ?;", (incident_id,))
    conn.commit()
    conn.close()
    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True}

@app.post("/api/incidents/{incident_id}/broadcast_alert")
async def broadcast_incident_to_drivers(incident_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incident_posts WHERE id = ?;", (incident_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    incident = dict(row)
    cursor.execute("UPDATE incident_posts SET driver_alert_sent = 1 WHERE id = ?;", (incident_id,))
    conn.commit()
    conn.close()

    alert_data = {
        "alert_id": f"ALT-{uuid.uuid4().hex[:4].upper()}",
        "incident_id": incident_id,
        "segment_id": incident["segment_id"],
        "segment_name": incident["segment_name"],
        "hazard_type": incident["hazard_type"],
        "severity": incident["severity"],
        "caption": incident["caption"],
        "timestamp": datetime.now().strftime("%H:%M:%S")
    }

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("driver_route_alert", alert_data)
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "alert": alert_data}

@app.post("/api/incidents/{incident_id}/verify_override")
async def verify_incident_override(incident_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incident_posts WHERE id = ?;", (incident_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    incident = dict(row)
    # Mark verified by government
    cursor.execute("UPDATE incident_posts SET verified_by_gov = 1 WHERE id = ?;", (incident_id,))
    # Apply ground-truth override on segment
    reason = f"Gov Verified Incident {incident_id}: {incident['hazard_type']} confirmed by citizen scout photo"
    cursor.execute("""
        UPDATE segments 
        SET state = 'BLOCKED', 
            risk_score = 1.0, 
            override_reason = ?,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = ?;
    """, (reason, incident["segment_id"]))
    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "segment_id": incident["segment_id"], "state": "BLOCKED"}

# ==================== NEW: LOGISTICS TRANSPORT SCHEDULING ====================

@app.get("/api/transports")
def list_transports():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM scheduled_transports ORDER BY created_at DESC;")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"transports": rows}

@app.post("/api/transports/schedule")
async def schedule_transport(payload: TransportScheduleRequest):
    trp_id = f"TRP-{uuid.uuid4().hex[:5].upper()}"
    # Calculate safest route for the manifest
    safest = get_safest_ai_route("N1", "N11", payload.cargo_type)
    route_summary = f"{'Bypass Route (N6->N13->N9)' if safest.get('bypass_active') else 'NH-313 Direct'} | Safety: {safest.get('safety_score_pct', 95)}%"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scheduled_transports (id, driver_name, driver_phone, vehicle_number, cargo_type, cargo_details, weight_tons, source_hub, destination_hub, scheduled_departure, status, safest_route_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?);
    """, (trp_id, payload.driver_name, payload.driver_phone, payload.vehicle_number, payload.cargo_type, payload.cargo_details, payload.weight_tons, payload.source_hub, payload.destination_hub, payload.scheduled_departure, route_summary))
    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "transport_id": trp_id, "corridor": corridor_state}

@app.post("/api/transports/{transport_id}/dispatch")
async def dispatch_transport_mission(transport_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE scheduled_transports SET status = 'IN-TRANSIT' WHERE id = ?;", (transport_id,))
    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {"success": True, "status": "IN-TRANSIT"}

@app.post("/api/transports/{transport_id}/confirm_received")
async def confirm_goods_receipt(transport_id: str, payload: ConfirmReceiptRequest):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE scheduled_transports 
        SET status = 'DELIVERED_CONFIRMED',
            receiver_officer_id = ?,
            receiver_notes = ?,
            received_at = ?
        WHERE id = ?;
    """, (payload.receiver_officer_id, payload.receiver_notes, now_str, transport_id))
    conn.commit()
    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {
        "success": True,
        "transport_id": transport_id,
        "status": "DELIVERED_CONFIRMED",
        "received_at": now_str
    }

# ==================== NEW: DEDICATED SAFEST AI ROUTE ENDPOINT ====================

@app.post("/api/routing/safest")
def find_safest_route_endpoint(payload: SafestRouteRequest):
    """
    Called by the 'Find Safest AI Route' button.
    Evaluates current corridor risk matrix and returns optimal path, safety percentage,
    avoided hazards, and step-by-step turn-by-turn guidance.
    """
    res = get_safest_ai_route(source=payload.source, target=payload.target, cargo_type=payload.cargo_type)
    return res

# ==================== DEMO PRESETS (HACKATHON EVALUATION) ====================

@app.post("/api/demo/preset")
async def trigger_demo_preset(payload: DemoPresetRequest):
    preset = payload.preset_name.lower()
    conn = get_db_connection()
    cursor = conn.cursor()

    if preset == "normal":
        reset_corridor_to_normal()
        reset_all_cargo()

    elif preset == "monsoon_risk":
        reset_corridor_to_normal()
        cursor.execute("""
            UPDATE segments 
            SET rainfall_mm = 195.0, 
                risk_score = 0.97, 
                state = 'HIGH-RISK',
                override_reason = 'AI Warning: Heavy Monsoon Precip (195mm) exceeding slope shear threshold'
            WHERE id = 'SEG-06';
        """)
        conn.commit()

    elif preset == "field_landslide":
        report_id = f"RPT-EVAL-{uuid.uuid4().hex[:4].upper()}"
        cursor.execute("""
            INSERT INTO field_reports (id, segment_id, hazard_type, severity, reporter_id, notes)
            VALUES (?, 'SEG-07', 'Landslide', 'Severe', 'BRO Patrol Unit 42', 'Massive 80m rockfall blocking both carriageways near Kronli cliff');
        """, (report_id,))
        cursor.execute("""
            UPDATE segments 
            SET state = 'BLOCKED',
                risk_score = 1.0,
                override_reason = 'Ground Truth: Severe Landslide confirmed by BRO Patrol Unit 42'
            WHERE id = 'SEG-07';
        """)
        conn.commit()

    elif preset == "lane_cleared_triage":
        cursor.execute("""
            UPDATE segments 
            SET state = 'CONSTRAINED',
                override_reason = 'BRO Clearance: Single lane opened under military convoy escort'
            WHERE id = 'SEG-07';
        """)
        conn.commit()
        dispatch_on_lane_cleared(batch_size=4)

    conn.close()

    corridor_state = get_corridor_payload()
    await ws_manager.broadcast("corridor_updated", corridor_state)
    return {
        "success": True,
        "preset_applied": preset,
        "corridor": corridor_state
    }

# ==================== WEBSOCKET STREAM ====================

@app.websocket("/ws/corridor")
async def websocket_corridor(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({"type": "initial_state", "data": get_corridor_payload()})
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    init_db()
    load_risk_model()
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
