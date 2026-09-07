import React, { useState } from 'react';
import { CloudRain, Zap, AlertTriangle, RefreshCw } from 'lucide-react';

export default function WeatherSimulationPanel({ segments, onSimulateRainfall, loading }) {
  const [rainfall, setRainfall] = useState(185);
  const [targetSegment, setTargetSegment] = useState('SEG-06');
  const [lastResult, setLastResult] = useState(null);

  const handleSimulate = async () => {
    try {
      const res = await onSimulateRainfall(targetSegment === 'ALL' ? null : targetSegment, Number(rainfall));
      setLastResult(res);
    } catch (err) {
      console.error('Simulation error:', err);
    }
  };

  return (
    <div className="tactical-card rounded-xl p-4 text-slate-100 border border-slate-700/80">
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
            AI Risk & Weather Simulator
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
          XGBoost ML v3.4
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-3 leading-relaxed">
        Inject simulated precipitation into NH-313 mountain gorge segments to trigger dynamic XGBoost geotechnical landslide failure predictions.
      </p>

      {/* Target Segment Selector */}
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
          Target Terrain Sector
        </label>
        <select
          value={targetSegment}
          onChange={(e) => setTargetSegment(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="SEG-06">SEG-06: Desali - New Arzoo Gorge (Slope: 46°, High Slide Hazard)</option>
          <option value="SEG-07">SEG-07: New Arzoo - Kronli Cliff (Slope: 44°)</option>
          <option value="SEG-02">SEG-02: Koronu - Mayodia Alpine Ascent (Slope: 38°)</option>
          <option value="ALL">Corridor-Wide Precipitation (All High-Slope Sectors)</option>
        </select>
      </div>

      {/* Rainfall Slider */}
      <div className="mb-3 bg-slate-900/80 p-3 rounded-lg border border-slate-800">
        <div className="flex justify-between items-center mb-1.5 text-xs">
          <span className="text-slate-300 font-medium">24h Simulated Rainfall:</span>
          <span className="font-mono text-cyan-400 font-bold text-sm bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
            {rainfall} mm
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="280"
          step="5"
          value={rainfall}
          onChange={(e) => setRainfall(e.target.value)}
          className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
          <span>10mm (Normal)</span>
          <span>120mm (Monsoon)</span>
          <span>250mm (Cloudburst)</span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => setRainfall(25)}
          className="text-[10px] py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
        >
          Drizzle (25mm)
        </button>
        <button
          onClick={() => setRainfall(130)}
          className="text-[10px] py-1 px-2 rounded bg-amber-950/50 hover:bg-amber-900/60 text-amber-300 border border-amber-800/60"
        >
          Monsoon (130mm)
        </button>
        <button
          onClick={() => setRainfall(210)}
          className="text-[10px] py-1 px-2 rounded bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60"
        >
          Extreme (210mm)
        </button>
      </div>

      {/* Inject Button */}
      <button
        onClick={handleSimulate}
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-lg shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4 text-cyan-200 fill-cyan-200" />
        )}
        Run AI Inference & Route Update
      </button>

      {/* Live AI Status Feedback */}
      {lastResult && (
        <div className="mt-3 p-2.5 bg-slate-900/90 rounded-lg border border-slate-700/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            XGBoost Evaluation Complete
          </div>
          <div className="text-slate-300">
            Precipitation signal ({lastResult.rainfall_mm}mm) injected into terrain matrix.
          </div>
        </div>
      )}
    </div>
  );
}

