/** Petits bips WebAudio, créés au premier geste de l'utilisateur. Aucun fichier son. */
let ctx: AudioContext | null = null;
let on = true;

export function setSound(v: boolean): void {
  on = v;
}

function ac(): AudioContext | null {
  if (!on) return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number): void {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  tap: () => tone(520, 0.06, 'square', 0.05),
  deliver: (streak: number) => {
    const f = 440 * Math.pow(1.0595, Math.min(12, streak % 13));
    tone(f, 0.09, 'triangle', 0.12);
    tone(f * 1.5, 0.12, 'triangle', 0.1, 0.07);
  },
  miss: () => tone(220, 0.25, 'sawtooth', 0.1, 0, 90),
  over: () => {
    tone(330, 0.2, 'triangle', 0.12);
    tone(247, 0.2, 'triangle', 0.12, 0.18);
    tone(165, 0.4, 'triangle', 0.12, 0.36);
  },
};
