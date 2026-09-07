import random
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from backend.database import get_db_connection

PRIORITY_TIER_MAP = {
    "Medicines/Vaccines": 1,
    "Fuel/LPG": 2,
    "Food": 3,
    "Construction Material": 4
}

CARGO_COLOR_BADGES = {
    "Medicines/Vaccines": {"color": "emerald", "badge": "PRIORITY 1 - MEDICAL URGENT"},
    "Fuel/LPG": {"color": "amber", "badge": "PRIORITY 2 - VITAL FUEL/LPG"},
    "Food": {"color": "blue", "badge": "PRIORITY 3 - ESSENTIAL RATIONS"},
    "Construction Material": {"color": "slate", "badge": "PRIORITY 4 - RESTORATION / HEAVY"}
}

def get_all_cargo() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM cargo_queue 
        ORDER BY 
            CASE status WHEN 'STRANDED' THEN 0 ELSE 1 END,
            priority_tier ASC, 
            created_at ASC;
    """)
    rows = cursor.fetchall()
    conn.close()

    stranded = []
    dispatched = []
    for r in rows:
        item = dict(r)
        item["badge_info"] = CARGO_COLOR_BADGES.get(item["cargo_type"], {})
        if item["status"] == "STRANDED":
            stranded.append(item)
        else:
            dispatched.append(item)

    return {
        "stranded_count": len(stranded),
        "dispatched_count": len(dispatched),
        "total_count": len(rows),
        "stranded": stranded,
        "dispatched": dispatched
    }

def add_cargo_vehicle(cargo_type: str, vehicle_id: Optional[str] = None, weight_tons: float = 8.0, stranded_at: str = "Hunli Sub-division", destination: str = "Anini District HQ") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    c_id = f"CRG-{uuid.uuid4().hex[:6].upper()}"
    if not vehicle_id:
        state_code = random.choice(["AR-01", "AR-02", "AS-03", "NL-07"])
        vehicle_id = f"{state_code}-{random.choice(['MD', 'FL', 'FD', 'CN'])}-{random.randint(1000, 9999)}"

    tier = PRIORITY_TIER_MAP.get(cargo_type, 4)

    cursor.execute("""
        INSERT INTO cargo_queue (id, vehicle_id, cargo_type, priority_tier, weight_tons, stranded_at, destination, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'STRANDED', CURRENT_TIMESTAMP);
    """, (c_id, vehicle_id, cargo_type, tier, weight_tons, stranded_at, destination))
    conn.commit()
    conn.close()

    return {"id": c_id, "vehicle_id": vehicle_id, "cargo_type": cargo_type, "priority_tier": tier}

def seed_mixed_convoy(count: int = 6) -> List[Dict[str, Any]]:
    cargo_options = [
        ("Medicines/Vaccines", 2.5, 6.0),
        ("Fuel/LPG", 10.0, 16.0),
        ("Food", 8.0, 14.0),
        ("Construction Material", 15.0, 24.0)
    ]
    added = []
    for _ in range(count):
        ctype, min_w, max_w = random.choice(cargo_options)
        weight = round(random.uniform(min_w, max_w), 1)
        added.append(add_cargo_vehicle(ctype, weight_tons=weight))
    return added

def dispatch_on_lane_cleared(batch_size: int = 4) -> Dict[str, Any]:
    """
    Called when a road segment transitions from BLOCKED to CONSTRAINED (e.g. 1-lane opened by BRO).
    Dispatches stranded vehicles strictly adhering to Priority 1 -> Priority 2 -> Priority 3 -> Priority 4.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Query stranded vehicles sorted by priority_tier (1 to 4) and FIFO within tier
    cursor.execute("""
        SELECT * FROM cargo_queue 
        WHERE status = 'STRANDED'
        ORDER BY priority_tier ASC, created_at ASC
        LIMIT ?;
    """, (batch_size,))
    eligible_rows = cursor.fetchall()

    dispatched_items = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    for row in eligible_rows:
        item = dict(row)
        cursor.execute("""
            UPDATE cargo_queue 
            SET status = 'DISPATCHED', dispatched_at = ?
            WHERE id = ?;
        """, (now_str, item["id"]))
        item["status"] = "DISPATCHED"
        item["dispatched_at"] = now_str
        dispatched_items.append(item)

    conn.commit()
    conn.close()

    return {
        "batch_size": batch_size,
        "dispatched_count": len(dispatched_items),
        "dispatched_vehicles": dispatched_items,
        "rule_applied": "Strict Priority Triage: Medicines/Vaccines (Tier 1) > Fuel/LPG (Tier 2) > Food (Tier 3) > Construction (Tier 4)"
    }

def reset_all_cargo():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE cargo_queue SET status = 'STRANDED', dispatched_at = NULL;")
    conn.commit()
    conn.close()

