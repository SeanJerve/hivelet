/**
 * @file lib/sounds.ts
 * @description The few sounds Hivelet makes, for the moments that matter
 * (Sean, 2026-09-30: the admin's notification chime, applied on both sides and
 * not only to notifications).
 *
 *   notify   - something new arrived: a notification (admin and tenant alike)
 *   success  - what you just did was saved: a payment recorded, a repair sent,
 *              a reply saved, a tenant moved in (every success toast)
 *   problem  - what you just did did not go through (every error toast)
 *
 * Soft sine tones from the Web Audio API, no files to download. ONE audio
 * context, created on the first tap or key press: browsers refuse sound before
 * the person has interacted, and a context made later from a timer (a
 * notification arriving) would stay silent. Two sounds of the same kind within
 * a second play once, so a burst of toasts is not a burst of noise.
 */
let ctx: AudioContext | null = null;
const lastPlayed: Record<string, number> = {};

function context(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Unlock on the first interaction, so a later notification can be heard.
if (typeof window !== 'undefined') {
  const unlock = () => {
    context();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function tone(c: AudioContext, freq: number, start: number, length: number, volume: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, c.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + length);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + length + 0.02);
}

export type SoundKind = 'notify' | 'success' | 'problem';

export function playSound(kind: SoundKind): void {
  const now = Date.now();
  if (now - (lastPlayed[kind] ?? 0) < 1000) return;
  lastPlayed[kind] = now;
  const c = context();
  if (!c || c.state !== 'running') return;
  try {
    if (kind === 'notify') {
      // The admin's original chime: E5 then A5.
      tone(c, 659.25, 0, 0.25, 0.08);
      tone(c, 880, 0.08, 0.27, 0.08);
    } else if (kind === 'success') {
      // Up a fifth, quick and light: "done".
      tone(c, 587.33, 0, 0.18, 0.06);
      tone(c, 880, 0.07, 0.24, 0.06);
    } else {
      // Down, low and short: "that did not go through".
      tone(c, 392, 0, 0.18, 0.06);
      tone(c, 293.66, 0.09, 0.26, 0.06);
    }
  } catch {
    /* sound is a courtesy; never an error */
  }
}
