import React, { useState, useEffect } from 'react';
import {
  Shield, Activity, CloudRain, Truck, Radio, Layers, RefreshCw,
  AlertTriangle, CheckCircle, Calendar, Camera, PackageCheck, Compass, Building2, UserCheck
} from 'lucide-react';
import CorridorMap from './components/CorridorMap';
import WeatherSimulationPanel from './components/WeatherSimulationPanel';
import CargoTriagePanel from './components/CargoTriagePanel';
import FieldReporterPWA from './components/FieldReporterPWA';
import DemoPresetBar from './components/DemoPresetBar';
import TerrainIncidentFeed from './components/TerrainIncidentFeed';
import TransportScheduler from './components/TransportScheduler';
import DestinationGoodsReceiver from './components/DestinationGoodsReceiver';
import DriverPortalView from './components/DriverPortalView';

export default function App() {
  const [corridorData, setCorridorData] = useState(null);
  
  // Top-Level Navigation State
  const [currentRole, setCurrentRole] = useState('GOV_OFFICIAL'); // 'GOV_OFFICIAL', 'CITIZEN_SCOUT', 'DRIVER', 'RECEIVER'
  const [adminSubTab, setAdminSubTab] = useState('triage'); // triage, scheduler, simulator, inspector
  const [scoutSubTab, setScoutSubTab] = useState('incident_feed'); // incident_feed, field_pwa
  
  const [activePreset, setActivePreset] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  const [officerInfo] = useState({
    id: 'GOV-AR-4821',
    name: 'Er. K. Lego',
    designation: 'Executive Engineer, BRTF'
  });

  const roles = [
    { id: 'GOV_OFFICIAL', label: 'Command Center', icon: Building2 },
    { id: 'CITIZEN_SCOUT', label: 'Field Ops', icon: Camera },
    { id: 'DRIVER', label: 'Convoy Navigation', icon: Truck },
    { id: 'RECEIVER', label: 'Destination Hub', icon: PackageCheck }
  ];

  const [driverAlerts, setDriverAlerts] = useState([
    {
      hazard_type: 'Landslide Debris',
      severity: 'Severe',
      segment_name: 'Desali - New Arzoo Gorge',
      caption: 'Massive boulder slide blocking both lanes. Avoid gorge transit!',
      timestamp: '16:45 hrs'
    }
  ]);

  const [safestRouteData, setSafestRouteData] = useState(null);

  const tickerAlerts = [
    '⚡ NER-SANCHAAR GOI: Monitoring NH-313 Dibang Valley Corridor (Roing - Mayodia Pass - Anini)',
    '🚨 PRIORITY 1 LOGISTICS ACTIVE: Temperature-controlled vaccine payload dispatched for Anini District Hospital',
    '📡 SATELLITE TERRAINWATCH: Dibang River basin hydrological sensors detecting 185mm monsoon saturation in gorge sectors',
    '🛡️ PS 26002 RESILIENCE: Emergency Desali-Chipi bypass operational for convoy diversion during highway closures'
  ];

  useEffect(() => {
    const tInterval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % tickerAlerts.length);
    }, 6000);
    return () => clearInterval(tInterval);
  }, []);

  const showToast = (message, type = 'info') => {
    setLiveToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setLiveToast((prev) => (prev?.id === prev?.id ? null : prev));
    }, 4500);
  };

  const fetchCorridor = async () => {
    try {
      const res = await fetch('/api/corridor');
      if (res.ok) {
        const data = await res.json();
        setCorridorData(data);
        if (data.safest_ai_route) {
          setSafestRouteData(data.safest_ai_route);
        }
      }
    } catch (err) {
      console.error('Failed to fetch corridor data:', err);
    }
  };

  useEffect(() => {
    fetchCorridor();

    let socket;
    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/corridor`;

      try {
        socket = new WebSocket(wsUrl);
        socket.onopen = () => setWsConnected(true);
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'initial_state' || payload.type === 'corridor_updated') {
              if (payload.data?.corridor) {
                setCorridorData(payload.data.corridor);
                if (payload.data.corridor.safest_ai_route) setSafestRouteData(payload.data.corridor.safest_ai_route);
              } else if (payload.data?.nodes) {
                setCorridorData(payload.data);
              }
              if (payload.data?.triage_dispatch) {
                showToast(`Priority Dispatch: ${payload.data.triage_dispatch.dispatched_count} vehicles released (Medicines first)!`, 'success');
              }
            } else if (payload.type === 'field_report_synced') {
              if (payload.data?.corridor) setCorridorData(payload.data.corridor);
              showToast('Ground Truth Override Applied: Field report synchronized with HQ!', 'warning');
            } else if (payload.type === 'driver_route_alert') {
              setDriverAlerts((prev) => [payload.data, ...prev]);
              showToast(`Driver Route Alert: ${payload.data.hazard_type} at ${payload.data.segment_name}!`, 'warning');
            }
          } catch (e) {
            console.error('Error parsing WS message:', e);
          }
        };
        socket.onclose = () => {
          setWsConnected(false);
          setTimeout(connectWs, 3000);
        };
        socket.onerror = () => setWsConnected(false);
      } catch (err) {
        console.error('WebSocket connection error:', err);
      }
    };

    connectWs();
    const pollInterval = setInterval(fetchCorridor, 3000);
    return () => {
      clearInterval(pollInterval);
      if (socket) socket.close();
    };
  }, []);

  const handleSimulateRainfall = async (segmentId, rainfallMm) => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulation/rainfall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_id: segmentId, rainfall_mm: rainfallMm })
      });
      const data = await res.json();
      if (data.success && data.corridor) {
        setCorridorData(data.corridor);
        showToast(`Precipitation (${rainfallMm}mm) evaluated by XGBoost. Route updated!`, 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = async (presetName) => {
    setLoading(true);
    setActivePreset(presetName);
    try {
      const res = await fetch('/api/demo/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_name: presetName })
      });
      const data = await res.json();
      if (data.success && data.corridor) {
        setCorridorData(data.corridor);
        showToast(`Applied Evaluation Scenario: ${presetName.toUpperCase()}`, 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSegmentState = async (segmentId, newState, reason) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/segments/${segmentId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: newState, override_reason: reason })
      });
      const data = await res.json();
      if (data.corridor) {
        setCorridorData(data.corridor);
        showToast(`Updated ${segmentId} to ${newState}`, 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFindSafestRoute = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/routing/safest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'N1', target: 'N11', cargo_type: 'Medicines/Vaccines' })
      });
      const data = await res.json();
      setSafestRouteData(data);
      showToast(`AI Safest Path Computed: ${data.safety_score_pct}% Safety Rating`, 'success');
    } catch (err) {
      console.error('Failed to compute safest route:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedCargo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cargo/seed', { method: 'POST' });
      const data = await res.json();
      if (data.cargo) {
        fetchCorridor();
        showToast('Added 6 mixed cargo trucks to stranded queue', 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLaneClearedDispatch = async () => {
    setLoading(true);
    try {
      const targetSeg = corridorData?.segments?.find((s) => s.state === 'BLOCKED' || s.state === 'HIGH-RISK') || corridorData?.segments?.[6];
      if (targetSeg) {
        const res = await fetch(`/api/segments/${targetSeg.id}/state`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: 'CONSTRAINED',
            override_reason: 'BRO Clearance: Single lane opened under military convoy escort'
          })
        });
        const data = await res.json();
        if (data.corridor) {
          setCorridorData(data.corridor);
          showToast(`Lane cleared on ${targetSeg.id}! Medicines dispatched first!`, 'success');
        }
      } else {
        await fetch('/api/cargo/dispatch', { method: 'POST' });
        fetchCorridor();
        showToast(`Dispatched convoy according to priority rules!`, 'success');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetCargo = async () => {
    await fetch('/api/cargo/reset', { method: 'POST' });
    fetchCorridor();
    showToast('Reset cargo queue to stranded baseline', 'info');
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#030712] text-slate-100 overflow-hidden select-none font-sans">
      
      {/* 1. Unified Top Navigation Bar */}
      <header className="h-14 bg-slate-950/95 border-b border-slate-800 px-4 flex items-center justify-between z-30 shadow-md">
        
        {/* Left: Branding & Official Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/50 border border-cyan-400/40">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-[11px] uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                <span>NER-SANCHAAR</span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-950 text-cyan-300 border border-cyan-700/80">PS 26002</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-mono">Dibang Valley Operations</p>
            </div>
          </div>
          
          {/* Active Officer Display (Only for Gov Official) */}
          {currentRole === 'GOV_OFFICIAL' && (
            <div className="hidden lg:flex items-center gap-2 text-[10px]">
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-slate-300">{officerInfo.name}</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">{officerInfo.id}</span>
            </div>
          )}
        </div>

        {/* Center: Top-Level Navigation Tabs (Roles) */}
        <div className="hidden md:flex bg-slate-900 rounded-lg p-1 border border-slate-800">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => setCurrentRole(r.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentRole === r.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <r.icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Right: Live Route Status & Tools */}
        <div className="flex items-center gap-3">
          {corridorData?.optimal_route && (
            <div className={`hidden lg:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
              corridorData.optimal_route.bypass_active
                ? 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${corridorData.optimal_route.bypass_active ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span>{corridorData.optimal_route.bypass_active ? 'DETOUR ENGAGED' : 'NOMINAL TRANSIT'}</span>
            </div>
          )}

          <div className={`flex items-center gap-1.5 text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border ${
            wsConnected ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800' : 'bg-amber-950/70 text-amber-400 border-amber-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
            <span>{wsConnected ? 'LIVE' : 'POLLING'}</span>
          </div>

          <button onClick={fetchCorridor} title="Refresh Telemetry" className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* 2. Tactical Flash Ticker (Slim) */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-4 py-1 flex items-center justify-between text-[10px] text-cyan-400 font-mono shadow-inner">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse flex-shrink-0"></span>
          <span className="font-bold text-slate-300 flex-shrink-0">TICKER:</span>
          <span className="text-slate-300/80 transition-opacity duration-500">{tickerAlerts[tickerIndex]}</span>
        </div>
      </div>

      {/* 3. Main Operational Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Live Notification Toast */}
        {liveToast && (
          <div className={`absolute top-4 right-4 z-[999] px-4 py-3 rounded-xl border text-xs shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-bounce ${
            liveToast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100' :
            liveToast.type === 'warning' ? 'bg-rose-950/95 border-rose-500 text-rose-100' :
            'bg-slate-900/95 border-cyan-500 text-cyan-100'
          }`}>
            {liveToast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> :
             liveToast.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> :
             <Activity className="w-4 h-4 text-cyan-400" />}
            <span className="font-semibold">{liveToast.message}</span>
          </div>
        )}

        {/* Demo Preset Bar - Now floating over the map to save vertical space */}
        <div className="absolute bottom-6 left-6 z-[400] w-[600px] shadow-2xl rounded-xl overflow-hidden border border-slate-700/80">
          <DemoPresetBar
            onApplyPreset={handleApplyPreset}
            activePreset={activePreset}
            loading={loading}
          />
        </div>

        {/* Left / Center: Interactive Tactical Map */}
        <div className="flex-1 h-full relative">
          <CorridorMap
            corridorData={corridorData}
            onSelectSegment={(seg) => setSelectedSegment(seg)}
            onUpdateSegmentState={handleUpdateSegmentState}
          />
        </div>

        {/* Right Tactical Intelligence Drawer */}
        <div className="w-[480px] h-full bg-slate-950/95 border-l border-slate-800 flex flex-col z-20 shadow-2xl backdrop-blur-md">
          
          {/* Contextual Sub-Tabs Header based on selected Role */}
          {currentRole === 'GOV_OFFICIAL' && (
            <div className="flex bg-slate-900/80 border-b border-slate-800 p-2 gap-1.5 shadow-inner">
              {[
                { id: 'triage', label: 'Priority Triage', icon: Truck },
                { id: 'scheduler', label: 'Convoy Scheduler', icon: Calendar },
                { id: 'simulator', label: 'AI Weather', icon: CloudRain },
                { id: 'inspector', label: 'Sectors', icon: Layers }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setAdminSubTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                    adminSubTab === tab.id
                      ? 'bg-blue-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {currentRole === 'CITIZEN_SCOUT' && (
            <div className="flex bg-slate-900/80 border-b border-slate-800 p-2 gap-1.5 shadow-inner">
              {[
                { id: 'incident_feed', label: 'TerrainWatch Feed', icon: Camera },
                { id: 'field_pwa', label: 'Offline Field PWA', icon: Radio }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setScoutSubTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all ${
                    scoutSubTab === tab.id
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <tab.icon className="w-3 h-3" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-4">
            
            {/* Command Center (GOV_OFFICIAL) Content */}
            {currentRole === 'GOV_OFFICIAL' && adminSubTab === 'triage' && (
              <CargoTriagePanel
                cargo={corridorData?.cargo}
                onSeedCargo={handleSeedCargo}
                onLaneClearedDispatch={handleLaneClearedDispatch}
                onResetCargo={handleResetCargo}
                loading={loading}
              />
            )}
            {currentRole === 'GOV_OFFICIAL' && adminSubTab === 'scheduler' && (
              <TransportScheduler
                transports={corridorData?.transports}
                onRefresh={fetchCorridor}
                onSelectSafestRoute={(data) => setSafestRouteData(data)}
              />
            )}
            {currentRole === 'GOV_OFFICIAL' && adminSubTab === 'simulator' && (
              <WeatherSimulationPanel
                segments={corridorData?.segments}
                onSimulateRainfall={handleSimulateRainfall}
                loading={loading}
              />
            )}
            {currentRole === 'GOV_OFFICIAL' && adminSubTab === 'inspector' && (
              <div className="tactical-card rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-200 uppercase tracking-wider">NH-313 Sectors</h3>
                  <span className="font-mono text-cyan-400 font-bold">{corridorData?.segments?.length || 0} Sectors</span>
                </div>
                <div className="space-y-2">
                  {corridorData?.segments?.map((seg) => (
                    <div
                      key={seg.id}
                      onClick={() => setSelectedSegment(seg)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        selectedSegment?.id === seg.id ? 'border-cyan-500 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold text-slate-200">{seg.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          seg.state === 'OPEN' ? 'badge-open' :
                          seg.state === 'CONSTRAINED' ? 'badge-constrained' :
                          seg.state === 'HIGH-RISK' ? 'badge-high-risk' :
                          seg.state === 'DISRUPTED' ? 'badge-disrupted' : 'badge-blocked'
                        }`}>
                          {seg.state}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-200 mb-1">{seg.name} {seg.is_bypass === 1 ? '⚡ (Bypass)' : ''}</div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400">
                        <span>Dist: {seg.distance_km}km</span>
                        <span>Slope: {seg.slope_deg}°</span>
                        <span className="text-cyan-400 font-bold">Risk: {(seg.risk_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Field Ops (CITIZEN_SCOUT) Content */}
            {currentRole === 'CITIZEN_SCOUT' && scoutSubTab === 'incident_feed' && (
              <TerrainIncidentFeed
                incidents={corridorData?.incidents}
                segments={corridorData?.segments}
                onRefresh={fetchCorridor}
                currentRole={currentRole}
                onNotifyDrivers={() => showToast('Broadcasted hazard alert to all active drivers!', 'warning')}
              />
            )}
            {currentRole === 'CITIZEN_SCOUT' && scoutSubTab === 'field_pwa' && (
              <FieldReporterPWA segments={corridorData?.segments} onSyncReports={fetchCorridor} />
            )}

            {/* Driver Navigation (DRIVER) Content */}
            {currentRole === 'DRIVER' && (
              <DriverPortalView
                driverAlerts={driverAlerts}
                onFindSafestRoute={handleFindSafestRoute}
                safestRouteData={safestRouteData}
                loading={loading}
              />
            )}

            {/* Destination Hub (RECEIVER) Content */}
            {currentRole === 'RECEIVER' && (
              <DestinationGoodsReceiver
                transports={corridorData?.transports}
                onRefresh={fetchCorridor}
                officerId="OFFICER-ANINI-881"
              />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
