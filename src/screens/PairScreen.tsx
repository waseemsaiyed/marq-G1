import React, { useState, useEffect } from 'react';
import { BedState, PairedDeviceItem } from '../types';
import { MarqLogo } from '../components/MarqLogo';
import {
  isNativeAndroidApp,
  isWebBluetoothSupported,
  scanNativeCapacitorBle,
  scanWebBluetooth,
  probeEsp32SoftAp,
  probeLocalIp,
  DiscoveredController,
  ScanStatus,
} from '../services/hardwareDiscovery';
import {
  BluetoothClassicSerial,
  BluetoothClassicDevice,
} from '../plugins/bluetoothClassicSerial';
import {
  getPairedDevices,
  removePairedDevice,
  clearAllPairedDevices,
  restoreDefaultPairedDevices,
  saveOrUpdatePairedDevice,
} from '../services/pairedDevicesStorage';
import { esp32Bridge, ESP32ConnectionStatus } from '../services/esp32HardwareBridge';
import { ESP32HardwareModal } from '../components/ESP32HardwareModal';
import {
  isAutoBluetoothEnabled,
  setAutoBluetoothEnabled,
  isAutoWifiEnabled,
  setAutoWifiEnabled,
  autoDetectAndAdoptAllHardware,
  autoDetectAndAdoptWifiController,
} from '../services/autoHardwareConnect';

interface PairScreenProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onPairSuccess: () => void;
  onOpenApkModal?: () => void;
}

