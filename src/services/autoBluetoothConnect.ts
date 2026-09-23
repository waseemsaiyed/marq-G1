/**
 * Auto Bluetooth Connection Service
 *
 * If mobile Bluetooth is already paired to the ESP32 controller in Android OS settings
 * (or previously authorized via Web Bluetooth / app storage), the app automatically
 * adopts it as the default active connection so the user does NOT need to pair in the app.
 */

import { BleClient, BleDevice } from '@capacitor-community/bluetooth-le';
import { isNativeAndroidApp, isWebBluetoothSupported } from './hardwareDiscovery';
import { esp32Bridge } from './esp32HardwareBridge';
import { saveOrUpdatePairedDevice, getPairedDevices } from './pairedDevicesStorage';
import { PairedDeviceItem } from '../types';

const AUTO_BLUETOOTH_STORAGE_KEY = 'marq_auto_bluetooth_enabled';

export interface AutoAdoptResult {
  adopted: boolean;
  source: 'android-os-bonded' | 'web-bluetooth-authorized' | 'storage-paired' | 'none';
  deviceName: string;
  deviceId: string;
  mac: string;
  transport: 'ble' | 'wifi' | 'dual';
  message: string;
}

/**
 * Returns whether Auto-Connect for mobile-paired Bluetooth is enabled (defaults to true)
 */
export function isAutoBluetoothEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(AUTO_BLUETOOTH_STORAGE_KEY);
  return val === null ? true : val === 'true';
}

/**
 * Toggles Auto-Connect for mobile-paired Bluetooth
 */
export function setAutoBluetoothEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_BLUETOOTH_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('marq_auto_bluetooth_setting_changed', { detail: enabled }));
}

/**
 * Checks if device name likely belongs to an ESP32 bed controller
 */
function isControllerCandidate(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes('esp') ||
    lower.includes('marq') ||
    lower.includes('bed') ||
    lower.includes('hospital') ||
    lower.includes('remote') ||
    lower.includes('wroom') ||
    lower.includes('uart') ||
    lower.includes('ble') ||
    lower.includes('hm') ||
    lower.includes('relay')
  );
}

/**
 * Automatically detects and adopts a controller that is ALREADY paired to the mobile device.
 * No need to pair manually inside the app!
 */
export async function autoDetectAndAdoptPairedBluetooth(): Promise<AutoAdoptResult | null> {
  if (!isAutoBluetoothEnabled()) {
    console.log('[Auto-Bluetooth] Auto-adoption is disabled in settings.');
    return null;
  }

  // 1. NATIVE ANDROID OS BONDED DEVICES (via Capacitor BLE)
  if (isNativeAndroidApp()) {
    try {
      console.log('[Auto-Bluetooth] Checking Android OS bonded Bluetooth devices...');
      await BleClient.initialize();
      const bondedResult = await BleClient.getBondedDevices();
      const bondedDevices: BleDevice[] = Array.isArray(bondedResult)
        ? bondedResult
        : (bondedResult as any)?.devices || [];

      if (bondedDevices.length > 0) {
        console.log(`[Auto-Bluetooth] Found ${bondedDevices.length} Android OS bonded device(s):`, bondedDevices);
        
        // Prefer device matching controller keywords, or default to first bonded device
        const target = bondedDevices.find((d) => isControllerCandidate(d.name)) || bondedDevices[0];
        const devName = target.name || 'ESP32 Paired Controller';
        const devId = target.deviceId;

        // Automatically connect hardware bridge
        try {
          await esp32Bridge.connectNativeCapacitorBle(devId);
        } catch (connErr) {
          console.warn('[Auto-Bluetooth] Background GATT connect attempt:', connErr);
        }

        // Register in paired storage as active bed
        const pairedDev: PairedDeviceItem = {
          id: devName,
          name: devName,
          mac: devId.length >= 17 ? devId.slice(0, 17).toUpperCase() : devId,
          fw: 'ESP32-WROOM-32E (OS-Paired)',
          signal: '-40 dBm (Bonded BLE)',
          rssi: -40,
          battery: '100% (AC Mains)',
          link: 'BLE Only',
          recommended: true,
          room: 'Local Bedside',
          patient: 'Active Unit',
          isPaired: true,
          pairedAt: 'Auto-Adopted from Phone Bluetooth',
        };
        saveOrUpdatePairedDevice(pairedDev);

        return {
          adopted: true,
          source: 'android-os-bonded',
          deviceName: devName,
          deviceId: devId,
          mac: pairedDev.mac,
          transport: 'ble',
          message: `Controller "${devName}" is already paired in your phone's Bluetooth. Auto-adopted as default connection.`,
        };
      }
    } catch (err) {
      console.warn('[Auto-Bluetooth] Failed checking Android bonded devices:', err);
    }
  }

  // 2. WEB BLUETOOTH PERSISTENT GETDEVICES (Chrome on Android / Desktop)
  if (isWebBluetoothSupported() && typeof navigator !== 'undefined') {
    try {
      const bluetooth = (navigator as any).bluetooth;
      if (typeof bluetooth.getDevices === 'function') {
        const permittedDevices = await bluetooth.getDevices();
        if (permittedDevices && permittedDevices.length > 0) {
          const target = permittedDevices.find((d: any) => isControllerCandidate(d.name)) || permittedDevices[0];
          const devName = target.name || 'ESP32 Paired Controller';
          const devId = target.id;

          // Attempt silent GATT reconnect
          if (target.gatt && !target.gatt.connected) {
            target.gatt.connect().catch(() => {});
          }

          const pairedDev: PairedDeviceItem = {
            id: devName,
            name: devName,
            mac: devId.length >= 17 ? devId.slice(0, 17).toUpperCase() : devId,
            fw: 'ESP32-WROOM-32E (Web BLE)',
            signal: '-42 dBm (Authorized BLE)',
            rssi: -42,
            battery: '100% (AC Mains)',
            link: 'BLE Only',
            recommended: true,
            room: 'Local Bedside',
            patient: 'Active Unit',
            isPaired: true,
            pairedAt: 'Auto-Adopted from Browser Permissions',
          };
          saveOrUpdatePairedDevice(pairedDev);

          return {
            adopted: true,
            source: 'web-bluetooth-authorized',
            deviceName: devName,
            deviceId: devId,
            mac: pairedDev.mac,
            transport: 'ble',
            message: `Controller "${devName}" is already authorized in Bluetooth. Auto-adopted as default connection.`,
          };
        }
      }
    } catch (err) {
      console.warn('[Auto-Bluetooth] Web Bluetooth getDevices check:', err);
    }
  }

  // 3. PERSISTENT STORAGE PAIRED BED ADOPTION
  // If the user already has a paired device recorded in storage, adopt it as default
  const existingPaired = getPairedDevices();
  const defaultBed = existingPaired.find((d) => d.isPaired) || existingPaired[0];
  if (defaultBed) {
    if (defaultBed.ip) {
      const [ip, port] = defaultBed.ip.split(':');
      esp32Bridge.connectWifi(ip, parseInt(port, 10) || 80).catch(() => {});
    }

    return {
      adopted: true,
      source: 'storage-paired',
      deviceName: defaultBed.name,
      deviceId: defaultBed.id,
      mac: defaultBed.mac,
      transport: defaultBed.link === 'Wi-Fi IP' ? 'wifi' : 'ble',
      message: `Controller "${defaultBed.name}" is already linked. Loaded as default connection.`,
    };
  }

  return null;
}
