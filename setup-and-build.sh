#!/usr/bin/env bash
set -e

echo "=== 1. Setting up Java environment ==="
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH
echo "Java version: $(java -version 2>&1)"

echo "=== 2. Accepting licenses and installing platform components ==="
yes | /opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/opt/android-sdk --licenses
/opt/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/opt/android-sdk "platforms;android-34" "build-tools;34.0.0" "platform-tools"

echo "=== 3. Writing local.properties ==="
echo "sdk.dir=/opt/android-sdk" > android/local.properties

echo "=== 4. Running gradle build ==="
export ANDROID_HOME=/opt/android-sdk
cd android
chmod +x gradlew
./gradlew assembleDebug --no-daemon

echo "=== 5. Verifying build output ==="
if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
  echo "✅ APK generated successfully!"
  ls -la app/build/outputs/apk/debug/app-debug.apk
else
  echo "❌ Error: APK not found at expected location!"
  exit 1
fi
