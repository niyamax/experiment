import { DEG, clamp, damp } from '../core/math';

/** A projection setup: viewport size, principal point and focal length. */
export interface View {
  W: number;
  H: number;
  cx: number;
  cy: number;
  f: number;
  fovY: number;
}

export interface Proj {
  x: number;
  y: number;
  z: number;
  /** Pixels per world metre at this depth. */
  s: number;
  ok: boolean;
}

export const HIP_FOV = 46 * DEG;
/** Magnification stops available on the scope. */
export const ZOOM_STOPS = [8 * DEG, 4 * DEG, 2 * DEG];

export const EYE_HEIGHT = 1.12;
const MAX_PITCH = 16 * DEG;
const MAX_YAW = 34 * DEG;

export function makeView(W: number, H: number, fovY: number, cyFrac = 0.47): View {
  const f = H / 2 / Math.tan(fovY / 2);
  return { W, H, cx: W / 2, cy: H * cyFrac, f, fovY };
}

export class Camera {
  readonly x = 0;
  readonly y = EYE_HEIGHT;
  readonly z = 0;

  /** Player-controlled aim. */
  yaw = 0;
  pitch = -0.8 * DEG;

  /** Breathing wobble, added on top of aim. */
  swayYaw = 0;
  swayPitch = 0;
  /** Recoil spring, added on top of aim. */
  kickYaw = 0;
  kickPitch = 0;
  private kickYawV = 0;
  private kickPitchV = 0;

  /** Seconds of held breath left. */
  breath = 1;
  holdingBreath = false;

  zoomIndex = 0;
  /** Smoothed magnification so the transition is not a jump cut. */
  fovY = ZOOM_STOPS[0];

  private t = 0;
  private trauma = 0;

  get aimYaw() {
    return this.yaw + this.swayYaw + this.kickYaw;
  }
  get aimPitch() {
    return this.pitch + this.swayPitch + this.kickPitch;
  }

  reset() {
    this.yaw = 0;
    this.pitch = -0.8 * DEG;
    this.kickYaw = this.kickPitch = this.kickYawV = this.kickPitchV = 0;
    this.breath = 1;
    this.zoomIndex = 0;
    this.fovY = ZOOM_STOPS[0];
    this.trauma = 0;
  }

  cycleZoom(steps: number) {
    if (!steps) return;
    this.zoomIndex = clamp(this.zoomIndex + Math.sign(steps), 0, ZOOM_STOPS.length - 1);
  }

  /** Aim delta arrives in screen pixels and is scaled by magnification. */
  look(dx: number, dy: number, sensitivity: number) {
    const perPixel = (this.fovY / 900) * sensitivity;
    this.yaw = clamp(this.yaw + dx * perPixel, -MAX_YAW, MAX_YAW);
    this.pitch = clamp(this.pitch - dy * perPixel, -MAX_PITCH, MAX_PITCH);
  }

  fire(recoilScale = 1) {
    this.kickPitchV += 3.1 * recoilScale;
    this.kickYawV += (Math.random() - 0.5) * 1.5 * recoilScale;
    this.trauma = Math.min(1, this.trauma + 0.55 * recoilScale);
    this.breath = Math.max(0, this.breath - 0.06);
  }

  shake(amount: number) {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number, holdBreath: boolean) {
    this.t += dt;

    // magnification easing, in log space so each stop feels the same size
    const target = ZOOM_STOPS[this.zoomIndex];
    this.fovY = Math.exp(damp(Math.log(this.fovY), Math.log(target), 11, dt));

    // breath budget
    this.holdingBreath = holdBreath && this.breath > 0;
    this.breath = clamp(
      this.breath + (this.holdingBreath ? -dt / 4.5 : dt / 7),
      0,
      1,
    );

    // Sway is partially compensated for magnification, otherwise 23x is
    // unplayable; holding breath damps it to a tremor.
    const zoomFactor = Math.pow(this.fovY / HIP_FOV, 0.55);
    const steady = this.holdingBreath ? 0.13 : 1;
    const amp = 0.0075 * zoomFactor * steady;
    const t = this.t;
    this.swayYaw =
      amp * (Math.sin(t * 0.83) * 0.6 + Math.sin(t * 1.97 + 1.1) * 0.28);
    this.swayPitch =
      amp * (Math.sin(t * 0.61 + 0.7) * 0.7 + Math.sin(t * 2.31) * 0.22);

    // recoil spring — stiff, slightly underdamped
    const k = 210;
    const c = 19;
    this.kickPitchV += (-k * this.kickPitch - c * this.kickPitchV) * dt;
    this.kickYawV += (-k * this.kickYaw - c * this.kickYawV) * dt;
    this.kickPitch += this.kickPitchV * dt * 0.06;
    this.kickYaw += this.kickYawV * dt * 0.06;

    this.trauma = Math.max(0, this.trauma - dt * 1.6);
  }

  /** Screen-space jitter from firing and explosions, in pixels. */
  shakeOffset(): [number, number] {
    const s = this.trauma * this.trauma;
    if (s < 0.0005) return [0, 0];
    const t = this.t * 60;
    return [
      Math.sin(t * 1.7) * 9 * s + (Math.random() - 0.5) * 4 * s,
      Math.cos(t * 2.3) * 7 * s + (Math.random() - 0.5) * 4 * s,
    ];
  }

  /** Unit vector the muzzle is pointing down. */
  forward(): [number, number, number] {
    const y = this.aimYaw;
    const p = this.aimPitch;
    const cp = Math.cos(p);
    return [Math.sin(y) * cp, Math.sin(p), Math.cos(y) * cp];
  }

  /** World point -> screen. `out` is reused to keep the frame allocation-free. */
  project(wx: number, wy: number, wz: number, view: View, out: Proj): Proj {
    const dx = wx - this.x;
    const dy = wy - this.y;
    const dz = wz - this.z;

    const yaw = this.aimYaw;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x1 = dx * cy - dz * sy;
    const z1 = dx * sy + dz * cy;

    const pitch = this.aimPitch;
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y2 = dy * cp - z1 * sp;
    const z2 = dy * sp + z1 * cp;

    if (z2 <= 0.05) {
      out.ok = false;
      out.x = out.y = 0;
      out.z = z2;
      out.s = 0;
      return out;
    }
    const s = view.f / z2;
    out.ok = true;
    out.x = view.cx + x1 * s;
    out.y = view.cy - y2 * s;
    out.z = z2;
    out.s = s;
    return out;
  }

  /** Screen y of the true horizon for this view. */
  horizonY(view: View) {
    return view.cy + view.f * Math.tan(this.aimPitch);
  }
}

export const newProj = (): Proj => ({ x: 0, y: 0, z: 0, s: 0, ok: false });
