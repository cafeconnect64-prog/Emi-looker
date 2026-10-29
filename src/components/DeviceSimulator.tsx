import React, { useState, useEffect } from 'react';
import { 
  PolicyConfig, 
  DeviceState,
  EmiFinanceConfig,
  EmiCustomerRecord
} from '../types/deviceAdmin';
import { 
  Lock, 
  Unlock, 
  Camera, 
  Settings, 
  ShieldCheck, 
  Trash2, 
  RotateCw, 
  Smartphone, 
  Briefcase, 
  AlertTriangle, 
  Check, 
  X, 
  KeyRound, 
  Wifi, 
  BatteryMedium,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CreditCard,
  PhoneCall,
  QrCode,
  Radio,
  CheckCircle2,
  ShieldAlert,
  Server
} from 'lucide-react';

interface DeviceSimulatorProps {
  config: PolicyConfig;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
  customers?: EmiCustomerRecord[];
  onTriggerCheckStatus?: (imei: string) => { imei: string; isLocked: boolean; dueDate: string; message: string } | null;
  onTriggerToggleLock?: (imei: string, isLocked: boolean) => void;
  onNavigateToBackend?: () => void;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({ 
  config, 
  onLogAction,
  customers,
  onTriggerCheckStatus,
  onTriggerToggleLock,
  onNavigateToBackend
}) => {
  const [deviceState, setDeviceState] = useState<DeviceState>({
    isEnrolled: true,
    screen: 'home',
    isLocked: false,
    lockReason: null,
    currentPin: '123456',
    failedPinAttempts: 0,
    isWiped: false,
    isCameraDisabled: config.disableCamera.enabled,
    isStorageEncrypted: true,
    isWorkProfileActive: false,
    batteryLevel: 94,
    wifiConnected: true,
    isBooting: false,
  });

  const [emiConfig, setEmiConfig] = useState<EmiFinanceConfig>({
    loanId: 'LN-908234-EMI',
    customerName: 'Abhi Kumar',
    emiAmount: 2499,
    currency: '₹',
    dueDate: '25 Oct 2026',
    isOverdue: false,
    isEmiLocked: false,
    lenderName: 'Samsung Finance+ / DMI',
    supportPhone: '1800-123-3355',
    allowEmergencyCalls: true,
    blockUsbDebugging: true,
    customReminderMessage: 'Your monthly installment is overdue. Handset restricted until payment.',
  });

  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [newPinCandidate, setNewPinCandidate] = useState('');
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Sync camera state with policy
  useEffect(() => {
    setDeviceState(prev => ({
      ...prev,
      isCameraDisabled: config.disableCamera.enabled,
    }));
  }, [config.disableCamera.enabled]);

  // Synchronize handset with backend customer state for simulated IMEI 860293049182345
  useEffect(() => {
    if (!customers) return;
    const record = customers.find(c => c.imei === '860293049182345');
    if (record) {
      const isOverdue = new Date() > new Date(record.dueDate);
      setEmiConfig(prev => ({
        ...prev,
        customerName: record.name,
        emiAmount: record.emiAmount,
        dueDate: record.dueDate,
        isOverdue: isOverdue || record.isLocked,
        isEmiLocked: record.isLocked
      }));

      if (record.isLocked && deviceState.isEnrolled && (!deviceState.isLocked || deviceState.screen !== 'emi_lock')) {
        setDeviceState(prev => ({
          ...prev,
          isLocked: true,
          screen: 'emi_lock',
          lockReason: 'EMI Overdue Lockout (Express Server: /api/check-status)'
        }));
      } else if (!record.isLocked && deviceState.screen === 'emi_lock') {
        setDeviceState(prev => ({
          ...prev,
          isLocked: false,
          screen: 'home',
          lockReason: null
        }));
      }
    }
  }, [customers, deviceState.isEnrolled, deviceState.isLocked, deviceState.screen]);

  // Lockout timer countdown
  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => setLockoutTimer(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [lockoutTimer]);

  const handleKeypadPress = (digit: string) => {
    if (lockoutTimer > 0) return;
    if (enteredPin.length < 8) {
      setEnteredPin(prev => prev + digit);
      setPinError(null);
    }
  };

  const handleKeypadBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handleUnlockAttempt = () => {
    if (enteredPin === deviceState.currentPin) {
      setEnteredPin('');
      setDeviceState(prev => ({
        ...prev,
        isLocked: false,
        lockReason: null,
        screen: 'home',
        failedPinAttempts: 0,
      }));
      setPinError(null);
      onLogAction('info', 'Device unlocked successfully with passcode', 'limit-password');
    } else {
      const newFails = deviceState.failedPinAttempts + 1;
      setEnteredPin('');
      setPinError(`Wrong PIN (${newFails}/${config.limitPassword.maxFailedAttempts})`);
      onLogAction('warn', `Failed PIN attempt: ${newFails} of ${config.limitPassword.maxFailedAttempts}`, 'limit-password');

      // Check max failed attempts policy
      if (config.limitPassword.enabled && newFails >= config.limitPassword.maxFailedAttempts) {
        if (config.wipeData.enabled) {
          onLogAction('danger', 'MAX FAILED PASSWORDS EXCEEDED: Automatic device wipe triggered by DevicePolicyManager', 'wipe-data');
          startWipeProcess();
        } else {
          setLockoutTimer(30);
          setPinError('Too many failed attempts. Device locked for 30 seconds.');
          onLogAction('security', 'Lockout penalty enforced: 30s timeout', 'limit-password');
        }
      }

      setDeviceState(prev => ({
        ...prev,
        failedPinAttempts: newFails,
      }));
    }
  };

  const triggerForceLock = () => {
    if (!config.forceLock.enabled) {
      onLogAction('warn', 'Force lock failed: <force-lock /> is not declared in active policies');
      return;
    }
    setDeviceState(prev => ({
      ...prev,
      isLocked: true,
      screen: 'lock',
      lockReason: 'Remote Administrator Lock Command (dpm.lockNow())',
    }));
    setEnteredPin('');
    onLogAction('security', 'Remote lock triggered: DevicePolicyManager.lockNow()', 'force-lock');
  };

  const startWipeProcess = () => {
    setWipeConfirmOpen(false);
    setDeviceState(prev => ({
      ...prev,
      screen: 'wiping',
      isLocked: true,
    }));
    onLogAction('danger', `Executing wipeData(flags: ${config.wipeData.wipeExternalStorage ? 'WIPE_EXTERNAL_STORAGE' : '0'})`, 'wipe-data');

    // Simulate recovery wipe sequence
    setTimeout(() => {
      setDeviceState(prev => ({
        ...prev,
        screen: 'out_of_box',
        isWiped: true,
        isEnrolled: false,
        currentPin: '1234',
        failedPinAttempts: 0,
      }));
      onLogAction('info', 'Factory wipe complete: Device restarted in Out-of-Box unprovisioned state');
    }, 3500);
  };

  const resetOutofBox = () => {
    setDeviceState({
      isEnrolled: true,
      screen: 'home',
      isLocked: false,
      lockReason: null,
      currentPin: '123456',
      failedPinAttempts: 0,
      isWiped: false,
      isCameraDisabled: config.disableCamera.enabled,
      isStorageEncrypted: true,
      isWorkProfileActive: false,
      batteryLevel: 94,
      wifiConnected: true,
      isBooting: false,
    });
    onLogAction('info', 'Simulated device re-provisioned and enrolled into MDM');
  };

  const checkPinCompliance = (pin: string) => {
    const issues: string[] = [];
    if (config.limitPassword.enabled) {
      if (pin.length < config.limitPassword.minLength) {
        issues.push(`Must be at least ${config.limitPassword.minLength} digits`);
      }
      if (config.limitPassword.minQuality === 'numeric_complex') {
        // Disallow simple sequential e.g. 1234, 1111
        const isRepeated = /^(\d)\1+$/.test(pin);
        const isSequential = '0123456789012345'.includes(pin) || '9876543210'.includes(pin);
        if (isRepeated || (pin.length > 3 && isSequential)) {
          issues.push('PIN cannot be sequential or repeating numbers');
        }
      }
    }
    return issues;
  };

  const handleTriggerEmiLock = () => {
    setEmiConfig(prev => ({ ...prev, isEmiLocked: true, isOverdue: true }));
    setDeviceState(prev => ({
      ...prev,
      isLocked: true,
      screen: 'emi_lock',
      lockReason: 'EMI Overdue Lockout (.EMIAdminReceiver)',
    }));
    if (onTriggerToggleLock) {
      onTriggerToggleLock('860293049182345', true);
    }
    fetch('/api/admin/toggle-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imei: '860293049182345', isLocked: true })
    }).catch(() => {});
    onLogAction('danger', 'EMI Lockout armed: .EMIAdminReceiver enforced lock screen due to overdue installment', 'force-lock');
  };

