import sqlite3
import os
from typing import Dict, List, Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "corridor.db")

# ==================== AUTHORITATIVE CORRIDOR STATE DEFINITIONS ====================
# These are the ONLY valid corridor states. Used throughout the entire backend.
CORRIDOR_STATES = {
    "OPEN": {
        "description": "Road fully passable at normal speed",
        "cost_multiplier": 1.0,
        "severity": 0
    },
    "CONSTRAINED": {
        "description": "Single lane or reduced speed due to minor hazard",
        "cost_multiplier": 2.8,
        "severity": 1
    },
    "HIGH-RISK": {
        "description": "Significant hazard; proceed with caution; consider alternative routes",
        "cost_multiplier": 10.0,
        "severity": 2
    },
    "DISRUPTED": {
        "description": "Severe disruption; alternative routes strongly recommended",
        "cost_multiplier": 20.0,
        "severity": 3
    },
    "BLOCKED": {
        "description": "Road completely impassable; no through traffic",
        "cost_multiplier": float("inf"),
        "severity": 4
    }
}

def is_valid_corridor_state(state: str) -> bool:
    """Validates that a state is one of the five authorized corridor states."""
    return state in CORRIDOR_STATES

def get_corridor_state_cost(state: str) -> float:
    """Returns the A* cost multiplier for a given corridor state."""
    if not is_valid_corridor_state(state):
        raise ValueError(f"Invalid corridor state: {state}. Valid states: {list(CORRIDOR_STATES.keys())}")
    return CORRIDOR_STATES[state]["cost_multiplier"]

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraints for referential integrity
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Nodes table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lng REAL NOT NULL,
        elevation_m INTEGER NOT NULL,
        description TEXT
    );
    """)

    # 2. Road Segments table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS segments (
        id TEXT PRIMARY KEY,
        from_node TEXT NOT NULL,
        to_node TEXT NOT NULL,
        name TEXT NOT NULL,
        distance_km REAL NOT NULL,
        slope_deg REAL NOT NULL,
        susceptibility REAL NOT NULL,
        state TEXT NOT NULL DEFAULT 'OPEN',
        risk_score REAL NOT NULL DEFAULT 0.1,
        rainfall_mm REAL NOT NULL DEFAULT 10.0,
        is_bypass INTEGER NOT NULL DEFAULT 0,
        override_reason TEXT,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_node) REFERENCES nodes(id),
        FOREIGN KEY (to_node) REFERENCES nodes(id)
    );
    """)

    # 3. Field Reports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS field_reports (
        id TEXT PRIMARY KEY,
        segment_id TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (segment_id) REFERENCES segments(id)
    );
    """)

    # 4. Cargo Queue table (Triage)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cargo_queue (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        cargo_type TEXT NOT NULL,
        priority_tier INTEGER NOT NULL,
        weight_tons REAL NOT NULL,
        stranded_at TEXT NOT NULL,
        destination TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'STRANDED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dispatched_at TIMESTAMP
    );
    """)

    # 5. NEW: Social Incident Posts Table ("TerrainWatch")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incident_posts (
        id TEXT PRIMARY KEY,
        author_name TEXT NOT NULL,
        author_role TEXT NOT NULL,
        segment_id TEXT NOT NULL,
        segment_name TEXT NOT NULL,
        hazard_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        image_url TEXT NOT NULL,
        caption TEXT NOT NULL,
        upvotes INTEGER NOT NULL DEFAULT 0,
        verified_by_gov INTEGER NOT NULL DEFAULT 0,
        driver_alert_sent INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # 6. NEW: Government Logistics Transport Missions Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS scheduled_transports (
        id TEXT PRIMARY KEY,
        driver_name TEXT NOT NULL,
        driver_phone TEXT NOT NULL,
        vehicle_number TEXT NOT NULL,
        cargo_type TEXT NOT NULL,
        cargo_details TEXT NOT NULL,
        weight_tons REAL NOT NULL,
        source_hub TEXT NOT NULL,
        destination_hub TEXT NOT NULL,
        scheduled_departure TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        safest_route_summary TEXT,
        receiver_officer_id TEXT,
        receiver_notes TEXT,
        received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    conn.commit()

    # Seed initial corridor graph if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM nodes;")
    if cursor.fetchone()["cnt"] == 0:
        seed_corridor_graph(cursor)
        seed_initial_cargo(cursor)

    # Seed initial incident posts if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM incident_posts;")
    if cursor.fetchone()["cnt"] == 0:
        seed_initial_incidents(cursor)

    # Seed initial transports if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM scheduled_transports;")
    if cursor.fetchone()["cnt"] == 0:
        seed_initial_transports(cursor)

    conn.commit()
    conn.close()

