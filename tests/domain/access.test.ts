import { describe, expect, it } from 'vitest';
import { canAttend } from '../../src/shared/domain/access';
import { UserDomainModel } from '../../src/shared/domain/types';

describe('Dominio Puro: Verificación de Requisitos de Acceso al Tatami (canAttend)', () => {
  const baseConfig = { waiverVersion: 'v1.0' };

  const baseAdultUser: UserDomainModel = {
    uid: 'u-adult',
    authEmail: 'adult@example.com',
    contactEmail: 'adult@example.com',
    alias: 'MatMaster',
    phone: '+34600000000',
    emergencyContactName: 'Familiar',
    emergencyContactPhone: '+34611111111',
    birthDate: '1995-05-10',
    isMinor: false,
    beltSystem: 'ADULT',
    belt: 'BLUE',
    stripes: 2,
    beltDate: '2023-01-15',
    pricingTier: 'STD',
    activeTariffId: 'tariff-1',
    accountStatus: 'ACTIVE',
    permissions: [],
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  it('deniega acceso si el alumno no tiene firmado el waiver', () => {
    const userWithoutWaiver = { ...baseAdultUser };
    const result = canAttend(userWithoutWaiver, baseConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Waiver no firmado');
  });

  it('deniega acceso si la versión del waiver firmado está desactualizada', () => {
    const userOutdatedWaiver = {
      ...baseAdultUser,
      waiverSignedAt: '2024-01-01T10:00:00Z',
      waiverVersion: 'v0.9',
    };
    const result = canAttend(userOutdatedWaiver, baseConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('desactualizada');
  });

  it('permite acceso al adulto con waiver vigente firmado', () => {
    const validAdult = {
      ...baseAdultUser,
      waiverSignedAt: '2026-01-10T10:00:00Z',
      waiverVersion: 'v1.0',
      waiverSignedByUid: 'u-adult',
    };
    const result = canAttend(validAdult, baseConfig);
    expect(result.allowed).toBe(true);
  });

  it('deniega acceso a menor de 14 si no tiene tutor legal registrado', () => {
    const minorWithoutGuardian: UserDomainModel = {
      ...baseAdultUser,
      uid: 'u-minor',
      birthDate: '2012-04-10',
      isMinor: true,
      waiverSignedAt: '2026-01-10T10:00:00Z',
      waiverVersion: 'v1.0',
    };
    const result = canAttend(minorWithoutGuardian, baseConfig);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('sin tutor legal');
  });

  it('permite acceso a menor si el waiver fue firmado por su tutor legal registrado', () => {
    const minorWithGuardian: UserDomainModel = {
      ...baseAdultUser,
      uid: 'u-minor-2',
      birthDate: '2012-04-10',
      isMinor: true,
      guardianUid: 'u-tutor-99',
      waiverSignedAt: '2026-01-10T10:00:00Z',
      waiverVersion: 'v1.0',
      waiverSignedByUid: 'u-tutor-99',
    };
    const result = canAttend(minorWithGuardian, baseConfig);
    expect(result.allowed).toBe(true);
  });
});
