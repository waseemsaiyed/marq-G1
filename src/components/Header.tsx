import React, { useState, useEffect } from 'react';
import { BedState, PairedDeviceItem, PatientChartTabKey } from '../types';
import { MarqLogo } from './MarqLogo';
import { getPairedDevices, removePairedDevice } from '../services/pairedDevicesStorage';
import { esp32Bridge, ESP32ConnectionStatus } from '../services/esp32HardwareBridge';

interface HeaderProps {
  bedState: BedState;
  onTriggerEStop: () => void;
  onSwitchBed: (bedId: string, room: string, patient: string) => void;
  onOpenApkModal?: () => void;
  onToggleCharging?: () => void;
  onNavigateToPair?: () => void;
  onUnpairBed?: (bedId: string) => void;
  onOpenPatientChart?: (tab?: PatientChartTabKey) => void;
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
  const [bridgeStatus, setBridgeStatus] = useState<ESP32ConnectionStatus>(() => esp32Bridge.getStatus());

  useEffect(() => {
    const handleStorageChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setPairedBeds(e.detail);
      } else {
        setPairedBeds(getPairedDevices());
      }
    };
    window.addEventListener('marq_paired_devices_changed', handleStorageChange);

    const unsub = esp32Bridge.subscribe((s) => {
      setBridgeStatus(s);
    });

