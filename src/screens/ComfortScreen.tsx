import React, { useState } from 'react';
import { BedState, PatientChartTabKey } from '../types';

interface ComfortScreenProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onTriggerNurseCall: () => void;
  onOpenPatientChart?: (tab?: PatientChartTabKey) => void;
}

export const ComfortScreen: React.FC<ComfortScreenProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
  onTriggerNurseCall,
  onOpenPatientChart,
}) => {
  const [tareSuccess, setTareSuccess] = useState(false);
  const [intercomActive, setIntercomActive] = useState(false);

  // Toggle individual rail
  const toggleRail = (railKey: keyof BedState['rails']) => {
    setBedState((prev) => ({
      ...prev,
      rails: {
        ...prev.rails,
        [railKey]: !prev.rails[railKey],
      },
    }));
  };

  // Toggle casters brake
  const toggleCasters = () => {
    setBedState((prev) => ({
      ...prev,
      castersLocked: !prev.castersLocked,
    }));
  };

  // Toggle presence sensor
  const togglePresence = () => {
    setBedState((prev) => ({
      ...prev,
      presenceArmed: !prev.presenceArmed,
    }));
  };

  // Tare matrix action
  const handleTare = () => {
    setTareSuccess(true);
    setTimeout(() => setTareSuccess(false), 2000);
  };

  // Under-bed light controls
  const toggleLightPower = () => {
    setBedState((prev) => ({
      ...prev,
      underBedLight: {
        ...prev.underBedLight,
        enabled: !prev.underBedLight.enabled,
      },
    }));
  };

  const setLightHue = (hue: 'amber' | 'blue') => {
    setBedState((prev) => ({
      ...prev,
      underBedLight: {
        ...prev.underBedLight,
        hue,
      },
    }));
  };

  const setLightBrightness = (brightness: number) => {
    setBedState((prev) => ({
      ...prev,
      underBedLight: {
        ...prev.underBedLight,
        brightness,
      },
    }));
  };

  const toggleFloorSensor = () => {
    setBedState((prev) => ({
      ...prev,
      underBedLight: {
        ...prev.underBedLight,
        motionSensor: !prev.underBedLight.motionSensor,
      },
    }));
  };

  const hasRailAlert = !bedState.rails.footRight;

  return (
    <div className="flex flex-col w-full gap-4 max-w-lg mx-auto pb-6">
      {/* Active Safety Channel & Nurse Station Intercom */}
      <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3.5 relative overflow-hidden border border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">
              Active Security Node
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            Node #4A-ICU
          </span>
        </div>

        {/* Big Urgent Nurse Station Intercom Button */}
        <button
          id="nurse-station-btn"
          onClick={() => {
            setIntercomActive(true);
            onTriggerNurseCall();
            setTimeout(() => setIntercomActive(false), 3000);
          }}
          className="w-full min-h-[56px] bg-amber-600 hover:bg-amber-700 active:scale-[0.99] transition-all rounded-xl p-2.5 flex items-center justify-between text-white cursor-pointer shadow-xs"
        >
          <div className="flex items-center gap-3 pl-1">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[20px] text-white"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                emergency
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[12px] font-black tracking-wider uppercase leading-none">
                {intercomActive ? 'Transmitting to Central...' : 'Call Nurse Station'}
              </span>
              <span className="text-[10px] text-white/80 font-semibold mt-0.5 uppercase tracking-tight">
                Press to Speak · ICU Ward 4A
              </span>
            </div>
          </div>
          <div className="pr-1.5 flex items-center gap-1 bg-white/15 px-2.5 py-1 rounded">
            <span className="material-symbols-outlined text-[14px] text-white animate-pulse">
              mic
            </span>
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">
              Live
            </span>
          </div>
        </button>
      </div>

      {/* Real-time Bed Safety Status Alert (Conditional) */}
      {hasRailAlert && (
        <div className="w-full bg-white rounded-xl p-3.5 shadow-xs flex items-start gap-3 border border-amber-500/30">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-amber-600 text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Rail Safety Protocol Alert
              </span>
              <span className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded font-extrabold">
                Attention Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Foot Right safety rail is lowered. Maintain hospital standard fall prevention protocols.
            </p>
            <button
              onClick={() => toggleRail('footRight')}
              className="mt-2 text-xs font-bold text-primary hover:underline self-start flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[14px]">
                arrow_upward
              </span>
              <span>Engage Foot Right Rail</span>
            </button>
          </div>
        </div>
      )}

      {/* Sentry 4-Quadrant Rail & Brake Monitoring Matrix */}
      <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3.5 border border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[18px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield
            </span>
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Perimeter Sentry Matrix
            </h2>
          </div>
          <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">
            Active Feed
          </span>
        </div>

        {/* 4-Quadrant Visual Schematic Layout (Flat without inner card borders) */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-xl">
          {/* Head Left */}
          <button
            onClick={() => toggleRail('headLeft')}
            className={`p-2.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer bg-white border ${
              bedState.rails.headLeft
                ? 'border-slate-200/50'
                : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                Head Left
              </span>
              <span
                className={`text-[10px] font-bold mt-0.5 tracking-wide ${
                  bedState.rails.headLeft ? 'text-primary' : 'text-amber-700'
                }`}
              >
                {bedState.rails.headLeft ? 'LOCKED / UP' : 'LOWERED'}
              </span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${bedState.rails.headLeft ? 'bg-primary' : 'bg-amber-500 animate-ping'}`} />
          </button>

          {/* Head Right */}
          <button
            onClick={() => toggleRail('headRight')}
            className={`p-2.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer bg-white border ${
              bedState.rails.headRight
                ? 'border-slate-200/50'
                : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                Head Right
              </span>
              <span
                className={`text-[10px] font-bold mt-0.5 tracking-wide ${
                  bedState.rails.headRight ? 'text-primary' : 'text-amber-700'
                }`}
              >
                {bedState.rails.headRight ? 'LOCKED / UP' : 'LOWERED'}
              </span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${bedState.rails.headRight ? 'bg-primary' : 'bg-amber-500 animate-ping'}`} />
          </button>

          {/* Foot Left */}
          <button
            onClick={() => toggleRail('footLeft')}
            className={`p-2.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer bg-white border ${
              bedState.rails.footLeft
                ? 'border-slate-200/50'
                : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                Foot Left
              </span>
              <span
                className={`text-[10px] font-bold mt-0.5 tracking-wide ${
                  bedState.rails.footLeft ? 'text-primary' : 'text-amber-700'
                }`}
              >
                {bedState.rails.footLeft ? 'LOCKED / UP' : 'LOWERED'}
              </span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${bedState.rails.footLeft ? 'bg-primary' : 'bg-amber-500 animate-ping'}`} />
          </button>

          {/* Foot Right */}
          <button
            onClick={() => toggleRail('footRight')}
            className={`p-2.5 rounded-lg flex items-center justify-between text-left transition-all cursor-pointer bg-white border ${
              bedState.rails.footRight
                ? 'border-slate-200/50'
                : 'border-amber-500/40 bg-amber-500/5'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
                Foot Right
              </span>
              <span
                className={`text-[10px] font-bold mt-0.5 tracking-wide ${
                  bedState.rails.footRight ? 'text-primary' : 'text-amber-700'
                }`}
              >
                {bedState.rails.footRight ? 'LOCKED / UP' : 'LOWERED'}
              </span>
            </div>
            <span className={`w-1.5 h-1.5 rounded-full ${bedState.rails.footRight ? 'bg-primary' : 'bg-amber-500 animate-ping'}`} />
          </button>
        </div>

        {/* Central Caster Brake Telemetry */}
        <button
          onClick={toggleCasters}
          className="w-full bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer border border-slate-200/40"
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                bedState.castersLocked ? 'bg-primary text-white' : 'bg-amber-600 text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.castersLocked ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">
                Central Wheel Braking System
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                {bedState.castersLocked ? 'All Casters Securely Locked' : 'Free Mobile Mode Active'}
              </span>
            </div>
          </div>
          <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${bedState.castersLocked ? 'text-primary' : 'text-amber-700 bg-amber-50 animate-pulse'}`}>
            {bedState.castersLocked ? 'Locked' : 'Unlocked'}
          </span>
        </button>
      </div>

      {/* Precision Scale & Presence Detection */}
      <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3.5 border border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              scale
            </span>
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Patient Scale Readout
            </h2>
          </div>
          <button
            onClick={handleTare}
            className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer active:scale-95 border border-slate-200/40"
          >
            <span className="material-symbols-outlined text-[13px] text-slate-500">
              restart_alt
            </span>
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
              {tareSuccess ? 'Tared' : 'Tare'}
            </span>
          </button>
        </div>

        {/* Scale Readout (Flat styling) */}
        <div className="bg-slate-50/50 rounded-xl p-3.5 flex flex-col gap-2.5 border border-slate-200/40">
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-primary tracking-tight font-mono tabular-nums">
                  {bedState.patientWeight}
                </span>
                <span className="text-sm font-bold text-slate-500">kg</span>
              </div>
              <span className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider mt-1 block">
                Tare Offset: -2.1 kg (Bedding / IV Lines)
              </span>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                OIML Class III
              </span>
              <span className="text-[9.5px] text-slate-500 font-mono font-bold mt-0.5">
                Tol. ±0.05kg
              </span>
            </div>
          </div>

          {/* Scale Profile Link */}
          <div className="pt-2 border-t border-slate-200/40 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-bold">
              <span className="text-slate-500 font-medium">Stability Index:</span>
              <span className={`uppercase ${
                bedState.patientStability === 'Stable' || !bedState.patientStability
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                {bedState.patientStability || 'Stable'}
              </span>
            </div>

            {onOpenPatientChart && (
              <button
                id="btn-scale-edit-mass"
                onClick={() => onOpenPatientChart('mass')}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-[9.5px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-colors shadow-2xs border border-slate-200/50 uppercase tracking-wider"
              >
                <span>Edit Chart</span>
              </button>
            )}
          </div>
        </div>

        {/* Exit Bed Armed Status */}
        <button
          onClick={togglePresence}
          className="w-full bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer border border-slate-200/40"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-primary">
              <span
                className="material-symbols-outlined text-[16px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                airline_seat_recline_normal
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">
                Out-of-Bed Presence Monitor
              </span>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">
                Continuous Piezo Bed Matrix Sensor
              </span>
            </div>
          </div>
          <span className={`text-[9.5px] font-bold uppercase tracking-wider ${bedState.presenceArmed ? 'text-primary' : 'text-slate-400'}`}>
            {bedState.presenceArmed ? 'Armed' : 'Disarmed'}
          </span>
        </button>
      </div>

      {/* Under-Bed Ambient Night Light Environment Panel */}
      <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col gap-4 border border-slate-200/60 relative overflow-hidden">
        {/* Subtle ambient visual glow in card reflecting live lighting */}
        {bedState.underBedLight.enabled && (
          <div
            className={`absolute -bottom-8 left-0 right-0 h-16 pointer-events-none filter blur-xl transition-all duration-300 opacity-60 ${
              bedState.underBedLight.hue === 'amber'
                ? 'bg-amber-400'
                : 'bg-sky-400'
            }`}
            style={{
              opacity: (bedState.underBedLight.brightness / 100) * 0.45,
            }}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">
              light_mode
            </span>
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Under-Bed Night Light
            </h2>
          </div>

          {/* Primary Power Tactile Toggle Switch */}
          <button
            id="ambient-power-btn"
            onClick={toggleLightPower}
            className={`w-12 h-6.5 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              bedState.underBedLight.enabled
                ? 'bg-primary justify-end'
                : 'bg-slate-200 justify-start'
            }`}
          >
            <div className="w-5.5 h-5.5 rounded-full bg-white shadow-xs" />
          </button>
        </div>

        {/* Dual Medical Light Temperature Selection */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Illumination Spectrum Hue
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Warm Amber Mode */}
            <button
              id="hue-amber"
              onClick={() => setLightHue('amber')}
              className={`rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer border ${
                bedState.underBedLight.hue === 'amber'
                  ? 'bg-slate-50 border-amber-500/40 shadow-2xs'
                  : 'bg-white border-slate-200/50 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-2xs" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800">
                    Warm Amber
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase font-mono">
                    2700K Circadian
                  </span>
                </div>
              </div>
              {bedState.underBedLight.hue === 'amber' && (
                <span className="material-symbols-outlined text-primary text-[15px]">
                  check_circle
                </span>
              )}
            </button>

            {/* Soft Blue Clinical Mode */}
            <button
              id="hue-blue"
              onClick={() => setLightHue('blue')}
              className={`rounded-xl p-2.5 flex items-center justify-between transition-all cursor-pointer border ${
                bedState.underBedLight.hue === 'blue'
                  ? 'bg-slate-50 border-blue-500/40 shadow-2xs'
                  : 'bg-white border-slate-200/50 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-2xs" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800">
                    Soft Blue
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase font-mono">
                    4000K Medical
                  </span>
                </div>
              </div>
              {bedState.underBedLight.hue === 'blue' && (
                <span className="material-symbols-outlined text-primary text-[15px]">
                  check_circle
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Stepless Dimmer Intensity Range */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
              Luminance Dimmer
            </span>
            <span
              id="dimmer-percentage"
              className="text-xs font-bold text-primary font-mono tabular-nums"
            >
              {bedState.underBedLight.brightness}%
            </span>
          </div>
          <div className="relative w-full h-10 bg-slate-50 rounded-xl flex items-center px-3 border border-slate-200/50">
            <span className="material-symbols-outlined text-slate-400 text-[15px] mr-2">
              brightness_low
            </span>
            <input
              id="light-dimmer-slider"
              type="range"
              min="0"
              max="100"
              value={bedState.underBedLight.brightness}
              onChange={(e) => setLightBrightness(parseInt(e.target.value, 10))}
              disabled={!bedState.underBedLight.enabled}
              className="w-full h-1.5 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <span className="material-symbols-outlined text-slate-400 text-[15px] ml-2">
              brightness_high
            </span>
          </div>
        </div>

        {/* Floor Motion Safety Automations */}
        <div className="w-full bg-slate-50 p-2.5 rounded-xl flex items-center justify-between border border-slate-200/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 text-primary border border-slate-200/30 shadow-2xs">
              <span className="material-symbols-outlined text-[15px]">
                sensors
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">
                Egress Safety Sensor
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase leading-none mt-0.5">
                Auto-illuminates room path upon patient egress
              </span>
            </div>
          </div>

          <button
            id="sensor-toggle-btn"
            onClick={toggleFloorSensor}
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              bedState.underBedLight.motionSensor
                ? 'bg-primary justify-end'
                : 'bg-slate-200 justify-start'
            }`}
          >
            <div className="w-4.5 h-5.5 rounded-full bg-white shadow-2xs" />
          </button>
        </div>
      </div>

      {/* Bedside Protocol Reference Card */}
      <div className="w-full bg-slate-50/50 rounded-xl p-3.5 flex flex-col gap-1 border border-slate-200/60">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-slate-500 text-[16px]">
            verified_user
          </span>
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
            Safety compliance checklist
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-normal font-medium">
          Continuous motor lockout feed monitored at 100ms polling intervals per standard hospital guidelines (ISO 60601-2-52).
        </p>
      </div>

      {/* Mechanical Fail-Safe EMERGENCY STOP Bar */}
      <div className="w-full pt-1">
        <button
          id="safety-stop-btn"
          onClick={onTriggerEStop}
          className="w-full h-[54px] bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all rounded-xl flex items-center justify-center gap-2 text-white cursor-pointer shadow-xs"
        >
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            front_hand
          </span>
          <span className="text-xs font-extrabold tracking-wider uppercase">
            All Actuators Emergency Stop
          </span>
        </button>
      </div>
    </div>
  );
};
