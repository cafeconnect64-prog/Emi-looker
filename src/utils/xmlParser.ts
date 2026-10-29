import { PolicyConfig } from '../types/deviceAdmin';

export const INITIAL_USER_XML = `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
        <limit-password />
        <force-lock />
        <wipe-data />
    </uses-policies>
</device-admin>`;

export const DEFAULT_POLICY_CONFIG: PolicyConfig = {
  limitPassword: {
    enabled: true,
    minQuality: 'numeric_complex',
    minLength: 6,
    maxFailedAttempts: 5,
    expirationDays: 90,
    historyLength: 5,
    minLetters: 0,
    minNumeric: 4,
    minSymbols: 0,
  },
  forceLock: {
    enabled: true,
    maxTimeToLockSec: 120,
    customLockMessage: 'Property of Enterprise IT. If found, call +1 (800) 555-0199',
  },
  wipeData: {
    enabled: true,
    wipeExternalStorage: true,
    wipeResetProtection: false,
    wipeSilently: false,
  },
  resetPassword: {
    enabled: false,
    requireEntry: true,
  },
  watchLogin: {
    enabled: false,
    auditFailures: true,
  },
  disableCamera: {
    enabled: false,
  },
  encryptedStorage: {
    enabled: false,
    requireHardwareBacked: true,
  },
  disableKeyguardFeatures: {
    enabled: false,
    disableFingerprint: true,
    disableFace: true,
    disableNotifications: false,
    disableWidgets: true,
  },
  expirePassword: {
    enabled: false,
    daysToExpire: 90,
  },
};

export function generateXmlFromConfig(config: PolicyConfig): string {
  const policies: string[] = [];

  if (config.limitPassword.enabled) policies.push('        <limit-password />');
  if (config.forceLock.enabled) policies.push('        <force-lock />');
  if (config.wipeData.enabled) policies.push('        <wipe-data />');
  if (config.resetPassword.enabled) policies.push('        <reset-password />');
  if (config.watchLogin.enabled) policies.push('        <watch-login />');
  if (config.disableCamera.enabled) policies.push('        <disable-camera />');
  if (config.encryptedStorage.enabled) policies.push('        <encrypted-storage />');
  if (config.disableKeyguardFeatures.enabled) policies.push('        <disable-keyguard-features />');
  if (config.expirePassword.enabled) policies.push('        <expire-password />');

  return `<?xml version="1.0" encoding="utf-8"?>
<device-admin xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-policies>
${policies.length > 0 ? policies.join('\n') : '        <!-- No policies currently active -->'}
    </uses-policies>
</device-admin>`;
}

export function parseXmlToConfig(xml: string, currentConfig: PolicyConfig): { config: PolicyConfig; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    const parserError = doc.querySelector('parsererror');

    if (parserError) {
      return { config: currentConfig, error: parserError.textContent || 'XML syntax error' };
    }

    const usesPolicies = doc.querySelector('uses-policies');
    if (!usesPolicies) {
      return { config: currentConfig, error: 'Missing <uses-policies> element inside <device-admin>' };
    }

    const has = (tag: string) => usesPolicies.querySelector(tag) !== null;

    const updated: PolicyConfig = {
      ...currentConfig,
      limitPassword: { ...currentConfig.limitPassword, enabled: has('limit-password') },
      forceLock: { ...currentConfig.forceLock, enabled: has('force-lock') },
      wipeData: { ...currentConfig.wipeData, enabled: has('wipe-data') },
      resetPassword: { ...currentConfig.resetPassword, enabled: has('reset-password') },
      watchLogin: { ...currentConfig.watchLogin, enabled: has('watch-login') },
      disableCamera: { ...currentConfig.disableCamera, enabled: has('disable-camera') },
      encryptedStorage: { ...currentConfig.encryptedStorage, enabled: has('encrypted-storage') },
      disableKeyguardFeatures: { ...currentConfig.disableKeyguardFeatures, enabled: has('disable-keyguard-features') },
      expirePassword: { ...currentConfig.expirePassword, enabled: has('expire-password') },
    };

    return { config: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown parsing error';
    return { config: currentConfig, error: message };
  }
}

