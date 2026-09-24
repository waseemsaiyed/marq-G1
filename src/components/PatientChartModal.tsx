import React, { useState, useEffect } from 'react';
import {
  BedState,
  PatientProfile,
  StabilityLevel,
  MobilityLevel,
  CodeStatusType,
  DiagnosticReport,
  MedicationRecord,
  DoctorVisitLog,
  VitalsReading,
  PatientChartTabKey,
} from '../types';
import {
  getPatientProfile,
  savePatientProfile,
  resetPatientProfile,
  capturePatientVitals,
} from '../services/patientStorage';
import {
  generateVitalsCsv,
  downloadVitalsCsv,
  shareVitalsCsv,
  copyVitalsCsvToClipboard,
  getVitalsCsvFilename,
  getClinicalVitalsStatus,
} from '../services/vitalsExportService';
import { VitalsTrendPageView } from './VitalsTrendPageView';
import {
  GOOGLE_APPS_SCRIPT_TEMPLATE,
  getGoogleSheetUrl,
  extractGoogleSpreadsheetId,
  downloadGoogleSheetsCSV,
  copyForGoogleSheets,
  syncToGoogleSheetsWebhook,
  getGlobalGoogleSheetsConfig,
  saveGlobalGoogleSheetsConfig,
} from '../utils/googleSheetsSync';

interface PatientChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  bedState: BedState;
  setBedState: React.Dispatch<React.SetStateAction<BedState>>;
  initialTab?: PatientChartTabKey;
}

type TabKey = PatientChartTabKey;

