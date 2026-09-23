/**
 * Auto Bluetooth Connection Service
 *
 * CM41M_BT is a CLASSIC Bluetooth (SPP / RFCOMM) device, not BLE.
 * It must already be paired in Android's system Bluetooth settings first —
 * classic Bluetooth does not support app-side scanning/discovery of unpaired
 * devices the way BLE does. Once paired, this connects over a serial (SPP) socket.
 */

import { BluetoothSerial } from '@capacitor-community/bluetooth-serial';
import { saveOrUpdatePairedDevice, getPairedDevices } from './pairedDevicesStorage';
import { PairedDeviceItem } from '../types';

const AUTO_BLUETOOTH_STORAGE_KEY = 'marq_auto_bluetooth_enabled';
const CONTROLLER_NAME = 'CM41M_BT';
const SPP_UUID = '00001101-0000-1000-8000-00805F9B34FB'; // standard Bluetooth SIG Serial Port Profile UUID

export interface AutoAdoptResult {
  adopted: boolean;
  source: 'android-os-bonded' | 'storage-paired' | 'none';
  deviceName: string;
  deviceId: string;
  mac: string;
  transport: 'classic-bt' | 'wifi' | 'dual';
  message: string;
}

export function isAutoBluetoothEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(AUTO_BLUETOOTH_STORAGE_KEY);
  return val === null ? true : val === 'true';
}

export function setAutoBluetoothEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTO_BLUETOOTH_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('marq_auto_bluetooth_setting_changed', { detail: enabled }));
}

/**
 * Matches on the controller's actual known name first; falls back to
 * generic keywords only if an exact match isn't found.
 */
function isControllerCandidate(name?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes('cm41m') || // <-- was missing; exact controller family name
    lower.includes('esp') ||
    lower.includes('bed') ||
    lower.includes('relay')
  );
}

/**
 * Automatically detects and adopts CM41M_BT if it's already paired
 * (bonded) in Android's Bluetooth settings, and opens an SPP serial
 * connection to it. No in-app pairing step needed — but the user DOES
 * need to have paired it once in system Settings > Bluetooth, since
 * classic Bluetooth pairing must happen at the OS level.
 */
export async function autoDetectAndAdoptPairedBluetooth(): Promise<AutoAdoptResult | null> {
  if (!isAutoBluetoothEnabled()) {
    console.log('[Auto-Bluetooth] Auto-adoption is disabled in settings.');
    return null;
  }

  try {
    const { enabled } = await BluetoothSerial.isEnabled();
    if (!enabled) {
      console.warn('[Auto-Bluetooth] Bluetooth radio is off.');
      return null;
    }

    const { devices } = await BluetoothSerial.list(); // returns BONDED devices
    if (devices && devices.length > 0) {
      const target =
        devices.find((d) => d.name === CONTROLLER_NAME) ||
        devices.find((d) => isControllerCandidate(d.name));

      if (target) {
        try {
          await BluetoothSerial.connect({ address: target.address, uuid: SPP_UUID });
        } catch (connErr) {
          console.warn('[Auto-Bluetooth] SPP connect attempt failed:', connErr);
          return null;
        }

        const pairedDev: PairedDeviceItem = {
          id: target.name,
          name: target.name,
          mac: target.address,
          fw: 'ESP32-WROOM-32E (Classic BT / SPP)',
          signal: 'Connected (Classic BT)',
          rssi: -40,
          battery: '100% (AC Mains)',
          link: 'Bluetooth Classic',
          recommended: true,
          room: 'Local Bedside',
          patient: 'Active Unit',
          isPaired: true,
          pairedAt: 'Auto-Adopted from Phone Bluetooth (Classic/SPP)',
        };
        saveOrUpdatePairedDevice(pairedDev);

        return {
          adopted: true,
          source: 'android-os-bonded',
          deviceName: target.name,
          deviceId: target.address,
          mac: target.address,
          transport: 'classic-bt',
          message: `Controller "${target.name}" is paired and connected via Classic Bluetooth (SPP).`,
        };
      } else {
        console.warn(
          `[Auto-Bluetooth] "${CONTROLLER_NAME}" not found among ${devices.length} bonded device(s). Pair it in system Bluetooth settings first.`
        );
      }
    }
  } catch (err) {
    console.warn('[Auto-Bluetooth] Failed checking bonded devices:', err);
  }

  // Fallback: previously linked device in app storage (e.g. WiFi)
  const existingPaired = getPairedDevices();
  const defaultBed = existingPaired.find((d) => d.isPaired) || existingPaired[0];
  if (defaultBed) {
    return {
      adopted: true,
      source: 'storage-paired',
      deviceName: defaultBed.name,
      deviceId: defaultBed.id,
      mac: defaultBed.mac,
      transport: defaultBed.link === 'Wi-Fi IP' ? 'wifi' : 'classic-bt',
      message: `Controller "${defaultBed.name}" is already linked. Loaded as default connection.`,
    };
  }

  return null;
}

export async function sendCommand(data: string): Promise<void> {
  try {
    await BluetoothSerial.write({ value: data + '\n' });
  } catch (err) {
    console.error('[Auto-Bluetooth] Send failed:', err);
  }
}
