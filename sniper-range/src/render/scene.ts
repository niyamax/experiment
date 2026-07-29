import type { AssetTable } from '../core/assets';
import { DEG, TAU, clamp, hash2, mixRgb } from '../core/math';
import { Camera, EYE_HEIGHT, newProj, type Proj, type View } from '../game/camera';
import { Particles, type Particle } from '../game/particles';
import type { Target, TargetKind } from '../game/targets';
import { PALETTE, RIDGE_DEPTH, ridgeHeight, type Scatter, type World } from '../game/world';

const FOG_DENSITY = 0.0028;
/** Haze applied to each mesa layer, near to far. */
const RIDGE_HAZE = [0.8, 0.6, 0.4];

export interface SceneInput {
  cam: Camera;
  world: World;
  targets: Target[];
  particles: Particles;
  assets: AssetTable;
  time: number;
  /** Draw the shooting rail (skipped inside the scope, where it is behind you). */
  foreground: boolean;
}

/** Which optional PNG stands in for each target kind. */
const SPRITE_SLOT: Record<TargetKind, keyof AssetTable> = {
  bottle: 'bottle',
  gold: 'bottleGold',
  can: 'can',
  clay: 'clay',
  tnt: 'tnt',
  hazard: 'barrel',
};

const rgbStr = (c: readonly [number, number, number], a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

/** Aerial perspective: everything fades toward the haze with distance. */
function fogged(base: readonly [number, number, number], depth: number, k = 1) {
  const t = 1 - Math.exp(-depth * FOG_DENSITY * k);
  return mixRgb(base, PALETTE.fog, clamp(t, 0, 0.92));
}

export class Scene {
  private p0 = newProj();
  private corners: Proj[] = Array.from({ length: 8 }, newProj);
  private laneL: Proj[] = Array.from({ length: 16 }, newProj);
  private laneR: Proj[] = Array.from({ length: 16 }, newProj);
  private order: number[] = [];
  private art: AssetTable = {};

  draw(ctx: CanvasRenderingContext2D, view: View, input: SceneInput) {
    const { cam, world } = input;
    this.art = input.assets;
    this.sky(ctx, view, cam, input.time);
    this.clouds(ctx, view, cam, world);
    if (this.art.skyline) this.skyline(ctx, view, cam, this.art.skyline);
    else this.ridges(ctx, view, cam);
    this.ground(ctx, view, cam, input.foreground);
    this.lane(ctx, view, cam);
    this.scatter(ctx, view, cam, world);
    this.props(ctx, view, cam, world, input);
    this.particles(ctx, view, cam, input.particles);
    if (input.foreground) this.rail(ctx, view, cam, input.assets);
  }

  // ── sky ─────────────────────────────────────────────────────────────

  private sky(ctx: CanvasRenderingContext2D, view: View, cam: Camera, time: number) {
    const hy = cam.horizonY(view);
    // Tie the gradient to focal length so the un-magnified frame and the
    // magnified inset agree on the sky colour at any given elevation.
    const span = view.f * 0.62;
    const g = ctx.createLinearGradient(0, hy - span, 0, hy + 4);
    g.addColorStop(0, rgbStr(PALETTE.skyTop));
    g.addColorStop(0.42, rgbStr(PALETTE.skyMid));
    g.addColorStop(0.78, rgbStr(mixRgb(PALETTE.skyMid, PALETTE.skyHaze, 0.65)));
    g.addColorStop(1, rgbStr(PALETTE.skyHaze));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.W, view.H);

    // sun, parked high and to the left like the reference plate
    const d = 2200;
    const sy = -0.42;
    const syaw = 0.5;
    const sun = cam.project(
      Math.sin(syaw) * Math.cos(sy) * d,
      EYE_HEIGHT + Math.sin(0.38) * d,
      Math.cos(syaw) * Math.cos(sy) * d,
      view,
      this.p0,
    );
    if (sun.ok) {
      const r = Math.max(60, view.f * 0.05);
      const glow = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, r * 4.2);
      glow.addColorStop(0, 'rgba(255,250,226,0.95)');
      glow.addColorStop(0.16, 'rgba(255,244,206,0.42)');
      glow.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sun.x, sun.y, r * 4.2, 0, TAU);
      ctx.fill();
    }

    // horizon haze band
    const bandH = view.f * 0.042;
    const band = ctx.createLinearGradient(0, hy - bandH, 0, hy);
    band.addColorStop(0, 'rgba(214,222,226,0)');
    band.addColorStop(1, `rgba(214,222,226,${0.34 + Math.sin(time * 0.2) * 0.03})`);
    ctx.fillStyle = band;
    ctx.fillRect(0, hy - bandH, view.W, bandH);
  }

  private clouds(ctx: CanvasRenderingContext2D, view: View, cam: Camera, world: World) {
    ctx.save();
    for (const c of world.clouds) {
      const p = cam.project(c.x, EYE_HEIGHT + c.y, c.z, view, this.p0);
      if (!p.ok) continue;
      const w = c.w * p.s;
      const h = c.h * p.s;
      if (w < 6 || p.x + w < -40 || p.x - w > view.W + 40) continue;
      if (p.y - h > view.H) continue;
      const puffs = 6;
      for (let i = 0; i < puffs; i++) {
        const r1 = hash2(c.seed, i * 3 + 1);
        const r2 = hash2(c.seed, i * 3 + 2);
        const r3 = hash2(c.seed, i * 3 + 3);
        const px = p.x + (r1 - 0.5) * w;
        const py = p.y - r2 * h * 0.5;
        const pr = (0.22 + r3 * 0.34) * w * 0.7;
        const g = ctx.createRadialGradient(px, py - pr * 0.2, pr * 0.1, px, py, pr);
        g.addColorStop(0, 'rgba(255,255,255,0.92)');
        g.addColorStop(0.55, 'rgba(246,248,250,0.6)');
        g.addColorStop(1, 'rgba(232,238,242,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // ── distant terrain ─────────────────────────────────────────────────

  private ridges(ctx: CanvasRenderingContext2D, view: View, cam: Camera) {
    const halfH = Math.atan(view.W / 2 / view.f);
    for (let layer = 0; layer < 3; layer++) {
      const Z = RIDGE_DEPTH[layer];
      const centerX = Math.tan(cam.aimYaw) * Z;
      const span = Z * Math.tan(Math.min(1.35, halfH + 0.14));
      const N = 150;
      // Mesas get a hand-set haze rather than the distance formula, which
      // would erase them entirely at 1.5 km.
      const haze = RIDGE_HAZE[layer];
      const near = mixRgb(PALETTE.rockNear, PALETTE.rockFar, layer === 0 ? 1 : layer === 1 ? 0.55 : 0.15);
      const top = mixRgb(near, PALETTE.fog, haze * 0.82);
      const bottom = mixRgb(mixRgb(near, [78, 58, 48], 0.3), PALETTE.fog, haze);

      ctx.beginPath();
      let started = false;
      let minY = view.H;
      for (let i = 0; i <= N; i++) {
        const wx = centerX - span + (2 * span * i) / N;
        const h = ridgeHeight(wx, layer);
        const p = cam.project(wx, h, Z, view, this.p0);
        if (!p.ok) continue;
        if (!started) {
          ctx.moveTo(p.x, p.y);
          started = true;
        } else ctx.lineTo(p.x, p.y);
        if (p.y < minY) minY = p.y;
      }
      if (!started) continue;
      const hy = cam.horizonY(view);
      ctx.lineTo(view.W + 60, hy + 6);
      ctx.lineTo(-60, hy + 6);
      ctx.closePath();

      const g = ctx.createLinearGradient(0, minY, 0, hy + 6);
      g.addColorStop(0, rgbStr(top));
      g.addColorStop(1, rgbStr(bottom));
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  /**
   * A supplied panorama covers 180° of azimuth with its bottom edge on the
   * horizon. Drawn in slices because screen x is a tangent of the angle, not a
   * linear function of it — one stretched drawImage would shear at the edges.
   */
  private skyline(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    img: HTMLImageElement,
  ) {
    const SLICES = 40;
    const ELEV = 11 * DEG;
    const hy = cam.horizonY(view);
    const hPx = view.f * Math.tan(ELEV);
    const halfH = Math.atan(view.W / 2 / view.f);
    const a0 = cam.aimYaw - halfH - 0.04;
    const a1 = cam.aimYaw + halfH + 0.04;

    for (let i = 0; i < SLICES; i++) {
      const aA = a0 + ((a1 - a0) * i) / SLICES;
      const aB = a0 + ((a1 - a0) * (i + 1)) / SLICES;
      const xA = view.cx + view.f * Math.tan(aA - cam.aimYaw);
      const xB = view.cx + view.f * Math.tan(aB - cam.aimYaw);
      if (xB < -2 || xA > view.W + 2) continue;
      const uA = clamp(0.5 + aA / Math.PI, 0, 1) * img.width;
      const uB = clamp(0.5 + aB / Math.PI, 0, 1) * img.width;
      const sw = Math.max(0.5, uB - uA);
      ctx.drawImage(img, uA, 0, sw, img.height, xA, hy - hPx, xB - xA + 1, hPx);
    }
  }

  // ── ground plane ────────────────────────────────────────────────────

  /** Camera-plane depth of the ground under a given screen row. */
  private groundDepth(view: View, cam: Camera, screenY: number) {
    const b = (view.cy - screenY) / view.f;
    const cp = Math.cos(cam.aimPitch);
    const sp = Math.sin(cam.aimPitch);
    const dy = b * cp + sp;
    if (dy >= -1e-5) return Infinity;
    return -EYE_HEIGHT / dy;
  }

  private ground(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    nearShading: boolean,
  ) {
    const hy = cam.horizonY(view);
    const top = Math.max(hy, -20);
    if (top > view.H) return;

    // One gradient with stops sampled from the real ground depth, rather than
    // discrete bands — at 23x the band edges would show as arcs across the glass.
    const g = ctx.createLinearGradient(0, top, 0, view.H);
    const STOPS = 18;
    for (let i = 0; i <= STOPS; i++) {
      const u = Math.pow(i / STOPS, 2.2);
      const y = top + (view.H - top) * u;
      let depth = this.groundDepth(view, cam, y + 0.5);
      if (!isFinite(depth) || depth > 4000) depth = 4000;
      const shade = mixRgb(PALETTE.sandNear, PALETTE.sandFar, clamp(depth / 90, 0, 1));
      g.addColorStop(clamp(u, 0, 1), rgbStr(fogged(shade, depth, 0.85)));
    }
    ctx.fillStyle = g;
    ctx.fillRect(-2, top - 1, view.W + 4, view.H - top + 2);

    // soften the seam where the mesa feet meet the flats
    const seam = Math.max(3, view.f * 0.008);
    const hb = ctx.createLinearGradient(0, hy - seam, 0, hy + seam * 1.8);
    hb.addColorStop(0, 'rgba(208,218,224,0.3)');
    hb.addColorStop(0.4, 'rgba(208,218,224,0.22)');
    hb.addColorStop(1, 'rgba(208,218,224,0)');
    ctx.fillStyle = hb;
    ctx.fillRect(0, hy - seam, view.W, seam * 2.8);

    // Screen-space falloff at the very front. Only in the un-magnified pass —
    // inside the scope it would draw as a hard band across the glass.
    if (nearShading) {
      const vg = ctx.createLinearGradient(0, view.H * 0.7, 0, view.H);
      vg.addColorStop(0, 'rgba(104,74,42,0)');
      vg.addColorStop(1, 'rgba(104,74,42,0.16)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, view.H * 0.7, view.W, view.H * 0.3);
    }
  }

  /** The scuffed firing lane running downrange. */
  private lane(ctx: CanvasRenderingContext2D, view: View, cam: Camera) {
    const stops = [4, 8, 14, 22, 34, 50, 72, 100, 140, 190, 250];
    const left: Proj[] = [];
    const right: Proj[] = [];
    for (let i = 0; i < stops.length; i++) {
      const z = stops[i];
      const wob = Math.sin(z * 0.045) * 0.32;
      const half = 1.9 + z * 0.012;
      const l = cam.project(wob - half, 0.005, z, view, this.laneL[i]);
      const r = cam.project(wob + half, 0.005, z, view, this.laneR[i]);
      if (l.ok && r.ok) {
        left.push(l);
        right.push(r);
      }
    }
    if (left.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, left[left.length - 1].y, 0, left[0].y);
    g.addColorStop(0, 'rgba(178,152,116,0.0)');
    g.addColorStop(0.4, 'rgba(174,144,102,0.18)');
    g.addColorStop(1, 'rgba(158,126,86,0.3)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }

  // ── clutter ─────────────────────────────────────────────────────────

  private scatter(ctx: CanvasRenderingContext2D, view: View, cam: Camera, world: World) {
    for (const s of world.scatter) {
      const p = cam.project(s.x, 0, s.z, view, this.p0);
      if (!p.ok) continue;
      const px = s.size * p.s;
      if (px < 1.1) continue;
      if (p.x < -px * 3 || p.x > view.W + px * 3 || p.y < -px * 4 || p.y > view.H + px * 2)
        continue;
      this.drawScatter(ctx, s, p.x, p.y, p.s, p.z);
    }
  }

  private drawScatter(
    ctx: CanvasRenderingContext2D,
    s: Scatter,
    x: number,
    y: number,
    scale: number,
    depth: number,
  ) {
    const h = s.size * scale;
    const w = h * 0.9;
    const fog = clamp(1 - Math.exp(-depth * FOG_DENSITY * 0.8), 0, 0.9);

    // contact shadow
    ctx.fillStyle = `rgba(60,42,26,${0.26 * (1 - fog)})`;
    ctx.beginPath();
    ctx.ellipse(x, y, w * 0.65, w * 0.2, 0, 0, TAU);
    ctx.fill();

    switch (s.kind) {
      case 'rock': {
        const c = fogged([132, 112, 92], depth, 0.8);
        const lit = fogged([176, 156, 130], depth, 0.8);
        ctx.beginPath();
        ctx.moveTo(x - w * 0.5, y);
        ctx.lineTo(x - w * 0.34, y - h * 0.72);
        ctx.lineTo(x + w * 0.08, y - h);
        ctx.lineTo(x + w * 0.5, y - h * 0.5);
        ctx.lineTo(x + w * 0.46, y);
        ctx.closePath();
        ctx.fillStyle = rgbStr(c);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - w * 0.34, y - h * 0.72);
        ctx.lineTo(x + w * 0.08, y - h);
        ctx.lineTo(x + w * 0.1, y - h * 0.55);
        ctx.closePath();
        ctx.fillStyle = rgbStr(lit);
        ctx.fill();
        break;
      }
      case 'bush': {
        const c = fogged([88, 96, 58], depth, 0.8);
        ctx.fillStyle = rgbStr(c);
        for (let i = 0; i < 4; i++) {
          const r1 = hash2(s.seed, i * 2);
          const r2 = hash2(s.seed, i * 2 + 1);
          ctx.beginPath();
          ctx.ellipse(
            x + (r1 - 0.5) * w * 0.9,
            y - h * (0.24 + r2 * 0.5),
            w * (0.22 + r1 * 0.22),
            h * (0.2 + r2 * 0.2),
            0,
            0,
            TAU,
          );
          ctx.fill();
        }
        break;
      }
      case 'grass': {
        ctx.strokeStyle = rgbStr(fogged([144, 138, 82], depth, 0.8));
        ctx.lineWidth = Math.max(0.6, h * 0.06);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const r = hash2(s.seed, i) - 0.5;
          ctx.moveTo(x + r * w * 0.5, y);
          ctx.quadraticCurveTo(x + r * w, y - h * 0.6, x + r * w * 2.1, y - h);
        }
        ctx.stroke();
        break;
      }
      case 'yucca': {
        const c = fogged([94, 108, 66], depth, 0.8);
        ctx.strokeStyle = rgbStr(c);
        ctx.lineWidth = Math.max(0.8, w * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI / 2 + (i / 8 - 0.5) * 2.4;
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * w * 0.85, y + Math.sin(a) * h * 0.95);
        }
        ctx.stroke();
        break;
      }
      case 'cactus': {
        const c = fogged([76, 106, 62], depth, 0.8);
        const lit = fogged([108, 140, 82], depth, 0.8);
        // saguaro: a trunk with two arms that elbow outwards then rise
        const armY = y - h * 0.5;
        const armW = w * 0.18;
        ctx.fillStyle = rgbStr(c);
        this.roundBar(ctx, x - w * 0.14, y - h, w * 0.28, h);
        this.roundBar(ctx, x - w * 0.5, armY - h * 0.3, armW, h * 0.3 + w * 0.14);
        this.roundBar(ctx, x + w * 0.32, armY - h * 0.42, armW, h * 0.42 + w * 0.14);
        ctx.fillRect(x - w * 0.5, armY, w * 0.4, w * 0.14);
        ctx.fillRect(x + w * 0.1, armY, w * 0.4, w * 0.14);
        ctx.fillStyle = rgbStr(lit);
        ctx.fillRect(x - w * 0.11, y - h * 0.97, w * 0.06, h * 0.93);
        break;
      }
    }
  }

  private roundBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const r = w / 2;
    ctx.beginPath();
    ctx.moveTo(x, y + r);
    ctx.arc(x + r, y + r, r, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
  }

  // ── benches and targets ─────────────────────────────────────────────

  private props(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    world: World,
    input: SceneInput,
  ) {
    type Item = { z: number; draw: () => void };
    const items: Item[] = [];

    for (const b of world.benches) {
      items.push({ z: b.z, draw: () => this.bench(ctx, view, cam, b.x, b.z, b.half, b.top) });
    }
    for (const t of input.targets) {
      if (t.dead) continue;
      items.push({ z: t.z, draw: () => this.target(ctx, view, cam, t, input.time) });
    }
    items.sort((a, b) => b.z - a.z);
    for (const it of items) it.draw();
  }

  private bench(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    x: number,
    z: number,
    half: number,
    top: number,
  ) {
    const depth = 0.34;
    const art = this.art.bench;
    if (art) {
      const p = cam.project(x, 0, z, view, this.p0);
      if (p.ok && p.s > 0.4) {
        const w = half * 2.2 * p.s;
        const h = (w * art.height) / art.width;
        ctx.fillStyle = 'rgba(58,40,24,0.3)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, half * 1.25 * p.s, 0.3 * p.s, 0, 0, TAU);
        ctx.fill();
        ctx.drawImage(art, p.x - w / 2, p.y - h, w, h);
      }
      return;
    }
    const shadow = cam.project(x, 0.004, z, view, this.p0);
    if (shadow.ok && shadow.s > 0.4) {
      ctx.fillStyle = 'rgba(58,40,24,0.3)';
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, half * 1.25 * shadow.s, 0.3 * shadow.s, 0, 0, TAU);
      ctx.fill();
    }
    // legs
    const legW = 0.1;
    for (const lx of [x - half * 0.78, x + half * 0.78]) {
      this.box(ctx, view, cam, lx, top / 2, z, legW, top, legW, [96, 68, 44], z);
    }
    // plank
    this.box(ctx, view, cam, x, top + 0.05, z, half * 2, 0.1, depth, [156, 118, 80], z);
    // back rail
    this.box(ctx, view, cam, x, top + 0.02, z - depth * 0.4, half * 2, 0.07, 0.06, [128, 94, 62], z);
  }

  /**
   * Axis-aligned box with painter-ordered faces. `cy` is the vertical centre.
   */
  private box(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    x: number,
    cy: number,
    z: number,
    w: number,
    h: number,
    d: number,
    base: readonly [number, number, number],
    depthForFog: number,
  ) {
    const hw = w / 2;
    const hd = d / 2;
    const yTop = cy + h / 2;
    const yBot = cy - h / 2;
    const pts: Array<[number, number, number]> = [
      [x - hw, yTop, z - hd],
      [x + hw, yTop, z - hd],
      [x + hw, yTop, z + hd],
      [x - hw, yTop, z + hd],
      [x - hw, yBot, z - hd],
      [x + hw, yBot, z - hd],
      [x + hw, yBot, z + hd],
      [x - hw, yBot, z + hd],
    ];
    for (let i = 0; i < 8; i++) {
      cam.project(pts[i][0], pts[i][1], pts[i][2], view, this.corners[i]);
      if (!this.corners[i].ok) return;
    }

    const face = (idx: number[], shade: number) => {
      ctx.beginPath();
      ctx.moveTo(this.corners[idx[0]].x, this.corners[idx[0]].y);
      for (let i = 1; i < idx.length; i++)
        ctx.lineTo(this.corners[idx[i]].x, this.corners[idx[i]].y);
      ctx.closePath();
      const c = fogged(
        [base[0] * shade, base[1] * shade, base[2] * shade],
        depthForFog,
        0.9,
      );
      ctx.fillStyle = rgbStr(c);
      ctx.fill();
    };

    face([0, 1, 2, 3], 1.16); // top, catching sun
    if (cam.x < x - hw) face([1, 2, 6, 5], 0.7);
    else if (cam.x > x + hw) face([0, 3, 7, 4], 0.7);
    face([3, 2, 6, 7], 0.92); // front
  }

  // ── targets ─────────────────────────────────────────────────────────

  private target(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    t: Target,
    time: number,
  ) {
    const p = cam.project(t.x, t.y, t.z, view, this.p0);
    if (!p.ok) return;
    const s = p.s;
    const h = t.h * s * t.popIn;
    const w = t.w * s * t.popIn;
    if (h < 0.8) return;
    if (p.x + w * 3 < 0 || p.x - w * 3 > view.W || p.y < -h * 3 || p.y - h > view.H) return;

    const depth = p.z;
    const x = p.x;
    const y = p.y; // base

    if (t.motion !== 'fly') {
      ctx.fillStyle = 'rgba(50,34,20,0.32)';
      ctx.beginPath();
      ctx.ellipse(x, y + h * 0.02, w * 0.7, w * 0.22, 0, 0, TAU);
      ctx.fill();
    }

    const art = this.art[SPRITE_SLOT[t.kind]];
    if (art) {
      const aw = (h * art.width) / art.height;
      if (t.motion === 'fly') {
        ctx.save();
        ctx.translate(x, y - h / 2);
        ctx.rotate(Math.sin(t.spin) * 0.35);
        ctx.drawImage(art, -aw / 2, -h / 2, aw, h);
        ctx.restore();
      } else {
        ctx.drawImage(art, x - aw / 2, y - h, aw, h);
      }
      return;
    }

    switch (t.kind) {
      case 'bottle':
        this.bottle(ctx, x, y, w, h, depth, false, time);
        break;
      case 'gold':
        this.bottle(ctx, x, y, w, h, depth, true, time);
        break;
      case 'can':
        this.can(ctx, x, y, w, h, depth);
        break;
      case 'clay':
        this.clay(ctx, x, y - h / 2, w, h, depth, t.spin);
        break;
      case 'tnt':
        this.tnt(ctx, x, y, w, h, depth, time);
        break;
      case 'hazard':
        this.barrel(ctx, x, y, w, h, depth);
        break;
    }
  }

  private bottle(
    ctx: CanvasRenderingContext2D,
    x: number,
    yBase: number,
    w: number,
    h: number,
    depth: number,
    gold: boolean,
    time: number,
  ) {
    const bw = w;
    const bodyTop = yBase - h * 0.6;
    const neckW = bw * 0.34;
    const capY = yBase - h;

    const glass: [number, number, number] = gold ? [214, 168, 62] : [122, 152, 96];
    const glassLit: [number, number, number] = gold ? [255, 226, 138] : [186, 214, 158];
    const c = fogged(glass, depth, 0.85);
    const cl = fogged(glassLit, depth, 0.85);

    ctx.beginPath();
    ctx.moveTo(x - bw / 2, yBase);
    ctx.lineTo(x - bw / 2, bodyTop + h * 0.06);
    ctx.quadraticCurveTo(x - bw / 2, bodyTop - h * 0.06, x - neckW / 2, bodyTop - h * 0.12);
    ctx.lineTo(x - neckW / 2, capY + h * 0.04);
    ctx.quadraticCurveTo(x - neckW / 2, capY, x - neckW * 0.6, capY);
    ctx.lineTo(x + neckW * 0.6, capY);
    ctx.quadraticCurveTo(x + neckW / 2, capY, x + neckW / 2, capY + h * 0.04);
    ctx.lineTo(x + neckW / 2, bodyTop - h * 0.12);
    ctx.quadraticCurveTo(x + bw / 2, bodyTop - h * 0.06, x + bw / 2, bodyTop + h * 0.06);
    ctx.lineTo(x + bw / 2, yBase);
    ctx.closePath();

    const g = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
    g.addColorStop(0, rgbStr(mixRgb(c, [20, 26, 18], 0.35)));
    g.addColorStop(0.3, rgbStr(cl));
    g.addColorStop(0.55, rgbStr(c));
    g.addColorStop(1, rgbStr(mixRgb(c, [16, 22, 14], 0.45)));
    ctx.fillStyle = g;
    ctx.fill();

    if (h > 14) {
      // label band
      ctx.fillStyle = `rgba(238,230,208,${0.86 - depth * 0.001})`;
      ctx.fillRect(x - bw * 0.44, yBase - h * 0.42, bw * 0.88, h * 0.2);
      ctx.fillStyle = 'rgba(120,60,30,0.7)';
      ctx.fillRect(x - bw * 0.44, yBase - h * 0.42, bw * 0.88, h * 0.035);
      // specular
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(x - bw * 0.28, bodyTop, bw * 0.09, h * 0.5);
      // cap
      ctx.fillStyle = gold ? 'rgba(255,232,150,0.95)' : 'rgba(150,120,70,0.95)';
      ctx.fillRect(x - neckW * 0.62, capY, neckW * 1.24, h * 0.05);
    }

    if (gold) {
      const tw = 0.5 + 0.5 * Math.sin(time * 6);
      const gr = ctx.createRadialGradient(x, yBase - h * 0.5, 0, x, yBase - h * 0.5, w * 2.4);
      gr.addColorStop(0, `rgba(255,238,170,${0.28 * tw})`);
      gr.addColorStop(1, 'rgba(255,238,170,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(x, yBase - h * 0.5, w * 2.4, 0, TAU);
      ctx.fill();
    }
  }

  private can(
    ctx: CanvasRenderingContext2D,
    x: number,
    yBase: number,
    w: number,
    h: number,
    depth: number,
  ) {
    const c = fogged([198, 66, 52], depth, 0.85);
    const lit = fogged([242, 132, 112], depth, 0.85);
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, rgbStr(mixRgb(c, [30, 10, 8], 0.4)));
    g.addColorStop(0.32, rgbStr(lit));
    g.addColorStop(1, rgbStr(mixRgb(c, [26, 8, 6], 0.5)));
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, yBase - h, w, h);
    ctx.fillStyle = `rgba(214,214,220,${0.9 - depth * 0.001})`;
    ctx.fillRect(x - w / 2, yBase - h, w, h * 0.13);
    ctx.fillRect(x - w / 2, yBase - h * 0.13, w, h * 0.13);
  }

  private clay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    depth: number,
    spin: number,
  ) {
    const c = fogged([228, 118, 32], depth, 0.85);
    const tilt = Math.sin(spin) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt * 0.3);
    ctx.fillStyle = rgbStr(c);
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.75, Math.max(1, h * 0.28 * Math.abs(Math.cos(spin * 0.5)) + h * 0.1), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgbStr(fogged([255, 170, 80], depth, 0.85));
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.06, w * 0.42, h * 0.12, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private tnt(
    ctx: CanvasRenderingContext2D,
    x: number,
    yBase: number,
    w: number,
    h: number,
    depth: number,
    time: number,
  ) {
    const c = fogged([176, 44, 36], depth, 0.85);
    const lit = fogged([224, 92, 72], depth, 0.85);
    const sticks = 3;
    const sw = w / sticks;
    for (let i = 0; i < sticks; i++) {
      const sx = x - w / 2 + i * sw;
      const g = ctx.createLinearGradient(sx, 0, sx + sw, 0);
      g.addColorStop(0, rgbStr(mixRgb(c, [30, 6, 4], 0.35)));
      g.addColorStop(0.35, rgbStr(lit));
      g.addColorStop(1, rgbStr(mixRgb(c, [24, 4, 4], 0.45)));
      ctx.fillStyle = g;
      ctx.fillRect(sx + sw * 0.06, yBase - h, sw * 0.88, h);
    }
    ctx.fillStyle = `rgba(40,32,26,${0.85 - depth * 0.001})`;
    ctx.fillRect(x - w / 2, yBase - h * 0.62, w, h * 0.13);
    if (h > 10) {
      const flick = 0.6 + 0.4 * Math.sin(time * 22);
      ctx.fillStyle = `rgba(255,${180 + 60 * flick | 0},80,${0.9 * flick})`;
      ctx.beginPath();
      ctx.arc(x + w * 0.4, yBase - h * 1.1, Math.max(1, w * 0.16 * flick), 0, TAU);
      ctx.fill();
    }
  }

  private barrel(
    ctx: CanvasRenderingContext2D,
    x: number,
    yBase: number,
    w: number,
    h: number,
    depth: number,
  ) {
    const c = fogged([44, 96, 168], depth, 0.85);
    const lit = fogged([98, 156, 224], depth, 0.85);
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, rgbStr(mixRgb(c, [8, 18, 34], 0.45)));
    g.addColorStop(0.3, rgbStr(lit));
    g.addColorStop(0.62, rgbStr(c));
    g.addColorStop(1, rgbStr(mixRgb(c, [6, 14, 28], 0.5)));
    ctx.fillStyle = g;
    ctx.fillRect(x - w / 2, yBase - h, w, h);
    ctx.fillStyle = `rgba(20,44,80,${0.7 - depth * 0.0008})`;
    for (const f of [0.2, 0.5, 0.8]) ctx.fillRect(x - w / 2, yBase - h * f, w, h * 0.045);
    if (h > 12) {
      ctx.strokeStyle = 'rgba(255,240,200,0.9)';
      ctx.lineWidth = Math.max(1, w * 0.08);
      const cxp = x;
      const cyp = yBase - h * 0.52;
      const r = w * 0.24;
      ctx.beginPath();
      ctx.moveTo(cxp - r, cyp - r);
      ctx.lineTo(cxp + r, cyp + r);
      ctx.moveTo(cxp + r, cyp - r);
      ctx.lineTo(cxp - r, cyp + r);
      ctx.stroke();
    }
  }

  // ── particles ───────────────────────────────────────────────────────

  private particles(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    ps: Particles,
  ) {
    const list = ps.list;
    // depth-sort indices into a reused buffer; particle counts stay small
    const order = this.order;
    order.length = list.length;
    for (let i = 0; i < list.length; i++) order[i] = i;
    order.sort((a, b) => list[b].z - list[a].z);

    for (const i of order) {
      const p = list[i];
      const pr = cam.project(p.x, p.y, p.z, view, this.p0);
      if (!pr.ok) continue;
      if (pr.x < -60 || pr.x > view.W + 60 || pr.y < -60 || pr.y > view.H + 60) continue;
      const fade = Particles.fade(p);
      const size = Math.max(0.6, p.size * pr.s);
      this.particle(ctx, p, pr.x, pr.y, size, fade);
    }
  }

  private particle(
    ctx: CanvasRenderingContext2D,
    p: Particle,
    x: number,
    y: number,
    size: number,
    fade: number,
  ) {
    switch (p.kind) {
      case 'shard': {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot);
        ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${0.9 * fade})`;
        ctx.beginPath();
        ctx.moveTo(-size, -size * 0.4);
        ctx.lineTo(size * 0.8, -size);
        ctx.lineTo(size, size * 0.6);
        ctx.lineTo(-size * 0.4, size);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'spark':
      case 'ember': {
        const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
        g.addColorStop(0, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${fade})`);
        g.addColorStop(1, `rgba(${p.r | 0},${(p.g * 0.5) | 0},0,0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size * 2.2, 0, TAU);
        ctx.fill();
        break;
      }
      case 'dust':
      case 'smoke': {
        const a = p.a * fade * (p.kind === 'smoke' ? 0.8 : 1);
        const r = size * (1 + (1 - fade) * 1.6);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${a})`);
        g.addColorStop(1, `rgba(${p.r | 0},${p.g | 0},${p.b | 0},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        break;
      }
      case 'ring': {
        const r = size * (1 - fade) * 1.2 + 0.2;
        ctx.strokeStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${fade * 0.6})`;
        ctx.lineWidth = Math.max(1, size * 0.12 * fade);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, r * 8), 0, TAU);
        ctx.stroke();
        break;
      }
      case 'text': {
        if (!p.text) break;
        const scale = clamp(size * 0.6, 11, 34);
        ctx.save();
        ctx.font = `700 ${scale}px Impact, "Arial Narrow", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(20,12,6,${fade * 0.8})`;
        ctx.strokeText(p.text, x, y);
        ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${fade})`;
        ctx.fillText(p.text, x, y);
        ctx.restore();
        break;
      }
    }
  }

  // ── foreground ──────────────────────────────────────────────────────

  /** The weathered rail the shooter is braced against. */
  private rail(
    ctx: CanvasRenderingContext2D,
    view: View,
    cam: Camera,
    assets: AssetTable,
  ) {
    const art = assets.rail;
    if (art) {
      const p = cam.project(0, 0.84, 1.75, view, this.p0);
      if (p.ok) {
        const w = view.W * 1.02;
        const h = (w * art.height) / art.width;
        ctx.drawImage(art, -view.W * 0.01, p.y, w, h);
      }
      return;
    }
    const z = 1.75;
    const top = 0.84;
    // top plank, then the lower one behind it
    this.box(ctx, view, cam, 0, top - 0.08, z, 9, 0.17, 0.44, [112, 78, 46], 2);
    this.box(ctx, view, cam, 0, top - 0.4, z + 0.14, 9, 0.15, 0.36, [86, 60, 36], 2);

    // grain and a lit top edge so the plank reads as timber, not a bar
    const p = cam.project(0, top, z, view, this.p0);
    if (p.ok && p.s > 8) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = '#4a3018';
      ctx.lineWidth = Math.max(1, p.s * 0.006);
      for (let i = -22; i <= 22; i++) {
        const gx = p.x + i * p.s * 0.26;
        ctx.beginPath();
        ctx.moveTo(gx, p.y - p.s * 0.01);
        ctx.lineTo(gx + p.s * 0.04, p.y + p.s * 0.16);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = 'rgba(255,232,192,0.5)';
      ctx.lineWidth = Math.max(1, p.s * 0.008);
      ctx.beginPath();
      ctx.moveTo(0, p.y - p.s * 0.005);
      ctx.lineTo(view.W, p.y - p.s * 0.005);
      ctx.stroke();
      ctx.restore();
    }
  }
}
