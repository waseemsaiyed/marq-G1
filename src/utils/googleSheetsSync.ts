import { PatientProfile, PatientAuditLogEntry } from '../types';

/**
 * Generate Google Sheets compatible CSV containing all patient details,
 * clinical inputs, and audit logs.
 */
export function generateGoogleSheetsCSV(profile: PatientProfile): string {
  const lines: string[] = [];

  // Helper to escape CSV cell values
  const escapeCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // Section 1: Patient Demographics & Bed Identification
  lines.push('=== PATIENT DEMOGRAPHICS & BED IDENTIFICATION ===');
  lines.push(['Patient Name', 'Age', 'Sex', 'MRN', 'DOB', 'Blood Type', 'Height (cm)', 'Mass (kg)', 'Tare (kg)', 'Stability', 'Mobility', 'Bed ID', 'Last Updated'].map(escapeCell).join(','));
  lines.push([
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
    profile.lastUpdated
  ].map(escapeCell).join(','));

  lines.push('');

  // Section 2: Clinical Vitals
  lines.push('=== CLINICAL VITALS RECORD ===');
  lines.push(['Recorded At', 'Heart Rate (bpm)', 'Blood Pressure Sys', 'Blood Pressure Dia', 'SpO2 (%)', 'Resp Rate (rpm)', 'Temp (C)', 'Pain Score (0-10)', 'Clinical Notes'].map(escapeCell).join(','));
  lines.push([
    profile.vitals.recordedAt,
    profile.vitals.heartRate,
    profile.vitals.bloodPressureSys,
    profile.vitals.bloodPressureDia,
    profile.vitals.spO2,
    profile.vitals.respiratoryRate,
    profile.vitals.temperatureC,
    profile.vitals.painScore,
    profile.vitals.notes || ''
  ].map(escapeCell).join(','));

  lines.push('');

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
    profile.emergencyNotes.criticalNotes
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
      log.status
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
    // Convert CSV lines into TSV for native spreadsheet clipboard pasting
    const tsvContent = csvContent
      .split('\n')
      .map((line) => {
        if (line.startsWith('===')) return line;
        // Parse CSV columns and join with tab
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
  recentAuditLogs: PatientAuditLogEntry[]
): Promise<{ success: boolean; message: string }> {
  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    return { success: false, message: 'Please provide a valid Google Sheets Apps Script Webhook URL.' };
  }

  try {
    const payload = {
      action: 'syncPatientRecord',
      syncTime: new Date().toISOString(),
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
      csvData: generateGoogleSheetsCSV(profile),
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'no-cors', // standard for Google Apps Script Web Apps to prevent CORS block
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      message: 'Payload successfully dispatched to Google Sheets Webhook.',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to connect to Google Sheets Webhook.',
    };
  }
}
