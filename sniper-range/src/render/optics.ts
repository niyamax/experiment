import { TAU, clamp } from '../core/math';

export interface ScopeGeom {
  cx: number;
  cy: number;
  /** Radius of the glass, in device pixels. */
  r: number;
}

export function scopeGeom(W: number, H: number): ScopeGeom {
  const r = clamp(Math.min(W, H) * 0.34, 80, Math.min(W, H) * 0.42);
  return { cx: W / 2, cy: H * 0.47, r };
}

/** Coarsest mil spacing whose dots still land at least 9 px apart. */
function milStep(f: number) {
  for (const mils of [0.5, 1, 2, 5, 10, 20]) {
    const px = f * mils * 0.001;
    if (px >= 9) return { mils, px };
  }
  return { mils: 20, px: f * 0.02 };
}

export interface ScopeChrome {
  /** 0..1 muzzle flash bloom. */
  flash: number;
  /** Screen-space parallax of the glass against the tube. */
  offsetX: number;
  offsetY: number;
  /** Range readout to print under the reticle, or null. */
  rangeTag: string | null;
  /** Wind hold hint arrow, -1..1. */
  windHold: number;
  time: number;
}

/**
 * Draws everything that sits between the eye and the desert: glass tint,
 * eye-relief shadow, reticle, tube body and turrets.
 */
export function drawScopeChrome(
  ctx: CanvasRenderingContext2D,
  g: ScopeGeom,
  f: number,
  chrome: ScopeChrome,
) {
  const { cx, cy, r } = g;

  // ── glass ────────────────────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();

  // cool coated-lens cast
  ctx.fillStyle = 'rgba(120,150,170,0.09)';
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // eye-relief shadow: the black ring that creeps in from the edge
  const relief = ctx.createRadialGradient(cx, cy, r * 0.58, cx, cy, r);
  relief.addColorStop(0, 'rgba(0,0,0,0)');
  relief.addColorStop(0.72, 'rgba(4,6,8,0.24)');
  relief.addColorStop(1, 'rgba(2,3,4,0.86)');
  ctx.fillStyle = relief;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // chromatic fringe on the outer glass
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(90,140,255,0.16)';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.955, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,150,90,0.1)';
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.905, 0, TAU);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  // lens sheen
  const sheen = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.4, cy + r * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,255,0.14)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.03)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  if (chrome.flash > 0.001) {
    const fl = ctx.createRadialGradient(cx, cy + r * 0.5, 0, cx, cy + r * 0.5, r * 1.5);
    fl.addColorStop(0, `rgba(255,236,190,${0.5 * chrome.flash})`);
    fl.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = fl;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  drawReticle(ctx, g, f, chrome);
  ctx.restore();

  // ── tube ─────────────────────────────────────────────────────────────
  drawTube(ctx, g);
}

function drawReticle(
  ctx: CanvasRenderingContext2D,
  g: ScopeGeom,
  f: number,
  chrome: ScopeChrome,
) {
  const { cx, cy, r } = g;
  const ink = 'rgba(12,14,16,0.92)';
  const step = milStep(f);

  ctx.save();
  ctx.translate(chrome.offsetX, chrome.offsetY);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineCap = 'butt';

  // duplex posts — heavy outside, fine inside
  const fine = Math.max(1, r * 0.006);
  const heavy = Math.max(2.5, r * 0.022);
  const postStart = r * 0.42;

  ctx.lineWidth = heavy;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx - postStart, cy);
  ctx.moveTo(cx + postStart, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy - postStart);
  ctx.moveTo(cx, cy + postStart);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  ctx.lineWidth = fine;
  ctx.beginPath();
  ctx.moveTo(cx - postStart, cy);
  ctx.lineTo(cx - r * 0.035, cy);
  ctx.moveTo(cx + r * 0.035, cy);
  ctx.lineTo(cx + postStart, cy);
  ctx.moveTo(cx, cy - postStart);
  ctx.lineTo(cx, cy - r * 0.035);
  ctx.moveTo(cx, cy + r * 0.035);
  ctx.lineTo(cx, cy + postStart);
  ctx.stroke();

  // centre dot
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0.9, r * 0.007), 0, TAU);
  ctx.fill();

  // mil dots — holdover below, windage across
  const dotR = Math.max(1.1, r * 0.011);
  ctx.font = `600 ${Math.max(8, r * 0.05)}px ui-monospace, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) {
    const d = step.px * i;
    if (d > postStart) break;
    // vertical (holdover)
    ctx.beginPath();
    ctx.arc(cx, cy + d, dotR, 0, TAU);
    ctx.fill();
    // horizontal (windage)
    ctx.beginPath();
    ctx.arc(cx - d, cy, dotR, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + d, cy, dotR, 0, TAU);
    ctx.fill();

    if (i % 2 === 0) {
      ctx.fillStyle = 'rgba(12,14,16,0.6)';
      ctx.fillText(`${(step.mils * i).toFixed(step.mils < 1 ? 1 : 0)}`, cx + dotR * 3, cy + d);
      ctx.fillStyle = ink;
    }
  }

  // wind hold hint
  if (Math.abs(chrome.windHold) > 0.01) {
    const wx = cx + clamp(chrome.windHold, -1, 1) * postStart * 0.9;
    ctx.strokeStyle = 'rgba(196,58,44,0.85)';
    ctx.lineWidth = Math.max(1.4, r * 0.01);
    ctx.beginPath();
    ctx.moveTo(wx, cy - r * 0.05);
    ctx.lineTo(wx, cy + r * 0.05);
    ctx.stroke();
  }

  // range tag
  if (chrome.rangeTag) {
    ctx.font = `700 ${Math.max(10, r * 0.062)}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(250,246,236,0.75)';
    ctx.strokeText(chrome.rangeTag, cx, cy - r * 0.2);
    ctx.fillStyle = 'rgba(24,20,16,0.95)';
    ctx.fillText(chrome.rangeTag, cx, cy - r * 0.2);
  }

  ctx.restore();
}

