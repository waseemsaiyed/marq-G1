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
  const [targetTiltAngle, setTargetTiltAngle] = useState<number>(-15);
  const [tiltDirection, setTiltDirection] = useState<'trend' | 'rev'>('trend');
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
              setBedState((s) => ({
                ...s,
                tiltAngle: targetTiltAngle,
                activePreset: targetTiltAngle !== 0 ? 'trendelenburg' : null,
              }));
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
  }, [t1Held, t2Held, targetTiltAngle, setBedState]);

  const updateHead = (val: number) => {
    setBedState((prev) => ({
      ...prev,
      headAngle: Math.max(0, Math.min(90, val)),
    }));
  };

  const updateTilt = (val: number) => {
    setBedState((prev) => ({
      ...prev,
      tiltAngle: Math.max(-90, Math.min(90, val)),
      activePreset: val !== 0 ? 'trendelenburg' : null,
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
      <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-xl shadow-xs border border-slate-200/60">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-primary text-[18px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            precision_manufacturing
          </span>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-slate-800">
              Calibrated Encoder Modules
            </span>
            <span className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-tight">
              continuous servo telemetry feed
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full shadow-2xs border border-slate-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[9.5px] text-slate-600 font-bold font-mono">
            {autoLockSeconds > 0
              ? `Auto-lock in ${autoLockSeconds}s`
              : 'BED AUTO-LOCKED'}
          </span>
        </div>
      </div>

      {/* Safety Lock Master Tile */}
      <div
        className={`relative overflow-hidden rounded-xl p-4 shadow-xs transition-all duration-300 border ${
          bedState.isSafetyLocked
            ? 'bg-amber-600/5 text-amber-900 border-amber-500/30'
            : 'bg-slate-50 text-slate-800 border-slate-200/50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              bedState.isSafetyLocked ? 'bg-amber-500/10 text-amber-700' : 'bg-slate-200 text-slate-600'
            }`}>
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.isSafetyLocked ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                  Actuator Lockout
                </span>
                <span
                  className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                    bedState.isSafetyLocked
                      ? 'bg-amber-500/25 text-amber-900'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {bedState.isSafetyLocked ? 'Engaged' : 'Operational'}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5">
                {bedState.isSafetyLocked
                  ? 'Hold button for 2s to release lockout'
                  : 'All articulation columns are live and editable'}
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
            className="min-h-[34px] px-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-[10px] uppercase shadow-2xs cursor-pointer select-none"
          >
            {bedState.isSafetyLocked ? 'Unlock (2s)' : 'Lock'}
          </button>
        </div>

        {/* Tactile progress rail */}
        <div className="w-full bg-slate-200/50 h-1 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-amber-600 transition-all duration-100 ease-linear"
            style={{ width: `${unlockProgress}%` }}
          />
        </div>
      </div>

      {/* Articulation Sliders List (Flat, unnested, neat dividers) */}
      <div className="flex flex-col gap-3.5">
        {/* Head Articulation Card */}
        <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                airline_seat_flat_angled
              </span>
              <div className="text-left">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Head Articulation
                </h2>
                <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
                  Fowler Position Range
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary font-mono tabular-nums leading-none">
                {bedState.headAngle}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-0.5">°</span>
            </div>
          </div>

          {/* Calibrated range slider */}
          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-8 flex items-center">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-150"
                  style={{ width: `${(bedState.headAngle / 90) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min="0"
                max="90"
                value={bedState.headAngle}
                onChange={(e) => updateHead(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider px-0.5">
              <span>0° Supine</span>
              <span>30° Semi-Fowler</span>
              <span>45° Fowler</span>
              <span>90° Incline</span>
            </div>
          </div>

          {/* Quick Head Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
            {[0, 15, 30, 45, 60, 90].map((ang) => (
              <button
                key={ang}
                onClick={() => updateHead(ang)}
                className={`px-2.5 py-1 rounded text-[10px] font-bold shrink-0 transition-all cursor-pointer ${
                  bedState.headAngle === ang
                    ? 'bg-primary text-white'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                }`}
              >
                {ang === 0 ? '0° Flat' : ang === 90 ? '90° Max' : `${ang}°`}
              </button>
            ))}
          </div>

          {/* Steppers */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => updateHead(bedState.headAngle - 1)}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                remove_circle_outline
              </span>
              <span>-1° Step</span>
            </button>
            <button
              onClick={() => updateHead(bedState.headAngle + 1)}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                add_circle_outline
              </span>
              <span>+1° Step</span>
            </button>
          </div>
        </div>

        {/* Knee & Foot Articulation Card */}
        <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                airline_seat_legroom_extra
              </span>
              <div className="text-left">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Knee break flexion
                </h2>
                <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
                  Circulatory vascular range
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary font-mono tabular-nums leading-none">
                {bedState.kneeAngle}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-0.5">°</span>
            </div>
          </div>

          {/* Calibrated range slider */}
          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-8 flex items-center">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider px-0.5">
              <span>0° Supine</span>
              <span>20° Circulation</span>
              <span>45° Max Flexion</span>
            </div>
          </div>

          {/* Steppers */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => updateKnee(bedState.kneeAngle - 1)}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                remove_circle_outline
              </span>
              <span>-1° Lower</span>
            </button>
            <button
              onClick={() => updateKnee(bedState.kneeAngle + 1)}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                add_circle_outline
              </span>
              <span>+1° Raise</span>
            </button>
          </div>
        </div>

        {/* Overall Height Elevation Card */}
        <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">
                height
              </span>
              <div className="text-left">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Bed Elevation Height
                </h2>
                <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
                  Synchronized lift columns
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-primary font-mono tabular-nums leading-none">
                {bedState.overallHeight}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-0.5">cm</span>
            </div>
          </div>

          {/* Calibrated range slider */}
          <div className="flex flex-col gap-1.5">
            <div className="relative w-full h-8 flex items-center">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
            <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider px-0.5">
              <span>38cm Transfer</span>
              <span>60cm Care Assist</span>
              <span>85cm Ergo Max</span>
            </div>
          </div>

          {/* Steppers */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => updateElev(bedState.overallHeight - 1)}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                arrow_downward
              </span>
              <span>Lower (1cm)</span>
            </button>
            <button
              onClick={() => updateElev(bedState.overallHeight + 1)}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                arrow_upward
              </span>
              <span>Elevate (1cm)</span>
            </button>
          </div>
        </div>

        {/* Trendelenburg Card */}
        <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                swap_vert
              </span>
              <div className="text-left">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Trendelenburg Tilt Plane
                </h2>
                <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">
                  Continuous tilt range
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-secondary font-mono tabular-nums leading-none">
                {Math.abs(bedState.tiltAngle)}
              </span>
              <span className="text-xs font-bold text-slate-400 ml-0.5">°</span>
            </div>
          </div>

          <div className="bg-slate-50 px-3 py-1.5 rounded-lg flex items-center justify-between border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Orientation</span>
            <span className="text-[10px] text-secondary font-bold font-mono">
              {bedState.tiltAngle === 0
                ? '0° LEVEL HORIZONTAL'
                : bedState.tiltAngle < 0
                ? `TRENDELENBURG (${Math.abs(bedState.tiltAngle)}° HEAD DOWN)`
                : `REV. TRENDELENBURG (${bedState.tiltAngle}° HEAD UP)`}
            </span>
          </div>

          {/* Direction selector */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg">
            <button
              onClick={() => {
                const mag = Math.abs(bedState.tiltAngle) || 15;
                updateTilt(-mag);
              }}
              className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                bedState.tiltAngle < 0
                  ? 'bg-secondary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Trendelenburg
            </button>
            <button
              onClick={() => updateTilt(0)}
              className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                bedState.tiltAngle === 0
                  ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Level 0°
            </button>
            <button
              onClick={() => {
                const mag = Math.abs(bedState.tiltAngle) || 15;
                updateTilt(mag);
              }}
              className={`py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                bedState.tiltAngle > 0
                  ? 'bg-primary text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Rev. Trend
            </button>
          </div>

          {/* Steppers */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
            <button
              onClick={() => {
                const current = bedState.tiltAngle;
                if (current < 0) {
                  updateTilt(Math.min(0, current + 1));
                } else if (current > 0) {
                  updateTilt(Math.max(0, current - 1));
                }
              }}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                remove_circle_outline
              </span>
              <span>-1° Tilt</span>
            </button>
            <button
              onClick={() => {
                const current = bedState.tiltAngle;
                if (current <= 0) {
                  updateTilt(Math.max(-90, current - 1));
                } else {
                  updateTilt(Math.min(90, current + 1));
                }
              }}
              className="h-10 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wider cursor-pointer border border-slate-200/50"
            >
              <span className="material-symbols-outlined text-[15px]">
                add_circle_outline
              </span>
              <span>+1° Tilt</span>
            </button>
            <button
              onClick={() => {
                setTargetTiltAngle(bedState.tiltAngle || -15);
                setTiltDirection(bedState.tiltAngle >= 0 ? 'rev' : 'trend');
                setShowTrendModal(true);
              }}
              className="h-10 rounded-lg bg-secondary-container hover:bg-secondary text-white flex items-center justify-center gap-1 text-[11px] font-extrabold uppercase cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">
                security
              </span>
              <span>Dual Auth</span>
            </button>
          </div>
        </div>
      </div>

      {/* Actuator Diagnostics Grid - Highly calibrated instruments look */}
      <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3.5 border border-slate-200/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Real-Time Diagnostics
          </span>
          <div className="flex items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[13px] animate-spin">
              sync
            </span>
            <span className="text-[10px] font-bold font-mono">ESP32 100Hz</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/30">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Head M1</span>
            <span className="text-sm font-bold text-primary font-mono mt-0.5 block">34.2 °C</span>
            <span className="text-[8px] font-extrabold text-emerald-600 block uppercase mt-0.5">Nominal</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/30">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Foot M2</span>
            <span className="text-sm font-bold text-primary font-mono mt-0.5 block">31.0 °C</span>
            <span className="text-[8px] font-extrabold text-emerald-600 block uppercase mt-0.5">Nominal</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/30">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Dual Columns</span>
            <span className="text-sm font-bold text-primary font-mono mt-0.5 block">Synced</span>
            <span className="text-[8px] font-extrabold text-emerald-600 block uppercase mt-0.5">Nominal</span>
          </div>
        </div>
      </div>

      {/* Persistent Emergency Stop Floating Pill */}
      <div className="w-full pt-1">
        <button
          onClick={onTriggerEStop}
          className="w-full h-[54px] rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <span className="material-symbols-outlined text-[20px]">
            emergency_home
          </span>
          <span className="text-xs font-extrabold uppercase tracking-wider">
            Emergency Actuator Stop
          </span>
        </button>
      </div>

      {/* Safety Confirmation Overlay Modal */}
      {showTrendModal && (
        <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white text-slate-800 w-full max-w-sm rounded-xl p-5 shadow-xl flex flex-col gap-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">
                  warning
                </span>
              </div>
              <div className="flex flex-col text-left">
                <h3 className="text-sm font-bold text-red-600 uppercase tracking-wider">
                  Cranial Precaution Warning
                </h3>
                <span className="text-[9.5px] text-slate-400 font-semibold uppercase font-mono">
                  ISO Vascular Alignment Check
                </span>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed text-left">
              Deep Trendelenburg tilts can alter cerebral perfusion levels and venous return rates. Double authorization triggers are required to commit motorized positioning.
            </p>

            {/* Target configuration */}
            <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 uppercase tracking-wider">Target Tilt Angle:</span>
                <span className="font-extrabold text-secondary font-mono">
                  {Math.abs(targetTiltAngle)}° {tiltDirection === 'trend' ? 'Trendelenburg' : 'Rev. Trend'}
                </span>
              </div>

              {/* Slider inside modal */}
              <div className="relative w-full h-8 flex items-center">
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${(Math.abs(targetTiltAngle) / 90) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={Math.abs(targetTiltAngle)}
                  onChange={(e) => {
                    const mag = parseInt(e.target.value, 10);
                    const sign = tiltDirection === 'trend' ? -1 : 1;
                    setTargetTiltAngle(mag * sign);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Double safety authorization buttons */}
            <div className="bg-slate-50 p-3 rounded-lg flex flex-col gap-2">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest text-center">
                Dual caregiver tactile auth
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onMouseDown={() => setT1Held(true)}
                  onMouseUp={() => setT1Held(false)}
                  onTouchStart={() => setT1Held(true)}
                  onTouchEnd={() => setT1Held(false)}
                  className={`h-11 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-1 cursor-pointer select-none border ${
                    t1Held
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">touch_app</span>
                  <span>Trigger 1</span>
                </button>
                <button
                  onMouseDown={() => setT2Held(true)}
                  onMouseUp={() => setT2Held(false)}
                  onTouchStart={() => setT2Held(true)}
                  onTouchEnd={() => setT2Held(false)}
                  className={`h-11 rounded-lg font-bold text-xs uppercase transition-all flex items-center justify-center gap-1 cursor-pointer select-none border ${
                    t2Held
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">touch_app</span>
                  <span>Trigger 2</span>
                </button>
              </div>

              {/* Progress track */}
              <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-red-600 transition-all duration-75"
                  style={{ width: `${dualProgress}%` }}
                />
              </div>
              <span className="text-[9.5px] font-bold text-center text-slate-400 uppercase tracking-wider block mt-0.5">
                {dualProgress >= 100
                  ? 'Commit approved'
                  : 'Hold both triggers for 3 seconds'}
              </span>
            </div>

            <button
              onClick={() => setShowTrendModal(false)}
              className="h-10 w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase cursor-pointer"
            >
              Abort Action
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
