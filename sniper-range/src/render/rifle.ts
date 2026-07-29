import { TAU, clamp, easeOutCubic, smoothstep } from '../core/math';
import type { ScopeGeom } from './optics';

export interface RifleState {
  /** 0..1 recoil impulse, decays after each shot. */
  recoil: number;
  /** 0..1 bolt cycle progress; 0 = closed. */
  bolt: number;
  /** 0..1 reload progress; 0 = idle. */
  reload: number;
  /** Screen-space sway of the whole weapon, in pixels. */
  swayX: number;
  swayY: number;
  /** 0..1 muzzle flash. */
  flash: number;
  time: number;
}

/**
 * Hands and a bolt-action rifle, drawn as vector art anchored to the bottom
 * of the frame so it always meets the scope tube.
 */
export function drawRifle(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scope: ScopeGeom,
  st: RifleState,
) {
  const k = clamp((H - (scope.cy + scope.r * 0.94)) / 0.96, H * 0.13, H * 0.42);
  const originX = W / 2;
  const originY = H;

  const recoilDip = easeOutCubic(st.recoil) * k * 0.16;
  const recoilRot = st.recoil * 0.07;
  const reloadDip = smoothstep(Math.sin(st.reload * Math.PI)) * k * 0.22;
  const reloadRot = smoothstep(Math.sin(st.reload * Math.PI)) * 0.16;

  ctx.save();
  ctx.translate(originX + st.swayX, originY + recoilDip + reloadDip + st.swayY);
  ctx.rotate(recoilRot + reloadRot);
  ctx.scale(k, -k); // unit space: +y is up
  ctx.lineJoin = 'round';

  // Stroke widths below are in unit space, so they scale with the rifle.
  shadowUnder(ctx);
  stock(ctx, st);
  receiver(ctx, st);
  boltAssembly(ctx, st);
  triggerGuard(ctx);
  gripHand(ctx, st);
  supportArm(ctx, st);

  ctx.restore();

  if (st.flash > 0.002) muzzleGlow(ctx, W, H, scope, st.flash);
  if (st.bolt > 0.3 && st.bolt < 0.95) ejectedCase(ctx, originX, originY, k, st);
}

// ── parts ─────────────────────────────────────────────────────────────

function shadowUnder(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, 0.62);
  g.addColorStop(0, 'rgba(0,0,0,0.34)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-0.75, -0.1, 1.5, 0.72);
}

function stock(ctx: CanvasRenderingContext2D, st: RifleState) {
  const g = ctx.createLinearGradient(-0.14, 0, 0.14, 0);
  g.addColorStop(0, '#3a1f0c');
  g.addColorStop(0.2, '#7d461e');
  g.addColorStop(0.44, '#b9743a');
  g.addColorStop(0.7, '#7b451d');
  g.addColorStop(1, '#2e1808');

  ctx.beginPath();
  ctx.moveTo(-0.145, -0.08);
  ctx.bezierCurveTo(-0.155, 0.14, -0.12, 0.3, -0.086, 0.44);
  ctx.lineTo(-0.072, 0.64);
  ctx.lineTo(0.078, 0.64);
  ctx.lineTo(0.094, 0.44);
  ctx.bezierCurveTo(0.128, 0.3, 0.15, 0.13, 0.147, -0.08);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // grain
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#3a2008';
  ctx.lineWidth = 0.0035;
  for (let i = 0; i < 9; i++) {
    const x = -0.14 + i * 0.034;
    ctx.beginPath();
    ctx.moveTo(x, -0.1);
    ctx.bezierCurveTo(x + 0.03, 0.2, x - 0.02, 0.42, x + 0.02, 0.7);
    ctx.stroke();
  }
  ctx.restore();

  // cheek rest highlight
  ctx.fillStyle = 'rgba(255,225,180,0.16)';
  ctx.beginPath();
  ctx.ellipse(-0.012, 0.44, 0.032, 0.15, 0.04, 0, TAU);
  ctx.fill();

  void st;
}

