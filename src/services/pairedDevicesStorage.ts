import { PairedDeviceItem } from '../types';

export const DEFAULT_PAIRED_DEVICES: PairedDeviceItem[] = [];

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
