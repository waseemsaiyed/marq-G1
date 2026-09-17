import React, { useState, useEffect, useRef } from 'react';
import { BedState } from '../types';

interface AdvancedScreenProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onTriggerNurseCall: () => void;
}

export const AdvancedScreen: React.FC<AdvancedScreenProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
}) => {
  // Auto-lock countdown
  const [autoLockSeconds, setAutoLockSeconds] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoLockSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock hold mechanics
  const [unlockProgress, setUnlockProgress] = useState(0);
  const unlockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startUnlockHold = () => {
    let prog = 0;
    if (unlockIntervalRef.current) clearInterval(unlockIntervalRef.current);
    unlockIntervalRef.current = setInterval(() => {
      prog += 5;
      setUnlockProgress(prog);
      if (prog >= 100) {
        clearInterval(unlockIntervalRef.current!);
        setBedState((prev) => ({
          ...prev,
          isSafetyLocked: !prev.isSafetyLocked,
        }));
        setUnlockProgress(0);
      }
    }, 50);
  };

  const cancelUnlockHold = () => {
    if (unlockIntervalRef.current) {
      clearInterval(unlockIntervalRef.current);
      unlockIntervalRef.current = null;
    }
    setUnlockProgress(0);
  };

  // Trendelenburg modal & dual trigger safety
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [t1Held, setT1Held] = useState(false);
  const [t2Held, setT2Held] = useState(false);
  const [dualProgress, setDualProgress] = useState(0);
  const dualIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (t1Held && t2Held) {
      dualIntervalRef.current = setInterval(() => {
        setDualProgress((prev) => {
          if (prev >= 100) {
            clearInterval(dualIntervalRef.current!);
            setTimeout(() => {
              setShowTrendModal(false);
              setBedState((s) => ({ ...s, tiltAngle: -12, activePreset: 'trendelenburg' }));
            }, 600);
            return 100;
          }
          return prev + 6;
        });
      }, 100);
    } else {
      if (dualIntervalRef.current) clearInterval(dualIntervalRef.current);
      setDualProgress(0);
    }
    return () => {
      if (dualIntervalRef.current) clearInterval(dualIntervalRef.current);
    };
  }, [t1Held, t2Held, setBedState]);

  const updateHead = (val: number) => {
    setBedState((prev) => ({
      ...prev,
      headAngle: Math.max(0, Math.min(70, val)),
    }));
  };

  const updateKnee = (val: number) => {
    setBedState((prev) => ({
      ...prev,
      kneeAngle: Math.max(0, Math.min(45, val)),
    }));
  };

  const updateElev = (val: number) => {
    setBedState((prev) => ({
      ...prev,
      overallHeight: Math.max(38, Math.min(85, val)),
    }));
  };

  return (
    <div className="flex flex-col w-full gap-4 max-w-lg mx-auto pb-6">
      {/* Precision HUD Banner */}
      <div className="flex items-center justify-between bg-surface-container-high px-4 py-2.5 rounded-xl shadow-xs border border-outline-variant/15">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            precision_manufacturing
          </span>
          <div className="flex flex-col">
            <span className="text-[14px] font-bold text-on-surface">
              Precision Actuators
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              Continuous encoder feedback active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
          <span className="text-[11px] text-secondary font-extrabold">
            {autoLockSeconds > 0
              ? `Auto-lock in 00:0${autoLockSeconds}s`
              : 'Bed Auto-Locked'}
          </span>
        </div>
      </div>

      {/* Safety Lock Master Tile */}
      <div
        className={`relative overflow-hidden rounded-xl p-4 shadow-md transition-all duration-300 border ${
          bedState.isSafetyLocked
            ? 'bg-secondary-container text-on-secondary border-secondary'
            : 'bg-surface-container-highest text-on-surface border-outline-variant/30'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[28px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.isSafetyLocked ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold uppercase tracking-wider">
                  Safety Lockout
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                    bedState.isSafetyLocked
                      ? 'bg-white text-secondary-container'
                      : 'bg-primary text-on-primary'
                  }`}
                >
                  {bedState.isSafetyLocked ? 'ENGAGED' : 'DISENGAGED'}
                </span>
              </div>
              <span className="text-xs opacity-90 mt-0.5">
                {bedState.isSafetyLocked
                  ? 'Press & hold 2s to release bed controls'
                  : 'All physical and digital motors operational'}
              </span>
            </div>
          </div>
          <button
            onMouseDown={startUnlockHold}
            onMouseUp={cancelUnlockHold}
            onMouseLeave={cancelUnlockHold}
            onTouchStart={(e) => {
              e.preventDefault();
              startUnlockHold();
            }}
            onTouchEnd={cancelUnlockHold}
            className="min-w-[64px] min-h-[48px] px-3.5 py-2 rounded-xl bg-white text-secondary font-extrabold text-xs uppercase shadow-sm active:scale-95 transition-transform flex items-center justify-center select-none cursor-pointer"
          >
            {bedState.isSafetyLocked ? 'HOLD 2S' : 'ENGAGE'}
          </button>
        </div>

        <div className="w-full bg-black/20 h-1.5 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-100 ease-linear"
            style={{ width: `${unlockProgress}%` }}
          />
        </div>
      </div>

      {/* Articulation Sliders Bento */}
      <div className="flex flex-col gap-3">
        {/* Head Articulation Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  airline_seat_flat_angled
                </span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-on-surface">
                  Head Articulation
                </h2>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  Fowler positioning (Max 70°)
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[36px] font-extrabold text-primary tabular-nums">
                {bedState.headAngle}
              </span>
              <span className="text-[18px] font-bold text-primary">°</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-8 flex items-center">
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${(bedState.headAngle / 70) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="70"
                value={bedState.headAngle}
                onChange={(e) => updateHead(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant px-1 font-semibold">
              <span>0° (Supine)</span>
              <span>30° (Semi-Fowler)</span>
              <span>70° (Max High)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => updateHead(bedState.headAngle - 1)}
              className="min-h-[58px] rounded-xl bg-surface-container-low hover:bg-surface-container active:bg-surface-dim text-on-surface flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer border border-outline-variant/15"
            >
              <span className="material-symbols-outlined text-[24px]">
                remove_circle_outline
              </span>
              <span className="text-[12px] font-bold uppercase">- 1° Precise</span>
            </button>
            <button
              onClick={() => updateHead(bedState.headAngle + 1)}
              className="min-h-[58px] rounded-xl bg-primary-container text-on-primary hover:bg-primary active:bg-primary-fixed-dim flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">
                add_circle_outline
              </span>
              <span className="text-[12px] font-bold uppercase">+ 1° Precise</span>
            </button>
          </div>
        </div>

        {/* Knee & Foot Articulation Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  airline_seat_legroom_extra
                </span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-on-surface">
                  Knee &amp; Foot
                </h2>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  Vascular flex (Max 45°)
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[36px] font-extrabold text-primary tabular-nums">
                {bedState.kneeAngle}
              </span>
              <span className="text-[18px] font-bold text-primary">°</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-8 flex items-center">
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${(bedState.kneeAngle / 45) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="45"
                value={bedState.kneeAngle}
                onChange={(e) => updateKnee(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant px-1 font-semibold">
              <span>0° (Flat)</span>
              <span>20° (Circulation)</span>
              <span>45° (Max Flex)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => updateKnee(bedState.kneeAngle - 1)}
              className="min-h-[58px] rounded-xl bg-surface-container-low hover:bg-surface-container active:bg-surface-dim text-on-surface flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer border border-outline-variant/15"
            >
              <span className="material-symbols-outlined text-[24px]">
                remove_circle_outline
              </span>
              <span className="text-[12px] font-bold uppercase">- 1° Lower</span>
            </button>
            <button
              onClick={() => updateKnee(bedState.kneeAngle + 1)}
              className="min-h-[58px] rounded-xl bg-primary-container text-on-primary hover:bg-primary active:bg-primary-fixed-dim flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">
                add_circle_outline
              </span>
              <span className="text-[12px] font-bold uppercase">+ 1° Raise</span>
            </button>
          </div>
        </div>

        {/* Overall Height Elevation */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  height
                </span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-on-surface">
                  Bed Elevation
                </h2>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  Dual synchronized columns
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[36px] font-extrabold text-primary tabular-nums">
                {bedState.overallHeight}
              </span>
              <span className="text-[18px] font-bold text-primary">cm</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-8 flex items-center">
              <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{
                    width: `${((bedState.overallHeight - 38) / (85 - 38)) * 100}%`,
                  }}
                />
              </div>
              <input
                type="range"
                min="38"
                max="85"
                value={bedState.overallHeight}
                onChange={(e) => updateElev(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[11px] text-on-surface-variant px-1 font-semibold">
              <span>38 cm (Transfer)</span>
              <span>60 cm (Care)</span>
              <span>85 cm (Ergo High)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => updateElev(bedState.overallHeight - 1)}
              className="min-h-[58px] rounded-xl bg-surface-container-low hover:bg-surface-container active:bg-surface-dim text-on-surface flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer border border-outline-variant/15"
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_downward
              </span>
              <span className="text-[12px] font-bold uppercase">Lower Column</span>
            </button>
            <button
              onClick={() => updateElev(bedState.overallHeight + 1)}
              className="min-h-[58px] rounded-xl bg-primary-container text-on-primary hover:bg-primary active:bg-primary-fixed-dim flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">
                arrow_upward
              </span>
              <span className="text-[12px] font-bold uppercase">Raise Column</span>
            </button>
          </div>
        </div>

        {/* Trendelenburg Card */}
        <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3 border border-outline-variant/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[22px]">
                  swap_vert
                </span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-on-surface">
                  Axis Tilt (Trendelenburg)
                </h2>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  Full longitudinal tilt plane
                </span>
              </div>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[36px] font-extrabold text-secondary tabular-nums">
                {bedState.tiltAngle}
              </span>
              <span className="text-[18px] font-bold text-secondary">°</span>
            </div>
          </div>

          <div className="bg-surface-container-low px-3 py-2 rounded-lg flex items-center justify-between">
            <span className="text-[11px] text-on-surface-variant font-semibold">
              State:
            </span>
            <span className="text-[11px] text-secondary font-extrabold uppercase">
              Trendelenburg Active ({bedState.tiltAngle}°)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={() => setShowTrendModal(true)}
              className="min-h-[58px] rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface flex flex-col items-center justify-center gap-0.5 shadow-xs active:scale-95 transition-all cursor-pointer border border-outline-variant/15"
            >
              <div className="flex items-center gap-1 text-secondary">
                <span className="material-symbols-outlined text-[20px]">
                  south
                </span>
                <span className="text-[12px] font-extrabold uppercase">
                  -12° Tilt
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-semibold">
                Trendelenburg
              </span>
            </button>
            <button
              onClick={() => setShowTrendModal(true)}
              className="min-h-[58px] rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface flex flex-col items-center justify-center gap-0.5 shadow-xs active:scale-95 transition-all cursor-pointer border border-outline-variant/15"
            >
              <div className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[20px]">
                  north
                </span>
                <span className="text-[12px] font-extrabold uppercase">
                  +12° Tilt
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant font-semibold">
                Rev Trendelenburg
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Actuator Diagnostics Grid */}
      <div className="bg-surface-container-high rounded-xl p-4 shadow-sm flex flex-col gap-2.5 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-extrabold uppercase text-on-surface-variant">
            Actuator Diagnostics
          </span>
          <div className="flex items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[16px] animate-spin">
              sync
            </span>
            <span className="text-[11px] font-bold">ESP32 100Hz</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-container-lowest p-2.5 rounded-lg flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] font-bold text-on-surface-variant truncate w-full">
              Head M1
            </span>
            <span className="text-[14px] font-extrabold text-primary mt-1">
              34°C
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              Nominal
            </span>
          </div>
          <div className="bg-surface-container-lowest p-2.5 rounded-lg flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] font-bold text-on-surface-variant truncate w-full">
              Foot M2
            </span>
            <span className="text-[14px] font-extrabold text-primary mt-1">
              31°C
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              Nominal
            </span>
          </div>
          <div className="bg-surface-container-lowest p-2.5 rounded-lg flex flex-col items-center text-center shadow-xs">
            <span className="text-[10px] font-bold text-on-surface-variant truncate w-full">
              Lift Dual
            </span>
            <span className="text-[14px] font-extrabold text-primary mt-1">
              0.0 mm
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">
              Synced
            </span>
          </div>
        </div>
      </div>

      {/* Persistent Emergency Stop Floating Pill */}
      <div className="w-full pt-1">
        <button
          onClick={onTriggerEStop}
          className="w-full min-h-[64px] rounded-xl bg-tertiary hover:bg-tertiary-container active:scale-98 text-on-tertiary flex items-center justify-center gap-3 shadow-lg transition-transform cursor-pointer"
        >
          <span
            className="material-symbols-outlined text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            emergency_home
          </span>
          <span className="text-[14px] sm:text-[15px] font-extrabold uppercase tracking-wider">
            Emergency Actuator Stop
          </span>
        </button>
      </div>

      {/* Safety Confirmation Overlay Modal for Trendelenburg Action */}
      {showTrendModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest text-on-surface w-full max-w-sm rounded-xl p-5 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0 text-tertiary">
                <span
                  className="material-symbols-outlined text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  warning
                </span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-[18px] font-bold text-tertiary">
                  Clinical Warning
                </h3>
                <span className="text-xs text-on-surface-variant">
                  Vascular &amp; Cranial Precaution
                </span>
              </div>
            </div>
            <p className="text-xs text-on-surface leading-relaxed">
              Trendelenburg tilt lowers cerebral perfusion and increases intra-thoracic pressure. Dual clinical safety trigger required to confirm position movement.
            </p>
            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase text-on-surface-variant text-center">
                Safety Authorization
              </span>
              <div className="flex gap-2">
                <button
                  onMouseDown={() => setT1Held(true)}
                  onMouseUp={() => setT1Held(false)}
                  onTouchStart={() => setT1Held(true)}
                  onTouchEnd={() => setT1Held(false)}
                  className={`flex-1 min-h-[52px] rounded-lg font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1 select-none cursor-pointer ${
                    t1Held
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    touch_app
                  </span>{' '}
                  L-Trigger
                </button>
                <button
                  onMouseDown={() => setT2Held(true)}
                  onMouseUp={() => setT2Held(false)}
                  onTouchStart={() => setT2Held(true)}
                  onTouchEnd={() => setT2Held(false)}
                  className={`flex-1 min-h-[52px] rounded-lg font-bold text-xs uppercase transition-colors flex items-center justify-center gap-1 select-none cursor-pointer ${
                    t2Held
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    touch_app
                  </span>{' '}
                  R-Trigger
                </button>
              </div>
              <div className="w-full bg-surface-dim h-2 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-tertiary transition-all duration-75"
                  style={{ width: `${dualProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-center text-on-surface-variant">
                {dualProgress >= 100
                  ? 'Movement Approved & Initiated'
                  : dualProgress > 0
                  ? `Authorizing movement (${Math.round(dualProgress)}%)...`
                  : 'Hold both triggers for 3 seconds'}
              </span>
            </div>
            <button
              onClick={() => setShowTrendModal(false)}
              className="min-h-[44px] w-full rounded-xl bg-surface-container-high hover:bg-surface-variant text-on-surface font-bold text-xs uppercase cursor-pointer"
            >
              Abort Movement
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