    return () => {
      window.removeEventListener('marq_paired_devices_changed', handleStorageChange);
      unsub();
    };
  }, []);

  const isLowBattery = bedState.batteryPercent < (bedState.lowBatteryThreshold ?? 20);

  const handleRemoveItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUnpairBed) {
      onUnpairBed(id);
    } else {
      removePairedDevice(id);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-[100] pt-safe bg-white border-b border-slate-200/60 shadow-xs transition-all duration-200">
      <div className="px-4 sm:px-5 flex flex-col gap-2 py-2.5 max-w-lg mx-auto">
        {/* Top Action Row (Strict Top Bar Contract styling) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Wordmark brand zone */}
            <div className="flex items-center" title="MARQ W-1 Smart Bed Console">
              <MarqLogo height={20} className="text-slate-900 hover:opacity-85 transition-opacity" />
            </div>
            
            <span className="text-slate-300 text-sm font-light">·</span>
            
            {/* Elegant Paired Selector Dropdown */}
            <div className="relative">
              <button
                id="bed-selector-btn"
                onClick={() => setShowBedMenu(!showBedMenu)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 transition-colors min-h-[30px] cursor-pointer"
              >
                {bedState.wifiConnected && (
                  <span className="material-symbols-outlined text-[13px] text-primary" title="Wi-Fi Active">
                    wifi
                  </span>
                )}
                {bedState.bleSynced && (
                  <span className="material-symbols-outlined text-[13px] text-primary" title="Bluetooth Active">
                    bluetooth_connected
                  </span>
                )}
                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider font-mono">
                  {bedState.connectedBedId || 'No Bed'}
                </span>
                <span className="material-symbols-outlined text-slate-500 text-[14px]">
                  expand_more
                </span>
              </button>

              {showBedMenu && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center justify-between px-3 py-1 text-slate-400">
                    <span className="text-[9px] font-bold uppercase tracking-wider">
                      Paired Devices ({pairedBeds.length})
                    </span>
                    {onNavigateToPair && (
                      <button
                        onClick={() => {
                          setShowBedMenu(false);
                          onNavigateToPair();
                        }}
                        className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                      >
                        Manage
                      </button>
                    )}
                  </div>

                  {pairedBeds.length === 0 ? (
                    <div className="px-3 py-4 text-center flex flex-col items-center gap-2">
                      <span className="text-xs text-slate-500">
                        No paired bed controllers
                      </span>
                      {onNavigateToPair && (
                        <button
                          onClick={() => {
                            setShowBedMenu(false);
                            onNavigateToPair();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            add_link
                          </span>
                          Pair Bed
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
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          bedState.connectedBedId === bed.id
                            ? 'text-primary font-bold bg-slate-50/80'
                            : 'text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="font-semibold truncate flex items-center gap-1">
                            <span className="font-mono">{bed.name || bed.id}</span>
                            {bedState.connectedBedId === bed.id && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {bed.patient} · {bed.room}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleRemoveItem(bed.id, e)}
                            className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title={`Forget ${bed.name || bed.id}`}
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              delete_outline
                            </span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {onOpenPatientChart && (
                    <div className="mt-1 pt-1 border-t border-slate-100 px-2">
                      <button
                        onClick={() => {
                          setShowBedMenu(false);
                          onOpenPatientChart('mass');
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] font-bold text-primary hover:bg-primary/5 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          badge
                        </span>
                        <span>View Patient Chart</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPatientChart && (
              <button
                id="header-patient-btn"
                onClick={() => onOpenPatientChart('mass')}
                className="h-[32px] px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 text-[11px] font-bold border border-slate-200/60 transition-all cursor-pointer"
                title="Edit Patient Chart"
              >
                <span className="material-symbols-outlined text-[15px] text-primary">
                  clinical_notes
                </span>
                <span className="max-w-[100px] truncate">
                  {bedState.patientName || 'Unassigned'}
                </span>
              </button>
            )}

            <button
              id="header-e-stop-btn"
              onClick={onTriggerEStop}
              className="h-[32px] px-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              title="Emergency Stop"
            >
              <span className="material-symbols-outlined text-[15px] fill-current">
                pan_tool
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                E-STOP
              </span>
            </button>
          </div>
        </div>

        {/* Telemetry Status Bar - Highly calibrated unboxed data labels */}
        <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/50">
          <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500 font-mono">
            {bridgeStatus.hybridActive && (
              <div className="flex items-center gap-1 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>HYBRID DUAL-LINK</span>
              </div>
            )}

            {/* Bluetooth Channel */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${bridgeStatus.bluetoothConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className="uppercase tracking-tight">
                {bridgeStatus.bluetoothType === 'classic' ? 'BT Classic SPP' : 'BLE Link'}
              </span>
            </div>

            <span className="text-slate-300">·</span>

            {/* Wi-Fi Channel */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${bridgeStatus.wifiConnected ? 'bg-primary' : 'bg-slate-300'}`} />
              <span className="uppercase tracking-tight">
                {bridgeStatus.wifiConnected ? `${bridgeStatus.ip}` : 'Wi-Fi Stdby'}
              </span>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md transition-colors ${
              isLowBattery
                ? 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                : 'bg-white text-slate-800 border border-slate-100'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[15px] ${
                isLowBattery ? 'text-amber-600 animate-pulse' : 'text-emerald-600'
              }`}
            >
              {isLowBattery
                ? 'battery_alert'
                : bedState.isCharging
                ? 'battery_charging_full'
                : 'battery_full'}
            </span>
            <span className="text-[10px] font-bold font-mono tabular-nums leading-none">
              {bedState.batteryPercent}%
            </span>
            {bedState.isCharging && (
              <span className="material-symbols-outlined text-amber-500 text-[12px] leading-none">
                bolt
              </span>
            )}
          </div>
        </div>

        {/* Low Battery Warning Banner */}
        {isLowBattery && (
          <div
            id="header-low-battery-alert"
            role="alert"
            className="bg-amber-500/5 border border-amber-500/30 text-slate-800 rounded-xl px-3 py-2 flex items-center justify-between shadow-xs animate-in slide-in-from-top-1"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 animate-pulse">
                battery_alert
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[11px] font-bold text-amber-800 leading-tight">
                  AC Mains Disconnected · Low Charge Warning
                </span>
                <span className="text-[9px] text-slate-500 leading-none mt-0.5">
                  Remaining battery capacity below {bedState.lowBatteryThreshold}% threshold.
                </span>
              </div>
            </div>

            {onToggleCharging && (
              <button
                id="btn-toggle-charging-header"
                onClick={onToggleCharging}
                className="shrink-0 px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[9.5px] font-bold tracking-wide uppercase transition-all shadow-2xs"
              >
                Simulate AC Link
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
