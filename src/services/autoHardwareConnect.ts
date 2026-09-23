/**
 * Unified Hardware Auto-Connect Service
 *
 * Coordinates concurrent auto-discovery and zero-touch adoption for:
 * 1. Mobile Phone Bluetooth (OS-bonded devices & authorized Web BLE)
 * 2. Local Wi-Fi Network & ESP32 SoftAP (192.168.4.1 / 192.168.4.2 / LAN)
 *
 * If either or both are detected, the app automatically adopts the controller
 * as the default active connection without requiring manual pairing inside the app.
 */

import {
  autoDetectAndAdoptPairedBluetooth,
  AutoAdoptResult,
  isAutoBluetoothEnabled,
  setAutoBluetoothEnabled,
} from './autoBluetoothConnect';
import {
  autoDetectAndAdoptWifiController,
  AutoAdoptWifiResult,
  isAutoWifiEnabled,
  setAutoWifiEnabled,
  getCandidateWifiIps,
} from './autoWifiConnect';

export interface UnifiedAutoAdoptResult {
  adopted: boolean;
  bluetooth?: AutoAdoptResult | null;
  wifi?: AutoAdoptWifiResult | null;
  mode: 'dual' | 'ble' | 'wifi' | 'none';
  primaryDeviceName: string;
  message: string;
}

export {
  isAutoBluetoothEnabled,
  setAutoBluetoothEnabled,
  isAutoWifiEnabled,
  setAutoWifiEnabled,
  getCandidateWifiIps,
  autoDetectAndAdoptPairedBluetooth,
  autoDetectAndAdoptWifiController,
};

export type { AutoAdoptResult, AutoAdoptWifiResult };

/**
 * Concurrently scans and adopts any already-connected or paired controller
 * over Bluetooth and Wi-Fi.
 */
export async function autoDetectAndAdoptAllHardware(): Promise<UnifiedAutoAdoptResult> {
  console.log('[Auto-Hardware] Running unified auto-adoption check for Wi-Fi & Bluetooth...');

  const [btSettled, wifiSettled] = await Promise.allSettled([
    autoDetectAndAdoptPairedBluetooth(),
    autoDetectAndAdoptWifiController(),
  ]);

  const btResult = btSettled.status === 'fulfilled' ? btSettled.value : null;
  const wifiResult = wifiSettled.status === 'fulfilled' ? wifiSettled.value : null;

  const hasBt = Boolean(btResult && btResult.adopted);
  const hasWifi = Boolean(wifiResult && wifiResult.adopted);

  if (hasBt && hasWifi) {
    return {
      adopted: true,
      bluetooth: btResult,
      wifi: wifiResult,
      mode: 'dual',
      primaryDeviceName: wifiResult!.deviceName || btResult!.deviceName,
      message: `Dual-Link Active: Controller auto-paired over Wi-Fi (${wifiResult!.ip}) and Phone Bluetooth (${btResult!.deviceName})!`,
    };
  }

  if (hasWifi) {
    return {
      adopted: true,
      wifi: wifiResult,
      mode: 'wifi',
      primaryDeviceName: wifiResult!.deviceName,
      message: `Wi-Fi Controller Detected: Auto-paired at ${wifiResult!.ip} as default connection!`,
    };
  }

  if (hasBt) {
    return {
      adopted: true,
      bluetooth: btResult,
      mode: 'ble',
      primaryDeviceName: btResult!.deviceName,
      message: `Phone Bluetooth Auto-Linked: "${btResult!.deviceName}" adopted as default connection!`,
    };
  }

  return {
    adopted: false,
    mode: 'none',
    primaryDeviceName: '',
    message: 'No paired Bluetooth or active Wi-Fi controller detected.',
  };
}
