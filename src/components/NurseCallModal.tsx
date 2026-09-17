import React from 'react';

interface NurseCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  bedId: string;
  room: string;
}

export const NurseCallModal: React.FC<NurseCallModalProps> = ({
  isOpen,
  onClose,
  bedId,
  room,
}) => {
  const [isTransmitting, setIsTransmitting] = React.useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest text-on-surface w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary-container animate-ping" />
            <span className="text-[11px] font-extrabold text-secondary uppercase tracking-widest">
              Emergency Nurse Intercom
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-container text-outline">
            Station 4A-ICU
          </span>
        </div>

        <div className="flex flex-col items-center justify-center py-3 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary-container/20 flex items-center justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-primary shadow-lg animate-pulse">
              <span className="material-symbols-outlined text-[32px]">
                notifications_active
              </span>
            </div>
          </div>
          <h3 className="font-extrabold text-[20px] text-on-surface">
            Nurse Station Alerted
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Dispatching caregiver to {room} ({bedId}). Audio channel open.
          </p>
        </div>

        {/* Audio Waveform visualization */}
        <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-1.5 h-8">
            {[40, 70, 95, 60, 85, 100, 75, 45, 80, 50, 65, 30].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-secondary-container rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: isTransmitting ? `${h}%` : '20%',
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant">
            {isTransmitting ? 'Transmitting Audio to Station 4A...' : 'Direct 2-way Voice Channel Ready'}
          </span>
        </div>

        <button
          onClick={() => setIsTransmitting(!isTransmitting)}
          className={`w-full h-12 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
            isTransmitting
              ? 'bg-secondary text-on-primary ring-2 ring-secondary/50'
              : 'bg-secondary-container text-on-primary shadow-md hover:bg-secondary'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isTransmitting ? 'mic' : 'mic_none'}
          </span>
          {isTransmitting ? 'Release To Listen' : 'Hold To Speak (PTT)'}
        </button>

        <button
          onClick={onClose}
          className="w-full h-10 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface font-semibold text-xs transition-colors cursor-pointer"
        >
          Dismiss Alert Channel
        </button>
      </div>
    </div>
  );
};
