import { AppConfigDomainModel, UserDomainModel } from './types';

/**
 * Determina si un alumno cumple con los requisitos legales y de seguridad para acceder al tatami y marcar ATTENDED.
 * 1. Debe contar con waiver firmado y actualizado a la versión requerida.
 * 2. Si es menor (<16), el waiver y el consentimiento deben haber sido firmados por un tutor (guardianUid).
 */
export function canAttend(
  user: UserDomainModel,
  config: Pick<AppConfigDomainModel, 'waiverVersion'>
): { allowed: boolean; reason?: string } {
  // 1. Verificación de Waiver
  if (!user.waiverSignedAt || !user.waiverVersion) {
    return { allowed: false, reason: 'Waiver no firmado' };
  }

  if (user.waiverVersion !== config.waiverVersion) {
    return { allowed: false, reason: 'Versión de waiver desactualizada' };
  }

  // 2. Verificación de Menores (<16)
  if (user.isMinor) {
    if (!user.guardianUid) {
      return { allowed: false, reason: 'Menor sin tutor legal asignado' };
    }
    if (!user.waiverSignedByUid || user.waiverSignedByUid !== user.guardianUid) {
      return { allowed: false, reason: 'El waiver debe ser suscrito por el tutor legal' };
    }
  }

  return { allowed: true };
}
