import React, { useRef, useEffect } from 'react';
import { BedState } from '../types';
import { BedVisualizer } from '../components/BedVisualizer';

interface HomeDashboardProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onTriggerNurseCall: () => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
  onTriggerNurseCall,
}) => {
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopHold();
    };
  }, []);

  const startHoldAction = (actionFn: () => void) => {
    actionFn();
    stopHold();
    holdIntervalRef.current = setInterval(actionFn, 120);
  };

  const adjustHead = (delta: number) => {
    setBedState((prev) => {
      const next = Math.max(0, Math.min(70, prev.headAngle + delta));
      return { ...prev, headAngle: next, activePreset: null };
    });
  };

  const adjustKnee = (delta: number) => {
    setBedState((prev) => {
      const next = Math.max(0, Math.min(35, prev.kneeAngle + delta));
      return { ...prev, kneeAngle: next, activePreset: null };
    });
  };

  const adjustHeight = (delta: number) => {
    setBedState((prev) => {
      const next = Math.max(40, Math.min(85, prev.overallHeight + delta));
      return { ...prev, overallHeight: next, activePreset: null };
    });
  };

  const setZeroG = () => {
    setBedState((prev) => ({
      ...prev,
      headAngle: 30,
      kneeAngle: 20,
      activePreset: 'zerog',
    }));
  };

  const setFlat = () => {
    setBedState((prev) => ({
      ...prev,
      headAngle: 0,
      kneeAngle: 0,
      activePreset: 'flat',
    }));
  };

  const setCardiacChair = () => {
    setBedState((prev) => ({
      ...prev,
      headAngle: 55,
      kneeAngle: 30,
      overallHeight: 52,
      activePreset: 'cardiac',
    }));
  };

  const setTrendelenburg = () => {
    setBedState((prev) => ({
      ...prev,
      headAngle: 0,
      kneeAngle: 0,
      tiltAngle: -12,
      activePreset: 'trendelenburg',
    }));
  };

  const setM1Sleep = () => {
    setBedState((prev) => ({
      ...prev,
      headAngle: 15,
      kneeAngle: 10,
      overallHeight: 48,
      activePreset: 'sleep',
    }));
  };

  const setM2Exam = () => {
    setBedState((prev) => ({
      ...prev,
      headAngle: 0,
      kneeAngle: 0,
      overallHeight: 78,
      activePreset: 'exam',
    }));
  };

  const [voiceSpoken, setVoiceSpoken] = React.useState(false);
  const handleVoiceDemo = () => {
    setVoiceSpoken(true);
    setBedState((prev) => ({
      ...prev,
      headAngle: 30,
    }));
    setTimeout(() => setVoiceSpoken(false), 3000);
  };

  return (
    <div className="flex flex-col w-full gap-4 max-w-lg mx-auto pb-6">
      {/* Top Patient & Bed Live Status Card */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-md flex flex-col gap-3 relative overflow-hidden border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">
                airline_seat_flat
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[18px] font-bold text-on-surface">
                  {bedState.connectedBedId}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Active
                </span>
              </div>
              <span className="text-[13px] font-medium text-on-surface-variant">
                {bedState.patientName} • {bedState.roomNumber}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-lg">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                bolt
              </span>
              <span className="text-[11px] text-on-surface font-extrabold">
                {bedState.batteryPercent}%
              </span>
            </div>
            <span className="text-[10px] text-outline font-semibold mt-1">
              Plugged &amp; Charging
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 bg-surface-container-low px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] text-on-surface font-bold">
              BLE 5.0 Synced
            </span>
            <span className="text-[11px] text-outline">· 2ms jitter</span>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-[14px]">
              shield
            </span>
            <span className="text-[11px] font-bold">
              Guard Actuators Active
            </span>
          </div>
        </div>
      </div>

      {/* Voice Prompt Bar */}
      <button
        onClick={handleVoiceDemo}
        className="w-full bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl px-4 py-2 flex items-center justify-between shadow-xs border border-primary/15 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary shadow-xs">
            <span className="material-symbols-outlined text-[16px]">mic</span>
          </span>
          <span className="text-xs sm:text-[13px] font-medium text-primary">
            {voiceSpoken ? '“Command executed: Head inclined to 30°”' : '“Hey MarQ, elevate head 30°”'}
          </span>
        </div>
        <span className="text-[10px] font-bold bg-surface-container-lowest px-2 py-1 rounded text-on-surface-variant uppercase shadow-xs">
          {voiceSpoken ? 'Active' : 'Voice Ready'}
        </span>
      </button>

      {/* Interactive 3D Medical Bed Silhouette Canvas */}
      <BedVisualizer
        headAngle={bedState.headAngle}
        overallHeight={bedState.overallHeight}
        kneeAngle={bedState.kneeAngle}
      />

      {/* Section 1: Head & Knee Actuation Tiles */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold text-outline uppercase tracking-wider px-1">
          Primary Articulations
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Head Section Control Card */}
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-md flex flex-col gap-2 border border-outline-variant/15">
            <div className="flex justify-between items-center px-1">
              <span className="text-[13px] font-bold text-on-surface">
                Head Gatch
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold">
                0°-70°
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-head-up"
                onMouseDown={() => startHoldAction(() => adjustHead(1))}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startHoldAction(() => adjustHead(1));
                }}
                onTouchEnd={stopHold}
                className="h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">
                  arrow_upward
                </span>
                <span className="text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                  Raise
                </span>
              </button>
              <button
                id="btn-head-down"
                onMouseDown={() => startHoldAction(() => adjustHead(-1))}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startHoldAction(() => adjustHead(-1));
                }}
                onTouchEnd={stopHold}
                className="h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">
                  arrow_downward
                </span>
                <span className="text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                  Lower
                </span>
              </button>
            </div>
            <span className="text-[10px] leading-none text-center text-outline uppercase font-extrabold">
              HOLD FOR AUTO-STOP
            </span>
          </div>

          {/* Knee / Foot Section Control Card */}
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-md flex flex-col gap-2 border border-outline-variant/15">
            <div className="flex justify-between items-center px-1">
              <span className="text-[13px] font-bold text-on-surface">
                Knee Break
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold">
                0°-35°
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-knee-up"
                onMouseDown={() => startHoldAction(() => adjustKnee(1))}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startHoldAction(() => adjustKnee(1));
                }}
                onTouchEnd={stopHold}
                className="h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">
                  arrow_upward
                </span>
                <span className="text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                  Raise
                </span>
              </button>
              <button
                id="btn-knee-down"
                onMouseDown={() => startHoldAction(() => adjustKnee(-1))}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={(e) => {
                  e.preventDefault();
                  startHoldAction(() => adjustKnee(-1));
                }}
                onTouchEnd={stopHold}
                className="h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">
                  arrow_downward
                </span>
                <span className="text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                  Lower
                </span>
              </button>
            </div>
            <span className="text-[10px] leading-none text-center text-outline uppercase font-extrabold">
              HOLD FOR AUTO-STOP
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Height & Quick Flat / Zero-G */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Bed Elevation Module */}
        <div className="bg-surface-container-lowest rounded-xl p-3 shadow-md flex flex-col justify-between gap-2 border border-outline-variant/15">
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] font-bold text-on-surface">
              Bed Elevation
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-secondary font-bold">
              40-85cm
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-bed-up"
              onMouseDown={() => startHoldAction(() => adjustHeight(1))}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={(e) => {
                e.preventDefault();
                startHoldAction(() => adjustHeight(1));
              }}
              onTouchEnd={stopHold}
              className="h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">
                vertical_align_top
              </span>
              <span className="text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                Elevate
              </span>
            </button>
            <button
              id="btn-bed-down"
              onMouseDown={() => startHoldAction(() => adjustHeight(-1))}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={(e) => {
                e.preventDefault();
                startHoldAction(() => adjustHeight(-1));
              }}
              onTouchEnd={stopHold}
              className="h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">
                vertical_align_bottom
              </span>
              <span className="text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                Lower
              </span>
            </button>
          </div>
        </div>

        {/* Quick Return & Zero-G */}
        <div className="bg-surface-container-lowest rounded-xl p-3 shadow-md flex flex-col justify-between gap-2 border border-outline-variant/15">
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] font-bold text-on-surface">
              Rapid Align
            </span>
            <span className="text-[11px] font-medium text-outline">
              Auto-Cycle
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-preset-zerog"
              onClick={setZeroG}
              className={`h-16 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 transition-all select-none cursor-pointer ${
                bedState.activePreset === 'zerog'
                  ? 'ring-2 ring-primary bg-primary/10'
                  : ''
              }`}
            >
              <span className="material-symbols-outlined text-[22px] text-primary">
                airline_seat_recline_extra
              </span>
              <span className="text-[11px] font-bold mt-0.5 text-on-surface uppercase tracking-wide">
                Zero-G
              </span>
            </button>
            <button
              id="btn-preset-flat"
              onClick={setFlat}
              className={`h-16 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_4px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 transition-all select-none cursor-pointer ${
                bedState.activePreset === 'flat'
                  ? 'ring-2 ring-primary bg-primary/10'
                  : ''
              }`}
            >
              <span className="material-symbols-outlined text-[22px] text-on-surface-variant">
                horizontal_rule
              </span>
              <span className="text-[11px] font-bold mt-0.5 text-on-surface uppercase tracking-wide">
                Flat 0°
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Clinical Presets & Safety Incline */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold text-outline uppercase tracking-wider px-1">
          Clinical Postures &amp; Profiles
        </span>
        <div className="grid grid-cols-4 gap-2">
          {/* Cardiac Chair */}
          <button
            onClick={setCardiacChair}
            className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'cardiac'
                ? 'bg-primary text-on-primary ring-2 ring-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[22px] mb-1 ${
                bedState.activePreset === 'cardiac' ? 'text-on-primary' : 'text-primary'
              }`}
            >
              chair
            </span>
            <span className="text-[11px] leading-tight font-bold">
              Cardiac Chair
            </span>
            {bedState.activePreset === 'cardiac' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1" />
            )}
          </button>

          {/* Trendelenburg with Caution Badge */}
          <button
            onClick={setTrendelenburg}
            className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md relative active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'trendelenburg'
                ? 'bg-secondary-fixed text-on-secondary-fixed ring-2 ring-secondary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="absolute top-1 right-1 text-secondary">
              <span className="material-symbols-outlined text-[13px]">
                warning
              </span>
            </span>
            <span className="material-symbols-outlined text-[22px] text-secondary mb-1">
              swap_driving_apps
            </span>
            <span className="text-[11px] leading-tight font-bold">
              Trendelenburg
            </span>
            <span className="text-[9px] text-secondary font-bold">
              Tilt -12°
            </span>
          </button>

          {/* Memory Preset M1 */}
          <button
            onClick={setM1Sleep}
            className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'sleep'
                ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[22px] text-primary mb-1">
              bedtime
            </span>
            <span className="text-[11px] leading-tight font-bold">
              M1: Sleep
            </span>
            <span className="text-[9px] text-outline font-semibold">
              Head 15°
            </span>
          </button>

          {/* Memory Preset M2 */}
          <button
            onClick={setM2Exam}
            className={`h-20 rounded-xl p-2 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'exam'
                ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[22px] text-primary mb-1">
              medical_services
            </span>
            <span className="text-[11px] leading-tight font-bold">
              M2: Exam
            </span>
            <span className="text-[9px] text-outline font-semibold">
              High/Flat
            </span>
          </button>
        </div>
      </div>

      {/* Halting Emergency Strip */}
      <div className="mt-2 w-full">
        <button
          onClick={onTriggerEStop}
          id="e-stop-bar"
          className="w-full h-16 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-between px-4 sm:px-5 shadow-[0_6px_20px_rgba(159,0,15,0.35)] active:brightness-90 active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[26px]">
                emergency_home
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[16px] sm:text-[18px] font-extrabold tracking-wide leading-tight">
                EMERGENCY STOP
              </span>
              <span className="text-[11px] font-semibold opacity-90">
                Instant relay cut-off across BLE &amp; Wi-Fi
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[28px]">
            pan_tool
          </span>
        </button>
      </div>
    </div>
  );
};
