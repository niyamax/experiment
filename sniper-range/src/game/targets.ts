import { TAU } from '../core/math';

export type TargetKind = 'bottle' | 'gold' | 'can' | 'clay' | 'tnt' | 'hazard';

export interface KindSpec {
  /** Width and height in metres. */
  w: number;
  h: number;
  points: number;
  label: string;
}

export const KINDS: Record<TargetKind, KindSpec> = {
  bottle: { w: 0.1, h: 0.31, points: 100, label: 'Bottle' },
  gold: { w: 0.11, h: 0.33, points: 300, label: 'Gold' },
  can: { w: 0.075, h: 0.13, points: 60, label: 'Can' },
  clay: { w: 0.13, h: 0.13, points: 250, label: 'Clay' },
  tnt: { w: 0.16, h: 0.24, points: 150, label: 'TNT' },
  hazard: { w: 0.62, h: 0.9, points: 0, label: 'Barrel' },
};

export const HAZARD_PENALTY = -250;
export const TNT_RADIUS = 4.2;

export type Motion = 'static' | 'swing' | 'slide' | 'fly';

let nextId = 1;

export class Target {
  id = nextId++;
  alive = true;
  /** Seconds since spawn — drives the pop-in scale. */
  age = 0;
  /** Set when killed so the renderer can skip it and the game can score it. */
  dead = false;

  w: number;
  h: number;
  points: number;

  // world position of the base centre
  x: number;
  y: number;
  z: number;

  // motion state
  vx = 0;
  vy = 0;
  vz = 0;
  phase = Math.random() * TAU;
  amp = 0;
  rate = 1;
  spin = 0;
  private baseX: number;

  constructor(
    public kind: TargetKind,
    public motion: Motion,
    x: number,
    y: number,
    z: number,
  ) {
    const spec = KINDS[kind];
    this.w = spec.w;
    this.h = spec.h;
    this.points = spec.points;
    this.x = this.baseX = x;
    this.y = y;
    this.z = z;
  }

  /** Scale factor while the target rises into place. */
  get popIn() {
    return Math.min(1, this.age / 0.28);
  }

  update(dt: number) {
    this.age += dt;
    switch (this.motion) {
      case 'swing':
        this.x = this.baseX + Math.sin(this.age * this.rate + this.phase) * this.amp;
        break;
      case 'slide': {
        this.x += this.vx * dt;
        if (Math.abs(this.x - this.baseX) > this.amp) {
          this.x = this.baseX + Math.sign(this.x - this.baseX) * this.amp;
          this.vx *= -1;
        }
        break;
      }
      case 'fly':
        this.vy -= 9.81 * dt * 0.55; // clays are draggy, they hang
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
        this.spin += dt * 5.5;
        if (this.y <= 0.05) this.dead = true;
        break;
      case 'static':
      default:
        break;
    }
  }

  /** Horizontal half-extent, including a little forgiveness at long range. */
  halfWidth(assist: number) {
    return this.w / 2 + assist;
  }

  /**
   * Test a bullet crossing this target's depth.
   * Returns null on a miss, or the hit zone on a hit.
   */
  hitZone(px: number, py: number, assist: number): 'neck' | 'body' | null {
    const hw = this.halfWidth(assist);
    const lo = this.y - assist * 0.5;
    const hi = this.y + this.h + assist * 0.5;
    if (px < this.x - hw || px > this.x + hw) return null;
    if (py < lo || py > hi) return null;
    const isBottle = this.kind === 'bottle' || this.kind === 'gold';
    if (isBottle && py > this.y + this.h * 0.66) return 'neck';
    return 'body';
  }

  get centerY() {
    return this.y + this.h / 2;
  }

  /** Straight-line distance from the shooter's eye. */
  range(eyeY: number) {
    return Math.hypot(this.x, this.centerY - eyeY, this.z);
  }
}
