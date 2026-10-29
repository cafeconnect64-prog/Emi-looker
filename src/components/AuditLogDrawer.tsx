import React from 'react';
import { AuditLogItem } from '../types/deviceAdmin';
import { Terminal, ShieldAlert, AlertTriangle, Info, Check, Trash2 } from 'lucide-react';

interface AuditLogDrawerProps {
  logs: AuditLogItem[];
  onClearLogs: () => void;
}

export const AuditLogDrawer: React.FC<AuditLogDrawerProps> = ({ logs, onClearLogs }) => {
  return (
    <div className="bg-slate-900/90 border-t border-slate-800 text-xs text-slate-300">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-200">DevicePolicyManager &amp; Receiver Event Stream</span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">({logs.length} events logged)</span>
        </div>

        <button
          onClick={onClearLogs}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear Stream</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-2 max-h-36 overflow-y-auto font-mono text-[11px] space-y-1">
        {logs.length === 0 ? (
          <div className="text-slate-500 py-1 italic">
            No events logged yet. Perform an action in the Policy Architect or Device Simulator to observe DPM event telemetry.
          </div>
        ) : (
          logs.slice(0, 15).map((log) => (
            <div key={log.id} className="flex items-center gap-2 py-0.5 leading-tight">
              <span className="text-slate-500 tabular-nums shrink-0">{log.timestamp}</span>
              {log.level === 'info' && <span className="text-emerald-400 font-semibold">[INFO]</span>}
              {log.level === 'warn' && <span className="text-amber-400 font-semibold">[WARN]</span>}
              {log.level === 'security' && <span className="text-cyan-400 font-semibold">[SECURITY]</span>}
              {log.level === 'danger' && <span className="text-rose-400 font-semibold">[DANGER]</span>}
              {log.policyTag && (
                <span className="text-indigo-400 bg-indigo-950/40 px-1 rounded text-[10px]">
                  &lt;{log.policyTag}&gt;
                </span>
              )}
              <span className="text-slate-300 truncate">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
