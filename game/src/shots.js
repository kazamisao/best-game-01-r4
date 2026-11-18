// shots.js — deterministic screenshot scenes. The game reads ?shot=<scene>
// &seed=<n> and stages a frozen, representative moment (the same trick the
// house games use), then sets window.__shotReady. Scenes: title, play (a
// lasso mid-draw around a cluster), capture (the instant a loop closes),
// over (the results screen).

import { mulberry32, spawnWave } from './drones.js';
import { beginLasso, extendLasso } from './lasso.js';
import { KIND_COLORS } from './render.js';

function scatter(state, seed, count) {
  const rng = mulberry32(seed);
  state.field.drones.length = 0;
  spawnWave(state.field, 2, rng, state.w, state.h);
  while (state.field.drones.length > count) state.field.drones.pop();
  for (const d of state.field.drones) d.wobble = rng() * 6.28;
}

function cluster(state, cx, cy, kind, n, seed) {
  const rng = mulberry32(seed);
  for (let i = 0; i < n; i++) {
    state.field.drones.push({
      x: cx + (rng() - 0.5) * 150,
      y: cy + (rng() - 0.5) * 110,
      vx: 30 - rng() * 60,
      vy: 20 - rng() * 40,
      r: 16,
      kind,
      wobble: rng() * 6.28,
      bornAt: 0,
    });
  }
}

export function stageShot(state, scene, seed) {
  // 1.56 + the 24 staged frames lands the start/restart prompt pulse
  // (period ~1.57 s) at its brightest on the captured frame.
  state.time = 1.56;
  if (scene === 'title') {
    state.screen = 'title';
    scatter(state, seed, 8);
    state.best = 24850;
    return;
  }
  if (scene === 'over') {
    state.screen = 'over';
    scatter(state, seed, 7);
    Object.assign(state.scoreState, {
      score: 24850, combo: 0, bestCombo: 9, captures: 21, dronesCaught: 63, snaps: 2,
    });
    state.wave = 7;
    state.best = 24850;
    state.newBest = true;
    return;
  }
  if (scene === 'capture') {
    state.screen = 'play';
    state.timeLeft = 63.5;
    state.wave = 2;
    Object.assign(state.scoreState, { score: 8300, combo: 4, bestCombo: 6, captures: 9, dronesCaught: 27 });
    state.comboFrac = 0.8;
    scatter(state, seed, 6);
    const cx = 800, cy = 400;
    cluster(state, cx, cy, 'cyan', 4, seed + 5);
    const loop = [];
    for (let i = 0; i <= 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      loop.push({ x: cx + Math.cos(a) * 148, y: cy + Math.sin(a) * 108 });
    }
    state.flashes.push({ points: loop, ttl: 0.95, max: 1, color: KIND_COLORS.cyan });
    const rng = mulberry32(seed + 9);
    for (const d of state.field.drones) {
      if (Math.abs(d.x - cx) > 170 || Math.abs(d.y - cy) > 130) continue;
      for (let i = 0; i < 12; i++) {
        const a = rng() * Math.PI * 2;
        const sp = 40 + rng() * 130;
        state.particles.push({
          x: d.x, y: d.y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0.78 + rng() * 0.17, maxLife: 0.95,
          color: KIND_COLORS.cyan, size: 4 + rng() * 4,
        });
      }
    }
    state.floaters.push({ x: cx, y: cy - 150, text: '+2,400', life: 1.1, maxLife: 1.2, color: '#2fd8f2', size: 46 });
    state.floaters.push({ x: cx, y: cy - 108, text: 'CLEAN! COMBO x5', life: 1.1, maxLife: 1.2, color: '#ffb02e', size: 23 });
    return;
  }
  // 'play': a lasso mid-draw, three quarters around a magenta cluster,
  // a gold drone escaping top-right, a glitch lurking bottom-left.
  state.screen = 'play';
  state.timeLeft = 47.3;
  state.wave = 3;
  Object.assign(state.scoreState, { score: 12450, combo: 5, bestCombo: 7, captures: 14, dronesCaught: 38 });
  state.comboFrac = 0.62;
  scatter(state, seed, 7);
  const cx = 470, cy = 420;
  cluster(state, cx, cy, 'magenta', 4, seed + 3);
  state.field.drones.push({ x: 1060, y: 170, vx: -55, vy: 25, r: 16, kind: 'gold', wobble: 1.3, bornAt: 0 });
  state.field.drones.push({ x: 190, y: 580, vx: 40, vy: -18, r: 17, kind: 'glitch', wobble: 4.1, bornAt: 0 });
  beginLasso(state.lasso, cx - 150, cy + 60);
  const rng = mulberry32(seed + 7);
  for (let i = 1; i <= 26; i++) {
    const a = Math.PI * 0.72 + (i / 26) * Math.PI * 1.5;
    extendLasso(state.lasso, cx + Math.cos(a) * 152, cy + Math.sin(a) * 116);
  }
  void rng;
}
