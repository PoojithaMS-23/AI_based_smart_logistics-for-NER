# NH-313 Dibang Valley Mountain Logistics Intelligence (SIH 2026 - PS 26002)

A rapid, high-impact prototype built for **Smart India Hackathon (Problem Statement 26002)** addressing **Dynamic Hazard-Aware Routing and Offline Field Intelligence for Mountain Logistics Corridors**.

---

## 🏔️ Pilot Corridor: NH-313, Dibang Valley (Arunachal Pradesh)
NH-313 spans rugged Himalayan terrain from **Roing Base Depot (390m)** across high alpine passes (**Mayodia Pass, 2655m**), strategic choke-points (**Hunli, 1210m**), and active slide-prone gorges (**New Arzoo & Kronli Cliffs**) up to **Anini District HQ (1968m)** and forward posts (**Mipi Border Post**).

To guarantee logistical resilience, the system models both the primary gorge highway and the emergency mountain bypass: **Desali Junction (N6) -> Chipi Ridge (N13) -> Etalin Confluence (N9)**.

---

## ⚡ Core Hackathon Innovations

### 1. Risk-Weighted A* Routing Engine
- Implemented with **NetworkX** using great-circle geographic heuristics.
- Cost function: $\text{Effective Weight} = \text{Distance} \times \text{State Multiplier}$.
  - **`OPEN` (Green)**: 1.0x (Standard transit)
  - **`CONSTRAINED` (Orange)**: 2.8x (Single-lane crawl / convoy escort)
  - **`HIGH-RISK` (Yellow)**: 10.0x (Imminent slide probability; A* shifts to safe bypass)
  - **`DISRUPTED` (Purple)**: 20.0x (Severe rock debris)
  - **`BLOCKED` (Red)**: $\infty$ (Completely severed; strictly forbidden)
- When primary gorge sectors become hazardous or blocked, the algorithm autonomously re-routes military and civilian convoys through the Desali-Chipi bypass.

### 2. XGBoost Geotechnical Hazard Risk Model
- Trained on a mathematically modeled geological dataset (3,000 synthetic Himalayan slope stability records).
- Evaluates non-linear physics: slope angle (10° to 60°), antecedent 24-hour precipitation (mm), lithological susceptibility, and dynamic soil pore-water saturation.
- When simulated rainfall exceeds stability thresholds (>110mm on steep 44°-46° slopes), the segment automatically transitions to **`HIGH-RISK`**, recomputing the global route.

### 3. Offline-First Field Operative PWA (The Differentiator)
- Built for deep mountain gorges with intermittent or zero cellular connectivity.
- Features an offline vault backed by **LocalStorage / IndexedDB**.
- **Simulated Gorge Dropout Switch**: Allows hackathon evaluators to test offline queueing and auto-synchronization without disconnecting from Wi-Fi.
- **Ground Truth Override**: A confirmed patrol report of a `Landslide` or `Blockade` immediately overrides AI predictions and forces the segment state to **`BLOCKED` (Red)**, broadcasting live updates to HQ.

### 4. Cargo Priority Triage Engine
- Enforces strict operational priority ordering:
  1. **Medicines & Vaccines (Tier 1 - Highest / Life-Saving)**
  2. **Fuel & LPG (Tier 2 - Generators & Defense Energy)**
  3. **Essential Food Rations (Tier 3)**
  4. **Construction Material (Tier 4 - Restoration & Heavy Debris Equipment)**
- When a blocked sector is cleared to single-lane (**`CONSTRAINED`**), the backend triage engine queries the stranded vehicle queue and automatically dispatches vehicles strictly by priority tier.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (SQLite3 included)
- Node.js 18+ & npm

### Start Backend & Frontend Together:
Run the launcher script:
```powershell
.\start_system.ps1
```
*(or double-click `start_system.bat` on Windows)*

### Or Run Individually:

**Terminal 1 (Backend):**
```powershell
python run_backend.py
```
*API runs at `http://127.0.0.1:8000` (Swagger docs at `/docs`)*

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```
*Dashboard loads at `http://localhost:5173`*

---

## 🎯 1-Click Evaluation Presets (For Judges & Evaluators)

Located at the top of the React dashboard:

| Preset Button | Demonstrated Capability | Visual & Operational Effect |
|---|---|---|
| **Preset 1: Normal State** | Baseline Operations | All segments Green (`OPEN`). A* routes directly via standard NH-313 gorge. |
| **Preset 2: AI Monsoon Surge** | Predictive ML & Rerouting | Injects 195mm rainfall on New Arzoo Gorge. XGBoost model scores 98% hazard -> segment turns Yellow (`HIGH-RISK`) -> A* reroutes traffic through Desali-Chipi bypass. |
| **Preset 3: Ground Truth Landslide** | Field Intelligence Override | Offline field report of Severe Landslide on Kronli Cliff syncs -> Overrides AI prediction -> Segment turns Red (`BLOCKED`). |
| **Preset 4: BRO Single-Lane Open** | Priority Cargo Triage | Segment transitions from `BLOCKED` to `CONSTRAINED`. Triage engine dispatches stranded **Medicines first**, followed by Fuel, Food, and Construction. |

---

## 📁 Project Structure

```
SIH/
├── backend/
│   ├── corridor.db             # Local SQLite database
│   ├── database.py             # Schema, pre-seeded NH-313 graph, and initial cargo
│   ├── ml_risk_model.py        # Synthetic dataset generator & XGBoost risk engine
│   ├── router.py               # Risk-weighted A* routing algorithm (NetworkX)
│   ├── triage_engine.py        # Cargo priority triage and dispatch logic
│   ├── websocket_manager.py    # Real-time WebSocket connection manager
│   ├── main.py                 # FastAPI REST API & WebSocket endpoints
│   └── test_backend.py         # End-to-end verification test suite
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CorridorMap.jsx          # Leaflet dark map with glowing route states
│   │   │   ├── WeatherSimulationPanel.jsx # AI rainfall injection slider
│   │   │   ├── CargoTriagePanel.jsx     # Priority queue & convoy release
│   │   │   ├── FieldReporterPWA.jsx     # Offline PWA form & network simulator
│   │   │   └── DemoPresetBar.jsx        # 1-click evaluation scenarios
│   │   ├── App.jsx                      # Main operations room layout
│   │   ├── style.css                    # Tactical dark theme & glow animations
│   │   └── main.jsx                     # React entry point
│   ├── package.json
│   └── vite.config.js                   # Proxy config to FastAPI backend
├── run_backend.py              # Single command backend entry point
├── start_system.bat            # Windows Command Prompt launcher
├── start_system.ps1            # Windows PowerShell launcher
└── README.md                   # Project documentation
```

