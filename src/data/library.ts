// Starter stamp library. Each stamp draws a solid (black) motif into a
// size×size context; the Block turns that into a raised, printable mask.
// NOTE: this is an intentionally small seed set — the Library agent expands it.

import type { LibraryStamp } from '../core/types';

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

export const STARTER_STAMPS: LibraryStamp[] = [
  {
    id: 'circle',
    name: 'Dot',
    collection: 'Geometric',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'triangle',
    name: 'Triangle',
    collection: 'Geometric',
    draw(ctx, s) {
      poly(ctx, [
        [s * 0.5, s * 0.16],
        [s * 0.84, s * 0.82],
        [s * 0.16, s * 0.82],
      ]);
    },
  },
  {
    id: 'leaf',
    name: 'Leaf',
    collection: 'Botanical',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.12);
      ctx.quadraticCurveTo(s * 0.9, s * 0.5, s * 0.5, s * 0.88);
      ctx.quadraticCurveTo(s * 0.1, s * 0.5, s * 0.5, s * 0.12);
      ctx.fill();
    },
  },
  {
    id: 'star',
    name: 'Star',
    collection: 'Celestial',
    draw(ctx, s) {
      const cx = s / 2;
      const cy = s / 2;
      const R = s * 0.36;
      const r = s * 0.15;
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 ? r : R;
        pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
      }
      poly(ctx, pts);
    },
  },
];

export const STARTER_COLLECTIONS = ['Botanical', 'Celestial', 'Geometric'];
