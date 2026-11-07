import confetti from 'canvas-confetti';

/**
 * Dispara confeti con los colores corporativos de 247Studio (Dorado, Rojo y Blanco)
 * para celebrar graduaciones, subidas de nivel o check-in presencial.
 */
export function triggerPromotionConfetti() {
  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;

  const defaults = {
    startVelocity: 30,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
    colors: ['#D4AF37', '#E11D2E', '#FFFFFF', '#F59E0B'],
  };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: NodeJS.Timeout = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Cañones desde ambos lados de la pantalla
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
}

/**
 * Disparo rápido para el Kiosco al registrar asistencia en el tatami
 */
export function triggerKioskCheckinConfetti() {
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#D4AF37', '#E11D2E', '#10B981'],
    zIndex: 9999,
  });
}
