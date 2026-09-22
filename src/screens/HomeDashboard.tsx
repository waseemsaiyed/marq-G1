import React, { useRef, useEffect, useState } from 'react';
import { BedState, PatientProfile } from '../types';
import { BedVisualizer } from '../components/BedVisualizer';
import { getPatientProfile } from '../services/patientStorage';

interface HomeDashboardProps {
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  onTriggerEStop: () => void;
  onTriggerNurseCall: () => void;
  onOpenPatientChart?: (tab?: 'vitals' | 'mass' | 'diagnostic' | 'medication' | 'doctor' | 'emergency') => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  bedState,
  setBedState,
  onTriggerEStop,
  onTriggerNurseCall,
  onOpenPatientChart,
}) => {
  const [patientProfile, setPatientProfile] = useState<PatientProfile>(() =>
    getPatientProfile(bedState.connectedBedId || 'ICU Bed 03')
  );

  useEffect(() => {
    const handleProfileChange = (e: any) => {
      if (e.detail) {
        setPatientProfile(e.detail);
      } else {
        setPatientProfile(getPatientProfile(bedState.connectedBedId || 'ICU Bed 03'));
      }
    };
    window.addEventListener('marq_patient_profile_changed', handleProfileChange);
    return () => {
      window.removeEventListener('marq_patient_profile_changed', handleProfileChange);
    };
  }, [bedState.connectedBedId]);

  useEffect(() => {
    setPatientProfile(getPatientProfile(bedState.connectedBedId || 'ICU Bed 03'));
  }, [bedState.connectedBedId]);

  // Share and Broadcast States
  const [sharePhone, setSharePhone] = useState(() => patientProfile.emergencyNotes?.emergencyContactPhone || '+15553829912');
  const [shareEmail, setShareEmail] = useState('attending.doctor@marq-clinical.com');
  const [enable2HrReminder, setEnable2HrReminder] = useState(true);
  const [reminderInterval, setReminderInterval] = useState(7200); // 2 hours in seconds
  const [secondsLeft, setSecondsLeft] = useState(7200);
  const [showBroadcastReminderAlert, setShowBroadcastReminderAlert] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string>('Never');

  // Sync state if patient profile updates
  useEffect(() => {
    if (patientProfile.emergencyNotes?.emergencyContactPhone) {
      setSharePhone(patientProfile.emergencyNotes.emergencyContactPhone);
    }
  }, [patientProfile]);

  // Visual Timer Ticker
  useEffect(() => {
    if (!enable2HrReminder) return;
    
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setShowBroadcastReminderAlert(true);
          // Play a gentle audible alert
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
            setTimeout(() => {
              const osc2 = ctx.createOscillator();
              osc2.type = 'sine';
              osc2.frequency.setValueAtTime(1046.5, ctx.currentTime);
              const gain2 = ctx.createGain();
              gain2.gain.setValueAtTime(0.15, ctx.currentTime);
              osc2.connect(gain2);
              gain2.connect(ctx.destination);
              osc2.start();
              osc2.stop(ctx.currentTime + 0.2);
            }, 200);
          } catch (e) {
            console.log('Audio Blocked', e);
          }
          return reminderInterval;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [enable2HrReminder, reminderInterval]);

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatReport = () => {
    const stabilityEmoji = patientProfile.stability === 'Stable' ? '🟢' : patientProfile.stability === 'Critical' ? '🔴' : '🟡';
    const vitals = patientProfile.vitals;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let text = `📋 *MARQ W-1 CLINICAL BEDSIDE BROADCAST*\n`;
    text += `------------------------------------\n`;
    text += `🏥 *Bed/Location:* ${patientProfile.bedId} (${bedState.roomNumber || 'Room 412'})\n`;
    text += `👤 *Patient:* ${patientProfile.name} (${patientProfile.sex}, ${patientProfile.age} yrs)\n`;
    text += `🆔 *MRN:* ${patientProfile.mrn}  |  🩸 *Blood:* ${patientProfile.bloodType}\n`;
    text += `⚖️ *Current Weight:* ${bedState.patientWeight || patientProfile.massKg} kg\n`;
    text += `${stabilityEmoji} *Stability Status:* ${patientProfile.stability}\n\n`;

    text += `📈 *LATEST CLINICAL VITALS (${vitals.recordedAt || 'Recent'}):*\n`;
    text += `• Heart Rate: ${vitals.heartRate} bpm\n`;
    text += `• Blood Pressure: ${vitals.bloodPressureSys}/${vitals.bloodPressureDia} mmHg\n`;
    text += `• SpO2 (Oxygen Sat): ${vitals.spO2}%\n`;
    text += `• Resp Rate: ${vitals.respiratoryRate} bpm\n`;
    text += `• Temp: ${vitals.temperatureC}°C\n`;
    text += `• Pain Score: ${vitals.painScore}/10\n\n`;

    if (patientProfile.diagnosticReports && patientProfile.diagnosticReports.length > 0) {
      text += `🔬 *DIAGNOSTIC REPORTS:* \n`;
      patientProfile.diagnosticReports.slice(0, 2).forEach(r => {
        const statusEmoji = r.status === 'Normal' ? '✅' : r.status === 'Critical' ? '🚨' : '⚠️';
        text += `• [${r.category}] ${r.title}: ${r.summary} (${statusEmoji} ${r.status})\n`;
      });
      text += `\n`;
    }

    if (patientProfile.medications && patientProfile.medications.length > 0) {
      text += `💊 *ACTIVE MEDICATIONS:*\n`;
      patientProfile.medications.slice(0, 2).forEach(m => {
        text += `• ${m.name} (${m.dosage}, ${m.route}) - ${m.frequency}\n`;
      });
      text += `\n`;
    }

    text += `⚙️ *MARQ W-1 Bed Settings:*\n`;
    text += `• Head Angle: ${bedState.headAngle}°\n`;
    text += `• Knee Angle: ${bedState.kneeAngle}°\n`;
    text += `• Bed Height: ${bedState.overallHeight} cm\n\n`;

    text += `🕒 Broadcast generated at ${nowStr}. Broadcast interval set to every 2 hours.`;
    return text;
  };

  const triggerWhatsApp = () => {
    const text = formatReport();
    const cleanedPhone = sharePhone.replace(/[^\d+]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanedPhone)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    setLastBroadcastTime(timeStr);
    setSecondsLeft(reminderInterval);
    setShowBroadcastReminderAlert(false);
  };

  const triggerEmail = () => {
    const text = formatReport();
    const plainText = text.replace(/\*/g, '');
    const subject = `MARQ W-1 Clinical Telemetry Broadcast: ${patientProfile.name} (${patientProfile.bedId})`;
    const url = `mailto:${shareEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
    window.open(url, '_blank');

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    setLastBroadcastTime(timeStr);
    setSecondsLeft(reminderInterval);
    setShowBroadcastReminderAlert(false);
  };

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
      const next = Math.max(0, Math.min(90, prev.headAngle + delta));
      return { ...prev, headAngle: next, activePreset: null };
    });
  };

  const adjustKnee = (delta: number) => {
    setBedState((prev) => {
      const next = Math.max(0, Math.min(35, prev.kneeAngle + delta));
      return { ...prev, kneeAngle: next, activePreset: null };
    });
  };

  const adjustTilt = (delta: number) => {
    setBedState((prev) => {
      const next = Math.max(-90, Math.min(90, prev.tiltAngle + delta));
      return { ...prev, tiltAngle: next, activePreset: next !== 0 ? 'trendelenburg' : null };
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
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[17px] font-bold text-on-surface">
                  {bedState.connectedBedId || 'Bed Controller'}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                  Active
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                    patientProfile.stability === 'Stable'
                      ? 'bg-emerald-100 text-emerald-800'
                      : patientProfile.stability === 'Critical'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {patientProfile.stability}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium mt-0.5">
                <span className="font-bold text-on-surface">{patientProfile.name || bedState.patientName}</span>
                <span>•</span>
                <span>{bedState.roomNumber}</span>
                <span>•</span>
                <span>{patientProfile.age}y / {patientProfile.sex}</span>
              </div>
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

        {/* Patient Vitals & Mass Live Clinical Snapshot */}
        <div className="bg-surface-container-low/70 rounded-xl p-2.5 border border-outline-variant/15 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-on-surface font-bold">
              <span className="material-symbols-outlined text-primary text-[16px]">
                vital_signs
              </span>
              <span>Patient Vitals &amp; Mass</span>
            </div>
            {onOpenPatientChart && (
              <button
                id="btn-edit-patient-chart"
                onClick={() => onOpenPatientChart('mass')}
                className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>Edit Chart</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('mass')}
              className="bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant/20 hover:border-primary/40 transition-colors cursor-pointer"
              title="Click to view/edit mass & stability"
            >
              <div className="text-[9px] font-bold text-outline uppercase">Mass</div>
              <div className="text-xs font-black text-primary">
                {bedState.patientWeight || patientProfile.massKg} kg
              </div>
            </div>

            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('vitals')}
              className="bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant/20 hover:border-primary/40 transition-colors cursor-pointer"
              title="Click to view/edit vitals"
            >
              <div className="text-[9px] font-bold text-outline uppercase">Heart Rate</div>
              <div className="text-xs font-black text-tertiary">
                {patientProfile.vitals.heartRate} bpm
              </div>
            </div>

            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('vitals')}
              className="bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant/20 hover:border-primary/40 transition-colors cursor-pointer"
              title="Click to view/edit blood pressure"
            >
              <div className="text-[9px] font-bold text-outline uppercase">BP</div>
              <div className="text-xs font-black text-indigo-700">
                {patientProfile.vitals.bloodPressureSys}/{patientProfile.vitals.bloodPressureDia}
              </div>
            </div>

            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('vitals')}
              className="bg-surface-container-lowest p-1.5 rounded-lg border border-outline-variant/20 hover:border-primary/40 transition-colors cursor-pointer"
              title="Click to view/edit SpO2"
            >
              <div className="text-[9px] font-bold text-outline uppercase">SpO2</div>
              <div className="text-xs font-black text-sky-700">
                {patientProfile.vitals.spO2}%
              </div>
            </div>
          </div>

          {/* Quick Clinical Navigation Pills */}
          {onOpenPatientChart && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              <button
                onClick={() => onOpenPatientChart('mass')}
                className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[13px] text-primary">scale</span>
                <span>Mass &amp; Stability</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('vitals')}
                className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[13px] text-tertiary">ecg_heart</span>
                <span>Vitals</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('diagnostic')}
                className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[13px] text-teal-700">biomedical</span>
                <span>Reports ({patientProfile.diagnosticReports.length})</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('medication')}
                className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[13px] text-emerald-700">medication</span>
                <span>Meds ({patientProfile.medications.length})</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('doctor')}
                className="px-2 py-1 rounded-md bg-surface-container hover:bg-surface-variant text-[10px] font-bold text-on-surface whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[13px] text-primary">clinical_notes</span>
                <span>Doctor Visits</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('emergency')}
                className="px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-800 whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[13px] text-red-700">e911_emergency</span>
                <span>Emergency Notes</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10 bg-surface-container-low px-3 py-1.5 rounded-lg">
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

      {/* Direct Clinical Telemetry & Broadcaster Card (Email & WhatsApp) */}
      <div className="bg-surface-container-lowest rounded-xl p-4 shadow-md border border-outline-variant/15 flex flex-col gap-3.5 relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">share</span>
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-on-surface">
                MARQ W-1 Clinical Telemetry Broadcast
              </h4>
              <p className="text-[10px] text-outline font-semibold">
                Direct WhatsApp &amp; Email Doctor/Family Updates
              </p>
            </div>
          </div>
          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 tracking-wider">
            Broadcaster v1.2
          </span>
        </div>

        {/* 2-Hour Share Countdown Tracker */}
        <div className="bg-surface-container/60 rounded-xl p-3 border border-outline-variant/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className={`material-symbols-outlined text-[20px] ${enable2HrReminder ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
                schedule
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-on-surface">
                  2-Hour Broadcast Scheduler
                </span>
                <span className={`text-[8.5px] font-extrabold px-1 py-0.2 rounded uppercase ${enable2HrReminder ? 'bg-emerald-500/15 text-emerald-800' : 'bg-outline-variant/20 text-outline'}`}>
                  {enable2HrReminder ? 'ACTIVE' : 'MUTED'}
                </span>
              </div>
              <p className="text-[10px] text-on-surface-variant font-medium leading-tight">
                Recommended clinical frequency of update broadcasts.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className="text-[13px] font-black font-mono text-primary tabular-nums">
              {enable2HrReminder ? formatTime(secondsLeft) : '--:--:--'}
            </div>
            <span className="text-[9px] text-outline font-semibold">
              Next schedule alert
            </span>
          </div>
        </div>

        {/* Broadcast Reminder Alert Pop-up */}
        {showBroadcastReminderAlert && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 animate-pulse mt-0.5">
                notifications_active
              </span>
              <div className="flex-1">
                <span className="text-xs font-black text-amber-800 leading-none">
                  2-Hour Interval Elapsed
                </span>
                <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 leading-tight">
                  Please broadcast the current vitals, medications and clinical reports log immediately to ensure continuous clinical alignment.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSecondsLeft(reminderInterval);
                  setShowBroadcastReminderAlert(false);
                }}
                className="px-2.5 py-1 text-[10px] font-bold text-on-surface-variant hover:bg-surface-container rounded-md cursor-pointer transition-colors"
              >
                Mute Alert
              </button>
              <button
                onClick={() => {
                  triggerWhatsApp();
                }}
                className="px-3 py-1 bg-amber-600 text-white text-[10px] font-black rounded-md flex items-center gap-1 cursor-pointer hover:bg-amber-700 active:scale-95 transition-all shadow-2xs"
              >
                <span className="material-symbols-outlined text-[13px]">share</span>
                <span>Send WhatsApp Now</span>
              </button>
            </div>
          </div>
        )}

        {/* Share Recipient Details Form */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-bold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">call</span>
              <span>WhatsApp Recipient</span>
            </label>
            <input
              type="text"
              value={sharePhone}
              onChange={(e) => setSharePhone(e.target.value)}
              placeholder="Phone (e.g. +15553829912)"
              className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container/30 focus:outline-primary font-bold text-on-surface"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10.5px] font-bold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">mail</span>
              <span>Email Recipient</span>
            </label>
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="Doctor's email"
              className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container/30 focus:outline-primary font-bold text-on-surface"
            />
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* WhatsApp Button */}
          <button
            onClick={triggerWhatsApp}
            className="h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(16,185,129,0.2)] transition-all cursor-pointer font-bold text-xs"
          >
            <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.742.002-2.602-1.005-5.05-2.834-6.88C16.671 2.152 14.225.992 11.64.992 6.208.992 1.782 5.362 1.778 10.733c-.001 1.639.453 3.21 1.312 4.6l-.993 3.629 3.73-.974h.22z" />
            </svg>
            <span>Broadcast WhatsApp</span>
          </button>

          {/* Email Button */}
          <button
            onClick={triggerEmail}
            className="h-[44px] rounded-xl bg-primary hover:bg-primary-container active:scale-95 text-white flex items-center justify-center gap-1.5 shadow-[0_4px_12px_rgba(0,79,140,0.2)] transition-all cursor-pointer font-bold text-xs"
          >
            <span className="material-symbols-outlined text-[20px]">
              mail
            </span>
            <span>Broadcast Email</span>
          </button>
        </div>

        {/* Scheduler Controls Footer */}
        <div className="flex items-center justify-between pt-1.5 border-t border-outline-variant/10 text-[11px] gap-1 flex-wrap">
          <div className="flex items-center gap-1 text-on-surface-variant font-medium flex-wrap">
            <span className="font-bold">Timer Controls:</span>
            <button
              type="button"
              onClick={() => {
                setEnable2HrReminder(!enable2HrReminder);
                setSecondsLeft(reminderInterval);
              }}
              className="px-1.5 py-0.5 rounded bg-surface-container hover:bg-surface-variant text-[10px] font-black uppercase text-primary transition-colors cursor-pointer"
            >
              {enable2HrReminder ? 'Pause Timer' : 'Resume Timer'}
            </button>
            <span className="text-outline">|</span>
            <button
              type="button"
              onClick={() => {
                setReminderInterval(7200);
                setSecondsLeft(7200);
                setEnable2HrReminder(true);
                setShowBroadcastReminderAlert(false);
              }}
              className="text-primary font-bold hover:underline"
            >
              Reset to 2hr
            </button>
            <span className="text-outline">|</span>
            <button
              type="button"
              onClick={() => {
                setReminderInterval(15);
                setSecondsLeft(15);
                setEnable2HrReminder(true);
                setShowBroadcastReminderAlert(false);
              }}
              className="text-tertiary font-bold hover:underline"
              title="Set to 15 seconds for testing the reminder pop-up alert."
            >
              Test (15s)
            </button>
          </div>

          <div className="text-outline font-semibold">
            Last sent: <span className="font-bold text-on-surface">{lastBroadcastTime}</span>
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
        tiltAngle={bedState.tiltAngle}
      />

      {/* Section 1: Head & Knee Actuation Tiles */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-extrabold text-outline uppercase tracking-wider px-1">
          Primary Articulations
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Head Section Control Card */}
          <div className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col gap-1.5 sm:gap-2 border border-outline-variant/15">
            <div className="flex justify-between items-center px-1">
              <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
                Head Gatch
              </span>
              <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold">
                0°-90°
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
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
                className="h-[60px] sm:h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  arrow_upward
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 uppercase tracking-wide">
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
                className="h-[60px] sm:h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  arrow_downward
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                  Lower
                </span>
              </button>
            </div>
            <span className="text-[9.5px] sm:text-[10px] leading-none text-center text-outline uppercase font-extrabold">
              HOLD FOR AUTO-STOP
            </span>
          </div>

          {/* Knee / Foot Section Control Card */}
          <div className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col gap-1.5 sm:gap-2 border border-outline-variant/15">
            <div className="flex justify-between items-center px-1">
              <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
                Knee Break
              </span>
              <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold">
                0°-35°
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
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
                className="h-[60px] sm:h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  arrow_upward
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 uppercase tracking-wide">
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
                className="h-[60px] sm:h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                  arrow_downward
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                  Lower
                </span>
              </button>
            </div>
            <span className="text-[9.5px] sm:text-[10px] leading-none text-center text-outline uppercase font-extrabold">
              HOLD FOR AUTO-STOP
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Height & Quick Flat / Zero-G */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {/* Bed Elevation Module */}
        <div className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col justify-between gap-1.5 sm:gap-2 border border-outline-variant/15">
          <div className="flex justify-between items-center px-1">
            <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
              Bed Elevation
            </span>
            <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-secondary font-bold">
              40-85cm
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
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
              className="h-[60px] sm:h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                vertical_align_top
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 uppercase tracking-wide">
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
              className="h-[60px] sm:h-16 rounded-lg bg-surface-container flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px] sm:text-[24px]">
                vertical_align_bottom
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 uppercase tracking-wide">
                Lower
              </span>
            </button>
          </div>
        </div>

        {/* Quick Return & Zero-G */}
        <div className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col justify-between gap-1.5 sm:gap-2 border border-outline-variant/15">
          <div className="flex justify-between items-center px-1">
            <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
              Rapid Align
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-outline">
              Auto-Cycle
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <button
              id="btn-preset-zerog"
              onClick={setZeroG}
              className={`h-[60px] sm:h-16 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 transition-all select-none cursor-pointer ${
                bedState.activePreset === 'zerog'
                  ? 'ring-2 ring-primary bg-primary/10'
                  : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-primary">
                airline_seat_recline_extra
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 text-on-surface uppercase tracking-wide">
                Zero-G
              </span>
            </button>
            <button
              id="btn-preset-flat"
              onClick={setFlat}
              className={`h-[60px] sm:h-16 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_3px_0_0_#dcd9d9] active:shadow-none active:translate-y-1 transition-all select-none cursor-pointer ${
                bedState.activePreset === 'flat'
                  ? 'ring-2 ring-primary bg-primary/10'
                  : ''
              }`}
            >
              <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-on-surface-variant">
                horizontal_rule
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold mt-0.5 text-on-surface uppercase tracking-wide">
                Flat 0°
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2B: Trendelenburg Longitudinal Tilt (0° to 90°) */}
      <div className="bg-surface-container-lowest rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col gap-1.5 sm:gap-2 border border-outline-variant/15">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] sm:text-[18px] text-secondary">
              swap_vert
            </span>
            <span className="text-[12px] sm:text-[13px] font-bold text-on-surface">
              Trendelenburg Tilt Plane
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded bg-surface-container text-secondary font-bold">
              0°-90° Limit
            </span>
            <span className="text-[10.5px] sm:text-[11px] font-extrabold text-secondary tabular-nums">
              {bedState.tiltAngle === 0
                ? '0° Neutral'
                : `${Math.abs(bedState.tiltAngle)}° ${bedState.tiltAngle < 0 ? 'Trendelenburg' : 'Rev. Trend'}`}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
            className="h-[52px] sm:h-14 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_2.5px_0_0_#dcd9d9] active:shadow-none active:translate-y-0.5 active:bg-secondary active:text-on-secondary transition-all select-none cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-secondary">
                south
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
                Trendelenburg
              </span>
            </div>
            <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">Head Down (0°-90°)</span>
          </button>
          <button
            id="btn-trend-level"
            onClick={() => adjustTilt(-bedState.tiltAngle)}
            className="h-[52px] sm:h-14 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_2.5px_0_0_#dcd9d9] active:shadow-none active:translate-y-0.5 transition-all select-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-on-surface-variant">
              horizontal_rule
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-on-surface">
              Level 0°
            </span>
            <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">Reset Horizontal</span>
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
            className="h-[52px] sm:h-14 rounded-lg bg-surface-container hover:bg-surface-variant flex flex-col items-center justify-center shadow-[0_2.5px_0_0_#dcd9d9] active:shadow-none active:translate-y-0.5 active:bg-primary active:text-on-primary transition-all select-none cursor-pointer"
          >
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-primary">
                north
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
                Rev. Trend
              </span>
            </div>
            <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">Head Up (0°-90°)</span>
          </button>
        </div>
      </div>

      {/* Section 3: Clinical Presets & Safety Incline */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10.5px] sm:text-[11px] font-extrabold text-outline uppercase tracking-wider px-1">
          Clinical Postures &amp; Profiles
        </span>
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {/* Cardiac Chair */}
          <button
            onClick={setCardiacChair}
            className={`h-[76px] sm:h-20 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center text-center shadow-md relative overflow-hidden active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'cardiac'
                ? 'bg-primary text-on-primary ring-2 ring-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] sm:text-[22px] mb-0.5 sm:mb-1 ${
                bedState.activePreset === 'cardiac' ? 'text-on-primary' : 'text-primary'
              }`}
            >
              chair
            </span>
            <span className="text-[10px] sm:text-[11px] leading-tight font-bold">
              Cardiac Chair
            </span>
            {bedState.activePreset === 'cardiac' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5 sm:mt-1" />
            )}
          </button>

          {/* Trendelenburg with Caution Badge */}
          <button
            onClick={setTrendelenburg}
            className={`h-[76px] sm:h-20 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center text-center shadow-md relative active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'trendelenburg'
                ? 'bg-secondary-fixed text-on-secondary-fixed ring-2 ring-secondary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="absolute top-1 right-1 text-secondary">
              <span className="material-symbols-outlined text-[12px] sm:text-[13px]">
                warning
              </span>
            </span>
            <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-secondary mb-0.5 sm:mb-1">
              swap_driving_apps
            </span>
            <span className="text-[10px] sm:text-[11px] leading-tight font-bold">
              Trendelenburg
            </span>
            <span className="text-[8.5px] sm:text-[9px] text-secondary font-bold">
              {bedState.tiltAngle !== 0 ? `Tilt ${Math.abs(bedState.tiltAngle)}°` : '0°-90° Limit'}
            </span>
          </button>

          {/* Memory Preset M1 */}
          <button
            onClick={setM1Sleep}
            className={`h-[76px] sm:h-20 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'sleep'
                ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-primary mb-0.5 sm:mb-1">
              bedtime
            </span>
            <span className="text-[10px] sm:text-[11px] leading-tight font-bold">
              M1: Sleep
            </span>
            <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">
              Head 15°
            </span>
          </button>

          {/* Memory Preset M2 */}
          <button
            onClick={setM2Exam}
            className={`h-[76px] sm:h-20 rounded-xl p-1.5 sm:p-2 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all cursor-pointer ${
              bedState.activePreset === 'exam'
                ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] sm:text-[22px] text-primary mb-0.5 sm:mb-1">
              medical_services
            </span>
            <span className="text-[10px] sm:text-[11px] leading-tight font-bold">
              M2: Exam
            </span>
            <span className="text-[8.5px] sm:text-[9px] text-outline font-semibold">
              High/Flat
            </span>
          </button>
        </div>
      </div>

      {/* Halting Emergency Strip */}
      <div className="mt-1 sm:mt-2 w-full">
        <button
          onClick={onTriggerEStop}
          id="e-stop-bar"
          className="w-full h-[58px] sm:h-16 rounded-2xl bg-tertiary text-on-tertiary flex items-center justify-between px-3.5 sm:px-5 shadow-[0_6px_20px_rgba(159,0,15,0.35)] active:brightness-90 active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px] sm:text-[26px]">
                emergency_home
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[15px] sm:text-[18px] font-extrabold tracking-wide leading-tight">
                EMERGENCY STOP
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold opacity-90">
                Instant relay cut-off across BLE &amp; Wi-Fi
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[24px] sm:text-[28px]">
            pan_tool
          </span>
        </button>
      </div>
    </div>
  );
};
