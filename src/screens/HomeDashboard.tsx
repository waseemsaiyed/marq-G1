import React, { useRef, useEffect, useState } from 'react';
import { BedState, PatientProfile, PatientChartTabKey } from '../types';
import { BedVisualizer } from '../components/BedVisualizer';
import { getPatientProfile } from '../services/patientStorage';
import { getContactDetails, ContactDetails } from '../services/contactStorage';
import { esp32Bridge } from '../services/esp32HardwareBridge';

interface HomeDashboardProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onTriggerNurseCall: () => void;
  onOpenPatientChart?: (tab?: PatientChartTabKey) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
  onTriggerNurseCall,
  onOpenPatientChart,
}) => {

  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    // Send safety stop to ESP32 controller
    esp32Bridge.sendActuatorCommand({ actuator: 'all', action: 'stop' });
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
    esp32Bridge.sendActuatorCommand({
      actuator: 'head',
      action: delta > 0 ? 'up' : 'down',
    });
    setBedState((prev) => {
      const next = Math.max(0, Math.min(90, prev.headAngle + delta));
      return { ...prev, headAngle: next, activePreset: null };
    });
  };

  const adjustKnee = (delta: number) => {
    esp32Bridge.sendActuatorCommand({
      actuator: 'knee',
      action: delta > 0 ? 'up' : 'down',
    });
    setBedState((prev) => {
      const next = Math.max(0, Math.min(35, prev.kneeAngle + delta));
      return { ...prev, kneeAngle: next, activePreset: null };
    });
  };

  const adjustTilt = (delta: number) => {
    esp32Bridge.sendActuatorCommand({
      actuator: 'tilt',
      action: delta > 0 ? 'up' : 'down',
    });
    setBedState((prev) => {
      const next = Math.max(-90, Math.min(90, prev.tiltAngle + delta));
      return { ...prev, tiltAngle: next, activePreset: next !== 0 ? 'trendelenburg' : null };
    });
  };

  const adjustHeight = (delta: number) => {
    esp32Bridge.sendActuatorCommand({
      actuator: 'height',
      action: delta > 0 ? 'up' : 'down',
    });
    setBedState((prev) => {
      const next = Math.max(0, Math.min(85, prev.overallHeight + delta));
      return { ...prev, overallHeight: next, activePreset: null };
    });
  };

  const setZeroG = () => {
    esp32Bridge.sendActuatorCommand({ actuator: 'all', action: 'zerog' });
    setBedState((prev) => ({
      ...prev,
      headAngle: 30,
      kneeAngle: 20,
      activePreset: 'zerog',
    }));
  };

  const setFlat = () => {
    esp32Bridge.sendActuatorCommand({ actuator: 'all', action: 'flat' });
    setBedState((prev) => ({
      ...prev,
      headAngle: 0,
      kneeAngle: 0,
      activePreset: 'flat',
    }));
  };

  const setCardiacChair = () => {
    esp32Bridge.sendActuatorCommand({ actuator: 'all', action: 'cardiac' });
    setBedState((prev) => ({
      ...prev,
      headAngle: 55,
      kneeAngle: 30,
      overallHeight: 52,
      activePreset: 'cardiac',
    }));
  };

  const setTrendelenburg = () => {
    esp32Bridge.sendActuatorCommand({ actuator: 'all', action: 'trendelenburg' });
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
    <div className="flex flex-col w-full gap-3 max-w-lg mx-auto pb-6">
      {/* Voice Prompt Bar */}
      <button
        onClick={handleVoiceDemo}
        className="w-full bg-slate-50 hover:bg-slate-100/80 transition-colors rounded-xl px-4 py-2.5 flex items-center justify-between border border-slate-200/50 text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow-2xs">
            <span className="material-symbols-outlined text-[13px]">mic</span>
          </span>
          <span className="text-xs font-semibold text-slate-700">
            {voiceSpoken ? '“Command: Head inclined to 30°”' : '“Hey MarQ, elevate head 30°”'}
          </span>
        </div>
        <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-400 uppercase shadow-2xs">
          {voiceSpoken ? 'Listening' : 'Voice Ready'}
        </span>
      </button>

      {/* Interactive Medical Bed Silhouette Canvas */}
      <BedVisualizer
        headAngle={bedState.headAngle}
        overallHeight={bedState.overallHeight}
        kneeAngle={bedState.kneeAngle}
        tiltAngle={bedState.tiltAngle}
      />

      {/* Section 1: Actuator Control Tiles (Premium technical controller layout) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
          Bed Actuation Consoles
        </span>
        <div className="grid grid-cols-2 gap-3">
          {/* Head Section Control Card */}
          <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col gap-2 border border-slate-200/60">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Head Fowler
              </span>
              <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-50 text-primary">
                {bedState.headAngle}° / 90°
              </span>
            </div>
            
            {/* Actuation Buttons */}
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-primary active:text-white active:scale-95 active:shadow-inner active:border-primary flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[18px] text-primary group-active:text-white">
                  arrow_upward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white mt-0.5">
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-primary active:text-white active:scale-95 active:shadow-inner active:border-primary flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[18px] text-primary group-active:text-white">
                  arrow_downward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white mt-0.5">
                  Lower
                </span>
              </button>
            </div>
            <span className="text-[8px] leading-none text-center text-slate-400 uppercase font-bold tracking-wider">
              Hold actuator pad to spin
            </span>
          </div>

          {/* Knee / Foot Section Control Card */}
          <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col gap-2 border border-slate-200/60">
            <div className="flex justify-between items-center px-0.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Knee Break
              </span>
              <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-50 text-primary">
                {bedState.kneeAngle}° / 35°
              </span>
            </div>

            {/* Actuation Buttons */}
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-primary active:text-white active:scale-95 active:shadow-inner active:border-primary flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[18px] text-primary group-active:text-white">
                  arrow_upward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white mt-0.5">
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-primary active:text-white active:scale-95 active:shadow-inner active:border-primary flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[18px] text-primary group-active:text-white">
                  arrow_downward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white mt-0.5">
                  Lower
                </span>
              </button>
            </div>
            <span className="text-[8px] leading-none text-center text-slate-400 uppercase font-bold tracking-wider">
              Hold actuator pad to spin
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Height & Quick Flat / Zero-G */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bed Elevation Module */}
        <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col gap-2 border border-slate-200/60 justify-between">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bed Elevation
            </span>
            <span className="text-[9.5px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-50 text-secondary">
              {bedState.overallHeight} cm
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
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
              className="h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-secondary active:text-white active:scale-95 active:shadow-inner active:border-secondary flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary group-active:text-white">
                vertical_align_top
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white">
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
              className="h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-secondary active:text-white active:scale-95 active:shadow-inner active:border-secondary flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer group"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary group-active:text-white">
                vertical_align_bottom
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white">
                Lower
              </span>
            </button>
          </div>
        </div>

        {/* Quick Return & Zero-G */}
        <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col gap-2 border border-slate-200/60 justify-between">
          <div className="flex justify-between items-center px-0.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Quick Calibrate
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Auto Presets
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              id="btn-preset-zerog"
              onClick={setZeroG}
              className={`h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-primary active:text-white active:scale-95 active:shadow-inner flex flex-col items-center justify-center border transition-all cursor-pointer group ${
                bedState.activePreset === 'zerog'
                  ? 'border-primary bg-blue-50/50'
                  : 'border-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-primary group-active:text-white">
                airline_seat_recline_extra
              </span>
              <span className="text-[9px] font-bold text-slate-700 group-active:text-white uppercase tracking-wider">
                Zero-G
              </span>
            </button>
            <button
              id="btn-preset-flat"
              onClick={setFlat}
              className={`h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-primary active:text-white active:scale-95 active:shadow-inner flex flex-col items-center justify-center border transition-all cursor-pointer group ${
                bedState.activePreset === 'flat'
                  ? 'border-primary bg-blue-50/50'
                  : 'border-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-slate-700 group-active:text-white">
                horizontal_rule
              </span>
              <span className="text-[9px] font-bold text-slate-700 group-active:text-white uppercase tracking-wider">
                Flat 0°
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2B: Trendelenburg Longitudinal Tilt */}
      <div className="bg-white rounded-xl p-3 shadow-xs flex flex-col gap-2 border border-slate-200/60">
        <div className="flex justify-between items-center px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              swap_vert
            </span>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Longitudinal Tilt Axis
            </span>
          </div>
          <span className="text-[10px] font-bold font-mono text-secondary">
            {bedState.tiltAngle === 0
              ? 'LEVEL (0°)'
              : `${Math.abs(bedState.tiltAngle)}° ${bedState.tiltAngle < 0 ? 'TRENDELENBURG' : 'REV. TREND'}`}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            id="btn-trend-down"
            onMouseDown={() => startHoldAction(() => adjustTilt(-1))}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={(e) => {
              e.preventDefault();
              startHoldAction(() => adjustTilt(-1));
            }}
            onTouchEnd={stopHold}
            className="h-[50px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-secondary active:text-white active:scale-95 active:shadow-inner active:border-secondary flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer group"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white">
              Trendelenburg
            </span>
            <span className="text-[8px] text-slate-400 group-active:text-white/80 font-semibold">Head Down</span>
          </button>
          <button
            id="btn-trend-level"
            onClick={() => adjustTilt(-bedState.tiltAngle)}
            className="h-[50px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-secondary active:text-white active:scale-95 active:shadow-inner active:border-secondary flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer group"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 group-active:text-white">
              Level 0°
            </span>
            <span className="text-[8px] text-slate-400 group-active:text-white/80 font-semibold">Reset</span>
          </button>
          <button
            id="btn-trend-up"
            onMouseDown={() => startHoldAction(() => adjustTilt(1))}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={(e) => {
              e.preventDefault();
              startHoldAction(() => adjustTilt(1));
            }}
            onTouchEnd={stopHold}
            className="h-[50px] rounded-lg bg-slate-50 hover:bg-slate-100 active:bg-secondary active:text-white active:scale-95 active:shadow-inner active:border-secondary flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer group"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 group-active:text-white">
              Rev. Trend
            </span>
            <span className="text-[8px] text-slate-400 group-active:text-white/80 font-semibold">Head Up</span>
          </button>
        </div>
      </div>

      {/* Section 3: Clinical Presets */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-1">
          Specialty Clinical Presets
        </span>
        <div className="grid grid-cols-4 gap-2">
          {/* Cardiac Chair */}
          <button
            onClick={setCardiacChair}
            className={`h-[72px] rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer ${
              bedState.activePreset === 'cardiac'
                ? 'bg-primary text-white border border-primary'
                : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/60'
            }`}
          >
            <span className={`material-symbols-outlined text-[18px] mb-1 ${
              bedState.activePreset === 'cardiac' ? 'text-white' : 'text-primary'
            }`}>
              chair
            </span>
            <span className="text-[10px] leading-tight font-bold uppercase tracking-tight">
              Cardiac
            </span>
          </button>

          {/* Trendelenburg */}
          <button
            onClick={setTrendelenburg}
            className={`h-[72px] rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer ${
              bedState.activePreset === 'trendelenburg'
                ? 'bg-amber-600 text-white border border-amber-600'
                : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-amber-600 mb-1">
              swap_driving_apps
            </span>
            <span className="text-[10px] leading-tight font-bold uppercase tracking-tight">
              Trend
            </span>
          </button>

          {/* Sleep Preset M1 */}
          <button
            onClick={setM1Sleep}
            className={`h-[72px] rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer ${
              bedState.activePreset === 'sleep'
                ? 'bg-primary text-white border border-primary'
                : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-primary mb-1">
              bedtime
            </span>
            <span className="text-[10px] leading-tight font-bold uppercase tracking-tight">
              Sleep M1
            </span>
          </button>

          {/* Exam Preset M2 */}
          <button
            onClick={setM2Exam}
            className={`h-[72px] rounded-xl p-1.5 flex flex-col items-center justify-center text-center shadow-xs transition-all cursor-pointer ${
              bedState.activePreset === 'exam'
                ? 'bg-primary text-white border border-primary'
                : 'bg-white text-slate-800 hover:bg-slate-50 border border-slate-200/60'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-primary mb-1">
              medical_services
            </span>
            <span className="text-[10px] leading-tight font-bold uppercase tracking-tight">
              Exam M2
            </span>
          </button>
        </div>
      </div>

      {/* Persistent Emergency Stop Bar */}
      <div className="mt-1 w-full">
        <button
          onClick={onTriggerEStop}
          id="e-stop-bar"
          className="w-full h-[54px] rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-between px-4 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] shrink-0 fill-current">
              pan_tool
            </span>
            <div className="flex flex-col text-left">
              <span className="text-sm font-extrabold tracking-wider uppercase leading-none">
                Emergency Stop
              </span>
              <span className="text-[9px] font-medium opacity-80 mt-0.5">
                Cuts mechanical relay power across channels
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[18px]">
            arrow_forward
          </span>
        </button>
      </div>
    </div>
  );
};