/** The physical scope body: tube wall, turrets and objective bell. */
function drawTube(ctx: CanvasRenderingContext2D, g: ScopeGeom) {
  const { cx, cy, r } = g;
  const wall = r * 0.135;

  // everything outside the glass is the rifle-side blur of the tube
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - r * 2.2, cy - r * 2.2, r * 4.4, r * 4.4);
  ctx.arc(cx, cy, r, 0, TAU, true);
  ctx.clip();

  // tube wall
  const wallGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.7, cy + r);
  wallGrad.addColorStop(0, '#4a4a4d');
  wallGrad.addColorStop(0.22, '#1c1d1f');
  wallGrad.addColorStop(0.5, '#3a3b3e');
  wallGrad.addColorStop(0.78, '#141516');
  wallGrad.addColorStop(1, '#2b2c2e');
  ctx.fillStyle = wallGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, r + wall, 0, TAU);
  ctx.fill();

  // knurled edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1, r * 0.012);
  ctx.beginPath();
  ctx.arc(cx, cy, r + wall * 0.22, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.arc(cx, cy, r + wall * 0.96, 0, TAU);
  ctx.stroke();
  ctx.restore();

  // windage / elevation turrets, matching the reference silhouette
  turret(ctx, cx - r - wall * 1.5, cy, r * 0.26, r * 0.34, -1);
  turret(ctx, cx + r + wall * 1.5, cy, r * 0.26, r * 0.34, 1);

  // stylised reticle extensions running off the glass
  ctx.strokeStyle = 'rgba(10,12,14,0.55)';
  ctx.lineWidth = Math.max(2, r * 0.018);
  ctx.beginPath();
  ctx.moveTo(cx - r * 2.6, cy);
  ctx.lineTo(cx - r - wall, cy);
  ctx.moveTo(cx + r + wall, cy);
  ctx.lineTo(cx + r * 2.6, cy);
  ctx.moveTo(cx, cy - r * 2.2);
  ctx.lineTo(cx, cy - r - wall);
  ctx.stroke();
}

function turret(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  dir: number,
) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#5b5c5f');
  g.addColorStop(0.35, '#2a2b2d');
  g.addColorStop(0.7, '#46474a');
  g.addColorStop(1, '#131415');
  ctx.fillStyle = g;
  const rr = Math.min(w, h) * 0.22;
  roundRect(ctx, dir > 0 ? -w * 0.2 : -w * 0.8, -h / 2, w, h, rr);
  ctx.fill();

  // knurling
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = Math.max(0.8, h * 0.03);
  for (let i = 0; i < 7; i++) {
    const yy = -h / 2 + (h * (i + 0.5)) / 7;
    ctx.beginPath();
    ctx.moveTo(dir > 0 ? -w * 0.16 : -w * 0.76, yy);
    ctx.lineTo(dir > 0 ? w * 0.76 : w * 0.16, yy);
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Screen-edge darkening for the un-magnified view around the scope. */
export function drawVignette(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createRadialGradient(
    W / 2,
    H * 0.47,
    Math.min(W, H) * 0.32,
    W / 2,
    H * 0.47,
    Math.max(W, H) * 0.78,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(6,5,4,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
