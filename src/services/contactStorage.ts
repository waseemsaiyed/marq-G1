export interface ContactDetails {
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  familyContactName: string;
  familyContactPhone: string;
  familyContactEmail: string;
  familyContactRelation: string;
}

const DEFAULT_CONTACTS: ContactDetails = {
  doctorName: 'Dr. Elizabeth Vance',
  doctorEmail: 'attending.doctor@marq-clinical.com',
  doctorPhone: '+15553829912',
  familyContactName: 'Robert Anderson',
  familyContactPhone: '+15558902344',
  familyContactEmail: 'robert.anderson@family.com',
  familyContactRelation: 'Spouse',
};

/**
 * Retrieves the global contact details referenced by share, telemetry broadcasts, and patient charting.
 */
export function getContactDetails(): ContactDetails {
  const stored = localStorage.getItem('marq_clinical_contacts');
  if (stored) {
    try {
      return { ...DEFAULT_CONTACTS, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_CONTACTS;
    }
  }
  return DEFAULT_CONTACTS;
}

/**
 * Persists the clinical and family contact details and triggers a custom notification event.
 */
export function saveContactDetails(details: ContactDetails): void {
  localStorage.setItem('marq_clinical_contacts', JSON.stringify(details));
  window.dispatchEvent(new CustomEvent('marq_contacts_changed', { detail: details }));
}
