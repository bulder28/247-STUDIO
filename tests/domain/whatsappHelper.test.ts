import { describe, expect, it } from 'vitest';
import {
  generateWhatsAppMessage,
  normalizeSpanishPhoneNumber,
} from '../../src/shared/utils/whatsappHelper';

describe('WhatsApp Helper & Phone Normalization', () => {
  it('normalizes 9-digit Spanish mobile numbers to 34XXXXXXXXX', () => {
    expect(normalizeSpanishPhoneNumber('612345678')).toBe('34612345678');
    expect(normalizeSpanishPhoneNumber('+34 612 34 56 78')).toBe('34612345678');
  });

  it('generates trial confirmation message with details', () => {
    const msg = generateWhatsAppMessage({
      phone: '612345678',
      recipientName: 'Carlos',
      templateType: 'TRIAL_CONFIRM',
      details: { date: 'Lunes 10', time: '20:00' },
    });
    expect(msg).toContain('¡Hola Carlos!');
    expect(msg).toContain('Lunes 10');
    expect(msg).toContain('20:00');
    expect(msg).toContain('Calle Águilas 2, Pinto');
  });

  it('generates graduation congratulations message', () => {
    const msg = generateWhatsAppMessage({
      phone: '612345678',
      recipientName: 'Elena',
      templateType: 'GRADUATION_CONGRATS',
      details: { beltOrStripe: 'Cinturón Azul' },
    });
    expect(msg).toContain('¡Enhorabuena Elena!');
    expect(msg).toContain('Cinturón Azul');
  });
});
