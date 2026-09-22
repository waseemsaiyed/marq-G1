import React, { useState, useEffect } from 'react';
import { BedState, PairedDeviceItem } from '../types';
import { MarqLogo } from './MarqLogo';
import { getPairedDevices, removePairedDevice } from '../services/pairedDevicesStorage';

interface HeaderProps {
  bedState: BedState;
  onTriggerEStop: () => void;
  onSwitchBed: (bedId: string, room: string, patient: string) => void;
  onOpenApkModal?: () => void;
  onToggleCharging?: () => void;
  onNavigateToPair?: () => void;
  onUnpairBed?: (bedId: string) => void;
  onOpenPatientChart?: (tab?: 'vitals' | 'mass' | 'diagnostic' | 'medication' | 'doctor' | 'emergency') => void;
}

export const Header: React.FC<HeaderProps> = ({
  bedState,
  onTriggerEStop,
  onSwitchBed,
  onOpenApkModal,
  onToggleCharging,
  onNavigateToPair,
  onUnpairBed,
  onOpenPatientChart,
}) => {
  const [showBedMenu, setShowBedMenu] = useState(false);
  const [pairedBeds, setPairedBeds] = useState<PairedDeviceItem[]>(() => getPairedDevices());

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPairedBeds(e.detail);
      } else {
        setPairedBeds(getPairedDevices());
      }
    };
    window.addEventListener('marq_paired_devices_changed', handleStorageChange);
    return () => {
      window.removeEventListener('marq_paired_devices_changed', handleStorageChange);
    };
  }, []);

  const isLowBattery =
    bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20);

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnpairBed) {
      onUnpairBed(id);
    } else {
      removePairedDevice(id);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[100] pt-safe bg-surface-container-lowest border-b border-outline-variant/15 shadow-sm transition-all duration-200">
      <div className="px-3 sm:px-5 flex flex-col gap-1.5 sm:gap-2 py-1.5 sm:py-2 max-w-lg mx-auto">
        {/* Top Action Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5" title="MARQ W-1 Smart Hospital Bed Controls">
              <MarqLogo height={24} className="text-on-surface hover:opacity-95 transition-opacity" />
            </div>
            <span className="text-outline-variant text-[13px] sm:text-[14px]">/</span>
            <div className="relative">
              <button
                id="bed-selector-btn"
                onClick={() => setShowBedMenu(!showBedMenu)}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-surface-container hover:bg-surface-variant transition-colors min-h-[28px] sm:min-h-[32px] cursor-pointer"
              >
                <span className="text-[10px] sm:text-[11px] font-bold text-on-surface uppercase tracking-wider">
                  {bedState.connectedBedId || 'No Bed Paired'}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[15px] sm:text-[16px]">
                  expand_more
                </span>
              </button>

              {showBedMenu && (
                <div className="absolute left-0 mt-1.5 w-64 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-3 py-1">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider">
                      Paired Beds ({pairedBeds.length})
                    </span>
                    {onNavigateToPair && (
                      <button
                        onClick={() => {
                          setShowBedMenu(false);
                          onNavigateToPair();
                        }}
                        className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer"
                      >
                        Manage
                      </button>
                    )}
                  </div>

                  {pairedBeds.length === 0 ? (
                    <div className="px-3 py-3 text-center flex flex-col items-center gap-1.5">
                      <span className="text-xs text-on-surface-variant">
                        No paired controllers
                      </span>
                      {onNavigateToPair && (
                        <button
                          onClick={() => {
                            setShowBedMenu(false);
                            onNavigateToPair();
                          }}
                          className="px-2.5 py-1 rounded-md bg-primary text-on-primary text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            add_link
                          </span>
                          Pair New Bed
                        </button>
                      )}
                    </div>
                  ) : (
                    pairedBeds.map((bed) => (
                      <div
                        key={bed.id}
                        onClick={() => {
                          onSwitchBed(bed.id, bed.room, bed.patient);
                          setShowBedMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer ${
                          bedState.connectedBedId === bed.id
                            ? 'text-primary font-bold bg-primary/5'
                            : 'text-on-surface'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-semibold truncate flex items-center gap-1">
                            <span>{bed.name || bed.id}</span>
                            {bedState.connectedBedId === bed.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            )}
                          </div>
                          <div className="text-[10px] text-on-surface-variant truncate">
                            {bed.patient} • {bed.room} • {bed.link}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleRemoveItem(bed.id, e)}
                            className="p-1 rounded text-outline-variant hover:text-tertiary hover:bg-tertiary/10 transition-colors"
                            title={`Forget ${bed.name || bed.id}`}
                            aria-label={`Forget ${bed.name || bed.id}`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              delete_outline
                            </span>
                          </button>
                          {bedState.connectedBedId === bed.id && (
                            <span className="material-symbols-outlined text-primary text-[16px]">
                              check
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {onOpenPatientChart && (
                    <div className="mt-1 pt-1 border-t border-outline-variant/15 px-2">
                      <button
                        onClick={() => {
                          setShowBedMenu(false);
                          onOpenPatientChart('mass');
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/5 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          badge
                        </span>
                        <span>Patient Chart, Vitals &amp; Mass</span>
                      </button>
                    </div>
                  )}

                  {onNavigateToPair && (
                    <div className="pt-1 px-2">
                      <button
                        onClick={() => {
                          setShowBedMenu(false);
                          onNavigateToPair();
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-on-surface-variant hover:bg-surface-container flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          add_circle
                        </span>
                        <span>Pair New Bluetooth or Wi-Fi</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenPatientChart && (
              <button
                id="header-patient-btn"
                onClick={() => onOpenPatientChart('vitals')}
                className="h-[30px] sm:h-8 px-1.5 sm:px-2 rounded-lg bg-surface-container hover:bg-surface-variant text-on-surface flex items-center gap-1 text-[10px] sm:text-[11px] font-bold border border-outline-variant/30 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Open Patient Details, Vitals & Mass Chart"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-primary">
                  ecg_heart
                </span>
                <span className="hidden sm:inline max-w-[85px] truncate">
                  {bedState.patientName || 'Patient'}
                </span>
                <span className="sm:hidden">Chart</span>
              </button>
            )}

            {onOpenApkModal && (
              <button
                onClick={onOpenApkModal}
                className="h-[30px] sm:h-8 px-2 sm:px-2.5 rounded-lg bg-surface-container hover:bg-surface-variant text-primary flex items-center gap-1 text-[10px] sm:text-[11px] font-bold border border-primary/20 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Android App & APK Info"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[16px]">
                  android
                </span>
                <span>APK</span>
              </button>
            )}

            <button
              id="header-e-stop-btn"
              onClick={onTriggerEStop}
              className="h-[34px] sm:h-9 px-2.5 sm:px-3 rounded-full bg-tertiary hover:bg-tertiary-container text-on-tertiary flex items-center gap-1 sm:gap-1.5 shadow-[0_2px_8px_rgba(159,0,15,0.25)] active:scale-95 transition-transform cursor-pointer"
              title="Emergency Stop"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">
                pan_tool
              </span>
              <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider">
                E-STOP
              </span>
            </button>
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="flex items-center justify-between bg-surface-container-low/90 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 animate-pulse"></span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                bluetooth
              </span>
              <span className="text-[11px] font-semibold text-on-surface-variant">
                BLE 5.0
              </span>
            </div>
            <span className="text-outline-variant text-[10px]">•</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary-fixed"></span>
              <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                wifi
              </span>
              <span className="text-[11px] font-semibold text-on-surface-variant">
                Hospital_WLAN
              </span>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md shadow-xs transition-colors ${
              isLowBattery
                ? 'bg-amber-500/20 text-amber-700 ring-1 ring-amber-500/40'
                : 'bg-surface-container-lowest text-on-surface'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                isLowBattery ? 'text-amber-600 animate-pulse' : 'text-emerald-600'
              }`}
            >
              {isLowBattery
                ? 'battery_alert'
                : bedState.isCharging
                ? 'battery_charging_full'
                : 'battery_full'}
            </span>
            <span
              className={`text-[11px] font-bold ${
                isLowBattery ? 'text-amber-800' : 'text-on-surface'
              }`}
            >
              {bedState.batteryPercent}%
            </span>
            {bedState.isCharging && (
              <span className="material-symbols-outlined text-amber-500 text-[14px]">
                bolt
              </span>
            )}
          </div>
        </div>

        {/* Low Battery Warning Threshold Alert Banner */}
        {isLowBattery && (
          <div
            id="header-low-battery-alert"
            role="alert"
            className="bg-amber-500/15 border border-amber-500/40 text-on-surface rounded-xl px-3 py-2 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] animate-pulse">
                  battery_alert
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-extrabold text-amber-800 tracking-tight">
                    Low Battery Warning ({bedState.batteryPercent}%)
                  </span>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-500/25 text-amber-900 uppercase">
                    Threshold &lt; {bedState.lowBatteryThreshold ?? 20}%
                  </span>
                </div>
                <span className="text-[10px] text-on-surface-variant font-medium leading-tight">
                  Connect AC mains power to ensure uninterrupted motorized actuation.
                </span>
              </div>
            </div>

            {onToggleCharging && (
              <button
                id="btn-toggle-charging-header"
                onClick={onToggleCharging}
                className={`ml-2 shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                  bedState.isCharging
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95'
                }`}
                title="Toggle AC Power Input"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {bedState.isCharging ? 'power' : 'power_off'}
                </span>
                <span>{bedState.isCharging ? 'AC Active' : 'Connect AC'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
