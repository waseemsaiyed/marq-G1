import { PatientProfile, PatientAuditLogEntry, GoogleSheetSyncConfig } from '../types';

/**
 * Ready-to-use Google Apps Script code that users can paste into their Google Sheet
 * via Extensions > Apps Script to receive automated real-time patient data streams.
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `/**
 * MARQ W-1 CLINICAL BED CONTROLLER: GOOGLE APPS SCRIPT TELEMETRY COLLECTOR
 * 
 * Instructions to connect your Google Sheet:
 * 1. Open your Google Sheet (or create a new one at sheets.new)
 * 2. In the top menu, click Extensions > Apps Script
 * 3. Replace all existing text in Code.gs with this exact script and click Save (disk icon)
 * 4. In the top right, click "Deploy" > "New deployment"
 * 5. Click the gear icon next to "Select type" and choose "Web app"
 * 6. Set settings:
 *    - Description: MarQ Bed Telemetry Sync
 *    - Execute as: Me (your email)
 *    - Who has access: Anyone
 * 7. Click "Deploy", click "Authorize access", and copy the resulting Web app URL (ends in /exec)
 * 8. Paste that Web app URL into the MarQ Bed app under "Google Sheets Webhook / Live Link"!
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = null;
    
    // Support opening target spreadsheet by ID if provided, otherwise active container sheet
    if (data.spreadsheetId && data.spreadsheetId.length > 10) {
      try {
        ss = SpreadsheetApp.openById(data.spreadsheetId);
      } catch (errOpen) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }
    
    var p = data.patient || {};
    var v = data.vitals || {};
    var bed = data.bedTelemetry || {};
    var timestamp = data.syncTime || new Date().toISOString();
    
    // 1. Sheet: "Vitals Stream"
    var vitalsSheet = ss.getSheetByName("Vitals Stream");
    if (!vitalsSheet) {
      vitalsSheet = ss.insertSheet("Vitals Stream");
      vitalsSheet.appendRow([
        "Timestamp", "Bed ID", "Patient Name", "MRN", 
        "Heart Rate (bpm)", "Blood Pressure Sys", "Blood Pressure Dia", 
        "SpO2 (%)", "Resp Rate (rpm)", "Temp (°C)", "Pain Score (0-10)", 
        "Weight (kg)", "Clinical Stability", "Notes"
      ]);
      vitalsSheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#E8F0FE");
      vitalsSheet.setFrozenRows(1);
    }
    
    vitalsSheet.appendRow([
      timestamp,
      p.bedId || bed.connectedBedId || "",
      p.name || "",
      p.mrn || "",
      v.heartRate || "",
      v.bloodPressureSys || "",
      v.bloodPressureDia || "",
      v.spO2 || "",
      v.respiratoryRate || "",
      v.temperatureC || "",
      v.painScore || "",
      v.weightKg || p.massKg || "",
      p.stability || "",
      v.notes || ""
    ]);

    // 2. Sheet: "Patient Overview"
    var patientSheet = ss.getSheetByName("Patient Overview");
    if (!patientSheet) {
      patientSheet = ss.insertSheet("Patient Overview");
      patientSheet.appendRow(["Clinical Field", "Current Value", "Last Synced"]);
      patientSheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#E8F0FE");
      patientSheet.setFrozenRows(1);
    }
    
    var overviewData = [
      ["Patient Full Name", p.name || "", timestamp],
      ["Medical Record Number (MRN)", p.mrn || "", timestamp],
      ["Assigned Bed ID", p.bedId || bed.connectedBedId || "", timestamp],
      ["Age / Sex", (p.age || "") + " / " + (p.sex || ""), timestamp],
      ["Date of Birth (DOB)", p.dob || "", timestamp],
      ["Blood Type", p.bloodType || "", timestamp],
      ["Height & Weight", (p.heightCm || "") + " cm / " + (p.massKg || "") + " kg", timestamp],
      ["Clinical Stability", p.stability || "", timestamp],
      ["Patient Mobility", p.mobility || "", timestamp],
      ["Resuscitation Code Status", data.codeStatus || "", timestamp],
      ["Current Heart Rate", (v.heartRate || "") + " bpm", timestamp],
      ["Current Blood Pressure", (v.bloodPressureSys || "") + "/" + (v.bloodPressureDia || "") + " mmHg", timestamp],
      ["Current SpO2", (v.spO2 || "") + "%", timestamp],
      ["Diagnostic Reports Count", data.diagnosticReportsCount || 0, timestamp],
      ["Medications MAR Count", data.medicationsCount || 0, timestamp],
      ["Physician Visits Count", data.doctorVisitsCount || 0, timestamp],
      ["Audit Trail Log Count", data.auditLogsCount || 0, timestamp]
    ];
    
    patientSheet.getRange(2, 1, overviewData.length, 3).setValues(overviewData);

    // 3. Sheet: "Bed Actuators & Telemetry"
    if (data.bedTelemetry) {
      var actSheet = ss.getSheetByName("Bed Actuators");
      if (!actSheet) {
        actSheet = ss.insertSheet("Bed Actuators");
        actSheet.appendRow(["Timestamp", "Bed ID", "Head Angle (°)", "Knee Angle (°)", "Elevation (cm)", "Trendelenburg (°)", "Battery (%)", "AC Charging"]);
        actSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#E8F0FE");
        actSheet.setFrozenRows(1);
      }
      actSheet.appendRow([
        timestamp,
        bed.connectedBedId || "",
        bed.headAngle !== undefined ? bed.headAngle : "",
        bed.kneeAngle !== undefined ? bed.kneeAngle : "",
        bed.bedHeight !== undefined ? bed.bedHeight : "",
        bed.trendelenburgAngle !== undefined ? bed.trendelenburgAngle : "",
        bed.batteryPercent !== undefined ? bed.batteryPercent : "",
        bed.isCharging ? "YES" : "NO"
      ]);
    }

    // 4. Sheet: "Audit Trail"
    if (data.recentLogs && data.recentLogs.length > 0) {
      var auditSheet = ss.getSheetByName("Audit Trail");
      if (!auditSheet) {
        auditSheet = ss.insertSheet("Audit Trail");
        auditSheet.appendRow(["Log ID", "Timestamp", "Category", "Action", "Field", "Previous Value", "New Value", "Authorized By"]);
        auditSheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#E8F0FE");
        auditSheet.setFrozenRows(1);
      }
      for (var i = 0; i < data.recentLogs.length; i++) {
        var log = data.recentLogs[i];
        auditSheet.appendRow([
          log.id || "",
          log.timestamp || "",
          log.category || "",
          log.action || "",
          log.fieldName || "",
          log.previousValue || "",
          log.newValue || "",
          log.authorizedBy || ""
        ]);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: "success", 
      message: "Patient record and telemetry synced successfully to Google Sheet",
      time: timestamp 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: "error", 
      message: err.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("MarQ Clinical Remote Webhook is Active and Ready for POST Telemetry!")
    .setMimeType(ContentService.MimeType.TEXT);
}
`;

const GLOBAL_SHEETS_KEY = 'marq_google_sheets_config';

/**
 * Loads the globally configured Google Sheets connection
 */