  const handlePayEmi = () => {
    setDeviceState(prev => ({ ...prev, screen: 'emi_payment_success' }));
    onLogAction('info', 'Customer initiated simulated UPI payment of ₹2,499. Querying cloud ledger via INTERNET...');
    
    // Call backend payment endpoint
    fetch('/api/admin/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imei: '860293049182345', amountPaid: emiConfig.emiAmount })
    }).catch(() => {});

    if (onTriggerToggleLock) {
      onTriggerToggleLock('860293049182345', false);
    }

    setTimeout(() => {
      setEmiConfig(prev => ({ ...prev, isEmiLocked: false, isOverdue: false }));
      setDeviceState(prev => ({
        ...prev,
        isLocked: false,
        screen: 'home',
        lockReason: null,
      }));
      onLogAction('security', 'Payment verified! Cloud webhook pushed: EMIAdminReceiver restored normal handset operation');
    }, 2000);
  };

  const handleSimulateBootCompleted = () => {
    setDeviceState(prev => ({ ...prev, isBooting: true }));
    onLogAction('info', 'Broadcasting: android.intent.action.BOOT_COMPLETED (RECEIVE_BOOT_COMPLETED)');
    
    setTimeout(() => {
      onLogAction('security', 'EMIAdminReceiver.onReceive(BOOT_COMPLETED): Verifying cloud ledger via INTERNET...');
      setTimeout(() => {
        setDeviceState(prev => ({
          ...prev,
          isBooting: false,
          screen: emiConfig.isEmiLocked ? 'emi_lock' : 'home',
          isLocked: emiConfig.isEmiLocked,
        }));
        if (emiConfig.isEmiLocked) {
          onLogAction('warn', 'Reboot check: Overdue EMI detected - handset remains restricted');
        } else {
          onLogAction('info', 'Reboot check: Loan in good standing - normal home screen restored');
        }
      }, 1000);
    }, 1200);
  };

  const handleBroadcastCustomAction = () => {
    onLogAction('security', 'Dispatched custom broadcast: app.device.admin.ACTION_DEVICE_ADMIN_ENABLED');
  };

  const handleMainActivityLockPhoneIfDue = () => {
    onLogAction('info', 'MainActivity: Checking if (!devicePolicyManager.isAdminActive(compName))');
    if (!deviceState.isEnrolled) {
      onLogAction('warn', 'MainActivity: Admin NOT active! Prompting user with Intent(ACTION_ADD_DEVICE_ADMIN) & EXTRA_ADD_EXPLANATION: "Yeh app EMI financing security ke liye zaroori hai."');
      setDeviceState(prev => ({
        ...prev,
        screen: 'activation',
      }));
    } else {
      onLogAction('security', 'MainActivity: isAdminActive == true. Calling lockPhoneIfDue() -> devicePolicyManager.lockNow()', 'force-lock');
      setDeviceState(prev => ({
        ...prev,
        isLocked: true,
        screen: 'lock',
        lockReason: 'MainActivity.lockPhoneIfDue() -> dpm.lockNow()',
      }));
      setEnteredPin('');
    }
  };

  const handlePeriodicSyncCheck = () => {
    const imei = '860293049182345';
    onLogAction('info', `24h Background Poller (WorkManager): Querying GET /api/check-status/${imei}...`, 'workmanager-poller');
    
    if (onTriggerCheckStatus) {
      const res = onTriggerCheckStatus(imei);
      if (res) {
        if (res.isLocked) {
          triggerToast(res.message);
          setEmiConfig(p => ({ ...p, isEmiLocked: true, isOverdue: true }));
          setDeviceState(prev => ({
            ...prev,
            isLocked: true,
            screen: 'emi_lock',
            lockReason: res.message
          }));
          onLogAction('danger', `Server: isLocked=true ("${res.message}") -> DevicePolicyManager.lockNow() called!`, 'force-lock');
        } else {
          triggerToast(res.message);
          setEmiConfig(p => ({ ...p, isEmiLocked: false, isOverdue: false }));
          if (deviceState.screen === 'emi_lock') {
            setDeviceState(prev => ({
              ...prev,
              isLocked: false,
              screen: 'home',
              lockReason: null
            }));
          }
          onLogAction('security', `Server: isLocked=false ("${res.message}") -> Device kept normal`, 'workmanager-poller');
        }
      }
    } else {
      triggerToast("Payment up to date. Device normal.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 max-w-7xl mx-auto items-start">
      {/* Left Column: Interactive Virtual Android Phone (5 cols) */}
      <div className="lg:col-span-5 flex justify-center">
        {/* Smartphone Hardware Frame */}
        <div className="relative w-[340px] h-[670px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700/80 ring-1 ring-slate-950 flex flex-col overflow-hidden select-none">
          {/* Top Notch / Camera Cutout */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-4 bg-black rounded-full z-40 border border-slate-800 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-indigo-950/80 rounded-full"></div>
          </div>

          {/* Screen Content Wrapper */}
          <div className="relative w-full h-full bg-slate-950 rounded-[34px] overflow-hidden flex flex-col text-white font-sans">
            {/* Android Status Bar */}
            <div className="h-7 px-5 pt-1.5 flex items-center justify-between text-[11px] font-medium text-slate-300 z-30">
              <span className="font-mono tabular-nums">09:41</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Wifi className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">5G</span>
                <BatteryMedium className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* SCREEN: DEVICE BOOTING ANIMATION (RECEIVE_BOOT_COMPLETED) */}
            {deviceState.isBooting && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black animate-fade-in z-50">
                <div className="w-12 h-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mb-4" />
                <h4 className="text-sm font-semibold text-white">Restarting Device...</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Firing <code className="font-mono text-emerald-400">BOOT_COMPLETED</code> intent to <code className="text-slate-300">.EMIAdminReceiver</code>
                </p>
              </div>
            )}

            {/* SCREEN: EMI PAYMENT SUCCESS */}
            {deviceState.screen === 'emi_payment_success' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-950 animate-fade-in">
                <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full mx-auto flex items-center justify-center border border-emerald-500/30 mb-3 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">Payment Received</h3>
                <div className="text-xs text-emerald-400 font-mono mt-1">
                  <span>₹2,499.00 Verified</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Financier webhook received via INTERNET. Disabling EMI lock screen...
                </p>
              </div>
            )}

            {/* SCREEN: DEDICATED EMI FINANCE LOCK SCREEN */}
            {deviceState.screen === 'emi_lock' && !deviceState.isBooting && (
              <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-rose-950/80 via-slate-950 to-slate-950 text-center animate-fade-in">
                <div className="pt-2 space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300 font-semibold">
                    <Lock className="w-3 h-3" />
                    <span>HANDSET RESTRICTED (OVERDUE EMI)</span>
                  </div>

                  <h3 className="text-xs text-slate-300 font-medium">
                    {emiConfig.lenderName}
                  </h3>

                  <div className="p-3 bg-slate-900/90 border border-rose-500/30 rounded-xl text-left space-y-1.5 text-xs shadow-lg">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Customer:</span>
                      <span className="text-slate-200 font-medium">{emiConfig.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Loan ID:</span>
                      <code className="text-slate-200 font-mono text-[11px]">{emiConfig.loanId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due Amount:</span>
                      <span className="text-rose-400 font-bold text-sm font-mono tabular-nums">
                        {emiConfig.currency}{emiConfig.emiAmount}.00
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Due Date:</span>
                      <span className="text-amber-300 font-medium">{emiConfig.dueDate}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed px-1">
                    This handset has been locked by <code className="text-slate-300 font-mono">.EMIAdminReceiver</code>. Clear your installment to restore full device functionality.
                  </p>
                </div>

                {/* Instant Pay Simulation */}
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handlePayEmi}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Now via UPI ({emiConfig.currency}{emiConfig.emiAmount})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => alert("Emergency call 112 initiated. Emergency calls remain accessible by law.")}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Emergency (112)</span>
                    </button>

                    <button
                      onClick={() => alert(`Calling customer care: ${emiConfig.supportPhone}`)}
                      className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Helpline</span>
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 pt-1">
                  Enforced via <code className="text-slate-400">BIND_DEVICE_ADMIN</code>
                </div>
              </div>
            )}

            {/* SCREEN: OUT OF BOX / WIPED STATE */}
            {deviceState.screen === 'out_of_box' && !deviceState.isBooting && (
              <div className="flex-1 flex flex-col items-center justify-between p-6 text-center animate-fade-in">
                <div className="mt-8 space-y-2">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center border border-emerald-500/20">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Hi there</h3>
                  <div className="text-xs text-slate-400">
                    <span>Device factory reset complete · Android Zero-Touch ready</span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl text-left w-full space-y-1 text-xs">
                  <span className="font-semibold text-slate-200">Device Policy Manager Status:</span>
                  <p className="text-slate-400 text-[11px]">
                    All partitions wiped. Device owner and profile owner records erased as per policy <code className="text-rose-400">&lt;wipe-data /&gt;</code>.
                  </p>
                </div>

                <div className="w-full space-y-2">
                  <button
                    onClick={() => {
                      resetOutofBox();
                      triggerToast("Enrolled via QR Code (Device Owner)");
                      onLogAction('security', 'Enrolled via QR Code: .EMIAdminReceiver provisioned as Device Owner', 'qr-enrollment');
                    }}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Scan MDM Enrollment QR Code</span>
                  </button>

                  <button
                    onClick={resetOutofBox}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition-colors"
                  >
                    Standard Setup Wizard
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: WIPING ANIMATION */}
            {deviceState.screen === 'wiping' && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black animate-pulse">
                <div className="w-16 h-16 rounded-full border-4 border-rose-500 border-t-transparent animate-spin mb-4" />
                <h3 className="text-base font-semibold text-rose-400">Erasing...</h3>
                <div className="text-xs text-slate-400 mt-2">
                  <span>Wiping user data and cryptographic keys</span>
                </div>
                <div className="mt-4 text-[10px] font-mono text-slate-500">
                  dpm.wipeData(WIPE_EXTERNAL_STORAGE)
                </div>
              </div>
            )}

            {/* SCREEN: ACTIVATION DIALOG (ACTION_ADD_DEVICE_ADMIN) */}
            {deviceState.screen === 'activation' && (
              <div className="flex-1 flex flex-col justify-between p-5 bg-slate-900 text-left text-xs overflow-y-auto">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">Activate device admin?</h4>
                      <div className="text-slate-400 text-[11px]">EMIAdminReceiver (com.finance.emilocker)</div>
                    </div>
                  </div>

                  {/* EXTRA_ADD_EXPLANATION from MainActivity.kt */}
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl mb-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>EXTRA_ADD_EXPLANATION (MainActivity.kt)</span>
                    </div>
                    <p className="text-white text-xs font-medium italic">
                      &ldquo;Yeh app EMI financing security ke liye zaroori hai.&rdquo;
                    </p>
                    <div className="text-[10px] text-slate-400">
                      Dispatched via DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN
                    </div>
                  </div>

                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px] mb-3">
                    Activating this admin app will allow the app to perform the following operations:
                  </div>

                  <div className="space-y-2.5 text-slate-300">
                    {config.limitPassword.enabled && (
                      <div className="flex items-start gap-2">
                        <KeyRound className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">Set password rules</strong>
                          <span className="text-[11px] text-slate-400">Control the length and characters allowed in screen-unlock passcodes.</span>
                        </div>
                      </div>
                    )}

                    {config.forceLock.enabled && (
                      <div className="flex items-start gap-2">
                        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">Lock the screen</strong>
                          <span className="text-[11px] text-slate-400">Control how and when the screen locks.</span>
                        </div>
                      </div>
                    )}

                    {config.wipeData.enabled && (
                      <div className="flex items-start gap-2">
                        <Trash2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">Erase all data</strong>
                          <span className="text-[11px] text-slate-400">Factory reset the device without your confirmation by wiping all data.</span>
                        </div>
                      </div>
                    )}

                    {config.disableCamera.enabled && (
                      <div className="flex items-start gap-2">
                        <Camera className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white block">Disable cameras</strong>
                          <span className="text-[11px] text-slate-400">Prevent use of all device cameras.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-800 mt-4">
                  <button
                    onClick={() => {
                      setDeviceState(p => ({ ...p, isEnrolled: false, screen: 'home' }));
                      triggerToast("EMI Admin Deactivated");
                      onLogAction('warn', 'EMIAdminReceiver.onDisabled(): Toast.makeText(context, "EMI Admin Deactivated", Toast.LENGTH_SHORT).show()');
                    }}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setDeviceState(p => ({ ...p, isEnrolled: true, screen: 'home' }));
                      triggerToast("EMI Admin Activated");
                      onLogAction('security', 'EMIAdminReceiver.onEnabled(): Toast.makeText(context, "EMI Admin Activated", Toast.LENGTH_SHORT).show()');
                    }}
                    className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors"
                  >
                    Activate
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: LOCK SCREEN */}
            {deviceState.screen === 'lock' && (
              <div className="flex-1 flex flex-col justify-between p-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-center animate-fade-in">
                {/* Lock Screen Header */}
                <div className="pt-4 space-y-1">
                  <div className="w-7 h-7 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-300 mb-2">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <h2 className="text-3xl font-light text-white font-mono tracking-tight tabular-nums">09:41</h2>
                  <div className="text-xs text-slate-400">
                    <span>Tuesday, October 27</span>
                  </div>

                  {/* Administrative Message Banner */}
                  {config.forceLock.enabled && config.forceLock.customLockMessage && (
                    <div className="mt-3 mx-auto px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 max-w-[260px] line-clamp-2">
                      {config.forceLock.customLockMessage}
                    </div>
                  )}
                </div>

                {/* PIN Entry Area */}
                <div className="space-y-3">
                  <div className="flex justify-center items-center gap-3 h-8">
                    {Array.from({ length: Math.max(6, config.limitPassword.minLength) }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full border transition-all ${
                          i < enteredPin.length
                            ? 'bg-emerald-400 border-emerald-400 scale-110'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {pinError && (
                    <div className="text-xs text-rose-400 font-medium px-2">
                      {pinError}
                    </div>
                  )}

                  {lockoutTimer > 0 && (
                    <div className="text-xs text-amber-400 font-medium">
                      Try again in {lockoutTimer}s
                    </div>
                  )}

                  {/* Numeric Keypad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto pt-2">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((item) => (
                      <button
                        key={item}
                        disabled={lockoutTimer > 0}
                        onClick={() => {
                          if (item === 'C') handleKeypadBackspace();
                          else if (item === 'OK') handleUnlockAttempt();
                          else handleKeypadPress(item);
                        }}
                        className={`h-11 rounded-full flex items-center justify-center font-medium text-sm transition-all active:scale-95 ${
                          item === 'OK'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 font-semibold'
                            : item === 'C'
                            ? 'text-slate-400 hover:text-slate-200'
                            : 'bg-slate-800/80 hover:bg-slate-700/80 text-white'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  Default PIN: <code className="text-slate-400 font-mono">123456</code>
                </div>
              </div>
            )}

            {/* SCREEN: HOME SCREEN */}
            {deviceState.screen === 'home' && (
              <div className="flex-1 flex flex-col justify-between p-4 bg-gradient-to-b from-slate-900 to-slate-950">
                {/* Top Search Widget & Profile pill */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2 pt-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>MDM Managed</span>
                    </div>

                    <button
                      onClick={() => setDeviceState(p => ({ ...p, isWorkProfileActive: !p.isWorkProfileActive }))}
                      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        deviceState.isWorkProfileActive
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      <Briefcase className="w-3 h-3" />
                      <span>{deviceState.isWorkProfileActive ? 'Work Mode' : 'Personal'}</span>
                    </button>
                  </div>

                  {/* Android Search pill */}
                  <div className="bg-slate-800/90 border border-slate-700/60 rounded-full px-3.5 py-2 flex items-center justify-between text-xs text-slate-400 shadow-sm">
                    <span>Search apps or web</span>
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">G</div>
                  </div>
                </div>

                {/* App Grid */}
                <div className="grid grid-cols-4 gap-4 px-2 py-4">
                  {/* EMI Locker App (MainActivity.kt) */}
                  <button
                    onClick={handleMainActivityLockPhoneIfDue}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                    title="MainActivity.kt: lockPhoneIfDue()"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shadow-sm relative">
                      <Smartphone className="w-6 h-6" />
                      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-[8px] font-bold text-slate-950 flex items-center justify-center ring-2 ring-slate-900">
                        ₹
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-300 font-semibold truncate max-w-[65px]">EMI App</span>
                  </button>

                  {/* Camera App */}
                  <button
                    onClick={() => setDeviceState(p => ({ ...p, screen: 'camera' }))}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shadow-sm relative">
                      <Camera className="w-6 h-6" />
                      {config.disableCamera.enabled && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]">
                          <X className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium">Camera</span>
                  </button>

                  {/* Security Agent App */}
                  <button
                    onClick={() => setDeviceState(p => ({ ...p, screen: 'security_app' }))}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium">Security</span>
                  </button>

                  {/* Settings App */}
                  <button
                    onClick={() => setDeviceState(p => ({ ...p, screen: 'settings_pin' }))}
                    className="flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform shadow-sm">
                      <Settings className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] text-slate-300 font-medium">Settings</span>
                  </button>
                </div>

                {/* Bottom Dock */}
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-around">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <button
                    onClick={triggerForceLock}
                    title="Lock device"
                    className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center hover:bg-amber-500/30"
                  >
                    <Lock className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: CAMERA APP VIEW */}
            {deviceState.screen === 'camera' && (
              <div className="flex-1 flex flex-col justify-between p-4 bg-black relative text-white">
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setDeviceState(p => ({ ...p, screen: 'home' }))}
                    className="p-1.5 rounded-full bg-slate-800/80 text-slate-300 hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-400">Camera</span>
                  <div className="w-7" />
                </div>

                {/* Camera Disabled by Policy Overlay */}
                {config.disableCamera.enabled ? (
                  <div className="p-4 bg-slate-900/90 border border-rose-500/30 rounded-2xl text-center space-y-2.5 m-2 shadow-xl">
                    <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">Camera is disabled</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This action is blocked by your organization&apos;s security policy (<code className="text-rose-400 font-mono">&lt;disable-camera /&gt;</code>).
                    </p>
                    <button
                      onClick={() => setDeviceState(p => ({ ...p, screen: 'home' }))}
                      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition-colors"
                    >
                      Return to Home
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="w-44 h-44 rounded-2xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-xs">
                      Live Viewfinder (Normal)
                    </div>
                  </div>
                )}

                <div className="pb-4 flex justify-center">
                  <div className={`w-14 h-14 rounded-full border-4 ${config.disableCamera.enabled ? 'border-slate-800 bg-slate-900 opacity-50' : 'border-white bg-slate-200'}`} />
                </div>
              </div>
            )}

            {/* SCREEN: SETTINGS / PIN CHANGE */}
            {deviceState.screen === 'settings_pin' && (
              <div className="flex-1 flex flex-col justify-between p-4 bg-slate-900 text-white text-xs">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pt-1 border-b border-slate-800 pb-2">
                    <button
                      onClick={() => setDeviceState(p => ({ ...p, screen: 'home' }))}
                      className="p-1 rounded bg-slate-800 text-slate-300"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold text-sm">Screen Lock PIN</span>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Enter New PIN</label>
                    <input
                      type="password"
                      value={newPinCandidate}
                      onChange={(e) => setNewPinCandidate(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono tracking-widest text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Policy Compliance Checklist */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="font-semibold text-slate-300 mb-1">Active Policy Requirements:</div>
                    <div className="flex items-center gap-1.5">
                      {newPinCandidate.length >= config.limitPassword.minLength ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="text-slate-400">Length &gt;= {config.limitPassword.minLength} digits</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {config.limitPassword.minQuality === 'numeric_complex' && checkPinCompliance(newPinCandidate).length > 0 ? (
                        <X className="w-3.5 h-3.5 text-rose-400" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span className="text-slate-400">Complexity: {config.limitPassword.minQuality}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    disabled={checkPinCompliance(newPinCandidate).length > 0 || newPinCandidate.length < config.limitPassword.minLength}
                    onClick={() => {
                      setDeviceState(p => ({ ...p, currentPin: newPinCandidate, screen: 'home' }));
                      setNewPinCandidate('');
                      onLogAction('security', 'Device passcode updated and confirmed compliant with policy', 'limit-password');
                    }}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-semibold rounded-lg transition-colors"
                  >
                    Save Compliant PIN
                  </button>
                </div>
              </div>
            )}

            {/* SCREEN: SECURITY AGENT DASHBOARD */}
            {deviceState.screen === 'security_app' && (
              <div className="flex-1 flex flex-col justify-between p-4 bg-slate-900 text-white text-xs overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pt-1 border-b border-slate-800 pb-2">
                    <button
                      onClick={() => setDeviceState(p => ({ ...p, screen: 'home' }))}
                      className="p-1 rounded bg-slate-800 text-slate-300"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-semibold text-sm">Security Compliance</span>
                  </div>

                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-emerald-400 font-semibold">
                      <span>Device Status: COMPLIANT</span>
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Enrolled in Enterprise MDM Policy
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                      <span className="text-slate-400">Receiver Component</span>
                      <code className="text-emerald-400 text-[10px]">.EMIAdminReceiver</code>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                      <span className="text-slate-400">Password Limit Active</span>
                      <span className="text-emerald-400 font-medium">{config.limitPassword.enabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                      <span className="text-slate-400">Remote Force Lock</span>
                      <span className="text-amber-400 font-medium">{config.forceLock.enabled ? 'Armed' : 'Disabled'}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                      <span className="text-slate-400">Remote Wipe Capability</span>
                      <span className="text-rose-400 font-medium">{config.wipeData.enabled ? 'Authorized' : 'Disabled'}</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg flex items-center justify-between">
                      <span className="text-slate-400">Boot &amp; Cloud Sync</span>
                      <span className="text-cyan-400 font-medium font-mono text-[10px]">BOOT_COMPLETED + INTERNET</span>
                    </div>
                  </div>
                </div>

                {deviceState.isEnrolled ? (
                  <button
                    onClick={() => {
                      setDeviceState(p => ({ ...p, isEnrolled: false }));
                      triggerToast("EMI Admin Deactivated");
                      onLogAction('warn', 'EMIAdminReceiver.onDisabled(): Toast.makeText(context, "EMI Admin Deactivated", Toast.LENGTH_SHORT).show()');
                    }}
                    className="w-full py-2 bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-rose-500/20 font-medium rounded-lg text-xs transition-colors"
                  >
                    Deactivate EMI Admin (Trigger onDisabled)
                  </button>
                ) : (
                  <button
                    onClick={() => setDeviceState(p => ({ ...p, screen: 'activation' }))}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs"
                  >
                    View System Activation Dialog
                  </button>
                )}
              </div>
            )}

            {/* Android System Toast Display */}
            {toastMessage && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-slate-800/95 border border-slate-700/80 text-slate-100 text-[11px] px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md z-50 pointer-events-none animate-fade-in font-medium whitespace-nowrap flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                <span>{toastMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Remote DPM Dispatcher & Testing Bar (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Device State Summary Strip */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2.5">
            <div>
              <h3 className="text-sm font-semibold text-white">Virtual Device State &amp; DPM Controller</h3>
              <div className="text-xs text-slate-400 mt-0.5">
                <span>Directly invoke Android DevicePolicyManager &amp; EMIAdminReceiver hooks</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                deviceState.isLocked 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              }`}>
                {deviceState.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{deviceState.isLocked ? 'Screen Locked' : 'Unlocked / Normal'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg">
              <span className="text-slate-500 block text-[11px]">Enrolled Admin</span>
              <span className="text-slate-200 font-medium font-mono">
                {deviceState.isEnrolled ? '.EMIAdminReceiver' : 'Unprovisioned'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg">
              <span className="text-slate-500 block text-[11px]">Failed Attempts</span>
              <span className="text-slate-200 font-medium font-mono tabular-nums">
                {deviceState.failedPinAttempts} / {config.limitPassword.maxFailedAttempts}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg">
              <span className="text-slate-500 block text-[11px]">Active Screen</span>
              <span className="text-emerald-400 font-medium capitalize">
                {deviceState.screen.replace('_', ' ')}
              </span>
            </div>
            <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-lg">
              <span className="text-slate-500 block text-[11px]">EMI Loan Status</span>
              <span className={emiConfig.isEmiLocked ? "text-rose-400 font-medium" : "text-emerald-400 font-medium"}>
                {emiConfig.isEmiLocked ? 'Overdue (Locked)' : 'Good Standing'}
              </span>
            </div>
          </div>
        </div>

        {/* EMI Handset Finance Control Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                EMI Handset Financing &amp; Receiver Broadcasts
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">.EMIAdminReceiver</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* MainActivity: lockPhoneIfDue() */}
            <button
              onClick={handleMainActivityLockPhoneIfDue}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/40 text-left transition-all group col-span-1 sm:col-span-2"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white group-hover:text-emerald-300">
                    MainActivity.kt: lockPhoneIfDue()
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    User Code
                  </span>
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5 truncate">
                  if (!isAdminActive) prompt ACTION_ADD_DEVICE_ADMIN else dpm.lockNow()
                </code>
              </div>
            </button>

            {/* Trigger EMI Lockout */}
            <button
              onClick={handleTriggerEmiLock}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-rose-500/40 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-rose-300">
                  Trigger EMI Overdue Lock
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  Overdue Installment Lockout
                </code>
              </div>
            </button>

            {/* Simulate BOOT_COMPLETED */}
            <button
              onClick={handleSimulateBootCompleted}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <RotateCw className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-cyan-300">
                  Simulate BOOT_COMPLETED
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  RECEIVE_BOOT_COMPLETED
                </code>
              </div>
            </button>

            {/* Broadcast Custom Action */}
            <button
              onClick={handleBroadcastCustomAction}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                  Send Custom Admin Action
                </div>
                <code className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate max-w-[210px]">
                  app.device.admin.ACTION...
                </code>
              </div>
            </button>

            {/* Clear Lock via Payment */}
            <button
              onClick={handlePayEmi}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                  Simulate Payment Cleared
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  Release Handset Lock
                </code>
              </div>
            </button>

            {/* 24-Hour Periodic WorkManager Status Check (GET /api/check-status/:imei) */}
            <button
              onClick={handlePeriodicSyncCheck}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/40 text-left transition-all group col-span-1 sm:col-span-2"
            >
              <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <RefreshCw className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white group-hover:text-cyan-300">
                    Run 24h Poller: GET /api/check-status/860293049182345
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                    Express API
                  </span>
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5 truncate">
                  EmiStatusSyncWorker.kt =&gt; checks cloud ledger &amp; calls lockPhoneIfDue() if overdue
                </code>
              </div>
            </button>

            {/* Open EMI Express Backend Console */}
            {onNavigateToBackend && (
              <button
                onClick={onNavigateToBackend}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-left transition-all group col-span-1 sm:col-span-2"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Server className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-amber-300 group-hover:text-amber-200">
                      Open EMI Cloud Backend &amp; Ledger Console
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                      server.js (Port 3000)
                    </span>
                  </div>
                  <code className="text-[11px] font-mono text-slate-400 block mt-0.5 truncate">
                    Register customers, adjust due dates, and test manual shopkeeper lock toggles
                  </code>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Remote Action Buttons */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Standard Device Policy Manager Commands
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Force Lock Action */}
            <button
              onClick={triggerForceLock}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-amber-300">
                  Trigger Force Lock
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  dpm.lockNow()
                </code>
              </div>
            </button>

            {/* Simulate Failed Passcode */}
            <button
              onClick={() => {
                const next = deviceState.failedPinAttempts + 1;
                setDeviceState(p => ({
                  ...p,
                  isLocked: true,
                  screen: 'lock',
                  failedPinAttempts: next,
                }));
                onLogAction('warn', `Simulated failed login attempt #${next}`, 'limit-password');
                if (next >= config.limitPassword.maxFailedAttempts && config.wipeData.enabled) {
                  onLogAction('danger', 'Threshold exceeded: triggering automated wipe', 'wipe-data');
                  startWipeProcess();
                }
              }}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                  Simulate Bad PIN Entry
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  ACTION_PASSWORD_FAILED
                </code>
              </div>
            </button>

            {/* Remote Wipe Trigger */}
            <button
              onClick={() => setWipeConfirmOpen(true)}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-rose-950/20 border border-rose-500/30 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-rose-300">
                  Trigger Remote Wipe
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  dpm.wipeData(flags)
                </code>
              </div>
            </button>

            {/* Launch System Activation Dialog */}
            <button
              onClick={() => setDeviceState(p => ({ ...p, screen: 'activation' }))}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-emerald-300">
                  Show Activation Dialog
                </div>
                <code className="text-[11px] font-mono text-slate-400 block mt-0.5">
                  ACTION_ADD_DEVICE_ADMIN
                </code>
              </div>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-800 text-xs">
            <button
              onClick={resetOutofBox}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Full Device Reboot &amp; Reset</span>
            </button>
            <span className="text-slate-500 text-[11px]">Simulates physical hardware restart</span>
          </div>
        </div>

        {/* Wipe Confirmation Modal */}
        {wipeConfirmOpen && (
          <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                  Confirm Remote Device Wipe Command
                </h4>
                <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                  Executing <code className="font-mono bg-rose-900/50 px-1 py-0.5 rounded">dpm.wipeData({config.wipeData.wipeExternalStorage ? 'WIPE_EXTERNAL_STORAGE' : '0'})</code> will permanently erase all data, apps, and storage partitions on the simulated phone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setWipeConfirmOpen(false)}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={startWipeProcess}
                className="px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Execute Remote Wipe
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
