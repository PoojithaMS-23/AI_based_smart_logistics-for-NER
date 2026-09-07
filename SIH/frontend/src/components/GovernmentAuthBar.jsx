import React, { useState } from 'react';
import {
  Shield,
  UserCheck,
  Building2,
  Truck,
  Camera,
  PackageCheck,
  ChevronDown,
  LogOut,
  Sparkles,
  Award
} from 'lucide-react';

export default function GovernmentAuthBar({ currentRole, onRoleChange, officerInfo }) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const roles = [
    {
      id: 'GOV_OFFICIAL',
      label: 'Gov Official / Admin',
      title: 'BRO / SDMA Logistics Control',
      icon: Building2,
      badge: 'OFFICIAL ID: AR-SDMA-4821',
      color: 'text-amber-300 border-amber-500 bg-amber-950/60'
    },
    {
      id: 'CITIZEN_SCOUT',
      label: 'TerrainWatch Scout',
      title: 'Crowdsourced Incident Feed',
      icon: Camera,
      badge: 'COMMUNITY SCOUT PORTAL',
      color: 'text-cyan-300 border-cyan-500 bg-cyan-950/60'
    },
    {
      id: 'DRIVER',
      label: 'Transport Driver',
      title: 'Active Convoy Navigation',
      icon: Truck,
      badge: 'DRIVER ID: DRV-AR-9011',
      color: 'text-emerald-300 border-emerald-500 bg-emerald-950/60'
    },
    {
      id: 'RECEIVER',
      label: 'Destination Receiver',
      title: 'Anini Goods Receipt Inspection',
      icon: PackageCheck,
      badge: 'CHECKPOINT ID: RCP-ANINI-881',
      color: 'text-purple-300 border-purple-500 bg-purple-950/60'
    }
  ];

  const active = roles.find((r) => r.id === currentRole) || roles[0];

  return (
    <div className="bg-slate-950 border-b border-slate-800/90 px-4 py-1.5 flex items-center justify-between text-xs shadow-md">
      {/* National Emblem & NER-SANCHAAR Branding */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
          <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/60 flex items-center justify-center font-bold text-amber-300 font-mono text-[10px]">
            GOI
          </div>
          <div>
            <div className="font-extrabold text-[11px] tracking-wider text-slate-100 flex items-center gap-1.5">
              <span>NER-SANCHAAR</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                MoRTH / BRO
              </span>
            </div>
            <div className="text-[9px] text-slate-400">
              Government of India • Disaster Logistics Portal
            </div>
          </div>
        </div>

        {/* Active Official Credentials Display */}
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            {officerInfo.name}
          </span>
          <span className="text-slate-500">•</span>
          <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60 text-[10px]">
            {officerInfo.id}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[10px] italic">
            {officerInfo.designation}
          </span>
        </div>
      </div>

      {/* Role Switcher Selector for Evaluators & Users */}
      <div className="relative">
        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            Operational Portal:
          </span>
          <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSel = r.id === currentRole;
              return (
                <button
                  key={r.id}
                  onClick={() => onRoleChange(r.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    isSel
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-950/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