export function getGlobalGoogleSheetsConfig(): GoogleSheetSyncConfig {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(GLOBAL_SHEETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          webhookUrl: parsed.webhookUrl || '',
          spreadsheetId: parsed.spreadsheetId || '',
          sheetName: parsed.sheetName || 'Vitals Stream',
          autoSyncOnSave: parsed.autoSyncOnSave !== false,
          syncCount: parsed.syncCount || 0,
          lastSyncTime: parsed.lastSyncTime || '',
        };
      }
    }
  } catch (e) {
    console.error('Failed to read global Google Sheets configuration:', e);
  }
  return {
    webhookUrl: '',
    spreadsheetId: '',
    sheetName: 'Vitals Stream',
    autoSyncOnSave: true,
    syncCount: 0,
    lastSyncTime: '',
  };
}

/**
 * Saves and broadcasts global Google Sheets connection
 */
export function saveGlobalGoogleSheetsConfig(config: GoogleSheetSyncConfig): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(GLOBAL_SHEETS_KEY, JSON.stringify(config));
      window.dispatchEvent(
        new CustomEvent('marq_google_sheets_config_changed', { detail: config })
      );
    }
  } catch (e) {
    console.error('Failed to save global Google Sheets configuration:', e);
  }
}

/**
 * Extracts Google Spreadsheet ID from a full Google Sheets URL or raw ID
 */
