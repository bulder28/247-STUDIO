import { describe, expect, it } from 'vitest';
import {
  buildAlias,
  buildEnrollmentPayload,
  EnrollmentFormInput,
  isValidMobilePhone,
  splitFullName,
  validateEnrollment,
  validateEnrollmentFields,
} from '../../src/shared/domain/enrollment';

const base: EnrollmentFormInput = {
  firstName: ' Marcos ',
  lastName: ' Silva  Pérez ',
  phone: '+34 600 000 000',
  contactEmail: ' Marcos@Example.com ',
  birthDate: '1995-05-05',
  belt: 'WHITE',
  stripes: '2',
  isFoundingMember: false,
  guardianName: 'Ana',
  guardianPhone: '611222333',
  guardianDni: '',
  guardianEmail: '',
  guardianUid: '',
};

describe('enrollment helpers', () => {
  it('splits a full name into first name and surnames', () => {
    expect(splitFullName('  Marcos  Silva Pérez ')).toEqual({ firstName: 'Marcos', lastName: 'Silva Pérez' });
    expect(splitFullName('Marcos')).toEqual({ firstName: 'Marcos', lastName: '' });
    expect(splitFullName('')).toEqual({ firstName: '', lastName: '' });
  });

  it('builds a trimmed alias', () => {
    expect(buildAlias(' Marcos ', ' Silva  Pérez ')).toBe('Marcos Silva Pérez');
    expect(buildAlias('Marcos', '')).toBe('Marcos');
  });

  it('validates mobile phones by digit count', () => {
    expect(isValidMobilePhone('+34 600 000 000')).toBe(true);
    expect(isValidMobilePhone('600-000-000')).toBe(true);
    expect(isValidMobilePhone('12345678')).toBe(false);
    expect(isValidMobilePhone('')).toBe(false);
    expect(isValidMobilePhone('abc123456789')).toBe(false);
  });

  it('requires first name, surnames, phone and birth date', () => {
    expect(validateEnrollment(base, false)).toBeNull();
    expect(validateEnrollment({ ...base, firstName: ' ' }, false)).toMatch(/nombre/);
    expect(validateEnrollment({ ...base, lastName: '' }, false)).toMatch(/apellidos/);
    expect(validateEnrollment({ ...base, phone: '123' }, false)).toMatch(/teléfono/);
    expect(validateEnrollment({ ...base, birthDate: '' }, false)).toMatch(/nacimiento/);
  });

  it('reports one message per invalid field', () => {
    const errors = validateEnrollmentFields(
      { ...base, firstName: '', phone: '1', contactEmail: 'nope', guardianName: '', guardianPhone: '' },
      true
    );
    expect(Object.keys(errors).sort()).toEqual(
      ['contactEmail', 'firstName', 'guardianName', 'guardianPhone', 'phone'].sort()
    );
    expect(validateEnrollmentFields(base, false)).toEqual({});
  });

  it('requires guardian name and phone for minors only', () => {
    expect(validateEnrollment({ ...base, guardianName: '' }, true)).toMatch(/tutor/);
    expect(validateEnrollment({ ...base, guardianPhone: '' }, true)).toMatch(/tutor/);
    expect(validateEnrollment({ ...base, guardianName: '', guardianPhone: '' }, false)).toBeNull();
  });

  it('builds the payload without tariff fields and drops guardian data for adults', () => {
    const payload = buildEnrollmentPayload({ ...base, isFoundingMember: true }, false);
    expect(payload).toMatchObject({
      firstName: 'Marcos',
      lastName: 'Silva Pérez',
      alias: 'Marcos Silva Pérez',
      contactEmail: 'marcos@example.com',
      stripes: 2,
      isFoundingMember: true,
      guardianName: '',
    });
    expect(payload).not.toHaveProperty('activeTariffId');
    expect(payload).not.toHaveProperty('pricingTier');
  });

  it('keeps guardian data for minors', () => {
    const payload = buildEnrollmentPayload(base, true);
    expect(payload.guardianName).toBe('Ana');
    expect(payload.guardianPhone).toBe('611222333');
  });
});
