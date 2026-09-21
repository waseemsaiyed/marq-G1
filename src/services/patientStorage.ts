import { PatientProfile } from '../types';

export const DEFAULT_PATIENT_PROFILE: PatientProfile = {
  bedId: 'ICU Bed 03',
  name: 'J. Anderson',
  age: 64,
  sex: 'Male',
  mrn: 'MRN-849204-ICU',
  dob: '1962-04-18',
  bloodType: 'O-Positive (O+)',
  heightCm: 178,
  massKg: 68.4,
  tareOffsetKg: -2.1,
  stability: 'Stable',
  mobility: 'Assisted Turn',
  vitals: {
    heartRate: 74,
    bloodPressureSys: 122,
    bloodPressureDia: 78,
    spO2: 98,
    respiratoryRate: 16,
    temperatureC: 36.8,
    painScore: 2,
    recordedAt: 'Today, 07:45 AM',
    notes: 'Resting comfortably in cardiac chair incline. No respiratory distress.',
  },
  diagnosticReports: [
    {
      id: 'rep-01',
      title: 'Portable Bedside Chest X-Ray (AP View)',
      category: 'Imaging',
      date: 'Today, 06:30 AM',
      doctor: 'Dr. Katherine Miller (Radiology)',
      summary: 'Mild bibasilar atelectasis improving compared to post-op Day 1. No pneumothorax. Endotracheal tube in ideal carina position.',
      status: 'Normal',
    },
    {
      id: 'rep-02',
      title: 'Arterial Blood Gas (ABG) & Electrolytes',
      category: 'Lab Work',
      date: 'Today, 05:15 AM',
      doctor: 'Central ICU Pathology Lab',
      summary: 'pH: 7.41, PaCO2: 39 mmHg, PaO2: 96 mmHg, HCO3: 24 mEq/L, Lactate: 1.1 mmol/L. Normal acid-base equilibrium.',
      status: 'Normal',
    },
    {
      id: 'rep-03',
      title: '12-Lead Electrocardiogram (ECG)',
      category: 'Cardiology',
      date: 'Yesterday, 08:20 PM',
      doctor: 'Dr. Robert Sterling (Cardiology)',
      summary: 'Normal Sinus Rhythm at 72 bpm. PR interval 160ms, QTc 418ms. No acute ST-T elevation or ischemic changes.',
      status: 'Normal',
    },
    {
      id: 'rep-04',
      title: 'Comprehensive Metabolic Panel (CMP)',
      category: 'Lab Work',
      date: 'Yesterday, 06:00 AM',
      doctor: 'Central ICU Pathology Lab',
      summary: 'Serum Creatinine: 1.0 mg/dL, BUN: 16 mg/dL, K+: 4.1 mEq/L, Na+: 139 mEq/L. Kidney perfusion adequate.',
      status: 'Normal',
    },
  ],
  medications: [
    {
      id: 'med-01',
      name: 'Ceftriaxone Sodium',
      dosage: '1.0 g in 100 mL D5W',
      route: 'Intravenous (IV)',
      frequency: 'Every 24 hours (Q24H)',
      nextDue: 'Today, 14:00',
      prescribedBy: 'Dr. K. Vance',
      instructions: 'Infuse over 30 minutes. Monitor for hypersensitivity.',
      status: 'Active',
    },
    {
      id: 'med-02',
      name: 'Enoxaparin Sodium (Lovenox)',
      dosage: '40 mg / 0.4 mL',
      route: 'Subcutaneous (SC)',
      frequency: 'Once Daily (09:00)',
      nextDue: 'Today, 09:00',
      prescribedBy: 'Dr. S. Chen',
      instructions: 'DVT prophylaxis. Alternating abdominal sites.',
      status: 'Active',
    },
    {
      id: 'med-03',
      name: 'Metoprolol Tartrate',
      dosage: '25 mg',
      route: 'Oral (PO)',
      frequency: 'Twice daily (BID)',
      nextDue: 'Today, 20:00',
      prescribedBy: 'Dr. R. Sterling',
      instructions: 'Hold if systolic BP < 100 mmHg or HR < 55 bpm.',
      status: 'Active',
    },
    {
      id: 'med-04',
      name: 'Acetaminophen (Paracetamol)',
      dosage: '650 mg',
      route: 'Oral (PO)',
      frequency: 'PRN Every 6 hours',
      nextDue: 'PRN for mild pain (Score > 3)',
      prescribedBy: 'Dr. K. Vance',
      instructions: 'Max 3,000 mg in 24 hours.',
      status: 'Active',
    },
  ],
  doctorVisits: [
    {
      id: 'vis-01',
      doctorName: 'Dr. Samantha Chen, MD',
      specialty: 'Critical Care / Attending Intensivist',
      visitDate: 'Today, 07:15 AM',
      clinicalObservations: 'Patient alert, oriented x3, speech clear. Lungs clear to auscultation bilaterally. Surgical incision clean, dressing intact, minimal serosanguinous drainage. Hemodynamically stable on room air.',
      orders: 'Wean oxygen nasal cannula as tolerated (target SpO2 > 94%). Advance diet from clear liquids to soft solids. Initiate bed-to-chair transfer assist with physical therapy at 10:00.',
    },
    {
      id: 'vis-02',
      doctorName: 'Dr. Robert Sterling, MD, FACC',
      specialty: 'Consulting Cardiologist',
      visitDate: 'Yesterday, 16:30 PM',
      clinicalObservations: 'Post-CABG recovery progress satisfactory. Ejection fraction stable at 55%. No signs of peripheral edema or jugular venous distention.',
      orders: 'Continue low-dose beta blocker. Daily telemetry monitoring. Strict daily bed-scale weight check before breakfast.',
    },
  ],
  emergencyNotes: {
    codeStatus: 'FULL CODE',
    allergies: ['Penicillin (Hives / Rash)', 'Morphine (Nausea)', 'Latex (Mild Contact)'],
    fallRisk: 'Moderate',
    precautions: [
      'Strict Sternal Precautions (No pushing/pulling > 5 lbs)',
      'Fall Risk Protocol (Perimeter rails up while unattended)',
      'Aspiration Risk Guarding (Elevate head ≥ 30° during meals)',
    ],
    emergencyContactName: 'Eleanor Anderson',
    emergencyContactRelation: 'Spouse / Healthcare Proxy',
    emergencyContactPhone: '+1 (555) 382-9912',
    criticalNotes: 'Sternal precautions: patient must hug heart pillow when coughing. Guard head rail during patient transfers.',
  },
  auditLogs: [
    {
      id: 'log-1',
      timestamp: 'Today, 07:45 AM',
      category: 'Vitals',
      action: 'SAVE',
      fieldName: 'Morning Clinical Vitals Logged',
      previousValue: 'HR 78 bpm, BP 120/75 mmHg',
      newValue: 'HR 74 bpm, BP 122/78 mmHg, SpO2 98%',
      authorizedBy: 'Authorized Nurse #419',
      status: 'Logged',
    },
    {
      id: 'log-2',
      timestamp: 'Today, 07:15 AM',
      category: 'Doctor Visits',
      action: 'CREATE',
      fieldName: 'Bedside Rounding Note Added',
      previousValue: 'None',
      newValue: 'Dr. Samantha Chen, MD - Progress Satisfactory',
      authorizedBy: 'Attending MD #102',
      status: 'Logged',
    },
    {
      id: 'log-3',
      timestamp: 'Today, 06:30 AM',
      category: 'Diagnostics',
      action: 'CREATE',
      fieldName: 'Portable Bedside Chest X-Ray',
      previousValue: 'None',
      newValue: 'Status: Normal - Bilateral lungs improving',
      authorizedBy: 'Rad Tech #88',
      status: 'Logged',
    },
    {
      id: 'log-4',
      timestamp: 'Today, 06:00 AM',
      category: 'Mass & Stability',
      action: 'UPDATE',
      fieldName: 'Tare Calibration & Mass Check',
      previousValue: '68.6 kg',
      newValue: '68.4 kg (Tare offset: -2.1 kg)',
      authorizedBy: 'Authorized Nurse #419',
      status: 'Logged',
    },
  ],
  googleSheetConfig: {
    webhookUrl: '',
    autoSyncOnSave: true,
    syncCount: 4,
    lastSyncTime: 'Today, 07:45 AM',
  },
  lastUpdated: 'Today, 07:45 AM',
};

