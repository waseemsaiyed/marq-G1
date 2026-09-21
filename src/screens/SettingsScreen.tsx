import React, { useState, useEffect } from 'react';
import { BedState, PairedDeviceItem } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';
import {
  getPairedDevices,
  removePairedDevice,
  clearAllPairedDevices,
  restoreDefaultPairedDevices,
} from '../services/pairedDevicesStorage';

interface SettingsScreenProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onOpenApkModal?: () => void;
  onNavigateToPair?: () => void;
  onOpenPatientChart?: (tab?: 'vitals' | 'mass' | 'diagnostic' | 'medication' | 'doctor' | 'emergency') => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
  onOpenApkModal,
  onNavigateToPair,
  onOpenPatientChart,
}) => {
  const [pressHoldDelay, setPressHoldDelay] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [pairedDevices, setPairedDevices] = useState<PairedDeviceItem[]>(() => getPairedDevices());
  const [deviceActionNotice, setDeviceActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPairedDevices(e.detail);
      } else {
        setPairedDevices(getPairedDevices());
      }
    };
    window.addEventListener('marq_paired_devices_changed', handleStorageChange);
    return () => {
      window.removeEventListener('marq_paired_devices_changed', handleStorageChange);
    };
  }, []);

  const handleForgetDevice = (device: PairedDeviceItem) => {
    const updated = removePairedDevice(device.id);
    setPairedDevices(updated);
    if (bedState.connectedBedId === device.id) {
      setBedState((prev) => ({
        ...prev,
        connectedBedId: '',
        patientName: 'Unassigned',
        roomNumber: 'No Bed Paired',
        bleSynced: false,
        wifiConnected: false,
      }));
      setDeviceActionNotice(`Unpaired and removed active bed "${device.name}". Ready for new connection.`);
    } else {
      setDeviceActionNotice(`Removed "${device.name}" from saved paired devices.`);
    }
    setTimeout(() => setDeviceActionNotice(null), 3000);
  };

  const handleClearAllConnections = () => {
    clearAllPairedDevices();
    setPairedDevices([]);
    setBedState((prev) => ({
      ...prev,
      connectedBedId: '',
      patientName: 'Unassigned',
      roomNumber: 'No Bed Paired',
      bleSynced: false,
      wifiConnected: false,
    }));
    setDeviceActionNotice('All saved Bluetooth & Wi-Fi devices cleared. Ready for new connections.');
    setTimeout(() => setDeviceActionNotice(null), 3500);
  };

  const handleRestoreDefaultConnections = () => {
    const restored = restoreDefaultPairedDevices();
    setPairedDevices(restored);
    setDeviceActionNotice('Restored demo hospital bed controllers.');
    setTimeout(() => setDeviceActionNotice(null), 3000);
  };

  const toggleVoice = () => {
    setBedState((prev) => ({ ...prev, voiceEnabled: !prev.voiceEnabled }));
  };

  const toggleHighContrast = () => {
    setBedState((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const setHaptic = (mode: 'subtle' | 'strong') => {
    setBedState((prev) => ({ ...prev, hapticFeedback: mode }));
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Timestamp,Event,Details\n' +
      '14:22,Cardiac Chair Preset (45 deg),Triggered by Nurse Station iPad 04\n' +
      '12:05,Weight Tare & Calibrated,Load cells calibrated: 68.4 kg\n' +
      '08:30,Patient Exit Sensor Alert,Pressure delta detected\n' +
      '06:15,Under-Bed Safety Guide Dimmer,Ambient photodiode shift: 12% warmth nightlight\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marq_bed_telemetry_${bedState.connectedBedId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setExportNotice('Audit log exported successfully.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-4 max-w-lg mx-auto pb-6">
      {/* ESP32 Hub Diagnostic Header */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-md flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">
                developer_board
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] font-bold text-on-surface">
                  ESP32-S3 Medical Hub
                </span>
                <span className="text-[10px] font-extrabold bg-primary-fixed text-on-primary-fixed px-1.5 py-0.2 rounded uppercase">
                  v2.4.1 Latest
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-mono">
                HW Rev D • UUID: MQ-9842-X
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] font-bold text-outline uppercase">
              System Uptime
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-primary text-[14px]">
                schedule
              </span>
              <span className="text-xs font-bold text-on-surface">
                14d 06h 42m
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] font-bold text-outline uppercase">
              Core Temp &amp; Load
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">
                device_thermostat
              </span>
              <span className="text-xs font-bold text-on-surface">
                36.8°C • 12%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container p-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">
              hub
            </span>
            <div className="flex flex-col text-[11px]">
              <span className="font-extrabold text-on-surface uppercase">
                DUAL-BAND ACTIVE
              </span>
              <span className="text-on-surface-variant">
                BLE 5.0 Priority • Failover Ready
              </span>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
            Synchronized
          </span>
        </div>
      </div>

      {/* PWA & APK Installation Card */}
      <PWAInstallButton onOpenApkModal={onOpenApkModal} variant="card" />

      {/* Hospital Link Config */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-2.5 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              wifi
            </span>
            <h2 className="text-[15px] font-bold text-on-surface">
              Hospital Link Config
            </h2>
          </div>
          <span className="material-symbols-outlined text-emerald-600 text-[20px]">
            verified
          </span>
        </div>

        <div className="flex items-center justify-between text-xs py-1">
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px]">
              signal_cellular_alt
            </span>
            <span className="font-medium">St-Jude-Clinical-5G</span>
          </div>
          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            -48 dBm (Strong)
          </span>
        </div>

        <div className="flex items-center justify-between text-xs py-1 border-t border-outline-variant/10">
          <span className="text-on-surface-variant">Assigned Static IP:</span>
          <span className="font-mono font-bold text-on-surface">
            192.168.10.142
          </span>
        </div>

        <div className="flex items-center justify-between text-xs py-1 border-t border-outline-variant/10">
          <span className="text-on-surface-variant">Gateway Ping (ESP32):</span>
          <span className="font-bold text-on-surface">4.2 ms (Zero Jitter)</span>
        </div>

        <div className="bg-surface-container-low p-2 rounded-lg flex items-center gap-2 text-[11px] font-bold text-on-surface-variant mt-1">
          <span className="material-symbols-outlined text-primary text-[16px]">
            security
          </span>
          <span>WPA3 Enterprise Security Pass</span>
        </div>
      </div>

      {/* Saved Hardware Connections (Bluetooth & Wi-Fi) */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              settings_input_antenna
            </span>
            <h2 className="text-[15px] font-bold text-on-surface">
              Paired Hardware Connections
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {pairedDevices.length > 0 ? (
              <button
                id="btn-settings-clear-all"
                onClick={handleClearAllConnections}
                className="text-[11px] font-bold text-tertiary hover:bg-tertiary/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Remove all paired Bluetooth and Wi-Fi devices"
              >
                <span className="material-symbols-outlined text-[15px]">
                  layers_clear
                </span>
                Clear All
              </button>
            ) : (
              <button
                onClick={handleRestoreDefaultConnections}
                className="text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">
                  history
                </span>
                Restore
              </button>
            )}
          </div>
        </div>

        {deviceActionNotice && (
          <div className="bg-primary/10 text-primary border border-primary/20 rounded-lg p-2.5 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[16px]">
              info
            </span>
            <span>{deviceActionNotice}</span>
          </div>
        )}

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Manage saved Bluetooth LE and Wi-Fi controllers. Removing previously paired devices disconnects the controller and clears memory for new connections.
        </p>

        {pairedDevices.length === 0 ? (
          <div className="bg-surface-container-low/60 rounded-xl p-4 border border-dashed border-outline-variant/30 flex flex-col items-center justify-center text-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
              link_off
            </span>
            <span className="text-xs font-bold text-on-surface">
              No Saved Hardware Connections
            </span>
            <span className="text-[11px] text-on-surface-variant">
              All previously paired devices have been removed. Ready for new connections.
            </span>
            {onNavigateToPair && (
              <button
                onClick={onNavigateToPair}
                className="mt-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">
                  add_circle
                </span>
                Pair New Bed Controller
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pairedDevices.map((device) => {
              const isActive = bedState.connectedBedId === device.id;
              return (
                <div
                  key={device.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    isActive
                      ? 'bg-emerald-50/50 border-emerald-500/50 ring-1 ring-emerald-500/30'
                      : 'bg-surface-container-low border-outline-variant/20'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-on-surface truncate">
                        {device.name || device.id}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Active
                        </span>
                      )}
                      {device.link === 'BLE Only' ? (
                        <span className="text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded">
                          BLE
                        </span>
                      ) : device.link === 'Wi-Fi IP' ? (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                          Wi-Fi
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                          Dual-Band
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-on-surface-variant font-mono mt-0.5 truncate">
                      {device.room} • {device.mac}
                    </div>
                  </div>

                  <button
                    id={`btn-settings-forget-${device.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
                    onClick={() => handleForgetDevice(device)}
                    className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-tertiary/10 text-on-surface-variant hover:text-tertiary border border-outline-variant/30 hover:border-tertiary/40 transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer shrink-0"
                    title={`Forget ${device.name || device.id}`}
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      delete_outline
                    </span>
                    <span>Forget</span>
                  </button>
                </div>
              );
            })}

            {onNavigateToPair && (
              <button
                onClick={onNavigateToPair}
                className="w-full mt-1 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add_link
                </span>
                <span>Open Pairing &amp; Scan Radar</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Power & Backup Battery Subsystem */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${
              bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20)
                ? 'text-amber-600 animate-pulse'
                : 'text-emerald-600'
            }`}>
              {bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20)
                ? 'battery_alert'
                : 'battery_charging_full'}
            </span>
            <h2 className="text-[15px] font-bold text-on-surface">
              Power &amp; Battery Diagnostics
            </h2>
          </div>
          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
            bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20)
              ? 'bg-amber-500/20 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20)
              ? 'Low Battery Alert'
              : 'Healthy'}
          </span>
        </div>

        {/* Real-time Battery Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] font-bold text-outline uppercase">
              Current Charge Level
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[18px] font-extrabold ${
                bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20)
                  ? 'text-amber-700'
                  : 'text-primary'
              }`}>
                {bedState.batteryPercent}%
              </span>
              <span className="text-[10px] text-on-surface-variant">
                ({bedState.isCharging ? 'AC Charging' : 'On Battery'})
              </span>
            </div>
          </div>
          <div className="bg-surface-container-low p-2.5 rounded-lg flex flex-col">
            <span className="text-[10px] font-bold text-outline uppercase">
              Warning Threshold
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[18px] font-extrabold text-on-surface">
                &lt; {bedState.lowBatteryThreshold ?? 20}%
              </span>
              <span className="text-[10px] text-outline font-semibold">
                (Trigger)
              </span>
            </div>
          </div>
        </div>

        {/* Threshold Adjustment */}
        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-on-surface">
              Low Battery Warning Threshold
            </span>
            <span className="text-xs text-on-surface-variant">
              Triggers visual header alert when charge drops below this level
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[15, 20, 25].map((thresh) => (
              <button
                key={thresh}
                onClick={() => setBedState((prev) => ({ ...prev, lowBatteryThreshold: thresh }))}
                className={`px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  (bedState.lowBatteryThreshold ?? 20) === thresh
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container hover:bg-surface-variant text-on-surface'
                }`}
              >
                {thresh}%
              </button>
            ))}
          </div>
        </div>

        {/* Battery Simulation Range Slider */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-outline-variant/10">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-on-surface">
              Battery Level Simulator
            </span>
            <span className="font-extrabold text-primary">
              {bedState.batteryPercent}%
            </span>
          </div>
          <div className="relative w-full h-7 flex items-center">
            <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20)
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, bedState.batteryPercent))}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={bedState.batteryPercent}
              onChange={(e) =>
                setBedState((prev) => ({
                  ...prev,
                  batteryPercent: parseInt(e.target.value, 10),
                }))
              }
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[10px] text-outline font-semibold">
            <span>0% (Depleted)</span>
            <span className="text-amber-700 font-bold">20% Threshold</span>
            <span>100% (Full)</span>
          </div>
        </div>

        {/* Quick Simulation Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() =>
              setBedState((prev) => ({
                ...prev,
                batteryPercent: 14,
                isCharging: false,
              }))
            }
            className="min-h-[44px] rounded-lg bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-amber-900 border border-amber-500/30 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">
              battery_alert
            </span>
            <span>Simulate Low Battery (14%)</span>
          </button>
          <button
            onClick={() =>
              setBedState((prev) => ({
                ...prev,
                batteryPercent: 88,
                isCharging: true,
              }))
            }
            className="min-h-[44px] rounded-lg bg-surface-container hover:bg-surface-variant active:scale-95 text-on-surface border border-outline-variant/15 flex items-center justify-center gap-1.5 text-xs font-bold cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[16px] text-emerald-600">
              battery_charging_full
            </span>
            <span>Restore Normal (88%)</span>
          </button>
        </div>
      </div>

      {/* Safety & Tactile Controls */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3.5 border border-outline-variant/15">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[22px]">
            accessibility_new
          </span>
          <h2 className="text-[15px] font-bold text-on-surface">
            Safety &amp; Tactile Controls
          </h2>
        </div>

        {/* Press & Hold Delay */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-on-surface">
              Press &amp; Hold Delay
            </span>
            <span className="text-xs text-on-surface-variant">
              1.0s Safety hold prevent accidental touches
            </span>
          </div>
          <button
            onClick={() => setPressHoldDelay(!pressHoldDelay)}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              pressHoldDelay ? 'bg-primary justify-end' : 'bg-surface-variant justify-start'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-on-primary shadow-xs" />
          </button>
        </div>

        {/* Haptic Motor Feedback */}
        <div className="flex flex-col gap-2 pt-1 border-t border-outline-variant/10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-on-surface">
                Haptic Motor Feedback
              </span>
              <span className="text-xs text-on-surface-variant">
                Tactile click pulses during motor movement
              </span>
            </div>
            <span className="text-[10px] font-extrabold text-primary uppercase">
              {bedState.hapticFeedback}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={() => setHaptic('subtle')}
              className={`h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                bedState.hapticFeedback === 'subtle'
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                vibration
              </span>
              Subtle
            </button>
            <button
              onClick={() => setHaptic('strong')}
              className={`h-11 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                bedState.hapticFeedback === 'strong'
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface-container text-on-surface border-transparent hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                waves
              </span>
              Strong Medical
            </button>
          </div>
        </div>

        {/* Voice Confirmation */}
        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-on-surface">
              Voice Confirmation
            </span>
            <span className="text-xs text-on-surface-variant">
              Spoken articulation readouts (&quot;Head 45° reached&quot;)
            </span>
          </div>
          <button
            onClick={toggleVoice}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              bedState.voiceEnabled ? 'bg-primary justify-end' : 'bg-surface-variant justify-start'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-on-primary shadow-xs" />
          </button>
        </div>

        {/* High Contrast / Heavy Type */}
        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold text-on-surface">
              High Contrast / Heavy Type
            </span>
            <span className="text-xs text-on-surface-variant">
              Optimized for night-shift visibility
            </span>
          </div>
          <button
            onClick={toggleHighContrast}
            className={`w-12 h-7 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              bedState.highContrast ? 'bg-primary justify-end' : 'bg-surface-variant justify-start'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-on-primary shadow-xs" />
          </button>
        </div>
      </div>

      {/* Patient Clinical Profile & Charting Management */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              clinical_notes
            </span>
            <h2 className="text-[15px] font-bold text-on-surface">
              Patient Clinical Chart &amp; Vitals
            </h2>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
              bedState.patientStability === 'Critical'
                ? 'bg-red-100 text-red-800'
                : bedState.patientStability === 'Guarded'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {bedState.patientStability || 'Stable'}
          </span>
        </div>

        <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-on-surface">
                {bedState.patientName || 'J. Anderson'}
              </div>
              <div className="text-xs text-on-surface-variant">
                Assigned Bed: {bedState.connectedBedId} • {bedState.roomNumber}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-extrabold text-primary">
                {bedState.patientWeight || 68.4} kg
              </div>
              <div className="text-[10px] text-outline">
                Verified OIML Scale
              </div>
            </div>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Manage comprehensive clinical parameters including patient mass, stability index, live vitals, diagnostic laboratory reports, medications, attending doctor visit logs, and emergency notes.
          </p>
        </div>

        {onOpenPatientChart && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onOpenPatientChart('mass')}
              className="h-10 rounded-lg bg-primary text-on-primary hover:bg-primary-hover text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">scale</span>
              <span>Mass &amp; Stability</span>
            </button>
            <button
              onClick={() => onOpenPatientChart('vitals')}
              className="h-10 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all border border-outline-variant/20"
            >
              <span className="material-symbols-outlined text-[16px] text-tertiary">ecg_heart</span>
              <span>Vitals &amp; Reports</span>
            </button>
          </div>
        )}
      </div>

      {/* Caregiver Authorization */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              badge
            </span>
            <h2 className="text-[15px] font-bold text-on-surface">
              Caregiver Authorization
            </h2>
          </div>
          <span className="text-[10px] font-extrabold bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full uppercase">
            3 Connected
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                tablet_mac
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Nurse Station iPad 04
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Master Control Overwrite Allowed
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">
              lock_open
            </span>
          </div>

          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                smartphone
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Dr. Chen Mobile Key
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  ICU Attending Level Access
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-emerald-600 text-[18px]">
              check_circle
            </span>
          </div>

          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                settings_remote
              </span>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Patient Bedside Pendant
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Elevation Restricted (Safety Lock Active)
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-secondary text-[18px]">
              lock
            </span>
          </div>
        </div>
      </div>

      {/* Movement History Log */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              history
            </span>
            <h2 className="text-[15px] font-bold text-on-surface">
              Movement History Log
            </h2>
          </div>
          <button
            onClick={handleExportCSV}
            className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            Export CSV
          </button>
        </div>

        {exportNotice && (
          <div className="text-[11px] bg-emerald-50 text-emerald-700 font-bold p-2 rounded-md text-center">
            {exportNotice}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[16px]">
                  airline_seat_recline_extra
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Cardiac Chair Preset (45°)
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Triggered by Nurse Station iPad 04
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-outline">14:22</span>
          </div>

          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">
                  scale
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Weight Tare &amp; Calibrated
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Load cells calibrated: 68.4 kg (±0.05kg drift)
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-outline">12:05</span>
          </div>

          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[16px]">
                  notifications
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Patient Exit Sensor Alert
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Pressure delta detected • Auto-resolved at 08:32
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-outline">08:30</span>
          </div>

          <div className="bg-surface-container-low p-2.5 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">
                  bedtime
                </span>
              </div>
              <div>
                <div className="text-xs font-bold text-on-surface">
                  Under-Bed Safety Guide Dimmer
                </div>
                <div className="text-[10px] text-on-surface-variant">
                  Ambient photodiode shift: 12% warmth nightlight
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-outline">06:15</span>
          </div>
        </div>
      </div>

      {/* Mechanical Motor Kill-Switch */}
      <div className="bg-error-container/40 border border-error/30 rounded-xl p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-error font-bold text-xs uppercase">
          <span className="material-symbols-outlined text-[18px]">warning</span>
          <span>Mechanical Motor Kill-Switch</span>
        </div>
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Instantly de-energizes all 4 articulation relays on the MarQ ESP32 board over BLE interrupt. Requires physical reset on bed rail junction.
        </p>
        <button
          onClick={onTriggerEStop}
          className="w-full h-12 rounded-xl bg-tertiary hover:bg-tertiary-container active:scale-98 text-on-tertiary font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">
            stop_circle
          </span>
          EMERGENCY STOP (ZERO LATENCY)
        </button>
      </div>

      {/* App Developer & Engineering Attribution */}
      <div id="settings-app-developer-footer" className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center gap-2.5 mt-1 shadow-xs">
        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-[22px]">code</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-on-surface-variant">
            Application Developer &amp; Firmware Architect
          </span>
          <span className="text-sm sm:text-base font-black text-on-surface mt-0.5">
            Mr.Waseem Adil Saiyed
          </span>
          <span className="text-[11px] text-outline font-medium mt-0.5">
            Medical Bed Telemetry &amp; Actuator Control System • v2.4.0 Production Build
          </span>
        </div>
      </div>
    </div>
  );
};
