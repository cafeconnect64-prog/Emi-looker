import React from 'react';
import { ShieldCheck, Download, Smartphone, FileCode2, Layers, Sliders, Server } from 'lucide-react';

interface HeaderProps {
  activeTab: 'architect' | 'simulator' | 'backend' | 'code' | 'fleet' | 'apk';
  setActiveTab: (tab: 'architect' | 'simulator' | 'backend' | 'code' | 'fleet' | 'apk') => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onExport }) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <span className="text-base font-semibold tracking-tight text-white">
          Android Device Admin Studio
        </span>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
        <button
          onClick={() => setActiveTab('architect')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'architect'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Policy Architect</span>
        </button>

        <button
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'simulator'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Device Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'backend'
              ? 'bg-slate-800 text-amber-400 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-amber-400" />
          <span>EMI Cloud Backend</span>
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'code'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span>Code & Manifest</span>
        </button>

        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'fleet'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Fleet & Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('apk')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
            activeTab === 'apk'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/20'
              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Build APK</span>
          <span className="px-1.5 py-0.2 bg-emerald-500/30 text-[10px] text-emerald-300 rounded font-bold uppercase tracking-wider">
            Ready
          </span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-emerald-500/20 active:scale-[0.98]"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Bundle</span>
        </button>
      </div>
    </header>
  );
};
