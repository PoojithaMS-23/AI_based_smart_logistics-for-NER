import React, { useState } from 'react';
import {
  PackageCheck,
  CheckCircle,
  FileCheck2,
  Building,
  ShieldCheck,
  Award,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function DestinationGoodsReceiver({
  transports,
  onRefresh,
  officerId = 'OFFICER-ANINI-881'
}) {
  const [selectedTrp, setSelectedTrp] = useState(null);
  const [notes, setNotes] = useState(
    'Consignment received in full. Cold-chain seals verified at 4°C. Weight verified.'
  );
  const [confirming, setConfirming] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  const handleConfirmReceipt = async (trpId) => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/transports/${trpId}/confirm_received`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_officer_id: officerId,
          receiver_notes: notes
        })
      });
      if (res.ok) {
        setSuccessToast(`Consignment ${trpId} verified & counter-signed! Receipt registered in HQ database.`);
        setTimeout(() => setSuccessToast(null), 5000);
        setSelectedTrp(null);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to confirm receipt:', err);
    } finally {
      setConfirming(false);
    }
  };

  const inTransit = transports?.filter((t) => t.status === 'IN-TRANSIT') || [];
  const confirmed = transports?.filter((t) => t.status === 'DELIVERED_CONFIRMED') || [];

  return (
    <div className="flex flex-col h-full text-slate-100 font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-purple-400" />
            <span>Destination Goods Receipt & Inspection</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Terminal Checkpoint Verification • Anini District HQ / General Hospital
          </p>
        </div>

        <div className="font-mono text-xs px-2.5 py-1 rounded bg-purple-950/80 text-purple-300 border border-purple-700/80">
          OFFICER: {officerId}
        </div>
      </div>

      {successToast && (
        <div className="p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-600 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* In-Transit Shipments Awaiting Confirmation */}
      <div className="space-y-3">
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" />
          <span>Arriving Shipments Requiring Confirmation ({inTransit.length})</span>
        </h4>

        {inTransit.length === 0 && (
          <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/60 text-center text-xs text-slate-500 italic">
            No active shipments currently awaiting inspection. All arriving convoys processed.
          </div>
        )}

        {inTransit.map((trp) => (
          <div
            key={trp.id}
            className="tactical-card rounded-xl p-4 border border-amber-600/60 bg-amber-950/20 text-xs space-y-2.5"
          >
            <div className="flex items-center justify-between border-b border-amber-800/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-cyan-300 text-xs">{trp.id}</span>
                <span className="font-mono font-bold text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                  {trp.vehicle_number}
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 animate-pulse">
                IN-TRANSIT
              </span>
            </div>

            <div className="text-[11px] grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 text-[10px]">Driver:</span>
                <div className="font-bold text-slate-200">{trp.driver_name} ({trp.driver_phone})</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px]">Cargo Classification:</span>
                <div className="font-bold text-amber-300">{trp.cargo_type} ({trp.weight_tons} Tons)</div>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              <strong>Manifest Details:</strong> {trp.cargo_details}
            </div>

            <button
              onClick={() => setSelectedTrp(trp)}
              className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-md flex items-center justify-center gap-1.5 transition-all"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Inspect & Confirm Goods Received</span>
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {selectedTrp && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tactical-card rounded-2xl p-5 w-full max-w-md border border-purple-500/80 bg-slate-950 shadow-2xl animate-fadeIn text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Goods Receipt & Seal Inspection Sign-Off</span>
              </h3>
              <button
                onClick={() => setSelectedTrp(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <div>
                  <strong>Consignment ID:</strong> <span className="font-mono text-cyan-300">{selectedTrp.id}</span>
                </div>
                <div>
                  <strong>Vehicle / Driver:</strong> {selectedTrp.vehicle_number} ({selectedTrp.driver_name})
                </div>
                <div>
                  <strong>Cargo Manifest:</strong> {selectedTrp.cargo_details}
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-purple-500 rounded" />
                  <span>Tamper-evident cargo seals inspected & intact</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-purple-500 rounded" />
                  <span>Cold-chain temperature verified (Medicines/Vaccines at 4°C)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input type="checkbox" defaultChecked className="accent-purple-500 rounded" />
                  <span>Gross vehicle weigh-in matches manifest specifications</span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Receiving Inspector Remarks & Seal Code
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <button
                onClick={() => handleConfirmReceipt(selectedTrp.id)}
                disabled={confirming}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-lg shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>CONFIRM GOODS RECEIVED & COUNTERSIGN</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Past Shipments History */}
      <div className="space-y-3 flex-1 overflow-y-auto pt-2 border-t border-slate-800">
        <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
          <Award className="w-3.5 h-3.5" />
          <span>Confirmed Consignments History ({confirmed.length})</span>
        </h4>

        {confirmed.map((trp) => (
          <div
            key={trp.id}
            className="p-3 rounded-xl border border-emerald-900/60 bg-emerald-950/20 text-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-200">{trp.id} ({trp.vehicle_number})</span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                DELIVERED & VERIFIED
              </span>
            </div>
            <div className="text-[11px] text-emerald-200">{trp.cargo_details}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Signed by {trp.receiver_officer_id || officerId} on {trp.received_at || 'Recently'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

