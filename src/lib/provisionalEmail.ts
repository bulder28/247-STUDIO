/**
 * Las altas sin email real reciben uno provisional (nombre@pendiente.247.local).
 * Ese buzón no existe: no puede recibir correos de recuperación.
 */
export const PROVISIONAL_EMAIL_DOMAIN = 'pendiente.247.local';

export function isProvisionalEmail(email?: string | null): boolean {
  return Boolean(email) && email!.trim().toLowerCase().endsWith(`@${PROVISIONAL_EMAIL_DOMAIN}`);
}
