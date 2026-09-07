import React, { useState } from 'react';
import { Truck, ShieldAlert, CheckCircle, PlusCircle, ArrowRight, RotateCcw } from 'lucide-react';

const PRIORITY_STYLES = {
  1: {
    label: 'PRIORITY 1: MEDICINES / VACCINES',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-700/80',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  2: {
    label: 'PRIORITY 2: FUEL / LPG',
    bg: 'bg-amber-950/60',
    border: 'border-amber-700/80',
    text: 'text-amber-300',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  3: {
    label: 'PRIORITY 3: ESSENTIAL FOOD',
    bg: 'bg-blue-950/60',
    border: 'border-blue-700/80',
    text: 'text-blue-300',
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
  },
  4: {
    label: 'PRIORITY 4: CONSTRUCTION MATERIAL',
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-300',
    badge: 'bg-slate-700/40 text-slate-400 border-slate-600'
  }
};

export default function CargoTriagePanel({ cargo, onSeedCargo, onLaneClearedDispatch, onResetCargo, loading }) {
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'STRANDED', 'DISPATCHED'

  const stranded = cargo?.stranded || [];
  const dispatched = cargo?.dispatched || [];

  return (
    <div className="tactical-card rounded-xl p-4 text-slate-100 border border-slate-700/80 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
            Cargo Priority Triage Queue
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
          PS 26002 Rule Engine
        </span>
      </div>

      {/* Mandatory Logistics Rule Banner */}
      <div className="mb-3 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] leading-relaxed">
        <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Strict Triage Priority Order:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
          <span className="text-emerald-400 font-bold">1. Meds/Vaccines</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
          <span className="text-amber-400 font-bold">2. Fuel/LPG</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
          <span className="text-blue-400 font-bold">3. Food</span>
          <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
          <span className="text-slate-400">4. Construction</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={onSeedCargo}
          disabled={loading}
          className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-600 flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
          Add Stranded Trucks
        </button>
        <button
          onClick={onLaneClearedDispatch}
          disabled={loading || stranded.length === 0}
          className="py-2 px-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40"
        >
          <CheckCircle className="w-3.5 h-3.5 text-amber-200" />
          Single Lane Cleared: Dispatch
        </button>
      </div>

      {/* Status Counters & Tabs */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({stranded.length + dispatched.length})
          </button>
          <button
            onClick={() => setFilter('STRANDED')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              filter === 'STRANDED' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stranded ({stranded.length})
          </button>
          <button
            onClick={() => setFilter('DISPATCHED')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              filter === 'DISPATCHED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dispatched ({dispatched.length})
          </button>
        </div>

        <button
          onClick={onResetCargo}
          title="Reset Queue"
          className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Vehicle Queue List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[320px]">
        {/* Render Stranded Trucks first (or according to filter) */}
        {(filter === 'ALL' || filter === 'STRANDED') &&
          stranded.map((v) => {
            const style = PRIORITY_STYLES[v.priority_tier] || PRIORITY_STYLES[4];
            return (
              <div
                key={v.id}
                className={`p-2.5 rounded-lg border text-xs ${style.bg} ${style.border} tactical-card-hover`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-slate-100">{v.vehicle_id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.badge}`}>
                    Tier {v.priority_tier}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${style.text}`}>{v.cargo_type}</span>
                  <span className="text-slate-400 font-mono">{v.weight_tons} tons</span>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>📍 {v.stranded_at}</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 font-semibold border border-rose-800/60">
                    STRANDED
                  </span>
                </div>
              </div>
            );
          })}

        {/* Render Dispatched Trucks */}
        {(filter === 'ALL' || filter === 'DISPATCHED') &&
          dispatched.map((v) => {
            const style = PRIORITY_STYLES[v.priority_tier] || PRIORITY_STYLES[4];
            return (
              <div
                key={v.id}
                className="p-2.5 rounded-lg border border-emerald-900/60 bg-emerald-950/20 text-xs opacity-80"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-slate-300">{v.vehicle_id}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-700/50">
                    DISPATCHED
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-300 font-medium">{v.cargo_type}</span>
                  <span className="text-slate-400 font-mono">{v.weight_tons} tons</span>
                </div>
                <div className="mt-1 text-[10px] text-emerald-400/80 font-mono">
                  ✅ Released: {v.dispatched_at || 'Just now'}
                </div>
              </div>
            );
          })}

        {stranded.length === 0 && dispatched.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500 italic">
            No cargo trucks in queue. Click "Add Stranded Trucks" to populate.
          </div>
        )}
      </div>
    </div>
  );
}