def seed_corridor_graph(cursor: sqlite3.Cursor):
    nodes = [
        ("N1", "Roing Base Depot", 28.1400, 95.8350, 390, "Base Supply Depot & Lower Dibang HQ"),
        ("N2", "Koronu Checkpoint", 28.1950, 95.8800, 580, "Police & BRO Staging Outpost"),
        ("N3", "Mayodia Alpine Pass", 28.2350, 95.9180, 2655, "High-altitude mountain pass, vulnerable to snow & slides"),
        ("N4", "Tiwari Gaon Valley", 28.2700, 95.9420, 1820, "Valley riverbed section with active drainage gullies"),
        ("N5", "Hunli Sub-division", 28.3220, 95.9650, 1210, "Strategic choke-point & civilian administration center"),
        ("N6", "Desali Junction", 28.3650, 95.9350, 1050, "Key intersection connecting main NH-313 to Chipi bypass"),
        ("N7", "New Arzoo Gorge", 28.4350, 95.9100, 1180, "Fractured shale bluffs prone to sudden monsoon debris flows"),
        ("N8", "Kronli Cliff Edge", 28.5300, 95.9800, 1340, "Steep vertical rockface vulnerable to deep rotational slides"),
        ("N9", "Etalin Confluence", 28.6150, 95.9320, 750, "River confluence & major steel girder bridge junction"),
        ("N10", "Ranli Mountain Sector", 28.7100, 95.9150, 1420, "Ascending ridge towards Dibang upper valley"),
        ("N11", "Anini District HQ", 28.7900, 95.8900, 1968, "Main destination & Dibang Valley District Headquarters"),
        ("N12", "Mipi Border Post", 28.9200, 95.8150, 2240, "Forward military logistics post near international border"),
        ("N13", "Chipi Ridge Outpost", 28.4800, 95.8500, 1560, "Mountain ridge waypoint along emergency bypass route")
    ]
    cursor.executemany("INSERT INTO nodes VALUES (?, ?, ?, ?, ?, ?);", nodes)

    # NH-313 Main alignment segments and Desali-Chipi bypass
    segments = [
        ("SEG-01", "N1", "N2", "Roing - Koronu Transit", 14.0, 12.0, 0.15, "OPEN", 0.08, 15.0, 0, None),
        ("SEG-02", "N2", "N3", "Koronu - Mayodia Ascent", 18.0, 38.0, 0.55, "OPEN", 0.22, 25.0, 0, None),
        ("SEG-03", "N3", "N4", "Mayodia Ridge - Tiwari Gaon", 12.0, 34.0, 0.45, "OPEN", 0.18, 20.0, 0, None),
        ("SEG-04", "N4", "N5", "Tiwari Gaon - Hunli Sector", 16.0, 28.0, 0.35, "OPEN", 0.14, 18.0, 0, None),
        ("SEG-05", "N5", "N6", "Hunli - Desali Junction", 11.0, 32.0, 0.40, "OPEN", 0.15, 20.0, 0, None),
        ("SEG-06", "N6", "N7", "Desali - New Arzoo Gorge", 14.0, 46.0, 0.78, "OPEN", 0.28, 22.0, 0, None),
        ("SEG-07", "N7", "N8", "New Arzoo - Kronli Cliff", 15.0, 44.0, 0.72, "OPEN", 0.25, 20.0, 0, None),
        ("SEG-08", "N8", "N9", "Kronli - Etalin Confluence", 14.0, 30.0, 0.35, "OPEN", 0.12, 16.0, 0, None),
        ("SEG-09", "N9", "N10", "Etalin - Ranli Sector", 15.0, 26.0, 0.25, "OPEN", 0.10, 15.0, 0, None),
        ("SEG-10", "N10", "N11", "Ranli - Anini Terminal", 16.0, 22.0, 0.20, "OPEN", 0.09, 12.0, 0, None),
        ("SEG-11", "N11", "N12", "Anini - Mipi Border Link", 21.0, 31.0, 0.30, "OPEN", 0.12, 10.0, 0, None),
        ("SEG-BP1", "N6", "N13", "Desali - Chipi Bypass Link", 27.0, 24.0, 0.25, "OPEN", 0.11, 14.0, 1, None),
        ("SEG-BP2", "N13", "N9", "Chipi - Etalin Bypass Link", 29.0, 26.0, 0.30, "OPEN", 0.13, 15.0, 1, None)
    ]
    cursor.executemany("INSERT INTO segments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);", segments)

