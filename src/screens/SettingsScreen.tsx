import React, { useState } from 'react';
import { BedState } from '../types';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface SettingsScreenProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onOpenApkModal?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
  onOpenApkModal,
}) => {
  const [pressHoldDelay, setPressHoldDelay] = useState(true);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

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
    </div>
  );
};
