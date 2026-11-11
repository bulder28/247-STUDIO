/**
 * Pure helpers for the in-person student enrollment form.
 * No Firebase or DOM dependencies so they can be unit tested.
 */

export interface SplitName {
  firstName: string;
  lastName: string;
}

/** Splits a full name: first token is the first name, the rest are the surnames. */
export function splitFullName(fullName: string): SplitName {
  const tokens = (fullName || '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { firstName: '', lastName: '' };
  return { firstName: tokens[0], lastName: tokens.slice(1).join(' ') };
}

/** Builds the legacy `alias` (display name) from first name and surnames. */
export function buildAlias(firstName: string, lastName: string): string {
  return `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim().replace(/\s+/g, ' ');
}

/** A phone is valid when it has at least 9 digits once spaces, dashes, dots, parentheses and "+" are stripped. */
export function isValidMobilePhone(phone: string): boolean {
  const stripped = (phone || '').replace(/[\s\-().+]/g, '');
  return /^\d{9,15}$/.test(stripped);
}

export interface EnrollmentFormInput {
  firstName: string;
  lastName: string;
  phone: string;
  contactEmail: string;
  birthDate: string;
  belt: string;
  stripes: number | string;
  isFoundingMember: boolean;
  guardianName: string;
  guardianPhone: string;
  guardianDni: string;
  guardianEmail: string;
  guardianUid: string;
}

export type EnrollmentField =
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'birthDate'
  | 'contactEmail'
  | 'guardianName'
  | 'guardianPhone';

/** Display/DOM order of the validated fields (used to focus the first invalid one). */
export const ENROLLMENT_FIELD_ORDER: EnrollmentField[] = [
  'firstName',
  'lastName',
  'phone',
  'birthDate',
  'contactEmail',
  'guardianName',
  'guardianPhone',
];

/** Per-field Spanish error messages. Empty object when the form is valid. */
export function validateEnrollmentFields(
  input: EnrollmentFormInput,
  isMinor: boolean
): Partial<Record<EnrollmentField, string>> {
  const errors: Partial<Record<EnrollmentField, string>> = {};
  if (!input.firstName.trim()) errors.firstName = 'El nombre del alumno es obligatorio.';
  if (!input.lastName.trim()) errors.lastName = 'Los apellidos del alumno son obligatorios.';
  if (!isValidMobilePhone(input.phone)) {
    errors.phone = 'El teléfono móvil es obligatorio (mínimo 9 dígitos).';
  }
  if (!input.birthDate) errors.birthDate = 'La fecha de nacimiento es obligatoria.';
  const email = (input.contactEmail || '').trim();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    errors.contactEmail = 'Introduce un correo electrónico válido o déjalo vacío.';
  }
  if (isMinor) {
    if (!input.guardianName.trim()) errors.guardianName = 'El nombre del tutor legal es obligatorio.';
    if (!input.guardianPhone.trim()) {
      errors.guardianPhone = 'El teléfono del tutor legal es obligatorio.';
    } else if (!isValidMobilePhone(input.guardianPhone)) {
      errors.guardianPhone = 'El teléfono del tutor debe tener al menos 9 dígitos.';
    }
  }
  return errors;
}

/** Returns the first Spanish user-facing error message, or null when the form is valid. */
export function validateEnrollment(input: EnrollmentFormInput, isMinor: boolean): string | null {
  const errors = validateEnrollmentFields(input, isMinor);
  const first = ENROLLMENT_FIELD_ORDER.find((f) => errors[f]);
  return first ? errors[first]! : null;
}

/**
 * Fields shared by the serverless function body and the client Firestore fallback.
 * Guardian data is only kept for minors. No tariff is assigned at enrollment.
 */
export function buildEnrollmentPayload(input: EnrollmentFormInput, isMinor: boolean) {
  const firstName = input.firstName.trim().replace(/\s+/g, ' ');
  const lastName = input.lastName.trim().replace(/\s+/g, ' ');
  const clean = (v: string) => (v || '').trim();
  return {
    firstName,
    lastName,
    alias: buildAlias(firstName, lastName),
    phone: clean(input.phone),
    contactEmail: clean(input.contactEmail).toLowerCase(),
    birthDate: input.birthDate,
    belt: input.belt,
    stripes: Number(input.stripes) || 0,
    isFoundingMember: Boolean(input.isFoundingMember),
    isMinor,
    guardianName: isMinor ? clean(input.guardianName) : '',
    guardianPhone: isMinor ? clean(input.guardianPhone) : '',
    guardianDni: isMinor ? clean(input.guardianDni) : '',
    guardianEmail: isMinor ? clean(input.guardianEmail) : '',
    guardianUid: isMinor ? clean(input.guardianUid) : '',
  };
}
