// scoring.js — the score keeper for NEON ROUNDUP. Pure logic: it owns the
// score, the combo chain and the run statistics, and decides what a closed
// lasso full of drones is worth. No DOM, no rendering.

export const BASE_POINTS = { cyan: 100, magenta: 100, amber: 100, lime: 100, gold: 300 };
export const MIXED_PER_DRONE = 40;
export const COMBO_CAP = 8;

export function createScore() {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    captures: 0,
    dronesCaught: 0,
    snaps: 0,
    fizzles: 0,
  };
}

// Resolve one closed loop. `kinds` is the kind of every drone whose centre
// fell inside the loop ('cyan' | 'magenta' | 'amber' | 'lime' | 'gold' |
// 'glitch'). Gold drones are wildcards: they join any single colour.
// Returns { outcome, points, multiplier } and updates the score state.
export function resolveCapture(state, kinds) {
  if (!kinds || kinds.length === 0) {
    state.fizzles += 1;
    return { outcome: 'empty', points: 0, multiplier: 0 };
  }
  if (kinds.includes('glitch')) {
    state.snaps += 1;
    state.combo = 0;
    return { outcome: 'snap', points: 0, multiplier: 0 };
  }
  const colours = new Set(kinds.filter((k) => k !== 'gold'));
  if (colours.size <= 1) {
    state.combo += 1;
    const multiplier = Math.min(state.combo, COMBO_CAP);
    const base = kinds.reduce((sum, k) => sum + (BASE_POINTS[k] ?? 100), 0);
    const points = base * multiplier;
    state.score += points;
    state.captures += 1;
    state.dronesCaught += kinds.length;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    return { outcome: 'clean', points, multiplier };
  }
  const points = kinds.length * MIXED_PER_DRONE;
  state.score += points;
  state.captures += 1;
  state.dronesCaught += kinds.length;
  state.combo = 0;
  return { outcome: 'mixed', points, multiplier: 0 };
}
