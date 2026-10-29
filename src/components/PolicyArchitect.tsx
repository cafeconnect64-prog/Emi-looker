import React, { useState, useEffect } from 'react';
import { 
  PolicyConfig 
} from '../types/deviceAdmin';
import { 
  INITIAL_USER_XML, 
  generateXmlFromConfig, 
  parseXmlToConfig 
} from '../utils/xmlParser';
import { 
  KeyRound, 
  Lock, 
  Trash2, 
  CameraOff, 
  ShieldAlert, 
  Copy, 
  Check, 
  RotateCcw, 
  AlertTriangle, 
  Info, 
  Fingerprint, 
  Eye, 
  FileCheck2,
  HardDrive,
  QrCode
} from 'lucide-react';
import { MdmQrEnrollmentCard } from './MdmQrEnrollmentCard';

interface PolicyArchitectProps {
  config: PolicyConfig;
  onChangeConfig: (newConfig: PolicyConfig) => void;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
  onTestInSimulator?: () => void;
}

export const PolicyArchitect: React.FC<PolicyArchitectProps> = ({
  config,
  onChangeConfig,
  onLogAction,
  onTestInSimulator,
}) => {
  const [xmlText, setXmlText] = useState(() => generateXmlFromConfig(config));
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState<'user' | 'strict' | 'kiosk' | 'byod' | 'all'>('user');
  const [rightPanelTab, setRightPanelTab] = useState<'qr' | 'xml'>('qr');

  // Keep xmlText synced when config changes from external controls
  useEffect(() => {
    const generated = generateXmlFromConfig(config);
    if (generated.trim() !== xmlText.trim()) {
      setXmlText(generated);
      setXmlError(null);
    }
  }, [config]);

  const handleXmlChange = (val: string) => {
    setXmlText(val);
    const { config: parsedConfig, error } = parseXmlToConfig(val, config);
    if (error) {
      setXmlError(error);
    } else {
      setXmlError(null);
      onChangeConfig(parsedConfig);
      onLogAction('info', 'Policy XML synchronized from code editor');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(xmlText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onLogAction('info', 'Copied device_admin.xml to clipboard');
  };

  const handleResetToUserXml = () => {
    setXmlText(INITIAL_USER_XML);
    const { config: parsedConfig } = parseXmlToConfig(INITIAL_USER_XML, config);
    onChangeConfig(parsedConfig);
    setActivePreset('user');
    onLogAction('warn', 'Reset policy to initial XML (<limit-password>, <force-lock>, <wipe-data>)', 'device-admin');
  };

  const applyPreset = (preset: 'user' | 'strict' | 'kiosk' | 'byod' | 'all') => {
    setActivePreset(preset);
    let newConf: PolicyConfig;

    if (preset === 'user') {
      newConf = {
        ...config,
        limitPassword: { ...config.limitPassword, enabled: true, minQuality: 'numeric_complex', minLength: 6, maxFailedAttempts: 5 },
        forceLock: { ...config.forceLock, enabled: true, maxTimeToLockSec: 120 },
        wipeData: { ...config.wipeData, enabled: true, wipeExternalStorage: true },
        resetPassword: { ...config.resetPassword, enabled: false },
        watchLogin: { ...config.watchLogin, enabled: false },
        disableCamera: { ...config.disableCamera, enabled: false },
        encryptedStorage: { ...config.encryptedStorage, enabled: false },
        disableKeyguardFeatures: { ...config.disableKeyguardFeatures, enabled: false },
        expirePassword: { ...config.expirePassword, enabled: false },
      };
      onLogAction('info', 'Loaded User XML Preset: limit-password, force-lock, wipe-data');
    } else if (preset === 'strict') {
      newConf = {
        ...config,
        limitPassword: { ...config.limitPassword, enabled: true, minQuality: 'complex', minLength: 10, maxFailedAttempts: 5, expirationDays: 60 },
        forceLock: { ...config.forceLock, enabled: true, maxTimeToLockSec: 60, customLockMessage: 'Secured Enterprise Asset - IT Ops' },
        wipeData: { ...config.wipeData, enabled: true, wipeExternalStorage: true, wipeResetProtection: true },
        disableCamera: { ...config.disableCamera, enabled: true },
        encryptedStorage: { ...config.encryptedStorage, enabled: true },
        disableKeyguardFeatures: { ...config.disableKeyguardFeatures, enabled: true, disableFingerprint: true },
        watchLogin: { ...config.watchLogin, enabled: true },
        resetPassword: { ...config.resetPassword, enabled: false },
        expirePassword: { ...config.expirePassword, enabled: true, daysToExpire: 60 },
      };
      onLogAction('security', 'Applied Strict Enterprise / Defense preset');
    } else if (preset === 'kiosk') {
      newConf = {
        ...config,
        limitPassword: { ...config.limitPassword, enabled: true, minQuality: 'numeric', minLength: 4, maxFailedAttempts: 10 },
        forceLock: { ...config.forceLock, enabled: true, maxTimeToLockSec: 30, customLockMessage: 'Terminal Locked - Authorized Personnel Only' },
        wipeData: { ...config.wipeData, enabled: true, wipeExternalStorage: false },
        disableCamera: { ...config.disableCamera, enabled: false },
        encryptedStorage: { ...config.encryptedStorage, enabled: true },
        disableKeyguardFeatures: { ...config.disableKeyguardFeatures, enabled: true, disableWidgets: true, disableNotifications: true },
        watchLogin: { ...config.watchLogin, enabled: false },
        resetPassword: { ...config.resetPassword, enabled: false },
        expirePassword: { ...config.expirePassword, enabled: false },
      };
      onLogAction('info', 'Applied Retail Kiosk / POS Dedicated preset');
    } else if (preset === 'byod') {
      newConf = {
        ...config,
        limitPassword: { ...config.limitPassword, enabled: true, minQuality: 'alphanumeric', minLength: 8, maxFailedAttempts: 8 },
        forceLock: { ...config.forceLock, enabled: true, maxTimeToLockSec: 300, customLockMessage: 'Work Profile Protected' },
        wipeData: { ...config.wipeData, enabled: true, wipeExternalStorage: false }, // Only wipes work partition
        disableCamera: { ...config.disableCamera, enabled: false },
        encryptedStorage: { ...config.encryptedStorage, enabled: true },
        disableKeyguardFeatures: { ...config.disableKeyguardFeatures, enabled: false },
        watchLogin: { ...config.watchLogin, enabled: true },
        resetPassword: { ...config.resetPassword, enabled: false },
        expirePassword: { ...config.expirePassword, enabled: false },
      };
      onLogAction('info', 'Applied BYOD Work Profile container preset');
    } else {
      // all
      newConf = {
        limitPassword: { ...config.limitPassword, enabled: true },
        forceLock: { ...config.forceLock, enabled: true },
        wipeData: { ...config.wipeData, enabled: true },
        resetPassword: { ...config.resetPassword, enabled: true },
        watchLogin: { ...config.watchLogin, enabled: true },
        disableCamera: { ...config.disableCamera, enabled: true },
        encryptedStorage: { ...config.encryptedStorage, enabled: true },
        disableKeyguardFeatures: { ...config.disableKeyguardFeatures, enabled: true },
        expirePassword: { ...config.expirePassword, enabled: true },
      };
      onLogAction('warn', 'Enabled all available Android Device Admin policies');
    }

    onChangeConfig(newConf);
  };

  const togglePolicy = (policyKey: keyof PolicyConfig) => {
    const current = config[policyKey].enabled;
    const updated = {
      ...config,
      [policyKey]: {
        ...config[policyKey],
        enabled: !current,
      },
    };
    onChangeConfig(updated);
    onLogAction(
      !current ? 'security' : 'warn',
      `${!current ? 'Enabled' : 'Disabled'} policy: <${getTagName(policyKey)} />`,
      getTagName(policyKey)
    );
  };

  const getTagName = (key: keyof PolicyConfig): string => {
    switch (key) {
      case 'limitPassword': return 'limit-password';
      case 'forceLock': return 'force-lock';
      case 'wipeData': return 'wipe-data';
      case 'resetPassword': return 'reset-password';
      case 'watchLogin': return 'watch-login';
      case 'disableCamera': return 'disable-camera';
      case 'encryptedStorage': return 'encrypted-storage';
      case 'disableKeyguardFeatures': return 'disable-keyguard-features';
      case 'expirePassword': return 'expire-password';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
      {/* Left Column: Interactive Policy Controls (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Preset Selector Banner */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Enterprise Policy Profiles</h2>
              <div className="text-xs text-slate-400 mt-0.5">
                <span>Select a compliant baseline or configure granular sub-rules</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800/80 rounded-lg">
              <button
                onClick={() => applyPreset('user')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === 'user'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                User Initial XML
              </button>
              <button
                onClick={() => applyPreset('strict')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === 'strict'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Strict Gov
              </button>
              <button
                onClick={() => applyPreset('kiosk')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === 'kiosk'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Retail Kiosk
              </button>
              <button
                onClick={() => applyPreset('byod')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === 'byod'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                BYOD Work
              </button>
              <button
                onClick={() => applyPreset('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activePreset === 'all'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All (Full)
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="text-emerald-400 font-medium">Active Policy Schema:</span>
            <span>Android Device Administration specification (res/xml/device_admin.xml)</span>
          </div>
        </div>

        {/* Primary Requested Policies Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Requested Core Policies
              </span>
              <span className="text-xs text-slate-500">· 3 declared in user prompt</span>
            </div>
          </div>

          {/* 1. Limit Password Policy Card */}
          <div className={`border rounded-xl transition-all ${
            config.limitPassword.enabled 
              ? 'bg-slate-900/90 border-slate-700/80 shadow-sm' 
              : 'bg-slate-950/60 border-slate-800/60 opacity-70'
          }`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    config.limitPassword.enabled ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">Password & Passcode Limits</h3>
                      <code className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded">
                        &lt;limit-password /&gt;
                      </code>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      <span>Restricts passcode complexity, length, retry limits, and expiration cycle</span>
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={config.limitPassword.enabled}
                    onChange={() => togglePolicy('limitPassword')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Sub-parameters */}
              {config.limitPassword.enabled && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Complexity Quality</label>
                    <select
                      value={config.limitPassword.minQuality}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          limitPassword: { ...config.limitPassword, minQuality: e.target.value as any }
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="numeric">Numeric (PIN)</option>
                      <option value="numeric_complex">Numeric Complex (No sequential PIN)</option>
                      <option value="alphabetic">Alphabetic</option>
                      <option value="alphanumeric">Alphanumeric (Letters + Numbers)</option>
                      <option value="complex">Complex (Letters, Digits, Symbols)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 font-medium mb-1">
                      <span>Minimum Passcode Length</span>
                      <span className="font-mono text-emerald-400 tabular-nums">{config.limitPassword.minLength} chars</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="16"
                      value={config.limitPassword.minLength}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          limitPassword: { ...config.limitPassword, minLength: Number(e.target.value) }
                        });
                      }}
                      className="w-full accent-emerald-500 bg-slate-950 rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 font-medium mb-1">
                      <span>Max Failed Attempts Before Lock/Wipe</span>
                      <span className="font-mono text-emerald-400 tabular-nums">{config.limitPassword.maxFailedAttempts} attempts</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="10"
                      value={config.limitPassword.maxFailedAttempts}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          limitPassword: { ...config.limitPassword, maxFailedAttempts: Number(e.target.value) }
                        });
                      }}
                      className="w-full accent-emerald-500 bg-slate-950 rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 font-medium mb-1">
                      <span>Password Expiration Cycle</span>
                      <span className="font-mono text-emerald-400 tabular-nums">{config.limitPassword.expirationDays} days</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="180"
                      step="15"
                      value={config.limitPassword.expirationDays}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          limitPassword: { ...config.limitPassword, expirationDays: Number(e.target.value) }
                        });
                      }}
                      className="w-full accent-emerald-500 bg-slate-950 rounded-lg h-2 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Force Lock Policy Card */}
          <div className={`border rounded-xl transition-all ${
            config.forceLock.enabled 
              ? 'bg-slate-900/90 border-slate-700/80 shadow-sm' 
              : 'bg-slate-950/60 border-slate-800/60 opacity-70'
          }`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    config.forceLock.enabled ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">Remote Force Lock</h3>
                      <code className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                        &lt;force-lock /&gt;
                      </code>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      <span>Allows administrator to immediately lock device screen and enforce keyguard timeout</span>
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={config.forceLock.enabled}
                    onChange={() => togglePolicy('forceLock')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Sub-parameters */}
              {config.forceLock.enabled && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-400 font-medium mb-1">
                      <span>Maximum Inactivity Time Before Auto-Lock</span>
                      <span className="font-mono text-amber-400 tabular-nums">{config.forceLock.maxTimeToLockSec} seconds</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="600"
                      step="15"
                      value={config.forceLock.maxTimeToLockSec}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          forceLock: { ...config.forceLock, maxTimeToLockSec: Number(e.target.value) }
                        });
                      }}
                      className="w-full accent-amber-500 bg-slate-950 rounded-lg h-2 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-medium block mb-1">Administrative Lock Screen Message</label>
                    <input
                      type="text"
                      value={config.forceLock.customLockMessage}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          forceLock: { ...config.forceLock, customLockMessage: e.target.value }
                        });
                      }}
                      placeholder="e.g. Property of IT Ops. Call (555) 0199"
                      className="w-full bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3. Wipe Data Policy Card */}
          <div className={`border rounded-xl transition-all ${
            config.wipeData.enabled 
              ? 'bg-slate-900/90 border-slate-700/80 shadow-sm' 
              : 'bg-slate-950/60 border-slate-800/60 opacity-70'
          }`}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    config.wipeData.enabled ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-500'
                  }`}>
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white">Remote Wipe & Factory Reset</h3>
                      <code className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-1.5 py-0.5 rounded">
                        &lt;wipe-data /&gt;
                      </code>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      <span>Erases device storage, enterprise work profile, or external storage partitions</span>
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={config.wipeData.enabled}
                    onChange={() => togglePolicy('wipeData')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
                </label>
              </div>

              {/* Sub-parameters */}
              {config.wipeData.enabled && (
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.wipeData.wipeExternalStorage}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          wipeData: { ...config.wipeData, wipeExternalStorage: e.target.checked }
                        });
                      }}
                      className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0"
                    />
                    <span>Include external SD card storage (<code className="font-mono text-[11px] text-slate-400">WIPE_EXTERNAL_STORAGE</code>)</span>
                  </label>

                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.wipeData.wipeResetProtection}
                      onChange={(e) => {
                        onChangeConfig({
                          ...config,
                          wipeData: { ...config.wipeData, wipeResetProtection: e.target.checked }
                        });
                      }}
                      className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0"
                    />
                    <span>Bypass Factory Reset Protection (<code className="font-mono text-[11px] text-slate-400">WIPE_RESET_PROTECTION_DATA</code>)</span>
                  </label>

                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Executing wipeData() is irreversible. In production, requires user consent confirmation during device admin registration.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional Optional Android Policies */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Extended Android Policies
              </span>
              <span className="text-xs text-slate-500">· Standard Device Admin API Suite</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Disable Camera */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              config.disableCamera.enabled 
                ? 'bg-slate-900 border-slate-700' 
                : 'bg-slate-950/40 border-slate-800/60 opacity-80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CameraOff className={`w-4 h-4 ${config.disableCamera.enabled ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Disable Camera</h4>
                    <code className="text-[11px] font-mono text-slate-400">&lt;disable-camera /&gt;</code>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.disableCamera.enabled}
                  onChange={() => togglePolicy('disableCamera')}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
              </div>
            </div>

            {/* Encrypted Storage */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              config.encryptedStorage.enabled 
                ? 'bg-slate-900 border-slate-700' 
                : 'bg-slate-950/40 border-slate-800/60 opacity-80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <HardDrive className={`w-4 h-4 ${config.encryptedStorage.enabled ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Encrypted Storage</h4>
                    <code className="text-[11px] font-mono text-slate-400">&lt;encrypted-storage /&gt;</code>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.encryptedStorage.enabled}
                  onChange={() => togglePolicy('encryptedStorage')}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
              </div>
            </div>

            {/* Watch Login */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              config.watchLogin.enabled 
                ? 'bg-slate-900 border-slate-700' 
                : 'bg-slate-950/40 border-slate-800/60 opacity-80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Eye className={`w-4 h-4 ${config.watchLogin.enabled ? 'text-blue-400' : 'text-slate-500'}`} />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Watch Login Attempts</h4>
                    <code className="text-[11px] font-mono text-slate-400">&lt;watch-login /&gt;</code>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.watchLogin.enabled}
                  onChange={() => togglePolicy('watchLogin')}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
              </div>
            </div>

            {/* Disable Keyguard Features */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              config.disableKeyguardFeatures.enabled 
                ? 'bg-slate-900 border-slate-700' 
                : 'bg-slate-950/40 border-slate-800/60 opacity-80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Fingerprint className={`w-4 h-4 ${config.disableKeyguardFeatures.enabled ? 'text-purple-400' : 'text-slate-500'}`} />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Lockscreen Biometrics</h4>
                    <code className="text-[11px] font-mono text-slate-400">&lt;disable-keyguard-features /&gt;</code>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.disableKeyguardFeatures.enabled}
                  onChange={() => togglePolicy('disableKeyguardFeatures')}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Live MDM QR Code Generator & XML Editor (5 cols) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Right Panel View Switcher */}
        <div className="flex items-center justify-between p-1 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <button
            onClick={() => {
              setRightPanelTab('qr');
              onLogAction('info', 'Switched view to MDM QR Code Enrollment');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              rightPanelTab === 'qr'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>MDM QR Enrollment</span>
          </button>

          <button
            onClick={() => {
              setRightPanelTab('xml');
              onLogAction('info', 'Switched view to live XML policy editor');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              rightPanelTab === 'xml'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>device_admin.xml</span>
          </button>
        </div>

        {/* View 1: MDM QR Code Generator */}
        {rightPanelTab === 'qr' && (
          <MdmQrEnrollmentCard
            config={config}
            xmlContent={xmlText}
            onLogAction={onLogAction}
            onTestInSimulator={onTestInSimulator}
          />
        )}

        {/* View 2: Live XML Code Editor */}
        {rightPanelTab === 'xml' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-[520px]">
          {/* Editor Header */}
          <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-medium text-slate-200">res/xml/device_admin.xml</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleResetToUserXml}
                title="Reset to User XML"
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded transition-colors whitespace-nowrap shrink-0"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy XML'}</span>
              </button>
            </div>
          </div>

          {/* Code Textarea with Realtime parsing */}
          <div className="relative flex-1 bg-slate-950 p-3 font-mono text-xs overflow-hidden">
            <textarea
              value={xmlText}
              onChange={(e) => handleXmlChange(e.target.value)}
              spellCheck={false}
              className="w-full h-full bg-transparent text-emerald-300 font-mono resize-none focus:outline-none focus:ring-0 leading-relaxed selection:bg-emerald-500/30"
            />
          </div>

          {/* Validation Status footer */}
          <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
            {xmlError ? (
              <div className="flex items-center gap-1.5 text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{xmlError}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Valid XML Schema &amp; Policies Active</span>
              </div>
            )}
            <span className="text-slate-500 text-[11px] tabular-nums font-mono">UTF-8 · Android 5.0+</span>
          </div>
        </div>
        )}

        {/* Android Enterprise & Deprecation Guide Box */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2.5">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Info className="w-4 h-4 shrink-0" />
            <span>Android Enterprise Notice (API 29+)</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Starting in Android 10 (API level 29), legacy Device Admin policies like <code className="text-slate-300 font-mono">&lt;limit-password&gt;</code> and <code className="text-slate-300 font-mono">&lt;wipe-data&gt;</code> are deprecated for consumer apps and require <strong>Device Owner</strong> (Fully Managed Device) or <strong>Profile Owner</strong> (Work Profile) enrollment via QR code or NFC zero-touch provisioning.
          </p>
          <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>This studio outputs both legacy DeviceAdminReceiver code and modern AMAPI Android Enterprise templates.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
