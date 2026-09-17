#!/usr/bin/env bash
set -e

echo "=== MarQ Clinical Remote: Android APK Generator ==="
echo "1. Installing Capacitor core, Android platform & Native Bluetooth LE..."
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor-community/bluetooth-le

echo "2. Building Vite production distribution..."
npm run build

echo "3. Initializing Android project..."
if [ ! -d "android" ]; then
  npx cap add android
fi

echo "4. Injecting Bluetooth & Wi-Fi permissions into AndroidManifest.xml..."
node scripts/update-manifest.js

echo "5. Syncing web assets and native plugins..."
npx cap sync android

echo "6. Building Android APK via Gradle..."
cd android
if [ -f "./gradlew" ]; then
  ./gradlew assembleDebug
  echo ""
  echo "✅ SUCCESS! Debug APK generated at:"
  echo "👉 $(pwd)/app/build/outputs/apk/debug/app-debug.apk"
else
  echo "Open in Android Studio via: npx cap open android"
fi
