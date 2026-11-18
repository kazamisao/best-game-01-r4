// main.js — NEON ROUNDUP's conductor: canvas and input, the screen state
// machine (title -> play -> results), the wave clock, the combo decay,
// capture resolution and all the juice (particles, floaters, shake).
// The rules themselves live in geometry.js, drones.js, lasso.js and
// scoring.js; the drawing lives in render.js; the sounds in audio.js.

import { pointInPolygon } from './geometry.js';
import { createField, spawnWave, stepDrones, mulberry32 } from './drones.js';
import { createLasso, beginLasso, extendLasso, finishLasso, refillLasso } from './lasso.js';
import { createScore, resolveCapture } from './scoring.js';
import { sfx, setMuted, isMuted } from './audio.js';
import {
  KIND_COLORS, drawBackground, drawDrone, drawLasso, drawFlashes,
  drawParticles, drawFloaters, drawHUD, drawBanner, drawTitle,
  drawResults, drawPaused,
} from './render.js';
import { stageShot } from './shots.js';

const W = 1280;
const H = 720;
const TIME_TOTAL = 90;
const WAVE_EVERY = 14;
const LASSO_MAX = 1500;
const COMBO_WINDOW = 6;
const GOLD_LIFETIME = 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const state = {
  w: W,
  h: H,
  screen: 'title',
  time: 0,
  timeLeft: TIME_TOTAL,
  timeTotal: TIME_TOTAL,
  wave: 0,
  waveClock: 0,
  field: createField(),
  lasso: createLasso(LASSO_MAX),
  scoreState: createScore(),
  particles: [],
  floaters: [],
  flashes: [],
  banner: null,
  stun: 0,
  shake: 0,
  paused: false,
  best: 0,
  newBest: false,
  comboFrac: 0,
  lastCleanAt: -99,
  lastTickSecond: -1,
};

try {
  state.best = Number(localStorage.getItem('neon-roundup-best') || 0) || 0;
} catch {
  state.best = 0;
}

let rng = mulberry32((Math.random() * 1e9) | 0);
const shotParams = new URLSearchParams(location.search);
const shotMode = shotParams.has('shot');

// --- small effect helpers -------------------------------------------------

function burst(x, y, color, n = 14, speed = 240) {
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2;
    const sp = 40 + rng() * speed;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.45 + rng() * 0.5,
      maxLife: 0.95,
      color,
      size: 2.5 + rng() * 3.5,
    });
  }
}

function floater(x, y, text, color, size = 30) {
  state.floaters.push({ x, y, text, color, size, life: 1.15, maxLife: 1.15 });
}

function centroid(points) {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

// --- game flow --------------------------------------------------------------

function nextWave() {
  state.wave += 1;
  spawnWave(state.field, state.wave, rng, W, H);
  state.banner = { text: `WAVE ${state.wave}`, ttl: 1.6, max: 1.6 };
  if (state.wave > 1) sfx.wave(state.wave);
}

function startGame() {
  state.scoreState = createScore();
  state.field = createField();
  state.lasso = createLasso(LASSO_MAX);
  state.particles = [];
  state.floaters = [];
  state.flashes = [];
  state.wave = 0;
  state.waveClock = 0;
  state.timeLeft = TIME_TOTAL;
  state.stun = 0;
  state.shake = 0;
  state.paused = false;
  state.newBest = false;
  state.lastCleanAt = -99;
  state.lastTickSecond = -1;
  rng = mulberry32((Math.random() * 1e9) | 0);
  state.screen = 'play';
  nextWave();
  sfx.start();
}

function gameOver() {
  state.screen = 'over';
  state.lasso.active = false;
  state.lasso.points = [];
  if (state.scoreState.score > state.best) {
    state.best = state.scoreState.score;
    state.newBest = true;
    try {
      localStorage.setItem('neon-roundup-best', String(state.best));
    } catch { /* private mode: the best lives for this session only */ }
  }
  sfx.over();
}

// --- the lasso stroke -------------------------------------------------------

function finishStroke() {
  if (!state.lasso.active) return;
  const pts = state.lasso.points;
  const res = finishLasso(state.lasso);
  if (!res.closed) {
    if (pts.length > 3) {
      const tail = pts[pts.length - 1];
      burst(tail.x, tail.y, 'rgba(234,246,255,0.8)', 6, 120);
      sfx.fizzle();
    }
    return;
  }
  state.flashes.push({ points: res.points, ttl: 0.45, max: 0.45, color: '#eaf6ff' });
  const inside = state.field.drones.filter((d) => pointInPolygon(d, res.points));
  const kinds = inside.map((d) => d.kind);
  const result = resolveCapture(state.scoreState, kinds);
  const c = inside.length ? centroid(inside) : centroid(res.points);
  if (result.outcome === 'clean') {
    for (const d of inside) burst(d.x, d.y, KIND_COLORS[d.kind], 13);
    state.field.drones = state.field.drones.filter((d) => !inside.includes(d));
    floater(c.x, c.y - 24, `+${result.points.toLocaleString('en-US')}`, '#2fd8f2', 40);
    if (result.multiplier >= 2) floater(c.x, c.y + 16, `COMBO x${result.multiplier}`, '#ffb02e', 22);
    state.lastCleanAt = state.time;
    if (kinds.includes('gold')) sfx.gold(); else sfx.capture(state.scoreState.combo);
  } else if (result.outcome === 'mixed') {
    for (const d of inside) burst(d.x, d.y, KIND_COLORS[d.kind], 8);
    state.field.drones = state.field.drones.filter((d) => !inside.includes(d));
    floater(c.x, c.y - 20, `MIXED +${result.points}`, '#ffb02e', 30);
    sfx.mixed();
  } else if (result.outcome === 'snap') {
    const glitch = inside.find((d) => d.kind === 'glitch');
    if (glitch) burst(glitch.x, glitch.y, KIND_COLORS.glitch, 26, 320);
    floater(c.x, c.y - 20, 'SNAPPED!', '#ff3355', 38);
    state.shake = 0.4;
    state.stun = 0.9;
    sfx.snap();
  } else {
    floater(c.x, c.y - 14, 'EMPTY LOOP', 'rgba(234,246,255,0.65)', 20);
    sfx.fizzle();
  }
}

// --- input ------------------------------------------------------------------

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (W / rect.width),
    y: (e.clientY - rect.top) * (H / rect.height),
  };
}

