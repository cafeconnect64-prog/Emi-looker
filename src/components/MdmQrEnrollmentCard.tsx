import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { PolicyConfig } from '../types/deviceAdmin';
import { 
  QrCode, 
  Download, 
  Copy, 
  Check, 
  Settings2, 
  Wifi, 
  ExternalLink, 
  Sparkles,
  Smartphone,
  Eye,
  RefreshCw,
  FileCode2
} from 'lucide-react';

interface MdmQrEnrollmentCardProps {
  config: PolicyConfig;
  xmlContent: string;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
  onTestInSimulator?: () => void;
}

export const MdmQrEnrollmentCard: React.FC<MdmQrEnrollmentCardProps> = ({
  config,
  xmlContent,
  onLogAction,
  onTestInSimulator,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<'bundle' | 'raw_xml' | 'base64'>('bundle');
  const [componentName, setComponentName] = useState('com.finance.emilocker/.EMIAdminReceiver');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('https://storage.googleapis.com/enterprise-mdm/emilocker.apk');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showConfigOptions, setShowConfigOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Generate the formatted payload based on selected format
  const getPayload = (): string => {
    if (format === 'raw_xml') {
      return xmlContent.trim();
    }

    if (format === 'base64') {
      try {
        const encoded = btoa(unescape(encodeURIComponent(xmlContent.trim())));
        return `android-mdm://policy?format=xml&data=${encoded}`;
      } catch {
        return xmlContent.trim();
      }
    }

    // Android Enterprise Zero-Touch / 6-tap Enrollment JSON Bundle
    const packageName = componentName.split('/')[0] || 'com.finance.emilocker';
    const bundle: Record<string, any> = {
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME': componentName,
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_NAME': packageName,
      'android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION': apkDownloadUrl,
      'android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE': {
        'policy_xml': xmlContent.trim(),
        'limit_password': config.limitPassword.enabled,
        'force_lock': config.forceLock.enabled,
        'wipe_data': config.wipeData.enabled,
        'password_quality': config.limitPassword.minQuality,
        'password_min_length': config.limitPassword.minLength,
        'max_failed_attempts': config.limitPassword.maxFailedAttempts,
        'max_time_to_lock_sec': config.forceLock.maxTimeToLockSec,
      },
    };

    if (wifiSsid.trim()) {
      bundle['android.app.extra.PROVISIONING_WIFI_SSID'] = wifiSsid.trim();
      if (wifiPassword) {
        bundle['android.app.extra.PROVISIONING_WIFI_PASSWORD'] = wifiPassword;
        bundle['android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE'] = 'WPA';
      } else {
        bundle['android.app.extra.PROVISIONING_WIFI_SECURITY_TYPE'] = 'NONE';
      }
    }

    return JSON.stringify(bundle);
  };

  const currentPayload = getPayload();

  // Render QR Code to canvas whenever payload changes
  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      currentPayload,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#020617', // high contrast dark slate on crisp white background for phone cameras
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (error) {
          console.error('QR Code render error:', error);
        } else if (canvasRef.current) {
          setQrDataUrl(canvasRef.current.toDataURL('image/png'));
        }
      }
    );
  }, [currentPayload]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(currentPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onLogAction('info', `Copied MDM QR enrollment payload (${format}) to clipboard`);
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `mdm_enrollment_qr_${format}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onLogAction('info', `Downloaded scannable QR Code image for MDM enrollment (${format})`);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm space-y-0">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <QrCode className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">MDM QR Code Enrollment Generator</h3>
            <span className="text-[11px] text-slate-400">Encodes live XML policy into Android-scannable format</span>
          </div>
        </div>

        <button
          onClick={() => setShowConfigOptions(!showConfigOptions)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
            showConfigOptions
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
          }`}
        >
          <Settings2 className="w-3 h-3" />
          <span>{showConfigOptions ? 'Hide Config' : 'Configure Bundle'}</span>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Format Selector Pills */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <span className="text-xs text-slate-400 font-medium">Encoding Schema:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setFormat('bundle');
                onLogAction('info', 'Selected Android Enterprise Provisioning Bundle QR format');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                format === 'bundle'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Enterprise Bundle
            </button>
            <button
              onClick={() => {
                setFormat('raw_xml');
                onLogAction('info', 'Selected Direct Raw XML QR format');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                format === 'raw_xml'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Raw XML
            </button>
            <button
              onClick={() => {
                setFormat('base64');
                onLogAction('info', 'Selected Base64 Compact URI QR format');
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                format === 'base64'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Base64 URI
            </button>
          </div>
        </div>

        {/* Optional Bundle Configuration Panel */}
        {showConfigOptions && format === 'bundle' && (
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2.5 text-xs animate-fade-in">
            <div className="font-semibold text-slate-200 flex items-center justify-between">
              <span>Android Provisioning Bundle Parameters</span>
              <span className="text-[10px] text-slate-500 font-mono">DPC Extra Bundle</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-slate-400 block mb-0.5">Admin Component Name</label>
                <input
                  type="text"
                  value={componentName}
                  onChange={(e) => setComponentName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">DPC APK Download Location</label>
                <input
                  type="text"
                  value={apkDownloadUrl}
                  onChange={(e) => setApkDownloadUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Auto-join Wi-Fi SSID (Optional)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="e.g. Enterprise_Guest"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Wi-Fi Password (Optional)</label>
                <input
                  type="password"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Leave empty for open Wi-Fi"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-200 text-[11px] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* QR Display + Actions Grid */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* High-Contrast Physical Canvas */}
          <div className="p-3 bg-white rounded-2xl shadow-xl flex items-center justify-center shrink-0 border border-slate-200">
            <canvas ref={canvasRef} className="block rounded-lg" />
          </div>

          {/* Details & Actions */}
          <div className="space-y-3 flex-1 text-xs w-full">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Scannable Enrollment Target:</span>
                <span className="font-mono text-[11px] text-emerald-400">
                  {format === 'bundle' ? 'Android Enterprise 6-Tap' : format === 'raw_xml' ? 'Direct XML Document' : 'Base64 Encoded URI'}
                </span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Contains active policies: <code className="text-slate-300 font-mono">&lt;limit-password&gt;</code>, <code className="text-slate-300 font-mono">&lt;force-lock&gt;</code>, <code className="text-slate-300 font-mono">&lt;wipe-data&gt;</code>.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleDownloadQrPng}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR Image (.png)</span>
              </button>

              <button
                onClick={handleCopyPayload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/80 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Payload' : 'Copy Payload'}</span>
              </button>

              {onTestInSimulator && (
                <button
                  onClick={onTestInSimulator}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium border border-emerald-500/30 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Test in Simulator</span>
                </button>
              )}
            </div>

            {/* 6-Tap Guidance Tip */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>How to scan on Android hardware:</span>
              </div>
              <p className="text-[11px] text-slate-400">
                On the initial <strong>&quot;Welcome / Hi there&quot;</strong> screen of any factory-reset Android 10+ device, tap anywhere on the screen <strong>6 times in a row</strong>. The camera QR reader will launch automatically.
              </p>
            </div>
          </div>
        </div>

        {/* Payload Inspector Drawer */}
        <details className="group border-t border-slate-800 pt-2 text-xs">
          <summary className="cursor-pointer text-slate-400 hover:text-slate-200 flex items-center justify-between py-1 select-none">
            <span className="font-medium">Inspect Encoded Payload String ({currentPayload.length} bytes)</span>
            <span className="text-[11px] text-slate-500 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-2 p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[10px] text-emerald-300 max-h-36 overflow-y-auto break-all leading-relaxed">
            {currentPayload}
          </div>
        </details>
      </div>
    </div>
  );
};
