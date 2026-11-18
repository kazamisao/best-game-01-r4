// audio.js — every sound in NEON ROUNDUP is synthesised with WebAudio:
// no audio files, no network. A tiny synth voice plays capture arpeggios
// that climb with the combo, a noise burst for a snapped lasso, and soft
// blips for waves, ticks and menus. Created lazily on the first gesture.

let ctx = null;
let master = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  } catch {
    ctx = null;
  }
  return ctx;
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type = 'sine', vol = 0.5, when = 0, slideTo = null) {
  const ac = ensureContext();
  if (!ac || muted) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur = 0.25, vol = 0.5) {
  const ac = ensureContext();
  if (!ac || muted) return;
  const t0 = ac.currentTime;
  const len = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 900;
  const gain = ac.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 0.08, 'triangle', 0.3); },
  start() { tone(392, 0.1, 'triangle', 0.35); tone(523, 0.1, 'triangle', 0.35, 0.09); tone(784, 0.16, 'triangle', 0.4, 0.18); },
  capture(combo = 1) {
    const base = 440 * Math.pow(2, Math.min(combo, 8) / 12);
    tone(base, 0.1, 'square', 0.22);
    tone(base * 1.25, 0.1, 'square', 0.22, 0.06);
    tone(base * 1.5, 0.16, 'square', 0.26, 0.12);
  },
  mixed() { tone(300, 0.12, 'sawtooth', 0.18); tone(240, 0.16, 'sawtooth', 0.18, 0.08); },
  snap() { noiseBurst(0.3, 0.6); tone(140, 0.3, 'sawtooth', 0.4, 0, 55); },
  fizzle() { tone(220, 0.14, 'sine', 0.2, 0, 110); },
  gold() { tone(1180, 0.09, 'sine', 0.3); tone(1560, 0.14, 'sine', 0.3, 0.07); },
  wave(n) { tone(500 + n * 40, 0.1, 'triangle', 0.3); tone(750 + n * 40, 0.14, 'triangle', 0.3, 0.08); },
  tick() { tone(980, 0.05, 'square', 0.16); },
  over() { tone(523, 0.14, 'triangle', 0.35); tone(415, 0.14, 'triangle', 0.35, 0.14); tone(311, 0.3, 'triangle', 0.4, 0.28); },
};