canvas.addEventListener('pointerdown', (e) => {
  const p = pointerPos(e);
  if (state.screen !== 'play') { startGame(); return; }
  if (state.paused || state.stun > 0) return;
  if (state.lasso.energy < 60) return;
  beginLasso(state.lasso, p.x, p.y);
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', (e) => {
  if (!state.lasso.active) return;
  const p = pointerPos(e);
  if (!extendLasso(state.lasso, p.x, p.y)) finishStroke();
});

canvas.addEventListener('pointerup', () => finishStroke());
canvas.addEventListener('pointercancel', () => finishStroke());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (state.screen !== 'play') startGame();
  } else if (e.code === 'KeyR') {
    if (state.screen === 'over' || state.screen === 'title') startGame();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (state.screen === 'play') state.paused = !state.paused;
  } else if (e.code === 'KeyM') {
    setMuted(!isMuted());
  }
});

// --- update -----------------------------------------------------------------

function updateEffects(dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floaters) {
    f.y -= 44 * dt;
    f.life -= dt;
  }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  for (const f of state.flashes) f.ttl -= dt;
  state.flashes = state.flashes.filter((f) => f.ttl > 0);
  if (state.banner) {
    state.banner.ttl -= dt;
    if (state.banner.ttl <= 0) state.banner = null;
  }
  state.shake = Math.max(0, state.shake - dt);
}

function update(dt) {
  state.time += dt;
  if (state.screen === 'title' || state.screen === 'over') {
    if (state.field.drones.length === 0 && !shotMode) {
      spawnWave(state.field, 2, rng, W, H);
    }
    stepDrones(state.field, dt, W, H, rng);
    updateEffects(dt);
    return;
  }
  if (state.paused) return;

  state.timeLeft -= dt;
  const whole = Math.ceil(state.timeLeft);
  if (whole <= 5 && whole >= 1 && whole !== state.lastTickSecond) {
    state.lastTickSecond = whole;
    sfx.tick();
  }
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    gameOver();
    return;
  }
  state.waveClock += dt;
  if (state.waveClock >= WAVE_EVERY) {
    state.waveClock = 0;
    nextWave();
  }
  stepDrones(state.field, dt, W, H, rng);
  // gold drones are shy: they slip away after a few seconds
  for (const d of state.field.drones) if (d.kind === 'gold') d.bornAt += dt;
  const before = state.field.drones.length;
  state.field.drones = state.field.drones.filter((d) => d.kind !== 'gold' || d.bornAt < GOLD_LIFETIME);
  if (state.field.drones.length < before) {
    // a gold escaped; no penalty, just a whisper of particles is skipped
  }
  refillLasso(state.lasso, dt);
  state.stun = Math.max(0, state.stun - dt);
  if (state.scoreState.combo > 0) {
    state.comboFrac = Math.max(0, 1 - (state.time - state.lastCleanAt) / COMBO_WINDOW);
    if (state.comboFrac <= 0) state.scoreState.combo = 0;
  } else {
    state.comboFrac = 0;
  }
  updateEffects(dt);
}

// --- render -----------------------------------------------------------------

function render() {
  ctx.save();
  if (state.shake > 0) {
    const m = state.shake * 14;
    ctx.translate((rng() - 0.5) * m, (rng() - 0.5) * m);
  }
  drawBackground(ctx, W, H, state.time);
  for (const d of state.field.drones) drawDrone(ctx, d, state.time);
  drawFlashes(ctx, state.flashes);
  if (state.screen === 'play') drawLasso(ctx, state.lasso, state.time);
  drawParticles(ctx, state.particles);
  drawFloaters(ctx, state.floaters);
  if (state.screen === 'play') {
    drawHUD(ctx, state, W, H);
    drawBanner(ctx, state, W, H);
    if (state.stun > 0) {
      ctx.fillStyle = 'rgba(255, 51, 85, 0.10)';
      ctx.fillRect(0, 0, W, H);
    }
    if (state.paused) drawPaused(ctx, W, H);
  } else if (state.screen === 'title') {
    drawTitle(ctx, state, W, H);
  } else if (state.screen === 'over') {
    drawResults(ctx, state, W, H);
  }
  ctx.restore();
}

// --- boot -------------------------------------------------------------------

if (shotMode) {
  stageShot(state, shotParams.get('shot') || 'play', Number(shotParams.get('seed') || 1));
  let frames = 0;
  const tickShot = () => {
    state.time += 1 / 60;
    render();
    frames += 1;
    if (frames >= 24) {
      window.__shotReady = true;
      return;
    }
    requestAnimationFrame(tickShot);
  };
  requestAnimationFrame(tickShot);
} else {
  spawnWave(state.field, 2, rng, W, H);
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