export function generateAndroidManifest(packageName = 'com.finance.emilocker', receiverClass = '.EMIAdminReceiver'): string {
  const normalizedClass = receiverClass.startsWith('.') ? receiverClass : `.${receiverClass}`;
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}">

    <!-- Network access to verify cloud EMI payment ledger -->
    <uses-permission android:name="android.permission.INTERNET" />
    <!-- Autostart lock enforcement service upon device reboot -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <application
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.EMILocker">

        <!-- Device Admin Receiver for EMI Handset Finance Protection -->
        <receiver
            android:name="${normalizedClass}"
            android:permission="android.permission.BIND_DEVICE_ADMIN"
            android:exported="true">
            <intent-filter>
                <action android:name="app.device.admin.ACTION_DEVICE_ADMIN_ENABLED" />
                <action android:name="android.app.action.DEVICE_ADMIN_ENABLED" />
                <action android:name="android.app.action.DEVICE_ADMIN_DISABLED" />
                <action android:name="android.intent.action.BOOT_COMPLETED" />
            </intent-filter>
            <meta-data
                android:name="android.app.device_admin"
                android:resource="@xml/device_admin" />
        </receiver>

    </application>
</manifest>`;
}

export function generateKotlinReceiver(
  packageName = 'com.finance.emilocker',
  receiverClass = 'EMIAdminReceiver',
  includePackageStatement = true
): string {
  const packageHeader = includePackageStatement ? `package ${packageName}\n\n` : '';
  return `${packageHeader}import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast

class ${receiverClass} : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "EMI Admin Activated", Toast.LENGTH_SHORT).show()
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(context, "EMI Admin Deactivated", Toast.LENGTH_SHORT).show()
    }
}`;
}

export function generateKotlinMainActivity(
  packageName = 'com.finance.emilocker',
  receiverClass = 'EMIAdminReceiver',
  explanation = 'Yeh app EMI financing security ke liye zaroori hai.'
): string {
  return `package ${packageName}

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var compName: ComponentName

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_MANAGER) as DevicePolicyManager
        compName = ComponentName(this, ${receiverClass}::class.java)

        // Admin permission ke liye user ko prompt dikhane ka code:
        if (!devicePolicyManager.isAdminActive(compName)) {
            val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN)
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, compName)
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "${explanation}")
            startActivity(intent)
        }
    }

    // Phone lock karne ka function (Jab EMI fail ho jaye)
    fun lockPhoneIfDue() {
        if (devicePolicyManager.isAdminActive(compName)) {
            devicePolicyManager.lockNow()
        }
    }
}`;
}

export function generateKotlinPolicyManager(packageName = 'com.finance.emilocker', config: PolicyConfig): string {
  const qualityMap = {
    unspecified: 'PASSWORD_QUALITY_UNSPECIFIED',
    something: 'PASSWORD_QUALITY_SOMETHING',
    numeric: 'PASSWORD_QUALITY_NUMERIC',
    numeric_complex: 'PASSWORD_QUALITY_NUMERIC_COMPLEX',
    alphabetic: 'PASSWORD_QUALITY_ALPHABETIC',
    alphanumeric: 'PASSWORD_QUALITY_ALPHANUMERIC',
    complex: 'PASSWORD_QUALITY_COMPLEX',
  };

  return `package ${packageName}

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log

/**
 * Helper class that interacts with DevicePolicyManager to apply
 * policies declared in res/xml/device_admin.xml for EMI finance security
 */
class PolicyEnforcementManager(private val context: Context) {

    private val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val adminComponent = ComponentName(context, EMIAdminReceiver::class.java)

    val isAdminActive: Boolean
        get() = dpm.isAdminActive(adminComponent)

