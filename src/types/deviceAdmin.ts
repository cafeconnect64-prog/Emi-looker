export interface PolicyConfig {
  limitPassword: {
    enabled: boolean;
    minQuality: 'unspecified' | 'something' | 'numeric' | 'numeric_complex' | 'alphabetic' | 'alphanumeric' | 'complex';
    minLength: number;
    maxFailedAttempts: number;
    expirationDays: number;
    historyLength: number;
    minLetters: number;
    minNumeric: number;
    minSymbols: number;
  };
  forceLock: {
    enabled: boolean;
    maxTimeToLockSec: number;
    customLockMessage: string;
  };
  wipeData: {
    enabled: boolean;
    wipeExternalStorage: boolean;
    wipeResetProtection: boolean;
    wipeSilently: boolean;
  };
  resetPassword: {
    enabled: boolean;
    requireEntry: boolean;
  };
  watchLogin: {
    enabled: boolean;
    auditFailures: boolean;
  };
  disableCamera: {
    enabled: boolean;
  };
  encryptedStorage: {
    enabled: boolean;
    requireHardwareBacked: boolean;
  };
  disableKeyguardFeatures: {
    enabled: boolean;
    disableFingerprint: boolean;
    disableFace: boolean;
    disableNotifications: boolean;
    disableWidgets: boolean;
  };
  expirePassword: {
    enabled: boolean;
    daysToExpire: number;
  };
}

export interface EmiFinanceConfig {
  loanId: string;
  customerName: string;
  emiAmount: number;
  currency: string;
  dueDate: string;
  isOverdue: boolean;
  isEmiLocked: boolean;
  lenderName: string;
  supportPhone: string;
  allowEmergencyCalls: boolean;
  blockUsbDebugging: boolean;
  customReminderMessage: string;
}

export interface PaymentRecord {
  id?: string;
  amount: number;
  date: string;
  method: 'UPI' | 'Cash' | 'Debit Card' | 'Credit Card' | 'Bank Transfer' | string;
  receiptId?: string;
  notes?: string;
}

export interface EmiCustomerRecord {
  name: string;
  imei: string;
  dueDate: string;
  emiAmount: number;
  isLocked: boolean;
  lastChecked?: string;
  paymentHistory?: PaymentRecord[];
}

export type SimulatedScreen = 
  | 'lock' 
  | 'home' 
  | 'activation' 
  | 'camera' 
  | 'security_app' 
  | 'settings_pin' 
  | 'wiping' 
  | 'out_of_box'
  | 'emi_lock'
  | 'emi_payment_success';

export interface DeviceState {
  isEnrolled: boolean;
  screen: SimulatedScreen;
  isLocked: boolean;
  lockReason: string | null;
  currentPin: string;
  failedPinAttempts: number;
  isWiped: boolean;
  isCameraDisabled: boolean;
  isStorageEncrypted: boolean;
  isWorkProfileActive: boolean;
  batteryLevel: number;
  wifiConnected: boolean;
  isBooting: boolean;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'security' | 'danger';
  source: string;
  message: string;
  policyTag?: string;
}

export interface FleetDevice {
  id: string;
  name: string;
  model: string;
  osVersion: string;
  serialNumber: string;
  status: 'compliant' | 'non_compliant' | 'locked' | 'wiped';
  lastPolicySync: string;
  battery: number;
  passcodeQuality: string;
  encryptionActive: boolean;
}
