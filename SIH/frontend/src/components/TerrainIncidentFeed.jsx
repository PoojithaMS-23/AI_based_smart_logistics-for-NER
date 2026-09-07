import React, { useState } from 'react';
import {
  Camera,
  Heart,
  Share2,
  AlertTriangle,
  Radio,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Clock,
  PlusCircle,
  Image as ImageIcon,
  Send,
  Sparkles
} from 'lucide-react';

const PRESET_PHOTOS = [
  {
    name: 'Severe Landslide (New Arzoo)',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    hazard: 'Landslide',
    severity: 'Severe'
  },
  {
    name: 'Mayodia Alpine Rockfall',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    hazard: 'Rockfall',
    severity: 'Moderate'
  },
  {
    name: 'Gorge Mudflow / Slurry',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
    hazard: 'Flash Flood / Slurry',
    severity: 'Severe'
  },
  {
    name: 'Road Subsidence / Crack',
    url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    hazard: 'Road Crack',
    severity: 'Moderate'
  }
];

export default function TerrainIncidentFeed({
  incidents,
  segments,
  onRefresh,
  currentRole,
  onNotifyDrivers
}) {
  const [showModal, setShowModal] = useState(false);
  const [authorName, setAuthorName] = useState('Pemba Tsering');
  const [authorRole, setAuthorRole] = useState('Citizen Scout (Hunli)');
  const [segmentId, setSegmentId] = useState('SEG-06');
  const [hazardType, setHazardType] = useState('Landslide');
  const [severity, setSeverity] = useState('Severe');
  const [caption, setCaption] = useState('Massive 60m rockslide near km 74 marker. Both lanes blocked.');
  const [imageUrl, setImageUrl] = useState(PRESET_PHOTOS[0].url);
  const [submitting, setSubmitting] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: authorName,
          author_role: authorRole,
          segment_id: segmentId,
          hazard_type: hazardType,
          severity: severity,
          image_url: imageUrl,
          caption: caption
        })
      });
      if (res.ok) {
        setShowModal(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to post incident:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (id) => {
    try {
      await fetch(`/api/incidents/${id}/upvote`, { method: 'POST' });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Failed to upvote:', err);
    }
  };

  const handleBroadcastAlert = async (id, segName) => {
    try {
      const res = await fetch(`/api/incidents/${id}/broadcast_alert`, { method: 'POST' });
      if (res.ok) {
        setBroadcastNotice(`🚨 Broadcast Sent: All 14 active convoys on ${segName} notified immediately!`);
        setTimeout(() => setBroadcastNotice(null), 5000);
        if (onRefresh) onRefresh();
        if (onNotifyDrivers) onNotifyDrivers();
      }
    } catch (err) {
      console.error('Failed to broadcast alert:', err);
    }
  };

  const handleVerifyOverride = async (id) => {
    try {
      const res = await fetch(`/api/incidents/${id}/verify_override`, { method: 'POST' });
      if (res.ok) {
        setBroadcastNotice(`🛡️ Ground Truth Verified: Road segment forced to BLOCKED on tactical map!`);
        setTimeout(() => setBroadcastNotice(null), 5000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to verify incident:', err);
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-100 font-sans">
      {/* Feed Action Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
        <div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>TerrainWatch Incident Feed</span>
          </h3>
          <p className="text-[11px] text-slate-400">
            Crowdsourced mountain photos & live terrain hazard reports
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="py-1.5 px-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-cyan-950/60 flex items-center gap-1.5 transition-all active:scale-[0.98]"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Upload Photo</span>
        </button>
      </div>

      {/* Broadcast Alert Toast */}
      {broadcastNotice && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-950/90 border border-rose-600 text-xs text-rose-200 flex items-center gap-2 animate-bounce">
          <Radio className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
          <span className="font-semibold">{broadcastNotice}</span>
        </div>
      )}

      {/* Social Incident Cards List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {incidents?.map((item) => (
          <div
            key={item.id}
            className="tactical-card rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl"
          >
            {/* Author Bar */}
            <div className="p-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white">
                  {item.author_name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                    <span>{item.author_name}</span>
                    {item.verified_by_gov === 1 && (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-700/60">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        BRO VERIFIED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">{item.author_role}</div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 font-mono block">
                  {item.created_at}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    item.severity === 'Severe'
                      ? 'bg-rose-950 text-rose-300 border-rose-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}
                >
                  {item.severity} Hazard
                </span>
              </div>
            </div>

            {/* Location Tag */}
            <div className="px-3 py-1.5 bg-slate-900 flex items-center justify-between text-[11px] border-b border-slate-800/50">
              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{item.segment_name}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-800 px-1.5 py-0.5 rounded">
                {item.hazard_type}
              </span>
            </div>

            {/* Incident Photo */}
            <div className="relative w-full h-44 bg-slate-950 overflow-hidden group">
              <img
                src={item.image_url}
                alt={item.hazard_type}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
              />
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono text-white border border-white/20">
                LIVE CROWDSOURCED TERRAIN
              </div>
            </div>

            {/* Caption */}
            <div className="p-3 text-xs text-slate-200 leading-relaxed">
              {item.caption}
            </div>

            {/* Actions Bar */}
            <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-2">
              <button
                onClick={() => handleUpvote(item.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
              >
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />
                <span className="font-mono text-[11px]">{item.upvotes} Upvotes</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Broadcast to Drivers on Route Button */}
                <button
                  onClick={() => handleBroadcastAlert(item.id, item.segment_name)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                    item.driver_alert_sent === 1
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-md'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                  <span>
                    {item.driver_alert_sent === 1 ? 'Alert Broadcasted' : 'Notify Drivers'}
                  </span>
                </button>

                {/* Gov Verify & Force Blockage Button */}
                {item.verified_by_gov === 0 && (
                  <button
                    onClick={() => handleVerifyOverride(item.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-900/60 hover:bg-rose-800 text-[10px] font-bold text-rose-200 border border-rose-700 transition-all"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verify Block</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {(!incidents || incidents.length === 0) && (
          <div className="p-8 text-center text-xs text-slate-500 italic">
            No incident posts yet. Click "Upload Photo" to post a crowdsourced terrain report.
          </div>
        )}
      </div>

      {/* Upload Photo Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tactical-card rounded-2xl p-5 w-full max-w-md border border-cyan-500/80 bg-slate-950 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Upload Mountain Terrain Photo</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Reporter Identity
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                  <input
                    type="text"
                    value={authorRole}
                    onChange={(e) => setAuthorRole(e.target.value)}
                    placeholder="Role (e.g. Citizen Scout)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Location Sector
                </label>
                <select
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                >
                  {segments?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id}: {s.name}
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="Landslide">Landslide (Mud/Boulder)</option>
                    <option value="Rockfall">Rockfall Debris</option>
                    <option value="Flash Flood / Slurry">Torrential Flash Flood</option>
                    <option value="Road Crack">Road Subsidence / Crack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                  >
                    <option value="Severe">Severe (Impassable)</option>
                    <option value="Moderate">Moderate (Single Lane)</option>
                    <option value="Minor">Minor (Caution Required)</option>
                  </select>
                </div>
              </div>

              {/* Photo Source Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Terrain Photograph (Upload File or Select Mountain Preset)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-cyan-900 file:text-cyan-200 file:cursor-pointer"
                  />
                </div>

                {/* Instant Realistic Mountain Presets */}
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {PRESET_PHOTOS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setImageUrl(p.url);
                        setHazardType(p.hazard);
                        setSeverity(p.severity);
                      }}
                      className={`text-[9px] p-1.5 rounded border text-left flex items-center gap-1.5 transition-all ${
                        imageUrl === p.url
                          ? 'border-cyan-400 bg-cyan-950 text-cyan-200 font-bold'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ImageIcon className="w-3 h-3 flex-shrink-0 text-cyan-400" />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>

                {/* Image Preview */}
                {imageUrl && (
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-slate-800 bg-slate-900">
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Eyewitness Observation Notes
                </label>
                <textarea
                  rows="2"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe the blockage, debris depth, weather conditions..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                Publish Terrain Incident to Feed
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

