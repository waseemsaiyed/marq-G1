/**
 * Patient Vitals CSV Export & Sharing Service
 *
 * Formats, captures, downloads, and shares patient vitals as formatted CSV files
 * compliant with clinical record standards (RFC 4180 with UTF-8 BOM for Excel/Sheets).
 */

import { PatientProfile, VitalsReading } from '../types';

/**
 * Escapes values for standard RFC 4180 CSV compliance
 */
function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Derives a clinical assessment status based on standard vital sign thresholds
 */
export function getClinicalVitalsStatus(v: VitalsReading): string {
  const flags: string[] = [];

  if (v.heartRate > 100) flags.push('Tachycardia');
  else if (v.heartRate < 60) flags.push('Bradycardia');

  if (v.bloodPressureSys >= 140 || v.bloodPressureDia >= 90) flags.push('Hypertensive');
  else if (v.bloodPressureSys < 90 || v.bloodPressureDia < 60) flags.push('Hypotensive');

  if (v.spO2 < 92) flags.push('Hypoxemia Alert');
  else if (v.spO2 < 95) flags.push('Borderline O2');

  if (v.respiratoryRate > 22) flags.push('Tachypnea');
  else if (v.respiratoryRate < 10) flags.push('Bradypnea');

  if (v.temperatureC >= 38.0) flags.push('Febrile (Pyrexia)');
  else if (v.temperatureC < 35.5) flags.push('Hypothermia');

  if (v.painScore >= 7) flags.push('Severe Pain');

  if (flags.length === 0) return 'Within Normal Limits (Stable)';
  return flags.join('; ');
}

/**
 * Generates a clean, formatted CSV document containing clinical header and vital rows
 */
export function generateVitalsCsv(
  profile: PatientProfile,
  readings?: VitalsReading[]
): string {
  // Use provided readings or fallback to profile vitalsHistory or current vitals
  const vitalsList: VitalsReading[] =
    readings && readings.length > 0
      ? readings
      : profile.vitalsHistory && profile.vitalsHistory.length > 0
      ? profile.vitalsHistory
      : [profile.vitals];

  const now = new Date();
  const exportTimestamp = now.toLocaleString();
  const isoTimestamp = now.toISOString();

  // 1. Clinical Meta Header Block
  const headerLines: string[] = [
    `# =========================================================================`,
    `# HOSPITAL CLINICAL PATIENT VITALS AUDIT RECORD`,
    `# =========================================================================`,
    `# Facility / Ward:,"Smart ICU Care Unit - MARQ Bed System"`,
    `# Export Date:,"${exportTimestamp}"`,
    `# ISO 8601:,"${isoTimestamp}"`,
    `# Patient Name:,"${profile.name}"`,
    `# Medical Record No (MRN):,"${profile.mrn}"`,
    `# Bed Unit ID:,"${profile.bedId}"`,
    `# Age / Biological Sex:,"${profile.age} yrs / ${profile.sex}"`,
    `# Blood Type:,"${profile.bloodType}"`,
    `# Current Patient Mass:,"${profile.massKg.toFixed(1)} kg"`,
    `# Clinical Stability Level:,"${profile.stability}"`,
    `# Code Status:,"${profile.emergencyNotes?.codeStatus || 'FULL CODE'}"`,
    `# Total Readings Captured:,"${vitalsList.length}"`,
    `# =========================================================================`,
    ``, // Blank separator line
  ];

  // 2. CSV Column Definitions
  const columns = [
    'Record ID',
    'Recorded Timestamp',
    'Weight (kg)',
    'Heart Rate (bpm)',
    'Systolic BP (mmHg)',
    'Diastolic BP (mmHg)',
    'Blood Pressure (Combined)',
    'SpO2 Saturation (%)',
    'Respiratory Rate (bpm)',
    'Body Temp (Celsius)',
    'Body Temp (Fahrenheit)',
    'Pain Score (0-10)',
    'Clinical Assessment',
    'Clinical Notes',
  ];

  // 3. Data Rows
  const rows: string[] = vitalsList.map((v, index) => {
    const recordId = v.id || `VIT-${String(index + 1).padStart(3, '0')}`;
    const weightVal = v.weightKg !== undefined ? v.weightKg.toFixed(1) : profile.massKg.toFixed(1);
    const bpCombined = `${v.bloodPressureSys}/${v.bloodPressureDia} mmHg`;
    const tempF = ((v.temperatureC * 9) / 5 + 32).toFixed(1);
    const clinicalAssessment = getClinicalVitalsStatus(v);
    const notes = v.notes || 'Routine clinical monitoring';

    return [
      escapeCsvCell(recordId),
      escapeCsvCell(v.recordedAt),
      escapeCsvCell(weightVal),
      escapeCsvCell(v.heartRate),
      escapeCsvCell(v.bloodPressureSys),
      escapeCsvCell(v.bloodPressureDia),
      escapeCsvCell(bpCombined),
      escapeCsvCell(v.spO2),
      escapeCsvCell(v.respiratoryRate),
      escapeCsvCell(v.temperatureC.toFixed(1)),
      escapeCsvCell(tempF),
      escapeCsvCell(v.painScore),
      escapeCsvCell(clinicalAssessment),
      escapeCsvCell(notes),
    ].join(',');
  });

  return headerLines.join('\r\n') + columns.join(',') + '\r\n' + rows.join('\r\n') + '\r\n';
}

