// lasso.js — the player's energy lasso. Drawing spends energy by the
// pixel; a stroke only counts when it comes back to its own start and
// wraps at least MIN_AREA square pixels. Pure logic on top of geometry.js.

import { dist, polygonArea, isClosed } from './geometry.js';

export const CLOSE_THRESHOLD = 34;
export const MIN_AREA = 900;
export const POINT_SPACING = 6;
export const REFILL_PER_SECOND = 260;

export function createLasso(maxEnergy) {
  return { points: [], energy: maxEnergy, maxEnergy, active: false };
}

export function beginLasso(lasso, x, y) {
  lasso.points = [{ x, y }];
  lasso.active = true;
}

export function lassoStunned(lasso) {
  return lasso.active === false && lasso.energy <= 0;
}

// Extend the stroke toward (x, y). Points closer than POINT_SPACING are
// ignored so a steady hand makes a clean curve. Returns false when the
// energy runs out mid-stroke.
export function extendLasso(lasso, x, y) {
  if (!lasso.active) return false;
  const last = lasso.points[lasso.points.length - 1];
  const d = dist(last, { x, y });
  if (d < POINT_SPACING) return true;
  if (d > lasso.energy) {
    lasso.energy = 0;
    return false;
  }
  lasso.points.push({ x, y });
  lasso.energy -= d;
  return true;
}

// End the stroke and judge it: closed means the path returned to its
// start and wraps enough area to hold a drone.
export function finishLasso(lasso) {
  const points = lasso.points;
  const area = polygonArea(points);
  const closed = lasso.active && isClosed(points, CLOSE_THRESHOLD) && area >= MIN_AREA;
  lasso.points = [];
  lasso.active = false;
  return { closed, area, points };
}

// Energy returns while the player is not drawing.
export function refillLasso(lasso, dt) {
  if (lasso.active) return;
  lasso.energy = Math.min(lasso.maxEnergy, lasso.energy + REFILL_PER_SECOND * dt);
}
