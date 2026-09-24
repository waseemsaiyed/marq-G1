export type ScreenType = 'home' | 'comfort' | 'advanced' | 'pair' | 'settings';

export interface BedState {
  headAngle: number;       // 0 to 90 deg (Incline)
  kneeAngle: number;       // 0 to 35 deg (home) / 45 deg (advanced)
  overallHeight: number;   // 40 to 85 cm
  tiltAngle: number;       // -90 to +90 deg (0° to 90° Trendelenburg / Reverse Trendelenburg)
  activePreset: 'cardiac' | 'trendelenburg' | 'sleep' | 'exam' | 'zerog' | 'flat' | null;
  isSafetyLocked: boolean;
  eStopTriggered: boolean;
  nurseCallActive: boolean;
  // Perimeter rails
  rails: {
    headLeft: boolean;
    headRight: boolean;
    footLeft: boolean;
    footRight: boolean;
  };
  castersLocked: boolean;
  // Patient scale
  patientWeight: number;
  tareOffset: number;
  presenceArmed: boolean;
  // Lighting
  underBedLight: {
    enabled: boolean;
    hue: 'amber' | 'blue';
    brightness: number;
    motionSensor: boolean;
  };
  // Connection info
  connectedBedId: string;
  patientName: string;
  roomNumber: string;
  batteryPercent: number;
  lowBatteryThreshold: number; // Warning threshold percentage (default: 20%)
  isCharging: boolean;
  bleSynced: boolean;
  wifiConnected: boolean;
  hapticFeedback: 'subtle' | 'strong';
  voiceEnabled: boolean;
  highContrast: boolean;
  darkMode: boolean;
  patientStability?: StabilityLevel;
}

export type StabilityLevel = 'Stable' | 'Guarded' | 'Critical' | 'Post-Op Monitoring' | 'Observation';
export type MobilityLevel = 'Independent' | 'Assisted Turn' | 'Total Bedbound' | 'Bed-to-Chair Assist';
export type CodeStatusType = 'FULL CODE' | 'DNR' | 'DNI' | 'Comfort Care / Palliative';
export type PatientChartTabKey =
  | 'mass'
  | 'vitals'
  | 'trends'
  | 'diagnostic'
  | 'medication'
  | 'doctor'
  | 'emergency';

export interface VitalsReading {
  id?: string;
  heartRate: number;        // bpm (e.g. 74)
  bloodPressureSys: number; // mmHg (e.g. 120)
  bloodPressureDia: number; // mmHg (e.g. 78)
  spO2: number;             // % (e.g. 98)
  respiratoryRate: number;  // breaths/min (e.g. 16)
  temperatureC: number;     // °C (e.g. 36.8)
  painScore: number;        // 0-10 (e.g. 2)
  weightKg?: number;        // kg body mass (e.g. 72.4)
  recordedAt: string;       // e.g. "Today, 08:00 AM"
  recordedTimestamp?: number;
  notes?: string;
}

export interface DiagnosticReport {
  id: string;
  title: string;
  category: 'Imaging' | 'Lab Work' | 'Cardiology' | 'Pathology' | 'General';
  date: string;
  doctor: string;
  summary: string;
  findings?: string;
  status: 'Normal' | 'Abnormal' | 'Pending Review' | 'Critical';
}

export interface MedicationRecord {
  id: string;
  name: string;
  dosage: string;
  route: 'Oral (PO)' | 'Intravenous (IV)' | 'Subcutaneous (SC)' | 'Intramuscular (IM)' | 'Inhalation' | 'Topical';
  frequency: string;
  nextDue?: string;
  prescribedBy?: string;
  instructions?: string;
  status: 'Active' | 'Held' | 'Discontinued';
}

export interface DoctorVisitLog {
  id: string;
  doctorName: string;
  specialty: string;
  visitDate: string;
  clinicalObservations: string;
  orders: string;
}

export interface EmergencyNotes {
  codeStatus: CodeStatusType;
  allergies: string[];
  fallRisk: 'Low' | 'Moderate' | 'High';
  precautions: string[];
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  criticalNotes: string;
}

export interface PatientAuditLogEntry {
  id: string;
  timestamp: string;
  category: 'Demographics' | 'Mass & Stability' | 'Vitals' | 'Diagnostics' | 'Medications' | 'Doctor Visits' | 'Emergency Notes';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SAVE';
  fieldName: string;
  previousValue: string;
  newValue: string;
  authorizedBy: string;
  status: 'Logged' | 'Synced to Google Sheet';
}

export interface GoogleSheetSyncConfig {
  webhookUrl: string;
  spreadsheetId?: string;
  sheetName?: string;
  autoSyncOnSave: boolean;
  lastSyncTime?: string;
  syncCount: number;
}

export interface PatientProfile {
  bedId: string;
  name: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  mrn: string;
  dob: string;
  bloodType: string;
  heightCm: number;
  massKg: number;
  tareOffsetKg: number;
  stability: StabilityLevel;
  mobility: MobilityLevel;
  vitals: VitalsReading;
  vitalsHistory?: VitalsReading[];
  diagnosticReports: DiagnosticReport[];
  medications: MedicationRecord[];
  doctorVisits: DoctorVisitLog[];
  emergencyNotes: EmergencyNotes;
  lastUpdated: string;
  auditLogs?: PatientAuditLogEntry[];
  googleSheetConfig?: GoogleSheetSyncConfig;
}

export interface PairedDeviceItem {
  id: string;
  name: string;
  mac: string;
  fw?: string;
  signal: string;
  rssi?: number;
  battery: string;
  link: 'Dual-Band' | 'BLE Only' | 'Wi-Fi IP';
  recommended?: boolean;
  room: string;
  patient: string;
  ip?: string;
  isCustom?: boolean;
  isPaired?: boolean;
  pairedAt?: string;
}
