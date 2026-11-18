// render.js — everything NEON ROUNDUP draws, and nothing else: the star
// field and grid, the drones, the glowing lasso, capture bursts, floating
// score text, the HUD, and the title / pause / results screens. It reads
// the game state and never changes it.

export const KIND_COLORS = {
  cyan: '#2fd8f2',
  magenta: '#f26ee8',
  amber: '#ffb02e',
  lime: '#a6e34d',
  gold: '#ffe14d',
  glitch: '#ff3355',
};

const BG = '#060913';
const INK = '#eaf6ff';

// A fixed star field, generated once from a tiny seeded walk so every
// frame (and every screenshot) shows the same sky.
const STARS = (() => {
  const stars = [];
  let s = 1234567;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = 0; i < 110; i++) stars.push({ x: rnd(), y: rnd(), r: rnd() * 1.6 + 0.4, p: rnd() * 6.28 });
  return stars;
})();

function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}

export function drawBackground(ctx, w, h, t) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(64, 180, 255, 0.055)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
  for (let y = 0; y <= h; y += 64) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
  ctx.stroke();
  for (const star of STARS) {
    const tw = 0.35 + 0.3 * Math.sin(t * 1.7 + star.p);
    ctx.fillStyle = `rgba(190, 225, 255, ${tw.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(star.x * w, star.y * h, star.r, 0, 6.2832);
    ctx.fill();
  }
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,10,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function drawDrone(ctx, d, t) {
  const color = KIND_COLORS[d.kind];
  const pulse = 1 + 0.06 * Math.sin(d.wobble * 0.7);
  ctx.save();
  ctx.translate(d.x, d.y);
  if (d.kind === 'glitch') {
    ctx.rotate(0.15 * Math.sin(t * 7 + d.wobble));
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#180a12';
    ctx.beginPath();
    const spikes = 9;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i / (spikes * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? d.r * 1.25 : d.r * 0.78;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, 6.2832);
    ctx.fill();
    ctx.restore();
    return;
  }
  // halo
  ctx.fillStyle = color;
  ctx.globalAlpha = d.kind === 'gold' ? 0.22 : 0.13;
  ctx.beginPath();
  ctx.arc(0, 0, d.r * 1.9 * pulse, 0, 6.2832);
  ctx.fill();
  ctx.globalAlpha = 1;
  // rotor arcs
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  for (let k = 0; k < 2; k++) {
    const a0 = d.wobble + k * Math.PI;
    ctx.beginPath();
    ctx.arc(0, 0, d.r * 1.28, a0, a0 + 1.15);
    ctx.stroke();
  }
  // body
  const body = ctx.createRadialGradient(-d.r * 0.35, -d.r * 0.35, 2, 0, 0, d.r);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(0.25, color);
  body.addColorStop(1, '#0b1226');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, d.r * pulse, 0, 6.2832);
  ctx.fill();
  ctx.shadowBlur = 0;
  // eye, looking along the velocity
  const look = Math.atan2(d.vy, d.vx);
  const ex = Math.cos(look) * d.r * 0.34;
  const ey = Math.sin(look) * d.r * 0.34;
  ctx.fillStyle = '#081020';
  ctx.beginPath();
  ctx.arc(ex, ey, d.r * 0.3, 0, 6.2832);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex + 1.5, ey - 1.5, d.r * 0.11, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}

export function drawLasso(ctx, lasso, t) {
  const pts = lasso.points;
  if (!pts || pts.length < 2) return;
  const frac = Math.max(0, lasso.energy / lasso.maxEnergy);
  const hue = frac > 0.35 ? '#2fd8f2' : '#ff3355';
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // closing hint: a faint thread from the tail back to the start
  if (lasso.active && pts.length > 3) {
    const first = pts[0];
    const last = pts[pts.length - 1];
    const gap = Math.hypot(first.x - last.x, first.y - last.y);
    ctx.strokeStyle = gap <= 34 ? 'rgba(166, 227, 77, 0.85)' : 'rgba(234, 246, 255, 0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(first.x, first.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = gap <= 34 ? '#a6e34d' : INK;
    ctx.beginPath();
    ctx.arc(first.x, first.y, 5, 0, 6.2832);
    ctx.fill();
  }
  ctx.strokeStyle = hue;
  ctx.shadowColor = hue;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
  void t;
  ctx.restore();
}

export function drawFlashes(ctx, flashes) {
  for (const f of flashes) {
    const a = Math.max(0, f.ttl / f.max);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(f.points[0].x, f.points[0].y);
    for (let i = 1; i < f.points.length; i++) ctx.lineTo(f.points[i].x, f.points[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

export function drawParticles(ctx, particles) {
  for (const p of particles) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * a + 0.4, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }
}

export function drawFloaters(ctx, floaters) {
  for (const f of floaters) {
    const a = Math.max(0, f.life / f.maxLife);
    ctx.save();
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.font = `800 ${f.size}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    ctx.shadowBlur = 12;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function bar(ctx, x, y, w, h, frac, color) {
  ctx.fillStyle = 'rgba(234,246,255,0.14)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

export function drawHUD(ctx, state, w, h) {
  const s = state.scoreState;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = "800 15px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('SCORE', 26, 40);
  ctx.font = "900 40px 'Segoe UI', Arial, sans-serif";
  ctx.shadowColor = '#2fd8f2';
  ctx.shadowBlur = 12;
  ctx.fillText(fmt(s.score), 24, 82);
  ctx.shadowBlur = 0;
  if (s.combo >= 2) {
    ctx.fillStyle = '#ffb02e';
    ctx.font = "900 26px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`COMBO x${Math.min(s.combo, 8)}`, 26, 118);
    bar(ctx, 26, 128, 150, 6, state.comboFrac, '#ffb02e');
  }
  // timer, top centre
  const left = Math.max(0, state.timeLeft);
  ctx.textAlign = 'center';
  ctx.fillStyle = left <= 10 ? '#ff3355' : INK;
  ctx.font = "900 44px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(Math.ceil(left).toString(), w / 2, 66);
  bar(ctx, w / 2 - 130, 80, 260, 7, left / state.timeTotal, left <= 10 ? '#ff3355' : '#2fd8f2');
  // wave, top right
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = "800 15px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('WAVE', w - 26, 40);
  ctx.font = "900 40px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(state.wave.toString(), w - 24, 82);
  // lasso energy, bottom left
  ctx.textAlign = 'left';
  ctx.font = "800 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = 'rgba(234,246,255,0.75)';
  ctx.fillText('LASSO ENERGY', 26, h - 42);
  bar(ctx, 26, h - 34, 230, 10, state.lasso.energy / state.lasso.maxEnergy, '#2fd8f2');
  // hints, bottom right
  ctx.textAlign = 'right';
  ctx.font = "600 14px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = 'rgba(234,246,255,0.55)';
  ctx.fillText('Drag a loop around one colour  •  P pause  •  M sound', w - 26, h - 24);
  ctx.restore();
}

export function drawBanner(ctx, state, w, h) {
  if (!state.banner) return;
  const a = Math.max(0, state.banner.ttl / state.banner.max);
  ctx.save();
  ctx.globalAlpha = Math.min(1, a * 2);
  ctx.textAlign = 'center';
  ctx.font = "900 64px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = '#eaf6ff';
  ctx.shadowColor = '#f26ee8';
  ctx.shadowBlur = 26;
  ctx.fillText(state.banner.text, w / 2, h * 0.38);
  ctx.restore();
}

function legendRow(ctx, x, y, kind, label) {
  drawDrone(ctx, { x, y, vx: 20, vy: 0, r: 15, kind, wobble: 2.2 }, 0);
  ctx.fillStyle = INK;
  ctx.font = "700 19px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 34, y + 7);
}

export function drawTitle(ctx, state, w, h) {
  ctx.save();
  // a soft panel lifts the words off the drifting drones behind them
  ctx.fillStyle = 'rgba(4, 8, 18, 0.55)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 430, 84, 860, 592, 28);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.font = "900 108px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = '#2fd8f2';
  ctx.shadowColor = '#2fd8f2';
  ctx.shadowBlur = 34;
  ctx.fillText('NEON', w / 2, 196);
  ctx.fillStyle = '#f26ee8';
  ctx.shadowColor = '#f26ee8';
  ctx.fillText('ROUNDUP', w / 2, 300);
  ctx.shadowBlur = 0;
  ctx.fillStyle = INK;
  ctx.font = "600 23px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('Rogue drones have overrun the grid. Wrangle them with light.', w / 2, 356);
  const lx = w / 2 - 300;
  legendRow(ctx, lx, 408, 'cyan', 'Loop ONE colour: 100 pts each, combos multiply');
  legendRow(ctx, lx, 452, 'gold', 'Gold is wild and worth 300');
  legendRow(ctx, lx, 496, 'glitch', 'A glitch in the loop SNAPS it — score nothing');
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a6e34d';
  ctx.font = "900 30px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('CLICK OR PRESS SPACE TO START', w / 2, 586);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(234,246,255,0.6)';
  ctx.font = "600 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('90 seconds • draw with the mouse • bigger loops, bigger risk', w / 2, 624);
  if (state.best > 0) ctx.fillText(`Best score: ${fmt(state.best)}`, w / 2, 656);
  ctx.restore();
}

export function drawResults(ctx, state, w, h) {
  const s = state.scoreState;
  ctx.save();
  ctx.fillStyle = 'rgba(3, 6, 16, 0.72)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.font = "900 58px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = '#eaf6ff';
  ctx.shadowColor = '#2fd8f2';
  ctx.shadowBlur = 22;
  ctx.fillText("TIME'S UP!", w / 2, 148);
  ctx.shadowBlur = 0;
  if (state.newBest) {
    ctx.fillStyle = '#ffe14d';
    ctx.font = "900 26px 'Segoe UI', Arial, sans-serif";
    ctx.fillText('NEW BEST SCORE!', w / 2, 192);
  }
  ctx.fillStyle = '#2fd8f2';
  ctx.font = "900 76px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(fmt(s.score), w / 2, 282);
  const rows = [
    ['Drones wrangled', fmt(s.dronesCaught)],
    ['Clean & mixed captures', fmt(s.captures)],
    ['Best combo', `x${s.bestCombo}`],
    ['Lassos snapped', fmt(s.snaps)],
    ['Waves survived', fmt(state.wave)],
  ];
  ctx.font = "700 23px 'Segoe UI', Arial, sans-serif";
  rows.forEach(([label, value], i) => {
    const y = 348 + i * 42;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(234,246,255,0.75)';
    ctx.fillText(label, w / 2 - 24, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#eaf6ff';
    ctx.fillText(value, w / 2 + 24, y);
  });
  const pulse = 0.65 + 0.35 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#a6e34d';
  ctx.font = "900 27px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', w / 2, 616);
  ctx.restore();
}

export function drawPaused(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(3, 6, 16, 0.6)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf6ff';
  ctx.font = "900 54px 'Segoe UI', Arial, sans-serif";
  ctx.fillText('PAUSED', w / 2, h / 2);
  ctx.font = "600 19px 'Segoe UI', Arial, sans-serif";
  ctx.fillStyle = 'rgba(234,246,255,0.7)';
  ctx.fillText('Press P to keep wrangling', w / 2, h / 2 + 40);
  ctx.restore();
}