    /**
     * Applies policies matching the active <uses-policies> declaration.
     */
    fun enforceActivePolicies() {
        if (!isAdminActive) {
            Log.e(TAG, "Cannot enforce policies: Device admin is not activated")
            return
        }

${config.limitPassword.enabled ? `        // 1. Enforce <limit-password /> constraints
        dpm.setPasswordQuality(adminComponent, DevicePolicyManager.${qualityMap[config.limitPassword.minQuality]})
        dpm.setPasswordMinimumLength(adminComponent, ${config.limitPassword.minLength})
        dpm.setMaximumFailedPasswordsForWipe(adminComponent, ${config.limitPassword.maxFailedAttempts})
        dpm.setPasswordExpirationTimeout(adminComponent, ${config.limitPassword.expirationDays}L * 24 * 60 * 60 * 1000)
        dpm.setPasswordHistoryLength(adminComponent, ${config.limitPassword.historyLength})
` : ''}${config.forceLock.enabled ? `        // 2. Enforce <force-lock /> constraints
        dpm.setMaximumTimeToLock(adminComponent, ${config.forceLock.maxTimeToLockSec}L * 1000)
        // Lockscreen custom administrative message (requires Device Owner or Profile Owner)
        try {
            dpm.setDeviceOwnerLockScreenInfo(adminComponent, "${config.forceLock.customLockMessage}")
        } catch (e: SecurityException) {
            Log.w(TAG, "Requires device owner for lockscreen info: \${e.message}")
        }
` : ''}${config.disableCamera.enabled ? `        // 3. Enforce <disable-camera /> constraint
        dpm.setCameraDisabled(adminComponent, true)
` : ''}${config.encryptedStorage.enabled ? `        // 4. Enforce <encrypted-storage /> constraint
        dpm.setStorageEncryption(adminComponent, true)
` : ''}        Log.i(TAG, "All configured policies synchronized successfully.")
    }

    /**
     * Executes immediate lock screen action (<force-lock />)
     */
    fun lockDeviceNow() {
        if (isAdminActive) {
            dpm.lockNow()
        }
    }

    /**
     * Executes remote wipe action (<wipe-data />)
     * @param wipeSdCard If true, wipes removable flash/SD storage
     */
    fun wipeDeviceData(wipeSdCard: Boolean = ${config.wipeData.wipeExternalStorage}) {
        if (isAdminActive) {
            var flags = 0
            if (wipeSdCard) {
                flags = flags or DevicePolicyManager.WIPE_EXTERNAL_STORAGE
            }
            ${config.wipeData.wipeResetProtection ? 'flags = flags or DevicePolicyManager.WIPE_RESET_PROTECTION_DATA\n            ' : ''}dpm.wipeData(flags)
        }
    }

    companion object {
        private const val TAG = "PolicyEnforcement"
    }
}`;
}

export function generateAdbCommands(packageName = 'com.finance.emilocker', receiverClass = 'EMIAdminReceiver'): string {
  return `# ==============================================================================
# Android Device Admin & DPC ADB Shell Testing Commands
# Target Receiver: .${receiverClass} (${packageName})
# ==============================================================================

# 1. Install your APK to connected emulator or physical device
adb install -r -t app-debug.apk

# 2. Check currently registered Device Admin Receivers
adb shell dumpsys device_policy

# 3. Launch System Device Admin Activation Dialog via Intent
adb shell am start -a android.app.action.ADD_DEVICE_ADMIN \\
  --es android.app.extra.DEVICE_ADMIN "${packageName}/.${receiverClass}" \\
  --es android.app.extra.ADD_EXPLANATION "Yeh app EMI financing security ke liye zaroori hai."

# 4. Trigger Boot Completed Broadcast (Simulate device reboot for RECEIVE_BOOT_COMPLETED)
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED -p ${packageName}

# 5. Broadcast Custom Admin Enabled Intent declared in Manifest
adb shell am broadcast -a app.device.admin.ACTION_DEVICE_ADMIN_ENABLED -p ${packageName}

# 6. Set as Device Owner (requires clean device or unprovisioned state)
adb shell dpm set-device-owner ${packageName}/.${receiverClass}

