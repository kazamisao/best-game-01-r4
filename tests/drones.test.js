import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, createField, spawnWave, stepDrones, COLORS } from '../game/src/drones.js';

const W = 1280, H = 720;

test('mulberry32 is deterministic for a seed', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('mulberry32 output stays in [0, 1)', () => {
  const r = mulberry32(7);
  for (let i = 0; i < 100; i++) {
    const v = r();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test('wave 1 spawns the base count, all inside the arena, no glitches', () => {
  const field = createField();
  const rng = mulberry32(1);
  const added = spawnWave(field, 1, rng, W, H);
  assert.equal(added.length, 6);
  assert.equal(field.drones.length, 6);
  for (const d of field.drones) {
    assert.ok(d.x >= d.r && d.x <= W - d.r, 'x in bounds');
    assert.ok(d.y >= d.r && d.y <= H - d.r, 'y in bounds');
    assert.notEqual(d.kind, 'glitch');
    assert.ok(COLORS.includes(d.kind) || d.kind === 'gold');
  }
});

test('later waves add more drones and glitches appear from wave 3', () => {
  const field = createField();
  const rng = mulberry32(3);
  spawnWave(field, 1, rng, W, H);
  const w2 = spawnWave(field, 2, rng, W, H);
  assert.equal(w2.length, 8);
  let sawGlitch = false;
  for (let w = 3; w <= 8; w++) {
    const added = spawnWave(field, w, rng, W, H);
    if (added.some(d => d.kind === 'glitch')) sawGlitch = true;
    field.drones.length = 0; // keep the arena from capping while we probe kinds
  }
  assert.ok(sawGlitch, 'expected at least one glitch across waves 3-8');
});

test('the field caps the number of living drones', () => {
  const field = createField();
  const rng = mulberry32(9);
  for (let w = 1; w <= 10; w++) spawnWave(field, w, rng, W, H);
  assert.ok(field.drones.length <= 26, `cap exceeded: ${field.drones.length}`);
});

test('stepDrones moves drones by velocity times dt', () => {
  const field = createField();
  field.drones.push({ x: 100, y: 100, vx: 60, vy: -30, r: 16, kind: 'cyan', wobble: 0 });
  stepDrones(field, 0.5, W, H, mulberry32(5));
  const d = field.drones[0];
  assert.equal(d.x, 130);
  assert.equal(d.y, 85);
});

test('stepDrones bounces drones off the walls', () => {
  const field = createField();
  field.drones.push({ x: W - 18, y: 100, vx: 120, vy: 0, r: 16, kind: 'cyan', wobble: 0 });
  stepDrones(field, 0.2, W, H, mulberry32(5));
  const d = field.drones[0];
  assert.ok(d.x <= W - d.r, 'drone stayed inside');
  assert.ok(d.vx < 0, 'velocity reflected');
});