const STORAGE_KEY_PREFIX = 'marq_patient_profile_';
const PIN_STORAGE_KEY = 'marq_clinical_staff_pin';
const DEFAULT_PIN = '1234';

export function getClinicalPin(): string {
  if (typeof window === 'undefined') return DEFAULT_PIN;
  return localStorage.getItem(PIN_STORAGE_KEY) || DEFAULT_PIN;
}

export function setClinicalPin(newPin: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PIN_STORAGE_KEY, newPin);
}

export function verifyClinicalPin(enteredPin: string): boolean {
  return enteredPin === getClinicalPin();
}

export function getPatientProfile(bedId: string = 'ICU Bed 03'): PatientProfile {
  if (typeof window === 'undefined') return DEFAULT_PATIENT_PROFILE;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${bedId}`);
    if (!raw) {
      // Fallback or generic default with current bedId
      const profile = { ...DEFAULT_PATIENT_PROFILE, bedId };
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${bedId}`, JSON.stringify(profile));
      return profile;
    }
    const parsed: PatientProfile = JSON.parse(raw);
    if (!parsed.auditLogs) {
      parsed.auditLogs = DEFAULT_PATIENT_PROFILE.auditLogs;
    }
    if (!parsed.googleSheetConfig) {
      parsed.googleSheetConfig = DEFAULT_PATIENT_PROFILE.googleSheetConfig;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load patient profile:', err);
    return DEFAULT_PATIENT_PROFILE;
  }
}

export function savePatientProfile(profile: PatientProfile): void {
  if (typeof window === 'undefined') return;
  try {
    profile.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ', ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${profile.bedId}`, JSON.stringify(profile));
    // Dispatch global event for live UI reactivity
    window.dispatchEvent(
      new CustomEvent('marq_patient_profile_changed', { detail: profile })
    );
  } catch (err) {
    console.error('Failed to save patient profile:', err);
  }
}

export function logPatientAction(
  profile: PatientProfile,
  entry: Omit<import('../types').PatientAuditLogEntry, 'id' | 'timestamp' | 'status'>
): PatientProfile {
  const newLogEntry: import('../types').PatientAuditLogEntry = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    timestamp: 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    category: entry.category,
    action: entry.action,
    fieldName: entry.fieldName,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    authorizedBy: entry.authorizedBy,
    status: 'Logged',
  };

  const updatedLogs = [newLogEntry, ...(profile.auditLogs || [])];
  const updatedProfile: PatientProfile = {
    ...profile,
    auditLogs: updatedLogs,
  };
  savePatientProfile(updatedProfile);
  return updatedProfile;
}

export function resetPatientProfile(bedId: string = 'ICU Bed 03'): PatientProfile {
  const profile = { ...DEFAULT_PATIENT_PROFILE, bedId };
  savePatientProfile(profile);
  return profile;
}
