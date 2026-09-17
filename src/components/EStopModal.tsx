import React from 'react';

interface EStopModalProps {
  isOpen: boolean;
  onReset: () => void;
  bedId: string;
}

export const EStopModal: React.FC<EStopModalProps> = ({
  isOpen,
  onReset,
  bedId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest text-on-surface w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-4 border-2 border-tertiary">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-tertiary text-on-tertiary flex items-center justify-center shrink-0 shadow-lg">
            <span className="material-symbols-outlined text-[30px]">
              pan_tool
            </span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-[18px] font-extrabold text-tertiary leading-tight">
              EMERGENCY STOP
            </h3>
            <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
              Fail-Safe Cut-Off Active
            </span>
          </div>
        </div>

        <div className="bg-tertiary/10 p-3.5 rounded-xl border border-tertiary/20 text-xs text-on-surface flex flex-col gap-1.5">
          <div className="font-bold text-tertiary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">
              power_off
            </span>
            All Actuator Relays De-energized
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            Instant interrupt broadcast via BLE 5.0 and Wi-Fi to {bedId} ESP32 core controller. All physical motor movement has halted.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onReset}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-xs uppercase tracking-wider shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">
              restart_alt
            </span>
            Resume &amp; Re-arm Relays
          </button>
        </div>
      </div>
    </div>
  );
};
