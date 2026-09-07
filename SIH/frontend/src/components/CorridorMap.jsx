import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Mountain, Navigation, Compass, AlertOctagon, Zap, Shield, Check, Info } from 'lucide-react';

const STATE_COLORS = {
  'OPEN': '#10b981',
  'CONSTRAINED': '#f97316',
  'HIGH-RISK': '#eab308',
  'DISRUPTED': '#a855f7',
  'BLOCKED': '#ef4444'
};

const BASEMAPS = {
  dark: {
    name: 'Tactical Dark',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & OpenStreetMap contributors'
  },
  satellite: {
    name: 'Satellite Terrain',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri & Maxar'
  }
};

export default function CorridorMap({ corridorData, onSelectSegment, onUpdateSegmentState }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    baseTile: null,
    segments: null,
    activeRoute: null,
    nodes: null,
    convoy: null
  });

  const [activeBasemap, setActiveBasemap] = useState('dark');
  const [selectedSeg, setSelectedSeg] = useState(null);
  const [convoyStep, setConvoyStep] = useState(0);
  const [showElevationProfile, setShowElevationProfile] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [28.52, 95.91],
        zoom: 10,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Base tile layer
      layersRef.current.baseTile = L.tileLayer(BASEMAPS.dark.url, {
        attribution: BASEMAPS.dark.attribution,
        maxZoom: 18
      }).addTo(map);

      // Groups
      layersRef.current.segments = L.layerGroup().addTo(map);
      layersRef.current.activeRoute = L.layerGroup().addTo(map);
      layersRef.current.nodes = L.layerGroup().addTo(map);
      layersRef.current.convoy = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Switch Basemap
  const toggleBasemap = () => {
    const next = activeBasemap === 'dark' ? 'satellite' : 'dark';
    setActiveBasemap(next);
    const map = mapInstanceRef.current;
    if (map && layersRef.current.baseTile) {
      map.removeLayer(layersRef.current.baseTile);
      layersRef.current.baseTile = L.tileLayer(BASEMAPS[next].url, {
        attribution: BASEMAPS[next].attribution,
        maxZoom: 18
      }).addTo(map);
    }
  };

  // Render Map Features
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !corridorData || !corridorData.nodes || !corridorData.segments) return;

    const { segments: segLayer, activeRoute: routeLayer, nodes: nodeLayer } = layersRef.current;
    segLayer.clearLayers();
    routeLayer.clearLayers();
    nodeLayer.clearLayers();

    const nodeMap = {};
    corridorData.nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });

    // 1. Draw Road Segments
    corridorData.segments.forEach((seg) => {
      const fromNode = nodeMap[seg.from_node];
      const toNode = nodeMap[seg.to_node];
      if (!fromNode || !toNode) return;

      const latlngs = [
        [fromNode.lat, fromNode.lng],
        [toNode.lat, toNode.lng]
      ];

      const color = STATE_COLORS[seg.state] || '#10b981';
      const isBypass = seg.is_bypass === 1;

      // Glow backdrop
      const glowLine = L.polyline(latlngs, {
        color: color,
        weight: seg.state === 'BLOCKED' ? 14 : 10,
        opacity: seg.state === 'BLOCKED' ? 0.45 : 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      });
      segLayer.addLayer(glowLine);

      // Core line
      const line = L.polyline(latlngs, {
        color: color,
        weight: seg.state === 'BLOCKED' ? 7 : 5,
        opacity: 0.95,
        dashArray: isBypass ? '8, 8' : undefined,
        lineCap: 'round',
        lineJoin: 'round'
      });

      line.on('click', () => {
        setSelectedSeg(seg);
        if (onSelectSegment) onSelectSegment(seg);
      });

      // Quick hover tooltip
      line.bindTooltip(
        `<div class="p-1">
          <div class="font-bold text-xs">${seg.name}</div>
          <div class="text-[10px] text-slate-300 font-mono">Status: <span style="color:${color};font-weight:bold">${seg.state}</span> | Risk: ${(seg.risk_score * 100).toFixed(0)}%</div>
          <div class="text-[9px] text-cyan-400 font-semibold mt-0.5">Click to Open Tactical HUD & Actions</div>
        </div>`,
        { sticky: true, className: 'leaflet-tactical-tooltip' }
      );

      segLayer.addLayer(line);
    });

    // 2. Draw Active A* Route
    if (corridorData.optimal_route?.success && corridorData.optimal_route.path_nodes) {
      const pathNodes = corridorData.optimal_route.path_nodes;
      const pathCoords = [];

      for (const nid of pathNodes) {
        if (nodeMap[nid]) {
          pathCoords.push([nodeMap[nid].lat, nodeMap[nid].lng]);
        }
      }

      if (pathCoords.length > 1) {
        const activeRouteGlow = L.polyline(pathCoords, {
          color: '#38bdf8',
          weight: 4,
          opacity: 0.95,
          dashArray: '10, 14',
          className: 'route-glow-path'
        });
        routeLayer.addLayer(activeRouteGlow);
      }
    }

    // 3. Draw Nodes Markers
    corridorData.nodes.forEach((node) => {
      let markerColor = '#3b82f6';
      let markerBorder = '#ffffff';
      let iconHtml = '';

      if (node.id === 'N1') {
        // Roing Base Depot
        iconHtml = `<div class="w-6 h-6 rounded-full bg-cyan-500 border-2 border-white shadow-[0_0_15px_#06b6d4] flex items-center justify-center text-[10px] font-bold text-slate-950 font-mono">DEP</div>`;
      } else if (node.id === 'N11') {
        // Anini District HQ
        iconHtml = `<div class="w-6 h-6 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_15px_#10b981] flex items-center justify-center text-[10px] font-bold text-slate-950 font-mono">HQ</div>`;
      } else if (node.id === 'N3') {
        // Mayodia Alpine Pass
        iconHtml = `<div class="w-5 h-5 bg-rose-500 border-2 border-white rotate-45 shadow-[0_0_12px_#f43f5e] flex items-center justify-center"><div class="-rotate-45 text-[8px] font-bold text-white">2655m</div></div>`;
      } else if (node.id === 'N13') {
        // Chipi Ridge Bypass
        iconHtml = `<div class="w-5 h-5 rounded-md bg-purple-500 border-2 border-white shadow-[0_0_12px_#a855f7] flex items-center justify-center text-[8px] font-bold text-white font-mono">BYP</div>`;
      } else {
        iconHtml = `<div class="w-3.5 h-3.5 rounded-full bg-slate-200 border-2 border-cyan-500 shadow-[0_0_8px_#06b6d4]"></div>`;
      }

      const customIcon = L.divIcon({
        className: 'tactical-marker',
        html: iconHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon });
      marker.bindPopup(`
        <div style="font-family: 'Inter', sans-serif; min-width: 210px; padding: 4px;">
          <div style="font-size: 13px; font-weight: 800; color: #38bdf8;">${node.name}</div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.4;">
            <div><strong>Sector ID:</strong> ${node.id}</div>
            <div><strong>Altitude:</strong> <span style="color:#f59e0b;font-weight:700;">${node.elevation_m} meters</span></div>
            <div><strong>Coordinates:</strong> ${node.lat.toFixed(4)}°N, ${node.lng.toFixed(4)}°E</div>
            <div style="margin-top: 4px; color: #cbd5e1; font-style: italic;">${node.description}</div>
          </div>
        </div>
      `);
      nodeLayer.addLayer(marker);
    });

  }, [corridorData]);

  // Moving Convoy Animation Loop
  useEffect(() => {
    if (!corridorData?.optimal_route?.path_nodes || !corridorData?.nodes) return;
    const pathNodes = corridorData.optimal_route.path_nodes;
    if (pathNodes.length < 2) return;

    const nodeMap = {};
    corridorData.nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });

    const interval = setInterval(() => {
      setConvoyStep((prev) => (prev + 1) % pathNodes.length);
    }, 2400);

    return () => clearInterval(interval);
  }, [corridorData?.optimal_route]);

  // Render animated moving convoy marker on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !corridorData?.optimal_route?.path_nodes || !corridorData?.nodes) return;

    const { convoy: convoyLayer } = layersRef.current;
    convoyLayer.clearLayers();

    const pathNodes = corridorData.optimal_route.path_nodes;
    const currentNodeId = pathNodes[convoyStep] || pathNodes[0];
    const nodeObj = corridorData.nodes.find((n) => n.id === currentNodeId);

    if (nodeObj) {
      const convoyIcon = L.divIcon({
        className: 'convoy-live-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-cyan-500/30 animate-ping"></div>
            <div class="w-6 h-6 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-[0_0_15px_#22d3ee] flex items-center justify-center text-xs">
              🚚
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const convoyMarker = L.marker([nodeObj.lat, nodeObj.lng], { icon: convoyIcon });
      convoyMarker.bindTooltip(
        `<div class="font-mono text-[10px] font-bold text-cyan-300">
          CONVOY IN TRANSIT: At ${nodeObj.name}
        </div>`,
        { permanent: false, direction: 'top' }
      );
      convoyLayer.addLayer(convoyMarker);
    }
  }, [convoyStep, corridorData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Control Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2 pointer-events-auto">
        {/* Basemap Toggle Button */}
        <button
          onClick={toggleBasemap}
          className="tactical-card px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700/80 shadow-2xl flex items-center gap-2 hover:border-cyan-500 transition-all bg-slate-900/90"
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>{activeBasemap === 'dark' ? 'Satellite View' : 'Tactical Dark'}</span>
        </button>

        {/* Elevation Profile Button */}
        <button
          onClick={() => setShowElevationProfile(!showElevationProfile)}
          className="tactical-card px-3 py-2 rounded-lg text-xs font-semibold text-slate-200 border border-slate-700/80 shadow-2xl flex items-center gap-2 hover:border-amber-500 transition-all bg-slate-900/90"
        >
          <Mountain className="w-4 h-4 text-amber-400" />
          <span>{showElevationProfile ? 'Hide Elevation Profile' : 'Terrain Profile'}</span>
        </button>
      </div>

      {/* Floating Tactical Legend (Top Left) */}
      <div className="absolute top-4 left-4 z-[500] tactical-card rounded-xl p-3.5 text-xs pointer-events-auto border border-slate-700/80 shadow-2xl max-w-[250px] bg-slate-900/90 backdrop-blur-md">
        <div className="font-extrabold text-slate-100 uppercase tracking-wider mb-2.5 flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-cyan-400" />
            NH-313 Corridor
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
            DIBANG
          </span>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span>
              <span className="text-slate-300 font-medium">OPEN</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">1.0x Cost</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#f97316] shadow-[0_0_8px_#f97316]"></span>
              <span className="text-slate-300 font-medium">CONSTRAINED</span>
            </span>
            <span className="text-[10px] text-amber-500 font-mono">2.8x Crawl</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#eab308] shadow-[0_0_8px_#eab308]"></span>
              <span className="text-slate-300 font-medium">HIGH-RISK</span>
            </span>
            <span className="text-[10px] text-yellow-400 font-mono">10x Penalty</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#a855f7] shadow-[0_0_8px_#a855f7]"></span>
              <span className="text-slate-300 font-medium">DISRUPTED</span>
            </span>
            <span className="text-[10px] text-purple-400 font-mono">20x Delay</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_10px_#ef4444] animate-pulse"></span>
              <span className="text-red-400 font-bold">BLOCKED</span>
            </span>
            <span className="text-[10px] text-red-400 font-mono font-bold">IMPASSABLE</span>
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="w-5 h-1 rounded bg-cyan-400 route-glow-path"></span>
            <span className="text-cyan-300 font-semibold">Active Convoy Path</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 border-t border-dashed border-purple-400"></span>
            <span className="text-purple-300 font-medium">Chipi Mountain Bypass</span>
          </div>
        </div>
      </div>

      {/* Interactive Sector HUD Modal (When Segment Clicked) */}
      {selectedSeg && (
        <div className="absolute top-4 left-[280px] z-[600] tactical-card rounded-xl p-4 text-xs pointer-events-auto border border-cyan-500/80 shadow-2xl w-[320px] bg-slate-950/95 animate-fadeIn">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {selectedSeg.id}
              </span>
              <h4 className="font-extrabold text-slate-100 text-sm mt-0.5">{selectedSeg.name}</h4>
            </div>
            <button
              onClick={() => setSelectedSeg(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 mb-3 text-[11px]">
            <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 text-[10px]">Slope Gradient:</span>
                <div className="font-mono font-bold text-amber-400">{selectedSeg.slope_deg}° Incline</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">Distance:</span>
                <div className="font-mono font-bold text-slate-200">{selectedSeg.distance_km} km</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">24h Rainfall:</span>
                <div className="font-mono font-bold text-cyan-400">{selectedSeg.rainfall_mm} mm</div>
              </div>
              <div>
                <span className="text-slate-500 text-[10px]">AI Risk Gauge:</span>
                <div className="font-mono font-bold text-rose-400">
                  {(selectedSeg.risk_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {selectedSeg.override_reason && (
              <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-[10px] text-rose-300">
                ⚠️ <strong>Override:</strong> {selectedSeg.override_reason}
              </div>
            )}
          </div>

          {/* Quick Segment Actions */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Quick Sector Command Override:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  onUpdateSegmentState(selectedSeg.id, 'BLOCKED', 'Manual Tactical Blockage Triggered');
                  setSelectedSeg(null);
                }}
                className="py-1.5 px-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-[10px] rounded border border-rose-800 flex items-center justify-center gap-1"
              >
                🔴 Mark BLOCKED
              </button>
              <button
                onClick={() => {
                  onUpdateSegmentState(selectedSeg.id, 'CONSTRAINED', '1-Lane BRO Clearance Active');
                  setSelectedSeg(null);
                }}
                className="py-1.5 px-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 font-bold text-[10px] rounded border border-amber-800 flex items-center justify-center gap-1"
              >
                🟠 Set CONSTRAINED
              </button>
              <button
                onClick={() => {
                  onUpdateSegmentState(selectedSeg.id, 'HIGH-RISK', 'Geological Hazard Warning');
                  setSelectedSeg(null);
                }}
                className="py-1.5 px-2 bg-yellow-950/80 hover:bg-yellow-900 text-yellow-300 font-bold text-[10px] rounded border border-yellow-800 flex items-center justify-center gap-1"
              >
                🟡 Set HIGH-RISK
              </button>
              <button
                onClick={() => {
                  onUpdateSegmentState(selectedSeg.id, 'OPEN', 'Sector Fully Restored');
                  setSelectedSeg(null);
                }}
                className="py-1.5 px-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold text-[10px] rounded border border-emerald-800 flex items-center justify-center gap-1"
              >
                🟢 Clear to OPEN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Elevation Profile Drawer (Bottom) */}
      {showElevationProfile && (
        <div className="absolute bottom-20 left-4 right-[450px] z-[500] tactical-card rounded-xl p-3 border border-slate-700 bg-slate-950/95 shadow-2xl">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="font-bold text-amber-400 flex items-center gap-1.5">
              <Mountain className="w-4 h-4" />
              NH-313 Mountain Elevation Profile (Roing 390m ➔ Mayodia Pass 2655m ➔ Anini 1968m)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Dibang Valley Cross-Section</span>
          </div>
          <div className="flex items-end gap-1 h-20 px-2 pt-2 bg-slate-900/80 rounded-lg border border-slate-800 overflow-x-auto">
            {corridorData?.nodes?.map((n) => {
              const heightPct = Math.round((n.elevation_m / 2700) * 100);
              const isPass = n.id === 'N3';
              const isHQ = n.id === 'N11';
              return (
                <div key={n.id} className="flex-1 min-w-[36px] flex flex-col items-center group relative">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-4 rounded-t transition-all ${
                      isPass
                        ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                        : isHQ
                        ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                        : 'bg-cyan-600/80 group-hover:bg-cyan-400'
                    }`}
                  ></div>
                  <span className="text-[8px] font-mono text-slate-400 mt-1 truncate max-w-full">
                    {n.id}
                  </span>
                  {/* Tooltip */}
                  <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-950 border border-cyan-500 px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap z-50 text-cyan-300">
                    <span>{n.name}</span>
                    <span>{n.elevation_m}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Routing Banner (Bottom Left) */}
      {corridorData?.optimal_route && (
        <div className="absolute bottom-4 left-4 z-[500] tactical-card rounded-xl p-3.5 max-w-lg text-xs border border-slate-700 shadow-2xl bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-1.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  corridorData.optimal_route.bypass_active
                    ? 'bg-amber-400 animate-ping shadow-[0_0_10px_#f59e0b]'
                    : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'
                }`}
              ></span>
              <span className="font-extrabold text-slate-100 uppercase tracking-wide text-xs">
                {corridorData.optimal_route.bypass_active
                  ? '⚠️ BYPASS ACTIVE: DESALI-CHIPI ROUTE'
                  : '✅ PRIMARY HIGHWAY: NH-313 DIRECT'}
              </span>
            </div>
            <div className="font-mono text-cyan-400 font-extrabold text-sm bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              {corridorData.optimal_route.total_distance_km} km
            </div>
          </div>

          <p className="text-slate-300 text-[11px] leading-relaxed">
            {corridorData.optimal_route.reasoning}
          </p>

          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>
              Traversing: {corridorData.optimal_route.path_nodes?.length || 0} Strategic Mountain Nodes
            </span>
            <span className="text-cyan-400">
              A* Risk Cost: {corridorData.optimal_route.risk_weighted_cost}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
