/**
 * 247 STUDIO - WhatsApp Direct Link Generator
 * Secure client-side generator for customer communication via WhatsApp
 */

export interface WhatsAppTemplateData {
  phone: string; // e.g. "612345678" or "+34612345678"
  recipientName: string;
  templateType: 'TRIAL_CONFIRM' | 'GRADUATION_CONGRATS' | 'PAYMENT_REMINDER' | 'CUSTOM';
  details?: {
    date?: string;
    time?: string;
    beltOrStripe?: string;
    amount?: number;
    customText?: string;
  };
}

/**
 * Normalizes phone number into international format without symbols
 * Default to Spain (+34) if starts with 6, 7, 8, 9
 */
export function normalizeSpanishPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('34') && digits.length === 11) {
    return digits;
  }
  if (digits.length === 9) {
    return `34${digits}`;
  }
  return digits;
}

export function generateWhatsAppMessage(data: WhatsAppTemplateData): string {
  const { recipientName, templateType, details } = data;

  switch (templateType) {
    case 'TRIAL_CONFIRM':
      return `¡Hola ${recipientName}! Oss 🥋 Te confirmamos tu clase de prueba en 247 STUDIO (Pinto).\n\n📅 Fecha: ${details?.date || 'Esta semana'}\n⏰ Hora: ${details?.time || '19:30'}\n📍 Ubicación: Calle Águilas 2, Pinto\n\nSolo necesitas traer ropa deportiva cómoda (camiseta y pantalón corto o mallas) y una botella de agua. ¡Nos vemos en el tatami! 💪`;

    case 'GRADUATION_CONGRATS':
      return `¡Enhorabuena ${recipientName}! 🥋🎉 Desde el equipo técnico de 247 STUDIO queremos felicitarte oficialmente por tu nuevo grado (${details?.beltOrStripe || 'nuevo cinturón'}). Tu constancia, disciplina y respeto en el tatami son un ejemplo para toda la academia. ¡A seguir rodando! Oss!`;

    case 'PAYMENT_REMINDER':
      return `Hola ${recipientName}, ¡buenos días! Te escribimos desde administración de 247 STUDIO para recordarte amablemente la renovación de tu cuota mensual (${details?.amount ? `${details.amount}€` : 'mensualidad'}). Puedes abonarla cómodamente en la recepción del tatami (efectivo o tarjeta) o mediante Bizum de academia. ¡Muchas gracias por tu compromiso! Oss.`;

    case 'CUSTOM':
    default:
      return details?.customText || `Hola ${recipientName}, te contactamos desde 247 STUDIO. Oss!`;
  }
}

export function openWhatsAppDirect(data: WhatsAppTemplateData): void {
  const cleanPhone = normalizeSpanishPhoneNumber(data.phone);
  const message = generateWhatsAppMessage(data);
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
