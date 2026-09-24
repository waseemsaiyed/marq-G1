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
  const [contacts, setContacts] = useState<ContactDetails>(() => getContactDetails());
  const [recipientType, setRecipientType] = useState<'doctor' | 'family'>('doctor');
  const [sharePhone, setSharePhone] = useState(() => contacts.doctorPhone);
  const [shareEmail, setShareEmail] = useState(() => contacts.doctorEmail);
  const [enable2HrReminder, setEnable2HrReminder] = useState(true);
  const [reminderInterval, setReminderInterval] = useState(7200); // 2 hours in seconds
  const [secondsLeft, setSecondsLeft] = useState(7200);
  const [showBroadcastReminderAlert, setShowBroadcastReminderAlert] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string>('Never');

  // Sync state if patient profile or global contacts updates
  useEffect(() => {
    const handleContactsChange = (e: any) => {
      if (e.detail) {
        const updated = e.detail as ContactDetails;
        setContacts(updated);
        if (recipientType === 'doctor') {
          setSharePhone(updated.doctorPhone);
          setShareEmail(updated.doctorEmail);
        } else {
          setSharePhone(updated.familyContactPhone);
          setShareEmail(updated.familyContactEmail);
        }
      }
    };
    window.addEventListener('marq_contacts_changed', handleContactsChange);
    return () => {
      window.removeEventListener('marq_contacts_changed', handleContactsChange);
    };
  }, [recipientType]);

  // Handle switching recipient types
  useEffect(() => {
    if (recipientType === 'doctor') {
      setSharePhone(contacts.doctorPhone);
      setShareEmail(contacts.doctorEmail);
    } else {
      setSharePhone(contacts.familyContactPhone);
      setShareEmail(contacts.familyContactEmail);
    }
  }, [recipientType, contacts]);

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
      const next = Math.max(40, Math.min(85, prev.overallHeight + delta));
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
    <div className="flex flex-col w-full gap-4 max-w-lg mx-auto pb-6">
      {/* Top Patient & Bed Live Status Card */}
      <div className="bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3 relative overflow-hidden border border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">
                airline_seat_flat
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-bold text-slate-900 font-mono">
                  {bedState.connectedBedId || 'Bed Controller'}
                </span>
                
                {/* Zero-Pill unboxed statuses with typography separators */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-700">Active</span>
                </div>
                
                <span className="text-slate-300">·</span>

                <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    patientProfile.stability === 'Stable'
                      ? 'bg-emerald-500'
                      : patientProfile.stability === 'Critical'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`} />
                  <span className={
                    patientProfile.stability === 'Stable'
                      ? 'text-emerald-700'
                      : patientProfile.stability === 'Critical'
                      ? 'text-rose-700 animate-pulse'
                      : 'text-amber-700'
                  }>
                    {patientProfile.stability}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-0.5">
                <span className="font-bold text-slate-800">{patientProfile.name || bedState.patientName}</span>
                <span>·</span>
                <span className="font-mono">{bedState.roomNumber}</span>
                <span>·</span>
                <span>{patientProfile.age}y / {patientProfile.sex}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
              <span className="material-symbols-outlined text-[13px] text-emerald-500">
                bolt
              </span>
              <span className="text-[10px] font-bold font-mono text-slate-800">
                {bedState.batteryPercent}%
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">
              AC Charging
            </span>
          </div>
        </div>

        {/* Patient Vitals & Mass Live Clinical Snapshot - No nesting boxes, clean flat list with vertical dividers */}
        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
              <span className="material-symbols-outlined text-primary text-[15px]">
                vital_signs
              </span>
              <span>Telemetry Snapshot</span>
            </div>
            {onOpenPatientChart && (
              <button
                id="btn-edit-patient-chart"
                onClick={() => onOpenPatientChart('mass')}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
              >
                <span>Edit Chart</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
              </button>
            )}
          </div>

          {/* Clean vertical grid with dividers, no box cards */}
          <div className="grid grid-cols-4 divide-x divide-slate-200/70 text-center py-1 bg-white/70 rounded-lg border border-slate-200/30">
            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('mass')}
              className="flex flex-col items-center justify-center cursor-pointer px-0.5"
            >
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Mass</span>
              <span className="text-xs sm:text-[13px] font-black text-primary font-mono tabular-nums leading-tight">
                {bedState.patientWeight || patientProfile.massKg} <span className="text-[9px] font-normal text-slate-400">kg</span>
              </span>
            </div>

            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('vitals')}
              className="flex flex-col items-center justify-center cursor-pointer px-0.5"
            >
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">HR</span>
              <span className="text-xs sm:text-[13px] font-black text-rose-600 font-mono tabular-nums leading-tight">
                {patientProfile.vitals.heartRate} <span className="text-[9px] font-normal text-slate-400">bpm</span>
              </span>
            </div>

            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('vitals')}
              className="flex flex-col items-center justify-center cursor-pointer px-0.5"
            >
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">BP</span>
              <span className="text-xs sm:text-[13px] font-black text-indigo-600 font-mono tabular-nums leading-tight">
                {patientProfile.vitals.bloodPressureSys}/{patientProfile.vitals.bloodPressureDia}
              </span>
            </div>

            <div
              onClick={() => onOpenPatientChart && onOpenPatientChart('vitals')}
              className="flex flex-col items-center justify-center cursor-pointer px-0.5"
            >
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">SpO2</span>
              <span className="text-xs sm:text-[13px] font-black text-sky-600 font-mono tabular-nums leading-tight">
                {patientProfile.vitals.spO2}%
              </span>
            </div>
          </div>

          {/* Quick Clinical Navigation - Segmented clean tab-style layout */}
          {onOpenPatientChart && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              <button
                onClick={() => onOpenPatientChart('mass')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Mass &amp; Stability</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('vitals')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Vitals</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('trends')}
                className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[10px] font-bold text-primary whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Trends</span>
              </button>

              <button
                onClick={() => onOpenPatientChart('diagnostic')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 whitespace-nowrap flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Reports ({patientProfile.diagnosticReports.length})</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">BLE 5.0 Synchronized</span>
          </div>
          <div className="flex items-center gap-0.5 text-primary">
            <span className="material-symbols-outlined text-[12px]">
              shield
            </span>
            <span className="font-bold">Guardian Active</span>
          </div>
        </div>
      </div>

      {/* Direct Clinical Telemetry & Broadcaster Card */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-slate-200/60 flex flex-col gap-3 relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">share</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Bedside Telemetry Broadcaster
              </h4>
              <p className="text-[9.5px] text-slate-400 font-semibold leading-none mt-0.5">
                Instant WhatsApp &amp; Email updates to Physician/Family
              </p>
            </div>
          </div>
          <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">
            Broadcast v1.2
          </span>
        </div>

        {/* 2-Hour Share Countdown Tracker - Sleek flat section, no box boxes */}
        <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`material-symbols-outlined text-primary text-[18px] ${enable2HrReminder ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }}>
              schedule
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-800">
                  Scheduler Interval
                </span>
                <span className={`text-[8px] font-extrabold px-1 rounded ${enable2HrReminder ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200/60 text-slate-500'}`}>
                  {enable2HrReminder ? 'Active' : 'Muted'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Standard clinical synchronization frequency.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <div className="text-xs font-bold font-mono text-primary tabular-nums tracking-wide">
              {enable2HrReminder ? formatTime(secondsLeft) : '--:--:--'}
            </div>
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
              Countdown
            </span>
          </div>
        </div>

        {/* Broadcast Reminder Alert Pop-up */}
        {showBroadcastReminderAlert && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3 flex flex-col gap-2.5 animate-in slide-in-from-top-1">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 animate-pulse mt-0.5">
                notifications_active
              </span>
              <div className="flex-1 text-left">
                <span className="text-xs font-bold text-amber-800">
                  Interval Elapsed (2-Hour Clock)
                </span>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-tight">
                  Patient vitals and clinical report update cycle has elapsed. Please broadcast current stats.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setSecondsLeft(reminderInterval);
                  setShowBroadcastReminderAlert(false);
                }}
                className="px-2.5 py-1 text-[9.5px] font-bold text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
              >
                Dismiss Alert
              </button>
              <button
                onClick={() => {
                  triggerWhatsApp();
                }}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[9.5px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
              >
                <span>Broadcast WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Share Recipient Details Form */}
        <div className="flex flex-col gap-2.5 bg-slate-50/20 p-2.5 rounded-xl border border-slate-200/40">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Recipient Contact
            </span>
            <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
              <button
                type="button"
                onClick={() => setRecipientType('doctor')}
                className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                  recipientType === 'doctor'
                    ? 'bg-primary text-white'
                    : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                🩺 Attending
              </button>
              <button
                type="button"
                onClick={() => setRecipientType('family')}
                className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md cursor-pointer transition-all ${
                  recipientType === 'family'
                    ? 'bg-primary text-white'
                    : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                🏠 Family
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Phone</span>
              <input
                type="text"
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
                placeholder="e.g. +15553829912"
                className="p-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-primary font-mono font-bold text-slate-800"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Email Address"
                className="p-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-primary font-bold text-slate-800"
              />
            </div>
          </div>

          <div className="text-[9.5px] text-slate-400 leading-none">
            {recipientType === 'doctor' ? (
              <span>Currently sending to: <strong className="text-slate-600 font-bold">{contacts.doctorName}</strong> (Physician)</span>
            ) : (
              <span>Currently sending to: <strong className="text-slate-600 font-bold">{contacts.familyContactName}</strong> ({contacts.familyContactRelation})</span>
            )}
          </div>
        </div>

        {/* Share Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* WhatsApp Button */}
          <button
            onClick={triggerWhatsApp}
            className="h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold text-xs shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span>Broadcast WhatsApp</span>
          </button>

          {/* Email Button */}
          <button
            onClick={triggerEmail}
            className="h-[38px] rounded-xl bg-primary hover:bg-primary-container active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold text-xs shadow-2xs"
          >
            <span className="material-symbols-outlined text-[16px]">mail</span>
            <span>Broadcast Email</span>
          </button>
        </div>

        {/* Scheduler Controls Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-[10px] gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-slate-500 font-medium">
            <span className="font-bold">Scheduler Actions:</span>
            <button
              type="button"
              onClick={() => {
                setEnable2HrReminder(!enable2HrReminder);
                setSecondsLeft(reminderInterval);
              }}
              className="text-primary hover:underline px-1 py-0.5 hover:bg-slate-50 rounded"
            >
              {enable2HrReminder ? 'Pause' : 'Resume'}
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                setReminderInterval(7200);
                setSecondsLeft(7200);
                setEnable2HrReminder(true);
                setShowBroadcastReminderAlert(false);
              }}
              className="text-primary hover:underline px-1 py-0.5 hover:bg-slate-50 rounded"
            >
              Reset 2h
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                setReminderInterval(15);
                setSecondsLeft(15);
                setEnable2HrReminder(true);
                setShowBroadcastReminderAlert(false);
              }}
              className="text-amber-700 hover:underline px-1 py-0.5 hover:bg-slate-50 rounded"
              title="Test the countdown in 15 seconds"
            >
              Test (15s)
            </button>
          </div>

          <div className="text-slate-400 font-semibold font-mono">
            Sent: <span className="text-slate-700 font-bold">{lastBroadcastTime}</span>
          </div>
        </div>
      </div>

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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  arrow_upward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  arrow_downward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  arrow_upward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
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
                className="h-[52px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 hover:border-slate-300 transition-all select-none cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-primary">
                  arrow_downward
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-0.5">
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
              className="h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">
                vertical_align_top
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
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
              className="h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">
                vertical_align_bottom
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
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
              className={`h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border transition-all cursor-pointer ${
                bedState.activePreset === 'zerog'
                  ? 'border-primary bg-blue-50/50'
                  : 'border-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-primary">
                airline_seat_recline_extra
              </span>
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">
                Zero-G
              </span>
            </button>
            <button
              id="btn-preset-flat"
              onClick={setFlat}
              className={`h-[48px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border transition-all cursor-pointer ${
                bedState.activePreset === 'flat'
                  ? 'border-primary bg-blue-50/50'
                  : 'border-slate-200/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-slate-700">
                horizontal_rule
              </span>
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wider">
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
            className="h-[50px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
              Trendelenburg
            </span>
            <span className="text-[8px] text-slate-400 font-semibold">Head Down</span>
          </button>
          <button
            id="btn-trend-level"
            onClick={() => adjustTilt(-bedState.tiltAngle)}
            className="h-[50px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700">
              Level 0°
            </span>
            <span className="text-[8px] text-slate-400 font-semibold">Reset</span>
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
            className="h-[50px] rounded-lg bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center border border-slate-200/50 transition-all select-none cursor-pointer"
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
              Rev. Trend
            </span>
            <span className="text-[8px] text-slate-400 font-semibold">Head Up</span>
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
