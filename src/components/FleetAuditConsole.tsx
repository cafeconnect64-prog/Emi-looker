import React, { useState } from 'react';
import { PolicyConfig, FleetDevice } from '../types/deviceAdmin';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  CheckCircle2, 
  XCircle, 
  Send, 
  HardDrive
} from 'lucide-react';

interface FleetAuditConsoleProps {
  config: PolicyConfig;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
}

export const FleetAuditConsole: React.FC<FleetAuditConsoleProps> = ({ config, onLogAction }) => {
  const [devices, setDevices] = useState<FleetDevice[]>([
    {
      id: 'dev-001',
      name: 'Executive Pixel 9 Pro',
      model: 'Google Pixel 9 Pro',
      osVersion: 'Android 15 (AP2A)',
      serialNumber: '9P01-29481-AK',
      status: 'compliant',
      lastPolicySync: '2 minutes ago',
      battery: 88,
      passcodeQuality: 'numeric_complex (8 digits)',
      encryptionActive: true,
    },
    {
      id: 'dev-002',
      name: 'Field Ops Galaxy S24',
      model: 'Samsung Galaxy S24',
      osVersion: 'Android 14 (One UI 6.1)',
      serialNumber: 'S24-91023-BX',
      status: 'compliant',
      lastPolicySync: '14 minutes ago',
      battery: 64,
      passcodeQuality: 'alphanumeric (10 chars)',
      encryptionActive: true,
    },
    {
      id: 'dev-003',
      name: 'Warehouse Scanner Zebra',
      model: 'Zebra TC57 Enterprise',
      osVersion: 'Android 13 (Rugged)',
      serialNumber: 'ZB-48201-ET',
      status: 'non_compliant',
      lastPolicySync: '3 hours ago',
      battery: 41,
      passcodeQuality: 'numeric (4 digits - policy requires ' + config.limitPassword.minLength + ')',
      encryptionActive: true,
    },
    {
      id: 'dev-004',
      name: 'Retail Kiosk Terminal',
      model: 'Lenovo Tab M11',
      osVersion: 'Android 14 (Dedicated)',
      serialNumber: 'LN-77391-KS',
      status: 'locked',
      lastPolicySync: '41 minutes ago',
      battery: 99,
      passcodeQuality: 'numeric (6 digits)',
      encryptionActive: true,
    },
  ]);

  const pushPolicyToFleet = () => {
    setDevices(prev =>
      prev.map(d => ({
        ...d,
        status: 'compliant',
        lastPolicySync: 'Just now',
        passcodeQuality: `${config.limitPassword.minQuality} (min ${config.limitPassword.minLength})`,
      }))
    );
    onLogAction('security', 'Mass policy payload deployed to all fleet endpoints via FCM push');
  };

  const lockNonCompliant = () => {
    setDevices(prev =>
      prev.map(d =>
        d.status === 'non_compliant'
          ? { ...d, status: 'locked', lastPolicySync: 'Just now' }
          : d
      )
    );
    onLogAction('warn', 'Force-locked non-compliant fleet endpoints (<force-lock />)', 'force-lock');
  };

  const compliantCount = devices.filter(d => d.status === 'compliant').length;
  const complianceRate = Math.round((compliantCount / devices.length) * 100);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Fleet KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-400 text-xs font-medium">Total Enrolled Devices</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            {devices.length}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>100% Device Owner provisioned</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-400 text-xs font-medium">Policy Compliance Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">
            {complianceRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>{compliantCount} of {devices.length} conforming to XML</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-400 text-xs font-medium">Storage Encryption Status</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono tabular-nums">
            100%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <HardDrive className="w-3 h-3 text-cyan-400" />
            <span>Hardware FBE active</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-slate-400 text-xs font-medium">Active Policy Rule-count</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">
            {[config.limitPassword.enabled, config.forceLock.enabled, config.wipeData.enabled, config.disableCamera.enabled, config.encryptedStorage.enabled].filter(Boolean).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            <span>Enforced via DevicePolicyManager</span>
          </div>
        </div>
      </div>

      {/* Fleet Control Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">Fleet Device Audit &amp; Policy Deployment</h3>
          <div className="text-xs text-slate-400 mt-0.5">
            <span>Enforce password constraints, remote lock, and remote wipe across connected fleet</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={lockNonCompliant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Non-Compliant</span>
          </button>

          <button
            onClick={pushPolicyToFleet}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Deploy Active XML to Fleet</span>
          </button>
        </div>
      </div>

      {/* High Density Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Device Identity</th>
                <th className="px-4 py-3">Platform OS</th>
                <th className="px-4 py-3">Passcode State</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{device.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {device.model} · S/N: {device.serialNumber}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                    {device.osVersion}
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-mono text-[11px] text-slate-300">
                      {device.passcodeQuality}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Sync: {device.lastPolicySync}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {device.status === 'compliant' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Compliant</span>
                      </span>
                    )}
                    {device.status === 'non_compliant' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <XCircle className="w-3 h-3" />
                        <span>Non-Compliant</span>
                      </span>
                    )}
                    {device.status === 'locked' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Lock className="w-3 h-3" />
                        <span>Force Locked</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setDevices(prev =>
                            prev.map(d =>
                              d.id === device.id ? { ...d, status: 'locked' } : d
                            )
                          );
                          onLogAction('warn', `Sent remote lockNow() to ${device.name}`, 'force-lock');
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-colors"
                      >
                        Lock
                      </button>

                      <button
                        onClick={() => {
                          setDevices(prev =>
                            prev.map(d =>
                              d.id === device.id
                                ? {
                                    ...d,
                                    status: 'compliant',
                                    passcodeQuality: `${config.limitPassword.minQuality} (${config.limitPassword.minLength} chars)`,
                                    lastPolicySync: 'Just now',
                                  }
                                : d
                            )
                          );
                          onLogAction('info', `Applied policy to ${device.name}`);
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-medium transition-colors"
                      >
                        Sync
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
