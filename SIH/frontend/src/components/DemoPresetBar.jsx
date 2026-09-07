import React from 'react';
import { Play, ShieldCheck, CloudLightning, AlertTriangle, Truck } from 'lucide-react';

export default function DemoPresetBar({ onApplyPreset, activePreset, loading }) {
  const presets = [
    {
      id: 'normal',
      title: 'Preset 1: Normal State',
      subtitle: 'All Green | Standard NH-313 Route',
      icon: ShieldCheck,
      color: 'border-emerald-600/60 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40',
      activeColor: 'border-emerald-500 bg-emerald-900/60 text-emerald-200 ring-2 ring-emerald-500/50'
    },
    {
      id: 'monsoon_risk',
      title: 'Preset 2: AI Monsoon Surge',
      subtitle: 'XGBoost High-Risk -> Bypass Activated',
      icon: CloudLightning,
      color: 'border-amber-600/60 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40',
      activeColor: 'border-amber-500 bg-amber-900/60 text-amber-200 ring-2 ring-amber-500/50'
    },
    {
      id: 'field_landslide',
      title: 'Preset 3: Ground Truth Landslide',
      subtitle: 'Field Report Overrides AI -> BLOCKED (Red)',
      icon: AlertTriangle,
      color: 'border-rose-600/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40',
      activeColor: 'border-rose-500 bg-rose-900/60 text-rose-200 ring-2 ring-rose-500/50'
    },
    {
      id: 'lane_cleared_triage',
      title: 'Preset 4: BRO Single-Lane Open',
      subtitle: 'CONSTRAINED -> Priority Cargo Dispatched',
      icon: Truck,
      color: 'border-cyan-600/60 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40',
      activeColor: 'border-cyan-500 bg-cyan-900/60 text-cyan-200 ring-2 ring-cyan-500/50'
    }
  ];

  return (
    <div className="w-full bg-slate-900/95 border-y border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto shadow-inner">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
        <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
        <span>Evaluation Presets:</span>
      </div>

      <div className="flex items-center gap-2.5 flex-1 min-w-[700px]">
        {presets.map((p) => {
          const Icon = p.icon;
          const isActive = activePreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onApplyPreset(p.id)}
              disabled={loading}
              className={`flex-1 text-left px-3 py-1.5 rounded-lg border text-xs transition-all active:scale-[0.98] ${
                isActive ? p.activeColor : p.color
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="font-bold text-[11px] leading-tight">{p.title}</div>
                  <div className="text-[10px] opacity-80 leading-tight">{p.subtitle}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

