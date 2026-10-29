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
  generateBuildGradleKts,
  generateApkBuildInstructions
} from '../utils/xmlParser';
import { createAndroidProjectZip } from '../utils/zipGenerator';
import { Download, X, Check, FileCode2, Terminal, ShieldCheck, Smartphone, Server, Radio, FolderArchive } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PolicyConfig;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  config,
  onLogAction,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zipBlob = await createAndroidProjectZip(config, 'com.finance.emilocker', 'EMIAdminReceiver');
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'EMILocker_AndroidStudio_Project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setZipSuccess(true);
      onLogAction('security', 'Downloaded complete Android Studio project ZIP for instant APK build');
      setTimeout(() => {
        setZipSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      onLogAction('danger', `Failed to generate ZIP project: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const downloadFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    // 1. device_admin.xml
    downloadFile('device_admin.xml', generateXmlFromConfig(config), 'text/xml');
    // 2. AndroidManifest.xml
    setTimeout(() => {
      downloadFile('AndroidManifest.xml', generateAndroidManifest(), 'text/xml');
    }, 150);
    // 3. EnterpriseAdminReceiver.kt
    setTimeout(() => {
      downloadFile('EMIAdminReceiver.kt', generateKotlinReceiver('com.finance.emilocker', 'EMIAdminReceiver'), 'text/plain');
    }, 300);
    // 4. MainActivity.kt
    setTimeout(() => {
      downloadFile('MainActivity.kt', generateKotlinMainActivity('com.finance.emilocker', 'EMIAdminReceiver'), 'text/plain');
    }, 450);
    // 5. server.js (Express EMI Backend)
    setTimeout(() => {
      downloadFile('server.js', generateExpressEmiServer(), 'application/javascript');
    }, 600);
    // 6. EmiStatusSyncWorker.kt
    setTimeout(() => {
      downloadFile('EmiStatusSyncWorker.kt', generateKotlinStatusWorker('com.finance.emilocker', 'EMIAdminReceiver'), 'text/plain');
    }, 750);
    // 7. PolicyEnforcementManager.kt
    setTimeout(() => {
      downloadFile('PolicyEnforcementManager.kt', generateKotlinPolicyManager('com.finance.emilocker', config), 'text/plain');
    }, 900);
    // 8. build.gradle.kts
    setTimeout(() => {
      downloadFile('build.gradle.kts', generateBuildGradleKts('com.finance.emilocker'), 'text/plain');
    }, 1050);
    // 9. APK_BUILD_INSTRUCTIONS.md
    setTimeout(() => {
      downloadFile('APK_BUILD_INSTRUCTIONS.md', generateApkBuildInstructions('com.finance.emilocker', 'EMIAdminReceiver'), 'text/markdown');
    }, 1200);

    setDownloadSuccess(true);
    onLogAction('info', 'Exported full Android EMI project bundle with Gradle build scripts & APK guide');
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Export Android Studio Bundle</h3>
              <p className="text-xs text-slate-400">Download production source files configured for your policies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">res/xml/device_admin.xml</span>
                <span className="text-[11px] text-slate-400">Declares active policies (&lt;limit-password&gt;, &lt;force-lock&gt;, &lt;wipe-data&gt;)</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('device_admin.xml', generateXmlFromConfig(config), 'text/xml')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
            >
              Save
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">AndroidManifest.xml snippet</span>
                <span className="text-[11px] text-slate-400">Receiver declaration with BIND_DEVICE_ADMIN &amp; permissions</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('AndroidManifest.xml', generateAndroidManifest('com.finance.emilocker', '.EMIAdminReceiver'), 'text/xml')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
            >
              Save
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">EMIAdminReceiver.kt</span>
                <span className="text-[11px] text-slate-400">DeviceAdminReceiver callbacks &amp; BOOT_COMPLETED sync</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('EMIAdminReceiver.kt', generateKotlinReceiver('com.finance.emilocker', 'EMIAdminReceiver'), 'text/plain')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
            >
              Save
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">MainActivity.kt</span>
                <span className="text-[11px] text-slate-400">Admin prompt &amp; lockPhoneIfDue() dpm.lockNow() controller</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('MainActivity.kt', generateKotlinMainActivity('com.finance.emilocker', 'EMIAdminReceiver'), 'text/plain')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
            >
              Save
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-amber-400" />
              <div>
                <span className="font-semibold text-white block">server.js (Express Backend)</span>
                <span className="text-[11px] text-slate-400">REST API: /api/customer, /api/check-status/:imei, /api/admin/toggle-lock</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('server.js', generateExpressEmiServer(), 'application/javascript')}
              className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-medium border border-amber-500/30"
            >
              Save
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="font-semibold text-white block">EmiStatusSyncWorker.kt</span>
                <span className="text-[11px] text-slate-400">24-hour background WorkManager polling &amp; auto dpm.lockNow()</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('EmiStatusSyncWorker.kt', generateKotlinStatusWorker('com.finance.emilocker', 'EMIAdminReceiver'), 'text/plain')}
              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[11px] font-medium border border-cyan-500/30"
            >
              Save
            </button>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-semibold text-white block">test_device_admin.sh</span>
                <span className="text-[11px] text-slate-400">ADB shell dpm commands for emulator & device testing</span>
              </div>
            </div>
            <button
              onClick={() => downloadFile('test_device_admin.sh', generateAdbCommands(), 'text/x-shellscript')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium"
            >
              Save
            </button>
          </div>
        </div>

        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-sm transition-all"
          >
            {isZipping ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span>Zipping...</span>
              </>
            ) : zipSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                <span className="text-emerald-400">ZIP Downloaded!</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download Project (.ZIP)</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              {downloadSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Download className="w-3.5 h-3.5" />}
              <span>{downloadSuccess ? 'Downloaded All Files' : 'Download All Files'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
