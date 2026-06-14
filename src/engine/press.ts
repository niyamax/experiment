// Turns a block mask + ink into a single printed impression bitmap, baking in
// the handmade imperfection: uneven ink coverage, a faint rough edge, grain,
// and (caller-applied) slight rotation/jitter. This is the soul of STAMP.

import { hashSeed, makeNoise2D, mulberry32 } from '../core/rng';
import type { Block } from './block';

export interface PressOptions {
  color: string;
  /** 0..1 — how much ink is loaded; lower = patchier, more ghosting */
  inkLevel: number;
  /** output bitmap edge length in device px */
  out: number;
  /** unique seed for this press's fingerprint */
  seed: number;
}

/**
 * Render the block as an inked impression. Returns a canvas of size out×out
 * with premultiplied ink + texture; transparent where nothing printed.
 */
export function renderImpression(block: Block, opts: PressOptions): HTMLCanvasElement {
  const out = Math.max(16, Math.floor(opts.out));
  const seed = opts.seed >>> 0;
  const rand = mulberry32(seed);
  const noise = makeNoise2D(hashSeed(seed, 1));
  const grain = makeNoise2D(hashSeed(seed, 2));

  // 1) draw the mask scaled down to output resolution
  const mask = document.createElement('canvas');
  mask.width = out;
  mask.height = out;
  const mctx = mask.getContext('2d', { willReadFrequently: true })!;
  mctx.imageSmoothingEnabled = true;
  mctx.drawImage(block.canvas, 0, 0, out, out);

  const img = mctx.getImageData(0, 0, out, out);
  const d = img.data;

  const [ir, ig, ib] = hexToRgb(opts.color);

  // ink coverage field: a low-frequency unevenness biased by ink level
  const freq = 2.6 + rand() * 1.4;
  const ox = rand() * 100;
  const oy = rand() * 100;
  const level = clamp(opts.inkLevel, 0.18, 1);
  // patchiness grows as ink runs low
  const patch = 0.85 - level * 0.55;

  for (let y = 0; y < out; y++) {
    for (let x = 0; x < out; x++) {
      const i = (y * out + x) * 4;
      const a = d[i + 3];
      if (a === 0) continue;

      const nx = (x / out) * freq + ox;
      const ny = (y / out) * freq + oy;
      const coverage = noise(nx, ny); // 0..1 smooth
      const g = grain(x * 0.18, y * 0.18); // high-freq grain

      // base ink amount from mask alpha
      let ink = (a / 255) * level;
      // uneven coverage: pull some areas toward ghosting
      ink *= 1 - patch * (1 - coverage);
      // fine grain breakup
      ink *= 0.82 + 0.18 * g;
      // a little fibrous threshold so faint areas drop out (paper texture)
      if (ink < 0.06 + patch * 0.06 * (1 - g)) ink = 0;

      ink = clamp(ink, 0, 1);
      d[i] = ir;
      d[i + 1] = ig;
      d[i + 2] = ib;
      d[i + 3] = Math.round(ink * 255);
    }
  }

  mctx.putImageData(img, 0, 0);

  // 2) gently roughen the edge by eroding a sparse speckle ring is overkill;
  // the coverage threshold above already frays edges. Done.
  return mask;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
