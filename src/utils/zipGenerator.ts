import JSZip from 'jszip';
import { PolicyConfig } from '../types/deviceAdmin';
import {
  generateXmlFromConfig,
  generateAndroidManifest,
  generateKotlinReceiver,
  generateKotlinMainActivity,
  generateKotlinBootReceiver,
  generateKotlinLockActivity,
  generateKotlinStatusWorker,
  generateKotlinPolicyManager,
  generateBuildGradleKts,
  generateExpressEmiServer,
  generateApkBuildInstructions,
} from './xmlParser';

export async function createAndroidProjectZip(
  config: PolicyConfig,
  packageName: string = 'com.finance.emilocker',
  receiverClass: string = 'EMIAdminReceiver'
): Promise<Blob> {
  const zip = new JSZip();
  const packagePath = packageName.replace(/\./g, '/');

  // 1. Root settings and gradle
  zip.file(
    'settings.gradle.kts',
    `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "EMILockerAdmin"
include(":app")
`
  );

  zip.file(
    'build.gradle.kts',
    `plugins {
    id("com.android.application") version "8.7.2" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
}
`
  );

  zip.file(
    'gradle.properties',
    `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
kotlin.code.style=official
`
  );

  // Gradle wrapper
  zip.file(
    'gradle/wrapper/gradle-wrapper.properties',
    `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.9-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`
  );

  // Gradlew bash script
  zip.file(
    'gradlew',
    `#!/bin/sh
APP_BASE_NAME=\`basename "$0"\`
DIRNAME=\`dirname "$0"\`
[ -z "$DIRNAME" ] && DIRNAME=.
APP_HOME=\`cd "$DIRNAME" && pwd\`
exec "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" "$@"
`
  );

  // 2. GitHub Actions Automated Cloud APK Builder Workflow
  zip.file(
    '.github/workflows/build-apk.yml',
    `name: Build Android APK Automatically

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    name: Build Debug APK
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Java JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Gradle
        uses: gradle/actions/setup-gradle@v3

      - name: Build Debug APK with Gradle
        run: |
          chmod +x gradlew || true
          gradle assembleDebug --stacktrace || ./gradlew assembleDebug

      - name: Upload APK Binary (Download Link)
        uses: actions/upload-artifact@v4
        with:
          name: EMI-Locker-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk
`
  );

  // 3. App module configuration
  zip.file('app/build.gradle.kts', generateBuildGradleKts(packageName));
  zip.file('app/src/main/AndroidManifest.xml', generateAndroidManifest(packageName, `.${receiverClass}`));

  // Resources
  zip.file('app/src/main/res/xml/device_admin.xml', generateXmlFromConfig(config));
  zip.file(
    'app/src/main/res/values/strings.xml',
    `<resources>
    <string name="app_name">EMI Locker Admin</string>
    <string name="device_admin_description">Enterprise EMI Device Policy Manager for Device Security and Payment Enforcement</string>
</resources>`
  );
  zip.file(
    'app/src/main/res/values/colors.xml',
    `<resources>
    <color name="black">#FF000000</color>
    <color name="white">#FFFFFFFF</color>
    <color name="primary_dark">#FF0F172A</color>
    <color name="emerald">#FF10B981</color>
    <color name="rose">#FFF43F5E</color>
</resources>`
  );

  // 4. Kotlin Source code
  zip.file(`app/src/main/java/${packagePath}/MainActivity.kt`, generateKotlinMainActivity(packageName, receiverClass));
  zip.file(`app/src/main/java/${packagePath}/${receiverClass}.kt`, generateKotlinReceiver(packageName, receiverClass));
  zip.file(`app/src/main/java/${packagePath}/BootReceiver.kt`, generateKotlinBootReceiver(packageName));
  zip.file(`app/src/main/java/${packagePath}/EMILockActivity.kt`, generateKotlinLockActivity(packageName));
  zip.file(`app/src/main/java/${packagePath}/EmiStatusSyncWorker.kt`, generateKotlinStatusWorker(packageName, receiverClass));
  zip.file(`app/src/main/java/${packagePath}/PolicyEnforcementManager.kt`, generateKotlinPolicyManager(packageName, config));

  // 5. Documentation & backend server
  zip.file('server.js', generateExpressEmiServer());
  zip.file('APK_BUILD_INSTRUCTIONS.md', generateApkBuildInstructions(packageName, receiverClass));
  zip.file(
    'README.md',
    `# 📱 EMI Device Admin & Locker Android Project

This is a complete, ready-to-compile Android Studio project configured for **${packageName}**.

## 🚀 2-Minute APK Compilation

### Option A: In Android Studio (Local PC/Mac)
1. Open **Android Studio**.
2. Click **Open** and select this unzipped project folder.
3. Wait for Gradle sync to complete.
4. Click **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** in the top menu.
5. Your output APK will be generated at:
   \`app/build/outputs/apk/debug/app-debug.apk\`

### Option B: Automatic Free Cloud Build (GitHub Actions)
1. Push this folder to a GitHub repository.
2. Go to **Actions** tab in GitHub -> Run **Build Android APK Automatically**.
3. Download the compiled \`app-debug.apk\` artifact immediately!

## 📲 Install & Set Device Owner
\`\`\`bash
# 1. Install debug APK
adb install app/build/outputs/apk/debug/app-debug.apk

# 2. Activate Device Owner
adb shell dpm set-device-owner ${packageName}/.${receiverClass}
\`\`\`
`
  );

  return await zip.generateAsync({ type: 'blob' });
}
