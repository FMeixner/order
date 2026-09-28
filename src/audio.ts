/* Töne für Countdown und Pausen. Ein gemeinsamer AudioContext, freigeschaltet beim ersten Antippen. */
let ctx: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new C();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch { /* kein Audio */ }
}

export function beep(freq: number, dur = 0.15, vol = 0.2): void {
  try {
    if (!ctx) unlockAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch { /* ignorieren */ }
}

export const TONES = {
  tick: () => beep(1200, 0.08, 0.15),
  go: () => beep(880, 0.35, 0.25),
  last5: () => beep(660, 0.12, 0.2),
  done: () => { beep(1175, 0.25, 0.25); setTimeout(() => beep(1175, 0.35, 0.25), 300); },
  gong: () => beep(440, 1.2, 0.15),
};

export function vibrate(ms: number | number[]): void {
  try { navigator.vibrate?.(ms); } catch { /* ignorieren */ }
}