function receiver(ctx: CanvasRenderingContext2D, st: RifleState) {
  const g = ctx.createLinearGradient(-0.12, 0, 0.13, 0);
  g.addColorStop(0, '#111214');
  g.addColorStop(0.3, '#42464a');
  g.addColorStop(0.55, '#22262a');
  g.addColorStop(1, '#0b0c0d');
  ctx.fillStyle = g;
  roundRectU(ctx, -0.105, 0.58, 0.21, 0.35, 0.04);
  ctx.fill();

  // ejection port
  ctx.fillStyle = '#08090a';
  roundRectU(ctx, 0.025, 0.73, 0.078, 0.1, 0.018);
  ctx.fill();

  // top rail / scope mounts
  ctx.fillStyle = '#1a1c1e';
  roundRectU(ctx, -0.072, 0.9, 0.144, 0.1, 0.013);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(-0.072, 0.982, 0.144, 0.007);

  void st;
}

function boltAssembly(ctx: CanvasRenderingContext2D, st: RifleState) {
  // phases: lift, draw back, push forward, close
  const b = clamp(st.bolt, 0, 1);
  let lift = 0;
  let back = 0;
  if (b < 0.22) lift = smoothstep(b / 0.22);
  else if (b < 0.48) {
    lift = 1;
    back = smoothstep((b - 0.22) / 0.26);
  } else if (b < 0.76) {
    lift = 1;
    back = 1 - smoothstep((b - 0.48) / 0.28);
  } else {
    lift = 1 - smoothstep((b - 0.76) / 0.24);
  }

  const baseX = 0.088;
  const baseY = 0.78 - back * 0.15;
  const ang = -0.5 - lift * 0.95;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(ang);

  const g = ctx.createLinearGradient(0, -0.02, 0, 0.02);
  g.addColorStop(0, '#0e0f10');
  g.addColorStop(0.4, '#5a5e63');
  g.addColorStop(1, '#17191b');
  ctx.fillStyle = g;
  roundRectU(ctx, 0, -0.021, 0.21, 0.042, 0.02);
  ctx.fill();

  // knob
  const kg = ctx.createRadialGradient(0.205, 0.012, 0.005, 0.215, 0, 0.055);
  kg.addColorStop(0, '#9aa0a6');
  kg.addColorStop(0.45, '#3c4045');
  kg.addColorStop(1, '#0d0e0f');
  ctx.fillStyle = kg;
  ctx.beginPath();
  ctx.arc(0.215, 0, 0.05, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function triggerGuard(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#15171a';
  ctx.lineWidth = 0.013;
  ctx.beginPath();
  ctx.moveTo(-0.055, 0.6);
  ctx.bezierCurveTo(-0.075, 0.5, -0.02, 0.47, 0.035, 0.49);
  ctx.lineTo(0.06, 0.6);
  ctx.stroke();
  ctx.fillStyle = '#202326';
  ctx.beginPath();
  ctx.moveTo(-0.012, 0.6);
  ctx.lineTo(0.004, 0.6);
  ctx.lineTo(0.008, 0.51);
  ctx.lineTo(-0.016, 0.515);
  ctx.closePath();
  ctx.fill();
}

const SKIN = ['#f0c39a', '#d99e70', '#b47a4e', '#8a5634'] as const;

function gripHand(ctx: CanvasRenderingContext2D, st: RifleState) {
  const shift = st.reload > 0 ? Math.sin(st.reload * Math.PI) * 0.07 : 0;
  ctx.save();
  ctx.translate(0.0, -shift);

  const g = ctx.createLinearGradient(-0.08, 0, 0.085, 0);
  g.addColorStop(0, SKIN[3]);
  g.addColorStop(0.3, SKIN[1]);
  g.addColorStop(0.62, SKIN[0]);
  g.addColorStop(1, SKIN[2]);
  ctx.fillStyle = g;

  // back of the hand, wrapped around the wrist of the stock
  ctx.beginPath();
  ctx.moveTo(-0.062, 0.3);
  ctx.bezierCurveTo(-0.076, 0.38, -0.062, 0.46, -0.012, 0.478);
  ctx.bezierCurveTo(0.044, 0.494, 0.082, 0.44, 0.081, 0.372);
  ctx.bezierCurveTo(0.08, 0.31, 0.046, 0.268, 0.006, 0.263);
  ctx.bezierCurveTo(-0.032, 0.259, -0.056, 0.276, -0.062, 0.3);
  ctx.closePath();
  ctx.fill();

  // fingers curling around the far side of the grip
  ctx.fillStyle = SKIN[1];
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0.074 - i * 0.003, 0.305 + i * 0.045, 0.017, 0.021, 0.1, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,70,42,0.45)';
  ctx.lineWidth = 0.004;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-0.038, 0.325 + i * 0.047);
    ctx.quadraticCurveTo(0.016, 0.338 + i * 0.047, 0.058, 0.325 + i * 0.047);
    ctx.stroke();
  }
  // thumb laid along the near side
  ctx.fillStyle = SKIN[0];
  ctx.beginPath();
  ctx.ellipse(-0.062, 0.362, 0.019, 0.046, -0.22, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function supportArm(ctx: CanvasRenderingContext2D, st: RifleState) {
  // forearm entering from the lower left, sleeved
  const g = ctx.createLinearGradient(-0.7, 0, -0.1, 0);
  g.addColorStop(0, '#2f3a24');
  g.addColorStop(0.4, '#4c5a36');
  g.addColorStop(0.75, '#63734a');
  g.addColorStop(1, '#33401f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-1.05, 0.08);
  ctx.bezierCurveTo(-0.76, 0.22, -0.44, 0.22, -0.225, 0.28);
  ctx.lineTo(-0.14, 0.06);
  ctx.bezierCurveTo(-0.4, -0.04, -0.7, -0.14, -0.95, -0.28);
  ctx.closePath();
  ctx.fill();

  // cuff
  ctx.fillStyle = '#26301a';
  ctx.beginPath();
  ctx.moveTo(-0.47, 0.192);
  ctx.lineTo(-0.4, 0.208);
  ctx.lineTo(-0.348, 0.032);
  ctx.lineTo(-0.42, 0.012);
  ctx.closePath();
  ctx.fill();

  // wrist / hand on the fore-end
  const hg = ctx.createLinearGradient(-0.27, 0, -0.09, 0);
  hg.addColorStop(0, SKIN[2]);
  hg.addColorStop(0.5, SKIN[0]);
  hg.addColorStop(1, SKIN[1]);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(-0.165, 0.222, 0.072, 0.05, -0.34, 0, TAU);
  ctx.fill();

  void st;
}

// ── extras ────────────────────────────────────────────────────────────

function muzzleGlow(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  scope: ScopeGeom,
  flash: number,
) {
  const x = scope.cx;
  const y = scope.cy + scope.r * 1.15;
  const r = scope.r * (0.5 + flash * 0.5);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,244,208,${0.85 * flash})`);
  g.addColorStop(0.35, `rgba(255,186,84,${0.45 * flash})`);
  g.addColorStop(1, 'rgba(255,150,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  void W;
  void H;
}

function ejectedCase(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  k: number,
  st: RifleState,
) {
  const t = clamp((st.bolt - 0.3) / 0.55, 0, 1);
  const x = ox + (0.16 + t * 0.75) * k;
  const y = oy - (0.86 + t * 0.5 - t * t * 1.35) * k;
  const s = k * 0.035;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 9);
  const g = ctx.createLinearGradient(-s, 0, s, 0);
  g.addColorStop(0, '#8a6320');
  g.addColorStop(0.4, '#f0c765');
  g.addColorStop(1, '#7a5518');
  ctx.fillStyle = g;
  ctx.globalAlpha = 1 - t * 0.35;
  ctx.fillRect(-s * 0.45, -s * 1.4, s * 0.9, s * 2.8);
  ctx.restore();
}

function roundRectU(
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