/**
 * Builds standard filename for the exported CSV
 */
export function getVitalsCsvFilename(profile: PatientProfile): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_');
  const patient = sanitize(profile.name || 'Patient');
  const bed = sanitize(profile.bedId || 'Bed');
  const dateStr = new Date().toISOString().slice(0, 10);
  return `${patient}_${bed}_Vitals_${dateStr}.csv`;
}

/**
 * Creates a Blob with UTF-8 BOM so Microsoft Excel and Sheets correctly render degree symbols
 */
export function createVitalsCsvBlob(csvContent: string): Blob {
  // \uFEFF is UTF-8 Byte Order Mark
  return new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
}

/**
 * Triggers a direct browser file download for the CSV
 */
export function downloadVitalsCsv(
  profile: PatientProfile,
  readings?: VitalsReading[]
): { success: boolean; filename: string } {
  const csvContent = generateVitalsCsv(profile, readings);
  const blob = createVitalsCsvBlob(csvContent);
  const filename = getVitalsCsvFilename(profile);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}

/**
 * Copies the formatted CSV text directly to the system clipboard
 */
export async function copyVitalsCsvToClipboard(
  profile: PatientProfile,
  readings?: VitalsReading[]
): Promise<boolean> {
  try {
    const csvContent = generateVitalsCsv(profile, readings);
    await navigator.clipboard.writeText(csvContent);
    return true;
  } catch (err) {
    console.error('Failed to copy CSV to clipboard:', err);
    return false;
  }
}

/**
 * Shares the CSV directly using Web Share API (native mobile share sheet on Android/iOS/Chrome)
 * Falls back to clipboard or direct file download if file sharing is unsupported.
 */
export async function shareVitalsCsv(
  profile: PatientProfile,
  readings?: VitalsReading[]
): Promise<{
  shared: boolean;
  method: 'native-file' | 'native-text' | 'clipboard' | 'download';
  message: string;
}> {
  const csvContent = generateVitalsCsv(profile, readings);
  const filename = getVitalsCsvFilename(profile);
  const blob = createVitalsCsvBlob(csvContent);

  const shareTitle = `Patient Vitals - ${profile.name} (${profile.bedId})`;
  const shareText = `Clinical vitals record for ${profile.name} (MRN: ${profile.mrn}, Bed: ${profile.bedId}) captured at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;

  // 1. Try Native File Sharing via Web Share API Level 2 (Supported on Mobile Chrome, Android WebView, iOS Safari)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: 'text/csv' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        });
        return {
          shared: true,
          method: 'native-file',
          message: 'Vitals CSV shared successfully via mobile share sheet.',
        };
      }
    } catch (err: any) {
      // User cancelled share dialog is not a failure
      if (err?.name === 'AbortError') {
        return {
          shared: false,
          method: 'native-file',
          message: 'Share dialog dismissed.',
        };
      }
      console.warn('File share attempt failed, trying text share fallback:', err);
    }

    // 2. Try text-based Web Share
    try {
      await navigator.share({
        title: shareTitle,
        text: `${shareText}\n\nCSV Summary:\nHR: ${profile.vitals.heartRate} bpm | BP: ${profile.vitals.bloodPressureSys}/${profile.vitals.bloodPressureDia} mmHg | SpO2: ${profile.vitals.spO2}% | Temp: ${profile.vitals.temperatureC}°C`,
      });
      return {
        shared: true,
        method: 'native-text',
        message: 'Vitals summary shared successfully.',
      };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return {
          shared: false,
          method: 'native-text',
          message: 'Share dialog dismissed.',
        };
      }
    }
  }

  // 3. Fallback: Download the file directly & copy notification
  downloadVitalsCsv(profile, readings);
  return {
    shared: true,
    method: 'download',
    message: `Downloaded CSV as "${filename}" (Native file share not available in this browser).`,
  };
}
