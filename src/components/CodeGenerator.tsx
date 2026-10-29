import React, { useState } from 'react';
import { PolicyConfig } from '../types/deviceAdmin';
import { 
  generateXmlFromConfig, 
  generateAndroidManifest, 
  generateKotlinReceiver, 
  generateKotlinMainActivity,
  generateKotlinPolicyManager, 
  generateAdbCommands,
  generateExpressEmiServer,
  generateKotlinStatusWorker,
  generateKotlinBootReceiver,
  generateKotlinLockActivity,
  generateBuildGradleKts,
  generateApkBuildInstructions
} from '../utils/xmlParser';
import { 
  Copy, 
  Check, 
  Download, 
  FileCode2, 
  Terminal, 
  BookOpen, 
  ShieldCheck, 
  Code2,
  Server,
  Radio,
  Package,
  Layers
} from 'lucide-react';

interface CodeGeneratorProps {
  config: PolicyConfig;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
}

export const CodeGenerator: React.FC<CodeGeneratorProps> = ({ config, onLogAction }) => {
  const [activeTab, setActiveTab] = useState<'apk_guide' | 'gradle' | 'xml' | 'manifest' | 'receiver' | 'activity' | 'boot' | 'overlay' | 'server' | 'worker' | 'helper' | 'adb' | 'migration'>('apk_guide');
  const [packageName, setPackageName] = useState('com.finance.emilocker');
  const [receiverName, setReceiverName] = useState('EMIAdminReceiver');
  const [copied, setCopied] = useState(false);

  const getCodeContent = (): string => {
    switch (activeTab) {
      case 'apk_guide':
        return generateApkBuildInstructions(packageName, receiverName);
      case 'gradle':
        return generateBuildGradleKts(packageName);
      case 'xml':
        return generateXmlFromConfig(config);
      case 'manifest':
        return generateAndroidManifest(packageName, `.${receiverName}`);
      case 'receiver':
        return generateKotlinReceiver(packageName, receiverName);
      case 'activity':
        return generateKotlinMainActivity(packageName, receiverName);
      case 'boot':
        return generateKotlinBootReceiver(packageName);
      case 'overlay':
        return generateKotlinLockActivity(packageName);
      case 'server':
        return generateExpressEmiServer();
      case 'worker':
        return generateKotlinStatusWorker(packageName, receiverName);
      case 'helper':
        return generateKotlinPolicyManager(packageName, config);
      case 'adb':
        return generateAdbCommands(packageName, receiverName);
      case 'migration':
        return `# Android EMI Finance Handset Locker & DPC Architecture
# ==============================================================================
# Overview of Handset Financing Lockout & Device Administration
# 
# 1. Receiver Declarations & Permissions:
#    - <uses-permission android:name="android.permission.INTERNET" />
#      Allows the app to contact the lender backend API to check EMI payment status.
#    - <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
#      Wakes up EMIAdminReceiver on device restart to immediately re-apply lock screen
#      restrictions if an overdue installment is unpaid.
#    - <action android:name="app.device.admin.ACTION_DEVICE_ADMIN_ENABLED" />
#      Custom broadcast dispatched upon successful admin enrollment.
#
# 2. Modern Provisioning Modes:
#    - Device Owner (Provisioned via 6-tap QR code or Zero-Touch on unboxed handsets)
#      Allows complete lockdown: blocking USB debugging, disallowing factory reset,
#      and forcing single-app or lockscreen payment overlay.
#    - Legacy Device Admin (<device-admin>):
#      Utilizes <force-lock /> to lock screen and <limit-password /> to enforce PIN,
#      coupled with SYSTEM_ALERT_WINDOW for repayment prompts.
#
# 3. Regulatory & Safety Compliance:
#    - Emergency calls (112, 911, 100) must ALWAYS remain dialable during lockout.
#    - Customer care dialer & UPI payment QR should be accessible directly from the lockscreen.`;
    }
  };

  const currentCode = getCodeContent();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onLogAction('info', `Copied ${activeTab} code snippet to clipboard`);
  };

  const handleDownloadFile = () => {
    let filename = 'device_admin.xml';
    let mimeType = 'text/xml';

    if (activeTab === 'apk_guide') {
      filename = 'APK_BUILD_INSTRUCTIONS.md';
      mimeType = 'text/markdown';
    } else if (activeTab === 'gradle') {
      filename = 'build.gradle.kts';
      mimeType = 'text/plain';
    } else if (activeTab === 'manifest') {
      filename = 'AndroidManifest.xml';
      mimeType = 'text/xml';
    } else if (activeTab === 'receiver') {
      filename = `${receiverName}.kt`;
      mimeType = 'text/plain';
    } else if (activeTab === 'activity') {
      filename = 'MainActivity.kt';
      mimeType = 'text/plain';
    } else if (activeTab === 'boot') {
      filename = 'BootReceiver.kt';
      mimeType = 'text/plain';
    } else if (activeTab === 'overlay') {
      filename = 'EMILockActivity.kt';
      mimeType = 'text/plain';
    } else if (activeTab === 'server') {
      filename = 'server.js';
      mimeType = 'application/javascript';
    } else if (activeTab === 'worker') {
      filename = 'EmiStatusSyncWorker.kt';
      mimeType = 'text/plain';
    } else if (activeTab === 'helper') {
      filename = 'PolicyEnforcementManager.kt';
      mimeType = 'text/plain';
    } else if (activeTab === 'adb') {
      filename = 'test_device_admin.sh';
      mimeType = 'text/x-shellscript';
    } else if (activeTab === 'migration') {
      filename = 'android_enterprise_migration.md';
      mimeType = 'text/markdown';
    }

    const blob = new Blob([currentCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onLogAction('info', `Downloaded ${filename}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Banner & Configuration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <span>Production Android APK &amp; Code Generator</span>
          </h2>
          <div className="text-xs text-slate-400 mt-0.5">
            <span>Ready-to-compile Android Studio files and 2-minute APK build instructions</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">Package ID</label>
            <input
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Receiver Class</label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-slate-200 font-mono focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Code Editor Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Navigation Tabs */}
        <div className="px-4 pt-3 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
            {/* APK Build Guide Highlight Tab */}
            <button
              onClick={() => setActiveTab('apk_guide')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'apk_guide'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>APK Build Guide (2-Min)</span>
            </button>

            <button
              onClick={() => setActiveTab('gradle')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'gradle'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>build.gradle.kts</span>
            </button>

            <button
              onClick={() => setActiveTab('xml')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'xml'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>device_admin.xml</span>
            </button>

            <button
              onClick={() => setActiveTab('manifest')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'manifest'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>AndroidManifest.xml</span>
            </button>

            <button
              onClick={() => setActiveTab('receiver')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'receiver'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{receiverName}.kt</span>
            </button>

            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'activity'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>MainActivity.kt</span>
            </button>

            <button
              onClick={() => setActiveTab('boot')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'boot'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>BootReceiver.kt</span>
            </button>

            <button
              onClick={() => setActiveTab('overlay')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'overlay'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-rose-400" />
              <span>EMILockActivity.kt</span>
            </button>

            <button
              onClick={() => setActiveTab('server')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'server'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">server.js (Express Backend)</span>
            </button>

            <button
              onClick={() => setActiveTab('worker')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'worker'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>EmiStatusSyncWorker.kt</span>
            </button>

            <button
              onClick={() => setActiveTab('helper')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'helper'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>PolicyEnforcementManager.kt</span>
            </button>

            <button
              onClick={() => setActiveTab('adb')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'adb'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>ADB Testing Commands</span>
            </button>

            <button
              onClick={() => setActiveTab('migration')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'migration'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Modernization Guide</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadFile}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Code View Area */}
        <div className="bg-slate-950 p-4 font-mono text-xs overflow-x-auto min-h-[460px] text-slate-300 leading-relaxed selection:bg-emerald-500/20">
          <pre>{currentCode}</pre>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Target Architecture: Android OS 5.0 - 16 · Kotlin 2.0 · AGP 8.8+</span>
          <span className="font-mono text-emerald-400 tabular-nums">UTF-8 Encoded</span>
        </div>
      </div>
    </div>
  );
};