export function extractGoogleSpreadsheetId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  // Regex to extract from standard docs.google.com/spreadsheets/d/<ID>/...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Check if it's already a bare ID (alphanumeric with - and _)
  if (/^[a-zA-Z0-9-_]{20,60}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Builds a standard Google Sheets browser URL from an ID or URL
 */
export function getGoogleSheetUrl(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (trimmed.startsWith('https://docs.google.com/spreadsheets')) {
    return trimmed;
  }
  const id = extractGoogleSpreadsheetId(trimmed);
  if (id) {
    return `https://docs.google.com/spreadsheets/d/${id}/edit`;
  }
  return null;
}

/**
 * Generate Google Sheets compatible CSV containing all patient details,
 * clinical inputs, and audit logs.
 */
export function generateGoogleSheetsCSV(profile: PatientProfile): string {
  const lines: string[] = [];

  const escapeCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Section 1: Patient Demographics & Bed Identification
  lines.push('=== PATIENT DEMOGRAPHICS & BED IDENTIFICATION ===');
  lines.push(
    [
      'Patient Name',
      'Age',
      'Sex',
      'MRN',
      'DOB',
      'Blood Type',
      'Height (cm)',
      'Mass (kg)',
      'Tare (kg)',
      'Stability',
      'Mobility',
      'Bed ID',
      'Last Updated',
    ]
      .map(escapeCell)
      .join(',')
  );
  lines.push(
    [
      profile.name,
      profile.age,
      profile.sex,
      profile.mrn,
      profile.dob,
      profile.bloodType,
      profile.heightCm,
      profile.massKg,
      profile.tareOffsetKg,
      profile.stability,
      profile.mobility,
      profile.bedId,
      profile.lastUpdated,
    ]
      .map(escapeCell)
      .join(',')
  );

  lines.push('');

  // Section 2: Clinical Vitals
  lines.push('=== CLINICAL VITALS RECORD ===');
  lines.push(
    [
      'Recorded At',
      'Heart Rate (bpm)',
      'Blood Pressure Sys',
      'Blood Pressure Dia',
      'SpO2 (%)',
      'Resp Rate (rpm)',
      'Temp (C)',
      'Pain Score (0-10)',
      'Weight (kg)',
      'Clinical Notes',
    ]
      .map(escapeCell)
      .join(',')
  );
  lines.push(
    [
      profile.vitals.recordedAt,
      profile.vitals.heartRate,
      profile.vitals.bloodPressureSys,
      profile.vitals.bloodPressureDia,
      profile.vitals.spO2,
      profile.vitals.respiratoryRate,
      profile.vitals.temperatureC,
      profile.vitals.painScore,
      profile.vitals.weightKg ?? profile.massKg,
      profile.vitals.notes || '',
    ]
      .map(escapeCell)
      .join(',')
  );

  lines.push('');

  // Section 2B: Full Vitals History Snapshots
  if (profile.vitalsHistory && profile.vitalsHistory.length > 0) {
    lines.push('=== VITALS HISTORICAL SNAPSHOTS ===');
    lines.push(
      [
        'ID',
        'Recorded At',
        'Heart Rate (bpm)',
        'BP Sys',
        'BP Dia',
        'SpO2 (%)',
        'Resp Rate (rpm)',
        'Temp (C)',
        'Pain Score',
        'Weight (kg)',
        'Notes',
      ]
        .map(escapeCell)
        .join(',')
    );
    profile.vitalsHistory.forEach((v) => {
      lines.push(
        [
          v.id || '',
          v.recordedAt,
          v.heartRate,
          v.bloodPressureSys,
          v.bloodPressureDia,
          v.spO2,
          v.respiratoryRate,
          v.temperatureC,
          v.painScore,
          v.weightKg ?? '',
          v.notes || '',
        ]
          .map(escapeCell)
          .join(',')
      );
    });
    lines.push('');
  }

  // Section 3: Diagnostic Reports
  lines.push('=== DIAGNOSTIC REPORTS ===');
  lines.push(['Date', 'Title', 'Category', 'Status', 'Doctor / Dept', 'Findings / Summary'].map(escapeCell).join(','));
  profile.diagnosticReports.forEach((r) => {
    lines.push([r.date, r.title, r.category, r.status, r.doctor, r.summary].map(escapeCell).join(','));
  });

  lines.push('');

  // Section 4: Medications MAR
  lines.push('=== MEDICATION ADMINISTRATION RECORD (MAR) ===');
  lines.push(['Medication Name', 'Dosage', 'Route', 'Frequency', 'Next Due', 'Status', 'Prescriber', 'Instructions'].map(escapeCell).join(','));
  profile.medications.forEach((m) => {
    lines.push([m.name, m.dosage, m.route, m.frequency, m.nextDue, m.status, m.prescribedBy || '', m.instructions || ''].map(escapeCell).join(','));
  });

  lines.push('');

  // Section 5: Doctor Rounding & Visit Logs
  lines.push('=== DOCTOR ROUNDING & VISIT LOGS ===');
  lines.push(['Visit Date', 'Doctor Name', 'Specialty', 'Clinical Observations', 'Physician Orders'].map(escapeCell).join(','));
  profile.doctorVisits.forEach((v) => {
    lines.push([v.visitDate, v.doctorName, v.specialty, v.clinicalObservations, v.orders].map(escapeCell).join(','));
  });

  lines.push('');

  // Section 6: Emergency Directives
  lines.push('=== EMERGENCY NOTES & DIRECTIVES ===');
  lines.push(['Code Status', 'Fall Risk', 'Allergies', 'Precautions', 'Emergency Contact', 'Relationship', 'Phone', 'Critical Notes'].map(escapeCell).join(','));
  lines.push([
    profile.emergencyNotes.codeStatus,
    profile.emergencyNotes.fallRisk,
    profile.emergencyNotes.allergies.join('; '),
    profile.emergencyNotes.precautions.join('; '),
    profile.emergencyNotes.emergencyContactName,
    profile.emergencyNotes.emergencyContactRelation,
    profile.emergencyNotes.emergencyContactPhone,
    profile.emergencyNotes.criticalNotes,
  ].map(escapeCell).join(','));

  lines.push('');

  // Section 7: Audit Log of all Data Inputs, Updates, Edits & Deletions
  lines.push('=== PATIENT AUDIT & INPUT LOG (EDIT / UPDATE / DELETE / SAVE) ===');
  lines.push(['Timestamp', 'Category', 'Action', 'Field Name', 'Previous Value', 'New Value', 'Authorized By', 'Status'].map(escapeCell).join(','));
  (profile.auditLogs || []).forEach((log) => {
    lines.push([
      log.timestamp,
      log.category,
      log.action,
      log.fieldName,
      log.previousValue,
      log.newValue,
      log.authorizedBy,
      log.status,
    ].map(escapeCell).join(','));
  });

  return lines.join('\n');
}

/**
 * Download CSV file directly to user device for drag-and-drop into Google Sheets
 */
export function downloadGoogleSheetsCSV(profile: PatientProfile): void {
  const csvData = generateGoogleSheetsCSV(profile);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = (profile.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `GoogleSheets_PatientRecord_${safeName}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy Tab-Separated Values (TSV) directly to clipboard so user can paste into cell A1 in Google Sheets
 */
export async function copyForGoogleSheets(profile: PatientProfile): Promise<boolean> {
  try {
    const csvContent = generateGoogleSheetsCSV(profile);
    const tsvContent = csvContent
      .split('\n')
      .map((line) => {
        if (line.startsWith('===')) return line;
        const cells: string[] = [];
        let cur = '';
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQuote && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuote = !inQuote;
            }
          } else if (ch === ',' && !inQuote) {
            cells.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
        cells.push(cur);
        return cells.join('\t');
      })
      .join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(tsvContent);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy for Google Sheets', err);
    return false;
  }
}

/**
 * Synchronize to Google Sheets Webhook / Apps Script Web App Endpoint
 */
export async function syncToGoogleSheetsWebhook(
  webhookUrl: string,
  profile: PatientProfile,
  recentAuditLogs: PatientAuditLogEntry[] = [],
  bedTelemetry?: {
    connectedBedId?: string;
    headAngle?: number;
    kneeAngle?: number;
    bedHeight?: number;
    trendelenburgAngle?: number;
    batteryPercent?: number;
    isCharging?: boolean;
  },
  spreadsheetId?: string
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return {
      success: false,
      message: 'Please provide a valid Google Sheets Apps Script Webhook URL (starts with https://script.google.com/...).',
    };
  }

  try {
    const extractedId = spreadsheetId || extractGoogleSpreadsheetId(profile.googleSheetConfig?.spreadsheetId);

    const payload = {
      action: 'syncPatientRecord',
      syncTime: new Date().toISOString(),
      spreadsheetId: extractedId || undefined,
      patient: {
        name: profile.name,
        mrn: profile.mrn,
        dob: profile.dob,
        age: profile.age,
        sex: profile.sex,
        bloodType: profile.bloodType,
        heightCm: profile.heightCm,
        massKg: profile.massKg,
        tareOffsetKg: profile.tareOffsetKg,
        stability: profile.stability,
        mobility: profile.mobility,
        bedId: profile.bedId,
        lastUpdated: profile.lastUpdated,
      },
      vitals: profile.vitals,
      diagnosticReportsCount: profile.diagnosticReports.length,
      medicationsCount: profile.medications.length,
      doctorVisitsCount: profile.doctorVisits.length,
      codeStatus: profile.emergencyNotes.codeStatus,
      auditLogsCount: (profile.auditLogs || []).length,
      recentLogs: recentAuditLogs.slice(0, 10),
      bedTelemetry: bedTelemetry || undefined,
      csvData: generateGoogleSheetsCSV(profile),
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors', // Standard for Google Apps Script Web Apps to prevent CORS block
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Patient telemetry successfully collected and sent to your Google Sheet!',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to connect to Google Sheets Webhook.',
    };
  }
}