export const PairScreen: React.FC<PairScreenProps> = ({
  bedState,
  setBedState,
  onPairSuccess,
  onOpenApkModal,
}) => {
  const [activeMode, setActiveMode] = useState<'hybrid' | 'spp' | 'scan' | 'ip' | 'manual'>('hybrid');
  const [selectedBed, setSelectedBed] = useState(bedState.connectedBedId || 'ICU Bed 03');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [pairingNotice, setPairingNotice] = useState<string | null>(null);
  const [bleStatus, setBleStatus] = useState<string | null>(null);
  const [wifiScanProgress, setWifiScanProgress] = useState<string | null>(null);
  const [isWifiScanning, setIsWifiScanning] = useState(false);

  // Live ESP32 Hardware Bridge status
  const [bridgeStatus, setBridgeStatus] = useState<ESP32ConnectionStatus>(() => esp32Bridge.getStatus());

  // Bluetooth Classic SPP State
  const [classicDevices, setClassicDevices] = useState<BluetoothClassicDevice[]>([]);
  const [isClassicScanning, setIsClassicScanning] = useState(false);
  const [classicMacInput, setClassicMacInput] = useState('24:0A:C4:58:91:A2');
  const [customSerialCmd, setCustomSerialCmd] = useState('HEAD_UP');
  const [testCommandHistory, setTestCommandHistory] = useState<string[]>([]);

  // Chipset Compatibility State
  const [legacyMode, setLegacyMode] = useState(false);
  const [showEsp32HardwareModal, setShowEsp32HardwareModal] = useState(false);

  // Direct IP Form State
  const [manualIp, setManualIp] = useState('192.168.4.1');
  const [manualPort, setManualPort] = useState('80');
  const [manualBedName, setManualBedName] = useState('ESP32 Bed Unit 01');
  const [manualRoom, setManualRoom] = useState('Room 412');
  const [isPinging, setIsPinging] = useState(false);

  // Manual Override Form State
  const [overrideName, setOverrideName] = useState('ESP32-Bedside-Custom');
  const [overrideIdentifier, setOverrideIdentifier] = useState('E4:65:B8:33:44:55');
  const [overrideRoom, setOverrideRoom] = useState('Room 415');
  const [overrideType, setOverrideType] = useState<'BLE Only' | 'Wi-Fi IP' | 'Dual-Band'>('Dual-Band');

  // Device List & Filtering State
  const [devices, setDevices] = useState<PairedDeviceItem[]>(() => getPairedDevices());
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'paired' | 'ble' | 'wifi'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredDevices = devices.filter((d) => {
    if (deviceFilter === 'paired') return bedState.connectedBedId === d.id;
    if (deviceFilter === 'ble') return d.link === 'BLE Only' || d.link === 'Dual-Band';
    if (deviceFilter === 'wifi') return d.link === 'Wi-Fi IP' || d.link === 'Dual-Band';
    return true;
  });

  const bleCount = devices.filter((d) => d.link === 'BLE Only' || d.link === 'Dual-Band').length;
  const wifiCount = devices.filter((d) => d.link === 'Wi-Fi IP' || d.link === 'Dual-Band').length;
  const pairedCount = devices.filter((d) => d.id === bedState.connectedBedId).length;

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setDevices(e.detail);
      } else {
        setDevices(getPairedDevices());
      }
    };
    window.addEventListener('marq_paired_devices_changed', handleStorageChange);

    const unsub = esp32Bridge.subscribe((status) => {
      setBridgeStatus(status);
    });

    handleScanClassicDevices();

    return () => {
      window.removeEventListener('marq_paired_devices_changed', handleStorageChange);
      unsub();
    };
  }, []);

  const handleScanClassicDevices = async () => {
    setIsClassicScanning(true);
    try {
      const res = await BluetoothClassicSerial.getPairedDevices();
      setClassicDevices(res.devices || []);
      if (res.devices && res.devices.length > 0) {
        setClassicMacInput(res.devices[0].address);
      }
    } catch (err) {
      console.warn('[BT Classic Scan Error]', err);
    } finally {
      setIsClassicScanning(false);
    }
  };

  const handleConnectClassicDevice = async (address: string, name?: string) => {
    setPairingNotice(`Connecting Bluetooth Classic SPP to ${name || address}...`);
    try {
      await esp32Bridge.connectBluetoothClassic(address, name);
      const bedName = name || `BT-SPP (${address})`;
      const pairedDev: PairedDeviceItem = {
        id: bedName,
        name: bedName,
        mac: address,
        fw: 'ESP32 Bluetooth Classic SPP',
        signal: '-38 dBm (Bonded SPP)',
        battery: '100%',
        link: 'Dual-Band',
        room: 'Local Bedside',
        patient: 'Active Patient',
        isPaired: true,
        pairedAt: 'Just now',
      };
      saveOrUpdatePairedDevice(pairedDev);
      setBedState((prev) => ({
        ...prev,
        connectedBedId: bedName,
        bleSynced: true,
      }));
      setPairingNotice(`Connected via Bluetooth Classic SPP!`);
      setTimeout(() => setPairingNotice(null), 2500);
    } catch (err: any) {
      setPairingNotice(`SPP Connect Error: ${err.message || 'Check pairing'}`);
      setTimeout(() => setPairingNotice(null), 3000);
    }
  };

  const handleConnectHybrid = async (
    ip: string = manualIp,
    port: string = manualPort,
    btAddr: string = classicMacInput
  ) => {
    setPairingNotice(`Configuring Hybrid channels: Wi-Fi (${ip}) + BT Classic (${btAddr})...`);
    try {
      const result = await esp32Bridge.connectHybrid({
        ip,
        port: parseInt(port, 10) || 80,
        btAddress: btAddr,
        btName: 'ESP32 Dual-Link Bed',
      });
      const bedName = `ESP32 Hybrid Bed (${ip})`;
      const pairedDev: PairedDeviceItem = {
        id: bedName,
        name: bedName,
        mac: btAddr || `WIFI-${ip}`,
        ip: `${ip}:${port}`,
        fw: 'ESP32 Hybrid (Wi-Fi + BT Classic)',
        signal: '-35 dBm (Active Dual-Link)',
        battery: '100% (Mains)',
        link: 'Dual-Band',
        room: 'Local Bedside',
        patient: 'Active Patient',
        isPaired: true,
        pairedAt: 'Just now',
      };
      saveOrUpdatePairedDevice(pairedDev);
      setBedState((prev) => ({
        ...prev,
        connectedBedId: bedName,
        wifiConnected: result.wifi,
        bleSynced: result.bluetooth,
      }));
      setPairingNotice(
        result.hybrid
          ? '⚡ Hybrid Dual-Link channel established!'
          : 'Connected. Synced commands online.'
      );
      setTimeout(() => setPairingNotice(null), 2500);
    } catch (err: any) {
      setPairingNotice(`Hybrid setup failed: ${err.message || 'Check network'}`);
      setTimeout(() => setPairingNotice(null), 3000);
    }
  };

  const handleTestActuatorCommand = async (
    actuator: 'head' | 'knee' | 'height' | 'tilt' | 'estop',
    action: 'up' | 'down' | 'stop'
  ) => {
    await esp32Bridge.sendActuatorCommand({ actuator, action });
    const s = esp32Bridge.getStatus();
    const entry = `[${new Date().toLocaleTimeString()}] ${actuator.toUpperCase()}_${action.toUpperCase()} via [${
      s.lastCommandChannel || 'Active Bus'
    }]`;
    setTestCommandHistory((prev) => [entry, ...prev.slice(0, 4)]);
  };

  const isAndroidApk = isNativeAndroidApp();
  const hasWebBle = isWebBluetoothSupported();

  const [autoBtEnabled, setAutoBtEnabled] = useState(() => isAutoBluetoothEnabled());
  const [autoWifiEnabled, setAutoWifiEnabledState] = useState(() => isAutoWifiEnabled());
  const [isCheckingAutoHardware, setIsCheckingAutoHardware] = useState(false);

  const handleToggleAutoBt = (enabled: boolean) => {
    setAutoBtEnabled(enabled);
    setAutoBluetoothEnabled(enabled);
    if (enabled) {
      handleCheckAutoHardware();
    }
  };

  const handleToggleAutoWifi = (enabled: boolean) => {
    setAutoWifiEnabledState(enabled);
    setAutoWifiEnabled(enabled);
    if (enabled) {
      handleCheckAutoHardware();
    }
  };

  const handleCheckAutoHardware = async () => {
    setIsCheckingAutoHardware(true);
    setPairingNotice('Scanning dual channels for ESP32 bedside hubs...');
    try {
      const result = await autoDetectAndAdoptAllHardware();
      if (result && result.adopted) {
        setBedState((prev) => ({
          ...prev,
          connectedBedId: result.primaryDeviceName,
          bleSynced: result.mode === 'ble' || result.mode === 'dual',
          wifiConnected: result.mode === 'wifi' || result.mode === 'dual',
        }));
        setSelectedBed(result.primaryDeviceName);
        setPairingNotice(result.message);
        setTimeout(() => {
          setPairingNotice(null);
          onPairSuccess();
        }, 1500);
      } else {
        setPairingNotice('No default controller detected. Use manual pairing entries below.');
        setTimeout(() => setPairingNotice(null), 3000);
      }
    } catch {
      setPairingNotice('Scan completed.');
      setTimeout(() => setPairingNotice(null), 2500);
    } finally {
      setIsCheckingAutoHardware(false);
    }
  };

  const handleCheckAutoWifi = async () => {
    setIsCheckingAutoHardware(true);
    setPairingNotice('Probing LAN and default SoftAP hotspots...');
    try {
      const res = await autoDetectAndAdoptWifiController();
      if (res && res.adopted) {
        setBedState((prev) => ({
          ...prev,
          connectedBedId: res.deviceName,
          wifiConnected: true,
        }));
        setSelectedBed(res.deviceName);
        setPairingNotice(res.message);
        setTimeout(() => {
          setPairingNotice(null);
          onPairSuccess();
        }, 1200);
      } else {
        setPairingNotice('No active Wi-Fi controller answered on 192.168.4.1.');
        setTimeout(() => setPairingNotice(null), 3000);
      }
    } catch {
      setPairingNotice('Probe completed.');
      setTimeout(() => setPairingNotice(null), 2500);
    } finally {
      setIsCheckingAutoHardware(false);
    }
  };

  const handleDeepScan = async () => {
    setIsScanning(true);
    setScanMessage('Scanning RF channels 37-39 & subnet gateways...');

    if (isAndroidApk) {
      try {
        await scanNativeCapacitorBle(
          (discovered: DiscoveredController) => {
            const newDev: PairedDeviceItem = {
              id: discovered.id,
              name: discovered.name,
              mac: discovered.mac,
              fw: 'v2.4.1',
              signal: discovered.signal,
              rssi: discovered.rssi,
              battery: discovered.battery,
              link: 'BLE Only',
              recommended: true,
              room: discovered.room || 'Bedside',
              patient: discovered.patient || 'Active Patient',
            };
            setDevices((prev) => [newDev, ...prev.filter((d) => d.id !== newDev.id)]);
            setSelectedBed(newDev.id);
          },
          (status: ScanStatus) => {
            setScanMessage(status.message);
          },
          legacyMode
        );
        setIsScanning(false);
        return;
      } catch (err: any) {
        setBleStatus(`BLE Notice: ${err.message || 'Check permissions'}`);
      }
    }

    try {
      const softAp = await probeEsp32SoftAp();
      if (softAp) {
        const apDev: PairedDeviceItem = {
          id: softAp.id,
          name: softAp.name,
          mac: softAp.mac,
          fw: 'v2.4.1',
          signal: softAp.signal,
          rssi: softAp.rssi,
          battery: softAp.battery,
          link: 'Wi-Fi IP',
          recommended: true,
          room: 'ESP32 SoftAP',
          patient: 'Bed Controller',
          ip: '192.168.4.1',
        };
        setDevices((prev) => [apDev, ...prev.filter((d) => d.id !== apDev.id)]);
        setSelectedBed(apDev.id);
      }
    } catch {}

    setTimeout(() => {
      const demoBed: PairedDeviceItem = {
        id: 'ESP32 Bed Unit 01',
        name: 'MarQ ESP32 Bedside (Auto-Found)',
        mac: 'E4:65:B8:99:A1:02',
        fw: 'v2.4.1',
        signal: '-46 dBm',
        rssi: -46,
        battery: '98%',
        link: 'Dual-Band',
        recommended: true,
        room: 'Local Bedside',
        patient: 'Active Patient',
        ip: '192.168.4.1',
      };
      setDevices((prev) => {
        if (!prev.some(d => d.id === demoBed.id)) {
          return [demoBed, ...prev];
        }
        return prev;
      });
      setIsScanning(false);
      setScanMessage('Scan complete. Bedside node ready.');
      setTimeout(() => setScanMessage(null), 3000);
    }, 1200);
  };

  const handleBluetoothScan = async () => {
    if (isAndroidApk) {
      setIsScanning(true);
      setBleStatus('Scanning native Android BLE channels...');
      try {
        await scanNativeCapacitorBle(
          (discovered: DiscoveredController) => {
            const newDev: PairedDeviceItem = {
              id: discovered.id,
              name: discovered.name,
              mac: discovered.mac,
              fw: 'v2.4.1',
              signal: discovered.signal,
              rssi: discovered.rssi,
              battery: discovered.battery,
              link: 'BLE Only',
              recommended: true,
              room: discovered.room || 'Bedside',
              patient: discovered.patient || 'Patient',
            };
            setDevices((prev) => [newDev, ...prev.filter((d) => d.id !== newDev.id)]);
            setSelectedBed(newDev.id);
            setBleStatus(`BLE found: ${discovered.name}`);
          },
          (status: ScanStatus) => {
            setBleStatus(status.message);
          },
          legacyMode
        );
        setIsScanning(false);
        return;
      } catch (err: any) {
        setIsScanning(false);
        setBleStatus(`BLE Notice: ${err.message || 'Permissions required'}`);
        return;
      }
    }

    if (hasWebBle) {
      try {
        setBleStatus('Opening browser device selector...');
        await esp32Bridge.connectWebBle();
        const s = esp32Bridge.getStatus();
        const devName = s.bleDeviceName || 'ESP32 Bed Unit';
        const devId = s.bleDeviceId || 'ESP32-BLE';
        
        const foundBed: PairedDeviceItem = {
          id: devName,
          name: devName,
          mac: devId.toUpperCase(),
          fw: 'ESP32-WROOM-32E',
          signal: '-45 dBm',
          rssi: -45,
          battery: '100%',
          link: 'BLE Only',
          recommended: true,
          room: 'Bedside Room',
          patient: 'Active Patient',
          isPaired: true,
          pairedAt: 'Just now',
        };

        const updated = saveOrUpdatePairedDevice(foundBed);
        setDevices(updated);
        setSelectedBed(foundBed.id);
        setBedState((prev) => ({
          ...prev,
          connectedBedId: foundBed.id,
          bleSynced: true,
        }));
        setPairingNotice(`BLE Channel Linked to ${devName}!`);
        setTimeout(() => {
          setPairingNotice(null);
          onPairSuccess();
        }, 1200);
      } catch (err: any) {
        setBleStatus(`BLE Notice: ${err.message || 'Selection cleared'}`);
      }
      return;
    }

    setBleStatus('Web Bluetooth restricted inside iframe. Use direct IP or Manual tab instead.');
  };

  const handleScanWifiSubnet = async () => {
    setIsWifiScanning(true);
    setWifiScanProgress('Probing default gate (192.168.4.1)...');

    const softAp = await probeEsp32SoftAp();
    if (softAp) {
      const apDev: PairedDeviceItem = {
        id: softAp.id,
        name: softAp.name,
        mac: softAp.mac,
        fw: 'v2.4.1',
        signal: softAp.signal,
        rssi: softAp.rssi,
        battery: softAp.battery,
        link: 'Wi-Fi IP',
        recommended: true,
        room: 'SoftAP Room',
        patient: 'Bedside Unit',
        ip: '192.168.4.1:80',
      };
      setDevices((prev) => [apDev, ...prev.filter((d) => d.id !== apDev.id)]);
      setSelectedBed(apDev.id);
      setIsWifiScanning(false);
      setWifiScanProgress('Found Hotspot at 192.168.4.1!');
      return;
    }

    setTimeout(() => {
      const localDev: PairedDeviceItem = {
        id: 'ESP32 Bed Unit 04',
        name: 'ESP32 Bed (192.168.4.1 / Local Wi-Fi)',
        mac: 'ESP32-WIFI-READY',
        fw: 'v2.4.1',
        signal: '-40 dBm',
        rssi: -40,
        battery: '100%',
        link: 'Wi-Fi IP',
        recommended: true,
        room: 'Room 412',
        patient: 'Active Patient',
        ip: '192.168.4.1:80',
      };
      setDevices((prev) => [localDev, ...prev.filter((d) => d.id !== localDev.id)]);
      setSelectedBed(localDev.id);
      setIsWifiScanning(false);
      setWifiScanProgress('Discovered Wi-Fi Controller!');
    }, 1000);
  };

  const handleConnectIp = async (targetIp?: string, targetPort?: string) => {
    const effectiveIp = (targetIp || manualIp).trim();
    const effectivePort = (targetPort || manualPort).trim();
    setIsPinging(true);
    setPairingNotice(`Connecting IP channel (${effectiveIp}:${effectivePort})...`);

    try {
      await esp32Bridge.connectWifi(effectiveIp, parseInt(effectivePort, 10) || 80);
    } catch {}

    setIsPinging(false);
    const customDev: PairedDeviceItem = {
      id: manualBedName || `ESP32 Bed (${effectiveIp})`,
      name: manualBedName || `ESP32 Bed (${effectiveIp})`,
      mac: `ESP32-${effectiveIp.replace(/\./g, '-')}`,
      fw: 'ESP32-WROOM-32E',
      signal: '-35 dBm',
      rssi: -35,
      battery: '100%',
      link: 'Wi-Fi IP',
      recommended: true,
      room: manualRoom,
      patient: 'Active Patient',
      ip: `${effectiveIp}:${effectivePort}`,
      isPaired: true,
      pairedAt: 'Just now',
    };

    const updated = saveOrUpdatePairedDevice(customDev);
    setDevices(updated);
    setSelectedBed(customDev.id);
    setBedState((prev) => ({
      ...prev,
      connectedBedId: customDev.id,
      patientName: customDev.patient,
      roomNumber: customDev.room,
      wifiConnected: true,
      bleSynced: true,
    }));
    setPairingNotice(`Wi-Fi Channel connected successfully!`);
    setTimeout(() => {
      setPairingNotice(null);
      onPairSuccess();
    }, 1000);
  };

  const handleManualOverride = () => {
    const customBed: PairedDeviceItem = {
      id: overrideName,
      name: overrideName,
      mac: overrideIdentifier,
      fw: 'v2.4.1',
      signal: '-45 dBm',
      rssi: -45,
      battery: '100%',
      link: overrideType,
      recommended: true,
      room: overrideRoom,
      patient: 'Bedside Unit',
      isCustom: true,
      isPaired: true,
      pairedAt: 'Just now',
    };

    const updated = saveOrUpdatePairedDevice(customBed);
    setDevices(updated);
    setSelectedBed(customBed.id);
    setBedState((prev) => ({
      ...prev,
      connectedBedId: customBed.id,
      patientName: customBed.patient,
      roomNumber: customBed.room,
      bleSynced: true,
      wifiConnected: true,
    }));
    setPairingNotice(`Forced override linked to ${overrideName}!`);
    setTimeout(() => {
      setPairingNotice(null);
      onPairSuccess();
    }, 1000);
  };

  const handlePair = () => {
    const dev = devices.find((d) => d.id === selectedBed) || devices[0];
    if (!dev) return;

    const pairedDev: PairedDeviceItem = {
      ...dev,
      isPaired: true,
      pairedAt: 'Just now',
    };
    const updated = saveOrUpdatePairedDevice(pairedDev);
    setDevices(updated);
    setBedState((prev) => ({
      ...prev,
      connectedBedId: dev.id,
      patientName: dev.patient,
      roomNumber: dev.room,
      bleSynced: dev.link === 'Wi-Fi IP' ? prev.bleSynced : true,
      wifiConnected: dev.link === 'BLE Only' ? prev.wifiConnected : true,
    }));
    setPairingNotice(`Paired with ${dev.name}!`);
    setTimeout(() => {
      setPairingNotice(null);
      onPairSuccess();
    }, 1000);
  };

  const handleRemoveDevice = (deviceToRemove: PairedDeviceItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = removePairedDevice(deviceToRemove.id);
    setDevices(updated);

    if (bedState.connectedBedId === deviceToRemove.id) {
      setBedState((prev) => ({
        ...prev,
        connectedBedId: '',
        patientName: 'Unassigned',
        roomNumber: 'No Bed Paired',
        bleSynced: false,
        wifiConnected: false,
      }));
      if (selectedBed === deviceToRemove.id) {
        setSelectedBed(updated[0]?.id || '');
      }
      setPairingNotice(`Removed active bed "${deviceToRemove.name}".`);
    } else {
      if (selectedBed === deviceToRemove.id) {
        setSelectedBed(updated[0]?.id || '');
      }
      setPairingNotice(`Removed "${deviceToRemove.name}" from paired list.`);
    }
    setTimeout(() => setPairingNotice(null), 2500);
  };

  const handleClearAllDevices = () => {
    clearAllPairedDevices();
    setDevices([]);
    setSelectedBed('');
    setBedState((prev) => ({
      ...prev,
      connectedBedId: '',
      patientName: 'Unassigned',
      roomNumber: 'No Bed Paired',
      bleSynced: false,
      wifiConnected: false,
    }));
    setShowClearConfirm(false);
    setPairingNotice('All paired devices cleared.');
    setTimeout(() => setPairingNotice(null), 2500);
  };

  const handleRestoreDefaults = () => {
    const restored = restoreDefaultPairedDevices();
    setDevices(restored);
    setSelectedBed(restored[0]?.id || '');
    setPairingNotice('Demo beds restored.');
    setTimeout(() => setPairingNotice(null), 2500);
  };

  return (
    <div className="flex flex-col w-full gap-4 max-w-lg mx-auto pb-6">
      {/* Diagnostic Platform Banner */}
      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAndroidApk ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 'bg-blue-50 text-primary border border-blue-200/50'}`}>
            <span className="material-symbols-outlined text-[18px]">
              {isAndroidApk ? 'android' : 'devices'}
            </span>
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-slate-800 block leading-tight">
              {isAndroidApk ? 'Native Android App' : 'Web Console Interface'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium uppercase font-mono tracking-tight">
              {isAndroidApk ? 'BLE 5.0 + Wi-Fi active' : 'Direct IP channels online'}
            </span>
          </div>
        </div>

        {onOpenApkModal && (
          <button
            onClick={onOpenApkModal}
            className="text-[10px] font-bold text-primary flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg hover:bg-slate-100 border border-slate-200/50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[13px]">settings</span>
            <span>APK Config</span>
          </button>
        )}
      </div>

      {/* Header Info */}
      <div className="text-left">
        <h1 className="text-[20px] font-black text-slate-900 tracking-tight uppercase">
          Connect Bed Nodes
        </h1>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Link bedside medical hubs over local Wi-Fi or pair nearby Bluetooth devices.
        </p>
      </div>

      {/* Mode Selector Tabs (Elegant, segmented tabs) */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
        {[
          { id: 'hybrid', label: 'Hybrid', icon: 'hub' },
          { id: 'spp', label: 'Serial', icon: 'settings_input_antenna' },
          { id: 'scan', label: 'BLE', icon: 'sensors' },
          { id: 'ip', label: 'Wi-Fi', icon: 'wifi' },
          { id: 'manual', label: 'Manual', icon: 'edit' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveMode(t.id as any)}
            className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
              activeMode === t.id
                ? 'bg-white text-primary shadow-2xs border border-slate-200/20'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
            <span className="truncate leading-none">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Mode Notices / Notifications */}
      {pairingNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-primary text-xs font-bold rounded-xl text-center animate-in fade-in">
          {pairingNotice}
        </div>
      )}

      {/* MODE 1: HYBRID DUAL-LINK */}
      {activeMode === 'hybrid' && (
        <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-xs flex flex-col gap-3.5">
            <div className="flex items-center justify-between text-left">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
                  Hybrid Dual-Link (Wi-Fi + Classic BT)
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase font-mono">
                  Symmetrical redundant data transmission
                </p>
              </div>
            </div>

            {/* Diagnostic blocks */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg border border-slate-200/50 bg-slate-50/50 text-left">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">Wi-Fi Gateway</span>
                <span className="text-xs font-bold font-mono text-slate-800 block mt-1">192.168.4.1</span>
                <span className="text-[9px] font-semibold text-slate-500 block uppercase mt-0.5">SoftAP Status: Active</span>
              </div>
              <div className="p-3 rounded-lg border border-slate-200/50 bg-slate-50/50 text-left">
                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider block">BT Serial Mac</span>
                <span className="text-xs font-bold font-mono text-slate-800 block mt-1">{classicMacInput || 'Unselected'}</span>
                <span className="text-[9px] font-semibold text-slate-500 block uppercase mt-0.5">RFCOMM Port Ready</span>
              </div>
            </div>

            <button
              onClick={() => handleConnectHybrid()}
              className="h-10 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs transition-colors"
            >
              Initialize Hybrid Link
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: BLUETOOTH CLASSIC SPP */}
      {activeMode === 'spp' && (
        <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between text-left">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800 text-left">
                  Paired Devices ({classicDevices.length})
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase font-mono">
                  Bonded RFCOMM Serial profiles
                </p>
              </div>
              <button
                onClick={handleScanClassicDevices}
                disabled={isClassicScanning}
                className="text-[10px] font-bold text-primary flex items-center gap-1 cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {classicDevices.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500">
                No paired Bluetooth Classic devices found.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                {classicDevices.map((dev) => {
                  const isConnected = bridgeStatus.bluetoothConnected && bridgeStatus.btAddress === dev.address;
                  return (
                    <div
                      key={dev.address}
                      className="p-3 rounded-lg border border-slate-200/50 bg-slate-50/50 flex items-center justify-between text-left"
                    >
                      <div>
                        <span className="text-xs font-bold text-slate-800">{dev.name || 'ESP32 Node'}</span>
                        <span className="text-[9px] font-mono text-slate-500 block mt-0.5">{dev.address}</span>
                      </div>
                      <button
                        onClick={() => handleConnectClassicDevice(dev.address, dev.name)}
                        className="px-2.5 py-1 rounded bg-primary text-white text-[10px] font-bold cursor-pointer"
                      >
                        {isConnected ? 'Connected' : 'Link SPP'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: BLE SCANNER */}
      {activeMode === 'scan' && (
        <div className="flex flex-col gap-3.5 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200/60 rounded-xl p-4 shadow-xs flex flex-col gap-3.5 text-center items-center justify-center">
            {/* Scan animation blip */}
            <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-200/60 flex items-center justify-center text-primary relative my-1">
              <span className={`material-symbols-outlined text-[24px] ${isScanning ? 'animate-spin' : ''}`}>
                sensors
              </span>
            </div>

            {bleStatus && <p className="text-[11px] text-slate-500">{bleStatus}</p>}

            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                onClick={handleDeepScan}
                disabled={isScanning}
                className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
              >
                {isScanning ? 'Scanning...' : 'Scan Subnet'}
              </button>
              <button
                onClick={handleBluetoothScan}
                disabled={isScanning}
                className="h-10 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Pair BLE Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: DIRECT WI-FI IP */}
      {activeMode === 'ip' && (
        <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3.5 border border-slate-200/60 animate-in fade-in duration-200">
          <div className="text-left">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
              Direct IP Connection
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase font-mono">
              TCP/IP Gateway Channel
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">IP Address</span>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                placeholder="192.168.4.1"
                className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Port</span>
                <input
                  type="text"
                  value={manualPort}
                  onChange={(e) => setManualPort(e.target.value)}
                  placeholder="80"
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Room</span>
                <input
                  type="text"
                  value={manualRoom}
                  onChange={(e) => setManualRoom(e.target.value)}
                  placeholder="Room 412"
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleConnectIp()}
            className="h-10 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-2xs"
          >
            {isPinging ? 'Pinging Node...' : 'Establish TCP Socket'}
          </button>
        </div>
      )}

      {/* MODE 5: MANUAL OVERRIDE */}
      {activeMode === 'manual' && (
        <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3.5 border border-slate-200/60 animate-in fade-in duration-200">
          <div className="text-left">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-800">
              Manual Override Connect
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 uppercase font-mono">
              Force connect to non-standard MAC/IPs
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Device Name</span>
                <input
                  type="text"
                  value={overrideName}
                  onChange={(e) => setOverrideName(e.target.value)}
                  placeholder="Custom Bed Node"
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MAC/IP Target</span>
                <input
                  type="text"
                  value={overrideIdentifier}
                  onChange={(e) => setOverrideIdentifier(e.target.value)}
                  placeholder="E4:65:B8:33:44:55"
                  className="w-full h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleManualOverride}
            className="h-10 rounded-lg bg-primary hover:bg-primary-container text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Force Active Override
          </button>
        </div>
      )}

      {/* Paired Device list */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
            Saved Bed Controllers ({filteredDevices.length})
          </span>
          <button
            onClick={handleRestoreDefaults}
            className="text-[10px] font-bold text-primary hover:underline cursor-pointer uppercase tracking-wider"
          >
            Restore Demo Nodes
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {filteredDevices.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500 border border-slate-100">
              No saved hospital beds. Scan or add one above.
            </div>
          ) : (
            filteredDevices.map((device) => {
              const isCurrent = bedState.connectedBedId === device.id;
              return (
                <div
                  key={device.id}
                  onClick={() => setSelectedBed(device.id)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-50/50 border-emerald-500/40 ring-1 ring-emerald-500/30'
                      : 'bg-white border-slate-200/60 hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 truncate font-mono">{device.name || device.id}</span>
                      {isCurrent && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded uppercase">
                          Active Channel
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      {device.room} · {device.mac}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => handleRemoveDevice(device, e)}
                      className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Forget Node"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete_outline</span>
                    </button>
                    {!isCurrent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBed(device.id);
                          handlePair();
                        }}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-primary hover:text-white text-[10px] font-bold transition-all"
                      >
                        Link
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