def seed_initial_cargo(cursor: sqlite3.Cursor):
    initial_cargo = [
        ("CRG-101", "AR-01-MD-9011", "Medicines/Vaccines", 1, 4.2, "Hunli Sub-division", "Anini District HQ", "STRANDED", None),
        ("CRG-102", "AS-03-MD-8820", "Medicines/Vaccines", 1, 3.5, "Desali Junction", "Anini District HQ", "STRANDED", None),
        ("CRG-103", "NL-07-FL-3341", "Fuel/LPG", 2, 12.0, "Hunli Sub-division", "Anini District HQ", "STRANDED", None),
        ("CRG-104", "AR-02-FL-4109", "Fuel/LPG", 2, 14.5, "Desali Junction", "Mipi Border Post", "STRANDED", None),
        ("CRG-105", "AS-01-FD-5510", "Food", 3, 10.0, "Hunli Sub-division", "Anini District HQ", "STRANDED", None),
        ("CRG-106", "AR-01-FD-6622", "Food", 3, 8.5, "Desali Junction", "Anini District HQ", "STRANDED", None),
        ("CRG-107", "ML-05-CN-1102", "Construction Material", 4, 18.0, "Hunli Sub-division", "Etalin Confluence", "STRANDED", None),
        ("CRG-108", "AS-12-CN-7744", "Construction Material", 4, 22.0, "Desali Junction", "Anini District HQ", "STRANDED", None)
    ]
    cursor.executemany("INSERT INTO cargo_queue VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?);", initial_cargo)

def seed_initial_incidents(cursor: sqlite3.Cursor):
    incidents = [
        (
            "POST-101",
            "Tashi Norbu",
            "Citizen Scout (Hunli)",
            "SEG-06",
            "Desali - New Arzoo Gorge",
            "Landslide",
            "Severe",
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
            "⚠️ Massive boulder & mud slide right before New Arzoo gorge! Both lanes blocked under ~4 meters of fractured shale debris. Do NOT attempt crossing!",
            34,
            1,
            1,
            "2026-09-07 16:45:00"
        ),
        (
            "POST-102",
            "Naik R. Singh",
            "BRO Highway Patrol (Mayodia)",
            "SEG-02",
            "Koronu - Mayodia Ascent",
            "Rockfall",
            "Moderate",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
            "Rolling stones reported along Mayodia pass hairpin curve 14. Heavy fog reduces visibility to under 15m. Single lane passable under escort.",
            18,
            1,
            1,
            "2026-09-07 17:15:00"
        ),
        (
            "POST-103",
            "Kaling Megu",
            "Commercial Transporter",
            "SEG-07",
            "New Arzoo - Kronli Cliff",
            "Flash Flood / Slurry",
            "Severe",
            "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80",
            "Water gushing down Kronli cliff face has washed away the road shoulder. 5 heavy trucks stranded waiting for BRO clearance bulldozers.",
            22,
            0,
            0,
            "2026-09-07 18:20:00"
        )
    ]
    cursor.executemany("INSERT INTO incident_posts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", incidents)

def seed_initial_transports(cursor: sqlite3.Cursor):
    transports = [
        (
            "TRP-101",
            "Tashi Dorjee",
            "+91 94360 41289",
            "AR-01-MD-4491",
            "Medicines/Vaccines",
            "1,200 vials Rabies & Tetanus Vaccines, 40 Units Whole Blood, Cold Box at 4°C",
            3.8,
            "Roing Base Depot",
            "Anini District Hospital",
            "Today, 06:30 hrs",
            "IN-TRANSIT",
            "Diverted via Desali-Chipi Mountain Bypass (N6 -> N13 -> N9) circumventing New Arzoo gorge",
            None,
            None,
            None,
            "2026-09-07 06:00:00"
        ),
        (
            "TRP-102",
            "Bikash Gogoi",
            "+91 98540 88219",
            "AS-03-FL-9021",
            "Fuel/LPG",
            "12,000 Liters High-Altitude Winter-Grade Diesel for Army & Hospital Generators",
            14.2,
            "Roing Base Depot",
            "Anini Military Logistics Outpost",
            "Today, 08:00 hrs",
            "SCHEDULED",
            "Assigned safest AI path via Desali-Chipi bypass",
            None,
            None,
            None,
            "2026-09-07 07:30:00"
        ),
        (
            "TRP-103",
            "Mohan Chetri",
            "+91 94362 77102",
            "AR-02-FD-5512",
            "Food",
            "80 Bags Fortified Grains, 40 Bags Dal, Baby Nutrition Packs for Civil Supplies Dept",
            9.5,
            "Hunli Sub-division",
            "Anini District Civil Supplies",
            "Yesterday, 14:00 hrs",
            "DELIVERED_CONFIRMED",
            "Standard NH-313 Northern Sector",
            "OFFICER-ANINI-881",
            "All 120 bags inspected and verified intact. Cold chain and tamper seals approved by Executive Magistrate Anini.",
            "2026-09-07 12:15:00",
            "2026-09-06 14:00:00"
        )
    ]
    cursor.executemany("INSERT INTO scheduled_transports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", transports)

def reset_corridor_to_normal():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE segments 
        SET state = 'OPEN', 
            risk_score = 0.12, 
            rainfall_mm = 15.0, 
            override_reason = NULL,
            last_updated = CURRENT_TIMESTAMP;
    """)
    cursor.execute("""
        UPDATE cargo_queue
        SET status = 'STRANDED',
            dispatched_at = NULL;
    """)
    conn.commit()
    conn.close()
