// drones.js — the rogue drones of NEON ROUNDUP: a seeded generator, the
// wave table that decides what flies in, and the drift-and-bounce motion.
// Pure logic with an injected RNG so tests can replay any wave exactly.

export const COLORS = ['cyan', 'magenta', 'amber', 'lime'];
export const MAX_DRONES = 26;
export const GOLD_CHANCE = 0.06;

// Small deterministic RNG (mulberry32): same seed, same sky.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createField() {
  return { drones: [] };
}

function glitchChance(wave) {
  if (wave < 3) return 0;
  return Math.min(0.08 + 0.02 * (wave - 3), 0.2);
}

function rollKind(wave, rng) {
  const g = glitchChance(wave);
  const roll = rng();
  if (roll < g) return 'glitch';
  if (roll < g + GOLD_CHANCE) return 'gold';
  return COLORS[Math.floor(rng() * COLORS.length)];
}

// Add one wave of drones to the field. Wave n brings 6 + (n - 1) * 2
// drones, faster and meaner as n grows; the arena never holds more than
// MAX_DRONES. Returns the drones actually added.
export function spawnWave(field, wave, rng, width, height) {
  const wanted = 6 + (wave - 1) * 2;
  const room = Math.max(0, MAX_DRONES - field.drones.length);
  const count = Math.min(wanted, room);
  const added = [];
  const speedBase = 42 + wave * 5;
  for (let i = 0; i < count; i++) {
    const kind = rollKind(wave, rng);
    const r = kind === 'glitch' ? 17 : 16;
    const angle = rng() * Math.PI * 2;
    const speed = speedBase + rng() * 46;
    const drone = {
      x: r + 10 + rng() * (width - 2 * r - 20),
      y: r + 10 + rng() * (height - 2 * r - 20),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r,
      kind,
      wobble: rng() * Math.PI * 2,
      bornAt: 0,
    };
    field.drones.push(drone);
    added.push(drone);
  }
  return added;
}

// Advance every drone by dt seconds: straight drift, hard bounce off the
// arena walls. The wobble phase only drives the rotor animation.
export function stepDrones(field, dt, width, height, rng) {
  void rng; // motion is deterministic; the rng slot keeps callers uniform
  for (const d of field.drones) {
    d.wobble += dt * 9;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    if (d.x < d.r) { d.x = d.r; d.vx = Math.abs(d.vx); }
    if (d.x > width - d.r) { d.x = width - d.r; d.vx = -Math.abs(d.vx); }
    if (d.y < d.r) { d.y = d.r; d.vy = Math.abs(d.vy); }
    if (d.y > height - d.r) { d.y = height - d.r; d.vy = -Math.abs(d.vy); }
  }
}
