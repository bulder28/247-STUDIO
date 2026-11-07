/**
 * 247 STUDIO - Martial Arts Dojo Audio Synthesizer
 * Uses Web Audio API to produce zero-latency, offline martial arts sounds
 * (gongs, round bells, count down ticks, promotion chimes) without external assets.
 */

class DojoAudioEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Traditional Dojo Gong
   * Deep harmonic meditation gong with lingering resonance
   */
  public playGong(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const fundamental = 130.81; // C3

      // Multi-harmonic overtone synthesis for authentic bell metal
      const harmonics = [1, 1.48, 2.05, 2.82, 3.45];
      const gains = [0.4, 0.25, 0.18, 0.1, 0.05];

      harmonics.forEach((h, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(fundamental * h, now);

        gain.gain.setValueAtTime(gains[idx], now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 3.2);
      });
    } catch {
      // Audio not permitted yet
    }
  }

  /**
   * Boxing / Sparring Round Bell
   * Dual metallic ping at start and end of rounds
   */
  public playRoundBell(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.18].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now + delay); // A5 metallic bell
        gain.gain.setValueAtTime(0.3, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.8);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Woodblock Warning Tick (10s before round ends)
   */
  public playWoodTick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {
      // Ignore
    }
  }

  /**
   * Belt Promotion Victory Chime
   */
  public playPromotionFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Haptic vibration feedback for mobile devices
   */
  public triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light'): void {
    if (typeof window !== 'undefined' && 'navigator' in window && window.navigator.vibrate) {
      try {
        switch (type) {
          case 'light':
            window.navigator.vibrate(20);
            break;
          case 'medium':
            window.navigator.vibrate(50);
            break;
          case 'success':
            window.navigator.vibrate([30, 60, 40]);
            break;
          case 'warning':
            window.navigator.vibrate([80, 50, 80]);
            break;
        }
      } catch {
        // Ignorar si el navegador restringe la vibración
      }
    }
  }
}

export const dojoAudio = new DojoAudioEngine();
