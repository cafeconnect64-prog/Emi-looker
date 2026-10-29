import React, { useState, useEffect } from 'react';
import { PolicyConfig } from '../types/deviceAdmin';
import { createAndroidProjectZip } from '../utils/zipGenerator';
import QRCode from 'qrcode';
import {
  Download,
  Terminal,
  Smartphone,
  Check,
  Copy,
  Layers,
  Cpu,
  ShieldCheck,
  CloudLightning,
  Sparkles,
  QrCode,
  FolderArchive,
  ArrowRight
} from 'lucide-react';

interface ApkBuilderViewProps {
  config: PolicyConfig;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
}

export const ApkBuilderView: React.FC<ApkBuilderViewProps> = ({ config, onLogAction }) => {
  const [isZipping, setIsZipping] = useState(false);
  const [zipSuccess, setZipSuccess] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const packageName = 'com.finance.emilocker';
  const receiverClass = 'EMIAdminReceiver';

  // Android Enterprise Provisioning payload for camera QR scanner
  const provisioningJson = JSON.stringify({
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': `${packageName}/.${receiverClass}`,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME': packageName,
    'android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM': '',
    'android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED': true,
    'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
      serverUrl: 'https://ais-dev-c6lqh7juffofglmueo4zvv-536751776030.asia-east1.run.app/api',
      appVersion: '1.0.0'
    }
  }, null, 2);

  useEffect(() => {
    QRCode.toDataURL(provisioningJson, {
      width: 260,
      margin: 2,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR code generation error:', err));
  }, [provisioningJson]);

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zipBlob = await createAndroidProjectZip(config, packageName, receiverClass);
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EMILocker_AndroidStudio_Project.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setZipSuccess(true);
      onLogAction('security', 'Generated & downloaded complete Android Studio project ZIP (ready for APK build)');
      setTimeout(() => setZipSuccess(false), 4000);
    } catch (err: any) {
      console.error(err);
      onLogAction('danger', `Failed to generate ZIP project: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    onLogAction('info', `Copied command: ${text.slice(0, 45)}...`);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Top Banner / Callout */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Smartphone className="w-56 h-56 text-emerald-400" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Android APK Build &amp; Deployment Center</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Build &amp; Compile EMI Locker APK
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Complete source bundle with Kotlin receivers, device admin policies, background WorkManager sync, 
              aur Gradle wrapper. Ek click me complete Android Studio ZIP download karein aur bina kisi error ke direct APK compile karein.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg ${
                zipSuccess
                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isZipping ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Packaging Project ZIP...</span>
                </>
              ) : zipSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Project Downloaded!</span>
                </>
              ) : (
                <>
                  <FolderArchive className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Android Project (.ZIP)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Build Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: 2-Minute Android Studio Method */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Method 1: Android Studio (PC/Mac)</h3>
              <p className="text-xs text-slate-400">Sabse aasan tareeqa (Local Build)</p>
            </div>
          </div>

          <ol className="space-y-3 text-xs text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <span>
                Upar diye gaye button se <strong>`EMILocker_AndroidStudio_Project.zip`</strong> download karke unzip karein.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <span>
                <strong>Android Studio</strong> open karein aur <strong>"Open"</strong> par click karke unzipped folder select karein. Gradle automatically sync ho jayega.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <span>
                Top menu me click karein:<br />
                <code className="text-blue-300 bg-slate-950 px-2 py-0.5 rounded mt-1 inline-block border border-slate-800">
                  Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)
                </code>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span>
                30 seconds me APK generate ho jayegi:
                <code className="text-emerald-400 bg-slate-950 px-2 py-1 rounded block mt-1 border border-slate-800 font-mono text-[11px] break-all">
                  app/build/outputs/apk/debug/app-debug.apk
                </code>
              </span>
            </li>
          </ol>
        </div>

        {/* Card 2: Free Automated Cloud Build (GitHub Actions) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Method 2: Automatic Cloud Build</h3>
              <p className="text-xs text-slate-400">Bina PC software ke GitHub Actions se</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <p className="text-slate-400">
              Is ZIP bundle me <code>.github/workflows/build-apk.yml</code> pre-configured hai. Aapko apne PC par kuch install karne ki zaroorat nahi:
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-purple-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>Push to GitHub Repo</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                GitHub par new repository banayein aur ZIP ki files upload karein.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-purple-300 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                <span>Auto-Build via GitHub Servers</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                GitHub Actions 1 minute me Linux runner par Ubuntu + Java 17 ke saath APK build kar dega.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>Instant Download</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                <strong>Actions</strong> tab me jakar <strong>`EMI-Locker-debug-apk`</strong> artifact download karein.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: QR Code Enterprise Provisioning */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-colors flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Method 3: QR Provisioning</h3>
                <p className="text-xs text-slate-400">Android Enterprise 6-Tap Enrolment</p>
              </div>
            </div>

            <div className="mt-3 flex flex-col items-center">
              {qrDataUrl ? (
                <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200">
                  <img src={qrDataUrl} alt="Device Admin QR Code" className="w-40 h-40" />
                </div>
              ) : (
                <div className="w-40 h-40 bg-slate-950 rounded-xl animate-pulse flex items-center justify-center text-slate-600">
                  Generating QR...
                </div>
              )}
              <p className="text-[11px] text-slate-400 text-center mt-2">
                Naye phone ke Setup Screen par <strong>6 baar tap</strong> karein aur ye QR scan karein.
              </p>
            </div>
          </div>

          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
            Permanent Device Owner privileges bina bypass ya uninstall option ke activate ho jayengi.
          </div>
        </div>
      </div>

      {/* Terminal / ADB Commands Section */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">ADB Installation &amp; Device Owner Commands</h3>
              <p className="text-xs text-slate-400">Apne phone ko USB se connect karke ye commands run karein</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono">
            adb version 1.0.41+
          </span>
        </div>

        <div className="space-y-4">
          {/* Step 1: Install APK */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">1. Install compiled APK on phone:</span>
              <button
                onClick={() => copyToClipboard('adb install -r app/build/outputs/apk/debug/app-debug.apk', 'cmd-install')}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {copiedCmd === 'cmd-install' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between">
              <code>adb install -r app/build/outputs/apk/debug/app-debug.apk</code>
            </div>
          </div>

          {/* Step 2: Set Device Owner */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">
                2. Set Device Owner (Kiosk Lockdown &amp; Uninstall Protection):
              </span>
              <button
                onClick={() =>
                  copyToClipboard(`adb shell dpm set-device-owner ${packageName}/.${receiverClass}`, 'cmd-dpm')
                }
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {copiedCmd === 'cmd-dpm' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-amber-400 flex items-center justify-between">
              <code>adb shell dpm set-device-owner {packageName}/.{receiverClass}</code>
            </div>
            <p className="text-[11px] text-slate-500 pl-1">
              ⚠️ Device Owner set karne ke liye phone fresh ya factory reset hona chahiye (koi existing Google Account login nahi hona chahiye).
            </p>
          </div>

          {/* Step 3: Test Lock Enforcement */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">3. Test remote lock screen immediately:</span>
              <button
                onClick={() =>
                  copyToClipboard(
                    `adb shell am start -n ${packageName}/.EMILockActivity --es "reason" "EMI Overdue Rs 2499"`,
                    'cmd-lock'
                  )
                }
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                {copiedCmd === 'cmd-lock' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 flex items-center justify-between">
              <code>
                adb shell am start -n {packageName}/.EMILockActivity --es "reason" "EMI Overdue Rs 2499"
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
