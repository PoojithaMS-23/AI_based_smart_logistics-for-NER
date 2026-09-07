# MISSION SPECIFICATION: SIH 2026 INTERNAL HACKATHON (PS 26002)

## ROLE AND ENGINEERING STANDARDS
You are a senior engineer building a rapid, high-impact prototype for a 36-hour hackathon. Your goal is a visually impressive, functionally complete "happy path" demonstration.
1. **NO AUTOMATED TESTING SUITES:** Do not configure Pytest, Jest, or CI/CD pipelines. We need working features, not test coverage.
2. **LOCAL & FAST:** Use SQLite for the database to avoid Docker/PostgreSQL configuration delays. 
3. **VISUAL FEEDBACK:** The React dashboard is the star of the show. Every backend state change must reflect instantly on the Leaflet map without manual page reloads (use WebSockets or aggressive polling).
4. **MOCK HEAVY APIS:** Do not attempt to scrape real live IMD/GSI feeds. Generate mathematically plausible synthetic CSV datasets to train the AI model. 

## LOCKED DOMAIN DECISIONS (Per Research Summary)
- **Pilot Corridor:** NH-313, Dibang Valley (Model this as a graph with 10-15 nodes and at least one bypass route).
- **Segment States:** OPEN (Green), CONSTRAINED (Orange), HIGH-RISK (Yellow), DISRUPTED (Purple), BLOCKED (Red).
- **Routing Algorithm:** Risk-weighted A* (using NetworkX).
- **Logistics Rule:** Cargo Priority Triage must strictly follow: Medicines/Vaccines > Fuel/LPG > Food > Construction Material.
- **Tech Stack:** FastAPI (Python), SQLite, React + Leaflet (Dashboard), React PWA (Field Reporter).

---

## PHASE 1: FOUNDATION & CORRIDOR GRAPH
**Goal:** Establish the backend and render the map.
1. Initialize FastAPI backend and SQLite database.
2. Define the graph data structure for the NH-313 corridor, including coordinates, baseline susceptibility, and current accessibility state (default: OPEN). 
3. Initialize the React + Leaflet dashboard. Fetch the graph from the backend and render the nodes/edges on the map.
**DEMO VERIFICATION:** The map loads, centers on NH-313, and displays the network graph.

## PHASE 2: AI RISK & DYNAMIC ROUTING
**Goal:** Prove the system can predict risk and reroute logistics.
1. **Risk Model:** Train a lightweight XGBoost model on synthetic historical data (rainfall, slope, past disruptions). Expose an endpoint that takes current simulated rainfall and outputs a risk score.
2. **State Engine:** If the model outputs high risk, transition the segment state to HIGH-RISK.
3. **Routing Engine:** Implement A* routing. The cost function must penalize HIGH-RISK segments and completely forbid BLOCKED segments.
**DEMO VERIFICATION:** Injecting a heavy rainfall signal via an API call updates the map segment to Yellow (HIGH-RISK) and visually recalculates the optimal route to a bypass.

## PHASE 3: OFFLINE-FIRST FIELD REPORTING (The Differentiator)
**Goal:** Solve the core PS 26002 requirement for connectivity dropouts.
1. Build a responsive React PWA for field reporters. It needs a simple form: Location, Hazard Type (Landslide, Blockade, Flood), and Severity.
2. **Offline Sync:** Implement LocalStorage/IndexedDB. If the browser is offline, queue the submission locally. When the network connection is restored, automatically push the queue to the FastAPI backend.
3. **Ground Truth Override:** A confirmed field report of a "Landslide" or "Blockade" immediately overrides the AI prediction and transitions the segment to BLOCKED (Red).
**DEMO VERIFICATION:** Disconnect browser network -> Submit report -> Reconnect network -> Observe the report sync and the dashboard map turn Red.

## PHASE 4: CARGO PRIORITY TRIAGE
**Goal:** Prove operational resource intelligence.
1. Create a backend queue system for stranded cargo vehicles.
2. When a route transitions from BLOCKED to CONSTRAINED (e.g., a single lane opens), the system must query the queue and dispatch vehicles strictly based on the Cargo Priority Triage rule.
3. Build a Logistics Queue panel on the React Dashboard showing this sorting in real-time.
**DEMO VERIFICATION:** Add random cargo types to the queue. Transition a blocked route to CONSTRAINED. The dashboard must release the Medicine trucks before the Construction trucks.
