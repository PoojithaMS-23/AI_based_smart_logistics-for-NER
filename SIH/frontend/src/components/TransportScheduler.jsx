import React, { useState } from 'react';
import {
  Calendar,
  Truck,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Package,
  FileCheck
} from 'lucide-react';

export default function TransportScheduler({
  transports,
  onRefresh,
  onSelectSafestRoute
}) {
  const [driverName, setDriverName] = useState('Tashi Dorjee');
  const [driverPhone, setDriverPhone] = useState('+91 94360 41289');
  const [vehicleNumber, setVehicleNumber] = useState('AR-01-MD-4491');
  const [cargoType, setCargoType] = useState('Medicines/Vaccines');
  const [cargoDetails, setCargoDetails] = useState(
    '1,200 vials Rabies & Tetanus Vaccines, 40 Units Whole Blood, Cold Box at 4°C'
  );
  const [weightTons, setWeightTons] = useState(3.8);
  const [sourceHub, setSourceHub] = useState('Roing Base Depot');
  const [destinationHub, setDestinationHub] = useState('Anini District Hospital');
  const [departureTime, setDepartureTime] = useState('Today, 06:30 hrs');

  const [aiRouteResult, setAiRouteResult] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Call the AI Routing Algorithm
  const handleFindSafestRoute = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/routing/safest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'N1',
          target: 'N11',
          cargo_type: cargoType
        })
      });
      const data = await res.json();
      setAiRouteResult(data);
      if (onSelectSafestRoute) onSelectSafestRoute(data);
    } catch (err) {
      console.error('Failed to find safest route:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleScheduleTransport = async (e) => {
    e.preventDefault();
    setScheduling(true);
    try {
      const res = await fetch('/api/transports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_name: driverName,
          driver_phone: driverPhone,
          vehicle_number: vehicleNumber,
          cargo_type: cargoType,
          cargo_details: cargoDetails,
          weight_tons: Number(weightTons),
          source_hub: sourceHub,
          destination_hub: destinationHub,
          scheduled_departure: departureTime
        })
      });
      if (res.ok) {
        setSuccessToast(`✅ Scheduled transport mission for ${driverName} (${vehicleNumber})!`);
        setTimeout(() => setSuccessToast(null), 5000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to schedule transport:', err);
    } finally {
      setScheduling(false);
    }
  };

  const handleDispatch = async (trpId) => {
    try {
      const res = await fetch(`/api/transports/${trpId}/dispatch`, { method: 'POST' });
      if (res.ok) {
        setSuccessToast(`Convoy ${trpId} transitioned to IN-TRANSIT under GPS monitoring!`);
        setTimeout(() => setSuccessToast(null), 5000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to dispatch transport:', err);
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-100 font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Government Logistics Transport Scheduler</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Assign driver manifests, verify cargo priority, and compute safest AI routes
          </p>
        </div>
      </div>

      {successToast && (
        <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-600 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Scheduler Form Card */}
      <div className="tactical-card rounded-xl p-4 border border-slate-800 bg-slate-900/90">
        <form onSubmit={handleScheduleTransport} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Driver Full Name
              </label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Driver Contact Phone
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Vehicle Registration Plate
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Cargo Priority Tier
              </label>
              <select
                value={cargoType}
                onChange={(e) => setCargoType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="Medicines/Vaccines">Priority 1: Medicines & Vaccines</option>
                <option value="Fuel/LPG">Priority 2: Fuel & Winter LPG</option>
                <option value="Food">Priority 3: Essential Food Grains</option>
                <option value="Construction Material">Priority 4: Construction & Restoration</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Payload Tonnage
              </label>
              <input
                type="number"
                step="0.1"
                value={weightTons}
                onChange={(e) => setWeightTons(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Scheduled Departure
              </label>
              <input
                type="text"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Detailed Manifest & Goods Description
            </label>
            <input
              type="text"
              value={cargoDetails}
              onChange={(e) => setCargoDetails(e.target.value)}
              placeholder="e.g. 1,200 vials Vaccine, 30 Oxygen Concentrators"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Departure Supply Depot
              </label>
              <input
                type="text"
                value={sourceHub}
                onChange={(e) => setSourceHub(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Destination Receiving Outpost
              </label>
              <input
                type="text"
                value={destinationHub}
                onChange={(e) => setDestinationHub(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              />
            </div>
          </div>

          {/* DEDICATED PROMINENT ACTION: FIND SAFEST AI ROUTE */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleFindSafestRoute}
              disabled={loadingAi}
              className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 border border-emerald-400/40 transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-emerald-200 animate-spin" />
              <span>FIND SAFEST AI ROUTE</span>
            </button>

            <button
              type="submit"
              disabled={scheduling}
              className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-950/60 flex items-center justify-center gap-2 border border-blue-400/40 transition-all active:scale-[0.98]"
            >
              <Send className="w-4 h-4" />
              <span>Schedule Convoy Mission</span>
            </button>
          </div>
        </form>

        {/* AI Safest Route Feedback Panel */}
        {aiRouteResult && (
          <div className="mt-4 p-3.5 rounded-xl border border-cyan-500/80 bg-slate-950/95 space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                <h4 className="font-extrabold text-xs text-cyan-300 uppercase tracking-wider">
                  AI Algorithmic Route Recommendation
                </h4>
              </div>
              <div className="font-mono text-emerald-400 font-extrabold text-xs bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-700/60 shadow">
                🛡️ {aiRouteResult.safety_score_pct}% Safety Rating
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px]">Optimal Distance:</span>
                <div className="font-bold text-slate-200">{aiRouteResult.total_distance_km} km</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 text-[10px]">Bypass Engaged:</span>
                <div className="font-bold text-amber-300">
                  {aiRouteResult.bypass_active ? 'YES (Desali-Chipi)' : 'NO (Direct NH-313)'}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-slate-500 text-[10px]">Waypoints:</span>
                <div className="font-bold text-cyan-400">{aiRouteResult.path_nodes?.length} Sectors</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed italic">
              "{aiRouteResult.reasoning}"
            </p>

            {/* Avoided Hazards List */}
            {aiRouteResult.hazards_avoided?.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  Hazardous Sectors Avoided by AI Router:
                </span>
                <div className="space-y-1">
                  {aiRouteResult.hazards_avoided.map((h, i) => (
                    <div
                      key={i}
                      className="p-1.5 rounded bg-rose-950/40 border border-rose-900/60 text-[10px] flex items-center justify-between text-rose-300"
                    >
                      <span className="font-semibold">{h.name}</span>
                      <span className="font-mono font-bold px-1 rounded bg-rose-900/80">
                        {h.state}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Missions Directory */}
      <div className="flex-1 overflow-y-auto space-y-3">
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Truck className="w-4 h-4 text-cyan-400" />
          <span>Active Scheduled Convoys ({transports?.length || 0})</span>
        </h4>

        {transports?.map((trp) => (
          <div
            key={trp.id}
            className="tactical-card rounded-xl p-3.5 border border-slate-800 bg-slate-900/90 text-xs shadow-md"
          >
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-cyan-300 text-xs">{trp.id}</span>
                <span className="font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                  {trp.vehicle_number}
                </span>
              </div>

              <span
                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  trp.status === 'IN-TRANSIT'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700 animate-pulse'
                    : trp.status === 'DELIVERED_CONFIRMED'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}
              >
                {trp.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mb-2">
              <div>
                <span className="text-slate-500 text-[10px]">Driver Manifest:</span>
                <div className="font-bold text-slate-200">
                  {trp.driver_name} ({trp.driver_phone})
                </div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Cargo Classification:</span>
                <div className="font-bold text-amber-300">
                  {trp.cargo_type} ({trp.weight_tons} Tons)
                </div>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300 mb-2">
              <strong>Manifest Details:</strong> {trp.cargo_details}
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
              <span>Departure: {trp.scheduled_departure}</span>
              {trp.status === 'SCHEDULED' && (
                <button
                  onClick={() => handleDispatch(trp.id)}
                  className="px-3 py-1 rounded bg-cyan-700 hover:bg-cyan-600 text-white font-bold transition-all"
                >
                  Dispatch Convoy
                </button>
              )}
              {trp.status === 'DELIVERED_CONFIRMED' && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Goods Receipt Verified
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

