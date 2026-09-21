import { PairedDeviceItem } from '../types';

export const DEFAULT_PAIRED_DEVICES: PairedDeviceItem[] = [
  {
    id: 'ICU Bed 03',
    name: 'MarQ Bed ICU-03',
    mac: 'E4:65:B8:12:F3:9A',
    fw: 'v2.4.1',
    signal: '-52 dBm',
    rssi: -52,
    battery: '92%',
    link: 'Dual-Band',
    recommended: true,
    room: 'Room 412',
    patient: 'J. Anderson',
    ip: '192.168.10.142',
    isPaired: true,
    pairedAt: 'Today, 07:45 AM',
  },
  {
    id: 'ESP32-AP-41',
    name: 'ESP32 Default SoftAP',
    mac: 'ESP32-AP-192.168.4.1',
    fw: 'v2.4.1',
    signal: '-38 dBm (Hotspot)',
    rssi: -38,
    battery: '100% (AC Mains)',
    link: 'Wi-Fi IP',
    recommended: false,
    room: 'Direct Hotspot',
    patient: 'Bed Controller',
    ip: '192.168.4.1:80',
    isPaired: true,
    pairedAt: 'Yesterday, 04:20 PM',
  },
  {
    id: 'Post-Op 12',
    name: 'MarQ Bed Post-Op 12',
    mac: 'E4:65:B8:12:21:4C',
    fw: 'v2.3.9',
    signal: '-74 dBm',
    rssi: -74,
    battery: '78%',
    link: 'BLE Only',
    recommended: false,
    room: 'Room 205',
    patient: 'M. Vance',
    ip: '192.168.10.155',
    isPaired: true,
    pairedAt: '3 days ago',
  },
];

const STORAGE_KEY = 'marq_paired_devices';

export function getPairedDevices(): PairedDeviceItem[] {
  if (typeof window === 'undefined') return DEFAULT_PAIRED_DEVICES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First run: save defaults
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PAIRED_DEVICES));
      return DEFAULT_PAIRED_DEVICES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse paired devices from localStorage:', err);
    return DEFAULT_PAIRED_DEVICES;
  }
}

export function savePairedDevices(devices: PairedDeviceItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
    window.dispatchEvent(new CustomEvent('marq_paired_devices_changed', { detail: devices }));
  } catch (err) {
    console.error('Failed to save paired devices:', err);
  }
}

export function removePairedDevice(id: string): PairedDeviceItem[] {
  const current = getPairedDevices();
  const updated = current.filter((d) => d.id !== id);
  savePairedDevices(updated);
  return updated;
}

export function clearAllPairedDevices(): PairedDeviceItem[] {
  savePairedDevices([]);
  return [];
}

export function restoreDefaultPairedDevices(): PairedDeviceItem[] {
  savePairedDevices(DEFAULT_PAIRED_DEVICES);
  return DEFAULT_PAIRED_DEVICES;
}

export function saveOrUpdatePairedDevice(device: PairedDeviceItem): PairedDeviceItem[] {
  const current = getPairedDevices();
  const existsIndex = current.findIndex((d) => d.id === device.id);
  const updatedItem: PairedDeviceItem = {
    ...device,
    isPaired: true,
    pairedAt: device.pairedAt || 'Just now',
  };

  let updatedList: PairedDeviceItem[];
  if (existsIndex >= 0) {
    updatedList = [...current];
    updatedList[existsIndex] = { ...updatedList[existsIndex], ...updatedItem };
  } else {
    updatedList = [updatedItem, ...current];
  }
  savePairedDevices(updatedList);
  return updatedList;
}
