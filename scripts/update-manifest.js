import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');

if (fs.existsSync(manifestPath)) {
  try {
    let content = fs.readFileSync(manifestPath, 'utf8');

    // 1. Enable cleartext traffic for local ESP32 (192.168.4.1 / local Wi-Fi IP)
    if (!content.includes('android:usesCleartextTraffic')) {
      content = content.replace('<application', '<application android:usesCleartextTraffic="true"');
      console.log('✅ Added android:usesCleartextTraffic="true"');
    }

    // 2. Permissions required for Bluetooth Classic SPP, Bluetooth LE, and Network Discovery
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
    console.log('🎉 AndroidManifest.xml successfully configured for ESP32 Wi-Fi & Bluetooth Classic SPP!');
  } catch (err) {
    console.error('Error updating AndroidManifest.xml:', err);
  }
} else {
  console.log('[Manifest Script] android/app/src/main/AndroidManifest.xml not found yet, will be configured during cap add android.');
}

// 3. Ensure MainActivity registers BluetoothClassicSerialPlugin
const mainActivityPath = path.resolve(
  process.cwd(),
  'android/app/src/main/java/com/marq/clinical/remote/MainActivity.java'
);

if (fs.existsSync(mainActivityPath)) {
  try {
    let mainCode = fs.readFileSync(mainActivityPath, 'utf8');
    if (!mainCode.includes('BluetoothClassicSerialPlugin')) {
      mainCode = `package com.marq.clinical.remote;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.marq.clinical.remote.plugins.BluetoothClassicSerialPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothClassicSerialPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
      fs.writeFileSync(mainActivityPath, mainCode, 'utf8');
      console.log('✅ Registered BluetoothClassicSerialPlugin in MainActivity.java');
    }
  } catch (err) {
    console.warn('Notice updating MainActivity.java:', err);
  }
}
