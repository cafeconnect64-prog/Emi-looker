/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PolicyConfig, AuditLogItem, EmiCustomerRecord } from './types/deviceAdmin';
import { DEFAULT_POLICY_CONFIG } from './utils/xmlParser';
import { Header } from './components/Header';
import { PolicyArchitect } from './components/PolicyArchitect';
import { DeviceSimulator } from './components/DeviceSimulator';
import { EmiBackendConsole } from './components/EmiBackendConsole';
import { CodeGenerator } from './components/CodeGenerator';
import { FleetAuditConsole } from './components/FleetAuditConsole';
import { ExportModal } from './components/ExportModal';
import { ApkBuilderView } from './components/ApkBuilderView';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { ShieldCheck, ExternalLink, Terminal } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'architect' | 'simulator' | 'backend' | 'code' | 'fleet' | 'apk'>('architect');
  const [config, setConfig] = useState<PolicyConfig>(DEFAULT_POLICY_CONFIG);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // In-memory Customer Ledger Array matching user's Express server (let customers = [])
  const [customers, setCustomers] = useState<EmiCustomerRecord[]>([
    {
      name: 'Abhi Kumar',
      imei: '860293049182345',
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0], // Yesterday (Overdue)
      emiAmount: 2499,
      isLocked: true,
      lastChecked: '09:40:12',
      paymentHistory: [
        {
          amount: 2499,
          date: new Date(Date.now() - 31 * 86400000).toISOString(),
          method: 'UPI',
          receiptId: 'REC-918201',
          notes: 'GPay Installment #1'
        },
        {
          amount: 2499,
          date: new Date(Date.now() - 61 * 86400000).toISOString(),
          method: 'Bank Transfer',
          receiptId: 'REC-918200',
          notes: 'IMPS Initial Down-EMI'
        }
      ]
    },
    {
      name: 'Rahul Sharma',
      imei: '865120042918442',
      dueDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
      emiAmount: 1899,
      isLocked: false,
      lastChecked: '08:15:30',
      paymentHistory: [
        {
          amount: 1899,
          date: new Date(Date.now() - 18 * 86400000).toISOString(),
          method: 'Cash',
          receiptId: 'REC-442101',
          notes: 'Shop counter cash payment'
        }
      ]
    },
    {
      name: 'Pooja Verma',
      imei: '867823059102391',
      dueDate: new Date(Date.now() + 24 * 86400000).toISOString().split('T')[0],
      emiAmount: 3200,
      isLocked: false,
      lastChecked: 'Yesterday',
      paymentHistory: [
        {
          amount: 3200,
          date: new Date(Date.now() - 6 * 86400000).toISOString(),
          method: 'Debit Card',
          receiptId: 'REC-239101',
          notes: 'POS Terminal Swipe'
        }
      ]
    }
  ]);

  const [logs, setLogs] = useState<AuditLogItem[]>([
    {
      id: 'log-1',
      timestamp: '09:41:01',
      level: 'info',
      source: 'XMLParser',
      message: 'Parsed policy XML: <limit-password />, <force-lock />, <wipe-data />',
      policyTag: 'device-admin',
    },
    {
      id: 'log-2',
      timestamp: '09:41:02',
      level: 'security',
      source: 'ManifestParser',
      message: 'Registered .EMIAdminReceiver with BIND_DEVICE_ADMIN, INTERNET, and RECEIVE_BOOT_COMPLETED',
      policyTag: 'receiver',
    },
    {
      id: 'log-3',
      timestamp: '09:41:03',
      level: 'info',
      source: 'IntentFilter',
      message: 'Bound action: app.device.admin.ACTION_DEVICE_ADMIN_ENABLED & android.app.action.DEVICE_ADMIN_ENABLED',
    },
    {
      id: 'log-4',
      timestamp: '09:41:04',
      level: 'security',
      source: 'Express-Server',
      message: 'EMI Express server running on port 3000: Mounted /api/customer, /api/check-status/:imei, /api/admin/toggle-lock',
    },
  ]);

  const addLog = (
    level: 'info' | 'warn' | 'security' | 'danger',
    message: string,
    policyTag?: string
  ) => {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0];
    const newLog: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp,
      level,
      source: 'DPM-Event',
      message,
      policyTag,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Fetch customers from live Express/Mongoose server on mount
  const fetchRemoteCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.customers) && data.customers.length > 0) {
          const normalized: EmiCustomerRecord[] = data.customers.map((c: any) => ({
            name: c.name || 'Unknown',
            imei: c.imei,
            dueDate: typeof c.dueDate === 'string' ? c.dueDate.split('T')[0] : new Date(c.dueDate).toISOString().split('T')[0],
            emiAmount: Number(c.emiAmount) || 0,
            isLocked: Boolean(c.isLocked),
            lastChecked: c.lastChecked ? new Date(c.lastChecked).toLocaleTimeString() : 'Online',
            paymentHistory: Array.isArray(c.paymentHistory)
              ? c.paymentHistory.map((p: any) => ({
                  amount: Number(p.amount) || 0,
                  date: typeof p.date === 'string' ? p.date : new Date(p.date).toISOString(),
                  method: p.method || 'UPI',
                  receiptId: p.receiptId,
                  notes: p.notes
                }))
              : []
          }));
          setCustomers(normalized);
        }
      }
    } catch {
      // In offline / preview fallback, keep current state
    }
  };

  useEffect(() => {
    fetchRemoteCustomers();
  }, []);

  /**
   * 1. POST /api/customer Handler
   * Shopkeeper ya Admin yahan customer ki details aur EMI due date save karega.
   */
  const handleRegisterCustomer = async (payload: { name: string; imei: string; dueDate: string; emiAmount: number }) => {
    const today = new Date();
    const due = new Date(payload.dueDate);
    const isOverdue = today > due;

    // Optimistic local update
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.imei === payload.imei);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          name: payload.name || copy[idx].name,
          dueDate: payload.dueDate || copy[idx].dueDate,
          emiAmount: payload.emiAmount || copy[idx].emiAmount,
          isLocked: isOverdue,
          lastChecked: new Date().toLocaleTimeString()
        };
        return copy;
      } else {
        return [
          {
            name: payload.name || 'Unknown',
            imei: payload.imei,
            dueDate: payload.dueDate,
            emiAmount: payload.emiAmount || 0,
            isLocked: isOverdue,
            lastChecked: new Date().toLocaleTimeString()
          },
          ...prev
        ];
      }
    });

    // Real HTTP post to Express server
    try {
      await fetch('/api/customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      fetchRemoteCustomers();
    } catch {
      // Offline fallback maintained
    }
  };

  /**
   * 2. GET /api/check-status/:imei Handler
   * Android app har 24 ghante mein ya internet connect hone par is endpoint par request bhejega.
   */
  const handleCheckStatus = (imei: string) => {
    const customer = customers.find(c => c.imei === imei);
    if (!customer) {
      return null;
    }

    const today = new Date();
    const dueDate = new Date(customer.dueDate);
    const isOverdue = today > dueDate;

    if (isOverdue && !customer.isLocked) {
      setCustomers(prev => prev.map(c => c.imei === imei ? { ...c, isLocked: true } : c));
    }

    const finalLocked = isOverdue || customer.isLocked;

    // Asynchronously ping backend to sync state
    fetch(`/api/check-status/${imei}`).catch(() => {});

    return {
      imei: customer.imei,
      isLocked: finalLocked,
      dueDate: customer.dueDate,
      message: finalLocked ? "EMI overdue. Please lock device." : "Payment up to date. Device normal."
    };
  };

  /**
   * 3. POST /api/admin/toggle-lock Handler
   * Jab customer payment kar de, toh admin yahan se unka phone unlock kar sakta hai.
   */
  const handleToggleLock = async (imei: string, isLocked: boolean) => {
    setCustomers(prev => prev.map(c => c.imei === imei ? { ...c, isLocked } : c));

    try {
      await fetch('/api/admin/toggle-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imei, isLocked })
      });
      fetchRemoteCustomers();
    } catch {
      // Offline fallback maintained
    }
  };

  /**
   * 4. POST /api/admin/payment Handler
   * Records payment, updates customer payment history, and auto-extends due date by 30 days.
   */
  const handleRecordPayment = async (imei: string, amount: number, method: string = 'UPI', notes?: string) => {
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDateStr = nextDueDate.toISOString().split('T')[0];

    const newPaymentRecord = {
      amount,
      date: new Date().toISOString(),
      method,
      receiptId: `REC-${Date.now().toString().slice(-6)}`,
      notes: notes || 'EMI installment settled'
    };

    setCustomers(prev => prev.map(c => {
      if (c.imei === imei) {
        const history = c.paymentHistory ? [newPaymentRecord, ...c.paymentHistory] : [newPaymentRecord];
        return {
          ...c,
          isLocked: false,
          dueDate: nextDateStr,
          paymentHistory: history
        };
      }
      return c;
    }));

    try {
      await fetch('/api/admin/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imei, amountPaid: amount, method, notes })
      });
      fetchRemoteCustomers();
    } catch {
      // Offline fallback maintained
    }
  };

  /**
   * 5. DELETE /api/customer/:imei Handler
   */
  const handleDeleteCustomer = async (imei: string) => {
    setCustomers(prev => prev.filter(c => c.imei !== imei));

    try {
      await fetch(`/api/customer/${imei}`, { method: 'DELETE' });
      fetchRemoteCustomers();
    } catch {
      // Offline fallback maintained
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Universal Top Bar Contract */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExport={() => setIsExportOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1">
        {activeTab === 'architect' && (
          <PolicyArchitect
            config={config}
            onChangeConfig={setConfig}
            onLogAction={addLog}
            onTestInSimulator={() => {
              setActiveTab('simulator');
              addLog('security', 'Initiated virtual QR Code scan on emulator for zero-touch enrollment', 'qr-enrollment');
            }}
          />
        )}

        {activeTab === 'simulator' && (
          <DeviceSimulator
            config={config}
            onLogAction={addLog}
            customers={customers}
            onTriggerCheckStatus={handleCheckStatus}
            onTriggerToggleLock={handleToggleLock}
            onNavigateToBackend={() => setActiveTab('backend')}
          />
        )}

        {activeTab === 'backend' && (
          <EmiBackendConsole
            customers={customers}
            onRegisterCustomer={handleRegisterCustomer}
            onCheckStatus={handleCheckStatus}
            onToggleLock={handleToggleLock}
            onRecordPayment={handleRecordPayment}
            onDeleteCustomer={handleDeleteCustomer}
            simulatedDeviceImei="860293049182345"
            onSyncWithSimulator={() => setActiveTab('simulator')}
            onLogAction={addLog}
          />
        )}

        {activeTab === 'code' && (
          <CodeGenerator
            config={config}
            onLogAction={addLog}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetAuditConsole
            config={config}
            onLogAction={addLog}
          />
        )}

        {activeTab === 'apk' && (
          <div className="py-6 px-4 sm:px-6 lg:px-8">
            <ApkBuilderView
              config={config}
              onLogAction={addLog}
            />
          </div>
        )}
      </main>

      {/* Real-time DPM & Receiver Log Event Stream */}
      <AuditLogDrawer logs={logs} onClearLogs={clearLogs} />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-400 font-medium">Android Device Administration &amp; Policy Suite</span>
            <span aria-hidden="true">·</span>
            <span>AOSP &amp; Android Enterprise Compatible</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Policies: <code className="text-emerald-400 font-mono">&lt;limit-password&gt;</code>, <code className="text-amber-400 font-mono">&lt;force-lock&gt;</code>, <code className="text-rose-400 font-mono">&lt;wipe-data&gt;</code></span>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('code')}
              className="hover:text-white transition-colors"
            >
              API Reference
            </button>
          </div>
        </div>
      </footer>

      {/* Export Bundle Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        config={config}
        onLogAction={addLog}
      />
    </div>
  );
}
