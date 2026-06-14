// The Studio ties the live carving Block to the open canvas: it owns the
// current block and knows how to press it down as an impression.

import { store, uid } from '../core/store';
import { hashSeed } from '../core/rng';
import type { Impression } from '../core/types';
import { Block } from './block';
import { renderImpression } from './press';

class Studio {
  block: Block;
  private pressCount = 0;

  constructor() {
    this.block = new Block(store.get().blockSize);
  }

  /** Build an impression bitmap from the current block + ink, ready to place. */
  makeImpression(worldX: number, worldY: number, size: number): Impression | null {
    if (this.block.isBlank()) return null;
    const ink = store.get().ink;
    const seed = hashSeed(this.pressCount++, Math.floor(worldX), Math.floor(worldY), Date.now() & 0xffff);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const raster = renderImpression(this.block, {
      color: ink.color,
      inkLevel: ink.level,
      out: Math.round(size * dpr),
      seed,
    });

    // handmade wobble: tiny rotation + scale variance
    const rot = (Math.random() - 0.5) * 0.07; // ±2°
    const sv = 1 + (Math.random() - 0.5) * 0.03;

    return {
      id: uid(),
      x: worldX,
      y: worldY,
      rotation: rot,
      scale: sv,
      raster,
      w: size * sv,
      h: size * sv,
    };
  }

  /** Press once at a world point, consuming a little ink. */
  pressAt(worldX: number, worldY: number, size: number): Impression | null {
    const imp = this.makeImpression(worldX, worldY, size);
    if (!imp) return null;
    store.update((s) => {
      s.impressions.push(imp);
      s.ink = { ...s.ink, level: Math.max(0.15, s.ink.level - 0.06) };
    });
    return imp;
  }

  reink() {
    store.update((s) => {
      s.ink = { ...s.ink, level: 1 };
    });
  }
}

export const studio = new Studio();