# 7. Test immediate lock screen trigger
adb shell input keyevent 26

# 8. View live policy enforcement logcat stream
adb logcat -s ${receiverClass}:V PolicyEnforcement:V DevicePolicyManager:V`;
}

/**
 * Generates the complete Node.js / Express backend server code
 * for customer EMI registration, 24-hour status verification, and admin manual lock control.
 */
export function generateExpressEmiServer(): string {
  return `const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.use(express.json());

// Connect to MongoDB (Replace with your MongoDB Atlas URI for cloud or local URI for testing)
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/emi_locking_db';

mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => console.error('MongoDB connection error:', err.message));

// Define Customer Schema & Model
const customerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    imei: { type: String, required: true, unique: true },
    dueDate: { type: Date, required: true },
    emiAmount: { type: Number, required: true },
    isLocked: { type: Boolean, default: false }
}, { timestamps: true });

const Customer = mongoose.model('Customer', customerSchema);

/**
 * 1. REGISTER / UPDATE CUSTOMER EMI
 */
app.post('/api/customer', async (req, res) => {
    try {
        const { name, imei, dueDate, emiAmount } = req.body;
        
        if (!imei || !dueDate) {
            return res.status(400).json({ error: "IMEI and Due Date are required fields." });
        }

        const today = new Date();
        const due = new Date(dueDate);
        const isOverdue = today > due;

        let customer = await Customer.findOne({ imei });

        if (customer) {
            customer.name = name || customer.name;
            customer.dueDate = due;
            customer.emiAmount = emiAmount !== undefined ? emiAmount : customer.emiAmount;
            customer.isLocked = isOverdue;
            await customer.save();
            return res.json({ success: true, message: "Customer details updated successfully.", customer });
        } else {
            customer = new Customer({
                name: name || "Unknown",
                imei,
                dueDate: due,
                emiAmount: emiAmount || 0,
                isLocked: isOverdue
            });
            await customer.save();
            return res.status(201).json({ success: true, message: "Customer registered successfully.", customer });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 2. APP STATUS CHECK API (Called by Android App / WorkManager)
 */
app.get('/api/check-status/:imei', async (req, res) => {
    try {
        const { imei } = req.params;
        const customer = await Customer.findOne({ imei });

        if (!customer) {
            return res.status(404).json({ error: "Device not found in financing database." });
        }

        const today = new Date();
        const dueDate = new Date(customer.dueDate);
        
        if (today > dueDate && !customer.isLocked) {
            customer.isLocked = true;
            await customer.save();
        }

        res.json({
            imei: customer.imei,
            isLocked: customer.isLocked,
            dueDate: customer.dueDate,
            message: customer.isLocked ? "EMI overdue. Please lock device." : "Payment up to date. Device normal."
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 3. ADMIN MANUAL LOCK / UNLOCK API
 */
app.post('/api/admin/toggle-lock', async (req, res) => {
    try {
        const { imei, isLocked } = req.body;
        const customer = await Customer.findOne({ imei });

        if (!customer) {
            return res.status(404).json({ error: "Customer not found." });
        }

        customer.isLocked = isLocked;
        await customer.save();

        res.json({ 
            success: true, 
            message: \`Device lock status changed to: \${isLocked ? "LOCKED" : "UNLOCKED"}\`,
            customer 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 4. RECORD PAYMENT & AUTO-UNLOCK
 */
app.post('/api/admin/payment', async (req, res) => {
    try {
        const { imei, amountPaid } = req.body;
        const customer = await Customer.findOne({ imei });
        if (!customer) return res.status(404).json({ error: "Customer not found." });

        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        customer.dueDate = nextDue;
        customer.isLocked = false;
        await customer.save();

        res.json({ 
            success: true, 
            message: \`Payment of ₹\${amountPaid || customer.emiAmount} accepted. Device unlocked!\`,
            customer 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(\`EMI Server with MongoDB is running on port \${PORT}\`);
});
`;
}

/**
 * Generates Android Kotlin BootReceiver for android.intent.action.BOOT_COMPLETED
 */
export function generateKotlinBootReceiver(packageName = 'com.finance.emilocker'): string {
  return `package ${packageName}

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Handles RECEIVE_BOOT_COMPLETED permission
 * Re-initiates background polling and enforces lockscreen if overdue
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i(TAG, "Device rebooted. Verifying EMI installment status immediately...")
            // Enqueue WorkManager sync job
            EmiStatusSyncWorker.enqueue24HourSync(context, "860293049182345")
        }
    }

    companion object {
        private const val TAG = "BootReceiver"
    }
}`;
}

/**
 * Generates Android Kotlin Non-dismissible Lockscreen Overlay Activity
 */
export function generateKotlinLockActivity(packageName = 'com.finance.emilocker'): string {
  return `package ${packageName}

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Fullscreen non-dismissible EMI Lock Overlay
 * Displayed when devicePolicyManager.lockNow() is triggered and device is overdue.
 */
class EMILockActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Show over keyguard / lockscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }

        setContentView(R.layout.activity_emi_lock)

        // Emergency Call button (112 must always remain accessible)
        findViewById<Button>(R.id.btnEmergencyCall).setOnClickListener {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:112"))
            startActivity(intent)
        }

        // Support call to shopkeeper/financier
        findViewById<Button>(R.id.btnCallFinancier).setOnClickListener {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:18001233355"))
            startActivity(intent)
        }
    }

    // Prevent user from pressing Back button to bypass lock screen
    override fun onBackPressed() {
        // Do nothing - lockout is enforced until payment verification
    }
}`;
}

/**
 * Generates the Android Kotlin background worker snippet that polls
 * GET /api/check-status/{imei} every 24 hours via WorkManager and triggers lockPhoneIfDue().
 */
export function generateKotlinStatusWorker(
  packageName = 'com.finance.emilocker',
  receiverClass = 'EMIAdminReceiver'
): string {
  return `package ${packageName}

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/**
 * 24-Ghante ka Periodic Background Worker (WorkManager)
 * Android app har 24 ghante mein ya internet reconnect hone par
 * server ke GET /api/check-status/:imei endpoint ko call karega.
 * Agar isLocked == true milta hai, toh DevicePolicyManager.lockNow() execute karega.
 */
class EmiStatusSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val imei = inputData.getString(KEY_DEVICE_IMEI) ?: "860293049182345"
        val serverBaseUrl = "https://your-emi-server.example.com"
        val checkEndpoint = "$serverBaseUrl/api/check-status/$imei"

        try {
            Log.d(TAG, "Querying financing cloud ledger for IMEI: $imei")
            val url = URL(checkEndpoint)
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val responseJsonStr = reader.readText()
                reader.close()

                val json = JSONObject(responseJsonStr)
                val isLocked = json.optBoolean("isLocked", false)
                val message = json.optString("message", "")

                Log.i(TAG, "EMI status sync complete: isLocked=$isLocked, msg=$message")

                if (isLocked) {
                    lockPhoneDueToOverdueEmi()
                }

                Result.success()
            } else {
                Log.w(TAG, "Server responded with HTTP \${connection.responseCode}")
                Result.retry()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Network failure checking EMI status: \${e.message}", e)
            Result.retry()
        }
    }

    private fun lockPhoneDueToOverdueEmi() {
        val dpm = applicationContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val compName = ComponentName(applicationContext, ${receiverClass}::class.java)

        if (dpm.isAdminActive(compName)) {
            Log.w(TAG, "Enforcing EMI lock: calling dpm.lockNow()")
            dpm.lockNow()
        } else {
            Log.e(TAG, "Device Admin permission is inactive. Cannot enforce lockNow().")
        }
    }

    companion object {
        const val KEY_DEVICE_IMEI = "device_imei"
        private const val TAG = "EmiStatusWorker"

        /**
         * Enqueues 24-hour periodic WorkManager sync
         */
        fun enqueue24HourSync(context: Context, imei: String) {
            val inputData = workDataOf(KEY_DEVICE_IMEI to imei)
            val syncRequest = PeriodicWorkRequestBuilder<EmiStatusSyncWorker>(24, TimeUnit.HOURS)
                .setInputData(inputData)
                .build()

            WorkManager.getInstance(context).enqueue(syncRequest)
            Log.i(TAG, "Scheduled 24-hour periodic EMI check for IMEI: $imei")
        }
    }
}`;
}

export const generateBuildGradleKts = (packageName: string = 'com.finance.emilocker'): string => {
  return `// app/build.gradle.kts - Ready for Android Studio 2024+
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 35

    defaultConfig {
        applicationId = "${packageName}"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")

    // WorkManager for 24-hour periodic EMI cloud status sync
    implementation("androidx.work:work-runtime-ktx:2.10.0")

    // Coroutines & Lifecycle
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
}`;
};

export const generateApkBuildInstructions = (packageName: string = 'com.finance.emilocker', receiverClass: string = 'EMIAdminReceiver'): string => {
  return `# ==============================================================================
# 📱 How to Build the APK in 2 Minutes (Step-by-Step)
# ==============================================================================
#
# Follow these simple steps in Android Studio:
#
# STEP 1: CREATE PROJECT IN ANDROID STUDIO
# ------------------------------------------------------------------------------
# 1. Open Android Studio on your PC / Mac.
# 2. Click "New Project" -> Select "Empty Views Activity" -> Click Next.
# 3. Enter project details:
#    - Name: EMI Locker Admin
#    - Package name: ${packageName}
#    - Language: Kotlin
#    - Minimum SDK: API 26 (Android 8.0 Oreo)
# 4. Click Finish and let Gradle sync.
#
# STEP 2: PASTE CODE FILES
# ------------------------------------------------------------------------------
# In the left project tree, place the files from this console:
#
# 1. AndroidManifest.xml   -> app/src/main/AndroidManifest.xml
# 2. device_admin.xml       -> app/src/main/res/xml/device_admin.xml
#    (Right-click 'res' folder -> New -> Android Resource Directory -> select Resource type: 'xml')
# 3. MainActivity.kt        -> app/src/main/java/${packageName.replace(/\./g, '/')}/MainActivity.kt
# 4. ${receiverClass}.kt   -> app/src/main/java/${packageName.replace(/\./g, '/')}/${receiverClass}.kt
# 5. BootReceiver.kt        -> app/src/main/java/${packageName.replace(/\./g, '/')}/BootReceiver.kt
# 6. EMILockActivity.kt     -> app/src/main/java/${packageName.replace(/\./g, '/')}/EMILockActivity.kt
# 7. EmiStatusSyncWorker.kt -> app/src/main/java/${packageName.replace(/\./g, '/')}/EmiStatusSyncWorker.kt
# 8. build.gradle.kts       -> app/build.gradle.kts
#
# STEP 3: BUILD THE APK
# ------------------------------------------------------------------------------
# In Android Studio top menu bar:
# 👉 Click: Build  -->  Build Bundle(s) / APK(s)  -->  Build APK(s)
#
# Or run terminal command inside the Android project root:
# $ ./gradlew assembleDebug
#
# In ~30 seconds, Android Studio will pop up a notification:
# "APK(s) generated successfully for 1 module: 'app'"
# Click "locate" link to open the folder:
# 📁 Path: app/build/outputs/apk/debug/app-debug.apk
#
# STEP 4: INSTALL & ACTIVATE ON REAL ANDROID PHONE
# ------------------------------------------------------------------------------
# Connect phone via USB with "USB Debugging" turned ON:
#
# 1. Install APK on phone:
#    $ adb install app-debug.apk
#
# 2. Set as Device Owner (Permanent Kiosk / Admin):
#    $ adb shell dpm set-device-owner ${packageName}/.${receiverClass}
#
# 3. Done! The app is now fully protected and will lock when EMI payment is due.
`;
};

