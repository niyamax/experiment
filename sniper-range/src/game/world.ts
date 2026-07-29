import { fbm1, hash2, lerp, mulberry32 } from '../core/math';

export interface Bench {
  x: number;
  z: number;
  /** Half-width of the plank, metres. */
  half: number;
  top: number;
  /** Local x offsets where a target can stand. */
  slots: number[];
}

export type ScatterKind = 'rock' | 'bush' | 'cactus' | 'yucca' | 'grass';

export interface Scatter {
  x: number;
  z: number;
  kind: ScatterKind;
  size: number;
  seed: number;
}

export interface Cloud {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  seed: number;
}

export const BENCH_TOP = 0.78;
export const GROUND_Y = 0;

/** Sky / haze palette for the midday Mojave look. */
export const PALETTE = {
  skyTop: [58, 118, 186] as const,
  skyMid: [126, 178, 222] as const,
  skyHaze: [212, 226, 232] as const,
  sunGlow: [255, 246, 214] as const,
  sandNear: [201, 166, 116] as const,
  sandFar: [218, 197, 162] as const,
  pathNear: [172, 139, 96] as const,
  rockFar: [138, 138, 148] as const,
  rockNear: [158, 108, 74] as const,
  fog: [208, 218, 224] as const,
};

/** Flat-topped mesa silhouettes; layer 0 is the most distant. */
export function ridgeHeight(x: number, layer: number) {
  const s = [0.0018, 0.0034, 0.0062][layer];
  const amp = [210, 135, 78][layer];
  const base = [46, 30, 16][layer];
  let h = fbm1(x * s + layer * 37.3, 4, layer * 101);
  h = Math.pow(h, 1.35);
  const stepped = Math.round(h * 5) / 5; // mesa terraces
  h = lerp(h, stepped, 0.6);
  return base + h * amp;
}

export const RIDGE_DEPTH = [1500, 780, 430];

export class World {
  benches: Bench[] = [];
  scatter: Scatter[] = [];
  clouds: Cloud[] = [];
  /** Crosswind for the current run, m/s (positive blows to +x). */
  wind = 0;

  constructor(seed = 20240729) {
    const rnd = mulberry32(seed);

    const depths = [26, 38, 52, 68, 86, 108, 132];
    for (let i = 0; i < depths.length; i++) {
      const z = depths[i];
      const x = (rnd() - 0.5) * z * 0.16;
      const half = 1.15 + rnd() * 0.5;
      const slotCount = 3;
      const slots: number[] = [];
      for (let s = 0; s < slotCount; s++) {
        slots.push(lerp(-half * 0.72, half * 0.72, s / (slotCount - 1)));
      }
      this.benches.push({ x, z, half, top: BENCH_TOP, slots });
    }

    // Ground clutter. Kept off the firing lane so it never masks a target.
    for (let i = 0; i < 460; i++) {
      const z = 13 + Math.pow(rnd(), 0.55) * 250;
      const spread = 5 + z * 0.8;
      let x = (rnd() - 0.5) * 2 * spread;
      const r = rnd();
      const kind: ScatterKind =
        r < 0.34 ? 'rock' : r < 0.66 ? 'bush' : r < 0.82 ? 'grass' : r < 0.94 ? 'yucca' : 'cactus';
      // pebbles and tufts may sit in the lane; anything tall is kept clear of it
      const keepOut = kind === 'rock' || kind === 'grass' ? 0.9 : 3.2;
      if (Math.abs(x) < keepOut) x += Math.sign(x || 1) * keepOut;
      let size =
        kind === 'rock'
          ? 0.18 + rnd() * 0.7
          : kind === 'bush'
            ? 0.35 + rnd() * 0.65
            : kind === 'grass'
              ? 0.2 + rnd() * 0.3
              : kind === 'yucca'
                ? 0.7 + rnd() * 0.9
                : 1.4 + rnd() * 1.9;
      // nothing tall right under the muzzle, or it masks the whole range
      if (z < 26) size = Math.min(size, 0.55);
      this.scatter.push({ x, z, kind, size, seed: (rnd() * 1e6) | 0 });
    }
    this.scatter.sort((a, b) => b.z - a.z);

    for (let i = 0; i < 26; i++) {
      const z = 300 + rnd() * 900;
      this.clouds.push({
        x: (rnd() - 0.5) * 2 * (z * 1.3),
        y: 90 + rnd() * 220,
        z,
        w: 120 + rnd() * 320,
        h: 26 + rnd() * 70,
        seed: (rnd() * 1e6) | 0,
      });
    }
    this.clouds.sort((a, b) => b.z - a.z);
  }

  /** Small per-position sand tint variation so the flats are not flat. */
  groundTint(x: number, z: number) {
    return hash2(Math.floor(x * 0.5), Math.floor(z * 0.5));
  }
}
