import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScore, resolveCapture } from '../game/src/scoring.js';

test('clean capture of one colour scores base times combo multiplier', () => {
  const s = createScore();
  const r = resolveCapture(s, ['cyan', 'cyan', 'cyan']);
  assert.equal(r.outcome, 'clean');
  assert.equal(r.points, 300); // 3 x 100 x combo 1
  assert.equal(s.score, 300);
  assert.equal(s.combo, 1);
  assert.equal(s.captures, 1);
  assert.equal(s.dronesCaught, 3);
});

test('combo grows on consecutive clean captures and multiplies', () => {
  const s = createScore();
  resolveCapture(s, ['cyan', 'cyan', 'cyan']);
  const r = resolveCapture(s, ['magenta', 'magenta']);
  assert.equal(r.outcome, 'clean');
  assert.equal(s.combo, 2);
  assert.equal(r.points, 400); // 2 x 100 x combo 2
  assert.equal(s.bestCombo, 2);
});

test('gold drones are worth 300 base and act as wildcards for one colour', () => {
  const s = createScore();
  const r = resolveCapture(s, ['cyan', 'gold', 'cyan']);
  assert.equal(r.outcome, 'clean');
  assert.equal(r.points, 500); // (100 + 300 + 100) x combo 1
});

test('a capture of only gold is clean', () => {
  const s = createScore();
  const r = resolveCapture(s, ['gold', 'gold']);
  assert.equal(r.outcome, 'clean');
  assert.equal(r.points, 600);
});

test('mixed colours pay a flat rate and reset the combo', () => {
  const s = createScore();
  resolveCapture(s, ['cyan', 'cyan']);
  assert.equal(s.combo, 1);
  const r = resolveCapture(s, ['cyan', 'magenta', 'amber']);
  assert.equal(r.outcome, 'mixed');
  assert.equal(r.points, 120); // 3 x 40
  assert.equal(s.combo, 0);
  assert.equal(s.dronesCaught, 5);
});

test('a glitch inside the loop snaps it: no points, combo lost', () => {
  const s = createScore();
  resolveCapture(s, ['cyan', 'cyan']);
  const r = resolveCapture(s, ['lime', 'glitch', 'lime']);
  assert.equal(r.outcome, 'snap');
  assert.equal(r.points, 0);
  assert.equal(s.combo, 0);
  assert.equal(s.snaps, 1);
  assert.equal(s.dronesCaught, 2); // the clean pair only
});

test('an empty loop is a fizzle and changes nothing', () => {
  const s = createScore();
  const r = resolveCapture(s, []);
  assert.equal(r.outcome, 'empty');
  assert.equal(r.points, 0);
  assert.equal(s.score, 0);
  assert.equal(s.combo, 0);
});

test('combo multiplier caps at 8', () => {
  const s = createScore();
  let last;
  for (let i = 0; i < 12; i++) last = resolveCapture(s, ['cyan']);
  assert.equal(s.combo, 12);
  assert.equal(last.multiplier, 8);
  assert.equal(last.points, 800); // 1 x 100 x 8
});
