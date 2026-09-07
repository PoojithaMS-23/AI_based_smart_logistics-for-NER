import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Send, Radio, AlertOctagon, CheckCircle2, Clock } from 'lucide-react';

const QUEUE_STORAGE_KEY = 'sih_offline_field_reports_queue';

export default function FieldReporterPWA({ segments, onSyncReports }) {
  // Network simulation state (allows evaluating offline queue seamlessly in hackathon demo)
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [isRealOnline, setIsRealOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);

  // Form State
  const [segmentId, setSegmentId] = useState('SEG-07');
  const [hazardType, setHazardType] = useState('Landslide');
  const [severity, setSeverity] = useState('Severe');
  const [reporterId, setReporterId] = useState('BRO Patrol Bravo-6');
  const [notes, setNotes] = useState('Critical boulder slide blocking entire carriageway');

  // Load offline queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        setOfflineQueue(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error reading offline queue:', e);
    }

    const handleOnline = () => setIsRealOnline(true);
    const handleOffline = () => setIsRealOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save offline queue whenever it changes
  const saveQueue = (queue) => {
    setOfflineQueue(queue);
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error('Error storing offline queue:', e);
    }
  };

  const isEffectiveOnline = isRealOnline && !isSimulatedOffline;

  // Auto-sync when effective connection returns
  useEffect(() => {
    if (isEffectiveOnline && offlineQueue.length > 0 && !syncing) {
      triggerSync(offlineQueue);
    }
  }, [isEffectiveOnline, offlineQueue]);

  const triggerSync = async (queueToSync = offlineQueue) => {
    if (queueToSync.length === 0 || syncing) return;
    setSyncing(true);

    try {
      let syncedCount = 0;
      for (const report of queueToSync) {
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        syncedCount++;
      }

      saveQueue([]);
      setSyncNotice(`✅ Auto-synced ${syncedCount} queued field report(s) to HQ! Ground truth override applied.`);
      if (onSyncReports) onSyncReports();
    } catch (err) {
      console.error('Failed to sync queue:', err);
      setSyncNotice('❌ Network sync failed. Reports safely retained in offline vault.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const reportData = {
      id: `LOCAL-${Date.now()}`,
      segment_id: segmentId,
      hazard_type: hazardType,
      severity: severity,
      reporter_id: reporterId,
      notes: notes,
      timestamp: new Date().toLocaleTimeString()
    };

    if (!isEffectiveOnline) {
      // OFFLINE: Store locally
      const updatedQueue = [...offlineQueue, reportData];
      saveQueue(updatedQueue);
      setSyncNotice(`⚡ Stored in Offline Vault! (${updatedQueue.length} pending sync)`);
      setTimeout(() => setSyncNotice(null), 4000);
    } else {
      // ONLINE: Push directly
      setSyncing(true);
      try {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportData)
        });
        if (res.ok) {
          setSyncNotice(`✅ Report transmitted live to HQ! Ground truth applied.`);
          if (onSyncReports) onSyncReports();
        }
      } catch (err) {
        // Network failed during send: fallback to offline queue
        const updatedQueue = [...offlineQueue, reportData];
        saveQueue(updatedQueue);
        setSyncNotice(`⚠️ Network dropped. Saved to offline queue.`);
      } finally {
        setSyncing(false);
        setTimeout(() => setSyncNotice(null), 4000);
      }
    }
  };

  return (
    <div className="tactical-card rounded-xl p-4 text-slate-100 border border-slate-700/80 flex flex-col h-full">
      {/* Header with Connectivity Status */}
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-rose-400" />
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-200">
            Offline Field Operative PWA
          </h3>
        </div>

        {/* Connectivity Pill */}
        <div
          className={`flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${
            isEffectiveOnline
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
              : 'bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse'
          }`}
        >
          {isEffectiveOnline ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>SAT-ONLINE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-rose-400" />
              <span>GORGE DROPOUT (OFFLINE)</span>
            </>
          )}
        </div>
      </div>

      {/* Network Simulator Toggle for Evaluation */}
      <div className="mb-3 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between">
        <div className="text-xs">
          <span className="font-semibold text-slate-300">Simulate Deep Gorge Dropout:</span>
          <p className="text-[10px] text-slate-500">Test offline queue without disconnecting Wi-Fi</p>
        </div>
        <button
          onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
          className={`px-3 py-1 text-xs font-bold rounded-md border transition-all ${
            isSimulatedOffline
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/50'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          {isSimulatedOffline ? 'DISCONNECTED' : 'CONNECTED'}
        </button>
      </div>

      {/* Sync Status Alert Banner */}
      {syncNotice && (
        <div className="mb-3 p-2 rounded-lg bg-slate-900 border border-cyan-700/60 text-xs text-cyan-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Field Report Form */}
      <form onSubmit={handleSubmit} className="space-y-3 flex-1">
        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Hazard Location / Segment
          </label>
          <select
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            {segments?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}: {s.name} ({s.state})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Hazard Classification
            </label>
            <select
              value={hazardType}
              onChange={(e) => setHazardType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="Landslide">Landslide (Debris Slide)</option>
              <option value="Blockade">Rockfall Blockade</option>
              <option value="Flood">Torrential Flash Flood</option>
              <option value="Road Damage">Road Subsidence / Crack</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Observed Severity
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="Severe">Severe (Total Blockage)</option>
              <option value="Medium">Medium (Single Lane Crawl)</option>
              <option value="Low">Low (Passable with Caution)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Operative Unit ID
          </label>
          <input
            type="text"
            value={reporterId}
            onChange={(e) => setReporterId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            Ground Truth Observation Notes
          </label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          />
        </div>

        <button
          type="submit"
          disabled={syncing}
          className={`w-full py-2.5 px-4 font-semibold text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
            isEffectiveOnline
              ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/50'
              : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/50'
          }`}
        >
          {isEffectiveOnline ? (
            <>
              <Send className="w-4 h-4" />
              Transmit Live Ground Truth to HQ
            </>
          ) : (
            <>
              <AlertOctagon className="w-4 h-4" />
              Store in Offline Vault ({offlineQueue.length} Queued)
            </>
          )}
        </button>
      </form>

      {/* Offline Pending Queue Drawer */}
      {offlineQueue.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Offline Queue ({offlineQueue.length} Pending)
            </span>
            {isEffectiveOnline && (
              <button
                onClick={() => triggerSync()}
                disabled={syncing}
                className="text-[10px] font-semibold text-cyan-400 hover:underline"
              >
                Sync Now
              </button>
            )}
          </div>
          <div className="space-y-1.5 max-h-24 overflow-y-auto">
            {offlineQueue.map((item) => (
              <div
                key={item.id}
                className="p-2 rounded bg-slate-900/80 border border-amber-900/50 text-[10px] flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-slate-200">{item.segment_id}</span> -{' '}
                  <span className="text-amber-300">{item.hazard_type}</span> ({item.severity})
                </div>
                <span className="text-slate-500 font-mono">{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

