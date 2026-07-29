export const MUZZLE_V = 320; // m/s — deliberately slow so drop is a real skill
export const GRAVITY = 9.81;
/** The scope is zeroed here, so hits inside this range need no holdover. */
export const ZERO_RANGE = 60;
/** How hard crosswind pushes the round. Tuned for feel, not for a ballistic table. */
export const WIND_COEF = 0.55;

/** Barrel elevation, in radians, that puts the round on the crosshair at zero range. */
export function zeroElevation(v = MUZZLE_V, range = ZERO_RANGE) {
  const t = range / v;
  return Math.atan((0.5 * GRAVITY * t * t) / range);
}

const ZERO_ANGLE = zeroElevation();

/** Vertical error, in metres, of a zeroed rifle at a given range (negative = low). */
export function dropAt(range: number) {
  const t = range / MUZZLE_V;
  return range * Math.tan(ZERO_ANGLE) - 0.5 * GRAVITY * t * t;
}

/** Lateral push, in metres, at a given range for a crosswind in m/s. */
export function driftAt(range: number, wind: number) {
  const t = range / MUZZLE_V;
  return 0.5 * wind * WIND_COEF * t * t;
}

/** A round in flight. Keeps its previous position so collisions test a segment. */
export class Shot {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  pz: number;
  vx: number;
  vy: number;
  vz: number;
  t = 0;
  alive = true;
  /** Distance travelled, used for the range readout on a hit. */
  travel = 0;

  constructor(
    origin: readonly [number, number, number],
    dir: readonly [number, number, number],
    private wind: number,
  ) {
    this.x = this.px = origin[0];
    this.y = this.py = origin[1];
    this.z = this.pz = origin[2];

    // Apply the zero elevation about the horizontal axis perpendicular to aim.
    const horiz = Math.hypot(dir[0], dir[2]) || 1;
    const pitch = Math.atan2(dir[1], horiz) + ZERO_ANGLE;
    const yaw = Math.atan2(dir[0], dir[2]);
    const cp = Math.cos(pitch);
    this.vx = Math.sin(yaw) * cp * MUZZLE_V;
    this.vy = Math.sin(pitch) * MUZZLE_V;
    this.vz = Math.cos(yaw) * cp * MUZZLE_V;
  }

  step(dt: number) {
    this.px = this.x;
    this.py = this.y;
    this.pz = this.z;
    this.vy -= GRAVITY * dt;
    this.vx += this.wind * WIND_COEF * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.z += this.vz * dt;
    this.t += dt;
    this.travel += Math.hypot(
      this.x - this.px,
      this.y - this.py,
      this.z - this.pz,
    );
  }

  /** Fraction along this step where the round crossed a given depth, or -1. */
  crossesZ(z: number) {
    if (this.pz === this.z) return -1;
    const u = (z - this.pz) / (this.z - this.pz);
    return u >= 0 && u <= 1 ? u : -1;
  }

  at(u: number): [number, number, number] {
    return [
      this.px + (this.x - this.px) * u,
      this.py + (this.y - this.py) * u,
      this.pz + (this.z - this.pz) * u,
    ];
  }
}
