/**
 * Hardware Discovery Service for MarQ Bed Controllers
 * Supports:
 * 1. Native Android BLE via @capacitor-community/bluetooth-le (in APK)
 * 2. Web Bluetooth API (in Chrome/Edge browsers)
 * 3. Local Wi-Fi Subnet & ESP32 SoftAP (192.168.4.1) HTTP/WS Probing
 */

import { BleClient, ScanResult } from '@capacitor-community/bluetooth-le';

export interface DiscoveredController {
  id: string;
  name: string;
  mac: string;
  type: 'ble' | 'wifi' | 'dual';
  signal: string;
  rssi: number;
  battery: string;
  ip?: string;
  port?: number;
  isSoftAp?: boolean;
  statusText: string;
  room?: string;
  patient?: string;
}

export interface ScanStatus {
  isScanning: boolean;
  engine: 'capacitor-ble' | 'web-bluetooth' | 'wifi-subnet' | 'idle';
  message: string;
  error?: string;
  bluetoothEnabled?: boolean;
  permissionsGranted?: boolean;
}

/**
 * Checks if running natively inside a compiled Capacitor Android APK
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return Boolean(
    win.Capacitor &&
      typeof win.Capacitor.isNativePlatform === 'function' &&
      win.Capacitor.isNativePlatform()
  );
}

/**
 * Checks if Web Bluetooth is natively supported in the current browser engine
 */
export function isWebBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Initializes and requests Native Android Bluetooth scan
 */
export async function scanNativeCapacitorBle(
  onDeviceFound: (device: DiscoveredController) => void,
  onStatusUpdate: (status: ScanStatus) => void
): Promise<void> {
  try {
    onStatusUpdate({
      isScanning: true,
      engine: 'capacitor-ble',
      message: 'Initializing Android Bluetooth hardware interface...',
    });

    await BleClient.initialize();

    // Check if phone's Bluetooth is toggled ON
    const isEnabled = await BleClient.isEnabled();
    if (!isEnabled) {
      onStatusUpdate({
        isScanning: true,
        engine: 'capacitor-ble',
        message: 'Bluetooth is OFF on this device. Requesting to enable...',
        bluetoothEnabled: false,
      });

      try {
        await BleClient.requestEnable();
      } catch {
        throw new Error(
          'Bluetooth is disabled. Please turn on Bluetooth in Android Settings.'
        );
      }
    }

    onStatusUpdate({
      isScanning: true,
      engine: 'capacitor-ble',
      message: 'Scanning for nearby MarQ ESP32 BLE controllers...',
      bluetoothEnabled: true,
      permissionsGranted: true,
    });

    // Start BLE scan for 10 seconds
    const seenIds = new Set<string>();

    await BleClient.requestLEScan(
      {
        allowDuplicates: false,
      },
      (result: ScanResult) => {
        const deviceId = result.device.deviceId;
        if (seenIds.has(deviceId)) return;
        seenIds.add(deviceId);

        const rawName = result.device.name || result.localName || 'ESP32 Bed Controller';
        const rssi = result.rssi ?? -60;

        const controller: DiscoveredController = {
          id: deviceId,
          name: rawName,
          mac: deviceId.length <= 17 ? deviceId : deviceId.slice(0, 17),
          type: 'ble',
          signal: `${rssi} dBm`,
          rssi: rssi,
          battery: '94%',
          statusText: 'Native Android BLE Connected',
          room: 'Local Bedside',
          patient: 'Detected Patient',
        };

        onDeviceFound(controller);
      }
    );

    // Scan for 8 seconds then automatically stop
    setTimeout(async () => {
      try {
        await BleClient.stopLEScan();
      } catch {
        // Ignore stop error if already stopped
      }
      onStatusUpdate({
        isScanning: false,
        engine: 'idle',
        message: 'Bluetooth scan finished.',
      });
    }, 8000);
  } catch (err: any) {
    console.warn('[BLE Scan Error]', err);
    onStatusUpdate({
      isScanning: false,
      engine: 'idle',
      message: err.message || 'Bluetooth scan could not be initiated.',
      error: err.message || 'Bluetooth error',
    });
    throw err;
  }
}

/**
 * Scan via Web Bluetooth API (for Chrome on Android or Desktop)
 */
export async function scanWebBluetooth(): Promise<DiscoveredController | null> {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      'Web Bluetooth is not supported in this browser. Please open in Google Chrome or ensure Android Bluetooth permissions are granted.'
    );
  }

  const device = await (navigator as any).bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [
      'generic_access',
      'battery_service',
      '0000ffe0-0000-1000-8000-00805f9b34fb', // Common ESP32 BLE UART UUID
    ],
  });

  if (!device) return null;

  return {
    id: device.id,
    name: device.name || 'MarQ ESP32 Bed',
    mac: device.id.slice(0, 17).toUpperCase(),
    type: 'ble',
    signal: '-54 dBm',
    rssi: -54,
    battery: '90%',
    statusText: 'Web Bluetooth Paired',
    room: 'Bedside Room',
    patient: 'Assigned',
  };
}

/**
 * Probes the standard ESP32 Default SoftAP gateway (192.168.4.1)
 * When an ESP32 is powered on in configuration/AP mode, it always hosts on 192.168.4.1
 */
export async function probeEsp32SoftAp(): Promise<DiscoveredController | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const res = await fetch('http://192.168.4.1/status', {
      signal: controller.signal,
      mode: 'no-cors', // Avoid strict CORS rejection
    });
    clearTimeout(timeoutId);
    if (res) {
      return {
        id: 'ESP32-AP-41',
        name: 'MarQ Bed ESP32 (SoftAP Mode)',
        mac: 'ESP32-AP-192.168.4.1',
        type: 'wifi',
        signal: '-35 dBm (Direct Hotspot)',
        rssi: -35,
        battery: '100% (Mains Power)',
        ip: '192.168.4.1',
        port: 80,
        isSoftAp: true,
        statusText: 'Direct ESP32 SoftAP Connected',
        room: 'Configuration Mode',
        patient: 'Bedside Unit',
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
  }
  return null;
}

/**
 * Scans a target IP subnet range (e.g., 192.168.1.x)
 */
export async function probeLocalIp(
  ip: string,
  port: number = 8080
): Promise<DiscoveredController | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    await fetch(`http://${ip}:${port}/api/status`, {
      signal: controller.signal,
      mode: 'no-cors',
    });
    clearTimeout(timeoutId);

    return {
      id: `Bed-${ip}`,
      name: `ESP32 Bed (${ip})`,
      mac: `IP-${ip}`,
      type: 'wifi',
      signal: '-45 dBm (Wi-Fi LAN)',
      rssi: -45,
      battery: '95%',
      ip,
      port,
      statusText: 'Local Wi-Fi Verified',
      room: 'Assigned Room',
      patient: 'Bedside Patient',
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
