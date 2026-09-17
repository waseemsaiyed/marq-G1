import React, { useState } from 'react';
import { BedState } from '../types';

interface HeaderProps {
  bedState: BedState;
  onTriggerEStop: () => void;
  onSwitchBed: (bedId: string, room: string, patient: string) => void;
  onOpenApkModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  bedState,
  onTriggerEStop,
  onSwitchBed,
  onOpenApkModal,
}) => {
  const [showBedMenu, setShowBedMenu] = useState(false);

  const availableBeds = [
    { id: 'ICU Bed 03', room: 'Room 412', patient: 'J. Anderson' },
    { id: 'Post-Op 12', room: 'Room 205', patient: 'M. Vance' },
    { id: 'Ortho 05', room: 'Room 108', patient: 'R. Sterling' },
  ];

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-28 px-4 sm:px-5 flex flex-col justify-between py-2 max-w-lg mx-auto">
        {/* Top Action Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[24px]">
                hotel
              </span>
              <span className="font-extrabold text-[18px] text-primary tracking-tight">
                MarQ
              </span>
            </div>
            <span className="text-outline-variant text-[14px]">/</span>
            <div className="relative">
              <button
                id="bed-selector-btn"
                onClick={() => setShowBedMenu(!showBedMenu)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-variant transition-colors min-h-[32px] cursor-pointer"
              >
                <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">
                  {bedState.connectedBedId}
                </span>
                <span className="material-symbols-outlined text-on-surface-variant text-[16px]">
                  expand_more
                </span>
              </button>

              {showBedMenu && (
                <div className="absolute left-0 mt-1.5 w-52 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/30 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-[10px] font-bold text-outline uppercase tracking-wider">
                    Select Bed Controller
                  </div>
                  {availableBeds.map((bed) => (
                    <button
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
                      <div>
                        <div className="font-semibold">{bed.id}</div>
                        <div className="text-[10px] text-on-surface-variant">
                          {bed.patient} • {bed.room}
                        </div>
                      </div>
                      {bedState.connectedBedId === bed.id && (
                        <span className="material-symbols-outlined text-primary text-[16px]">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenApkModal && (
              <button
                onClick={onOpenApkModal}
                className="h-8 px-2.5 rounded-lg bg-surface-container hover:bg-surface-variant text-primary flex items-center gap-1 text-[11px] font-bold border border-primary/20 shadow-2xs active:scale-95 transition-all cursor-pointer"
                title="Android App & APK Info"
              >
                <span className="material-symbols-outlined text-[16px]">
                  android
                </span>
                <span>APK</span>
              </button>
            )}

            <button
              id="header-e-stop-btn"
              onClick={onTriggerEStop}
              className="h-9 px-3 rounded-full bg-tertiary hover:bg-tertiary-container text-on-tertiary flex items-center gap-1.5 shadow-[0_2px_8px_rgba(159,0,15,0.25)] active:scale-95 transition-transform min-w-[44px] cursor-pointer"
              title="Emergency Stop"
            >
              <span className="material-symbols-outlined text-[18px]">
                pan_tool
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider">
                E-STOP
              </span>
            </button>
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="flex items-center justify-between bg-surface-container-low/90 px-3 py-1.5 rounded-xl border border-outline-variant/20">
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

          <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2 py-0.5 rounded-md shadow-xs">
            <span className="material-symbols-outlined text-emerald-600 text-[16px]">
              battery_charging_full
            </span>
            <span className="text-[11px] font-bold text-on-surface">
              {bedState.batteryPercent}%
            </span>
            <span className="material-symbols-outlined text-amber-500 text-[14px]">
              bolt
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
