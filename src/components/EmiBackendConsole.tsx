import React, { useState, useEffect } from 'react';
import { EmiCustomerRecord } from '../types/deviceAdmin';
import { 
  Server, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Calendar, 
  Smartphone, 
  Terminal, 
  Copy, 
  Check, 
  UserCheck, 
  DollarSign, 
  Database,
  ArrowRight,
  Trash2,
  Search,
  X,
  Plus,
  CreditCard,
  ShieldCheck,
  CheckCircle,
  Receipt,
  Eye,
  History,
  Wallet
} from 'lucide-react';

interface EmiBackendConsoleProps {
  customers: EmiCustomerRecord[];
  onRegisterCustomer: (customer: { name: string; imei: string; dueDate: string; emiAmount: number }) => void;
  onCheckStatus: (imei: string) => { imei: string; isLocked: boolean; dueDate: string; message: string } | null;
  onToggleLock: (imei: string, isLocked: boolean) => void;
  onRecordPayment?: (imei: string, amount: number, method?: string, notes?: string) => void;
  onDeleteCustomer?: (imei: string) => void;
  simulatedDeviceImei: string;
  onSyncWithSimulator?: () => void;
  onLogAction: (level: 'info' | 'warn' | 'security' | 'danger', message: string, policyTag?: string) => void;
}

