import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLasso, beginLasso, extendLasso, finishLasso, refillLasso } from '../game/src/lasso.js';

function drawSquare(l, cx, cy, s) {
  beginLasso(l, cx - s, cy - s);
  extendLasso(l, cx + s, cy - s);
  extendLasso(l, cx + s, cy + s);
  extendLasso(l, cx - s, cy + s);
  extendLasso(l, cx - s + 4, cy - s + 3);
}

test('drawing drains energy by path length', () => {
  const l = createLasso(1000);
  beginLasso(l, 0, 0);
  extendLasso(l, 30, 40); // 50 px of path
  assert.equal(l.energy, 950);
});

test('a square drawn back to its start finishes as a closed loop', () => {
  const l = createLasso(5000);
  drawSquare(l, 200, 200, 60);
  const r = finishLasso(l);
  assert.equal(r.closed, true);
  assert.ok(r.area > 10000, `area ${r.area}`);
  assert.equal(l.active, false);
});

test('an open path does not close', () => {
  const l = createLasso(5000);
  beginLasso(l, 0, 0);
  extendLasso(l, 200, 0);
  extendLasso(l, 200, 200);
  const r = finishLasso(l);
  assert.equal(r.closed, false);
});

test('a tiny closed loop is too small to count', () => {
  const l = createLasso(5000);
  drawSquare(l, 100, 100, 8); // 16x16 loop, area 256 < 900 minimum
  const r = finishLasso(l);
  assert.equal(r.closed, false);
});

test('running out of energy ends the stroke', () => {
  const l = createLasso(100);
  beginLasso(l, 0, 0);
  extendLasso(l, 60, 0);
  const ok = extendLasso(l, 160, 0); // needs 100 more, only 40 left
  assert.equal(ok, false);
  assert.equal(l.energy, 0);
});

test('refill restores energy up to the maximum, but not while drawing', () => {
  const l = createLasso(1000);
  beginLasso(l, 0, 0);
  extendLasso(l, 30, 40);
  refillLasso(l, 1); // drawing: no refill
  assert.equal(l.energy, 950);
  finishLasso(l);
  refillLasso(l, 1); // 260/s refill
  assert.equal(l.energy, 1000); // capped at max
});

test('points closer than the spacing are not added twice', () => {
  const l = createLasso(1000);
  beginLasso(l, 0, 0);
  extendLasso(l, 1, 1);
  extendLasso(l, 2, 2);
  assert.equal(l.points.length, 1);
});
