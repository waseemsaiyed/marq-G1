import React, { useState, useEffect } from 'react';
import { BedState, PatientChartTabKey, PatientProfile } from '../types';
import { getPatientProfile } from '../services/patientStorage';
import { getContactDetails, ContactDetails } from '../services/contactStorage';

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
  const [reminderInterval, setReminderInterval] = useState(7200);
  const [secondsLeft, setSecondsLeft] = useState(7200);
  const [showBroadcastReminderAlert, setShowBroadcastReminderAlert] = useState(false);
  const [lastBroadcastTime, setLastBroadcastTime] = useState<string>('Never');
  const [showBroadcaster, setShowBroadcaster] = useState(false);

  // Quick Presets State
  interface QuickPreset {
    id: string;
    name: string;
    headAngle: number;
    kneeAngle: number;
    overallHeight: number;
    tiltAngle: number;
  }

  const DEFAULT_QUICK_PRESETS: QuickPreset[] = [
    { id: 'fowler', name: "Fowler's Position", headAngle: 45, kneeAngle: 15, overallHeight: 58, tiltAngle: 0 },
    { id: 'semi_fowler', name: "Semi-Fowler's", headAngle: 30, kneeAngle: 10, overallHeight: 52, tiltAngle: 0 },
    { id: 'trendelenburg', name: "Trendelenburg", headAngle: 0, kneeAngle: 0, overallHeight: 50, tiltAngle: -12 },
    { id: 'flat_rest', name: "Flat Rest", headAngle: 0, kneeAngle: 0, overallHeight: 45, tiltAngle: 0 },
  ];

  const [quickPresets, setQuickPresets] = useState<QuickPreset[]>(() => {
    const saved = localStorage.getItem('marq_quick_presets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_QUICK_PRESETS;
  });

  const [newPresetName, setNewPresetName] = useState('');
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);

  const saveCurrentAsPreset = () => {
    if (!newPresetName.trim()) return;
    const newPreset: QuickPreset = {
      id: 'preset_' + Date.now(),
      name: newPresetName.trim(),
      headAngle: bedState.headAngle,
      kneeAngle: bedState.kneeAngle,
      overallHeight: bedState.overallHeight,
      tiltAngle: bedState.tiltAngle,
    };
    const updated = [newPreset, ...quickPresets];
    setQuickPresets(updated);
    localStorage.setItem('marq_quick_presets', JSON.stringify(updated));
    setNewPresetName('');
    setShowSavePresetModal(false);
  };

  const applyPreset = (preset: QuickPreset) => {
    setBedState((prev) => ({
      ...prev,
      headAngle: preset.headAngle,
      kneeAngle: preset.kneeAngle,
      overallHeight: preset.overallHeight,
      tiltAngle: preset.tiltAngle,
      activePreset: preset.id,
    }));
  };

  const deletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = quickPresets.filter(p => p.id !== id);
    setQuickPresets(updated);
    localStorage.setItem('marq_quick_presets', JSON.stringify(updated));
  };

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

  useEffect(() => {
    if (recipientType === 'doctor') {
      setSharePhone(contacts.doctorPhone);
      setShareEmail(contacts.doctorEmail);
    } else {
      setSharePhone(contacts.familyContactPhone);
      setShareEmail(contacts.familyContactEmail);
    }
  }, [recipientType, contacts]);

  useEffect(() => {
    if (!enable2HrReminder) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setShowBroadcastReminderAlert(true);
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

        {/* Patient Vitals & Mass Live Clinical Snapshot */}
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
        </div>
      </div>

      {/* Direct Clinical Telemetry & Broadcaster Card (Collapsible) */}
      <div className="bg-white rounded-xl p-3 shadow-xs border border-slate-200/60 flex flex-col gap-2 relative overflow-hidden">
        <div 
          onClick={() => setShowBroadcaster(!showBroadcaster)}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">share</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <span>Bedside Telemetry Broadcaster</span>
                <span className="text-[9px] font-normal text-slate-400">({showBroadcaster ? 'Hide' : 'Show'})</span>
              </h4>
              <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">
                Instant WhatsApp &amp; Email clinical updates
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-[18px]">
            {showBroadcaster ? 'expand_less' : 'expand_more'}
          </span>
        </div>

        {showBroadcaster && (
          <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-200/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-primary text-[16px] ${enable2HrReminder ? 'animate-spin' : ''}`} style={{ animationDuration: '10s' }}>
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
                  <p className="text-[9.5px] text-slate-400 font-medium">
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

            {showBroadcastReminderAlert && (
              <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-2.5 flex flex-col gap-2 animate-in slide-in-from-top-1">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-amber-600 text-[16px] shrink-0 animate-pulse mt-0.5">
                    notifications_active
                  </span>
                  <div className="flex-1 text-left">
                    <span className="text-xs font-bold text-amber-800">
                      Interval Elapsed (2-Hour Clock)
                    </span>
                    <p className="text-[9.5px] text-slate-500 font-medium mt-0.5 leading-tight">
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
                    className="px-2 py-0.5 text-[9px] font-bold text-slate-400 hover:text-slate-600 rounded cursor-pointer transition-colors"
                  >
                    Dismiss Alert
                  </button>
                  <button
                    onClick={() => {
                      triggerWhatsApp();
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[9.5px] font-bold rounded flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                  >
                    <span>Broadcast WhatsApp</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 bg-slate-50/20 p-2 rounded-xl border border-slate-200/40">
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
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={triggerWhatsApp}
                className="h-[34px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold text-xs shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">chat</span>
                <span>Broadcast WhatsApp</span>
              </button>

              <button
                onClick={triggerEmail}
                className="h-[34px] rounded-xl bg-primary hover:bg-primary-container active:scale-95 text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold text-xs shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">mail</span>
                <span>Broadcast Email</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Presets Feature Card */}
      <div className="w-full bg-white rounded-xl p-4 shadow-xs flex flex-col gap-3 border border-slate-200/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">bookmark_star</span>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Quick Bed Presets
              </h3>
              <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">
                Save &amp; recall common clinical configurations in 1 tap
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSavePresetModal(true)}
            className="px-2.5 py-1 bg-primary hover:bg-primary-container text-white text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-2xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[13px]">add</span>
            <span>Save Current</span>
          </button>
        </div>

        {/* Save Preset Inline Modal / Popover */}
        {showSavePresetModal && (
          <div className="bg-slate-50 border border-primary/30 rounded-xl p-3 flex flex-col gap-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Save Current Bed State as Preset
              </span>
              <button
                onClick={() => setShowSavePresetModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono bg-white p-1.5 rounded border border-slate-200/60">
              <span>Head: {bedState.headAngle}°</span>
              <span>·</span>
              <span>Knee: {bedState.kneeAngle}°</span>
              <span>·</span>
              <span>Height: {bedState.overallHeight}cm</span>
              <span>·</span>
              <span>Tilt: {bedState.tiltAngle}°</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Post-Op Thoracic Position"
                className="flex-1 p-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-primary font-bold text-slate-800"
              />
              <button
                onClick={saveCurrentAsPreset}
                className="px-3 py-1.5 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-2xs"
              >
                Save Preset
              </button>
            </div>
          </div>
        )}

        {/* Presets Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {quickPresets.map((preset) => {
            const isActive = bedState.activePreset === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-2.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all group ${
                  isActive
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-slate-200/60 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-slate-800'}`}>
                      {preset.name}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                      H:{preset.headAngle}° · K:{preset.kneeAngle}° · Z:{preset.overallHeight}cm
                    </span>
                  </div>
                  {preset.id.startsWith('preset_') && (
                    <button
                      onClick={(e) => deletePreset(preset.id, e)}
                      className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Delete custom preset"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200/40 text-[9px]">
                  <span className={`font-extrabold uppercase ${isActive ? 'text-primary' : 'text-slate-500'}`}>
                    {isActive ? 'Active Configuration' : 'Tap to Recall'}
                  </span>
                  <span className="material-symbols-outlined text-[13px] text-slate-400 group-hover:translate-x-0.5 transition-transform">
                    play_arrow
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