export const PatientChartModal: React.FC<PatientChartModalProps> = ({
  isOpen,
  onClose,
  bedState,
  setBedState,
  initialTab = 'mass',
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [profile, setProfile] = useState<PatientProfile>(() =>
    getPatientProfile(bedState.connectedBedId || 'ICU Bed 03')
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Form states for adding items
  const [showAddReport, setShowAddReport] = useState(false);
  const [newReport, setNewReport] = useState<Partial<DiagnosticReport>>({
    category: 'Lab Work',
    status: 'Normal',
  });

  const [showAddMed, setShowAddMed] = useState(false);
  const [newMed, setNewMed] = useState<Partial<MedicationRecord>>({
    route: 'Oral (PO)',
    status: 'Active',
  });

  const [showAddVisit, setShowAddVisit] = useState(false);
  const [newVisit, setNewVisit] = useState<Partial<DoctorVisitLog>>({});

  const [newAllergy, setNewAllergy] = useState('');
  const [newPrecaution, setNewPrecaution] = useState('');

  // Vitals CSV export & capture states
  const [showCsvPreviewModal, setShowCsvPreviewModal] = useState(false);
  const [csvPreviewText, setCsvPreviewText] = useState('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Google Sheets states
  const [googleSheetUrlInput, setGoogleSheetUrlInput] = useState(() => {
    const globalCfg = getGlobalGoogleSheetsConfig();
    return profile.googleSheetConfig?.spreadsheetId
      ? getGoogleSheetUrl(profile.googleSheetConfig.spreadsheetId) || ''
      : globalCfg.spreadsheetId
      ? getGoogleSheetUrl(globalCfg.spreadsheetId) || ''
      : '';
  });
  const [googleWebhookUrlInput, setGoogleWebhookUrlInput] = useState(() => {
    return profile.googleSheetConfig?.webhookUrl || getGlobalGoogleSheetsConfig().webhookUrl || '';
  });
  const [googleAutoSync, setGoogleAutoSync] = useState(() => {
    return profile.googleSheetConfig?.autoSyncOnSave !== false;
  });
  const [isSyncingToSheet, setIsSyncingToSheet] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);

  // Reload profile when modal opens or bed switches
  useEffect(() => {
    if (isOpen) {
      const p = getPatientProfile(bedState.connectedBedId || 'ICU Bed 03');
      // Sync mass from bedState if present
      if (bedState.patientWeight) {
        p.massKg = bedState.patientWeight;
      }
      if (bedState.patientName && bedState.patientName !== 'Unassigned') {
        p.name = bedState.patientName;
      }
      setProfile(p);
      setActiveTab(initialTab);
      if (p.googleSheetConfig?.spreadsheetId) {
        setGoogleSheetUrlInput(getGoogleSheetUrl(p.googleSheetConfig.spreadsheetId) || '');
      }
      if (p.googleSheetConfig?.webhookUrl) {
        setGoogleWebhookUrlInput(p.googleSheetConfig.webhookUrl);
      }
    }
  }, [isOpen, bedState.connectedBedId, bedState.patientWeight, bedState.patientName, initialTab]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(null), 3200);
  };

  const handleUpdateField = <K extends keyof PatientProfile>(
    field: K,
    value: PatientProfile[K]
  ) => {
    const updated = { ...profile, [field]: value };
    setProfile(updated);
    savePatientProfile(updated);

    // If updating name or mass, sync with bedState
    if (field === 'name') {
      setBedState((prev) => ({ ...prev, patientName: String(value) }));
    }
    if (field === 'massKg') {
      setBedState((prev) => ({ ...prev, patientWeight: Number(value) }));
    }
    if (field === 'stability') {
      setBedState((prev) => ({ ...prev, patientStability: value as StabilityLevel }));
    }
    showFeedback('Saved changes');
  };

  const handleUpdateVitals = (vitalsPatch: Partial<VitalsReading>) => {
    const updatedVitals: VitalsReading = {
      ...profile.vitals,
      ...vitalsPatch,
      recordedAt: 'Just now',
    };
    const updated: PatientProfile = {
      ...profile,
      vitals: updatedVitals,
    };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Vitals updated');
  };

  // Capture current vitals into history with exact timestamp and log entry
  const handleCaptureVitals = (customNote?: string) => {
    const patch = customNote !== undefined ? { notes: customNote } : {};
    const { profile: updatedProfile, capturedReading } = capturePatientVitals(
      profile,
      patch,
      'Authorized Nurse / Clinician'
    );
    setProfile(updatedProfile);
    showFeedback(`Captured reading ${capturedReading.id} (${capturedReading.recordedAt})`);
  };

  // Remove an erroneous vitals reading from history
  const handleDeleteVitals = (id?: string) => {
    if (!id || !profile.vitalsHistory) return;
    const updatedHistory = profile.vitalsHistory.filter((v) => v.id !== id);
    const updated = {
      ...profile,
      vitalsHistory: updatedHistory,
    };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Vitals reading removed from history');
  };

  // Load a historical vitals reading into active editor inputs
  const handleRestoreVitals = (reading: VitalsReading) => {
    const updated: PatientProfile = {
      ...profile,
      vitals: {
        ...reading,
        recordedAt: 'Restored from ' + reading.recordedAt,
      },
    };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback(`Loaded vitals reading ${reading.id || ''}`);
  };

  // Download Formatted CSV
  const handleDownloadCsv = (readings?: VitalsReading[]) => {
    try {
      const res = downloadVitalsCsv(profile, readings);
      if (res.success) {
        showFeedback(`Downloaded CSV: ${res.filename}`);
      }
    } catch {
      showFeedback('Failed to generate or download CSV');
    }
  };

  // Share CSV directly (Web Share API Level 2 with native file sheet, fallback to clipboard/download)
  const handleShareCsv = async (readings?: VitalsReading[]) => {
    setIsExportingCsv(true);
    try {
      const result = await shareVitalsCsv(profile, readings);
      showFeedback(result.message);
    } catch {
      showFeedback('Could not share vitals CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Copy CSV to clipboard
  const handleCopyCsv = async (readings?: VitalsReading[]) => {
    const ok = await copyVitalsCsvToClipboard(profile, readings);
    if (ok) {
      showFeedback('Formatted CSV copied to clipboard!');
    } else {
      showFeedback('Could not copy CSV to clipboard');
    }
  };

  // Open CSV live preview overlay
  const handleOpenCsvPreview = (readings?: VitalsReading[]) => {
    const text = generateVitalsCsv(profile, readings);
    setCsvPreviewText(text);
    setShowCsvPreviewModal(true);
    setShowExportDropdown(false);
  };

  // Google Sheets Action Handlers
  const handleSaveGoogleSheetConfig = () => {
    const extractedId = extractGoogleSpreadsheetId(googleSheetUrlInput) || (googleSheetUrlInput.trim().length > 15 ? googleSheetUrlInput.trim() : undefined);
    const updatedConfig = {
      webhookUrl: googleWebhookUrlInput.trim(),
      spreadsheetId: extractedId,
      sheetName: 'Vitals Stream',
      autoSyncOnSave: googleAutoSync,
      lastSyncTime: profile.googleSheetConfig?.lastSyncTime,
      syncCount: profile.googleSheetConfig?.syncCount || 0,
    };
    const updated = {
      ...profile,
      googleSheetConfig: updatedConfig,
    };
    setProfile(updated);
    savePatientProfile(updated);
    saveGlobalGoogleSheetsConfig(updatedConfig);
    showFeedback('✓ Google Sheet configuration saved & linked!');
  };

  const handleSyncToGoogleSheetsNow = async () => {
    const targetUrl = googleWebhookUrlInput.trim() || profile.googleSheetConfig?.webhookUrl;
    if (!targetUrl) {
      showFeedback('Please provide a Google Apps Script Webhook URL below.');
      return;
    }
    setIsSyncingToSheet(true);
    try {
      const extractedId = extractGoogleSpreadsheetId(googleSheetUrlInput) || profile.googleSheetConfig?.spreadsheetId;
      const bedTelemetry = {
        connectedBedId: bedState.connectedBedId,
        headAngle: bedState.headAngle,
        kneeAngle: bedState.kneeAngle,
        bedHeight: bedState.bedHeight,
        trendelenburgAngle: bedState.trendelenburgAngle,
        batteryPercent: bedState.batteryPercent,
        isCharging: bedState.isCharging,
      };
      const res = await syncToGoogleSheetsWebhook(
        targetUrl,
        profile,
        profile.auditLogs || [],
        bedTelemetry,
        extractedId
      );
      if (res.success) {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedConfig = {
          ...(profile.googleSheetConfig || { autoSyncOnSave: true }),
          webhookUrl: targetUrl,
          spreadsheetId: extractedId,
          lastSyncTime: timeNow,
          syncCount: (profile.googleSheetConfig?.syncCount || 0) + 1,
        };
        const updated = { ...profile, googleSheetConfig: updatedConfig };
        setProfile(updated);
        savePatientProfile(updated);
        saveGlobalGoogleSheetsConfig(updatedConfig);
        showFeedback('✓ Telemetry successfully collected into your Google Sheet!');
      } else {
        showFeedback(`Sync Error: ${res.message}`);
      }
    } catch (err: any) {
      showFeedback(`Sync Failed: ${err?.message || 'Check network connection'}`);
    } finally {
      setIsSyncingToSheet(false);
    }
  };

  const handleCopyGoogleSheetsData = async () => {
    const success = await copyForGoogleSheets(profile);
    if (success) {
      showFeedback('✓ Formatted table copied! Paste (Ctrl+V) into Cell A1 of Google Sheet.');
    } else {
      showFeedback('Failed to copy table to clipboard');
    }
  };

  const handleDownloadGoogleSheetsCsv = () => {
    downloadGoogleSheetsCSV(profile);
    showFeedback('✓ Google Sheets CSV downloaded');
  };

  const handleCopyAppsScriptCode = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setCopiedScript(true);
      showFeedback('✓ Google Apps Script code copied to clipboard!');
      setTimeout(() => setCopiedScript(false), 3000);
    }
  };

  // Add new diagnostic report
  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.title) return;
    const reportItem: DiagnosticReport = {
      id: 'rep-' + Date.now(),
      title: newReport.title,
      category: newReport.category || 'Lab Work',
      date: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      doctor: newReport.doctor || 'Attending Physician',
      summary: newReport.summary || 'Findings documented within normal clinical limits.',
      status: newReport.status || 'Normal',
    };
    const updatedReports = [reportItem, ...profile.diagnosticReports];
    const updated = { ...profile, diagnosticReports: updatedReports };
    setProfile(updated);
    savePatientProfile(updated);
    setNewReport({ category: 'Lab Work', status: 'Normal' });
    setShowAddReport(false);
    showFeedback(`Added "${reportItem.title}"`);
  };

  const handleDeleteReport = (id: string) => {
    const updatedReports = profile.diagnosticReports.filter((r) => r.id !== id);
    const updated = { ...profile, diagnosticReports: updatedReports };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Report removed');
  };

  // Add new medication
  const handleCreateMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMed.name || !newMed.dosage) return;
    const medItem: MedicationRecord = {
      id: 'med-' + Date.now(),
      name: newMed.name,
      dosage: newMed.dosage,
      route: newMed.route || 'Oral (PO)',
      frequency: newMed.frequency || 'Daily',
      nextDue: newMed.nextDue || 'Upcoming',
      prescribedBy: newMed.prescribedBy || 'Attending Physician',
      instructions: newMed.instructions || '',
      status: newMed.status || 'Active',
    };
    const updatedMeds = [medItem, ...profile.medications];
    const updated = { ...profile, medications: updatedMeds };
    setProfile(updated);
    savePatientProfile(updated);
    setNewMed({ route: 'Oral (PO)', status: 'Active' });
    setShowAddMed(false);
    showFeedback(`Added medication "${medItem.name}"`);
  };

  const handleDeleteMed = (id: string) => {
    const updatedMeds = profile.medications.filter((m) => m.id !== id);
    const updated = { ...profile, medications: updatedMeds };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Medication removed');
  };

  const handleToggleMedStatus = (id: string) => {
    const updatedMeds = profile.medications.map((m) => {
      if (m.id === id) {
        const nextStatus = m.status === 'Active' ? 'Held' : 'Active';
        return { ...m, status: nextStatus as 'Active' | 'Held' };
      }
      return m;
    });
    const updated = { ...profile, medications: updatedMeds };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Medication status toggled');
  };

  // Add doctor visit
  const handleCreateVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisit.doctorName) return;
    const visitItem: DoctorVisitLog = {
      id: 'vis-' + Date.now(),
      doctorName: newVisit.doctorName,
      specialty: newVisit.specialty || 'General Medicine',
      visitDate: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clinicalObservations: newVisit.clinicalObservations || 'Patient examined at bedside.',
      orders: newVisit.orders || 'Maintain current treatment plan.',
    };
    const updatedVisits = [visitItem, ...profile.doctorVisits];
    const updated = { ...profile, doctorVisits: updatedVisits };
    setProfile(updated);
    savePatientProfile(updated);
    setNewVisit({});
    setShowAddVisit(false);
    showFeedback(`Logged visit with ${visitItem.doctorName}`);
  };

  const handleDeleteVisit = (id: string) => {
    const updatedVisits = profile.doctorVisits.filter((v) => v.id !== id);
    const updated = { ...profile, doctorVisits: updatedVisits };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Doctor visit entry removed');
  };

  // Emergency Allergies & Precautions
  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return;
    const updated = {
      ...profile,
      emergencyNotes: {
        ...profile.emergencyNotes,
        allergies: [...profile.emergencyNotes.allergies, newAllergy.trim()],
      },
    };
    setProfile(updated);
    savePatientProfile(updated);
    setNewAllergy('');
    showFeedback('Allergy added');
  };

  const handleRemoveAllergy = (allergy: string) => {
    const updated = {
      ...profile,
      emergencyNotes: {
        ...profile.emergencyNotes,
        allergies: profile.emergencyNotes.allergies.filter((a) => a !== allergy),
      },
    };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Allergy removed');
  };

  const handleAddPrecaution = () => {
    if (!newPrecaution.trim()) return;
    const updated = {
      ...profile,
      emergencyNotes: {
        ...profile.emergencyNotes,
        precautions: [...profile.emergencyNotes.precautions, newPrecaution.trim()],
      },
    };
    setProfile(updated);
    savePatientProfile(updated);
    setNewPrecaution('');
    showFeedback('Precaution added');
  };

  const handleRemovePrecaution = (precaution: string) => {
    const updated = {
      ...profile,
      emergencyNotes: {
        ...profile.emergencyNotes,
        precautions: profile.emergencyNotes.precautions.filter((p) => p !== precaution),
      },
    };
    setProfile(updated);
    savePatientProfile(updated);
    showFeedback('Precaution removed');
  };

  const handleReset = () => {
    const p = resetPatientProfile(bedState.connectedBedId || 'ICU Bed 03');
    setProfile(p);
    setBedState((prev) => ({
      ...prev,
      patientName: p.name,
      patientWeight: p.massKg,
      patientStability: p.stability,
    }));
    showFeedback('Reset to default clinical profile');
  };

  // BMI Calculation
  const heightM = (profile.heightCm || 175) / 100;
  const bmi = (profile.massKg / (heightM * heightM)).toFixed(1);

  // Tabs List
  const tabs: { key: TabKey; label: string; icon: string; badge?: string | number }[] = [
    { key: 'mass', label: 'Patient Info & Mass', icon: 'person' },
    {
      key: 'vitals',
      label: 'Vitals',
      icon: 'vital_signs',
      badge: profile.vitalsHistory?.length || 1,
    },
    {
      key: 'trends',
      label: 'Trends',
      icon: 'trending_up',
      badge: 'Arrows',
    },
    { key: 'diagnostic', label: 'Diagnostics', icon: 'biomedical', badge: profile.diagnosticReports.length },
    { key: 'medication', label: 'Medications', icon: 'medication', badge: profile.medications.length },
    { key: 'doctor', label: 'Doctor Visits', icon: 'clinical_notes', badge: profile.doctorVisits.length },
    { key: 'emergency', label: 'Emergency Notes', icon: 'warning', badge: profile.emergencyNotes.allergies.length ? '!' : undefined },
    {
      key: 'sheets',
      label: 'Google Sheets',
      icon: 'table_chart',
      badge: profile.googleSheetConfig?.webhookUrl ? 'Live' : undefined,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[24px]">
                badge
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-on-surface">
                  Patient Clinical Profile &amp; Chart
                </h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  profile.stability === 'Stable'
                    ? 'bg-emerald-100 text-emerald-800'
                    : profile.stability === 'Critical'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {profile.stability}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-medium">
                {bedState.connectedBedId || 'Bed Controller'} • {bedState.roomNumber || 'Room 412'} • MRN: {profile.mrn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadCsv()}
              className="text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs border border-primary/20"
              title="Quick Download Formatted Vitals CSV"
            >
              <span className="material-symbols-outlined text-[15px]">file_download</span>
              <span className="hidden sm:inline">Export Vitals CSV</span>
              <span className="sm:hidden">CSV</span>
            </button>
            <button
              onClick={handleReset}
              className="text-[11px] font-bold text-outline hover:text-on-surface hover:bg-surface-container px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Reset profile to standard demo clinical values"
            >
              Reset Demo
            </button>
            <button
              onClick={onClose}
              id="btn-close-patient-modal"
              className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {savedNotice && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 flex items-center justify-between shadow-xs transition-all">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>{savedNotice}</span>
            </div>
            <span className="text-[10px] opacity-80">Synced to Bed Telemetry</span>
          </div>
        )}

        {/* Patient Identity Quick Bar */}
        <div className="px-5 py-2.5 bg-surface-container-lowest border-b border-outline-variant/15 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant font-medium">Name:</span>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => handleUpdateField('name', e.target.value)}
                className="font-bold text-on-surface bg-surface-container/60 hover:bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 text-xs focus:outline-primary w-28 sm:w-32"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant font-medium">Age:</span>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => handleUpdateField('age', Number(e.target.value))}
                className="font-bold text-on-surface bg-surface-container/60 hover:bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 text-xs focus:outline-primary w-12 sm:w-14"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant font-medium">Sex:</span>
              <select
                value={profile.sex}
                onChange={(e) => handleUpdateField('sex', e.target.value as 'Male' | 'Female' | 'Other')}
                className="font-bold text-on-surface bg-surface-container/60 hover:bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 text-xs focus:outline-primary cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-on-surface-variant font-medium">Blood:</span>
              <select
                value={profile.bloodType}
                onChange={(e) => handleUpdateField('bloodType', e.target.value)}
                className="font-bold text-on-surface bg-surface-container/60 hover:bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/30 text-xs focus:outline-primary cursor-pointer"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-outline">
            <span>Code: <strong className="text-tertiary">{profile.emergencyNotes.codeStatus}</strong></span>
            <span>•</span>
            <span>Fall Risk: <strong className="text-amber-700">{profile.emergencyNotes.fallRisk}</strong></span>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-outline-variant/20 bg-surface-container-low/50 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container hover:bg-surface-variant text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-variant text-on-surface'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          
          {/* TAB 1: PATIENT DEMOGRAPHICS, MASS & STABILITY */}
          {activeTab === 'mass' && (
            <div className="flex flex-col gap-4">
              {/* Patient Identification & Demographics Form */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      assignment_ind
                    </span>
                    <h4 className="text-sm font-extrabold text-on-surface">
                      Patient Details &amp; Demographics
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface-variant font-mono">
                    MRN: {profile.mrn}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface-variant">
                      Patient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      value={profile.name}
                      onChange={(e) => handleUpdateField('name', e.target.value)}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary font-bold text-on-surface"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface-variant">
                        Age
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="125"
                        value={profile.age}
                        onChange={(e) => handleUpdateField('age', Number(e.target.value))}
                        className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary font-bold text-on-surface"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface-variant">
                        Sex
                      </label>
                      <select
                        value={profile.sex}
                        onChange={(e) => handleUpdateField('sex', e.target.value as 'Male' | 'Female' | 'Other')}
                        className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary font-bold text-on-surface cursor-pointer"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface-variant">
                      Date of Birth (DOB)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1954-06-12"
                      value={profile.dob}
                      onChange={(e) => handleUpdateField('dob', e.target.value)}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary font-mono text-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface-variant">
                      Medical Record Number (MRN)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MED-8942-01"
                      value={profile.mrn}
                      onChange={(e) => handleUpdateField('mrn', e.target.value)}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary font-mono text-on-surface"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface-variant">
                      Blood Group &amp; Rh Factor
                    </label>
                    <select
                      value={profile.bloodType}
                      onChange={(e) => handleUpdateField('bloodType', e.target.value)}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary font-bold text-on-surface cursor-pointer"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-on-surface-variant">
                      Assigned Room / Unit
                    </label>
                    <div className="p-2 text-xs rounded-lg border border-outline-variant/20 bg-surface-container-lowest/60 text-on-surface-variant font-mono flex items-center justify-between">
                      <span>{bedState.roomNumber || 'Room 412'}</span>
                      <span className="text-[10px] text-primary font-bold">{bedState.connectedBedId || 'Unit Bed'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Integrated Bed Scale & Patient Mass */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">
                      scale
                    </span>
                    <h4 className="text-sm font-extrabold text-on-surface">
                      Integrated Bed Scale &amp; Patient Mass
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('trends')}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                      title="View weight delta and trend analysis"
                    >
                      <span className="material-symbols-outlined text-[15px]">trending_up</span>
                      <span>Weight Trends</span>
                    </button>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-primary-container text-on-primary-container">
                      OIML Class III ±0.05kg
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {/* Mass / Weight Input */}
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase">
                      Patient Mass (Weight)
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="350"
                        value={profile.massKg}
                        onChange={(e) => handleUpdateField('massKg', Number(e.target.value))}
                        className="text-3xl font-black text-primary bg-transparent focus:outline-none w-24 border-b border-primary/40 focus:border-primary"
                      />
                      <span className="text-base font-bold text-on-surface-variant">kg</span>
                      <span className="text-xs text-outline font-mono ml-auto">
                        ({(profile.massKg * 2.20462).toFixed(1)} lbs)
                      </span>
                    </div>
                    <span className="text-[10px] text-outline mt-1">
                      Direct scale sensor calibration
                    </span>
                  </div>

                  {/* Height & BMI */}
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase">
                      Height &amp; BMI Index
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <input
                        type="number"
                        min="100"
                        max="240"
                        value={profile.heightCm}
                        onChange={(e) => handleUpdateField('heightCm', Number(e.target.value))}
                        className="text-2xl font-black text-on-surface bg-transparent focus:outline-none w-16 border-b border-outline-variant focus:border-primary"
                      />
                      <span className="text-xs font-bold text-on-surface-variant">cm</span>
                      <div className="ml-auto flex flex-col items-end">
                        <span className="text-lg font-black text-primary leading-none">
                          {bmi}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">
                          {Number(bmi) < 18.5
                            ? 'Underweight'
                            : Number(bmi) < 25
                            ? 'Normal'
                            : Number(bmi) < 30
                            ? 'Overweight'
                            : 'Obese'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-outline mt-1">
                      Body Mass Index metric
                    </span>
                  </div>

                  {/* Tare Offset */}
                  <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-on-surface-variant uppercase">
                      Tare Calibration Offset
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <input
                        type="number"
                        step="0.1"
                        value={profile.tareOffsetKg}
                        onChange={(e) => handleUpdateField('tareOffsetKg', Number(e.target.value))}
                        className="text-2xl font-black text-on-surface bg-transparent focus:outline-none w-16 border-b border-outline-variant focus:border-primary"
                      />
                      <span className="text-xs font-bold text-on-surface-variant">kg</span>
                      <span className="text-[10px] text-outline ml-auto">Bedding + Lines</span>
                    </div>
                    <button
                      onClick={() => handleUpdateField('tareOffsetKg', -2.1)}
                      className="text-[10px] font-bold text-primary hover:underline text-left mt-1 cursor-pointer"
                    >
                      Reset Default Tare (-2.1 kg)
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient Clinical Stability Section */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-tertiary text-[22px]">
                      ecg_heart
                    </span>
                    <h4 className="text-sm font-extrabold text-on-surface">
                      Clinical Stability &amp; Posture Sentry
                    </h4>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    Care Protocol Routing
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Current Patient Stability Status:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        'Stable',
                        'Guarded',
                        'Critical',
                        'Post-Op Monitoring',
                        'Observation',
                      ] as StabilityLevel[]
                    ).map((lvl) => {
                      const isSelected = profile.stability === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => handleUpdateField('stability', lvl)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            isSelected
                              ? lvl === 'Stable'
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : lvl === 'Critical'
                                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                                : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:border-outline'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/15">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Mobility &amp; Bed Exit Guarding Level:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        'Independent',
                        'Assisted Turn',
                        'Bed-to-Chair Assist',
                        'Total Bedbound',
                      ] as MobilityLevel[]
                    ).map((mob) => {
                      const isSelected = profile.mobility === mob;
                      return (
                        <button
                          key={mob}
                          type="button"
                          onClick={() => handleUpdateField('mobility', mob)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-on-primary border-primary shadow-xs'
                              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant/30 hover:border-outline'
                          }`}
                        >
                          {mob}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT VITALS & CSV TELEMETRY EXPORT */}
          {activeTab === 'vitals' && (
            <div className="flex flex-col gap-4">
              {/* Header & Export Control Panel */}
              <div className="bg-surface-container-low p-3.5 sm:p-4 rounded-xl border border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-extrabold text-on-surface">
                      Real-time Patient Vitals &amp; Telemetry
                    </h4>
                    {(() => {
                      const status = getClinicalVitalsStatus(profile.vitals);
                      const isAlert =
                        status.includes('Hypoxemia') ||
                        status.includes('Severe') ||
                        status.includes('Pyrexia');
                      const isWarning =
                        status.includes('Tachycardia') ||
                        status.includes('Hypertensive') ||
                        status.includes('Borderline') ||
                        status.includes('Hypotensive');
                      return (
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isAlert
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : isWarning
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {status}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Recorded: <strong>{profile.vitals.recordedAt}</strong> •{' '}
                    <span>{profile.vitalsHistory?.length || 1} readings in clinical timeline</span>
                  </p>
                </div>

                {/* Action Buttons: Capture & CSV Export Tools */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Capture Button */}
                  <button
                    onClick={() => handleCaptureVitals()}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary-container transition-all active:scale-98"
                    title="Capture current vital values into timeline with timestamp"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_chart</span>
                    <span>Capture Reading</span>
                  </button>

                  {/* CSV Export Button Group */}
                  <div className="flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-0.5 shadow-2xs">
                    <button
                      onClick={() => handleDownloadCsv()}
                      className="px-2.5 py-1 text-xs font-bold text-on-surface hover:text-primary hover:bg-surface-container rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Download formatted CSV file to device"
                    >
                      <span className="material-symbols-outlined text-[15px] text-primary">download</span>
                      <span>CSV</span>
                    </button>

                    <button
                      onClick={() => handleShareCsv()}
                      disabled={isExportingCsv}
                      className="px-2 py-1 text-xs font-bold text-on-surface hover:text-primary hover:bg-surface-container rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Share CSV file directly via mobile share sheet"
                    >
                      <span
                        className={`material-symbols-outlined text-[15px] text-primary ${
                          isExportingCsv ? 'animate-spin' : ''
                        }`}
                      >
                        {isExportingCsv ? 'sync' : 'share'}
                      </span>
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    <button
                      onClick={() => handleCopyCsv()}
                      className="px-2 py-1 text-xs font-bold text-on-surface hover:text-primary hover:bg-surface-container rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copy formatted CSV text to clipboard"
                    >
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                        content_copy
                      </span>
                    </button>

                    <button
                      onClick={() => handleOpenCsvPreview()}
                      className="px-2 py-1 text-xs font-bold text-on-surface hover:text-primary hover:bg-surface-container rounded flex items-center gap-1 transition-colors cursor-pointer"
                      title="Preview formatted CSV rows before export"
                    >
                      <span className="material-symbols-outlined text-[15px] text-on-surface-variant">
                        visibility
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dedicated Trend Indicator Page Callout Banner */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">trending_up</span>
                  </div>
                  <div className="text-xs">
                    <span className="font-extrabold text-on-surface">Vital Signs &amp; Weight Trend Indicators</span>
                    <p className="text-[11px] text-on-surface-variant">View arrow trend indicators (stable, increasing, decreasing) on the dedicated Trends page.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('trends')}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold hover:bg-primary-container flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs shrink-0 whitespace-nowrap"
                >
                  <span>Open Trends Page</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Vitals Input Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* Heart Rate */}
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-tertiary">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Heart Rate</span>
                    <span className="material-symbols-outlined text-[18px]">favorite</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <input
                      type="number"
                      value={profile.vitals.heartRate}
                      onChange={(e) => handleUpdateVitals({ heartRate: Number(e.target.value) })}
                      className="text-3xl font-black text-on-surface bg-transparent focus:outline-none w-20 border-b border-outline-variant focus:border-tertiary"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">bpm</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] font-bold ${
                        profile.vitals.heartRate < 60 || profile.vitals.heartRate > 100
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {profile.vitals.heartRate > 100
                        ? 'Tachycardia (>100)'
                        : profile.vitals.heartRate < 60
                        ? 'Bradycardia (<60)'
                        : 'Normal (60-100)'}
                    </span>
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-indigo-700">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Blood Pressure</span>
                    <span className="material-symbols-outlined text-[18px]">speed</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <input
                      type="number"
                      value={profile.vitals.bloodPressureSys}
                      onChange={(e) => handleUpdateVitals({ bloodPressureSys: Number(e.target.value) })}
                      className="text-2xl font-black text-on-surface bg-transparent focus:outline-none w-14 border-b border-outline-variant focus:border-indigo-600"
                    />
                    <span className="text-lg font-bold text-outline">/</span>
                    <input
                      type="number"
                      value={profile.vitals.bloodPressureDia}
                      onChange={(e) => handleUpdateVitals({ bloodPressureDia: Number(e.target.value) })}
                      className="text-2xl font-black text-on-surface bg-transparent focus:outline-none w-14 border-b border-outline-variant focus:border-indigo-600"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">mmHg</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] font-bold ${
                        profile.vitals.bloodPressureSys >= 140 || profile.vitals.bloodPressureDia >= 90
                          ? 'text-amber-600'
                          : profile.vitals.bloodPressureSys < 90
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {profile.vitals.bloodPressureSys >= 140
                        ? 'Stage 2 HTN'
                        : profile.vitals.bloodPressureSys >= 130
                        ? 'Stage 1 HTN'
                        : profile.vitals.bloodPressureSys < 90
                        ? 'Hypotension'
                        : 'Normotensive'}
                    </span>
                  </div>
                </div>

                {/* SpO2 */}
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-sky-700">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Oxygen (SpO2)</span>
                    <span className="material-symbols-outlined text-[18px]">air</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <input
                      type="number"
                      min="70"
                      max="100"
                      value={profile.vitals.spO2}
                      onChange={(e) => handleUpdateVitals({ spO2: Number(e.target.value) })}
                      className="text-3xl font-black text-on-surface bg-transparent focus:outline-none w-16 border-b border-outline-variant focus:border-sky-600"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] font-bold ${
                        profile.vitals.spO2 < 92
                          ? 'text-red-600'
                          : profile.vitals.spO2 < 95
                          ? 'text-amber-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {profile.vitals.spO2 < 92 ? 'Hypoxia Alert (<92%)' : 'Target ≥ 94%'}
                    </span>
                  </div>
                </div>

                {/* Respiratory Rate */}
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-teal-700">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Resp Rate</span>
                    <span className="material-symbols-outlined text-[18px]">lungs</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <input
                      type="number"
                      value={profile.vitals.respiratoryRate}
                      onChange={(e) => handleUpdateVitals({ respiratoryRate: Number(e.target.value) })}
                      className="text-3xl font-black text-on-surface bg-transparent focus:outline-none w-16 border-b border-outline-variant focus:border-teal-600"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">rpm</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-1">Eupneic (12-20)</span>
                </div>

                {/* Body Temperature */}
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-amber-700">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Temp</span>
                    <span className="material-symbols-outlined text-[18px]">device_thermostat</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <input
                      type="number"
                      step="0.1"
                      value={profile.vitals.temperatureC}
                      onChange={(e) => handleUpdateVitals({ temperatureC: Number(e.target.value) })}
                      className="text-3xl font-black text-on-surface bg-transparent focus:outline-none w-20 border-b border-outline-variant focus:border-amber-600"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">°C</span>
                    <span className="text-[10px] text-outline font-mono ml-auto">
                      {((profile.vitals.temperatureC * 9) / 5 + 32).toFixed(1)}°F
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 ${
                      profile.vitals.temperatureC >= 38.0
                        ? 'text-red-600'
                        : profile.vitals.temperatureC < 36.0
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {profile.vitals.temperatureC >= 38.0
                      ? 'Pyrexia / Fever'
                      : profile.vitals.temperatureC < 36.0
                      ? 'Hypothermic'
                      : 'Afebrile (Norm)'}
                  </span>
                </div>

                {/* Pain Score */}
                <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-purple-700">
                    <span className="text-xs font-extrabold uppercase tracking-wide">Pain Score</span>
                    <span className="material-symbols-outlined text-[18px]">sentiment_neutral</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={profile.vitals.painScore}
                      onChange={(e) => handleUpdateVitals({ painScore: Number(e.target.value) })}
                      className="text-3xl font-black text-on-surface bg-transparent focus:outline-none w-14 border-b border-outline-variant focus:border-purple-600"
                    />
                    <span className="text-xs font-bold text-on-surface-variant">/ 10</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold mt-1 ${
                      profile.vitals.painScore >= 7
                        ? 'text-red-600'
                        : profile.vitals.painScore >= 4
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    {profile.vitals.painScore === 0
                      ? 'No Pain'
                      : profile.vitals.painScore <= 3
                      ? 'Mild Pain'
                      : profile.vitals.painScore <= 6
                      ? 'Moderate Pain'
                      : 'Severe Pain'}
                  </span>
                </div>
              </div>

              {/* Vitals Clinical Note */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface-variant">
                    Clinical Vitals Note (included in CSV row):
                  </label>
                  <span className="text-[10px] text-outline font-mono">
                    Auto-saved to patient profile
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={profile.vitals.notes || ''}
                  onChange={(e) => handleUpdateVitals({ notes: e.target.value })}
                  placeholder="e.g. Resting quietly in Fowler position, respiratory effort unlabored, peripheral pulses palpable..."
                  className="w-full text-xs p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:outline-primary leading-relaxed shadow-2xs"
                />
              </div>

              {/* Captured Vitals Timeline & Export History Table */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      history_toggle_off
                    </span>
                    <div>
                      <h5 className="text-xs font-extrabold text-on-surface uppercase tracking-wider">
                        Captured Vitals Timeline ({profile.vitalsHistory?.length || 1} Readings)
                      </h5>
                      <p className="text-[11px] text-on-surface-variant">
                        Timestamped readings included in CSV export document
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleDownloadCsv()}
                      className="px-2.5 py-1 text-[11px] font-extrabold text-primary hover:bg-primary/10 rounded-lg border border-primary/20 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Download all captured readings as formatted CSV"
                    >
                      <span className="material-symbols-outlined text-[14px]">file_download</span>
                      <span>Export All ({profile.vitalsHistory?.length || 1})</span>
                    </button>
                    <button
                      onClick={() => handleShareCsv()}
                      disabled={isExportingCsv}
                      className="px-2.5 py-1 text-[11px] font-extrabold text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-lg border border-outline-variant/30 flex items-center gap-1 cursor-pointer transition-colors"
                      title="Share formatted CSV directly"
                    >
                      <span className="material-symbols-outlined text-[14px]">share</span>
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>

                {/* Timeline Table */}
                <div className="overflow-x-auto rounded-lg border border-outline-variant/20 bg-surface-container-lowest">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-container text-on-surface-variant text-[10px] sm:text-[11px] font-extrabold border-b border-outline-variant/20 uppercase tracking-wider">
                        <th className="p-2 sm:p-2.5">Time / ID</th>
                        <th className="p-2 sm:p-2.5">HR</th>
                        <th className="p-2 sm:p-2.5">BP</th>
                        <th className="p-2 sm:p-2.5">SpO2</th>
                        <th className="p-2 sm:p-2.5">Temp</th>
                        <th className="p-2 sm:p-2.5">Resp</th>
                        <th className="p-2 sm:p-2.5">Pain</th>
                        <th className="p-2 sm:p-2.5">Assessment</th>
                        <th className="p-2 sm:p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 font-mono text-[11px]">
                      {(profile.vitalsHistory && profile.vitalsHistory.length > 0
                        ? profile.vitalsHistory
                        : [profile.vitals]
                      ).map((reading, idx) => {
                        const status = getClinicalVitalsStatus(reading);
                        const isNormal = status === 'Within Normal Limits (Stable)';
                        return (
                          <tr
                            key={reading.id || idx}
                            className="hover:bg-surface-container-low transition-colors group"
                          >
                            <td className="p-2 sm:p-2.5 font-bold text-on-surface whitespace-nowrap">
                              <span className="text-[10px] text-primary block font-sans font-extrabold">
                                {reading.id || `VIT-${String(idx + 1).padStart(3, '0')}`}
                              </span>
                              <span className="text-[10px] text-on-surface-variant font-sans">
                                {reading.recordedAt}
                              </span>
                            </td>
                            <td className="p-2 sm:p-2.5 whitespace-nowrap">
                              <span className="font-black text-on-surface">{reading.heartRate}</span>{' '}
                              <span className="text-[9px] text-on-surface-variant">bpm</span>
                            </td>
                            <td className="p-2 sm:p-2.5 whitespace-nowrap">
                              <span className="font-black text-on-surface">
                                {reading.bloodPressureSys}/{reading.bloodPressureDia}
                              </span>
                            </td>
                            <td className="p-2 sm:p-2.5 whitespace-nowrap">
                              <span
                                className={`font-black ${
                                  reading.spO2 < 94 ? 'text-red-600' : 'text-on-surface'
                                }`}
                              >
                                {reading.spO2}%
                              </span>
                            </td>
                            <td className="p-2 sm:p-2.5 whitespace-nowrap">
                              <span className="font-bold text-on-surface">
                                {reading.temperatureC.toFixed(1)}°C
                              </span>
                            </td>
                            <td className="p-2 sm:p-2.5 whitespace-nowrap">
                              <span className="font-bold text-on-surface">
                                {reading.respiratoryRate}
                              </span>
                            </td>
                            <td className="p-2 sm:p-2.5 whitespace-nowrap">
                              <span className="font-bold text-on-surface">{reading.painScore}/10</span>
                            </td>
                            <td className="p-2 sm:p-2.5 max-w-[140px] truncate">
                              <span
                                className={`text-[9px] font-sans font-extrabold px-1.5 py-0.5 rounded ${
                                  isNormal
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {status}
                              </span>
                            </td>
                            <td className="p-2 sm:p-2.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleRestoreVitals(reading)}
                                  className="p-1 text-outline hover:text-primary hover:bg-surface-container rounded cursor-pointer transition-colors"
                                  title="Load reading values into editor"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    restore
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDownloadCsv([reading])}
                                  className="p-1 text-outline hover:text-primary hover:bg-surface-container rounded cursor-pointer transition-colors"
                                  title="Download single reading as CSV"
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    download
                                  </span>
                                </button>
                                {reading.id && (
                                  <button
                                    onClick={() => handleDeleteVitals(reading.id)}
                                    className="p-1 text-outline hover:text-error hover:bg-error/10 rounded cursor-pointer transition-colors"
                                    title="Delete from history"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">
                                      delete
                                    </span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5 / SEPARATE PAGE: VITALS & BIOMETRIC TRENDS */}
          {activeTab === 'trends' && (
            <VitalsTrendPageView
              profile={profile}
              onCaptureReading={() => handleCaptureVitals()}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onDownloadCsv={(readings) => handleDownloadCsv(readings)}
            />
          )}

          {/* TAB 3: DIAGNOSTIC REPORTS */}
          {activeTab === 'diagnostic' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-on-surface">
                    Diagnostic Reports ({profile.diagnosticReports.length})
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Imaging, pathology, lab work &amp; cardiology studies
                  </p>
                </div>
                <button
                  id="btn-add-diagnostic"
                  onClick={() => setShowAddReport(!showAddReport)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {showAddReport ? 'close' : 'add'}
                  </span>
                  {showAddReport ? 'Cancel' : 'New Report'}
                </button>
              </div>

              {/* Add Report Form */}
              {showAddReport && (
                <form
                  onSubmit={handleCreateReport}
                  className="bg-surface-container-low p-4 rounded-xl border border-primary/30 flex flex-col gap-3 animate-in fade-in"
                >
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    Add Diagnostic Report
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="Report Title (e.g. Portable Chest X-Ray)"
                      value={newReport.title || ''}
                      onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <select
                      value={newReport.category || 'Lab Work'}
                      onChange={(e) => setNewReport({ ...newReport, category: e.target.value as any })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary cursor-pointer"
                    >
                      <option value="Imaging">Imaging (X-Ray, CT, MRI)</option>
                      <option value="Lab Work">Lab Work / Blood Chemistry</option>
                      <option value="Cardiology">Cardiology (ECG, Echo)</option>
                      <option value="Pathology">Pathology / Biopsy</option>
                      <option value="General">General Medical Exam</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Doctor / Department"
                      value={newReport.doctor || ''}
                      onChange={(e) => setNewReport({ ...newReport, doctor: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <select
                      value={newReport.status || 'Normal'}
                      onChange={(e) => setNewReport({ ...newReport, status: e.target.value as any })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary cursor-pointer"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal / Guarded</option>
                      <option value="Pending Review">Pending Review</option>
                      <option value="Critical">Critical Alert</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Findings / Diagnostic Summary..."
                    value={newReport.summary || ''}
                    onChange={(e) => setNewReport({ ...newReport, summary: e.target.value })}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddReport(false)}
                      className="px-3 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded bg-primary text-on-primary text-xs font-extrabold shadow-xs"
                    >
                      Save Report
                    </button>
                  </div>
                </form>
              )}

              {/* Reports List */}
              <div className="flex flex-col gap-2.5">
                {profile.diagnosticReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 flex flex-col gap-2 hover:border-outline-variant transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-extrabold text-on-surface">
                            {report.title}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-surface-container text-on-surface-variant">
                            {report.category}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                              report.status === 'Normal'
                                ? 'bg-emerald-100 text-emerald-800'
                                : report.status === 'Critical'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {report.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-outline font-mono">
                          {report.date} • {report.doctor}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-outline-variant hover:text-tertiary p-1 rounded transition-colors cursor-pointer"
                        title="Delete report"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                      </button>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low/50 p-2 rounded-lg font-mono">
                      {report.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MEDICATION */}
          {activeTab === 'medication' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-on-surface">
                    Medication Administration Record (MAR)
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Prescriptions, dosages, routes, and next administration
                  </p>
                </div>
                <button
                  id="btn-add-med"
                  onClick={() => setShowAddMed(!showAddMed)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {showAddMed ? 'close' : 'add'}
                  </span>
                  {showAddMed ? 'Cancel' : 'Add Medication'}
                </button>
              </div>

              {/* Add Med Form */}
              {showAddMed && (
                <form
                  onSubmit={handleCreateMed}
                  className="bg-surface-container-low p-4 rounded-xl border border-primary/30 flex flex-col gap-3 animate-in fade-in"
                >
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    Add Prescribed Medication
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="Medication Name (e.g. Ceftriaxone)"
                      value={newMed.name || ''}
                      onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Dosage (e.g. 1.0 g IV)"
                      value={newMed.dosage || ''}
                      onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <select
                      value={newMed.route || 'Oral (PO)'}
                      onChange={(e) => setNewMed({ ...newMed, route: e.target.value as any })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary cursor-pointer"
                    >
                      <option value="Oral (PO)">Oral (PO)</option>
                      <option value="Intravenous (IV)">Intravenous (IV)</option>
                      <option value="Subcutaneous (SC)">Subcutaneous (SC)</option>
                      <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                      <option value="Inhalation">Inhalation</option>
                      <option value="Topical">Topical</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Frequency (e.g. Q24H, BID, PRN)"
                      value={newMed.frequency || ''}
                      onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <input
                      type="text"
                      placeholder="Next Due (e.g. Today, 14:00)"
                      value={newMed.nextDue || ''}
                      onChange={(e) => setNewMed({ ...newMed, nextDue: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <input
                      type="text"
                      placeholder="Prescriber (e.g. Dr. K. Vance)"
                      value={newMed.prescribedBy || ''}
                      onChange={(e) => setNewMed({ ...newMed, prescribedBy: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Instructions / Warnings (e.g. Hold if SBP < 100)"
                    value={newMed.instructions || ''}
                    onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMed(false)}
                      className="px-3 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded bg-primary text-on-primary text-xs font-extrabold shadow-xs"
                    >
                      Save Medication
                    </button>
                  </div>
                </form>
              )}

              {/* Meds List */}
              <div className="flex flex-col gap-2">
                {profile.medications.map((med) => (
                  <div
                    key={med.id}
                    className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 flex items-start justify-between gap-3 hover:border-outline-variant transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">medication</span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-on-surface truncate">
                            {med.name}
                          </span>
                          <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                            {med.dosage}
                          </span>
                          <span className="text-[10px] text-on-surface-variant bg-surface-container px-1.5 py-0.2 rounded">
                            {med.route}
                          </span>
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                              med.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {med.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-0.5">
                          {med.frequency} • Next: <strong>{med.nextDue || 'Scheduled'}</strong>
                        </div>
                        {med.instructions && (
                          <div className="text-[10px] text-outline font-mono mt-0.5">
                            Note: {med.instructions}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleMedStatus(med.id)}
                        className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${
                          med.status === 'Active'
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        }`}
                        title="Toggle Active / Hold"
                      >
                        {med.status === 'Active' ? 'Hold' : 'Resume'}
                      </button>
                      <button
                        onClick={() => handleDeleteMed(med.id)}
                        className="text-outline-variant hover:text-tertiary p-1 rounded transition-colors cursor-pointer"
                        title="Delete medication"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DOCTOR'S VISIT LOG */}
          {activeTab === 'doctor' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-on-surface">
                    Doctor&apos;s Rounding &amp; Visit Log ({profile.doctorVisits.length})
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    Attending physician examinations, clinical notes &amp; care orders
                  </p>
                </div>
                <button
                  id="btn-add-visit"
                  onClick={() => setShowAddVisit(!showAddVisit)}
                  className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs hover:bg-primary-container"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {showAddVisit ? 'close' : 'add'}
                  </span>
                  {showAddVisit ? 'Cancel' : 'Log Visit'}
                </button>
              </div>

              {/* Add Visit Form */}
              {showAddVisit && (
                <form
                  onSubmit={handleCreateVisit}
                  className="bg-surface-container-low p-4 rounded-xl border border-primary/30 flex flex-col gap-3 animate-in fade-in"
                >
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider">
                    Log Bedside Doctor Visit
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="Doctor Name (e.g. Dr. Samantha Chen, MD)"
                      value={newVisit.doctorName || ''}
                      onChange={(e) => setNewVisit({ ...newVisit, doctorName: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                    <input
                      type="text"
                      placeholder="Specialty (e.g. Intensivist / Critical Care)"
                      value={newVisit.specialty || ''}
                      onChange={(e) => setNewVisit({ ...newVisit, specialty: e.target.value })}
                      className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="Clinical Observations & Bedside Exam..."
                    value={newVisit.clinicalObservations || ''}
                    onChange={(e) => setNewVisit({ ...newVisit, clinicalObservations: e.target.value })}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <textarea
                    rows={2}
                    placeholder="Physician Orders / Care Directives..."
                    value={newVisit.orders || ''}
                    onChange={(e) => setNewVisit({ ...newVisit, orders: e.target.value })}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddVisit(false)}
                      className="px-3 py-1 text-xs font-bold text-on-surface-variant hover:bg-surface-container rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded bg-primary text-on-primary text-xs font-extrabold shadow-xs"
                    >
                      Save Visit
                    </button>
                  </div>
                </form>
              )}

              {/* Visits List */}
              <div className="flex flex-col gap-3">
                {profile.doctorVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/20 flex flex-col gap-2.5 hover:border-outline-variant transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          MD
                        </div>
                        <div>
                          <div className="text-xs font-extrabold text-on-surface">
                            {visit.doctorName}
                          </div>
                          <div className="text-[10px] text-outline font-medium">
                            {visit.specialty} • {visit.visitDate}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        className="text-outline-variant hover:text-tertiary p-1 rounded transition-colors cursor-pointer"
                        title="Delete visit log"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                      </button>
                    </div>

                    <div className="bg-surface-container-low/60 p-2.5 rounded-lg text-xs leading-relaxed flex flex-col gap-1.5">
                      <div>
                        <strong className="text-primary text-[11px] uppercase tracking-wide">
                          Clinical Observations:
                        </strong>
                        <p className="text-on-surface-variant mt-0.5">
                          {visit.clinicalObservations}
                        </p>
                      </div>
                      {visit.orders && (
                        <div className="pt-1.5 border-t border-outline-variant/15">
                          <strong className="text-tertiary text-[11px] uppercase tracking-wide">
                            Physician Orders &amp; Directives:
                          </strong>
                          <p className="text-on-surface-variant mt-0.5">
                            {visit.orders}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: EMERGENCY NOTES */}
          {activeTab === 'emergency' && (
            <div className="flex flex-col gap-4">
              {/* Code Status Selector */}
              <div className="bg-red-50/60 border border-red-200 rounded-xl p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-red-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">e911_emergency</span>
                    Resuscitation Code Status
                  </span>
                  <span className="text-[10px] font-bold text-red-700 font-mono">
                    ACTIVE DIRECTIVE
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      'FULL CODE',
                      'DNR',
                      'DNI',
                      'Comfort Care / Palliative',
                    ] as CodeStatusType[]
                  ).map((code) => {
                    const isSelected = profile.emergencyNotes.codeStatus === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...profile,
                            emergencyNotes: {
                              ...profile.emergencyNotes,
                              codeStatus: code,
                            },
                          };
                          setProfile(updated);
                          savePatientProfile(updated);
                          showFeedback(`Code status updated: ${code}`);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : 'bg-white text-red-900 border-red-200 hover:border-red-400'
                        }`}
                      >
                        {code}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Allergies Chips */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wide flex items-center gap-1">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">
                    report_problem
                  </span>
                  Known Allergies &amp; Adverse Reactions
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {profile.emergencyNotes.allergies.map((allergy) => (
                    <span
                      key={allergy}
                      className="px-2.5 py-1 rounded-lg bg-red-100 text-red-900 text-xs font-bold flex items-center gap-1"
                    >
                      <span>{allergy}</span>
                      <button
                        onClick={() => handleRemoveAllergy(allergy)}
                        className="hover:text-red-700 cursor-pointer"
                        title="Remove allergy"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Add new allergy (e.g. Sulfa, Iodine)..."
                    value={newAllergy}
                    onChange={(e) => setNewAllergy(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAllergy())}
                    className="flex-1 p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <button
                    onClick={handleAddAllergy}
                    className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-variant cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Precautions Chips */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wide flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-700 text-[16px]">
                    shield
                  </span>
                  Clinical Precautions &amp; Guarding Rules
                </span>

                <div className="flex flex-wrap items-center gap-1.5">
                  {profile.emergencyNotes.precautions.map((precaution) => (
                    <span
                      key={precaution}
                      className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1"
                    >
                      <span>{precaution}</span>
                      <button
                        onClick={() => handleRemovePrecaution(precaution)}
                        className="hover:text-amber-700 cursor-pointer"
                        title="Remove precaution"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Add clinical precaution (e.g. Strict NPO, Aspiration Risk)..."
                    value={newPrecaution}
                    onChange={(e) => setNewPrecaution(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddPrecaution())}
                    className="flex-1 p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <button
                    onClick={handleAddPrecaution}
                    className="px-3 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-variant cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 flex flex-col gap-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wide flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    contact_phone
                  </span>
                  Primary Emergency Contact / Healthcare Proxy
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Contact Name"
                    value={profile.emergencyNotes.emergencyContactName}
                    onChange={(e) => {
                      const updated = {
                        ...profile,
                        emergencyNotes: {
                          ...profile.emergencyNotes,
                          emergencyContactName: e.target.value,
                        },
                      };
                      setProfile(updated);
                      savePatientProfile(updated);
                    }}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <input
                    type="text"
                    placeholder="Relationship (e.g. Spouse)"
                    value={profile.emergencyNotes.emergencyContactRelation}
                    onChange={(e) => {
                      const updated = {
                        ...profile,
                        emergencyNotes: {
                          ...profile.emergencyNotes,
                          emergencyContactRelation: e.target.value,
                        },
                      };
                      setProfile(updated);
                      savePatientProfile(updated);
                    }}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number"
                    value={profile.emergencyNotes.emergencyContactPhone}
                    onChange={(e) => {
                      const updated = {
                        ...profile,
                        emergencyNotes: {
                          ...profile.emergencyNotes,
                          emergencyContactPhone: e.target.value,
                        },
                      };
                      setProfile(updated);
                      savePatientProfile(updated);
                    }}
                    className="p-2 text-xs rounded-lg border border-outline-variant/40 bg-surface-container-lowest focus:outline-primary"
                  />
                </div>
              </div>

              {/* Critical Handover Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface uppercase tracking-wide flex items-center gap-1">
                  <span className="material-symbols-outlined text-tertiary text-[16px]">
                    assignment
                  </span>
                  Critical Nurse Shift Handover Notes:
                </label>
                <textarea
                  rows={3}
                  value={profile.emergencyNotes.criticalNotes}
                  onChange={(e) => {
                    const updated = {
                      ...profile,
                      emergencyNotes: {
                        ...profile.emergencyNotes,
                        criticalNotes: e.target.value,
                      },
                    };
                    setProfile(updated);
                    savePatientProfile(updated);
                  }}
                  className="w-full text-xs p-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest focus:outline-primary leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 8: GOOGLE SHEETS LIVE DATA COLLECTOR & INTEGRATION */}
          {activeTab === 'sheets' && (
            <div className="flex flex-col gap-4">
              {/* Google Sheets Connection Status Card */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-surface-container-low to-primary/5 p-4 rounded-xl border border-emerald-500/30 flex flex-col gap-3 shadow-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <span className="material-symbols-outlined text-[24px]">table_chart</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-on-surface">
                          Google Sheets Telemetry Collector
                        </h4>
                        <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          profile.googleSheetConfig?.webhookUrl
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {profile.googleSheetConfig?.webhookUrl ? '● LIVE SYNC ACTIVE' : 'SETUP REQUIRED'}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant font-medium">
                        Collect real-time patient demographics, vitals stream, bed angles, and audit trail directly into Google Sheets.
                      </p>
                    </div>
                  </div>

                  {/* Connected Sheet External Link */}
                  {googleSheetUrlInput && (
                    <a
                      href={getGoogleSheetUrl(googleSheetUrlInput) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                      title="Open connected spreadsheet in new browser tab"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      <span>Open Google Sheet</span>
                    </a>
                  )}
                </div>

                {/* Telemetry Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-outline-variant/15 text-xs">
                  <div className="bg-surface-container-lowest/80 p-2 rounded-lg border border-outline-variant/20">
                    <span className="text-[10px] text-outline block font-bold uppercase">Spreadsheet Link</span>
                    <span className="font-mono font-bold text-on-surface truncate block text-[11px]">
                      {extractGoogleSpreadsheetId(googleSheetUrlInput) || (googleSheetUrlInput ? 'Linked' : 'Not linked')}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest/80 p-2 rounded-lg border border-outline-variant/20">
                    <span className="text-[10px] text-outline block font-bold uppercase">Live Webhook</span>
                    <span className="font-bold text-on-surface truncate block text-[11px]">
                      {googleWebhookUrlInput ? '✓ Apps Script Ready' : 'None configured'}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest/80 p-2 rounded-lg border border-outline-variant/20">
                    <span className="text-[10px] text-outline block font-bold uppercase">Last Synced</span>
                    <span className="font-mono font-bold text-emerald-700 block text-[11px]">
                      {profile.googleSheetConfig?.lastSyncTime || 'Pending first sync'}
                    </span>
                  </div>
                  <div className="bg-surface-container-lowest/80 p-2 rounded-lg border border-outline-variant/20">
                    <span className="text-[10px] text-outline block font-bold uppercase">Total Telemetry Posts</span>
                    <span className="font-bold text-primary block text-[11px]">
                      {profile.googleSheetConfig?.syncCount || 0} Records
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleSyncToGoogleSheetsNow}
                  disabled={isSyncingToSheet || !googleWebhookUrlInput}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    isSyncingToSheet
                      ? 'bg-emerald-700 text-white animate-pulse'
                      : googleWebhookUrlInput
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-98'
                      : 'bg-surface-container text-outline cursor-not-allowed'
                  }`}
                  title="Send immediate telemetry payload to Google Sheets"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSyncingToSheet ? 'hourglass_top' : 'send'}
                  </span>
                  <span>{isSyncingToSheet ? 'Sending to Sheet...' : 'Collect & Send Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyGoogleSheetsData}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 border border-outline-variant/30 transition-all cursor-pointer shadow-2xs"
                  title="Copy Tab-Separated Data to paste directly into Google Sheets Cell A1"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    content_paste
                  </span>
                  <span>Copy for Cell A1</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadGoogleSheetsCsv}
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-variant text-on-surface text-xs font-bold flex items-center justify-center gap-1.5 border border-outline-variant/30 transition-all cursor-pointer shadow-2xs"
                  title="Download CSV for Google Sheets or Excel"
                >
                  <span className="material-symbols-outlined text-[18px] text-emerald-700">
                    download
                  </span>
                  <span>Download .CSV</span>
                </button>
              </div>

              {/* Connection Configuration Form */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">link</span>
                    Google Sheets Links &amp; Endpoint Settings
                  </span>
                  <a
                    href="https://sheets.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Create New Sheet (sheets.new)</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-on-surface-variant flex items-center justify-between">
                    <span>1. Google Spreadsheet Link or Spreadsheet ID</span>
                    <span className="text-[10px] text-outline font-normal">e.g. https://docs.google.com/spreadsheets/d/.../edit</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                      value={googleSheetUrlInput}
                      onChange={(e) => setGoogleSheetUrlInput(e.target.value)}
                      className="flex-1 p-2.5 text-xs rounded-lg border border-outline-variant/30 bg-surface-container-lowest focus:outline-primary font-mono text-on-surface"
                    />
                    {googleSheetUrlInput && (
                      <a
                        href={getGoogleSheetUrl(googleSheetUrlInput) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-2 rounded-lg bg-surface-container hover:bg-surface-variant text-primary text-xs font-bold shrink-0 flex items-center gap-1 border border-outline-variant/30"
                        title="Open this Google Sheet"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        <span>Open</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-extrabold text-on-surface-variant flex items-center justify-between">
                    <span>2. Google Apps Script Webhook URL (for automated collection)</span>
                    <span className="text-[10px] text-outline font-normal">Ends with /exec</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                    value={googleWebhookUrlInput}
                    onChange={(e) => setGoogleWebhookUrlInput(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-outline-variant/30 bg-surface-container-lowest focus:outline-primary font-mono text-on-surface"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={googleAutoSync}
                      onChange={(e) => setGoogleAutoSync(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-xs font-bold text-on-surface">
                      Auto-sync to Google Sheet whenever patient data or vitals are updated
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSaveGoogleSheetConfig}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    Save &amp; Link
                  </button>
                </div>
              </div>

              {/* Data Collected Summary */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">dataset</span>
                    Automated Google Sheets Tabs Generated
                  </h5>
                  <button
                    type="button"
                    onClick={() => setShowAppsScriptModal(true)}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">code</span>
                    <span>View Apps Script Code</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/15 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-800">📄 Vitals Stream</span>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded">Append Row</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      Appends every reading with Timestamp, Bed ID, Patient Name, MRN, HR, BP Sys/Dia, SpO2, Resp, Temp, Pain, Weight, Stability, and Notes.
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/15 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-primary">📄 Patient Overview</span>
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.2 rounded">Live Key-Value</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      Maintains an up-to-date summary dashboard with demographics, blood type, stability, diagnostics count, and active medications.
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/15 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-blue-700">📄 Bed Actuators</span>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded">Telemetry</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      Records articulation angles (Head, Knee, Trendelenburg), elevation height, and battery/AC power state.
                    </span>
                  </div>

                  <div className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/15 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-800">📄 Audit Trail</span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded">Compliance</span>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      Appends full timestamped audit entries of all data edits, field updates, tare calibrations, and nurse signatures.
                    </span>
                  </div>
                </div>
              </div>

              {/* 60-Second Setup Guide */}
              <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/20 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-primary">help</span>
                    How to Connect Your Google Sheet in 60 Seconds
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAppsScriptCode}
                    className="px-2.5 py-1 rounded bg-primary text-on-primary text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all hover:bg-primary-hover active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    <span>{copiedScript ? 'Copied!' : 'Copy Script Code'}</span>
                  </button>
                </div>

                <ol className="text-xs text-on-surface-variant space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Open your Google Sheet (or click <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-primary font-bold underline">sheets.new</a> to create one).</li>
                  <li>In the top menu, go to <strong>Extensions &gt; Apps Script</strong>.</li>
                  <li>Replace the code in <code>Code.gs</code> with our ready-to-use collector script (click &quot;Copy Script Code&quot; above) and click <strong>Save</strong>.</li>
                  <li>In the top right, click <strong>Deploy &gt; New deployment</strong>.</li>
                  <li>Select type: <strong>Web app</strong>, set &quot;Execute as: Me&quot;, and &quot;Who has access: Anyone&quot;.</li>
                  <li>Click <strong>Deploy</strong>, copy the Web app URL (ends with <code>/exec</code>), and paste it into field #2 above!</li>
                </ol>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-outline-variant/20 bg-surface-container-low/70 flex items-center justify-between text-xs">
          <span className="text-on-surface-variant font-mono text-[11px]">
            Last Updated: {profile.lastUpdated || 'Just now'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-primary text-on-primary font-bold shadow-xs hover:bg-primary-container transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>

        {/* CSV Preview Overlay Modal */}
        {showCsvPreviewModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest w-full max-w-xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden">
              {/* Preview Header */}
              <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">table_chart</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-on-surface">
                      Formatted Vitals CSV Export
                    </h4>
                    <span className="text-[11px] font-mono text-outline">
                      {getVitalsCsvFilename(profile)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowCsvPreviewModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="Close Preview"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Preview Notice Bar */}
              <div className="px-5 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between text-[11px] text-primary font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px]">verified</span>
                  <span>RFC 4180 CSV with UTF-8 BOM • Excel &amp; Google Sheets Ready</span>
                </div>
                <span className="font-mono text-[10px] text-outline">
                  {csvPreviewText.split('\n').filter(Boolean).length} rows
                </span>
              </div>

              {/* Code Pre Box */}
              <div className="flex-1 p-4 overflow-auto bg-neutral-900 text-neutral-100 font-mono text-[11px] leading-relaxed select-all max-h-[50vh]">
                <pre className="whitespace-pre overflow-x-auto">{csvPreviewText}</pre>
              </div>

              {/* Preview Actions Footer */}
              <div className="px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCsv()}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    <span>Copy Text</span>
                  </button>
                  <button
                    onClick={() => handleShareCsv()}
                    disabled={isExportingCsv}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container text-xs font-bold text-on-surface flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">share</span>
                    <span>Share File</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCsvPreviewModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      handleDownloadCsv();
                      setShowCsvPreviewModal(false);
                    }}
                    className="px-4 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-primary-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Download CSV</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Google Apps Script Collector Code Modal */}
        {showAppsScriptModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-surface-container-lowest w-full max-w-xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col border border-outline-variant/30 overflow-hidden">
              {/* Apps Script Header */}
              <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">code</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-on-surface">
                      Google Apps Script Telemetry Collector (Code.gs)
                    </h4>
                    <span className="text-[11px] font-mono text-outline">
                      Extensions &gt; Apps Script &gt; Code.gs
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAppsScriptModal(false)}
                  className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-variant text-on-surface-variant flex items-center justify-center cursor-pointer transition-colors"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Instructions Banner */}
              <div className="px-5 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 text-xs text-emerald-900 leading-relaxed font-medium">
                Paste this script into your Google Sheet to receive automatic real-time rows for <strong>Vitals Stream</strong>, <strong>Patient Overview</strong>, <strong>Bed Actuators</strong>, and <strong>Audit Trail</strong>.
              </div>

              {/* Code Pre Box */}
              <div className="flex-1 p-4 overflow-auto bg-neutral-950 text-emerald-400 font-mono text-[11px] leading-relaxed select-all max-h-[50vh]">
                <pre className="whitespace-pre overflow-x-auto">{GOOGLE_APPS_SCRIPT_TEMPLATE}</pre>
              </div>

              {/* Actions Footer */}
              <div className="px-5 py-3.5 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowAppsScriptModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleCopyAppsScriptCode}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Entire Script'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
