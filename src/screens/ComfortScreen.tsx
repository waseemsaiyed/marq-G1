import React, { useState } from 'react';
import { BedState } from '../types';

interface ComfortScreenProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onTriggerNurseCall: () => void;
  onOpenPatientChart?: (tab?: 'vitals' | 'mass' | 'diagnostic' | 'medication' | 'doctor' | 'emergency') => void;
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
      {/* Immediate Clinical High-Priority Broadcast Banner */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-md flex flex-col gap-3 relative overflow-hidden border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary-container animate-ping" />
            <span className="text-[11px] font-extrabold text-secondary uppercase tracking-widest">
              Active Safety Channel
            </span>
          </div>
          <span className="text-[11px] font-bold text-outline px-2 py-0.5 rounded-full bg-surface-container">
            Node #4A-ICU
          </span>
        </div>

        {/* Big Urgent Nurse Station Intercom Pill */}
        <button
          id="nurse-station-btn"
          onClick={() => {
            setIntercomActive(true);
            onTriggerNurseCall();
            setTimeout(() => setIntercomActive(false), 3000);
          }}
          className="w-full min-h-[58px] sm:min-h-[64px] bg-secondary-container hover:bg-secondary active:scale-[0.98] transition-all rounded-xl p-2 sm:p-2.5 flex items-center justify-between text-on-primary shadow-[0_8px_20px_-4px_rgba(251,120,0,0.38)] cursor-pointer"
        >
          <div className="flex items-center gap-2.5 sm:gap-3 pl-1">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-on-primary/20 flex items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-[24px] sm:text-[26px] text-on-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                emergency
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[13px] sm:text-[15px] font-extrabold text-on-primary tracking-wide leading-tight uppercase">
                {intercomActive ? 'TRANSMITTING TO STATION 4A...' : 'CALL NURSE STATION'}
              </span>
              <span className="text-[11px] sm:text-xs text-on-primary/90 font-medium">
                Station 4A Alerted • Tap to Speak
              </span>
            </div>
          </div>
          <div className="pr-1.5 sm:pr-2 flex items-center gap-1 bg-on-primary/15 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg">
            <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-on-primary animate-pulse">
              mic
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-on-primary uppercase">
              Live
            </span>
          </div>
        </button>
      </div>

      {/* Real-time Bed Safety Status Alert (Conditional dynamic trigger) */}
      {hasRailAlert && (
        <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-md flex items-start gap-3 border border-secondary-fixed">
          <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-secondary text-[22px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[16px] font-bold text-on-surface">
                Rail Alert Protocol
              </span>
              <span className="text-[10px] bg-secondary-fixed text-on-secondary-fixed px-2 py-0.5 rounded-full font-extrabold tracking-wider">
                ATTENTION
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Foot Right rail lowered. Ensure patient fall risk protocol is maintained during bedside assist.
            </p>
            <button
              onClick={() => toggleRail('footRight')}
              className="mt-2 text-xs font-bold text-primary hover:underline self-start flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                arrow_upward
              </span>
              Raise &amp; Lock Foot Right Rail
            </button>
          </div>
        </div>
      )}

      {/* Sentry 4-Quadrant Rail & Brake Monitoring Matrix */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-md flex flex-col gap-4 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined text-primary text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield
            </span>
            <h2 className="text-[16px] font-bold text-on-surface">
              Bed Perimeter Safety
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-md">
            Continuous Sensor Feed
          </span>
        </div>

        {/* 4-Quadrant Visual Schematic Layout */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 bg-surface-container-low p-2 sm:p-2.5 rounded-xl border border-outline-variant/15">
          {/* Head Left */}
          <button
            onClick={() => toggleRail('headLeft')}
            className={`p-2 sm:p-2.5 rounded-lg shadow-xs flex items-center justify-between text-left transition-all cursor-pointer ${
              bedState.rails.headLeft
                ? 'bg-surface-container-lowest border border-outline-variant/15'
                : 'bg-secondary-fixed border border-secondary/30'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-outline uppercase tracking-wider">
                Head Left
              </span>
              <span
                className={`text-[11px] sm:text-[12px] font-extrabold mt-0.5 ${
                  bedState.rails.headLeft ? 'text-primary' : 'text-secondary'
                }`}
              >
                {bedState.rails.headLeft ? 'LOCKED / UP' : 'DOWN / ALERT'}
              </span>
            </div>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                bedState.rails.headLeft
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-secondary text-on-secondary animate-bounce'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px] sm:text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.rails.headLeft ? 'vertical_align_top' : 'vertical_align_bottom'}
              </span>
            </div>
          </button>

          {/* Head Right */}
          <button
            onClick={() => toggleRail('headRight')}
            className={`p-2 sm:p-2.5 rounded-lg shadow-xs flex items-center justify-between text-left transition-all cursor-pointer ${
              bedState.rails.headRight
                ? 'bg-surface-container-lowest border border-outline-variant/15'
                : 'bg-secondary-fixed border border-secondary/30'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-outline uppercase tracking-wider">
                Head Right
              </span>
              <span
                className={`text-[11px] sm:text-[12px] font-extrabold mt-0.5 ${
                  bedState.rails.headRight ? 'text-primary' : 'text-secondary'
                }`}
              >
                {bedState.rails.headRight ? 'LOCKED / UP' : 'DOWN / ALERT'}
              </span>
            </div>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                bedState.rails.headRight
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-secondary text-on-secondary animate-bounce'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px] sm:text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.rails.headRight ? 'vertical_align_top' : 'vertical_align_bottom'}
              </span>
            </div>
          </button>

          {/* Foot Left */}
          <button
            onClick={() => toggleRail('footLeft')}
            className={`p-2 sm:p-2.5 rounded-lg shadow-xs flex items-center justify-between text-left transition-all cursor-pointer ${
              bedState.rails.footLeft
                ? 'bg-surface-container-lowest border border-outline-variant/15'
                : 'bg-secondary-fixed border border-secondary/30'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[9.5px] sm:text-[10px] font-bold text-outline uppercase tracking-wider">
                Foot Left
              </span>
              <span
                className={`text-[11px] sm:text-[12px] font-extrabold mt-0.5 ${
                  bedState.rails.footLeft ? 'text-primary' : 'text-secondary'
                }`}
              >
                {bedState.rails.footLeft ? 'LOCKED / UP' : 'DOWN / ALERT'}
              </span>
            </div>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                bedState.rails.footLeft
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-secondary text-on-secondary animate-bounce'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px] sm:text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.rails.footLeft ? 'vertical_align_top' : 'vertical_align_bottom'}
              </span>
            </div>
          </button>

          {/* Foot Right */}
          <button
            onClick={() => toggleRail('footRight')}
            className={`p-2 sm:p-2.5 rounded-lg shadow-xs flex items-center justify-between text-left transition-all cursor-pointer ${
              bedState.rails.footRight
                ? 'bg-surface-container-lowest border border-outline-variant/15'
                : 'bg-secondary-fixed border border-secondary/30'
            }`}
          >
            <div className="flex flex-col">
              <span
                className={`text-[9.5px] sm:text-[10px] font-bold uppercase tracking-wider ${
                  bedState.rails.footRight
                    ? 'text-outline'
                    : 'text-on-secondary-fixed-variant'
                }`}
              >
                Foot Right
              </span>
              <span
                className={`text-[11px] sm:text-[12px] font-extrabold mt-0.5 ${
                  bedState.rails.footRight ? 'text-primary' : 'text-secondary'
                }`}
              >
                {bedState.rails.footRight ? 'LOCKED / UP' : 'DOWN / ALERT'}
              </span>
            </div>
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
                bedState.rails.footRight
                  ? 'bg-primary-fixed text-primary'
                  : 'bg-secondary text-on-secondary animate-bounce'
              }`}
            >
              <span
                className="material-symbols-outlined text-[16px] sm:text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.rails.footRight ? 'vertical_align_top' : 'vertical_align_bottom'}
              </span>
            </div>
          </button>
        </div>

        {/* Central Caster Brake Telemetry */}
        <button
          onClick={toggleCasters}
          className="w-full bg-surface-container hover:bg-surface-variant/80 p-2 sm:p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div
              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs ${
                bedState.castersLocked ? 'bg-primary text-on-primary' : 'bg-secondary text-on-secondary'
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px] sm:text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {bedState.castersLocked ? 'lock' : 'lock_open'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
                Central Caster System
              </span>
              <span className="text-[11px] sm:text-xs text-on-surface-variant">
                {bedState.castersLocked
                  ? 'All 4 Wheel Actuators Engaged'
                  : 'Wheels Unlocked - Mobile Mode'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-surface-container-lowest shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                bedState.castersLocked ? 'bg-primary' : 'bg-secondary animate-ping'
              }`}
            />
            <span
              className={`text-[10px] sm:text-[11px] uppercase font-bold tracking-wide ${
                bedState.castersLocked ? 'text-primary' : 'text-secondary'
              }`}
            >
              {bedState.castersLocked ? 'SECURE' : 'UNLOCKED'}
            </span>
          </div>
        </button>
      </div>

      {/* Integrated Precision Patient Scale & Out-of-Bed Detection */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-md flex flex-col gap-3 border border-outline-variant/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">
              scale
            </span>
            <h2 className="text-[16px] font-bold text-on-surface">
              Patient Mass &amp; Stability
            </h2>
          </div>
          <button
            onClick={handleTare}
            className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-variant transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span
              className={`material-symbols-outlined text-[16px] text-on-surface-variant ${
                tareSuccess ? 'rotate-180 transition-transform' : ''
              }`}
            >
              restart_alt
            </span>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase">
              {tareSuccess ? 'Tared!' : 'Tare Matrix'}
            </span>
          </button>
        </div>

        {/* Scale Readout Card */}
        <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-3 border border-outline-variant/15">
          <div className="flex items-baseline justify-between">
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[44px] font-extrabold text-primary tracking-tight leading-none tabular-nums">
                  {bedState.patientWeight}
                </span>
                <span className="text-[20px] font-bold text-on-surface-variant">
                  kg
                </span>
              </div>
              <span className="text-xs text-outline font-medium mt-1">
                Tare Offset: Bedding &amp; IV Lines Excluded (-2.1 kg)
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] text-primary uppercase font-extrabold tracking-wide">
                OIML Class III
              </span>
              <span className="text-xs text-on-surface-variant font-semibold">
                ±0.05 kg Tolerance
              </span>
            </div>
          </div>

          {/* Patient Stability & Chart Action Row */}
          <div className="pt-2 border-t border-outline-variant/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-outline">Stability Index:</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold uppercase ${
                  bedState.patientStability === 'Stable' || !bedState.patientStability
                    ? 'bg-emerald-100 text-emerald-800'
                    : bedState.patientStability === 'Critical'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {bedState.patientStability || 'Stable'}
              </span>
            </div>

            {onOpenPatientChart && (
              <button
                id="btn-scale-edit-mass"
                onClick={() => onOpenPatientChart('mass')}
                className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-variant text-[11px] font-bold text-primary flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">edit</span>
                <span>Adjust Mass &amp; Stability</span>
              </button>
            )}
          </div>
        </div>

        {/* Exit Bed Armed Status Pill */}
        <button
          onClick={togglePresence}
          className="w-full bg-surface-container hover:bg-surface-variant/80 p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center shrink-0 text-primary">
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                airline_seat_recline_normal
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-on-surface">
                Presence Monitoring
              </span>
              <span className="text-xs text-on-surface-variant">
                Continuous Piezo Bed Matrix Active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                bedState.presenceArmed ? 'bg-primary animate-pulse' : 'bg-outline'
              }`}
            />
            <span
              className={`text-[11px] uppercase font-extrabold ${
                bedState.presenceArmed ? 'text-primary' : 'text-outline'
              }`}
            >
              {bedState.presenceArmed ? 'ARMED' : 'DISARMED'}
            </span>
          </div>
        </button>
      </div>

      {/* Under-Bed Ambient Night Light Environment Panel */}
      <div className="w-full bg-surface-container-lowest rounded-xl p-4 shadow-md flex flex-col gap-4 border border-outline-variant/15 relative overflow-hidden">
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
            <span className="material-symbols-outlined text-primary text-[22px]">
              light_mode
            </span>
            <h2 className="text-[16px] font-bold text-on-surface">
              Under-bed Lighting
            </h2>
          </div>

          {/* Primary Power Tactile Toggle Switch */}
          <button
            id="ambient-power-btn"
            onClick={toggleLightPower}
            className={`w-14 h-8 rounded-full p-1 transition-colors flex items-center shadow-inner cursor-pointer ${
              bedState.underBedLight.enabled
                ? 'bg-primary-container justify-end'
                : 'bg-surface-variant justify-start'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-on-primary shadow-md flex items-center justify-center transform transition-transform">
              <span className="material-symbols-outlined text-[14px] text-primary">
                {bedState.underBedLight.enabled ? 'check' : 'close'}
              </span>
            </div>
          </button>
        </div>

        {/* Dual Medical Light Temperature Selection */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-extrabold text-outline uppercase tracking-wider">
            Clinical Illumination Hue
          </span>
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {/* Warm Amber Mode */}
            <button
              id="hue-amber"
              onClick={() => setLightHue('amber')}
              className={`h-[50px] sm:h-14 rounded-xl p-2 sm:p-2.5 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer border ${
                bedState.underBedLight.hue === 'amber'
                  ? 'bg-surface-container border-secondary/30 shadow-xs'
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-secondary-container shadow-xs" />
                <div className="flex flex-col text-left">
                  <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
                    Warm Amber
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-outline font-semibold">
                    2700K Circadian
                  </span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-primary text-[18px] sm:text-[20px] transition-opacity ${
                  bedState.underBedLight.hue === 'amber'
                    ? 'opacity-100'
                    : 'opacity-0'
                }`}
              >
                check_circle
              </span>
            </button>

            {/* Soft Blue Clinical Mode */}
            <button
              id="hue-blue"
              onClick={() => setLightHue('blue')}
              className={`h-[50px] sm:h-14 rounded-xl p-2 sm:p-2.5 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer border ${
                bedState.underBedLight.hue === 'blue'
                  ? 'bg-surface-container border-primary/30 shadow-xs'
                  : 'bg-surface-container-low border-transparent hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-2.5">
                <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-primary-fixed-dim shadow-xs" />
                <div className="flex flex-col text-left">
                  <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
                    Soft Blue
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] text-outline font-semibold">
                    4000K Medical
                  </span>
                </div>
              </div>
              <span
                className={`material-symbols-outlined text-primary text-[18px] sm:text-[20px] transition-opacity ${
                  bedState.underBedLight.hue === 'blue'
                    ? 'opacity-100'
                    : 'opacity-0'
                }`}
              >
                check_circle
              </span>
            </button>
          </div>
        </div>

        {/* Stepless Dimmer Intensity Range */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] sm:text-[11px] font-extrabold text-outline uppercase tracking-wider">
              Dimmer Luminance
            </span>
            <span
              id="dimmer-percentage"
              className="text-[12px] sm:text-[13px] font-extrabold text-primary"
            >
              {bedState.underBedLight.brightness}%
            </span>
          </div>
          <div className="relative w-full h-10 sm:h-11 bg-surface-container-low rounded-xl flex items-center px-3 shadow-inner border border-outline-variant/15">
            <span className="material-symbols-outlined text-outline text-[16px] sm:text-[18px] mr-2">
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
              className="w-full h-2 rounded-lg bg-surface-container-highest appearance-none cursor-pointer accent-primary focus:outline-none"
            />
            <span className="material-symbols-outlined text-outline text-[18px] sm:text-[20px] ml-2">
              brightness_high
            </span>
          </div>
        </div>

        {/* Floor Motion Safety Automations */}
        <div className="w-full bg-surface-container p-2 sm:p-2.5 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-lowest flex items-center justify-center shrink-0 text-primary shadow-xs">
              <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                sensors
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
                Floor Safety Sensor
              </span>
              <span className="text-[11px] sm:text-xs text-on-surface-variant">
                Auto-illuminates path on egress
              </span>
            </div>
          </div>

          <button
            id="sensor-toggle-btn"
            onClick={toggleFloorSensor}
            className={`w-11 h-6 sm:w-12 sm:h-7 rounded-full p-0.5 transition-colors flex items-center cursor-pointer ${
              bedState.underBedLight.motionSensor
                ? 'bg-primary justify-end'
                : 'bg-surface-variant justify-start'
            }`}
          >
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-on-primary shadow-xs flex items-center justify-center">
              <span className="material-symbols-outlined text-[11px] sm:text-[12px] text-primary">
                {bedState.underBedLight.motionSensor ? 'done' : 'close'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Bedside Protocol Reference Card */}
      <div className="w-full bg-surface-container-low rounded-xl p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 border border-outline-variant/15">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-on-surface-variant text-[18px]">
            verified_user
          </span>
          <span className="text-[12px] sm:text-[13px] font-bold text-on-surface-variant">
            Protocol Verification (ISO 60601-2-52)
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-outline leading-relaxed">
          Caregiver lockout and automatic rail retention logic are refreshed at 100ms intervals via ESP32 telemetry bus.
        </p>
      </div>

      {/* Mechanical Fail-Safe EMERGENCY STOP Bar */}
      <div className="w-full pt-1">
        <button
          id="safety-stop-btn"
          onClick={onTriggerEStop}
          className="w-full min-h-[58px] sm:min-h-[64px] bg-tertiary hover:bg-tertiary-container active:scale-[0.97] transition-all rounded-xl flex items-center justify-center gap-2.5 sm:gap-3 text-on-tertiary shadow-[0_8px_24px_-4px_rgba(229,57,53,0.35)] cursor-pointer"
        >
          <span
            className="material-symbols-outlined text-[24px] sm:text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            front_hand
          </span>
          <span className="text-[13px] sm:text-[15px] tracking-wider uppercase font-extrabold text-on-tertiary">
            EMERGENCY STOP (ALL MOTORS)
          </span>
        </button>
      </div>
    </div>
  );
};