export const EmiBackendConsole: React.FC<EmiBackendConsoleProps> = ({
  customers,
  onRegisterCustomer,
  onCheckStatus,
  onToggleLock,
  onRecordPayment,
  onDeleteCustomer,
  simulatedDeviceImei,
  onSyncWithSimulator,
  onLogAction
}) => {
  // Form fields for /api/customer
  const [formName, setFormName] = useState('Abhi Kumar');
  const [formImei, setFormImei] = useState(simulatedDeviceImei);
  const [formDueDate, setFormDueDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  const [formAmount, setFormAmount] = useState(2499);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'overdue' | 'active'>('all');

  // MongoDB connection test state
  const [mongoUriInput, setMongoUriInput] = useState('');
  const [mongoStatus, setMongoStatus] = useState<{
    tested: boolean;
    connecting: boolean;
    success?: boolean;
    message?: string;
  }>({
    tested: false,
    connecting: false
  });

  // Payment modal state
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<EmiCustomerRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(2499);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Cash' | 'Debit Card' | 'Credit Card' | 'Bank Transfer'>('UPI');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Customer Details & Payment History Modal state
  const [detailsModalCustomer, setDetailsModalCustomer] = useState<EmiCustomerRecord | null>(null);

  // Inspector state
  const [lastRequest, setLastRequest] = useState<{
    method: 'POST' | 'GET' | 'DELETE';
    endpoint: string;
    body?: Record<string, unknown>;
    timestamp: string;
  }>({
    method: 'POST',
    endpoint: '/api/customer',
    body: {
      name: 'Abhi Kumar',
      imei: simulatedDeviceImei,
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      emiAmount: 2499
    },
    timestamp: 'Server Initialized'
  });

  const [lastResponse, setLastResponse] = useState<{
    status: number;
    data: Record<string, unknown>;
  }>({
    status: 200,
    data: {
      success: true,
      message: 'Express EMI Server with Mongoose ODM is running on port 3000',
      activeRoutes: [
        'POST /api/customer',
        'GET /api/check-status/:imei',
        'POST /api/admin/toggle-lock',
        'POST /api/admin/payment',
        'DELETE /api/customer/:imei'
      ]
    }
  });

  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedMongoCmd, setCopiedMongoCmd] = useState(false);

  // Sync initial MongoDB status from backend health check
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        if (data.mongoStatus === 'CONNECTED') {
          setMongoStatus({
            tested: true,
            connecting: false,
            success: true,
            message: `Connected to MongoDB Atlas (${data.database})`
          });
        }
      })
      .catch(() => {});
  }, []);

  // Date presets helper
  const setDatePreset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    setFormDueDate(d.toISOString().split('T')[0]);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formImei || !formDueDate) return;

    const payload = {
      name: formName,
      imei: formImei,
      dueDate: formDueDate,
      emiAmount: Number(formAmount)
    };

    const isOverdue = new Date() > new Date(formDueDate);

    setLastRequest({
      method: 'POST',
      endpoint: '/api/customer',
      body: payload,
      timestamp: new Date().toLocaleTimeString()
    });

    onRegisterCustomer(payload);

    setLastResponse({
      status: 201,
      data: {
        success: true,
        message: 'Customer registered successfully in database.',
        customer: {
          ...payload,
          isLocked: isOverdue
        }
      }
    });

    onLogAction(
      isOverdue ? 'danger' : 'info',
      `POST /api/customer -> IMEI: ${formImei} (${isOverdue ? 'OVERDUE: Device Flagged for Lock' : 'CURRENT'})`,
      'express-api'
    );
  };

  const handleTriggerCheckStatus = (imei: string) => {
    setLastRequest({
      method: 'GET',
      endpoint: `/api/check-status/${imei}`,
      timestamp: new Date().toLocaleTimeString()
    });

    const res = onCheckStatus(imei);

    if (res) {
      setLastResponse({
        status: 200,
        data: res
      });
      onLogAction(
        res.isLocked ? 'warn' : 'info',
        `GET /api/check-status/${imei} -> isLocked: ${res.isLocked} ("${res.message}")`,
        'workmanager-poller'
      );
    } else {
      setLastResponse({
        status: 404,
        data: { error: 'Device not found in financing database.' }
      });
      onLogAction('warn', `GET /api/check-status/${imei} -> 404 Not Found`, 'express-api');
    }
  };

  const handleTriggerToggleLock = (imei: string, currentLock: boolean) => {
    const newLockState = !currentLock;
    setLastRequest({
      method: 'POST',
      endpoint: '/api/admin/toggle-lock',
      body: { imei, isLocked: newLockState },
      timestamp: new Date().toLocaleTimeString()
    });

    onToggleLock(imei, newLockState);

    const targetCustomer = customers.find(c => c.imei === imei);

    setLastResponse({
      status: 200,
      data: {
        success: true,
        message: `Device lock status changed to: ${newLockState ? 'LOCKED' : 'UNLOCKED'}`,
        customer: targetCustomer ? { ...targetCustomer, isLocked: newLockState } : { imei, isLocked: newLockState }
      }
    });

    onLogAction(
      newLockState ? 'danger' : 'security',
      `POST /api/admin/toggle-lock -> IMEI: ${imei} => ${newLockState ? 'REMOTE LOCK' : 'REMOTE UNLOCK'}`,
      'force-lock'
    );
  };

  const handleExecutePayment = (customer: EmiCustomerRecord) => {
    const receiptId = `REC-${Date.now().toString().slice(-6)}`;
    const newPaymentRecord = {
      amount: paymentAmount,
      date: new Date().toISOString(),
      method: paymentMethod,
      receiptId,
      notes: paymentNotes || 'EMI installment settled'
    };

    if (onRecordPayment) {
      onRecordPayment(customer.imei, paymentAmount, paymentMethod, paymentNotes || 'EMI installment settled');
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    setLastRequest({
      method: 'POST',
      endpoint: '/api/admin/payment',
      body: { 
        imei: customer.imei, 
        amountPaid: paymentAmount,
        method: paymentMethod,
        receiptId,
        notes: paymentNotes || 'EMI installment settled'
      },
      timestamp: new Date().toLocaleTimeString()
    });

    setLastResponse({
      status: 200,
      data: {
        success: true,
        message: `Payment of ₹${paymentAmount} via ${paymentMethod} received. Handset unlocked & due date extended to ${nextDueDateStr}.`,
        customer: {
          ...customer,
          isLocked: false,
          dueDate: nextDueDateStr,
          paymentHistory: customer.paymentHistory ? [newPaymentRecord, ...customer.paymentHistory] : [newPaymentRecord]
        }
      }
    });

    onLogAction(
      'security',
      `POST /api/admin/payment -> IMEI: ${customer.imei} received ₹${paymentAmount} via ${paymentMethod} (${receiptId}). Handset unlocked.`,
      'payment-settled'
    );

    setPaymentModalCustomer(null);
    setPaymentNotes('');
  };

  const handleDelete = (imei: string) => {
    if (onDeleteCustomer) {
      onDeleteCustomer(imei);
    }

    setLastRequest({
      method: 'DELETE',
      endpoint: `/api/customer/${imei}`,
      timestamp: new Date().toLocaleTimeString()
    });

    setLastResponse({
      status: 200,
      data: {
        success: true,
        message: `Customer with IMEI ${imei} deleted successfully.`
      }
    });

    onLogAction('warn', `DELETE /api/customer/${imei} -> Record purged from database`, 'express-api');
  };

  const handleTestMongoUri = async () => {
    if (!mongoUriInput) return;
    setMongoStatus({ tested: false, connecting: true });

    try {
      const res = await fetch('/api/test-mongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: mongoUriInput })
      });
      const data = await res.json();
      if (res.ok) {
        setMongoStatus({
          tested: true,
          connecting: false,
          success: true,
          message: data.message || 'Connected to MongoDB Atlas successfully!'
        });
        onLogAction('security', `Connected to MongoDB Atlas: ${data.databaseName}`, 'mongoose-db');
      } else {
        setMongoStatus({
          tested: true,
          connecting: false,
          success: false,
          message: data.error || data.details || 'Connection failed'
        });
      }
    } catch (err: any) {
      setMongoStatus({
        tested: true,
        connecting: false,
        success: false,
        message: err.message || 'Network error reaching /api/test-mongo'
      });
    }
  };

  const generateCurl = () => {
    if (lastRequest.method === 'GET') {
      return `curl -X GET "http://localhost:3000${lastRequest.endpoint}" \\
  -H "Accept: application/json"`;
    }
    if (lastRequest.method === 'DELETE') {
      return `curl -X DELETE "http://localhost:3000${lastRequest.endpoint}" \\
  -H "Accept: application/json"`;
    }
    return `curl -X POST "http://localhost:3000${lastRequest.endpoint}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(lastRequest.body || {})}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // Real-time filtered customer list by name or IMEI
  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      c.name.toLowerCase().includes(query) || 
      c.imei.toLowerCase().includes(query);

    if (!matchesSearch) return false;

    const isOverdue = new Date() > new Date(c.dueDate);
    if (filterTab === 'overdue') return isOverdue || c.isLocked;
    if (filterTab === 'active') return !isOverdue && !c.isLocked;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
      {/* Top Banner Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">EMI Financing Express.js &amp; Mongoose Server</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                PORT 3000 ONLINE
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                MONGOOSE ODM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              REST backend handling customer enrollment, 24-hour Android poller verification, payments, and shopkeeper manual lock/unlock.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Virtual Handset: </span>
            <span className="text-amber-400 font-semibold">{simulatedDeviceImei}</span>
          </div>
          {onSyncWithSimulator && (
            <button
              onClick={onSyncWithSimulator}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium transition-colors flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Go to Handset</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: API Registration Form & MongoDB Connection */}
        <div className="lg:col-span-5 space-y-6">
          {/* MongoDB Connection Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200">MongoDB Database Status</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {mongoStatus.success ? 'MONGODB ATLAS' : 'IN-MEMORY STORE'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Mongoose schema is actively initialized. You can connect your MongoDB Atlas cluster URI or test with the in-memory fallback ledger.
            </p>

            <div className="space-y-2">
              <label className="block text-[11px] text-slate-300 font-medium">Connect Custom MongoDB URI (Atlas / Local)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mongoUriInput}
                  onChange={(e) => setMongoUriInput(e.target.value)}
                  placeholder="mongodb+srv://user:pass@cluster.mongodb.net/emi_db"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTestMongoUri}
                  disabled={!mongoUriInput || mongoStatus.connecting}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {mongoStatus.connecting ? 'Connecting...' : 'Connect'}
                </button>
              </div>

              {mongoStatus.tested && (
                <div className={`p-2 rounded-lg text-[11px] ${mongoStatus.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                  {mongoStatus.message}
                </div>
              )}

              {/* Terminal CLI Command Snippet */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1.5 mt-2">
                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    <span>Run Server via Terminal:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('MONGO_URI="your_mongodb_atlas_connection_string" node server.js');
                      setCopiedMongoCmd(true);
                      setTimeout(() => setCopiedMongoCmd(false), 2000);
                    }}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                  >
                    {copiedMongoCmd ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedMongoCmd ? 'Copied!' : 'Copy CLI'}</span>
                  </button>
                </div>
                <div className="text-emerald-400 text-[10px] break-all select-all font-mono bg-black/40 p-1.5 rounded border border-slate-800/80">
                  MONGO_URI=&quot;your_mongodb_atlas_connection_string&quot; node server.js
                </div>
                <p className="text-[10px] text-slate-500 font-sans leading-tight">
                  Supports MongoDB Atlas cluster URLs (<code className="text-amber-300/80">mongodb+srv://...</code>). Automatically switches from fallback in-memory store to full MongoDB persistence.
                </p>
              </div>
            </div>
          </div>

          {/* Registration Form (POST /api/customer) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  POST
                </span>
                <span className="text-xs font-mono text-slate-200">/api/customer</span>
              </div>
              <span className="text-[11px] text-slate-400">Register / Update Customer</span>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Abhi Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Device IMEI Number</label>
                  <button
                    type="button"
                    onClick={() => setFormImei(simulatedDeviceImei)}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                  >
                    Use Virtual Handset IMEI
                  </button>
                </div>
                <input
                  type="text"
                  value={formImei}
                  onChange={(e) => setFormImei(e.target.value)}
                  placeholder="15-digit IMEI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">Installment Due Date</label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setDatePreset(-1)}
                      className="px-1.5 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    >
                      Yesterday (Overdue)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDatePreset(15)}
                      className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    >
                      +15 Days
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Server evaluates <code className="text-amber-400">today &gt; due</code>. Dates in the past automatically set <code className="text-rose-400">isLocked: true</code>.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Monthly Installment (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-mono">₹</span>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                    min="100"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.99]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Save to MongoDB / Express Database</span>
              </button>
            </form>
          </div>

          {/* Quick Endpoint Reference */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-3">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Express API Endpoints Implemented</span>
            </h3>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px]">POST</span>
                  <span>/api/customer</span>
                </div>
                <p className="font-sans text-[10px] text-slate-400 mt-0.5">
                  Register/update customer, saves to MongoDB, auto-flags overdue lock.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px]">GET</span>
                  <span>/api/check-status/:imei</span>
                </div>
                <p className="font-sans text-[10px] text-slate-400 mt-0.5">
                  Called by Android WorkManager every 24h. Returns isLocked &amp; due date.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2 text-violet-400 font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-[10px]">POST</span>
                  <span>/api/admin/toggle-lock</span>
                </div>
                <p className="font-sans text-[10px] text-slate-400 mt-0.5">
                  Remote manual lock/unlock toggle by shopkeeper.
                </p>
              </div>

              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px]">POST</span>
                  <span>/api/admin/payment</span>
                </div>
                <p className="font-sans text-[10px] text-slate-400 mt-0.5">
                  Collects payment, auto-extends due date +30 days &amp; unlocks device.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer Ledger & Live Request/Response Inspector */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Financing Customer Records</span>
                </h3>
                <p className="text-xs text-slate-400">Live database collection managed via Mongoose ODM</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-1.5 text-xs">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${filterTab === 'all' ? 'bg-slate-800 text-white font-medium border border-slate-700' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  All ({customers.length})
                </button>
                <button
                  onClick={() => setFilterTab('overdue')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${filterTab === 'overdue' ? 'bg-rose-500/20 text-rose-300 font-medium border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Overdue
                </button>
                <button
                  onClick={() => setFilterTab('active')}
                  className={`px-2.5 py-1 rounded-md text-xs transition-colors ${filterTab === 'active' ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Active
                </button>
              </div>
            </div>

            {/* Real-time Search Bar & Results Indicator */}
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer name (e.g. Abhi) or 15-digit IMEI in real-time..."
                  aria-label="Search customers by name or IMEI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-200 font-sans placeholder-slate-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    title="Clear search"
                    className="absolute right-3 p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Real-time stats and query feedback */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span>
                    Showing <strong className="text-slate-200">{filteredCustomers.length}</strong> of <strong className="text-slate-200">{customers.length}</strong> customers
                  </span>
                  {searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-mono">
                      filter: &ldquo;{searchQuery}&rdquo;
                    </span>
                  )}
                </div>

                {simulatedDeviceImei && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery(simulatedDeviceImei)}
                    className="text-[10px] text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <span>Filter Virtual Handset ({simulatedDeviceImei.slice(-4)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customers Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                    <th className="py-2.5 px-3">Customer &amp; IMEI</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Installment</th>
                    <th className="py-2.5 px-3">Payment History</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center font-sans text-xs">
                        <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                          <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-1">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-slate-200">
                            {searchQuery ? `No records found for "${searchQuery}"` : 'No customers in this category'}
                          </p>
                          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                            {searchQuery 
                              ? 'Check for spelling variations in the customer name or double-check the IMEI digits.' 
                              : 'No financing records currently match the selected status filter.'}
                          </p>
                          {(searchQuery || filterTab !== 'all') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setFilterTab('all');
                              }}
                              className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
                            >
                              Reset Search &amp; Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((c) => {
                      const isOverdue = new Date() > new Date(c.dueDate);
                      const isTargetDevice = c.imei === simulatedDeviceImei;
                      const paymentsCount = c.paymentHistory?.length || 0;
                      const totalPaid = c.paymentHistory?.reduce((sum, p) => sum + p.amount, 0) || 0;

                      return (
                        <tr key={c.imei} className={`hover:bg-slate-800/30 transition-colors ${isTargetDevice ? 'bg-amber-500/5' : ''}`}>
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => setDetailsModalCustomer(c)}
                              className="text-left font-sans font-semibold text-slate-100 hover:text-amber-400 transition-colors flex items-center gap-1.5 group"
                              title="Click to view Customer Details & Payment History"
                            >
                              <span className="group-hover:underline">{c.name}</span>
                              {isTargetDevice && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Virtual Handset
                                </span>
                              )}
                            </button>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{c.imei}</div>
                          </td>

                          <td className="py-3 px-3">
                            <div className={`font-mono text-xs ${isOverdue ? 'text-rose-400 font-semibold' : 'text-slate-300'}`}>
                              {c.dueDate}
                            </div>
                            <div className="text-[10px] text-slate-500 font-sans">
                              {isOverdue ? 'Overdue' : 'Current'}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-200 font-mono">
                            ₹{c.emiAmount.toLocaleString()}
                          </td>

                          {/* Payment History Column */}
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => setDetailsModalCustomer(c)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-[11px] font-sans transition-colors group"
                              title="View Payment Ledger"
                            >
                              <Receipt className="w-3 h-3 text-emerald-400" />
                              <span className="font-mono text-emerald-400 font-semibold">{paymentsCount}</span>
                              <span className="text-slate-400 text-[10px]">({totalPaid > 0 ? `₹${totalPaid.toLocaleString()}` : '0 paid'})</span>
                            </button>
                          </td>

                          <td className="py-3 px-3">
                            {c.isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <Lock className="w-2.5 h-2.5" />
                                <span>LOCKED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>ACTIVE</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Details / History button */}
                              <button
                                onClick={() => setDetailsModalCustomer(c)}
                                title="View Customer Details & Payment History"
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-sans font-medium transition-colors flex items-center gap-1"
                              >
                                <Eye className="w-3 h-3 text-amber-400" />
                                <span className="hidden sm:inline">Details</span>
                              </button>

                              {/* Poll status button */}
                              <button
                                onClick={() => handleTriggerCheckStatus(c.imei)}
                                title="Simulate Android GET /api/check-status/:imei"
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-sans transition-colors flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3 text-cyan-400" />
                                <span className="hidden sm:inline">Poll</span>
                              </button>

                              {/* Payment button */}
                              <button
                                onClick={() => {
                                  setPaymentModalCustomer(c);
                                  setPaymentAmount(c.emiAmount);
                                  setPaymentMethod('UPI');
                                  setPaymentNotes('');
                                }}
                                title="Collect EMI Payment & Extend Due Date"
                                className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-sans font-medium transition-colors flex items-center gap-1"
                              >
                                <CreditCard className="w-3 h-3 text-emerald-400" />
                                <span className="hidden sm:inline">Pay</span>
                              </button>

                              {/* Toggle Lock button */}
                              <button
                                onClick={() => handleTriggerToggleLock(c.imei, c.isLocked)}
                                title="Trigger POST /api/admin/toggle-lock"
                                className={`px-2 py-1 rounded text-[11px] font-sans font-medium transition-colors flex items-center gap-1 ${
                                  c.isLocked
                                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {c.isLocked ? (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>Unlock</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3 h-3" />
                                    <span>Lock</span>
                                  </>
                                )}
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDelete(c.imei)}
                                title="Delete customer record"
                                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live Request & Response Inspector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Live Express Request / Response Inspector</h3>
              </div>
              <button
                onClick={copyCurl}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition-colors"
              >
                {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCurl ? 'Copied cURL' : 'Copy cURL'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Request Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>HTTP REQUEST</span>
                  <span>{lastRequest.timestamp}</span>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-slate-300 overflow-x-auto min-h-[140px]">
                  <div className="text-amber-400 font-bold mb-1">
                    {lastRequest.method} {lastRequest.endpoint}
                  </div>
                  <div className="text-slate-500 text-[10px] mb-2">Host: localhost:3000 | Content-Type: application/json</div>
                  {lastRequest.body && (
                    <pre className="text-[11px] text-emerald-300">
                      {JSON.stringify(lastRequest.body, null, 2)}
                    </pre>
                  )}
                </div>
              </div>

              {/* Response Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>HTTP RESPONSE</span>
                  <span className={`font-bold ${lastResponse.status < 300 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    HTTP {lastResponse.status} OK
                  </span>
                </div>
                <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-slate-300 overflow-x-auto min-h-[140px]">
                  <div className="text-slate-500 text-[10px] mb-1">Content-Type: application/json; charset=utf-8</div>
                  <pre className="text-[11px] text-cyan-300">
                    {JSON.stringify(lastResponse.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Settlement Modal */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Record Installment Payment</h3>
              </div>
              <button
                onClick={() => setPaymentModalCustomer(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 font-mono">
                <div className="text-slate-400">Customer: <span className="text-white font-sans font-medium">{paymentModalCustomer.name}</span></div>
                <div className="text-slate-400">IMEI: <span className="text-amber-400">{paymentModalCustomer.imei}</span></div>
                <div className="text-slate-400">Current Due Date: <span className="text-rose-400">{paymentModalCustomer.dueDate}</span></div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Amount Received (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono text-sm focus:outline-none focus:border-emerald-500"
                  min="1"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Payment Method</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['UPI', 'Cash', 'Debit Card', 'Credit Card', 'Bank Transfer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        paymentMethod === method
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Notes / Reference */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Payment Reference / Notes (Optional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. GPay Ref #9812, Cash counter receipt #42"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-sans placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Immediate Automated Actions:</span>
                </div>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                  <li>Dispatches <code className="text-emerald-300 font-mono">POST /api/admin/payment</code> with method <span className="text-emerald-300 font-mono">({paymentMethod})</span></li>
                  <li>Appends record to customer's permanent payment history</li>
                  <li>Device lock status switches to <span className="text-emerald-300 font-bold">UNLOCKED</span></li>
                  <li>Due date automatically advances by <strong>+30 days</strong></li>
                </ul>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecutePayment(paymentModalCustomer)}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm &amp; Unlock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details & Payment History View Modal */}
      {detailsModalCustomer && (() => {
        const activeCustomer = customers.find(c => c.imei === detailsModalCustomer.imei) || detailsModalCustomer;
        const history = activeCustomer.paymentHistory || [];
        const totalPaid = history.reduce((sum, p) => sum + p.amount, 0);
        const isOverdue = new Date() > new Date(activeCustomer.dueDate);
        const isTargetDevice = activeCustomer.imei === simulatedDeviceImei;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white text-base">{activeCustomer.name}</h3>
                      {isTargetDevice && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Virtual Handset
                        </span>
                      )}
                      {activeCustomer.isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Lock className="w-2.5 h-2.5" />
                          <span>LOCKED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>ACTIVE</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      IMEI: <span className="text-slate-200">{activeCustomer.imei}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailsModalCustomer(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Total Paid</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    ₹{totalPaid.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">{history.length} payment{history.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Monthly EMI</span>
                  <div className="text-base font-bold text-slate-100 font-mono mt-0.5">
                    ₹{activeCustomer.emiAmount.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Per cycle</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Next Due Date</span>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${isOverdue ? 'text-rose-400' : 'text-slate-200'}`}>
                    {activeCustomer.dueDate}
                  </div>
                  <span className={`text-[10px] ${isOverdue ? 'text-rose-400 font-medium' : 'text-emerald-400'}`}>
                    {isOverdue ? 'Payment Overdue' : 'Account Current'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-mono">Security Status</span>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${activeCustomer.isLocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {activeCustomer.isLocked ? 'Device Locked' : 'Device Normal'}
                  </div>
                  <span className="text-[10px] text-slate-500">DPM Enforced</span>
                </div>
              </div>

              {/* Payment History Section */}
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Payment History &amp; Receipts</span>
                    <span className="text-[11px] font-mono text-slate-400">({history.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => {
                      setDetailsModalCustomer(null);
                      setPaymentModalCustomer(activeCustomer);
                      setPaymentAmount(activeCustomer.emiAmount);
                      setPaymentMethod('UPI');
                      setPaymentNotes('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Record New Payment</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/70 text-xs max-h-[260px]">
                  {history.length === 0 ? (
                    <div className="py-10 text-center text-slate-400 space-y-2">
                      <Wallet className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-slate-300 font-medium">No payments recorded yet</p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Record the first installment payment to advance the due date and unlock the device.
                      </p>
                    </div>
                  ) : (
                    history.map((record, idx) => {
                      const methodColor = 
                        record.method === 'UPI' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                        record.method === 'Cash' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        record.method === 'Bank Transfer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';

                      const dateStr = typeof record.date === 'string'
                        ? new Date(record.date).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : new Date(record.date).toLocaleDateString();

                      return (
                        <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                              <Receipt className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-100 font-mono">
                                  {record.receiptId || `REC-#${history.length - idx}`}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${methodColor}`}>
                                  {record.method}
                                </span>
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-mono">
                                  Settled
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {dateStr}
                              </div>
                              {record.notes && (
                                <div className="text-[11px] text-slate-300 italic">
                                  &ldquo;{record.notes}&rdquo;
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right sm:self-center font-mono">
                            <div className="text-sm font-bold text-emerald-400">
                              +₹{record.amount.toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-500">Auto-unlocked +30d</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTriggerToggleLock(activeCustomer.imei, activeCustomer.isLocked)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeCustomer.isLocked
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {activeCustomer.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{activeCustomer.isLocked ? 'Remote Unlock Handset' : 'Remote Lock Handset'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsModalCustomer(null);
                      setPaymentModalCustomer(activeCustomer);
                      setPaymentAmount(activeCustomer.emiAmount);
                      setPaymentMethod('UPI');
                      setPaymentNotes('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Collect Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailsModalCustomer(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
