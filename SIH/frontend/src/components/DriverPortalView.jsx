import React, { useState, useEffect } from 'react';
import {
  Truck,
  Navigation,
  Sparkles,
  AlertTriangle,
  Compass,
  MapPin,
  ShieldCheck,
  CheckCircle,
  Radio,
  ExternalLink,
  Volume2
} from 'lucide-react';

export default function DriverPortalView({
  driverAlerts,
  onFindSafestRoute,
  safestRouteData,
  loading
}) {
  const [activeInstructionStep, setActiveInstructionStep] = useState(0);

  return (
    <div className="flex flex-col h-full text-slate-100 font-sans space-y-4">
      {/* Header & Driver Status */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-emerald-400">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <span>Driver Navigation & Route Advisory</span>
            </h3>
            <div className="text-[11px] text-slate-400 font-mono">
              Vehicle: <strong className="text-cyan-300">AR-01-MD-4491</strong> • Driver: Tashi Dorjee
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-600 text-[10px] font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>MISSION ACTIVE</span>
        </div>
      </div>

      {/* Live Route Hazard Alerts (Synced with Crowdsourced TerrainWatch Feed) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-amber-400 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Live Terrain Hazard Broadcasts on NH-313</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Real-time Dispatch</span>
        </div>

        {driverAlerts?.length > 0 ? (
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {driverAlerts.map((alert, i) => (
              <div
                key={i}
                className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-600/80 text-xs text-rose-200 flex items-start gap-2 animate-fadeIn"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[11px] text-rose-100">
                    ⚠️ {alert.hazard_type} ({alert.severity}) at {alert.segment_name || alert.segment_id}
                  </div>
                  <div className="text-[10px] text-rose-300 mt-0.5">{alert.caption}</div>
                  <div className="text-[9px] text-rose-400 font-mono mt-1">Broadcasted at {alert.timestamp || 'Just now'}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>No urgent blockades broadcasted. Normal vigilance advised over Mayodia Pass.</span>
          </div>
        )}
      </div>

      {/* DEDICATED PROMINENT ACTION: FIND SAFEST AI ROUTE */}
      <div className="p-4 rounded-xl border border-emerald-500/80 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>AI Autonomous Route Calculator</span>
            </h4>
            <p className="text-[10px] text-slate-400">
              Evaluates real-time XGBoost slide hazards & bypass availability
            </p>
          </div>

          <button
            onClick={onFindSafestRoute}
            disabled={loading}
            className="py-2 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all active:scale-[0.98] border border-emerald-300"
          >
            <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950 animate-spin" />
            <span>FIND SAFEST AI ROUTE</span>
          </button>
        </div>

        {safestRouteData && (
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-400 text-[10px] block">Current Recommended Path:</span>
                <span className="font-extrabold text-cyan-300 text-xs">
                  {safestRouteData.bypass_active
                    ? '⚠️ Desali-Chipi Mountain Bypass Route'
                    : '✅ Direct NH-313 Valley Highway'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-400 font-extrabold bg-emerald-950/90 px-2 py-0.5 rounded border border-emerald-700">
                  {safestRouteData.safety_score_pct}% SAFETY
                </span>
                <span className="text-slate-400 text-[10px] block font-mono">
                  {safestRouteData.total_distance_km} km
                </span>
              </div>
            </div>

            {/* Turn-by-Turn Navigation Steps */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Turn-by-Turn Driver Guidance Steps:
              </span>

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {safestRouteData.driver_instructions?.map((step) => {
                  const isDetour = step.type === 'DETOUR';
                  const isArrival = step.type === 'ARRIVAL';
                  return (
                    <div
                      key={step.step}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isDetour
                          ? 'border-amber-500 bg-amber-950/50 text-amber-200'
                          : isArrival
                          ? 'border-emerald-500 bg-emerald-950/50 text-emerald-200'
                          : 'border-slate-800 bg-slate-950/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-[11px] flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-mono font-bold text-cyan-400">
                            {step.step}
                          </span>
                          <span>{step.title}</span>
                        </span>
                        {step.elevation_m && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {step.elevation_m}m
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 ml-5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

