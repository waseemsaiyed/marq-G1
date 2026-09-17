import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');

if (!fs.existsSync(manifestPath)) {
  console.log('[Manifest Script] android/app/src/main/AndroidManifest.xml not found, skipping.');
  process.exit(0);
}

try {
  let content = fs.readFileSync(manifestPath, 'utf8');

  // 1. Enable cleartext traffic for local ESP32 (192.168.4.1 / local Wi-Fi IP)
  if (!content.includes('android:usesCleartextTraffic')) {
    content = content.replace('<application', '<application android:usesCleartextTraffic="true"');
    console.log('✅ Added android:usesCleartextTraffic="true"');
  }

  // 2. Permissions required for Bluetooth LE and Network Discovery
  const permissions = [
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
    '<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />',
    '<uses-permission android:name="android.permission.CHANGE_WIFI_MULTICAST_STATE" />',
    '<uses-permission android:name="android.permission.BLUETOOTH" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />',
    '<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />',
    '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
    '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  ];

  // Filter only permissions not yet present
  const missingPermissions = permissions.filter((p) => {
    const permName = p.match(/android:name="([^"]+)"/)?.[1];
    return permName ? !content.includes(permName) : false;
  });

  if (missingPermissions.length > 0) {
    const permissionsBlock = '\n    ' + missingPermissions.join('\n    ');
    content = content.replace('<application', permissionsBlock + '\n\n    <application');
    console.log(`✅ Injected ${missingPermissions.length} missing Android permissions.`);
  } else {
    console.log('ℹ️ All required permissions already present.');
  }

  fs.writeFileSync(manifestPath, content, 'utf8');
  console.log('🎉 AndroidManifest.xml successfully configured for ESP32 and BLE!');
} catch (err) {
  console.error('Error updating AndroidManifest.xml:', err);
  process.exit(1);
}
