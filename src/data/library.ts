// Pre-made stamp library. Each stamp draws a SOLID motif into a size×size
// context using the caller's current fillStyle; the Block turns that into a
// raised, printable mask. Every motif is built from FILLED paths only so it
// tints correctly when inked — never set a color here.
//
// Stamps are bold silhouettes meant to read at small sizes, with a touch of
// hand-cut irregularity. Motifs are centered with a small margin.

import type { LibraryStamp } from '../core/types';

// ---- tiny drawing helpers --------------------------------------------------

function poly(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A thick filled "stroke" along a quadratic curve (gives lines real width). */
function thickQuad(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  width: number,
) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // stroke with the current fill color (fillStyle is what caller set)
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();
}

/** A thick filled poly-line through points. */
function thickLine(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  width: number,
  closed = false,
) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (closed) ctx.closePath();
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.stroke();
}

/** A symmetric leaf/petal pointing up, centered at (x,y). */
function petal(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  len: number, wid: number, ang: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(wid, -len * 0.5, 0, -len);
  ctx.quadraticCurveTo(-wid, -len * 0.5, 0, 0);
  ctx.fill();
  ctx.restore();
}

function star(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  points: number, R: number, r: number, rot = -Math.PI / 2,
) {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const ang = (Math.PI / points) * i + rot;
    const rad = i % 2 ? r : R;
    pts.push([cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad]);
  }
  poly(ctx, pts);
}

// ===========================================================================
// BOTANICAL
// ===========================================================================

const botanical: LibraryStamp[] = [
  {
    id: 'leaf',
    name: 'Leaf',
    collection: 'Botanical',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.1);
      ctx.quadraticCurveTo(s * 0.92, s * 0.5, s * 0.5, s * 0.9);
      ctx.quadraticCurveTo(s * 0.08, s * 0.5, s * 0.5, s * 0.1);
      ctx.fill();
      // carve a thin midrib by punching paper? No — masks fill only. Keep solid.
    },
  },
  {
    id: 'fern',
    name: 'Fern',
    collection: 'Botanical',
    draw(ctx, s) {
      const stemW = s * 0.045;
      thickLine(ctx, [[s * 0.5, s * 0.92], [s * 0.5, s * 0.1]], stemW);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = s * (0.86 - t * 0.7);
        const len = s * (0.3 - t * 0.2);
        petal(ctx, s * 0.5, y, len, len * 0.32, -Math.PI * 0.62);
        petal(ctx, s * 0.5, y, len, len * 0.32, Math.PI * 0.62 + Math.PI);
      }
    },
  },
  {
    id: 'monstera',
    name: 'Monstera',
    collection: 'Botanical',
    draw(ctx, s) {
      // heart-ish leaf body
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.92);
      ctx.quadraticCurveTo(s * 0.06, s * 0.62, s * 0.18, s * 0.26);
      ctx.quadraticCurveTo(s * 0.32, s * 0.06, s * 0.5, s * 0.16);
      ctx.quadraticCurveTo(s * 0.68, s * 0.06, s * 0.82, s * 0.26);
      ctx.quadraticCurveTo(s * 0.94, s * 0.62, s * 0.5, s * 0.92);
      ctx.fill();
      // punch the characteristic splits back out
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (const side of [-1, 1]) {
        for (const t of [0.28, 0.5, 0.72]) {
          ctx.beginPath();
          ctx.moveTo(s * 0.5, s * (0.2 + t * 0.6));
          ctx.lineTo(s * (0.5 + side * 0.34), s * (0.16 + t * 0.55));
          ctx.lineTo(s * (0.5 + side * 0.26), s * (0.2 + t * 0.55));
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    },
  },
  {
    id: 'wheat',
    name: 'Wheat',
    collection: 'Botanical',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.5, s * 0.95], [s * 0.5, s * 0.3]], s * 0.04);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = s * (0.42 - t * 0.34);
        const len = s * 0.16;
        petal(ctx, s * 0.5, y, len, len * 0.36, -Math.PI * 0.72);
        petal(ctx, s * 0.5, y, len, len * 0.36, Math.PI * 0.72 + Math.PI);
      }
      petal(ctx, s * 0.5, s * 0.07, s * 0.16, s * 0.05, 0);
    },
  },
  {
    id: 'wildflower',
    name: 'Wildflower',
    collection: 'Botanical',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.5, s * 0.95], [s * 0.5, s * 0.5]], s * 0.035);
      // a couple of leaves on the stem
      petal(ctx, s * 0.5, s * 0.72, s * 0.18, s * 0.06, -Math.PI * 0.5);
      petal(ctx, s * 0.5, s * 0.78, s * 0.18, s * 0.06, Math.PI * 0.5);
      // 6-petal blossom
      const cx = s * 0.5, cy = s * 0.34;
      for (let i = 0; i < 6; i++) {
        petal(ctx, cx, cy, s * 0.24, s * 0.09, (Math.PI / 3) * i);
      }
      disc(ctx, cx, cy, s * 0.07);
    },
  },
  {
    id: 'mushroom',
    name: 'Mushroom',
    collection: 'Botanical',
    draw(ctx, s) {
      // cap
      ctx.beginPath();
      ctx.moveTo(s * 0.16, s * 0.46);
      ctx.quadraticCurveTo(s * 0.5, s * 0.02, s * 0.84, s * 0.46);
      ctx.quadraticCurveTo(s * 0.5, s * 0.58, s * 0.16, s * 0.46);
      ctx.fill();
      // stem
      ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.5);
      ctx.quadraticCurveTo(s * 0.38, s * 0.86, s * 0.32, s * 0.9);
      ctx.lineTo(s * 0.68, s * 0.9);
      ctx.quadraticCurveTo(s * 0.62, s * 0.86, s * 0.6, s * 0.5);
      ctx.closePath();
      ctx.fill();
      // spots punched out
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.36, s * 0.34, s * 0.05);
      disc(ctx, s * 0.56, s * 0.3, s * 0.045);
      disc(ctx, s * 0.5, s * 0.42, s * 0.04);
      ctx.restore();
    },
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    collection: 'Botanical',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.12);
      ctx.quadraticCurveTo(s * 0.84, s * 0.4, s * 0.5, s * 0.9);
      ctx.quadraticCurveTo(s * 0.16, s * 0.4, s * 0.5, s * 0.12);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      for (let row = 0; row < 5; row++) {
        const y = s * (0.24 + row * 0.13);
        const off = row % 2 ? s * 0.08 : 0;
        for (let cxi = -1; cxi <= 1; cxi++) {
          thickLine(ctx, [
            [s * 0.5 + cxi * s * 0.16 + off, y - s * 0.04],
            [s * 0.5 + cxi * s * 0.16 + off, y + s * 0.04],
          ], s * 0.02);
        }
      }
      ctx.restore();
    },
  },
  {
    id: 'palm',
    name: 'Palm frond',
    collection: 'Botanical',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.5, s * 0.95], [s * 0.5, s * 0.12]], s * 0.04);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const y = s * (0.85 - t * 0.6);
        const len = s * (0.36 - t * 0.18);
        petal(ctx, s * 0.5, y, len, len * 0.18, -Math.PI * 0.66);
        petal(ctx, s * 0.5, y, len, len * 0.18, Math.PI * 0.66 + Math.PI);
      }
    },
  },
  {
    id: 'tulip',
    name: 'Tulip',
    collection: 'Botanical',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.5, s * 0.95], [s * 0.5, s * 0.5]], s * 0.04);
      petal(ctx, s * 0.5, s * 0.74, s * 0.2, s * 0.07, -Math.PI * 0.5);
      // cupped bloom
      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.5);
      ctx.quadraticCurveTo(s * 0.3, s * 0.18, s * 0.5, s * 0.16);
      ctx.quadraticCurveTo(s * 0.7, s * 0.18, s * 0.7, s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.62, s * 0.3, s * 0.5);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      thickLine(ctx, [[s * 0.42, s * 0.2], [s * 0.42, s * 0.5]], s * 0.025);
      thickLine(ctx, [[s * 0.58, s * 0.2], [s * 0.58, s * 0.5]], s * 0.025);
      ctx.restore();
    },
  },
];

// ===========================================================================
// CELESTIAL
// ===========================================================================

const celestial: LibraryStamp[] = [
  {
    id: 'sun',
    name: 'Sun',
    collection: 'Celestial',
    draw(ctx, s) {
      const cx = s * 0.5, cy = s * 0.5;
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i;
        const x = cx + Math.cos(a) * s * 0.42;
        const y = cy + Math.sin(a) * s * 0.42;
        thickLine(ctx, [[cx + Math.cos(a) * s * 0.28, cy + Math.sin(a) * s * 0.28], [x, y]], s * 0.05);
      }
      disc(ctx, cx, cy, s * 0.24);
    },
  },
  {
    id: 'crescent',
    name: 'Crescent',
    collection: 'Celestial',
    draw(ctx, s) {
      disc(ctx, s * 0.46, s * 0.5, s * 0.36);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.62, s * 0.42, s * 0.32);
      ctx.restore();
    },
  },
  {
    id: 'starburst',
    name: 'Starburst',
    collection: 'Celestial',
    draw(ctx, s) {
      star(ctx, s * 0.5, s * 0.5, 8, s * 0.42, s * 0.14);
    },
  },
  {
    id: 'fivestar',
    name: 'Star',
    collection: 'Celestial',
    draw(ctx, s) {
      star(ctx, s * 0.5, s * 0.5, 5, s * 0.4, s * 0.16);
    },
  },
  {
    id: 'comet',
    name: 'Comet',
    collection: 'Celestial',
    draw(ctx, s) {
      // tail
      poly(ctx, [
        [s * 0.66, s * 0.34],
        [s * 0.12, s * 0.86],
        [s * 0.3, s * 0.74],
        [s * 0.22, s * 0.82],
        [s * 0.4, s * 0.7],
      ]);
      star(ctx, s * 0.7, s * 0.3, 5, s * 0.2, s * 0.08);
    },
  },
  {
    id: 'cloud',
    name: 'Cloud',
    collection: 'Celestial',
    draw(ctx, s) {
      disc(ctx, s * 0.34, s * 0.56, s * 0.17);
      disc(ctx, s * 0.5, s * 0.46, s * 0.22);
      disc(ctx, s * 0.68, s * 0.56, s * 0.18);
      ctx.fillRect(s * 0.32, s * 0.56, s * 0.38, s * 0.16);
    },
  },
  {
    id: 'lightning',
    name: 'Lightning',
    collection: 'Celestial',
    draw(ctx, s) {
      poly(ctx, [
        [s * 0.56, s * 0.08],
        [s * 0.28, s * 0.54],
        [s * 0.46, s * 0.54],
        [s * 0.36, s * 0.92],
        [s * 0.74, s * 0.4],
        [s * 0.52, s * 0.4],
      ]);
    },
  },
  {
    id: 'planet',
    name: 'Planet',
    collection: 'Celestial',
    draw(ctx, s) {
      disc(ctx, s * 0.5, s * 0.5, s * 0.26);
      // ring
      ctx.save();
      ctx.translate(s * 0.5, s * 0.5);
      ctx.rotate(-0.4);
      ctx.scale(1, 0.34);
      ctx.lineWidth = s * 0.05;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },
  },
];

// ===========================================================================
// GEOMETRIC
// ===========================================================================

const geometric: LibraryStamp[] = [
  {
    id: 'dot',
    name: 'Dot',
    collection: 'Geometric',
    draw(ctx, s) {
      disc(ctx, s * 0.5, s * 0.5, s * 0.32);
    },
  },
  {
    id: 'triangle',
    name: 'Triangle',
    collection: 'Geometric',
    draw(ctx, s) {
      poly(ctx, [[s * 0.5, s * 0.14], [s * 0.86, s * 0.84], [s * 0.14, s * 0.84]]);
    },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    collection: 'Geometric',
    draw(ctx, s) {
      poly(ctx, [[s * 0.5, s * 0.1], [s * 0.86, s * 0.5], [s * 0.5, s * 0.9], [s * 0.14, s * 0.5]]);
    },
  },
  {
    id: 'halfcircle',
    name: 'Half-moon',
    collection: 'Geometric',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.62, s * 0.38, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'arch',
    name: 'Arch',
    collection: 'Geometric',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.18, s * 0.86);
      ctx.lineTo(s * 0.18, s * 0.46);
      ctx.arc(s * 0.5, s * 0.46, s * 0.32, Math.PI, 0);
      ctx.lineTo(s * 0.82, s * 0.86);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    id: 'chevron',
    name: 'Chevron',
    collection: 'Geometric',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.16, s * 0.6], [s * 0.5, s * 0.3], [s * 0.84, s * 0.6]], s * 0.12);
      thickLine(ctx, [[s * 0.16, s * 0.78], [s * 0.5, s * 0.48], [s * 0.84, s * 0.78]], s * 0.12);
    },
  },
  {
    id: 'wave',
    name: 'Wave',
    collection: 'Geometric',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.08, s * 0.5);
      ctx.bezierCurveTo(s * 0.3, s * 0.18, s * 0.42, s * 0.82, s * 0.62, s * 0.5);
      ctx.bezierCurveTo(s * 0.78, s * 0.26, s * 0.86, s * 0.62, s * 0.92, s * 0.5);
      ctx.lineWidth = s * 0.1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    },
  },
  {
    id: 'dotcluster',
    name: 'Dot cluster',
    collection: 'Geometric',
    draw(ctx, s) {
      const r = s * 0.11;
      disc(ctx, s * 0.5, s * 0.5, r);
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        disc(ctx, s * 0.5 + Math.cos(a) * s * 0.28, s * 0.5 + Math.sin(a) * s * 0.28, r);
      }
    },
  },
  {
    id: 'square',
    name: 'Square',
    collection: 'Geometric',
    draw(ctx, s) {
      ctx.save();
      ctx.translate(s * 0.5, s * 0.5);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-s * 0.28, -s * 0.28, s * 0.56, s * 0.56);
      ctx.restore();
    },
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    collection: 'Geometric',
    draw(ctx, s) {
      const pts: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push([s * 0.5 + Math.cos(a) * s * 0.4, s * 0.5 + Math.sin(a) * s * 0.4]);
      }
      poly(ctx, pts);
    },
  },
];

// ===========================================================================
// FOLK
// ===========================================================================

const folk: LibraryStamp[] = [
  {
    id: 'paisley',
    name: 'Paisley',
    collection: 'Folk',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.6, s * 0.86);
      ctx.bezierCurveTo(s * 0.1, s * 0.8, s * 0.18, s * 0.28, s * 0.5, s * 0.16);
      ctx.bezierCurveTo(s * 0.82, s * 0.06, s * 0.92, s * 0.46, s * 0.66, s * 0.5);
      ctx.bezierCurveTo(s * 0.5, s * 0.52, s * 0.5, s * 0.36, s * 0.6, s * 0.34);
      ctx.bezierCurveTo(s * 0.4, s * 0.34, s * 0.36, s * 0.66, s * 0.6, s * 0.86);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.52, s * 0.32, s * 0.06);
      ctx.restore();
    },
  },
  {
    id: 'rosette',
    name: 'Rosette',
    collection: 'Folk',
    draw(ctx, s) {
      const cx = s * 0.5, cy = s * 0.5;
      for (let i = 0; i < 8; i++) {
        petal(ctx, cx, cy, s * 0.4, s * 0.13, (Math.PI / 4) * i);
      }
      disc(ctx, cx, cy, s * 0.12);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, cx, cy, s * 0.05);
      ctx.restore();
    },
  },
  {
    id: 'scallop',
    name: 'Scallop',
    collection: 'Folk',
    draw(ctx, s) {
      const n = 3;
      const w = s * 0.84 / n;
      for (let i = 0; i < n; i++) {
        disc(ctx, s * 0.08 + w * (i + 0.5), s * 0.5, w * 0.46);
      }
      ctx.fillRect(s * 0.08, s * 0.5, s * 0.84, s * 0.18);
    },
  },
  {
    id: 'bird',
    name: 'Folk bird',
    collection: 'Folk',
    draw(ctx, s) {
      // body
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.6);
      ctx.quadraticCurveTo(s * 0.4, s * 0.34, s * 0.72, s * 0.42);
      ctx.quadraticCurveTo(s * 0.9, s * 0.46, s * 0.86, s * 0.52);
      ctx.quadraticCurveTo(s * 0.7, s * 0.54, s * 0.6, s * 0.6);
      ctx.quadraticCurveTo(s * 0.45, s * 0.7, s * 0.2, s * 0.6);
      ctx.fill();
      // tail
      poly(ctx, [[s * 0.2, s * 0.6], [s * 0.06, s * 0.7], [s * 0.1, s * 0.56], [s * 0.04, s * 0.5]]);
      // wing
      ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.74, s * 0.62, s * 0.56);
      ctx.quadraticCurveTo(s * 0.5, s * 0.56, s * 0.4, s * 0.5);
      ctx.fill();
      // eye punch
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.74, s * 0.47, s * 0.022);
      ctx.restore();
    },
  },
  {
    id: 'fish',
    name: 'Fish',
    collection: 'Folk',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.2, s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.22, s * 0.78, s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.78, s * 0.2, s * 0.5);
      ctx.fill();
      // tail
      poly(ctx, [[s * 0.78, s * 0.5], [s * 0.94, s * 0.34], [s * 0.88, s * 0.5], [s * 0.94, s * 0.66]]);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.34, s * 0.46, s * 0.03);
      ctx.restore();
    },
  },
  {
    id: 'hand',
    name: 'Hamsa hand',
    collection: 'Folk',
    draw(ctx, s) {
      // palm
      ctx.beginPath();
      ctx.moveTo(s * 0.3, s * 0.5);
      ctx.quadraticCurveTo(s * 0.3, s * 0.86, s * 0.5, s * 0.88);
      ctx.quadraticCurveTo(s * 0.7, s * 0.86, s * 0.7, s * 0.5);
      ctx.closePath();
      ctx.fill();
      // fingers
      for (let i = -1; i <= 1; i++) {
        thickLine(ctx, [[s * (0.5 + i * 0.14), s * 0.5], [s * (0.5 + i * 0.14), s * 0.2]], s * 0.08);
      }
      // thumbs
      thickLine(ctx, [[s * 0.32, s * 0.52], [s * 0.18, s * 0.42]], s * 0.08);
      thickLine(ctx, [[s * 0.68, s * 0.52], [s * 0.82, s * 0.42]], s * 0.08);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.5, s * 0.62, s * 0.06);
      ctx.restore();
    },
  },
  {
    id: 'evil-eye',
    name: 'Eye',
    collection: 'Folk',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.12, s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.18, s * 0.88, s * 0.5);
      ctx.quadraticCurveTo(s * 0.5, s * 0.82, s * 0.12, s * 0.5);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.5, s * 0.5, s * 0.18);
      ctx.restore();
      disc(ctx, s * 0.5, s * 0.5, s * 0.1);
    },
  },
];

// ===========================================================================
// SEASONAL
// ===========================================================================

const seasonal: LibraryStamp[] = [
  {
    id: 'snowflake',
    name: 'Snowflake',
    collection: 'Seasonal',
    draw(ctx, s) {
      const cx = s * 0.5, cy = s * 0.5;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const ex = cx + Math.cos(a) * s * 0.4;
        const ey = cy + Math.sin(a) * s * 0.4;
        thickLine(ctx, [[cx, cy], [ex, ey]], s * 0.045);
        // branches
        const bx = cx + Math.cos(a) * s * 0.24;
        const by = cy + Math.sin(a) * s * 0.24;
        thickLine(ctx, [
          [bx + Math.cos(a + 1) * s * 0.1, by + Math.sin(a + 1) * s * 0.1],
          [bx, by],
          [bx + Math.cos(a - 1) * s * 0.1, by + Math.sin(a - 1) * s * 0.1],
        ], s * 0.035);
      }
      disc(ctx, cx, cy, s * 0.06);
    },
  },
  {
    id: 'holly',
    name: 'Holly',
    collection: 'Seasonal',
    draw(ctx, s) {
      function hollyLeaf(cx: number, cy: number, rot: number) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.26);
        for (let i = 0; i < 6; i++) {
          const t = i / 5;
          const side = i % 2 ? 1 : -1;
          ctx.quadraticCurveTo(side * s * 0.14, -s * 0.26 + t * s * 0.52, side * s * 0.02, -s * 0.26 + (t + 0.08) * s * 0.52);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      hollyLeaf(s * 0.4, s * 0.46, -0.5);
      hollyLeaf(s * 0.6, s * 0.46, 0.5);
      disc(ctx, s * 0.46, s * 0.66, s * 0.06);
      disc(ctx, s * 0.56, s * 0.68, s * 0.06);
      disc(ctx, s * 0.5, s * 0.58, s * 0.06);
    },
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    collection: 'Seasonal',
    draw(ctx, s) {
      disc(ctx, s * 0.5, s * 0.58, s * 0.32);
      disc(ctx, s * 0.34, s * 0.58, s * 0.24);
      disc(ctx, s * 0.66, s * 0.58, s * 0.24);
      // stem
      thickLine(ctx, [[s * 0.5, s * 0.3], [s * 0.5, s * 0.14], [s * 0.6, s * 0.1]], s * 0.05);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      thickLine(ctx, [[s * 0.42, s * 0.34], [s * 0.42, s * 0.82]], s * 0.02);
      thickLine(ctx, [[s * 0.58, s * 0.34], [s * 0.58, s * 0.82]], s * 0.02);
      ctx.restore();
    },
  },
  {
    id: 'heart',
    name: 'Heart',
    collection: 'Seasonal',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(s * 0.5, s * 0.86);
      ctx.bezierCurveTo(s * 0.04, s * 0.54, s * 0.18, s * 0.12, s * 0.5, s * 0.34);
      ctx.bezierCurveTo(s * 0.82, s * 0.12, s * 0.96, s * 0.54, s * 0.5, s * 0.86);
      ctx.fill();
    },
  },
  {
    id: 'autumn-leaf',
    name: 'Autumn leaf',
    collection: 'Seasonal',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.5, s * 0.92], [s * 0.5, s * 0.2]], s * 0.035);
      function lobe(y: number, len: number, ang: number) {
        petal(ctx, s * 0.5, y, len, len * 0.5, ang);
      }
      lobe(s * 0.62, s * 0.32, 0);
      lobe(s * 0.6, s * 0.28, -Math.PI * 0.4);
      lobe(s * 0.6, s * 0.28, Math.PI * 0.4);
      lobe(s * 0.66, s * 0.22, -Math.PI * 0.7);
      lobe(s * 0.66, s * 0.22, Math.PI * 0.7);
    },
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    collection: 'Seasonal',
    draw(ctx, s) {
      const cx = s * 0.5, cy = s * 0.5;
      for (let i = 0; i < 12; i++) {
        const a = (Math.PI / 6) * i;
        const ex = cx + Math.cos(a) * s * 0.42;
        const ey = cy + Math.sin(a) * s * 0.42;
        thickLine(ctx, [[cx + Math.cos(a) * s * 0.12, cy + Math.sin(a) * s * 0.12], [ex, ey]], s * 0.03);
        disc(ctx, ex, ey, s * 0.035);
      }
      disc(ctx, cx, cy, s * 0.06);
    },
  },
  {
    id: 'sprig',
    name: 'Berry sprig',
    collection: 'Seasonal',
    draw(ctx, s) {
      thickQuad(ctx, s * 0.5, s * 0.92, s * 0.62, s * 0.5, s * 0.46, s * 0.16, s * 0.04);
      disc(ctx, s * 0.46, s * 0.16, s * 0.08);
      disc(ctx, s * 0.62, s * 0.3, s * 0.07);
      disc(ctx, s * 0.34, s * 0.36, s * 0.07);
      petal(ctx, s * 0.56, s * 0.62, s * 0.2, s * 0.07, -Math.PI * 0.45);
      petal(ctx, s * 0.46, s * 0.7, s * 0.2, s * 0.07, Math.PI * 0.45);
    },
  },
];

// ===========================================================================
// OBJECTS
// ===========================================================================

const objects: LibraryStamp[] = [
  {
    id: 'cup',
    name: 'Coffee cup',
    collection: 'Objects',
    draw(ctx, s) {
      // cup body
      poly(ctx, [[s * 0.24, s * 0.4], [s * 0.66, s * 0.4], [s * 0.6, s * 0.82], [s * 0.3, s * 0.82]]);
      // handle
      ctx.save();
      ctx.lineWidth = s * 0.06;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(s * 0.66, s * 0.54, s * 0.12, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.restore();
      // steam
      thickQuad(ctx, s * 0.4, s * 0.32, s * 0.46, s * 0.24, s * 0.4, s * 0.14, s * 0.03);
      thickQuad(ctx, s * 0.52, s * 0.32, s * 0.58, s * 0.24, s * 0.52, s * 0.14, s * 0.03);
    },
  },
  {
    id: 'envelope',
    name: 'Envelope',
    collection: 'Objects',
    draw(ctx, s) {
      ctx.fillRect(s * 0.14, s * 0.28, s * 0.72, s * 0.44);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      thickLine(ctx, [[s * 0.14, s * 0.28], [s * 0.5, s * 0.54], [s * 0.86, s * 0.28]], s * 0.05);
      ctx.restore();
    },
  },
  {
    id: 'key',
    name: 'Key',
    collection: 'Objects',
    draw(ctx, s) {
      disc(ctx, s * 0.3, s * 0.5, s * 0.18);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.3, s * 0.5, s * 0.08);
      ctx.restore();
      thickLine(ctx, [[s * 0.46, s * 0.5], [s * 0.86, s * 0.5]], s * 0.07);
      ctx.fillRect(s * 0.7, s * 0.5, s * 0.04, s * 0.16);
      ctx.fillRect(s * 0.8, s * 0.5, s * 0.04, s * 0.12);
    },
  },
  {
    id: 'bulb',
    name: 'Lightbulb',
    collection: 'Objects',
    draw(ctx, s) {
      disc(ctx, s * 0.5, s * 0.42, s * 0.26);
      poly(ctx, [[s * 0.36, s * 0.6], [s * 0.64, s * 0.6], [s * 0.6, s * 0.74], [s * 0.4, s * 0.74]]);
      ctx.fillRect(s * 0.4, s * 0.74, s * 0.2, s * 0.04);
      ctx.fillRect(s * 0.42, s * 0.8, s * 0.16, s * 0.04);
      ctx.fillRect(s * 0.44, s * 0.86, s * 0.12, s * 0.04);
    },
  },
  {
    id: 'anchor',
    name: 'Anchor',
    collection: 'Objects',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.5, s * 0.24], [s * 0.5, s * 0.78]], s * 0.06);
      thickLine(ctx, [[s * 0.34, s * 0.4], [s * 0.66, s * 0.4]], s * 0.06);
      ctx.save();
      ctx.lineWidth = s * 0.06;
      ctx.lineCap = 'round';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.66, s * 0.26, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.restore();
      disc(ctx, s * 0.5, s * 0.22, s * 0.08);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.5, s * 0.22, s * 0.035);
      ctx.restore();
    },
  },
  {
    id: 'scissors',
    name: 'Scissors',
    collection: 'Objects',
    draw(ctx, s) {
      disc(ctx, s * 0.26, s * 0.3, s * 0.1);
      disc(ctx, s * 0.26, s * 0.7, s * 0.1);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      disc(ctx, s * 0.26, s * 0.3, s * 0.05);
      disc(ctx, s * 0.26, s * 0.7, s * 0.05);
      ctx.restore();
      thickLine(ctx, [[s * 0.32, s * 0.34], [s * 0.82, s * 0.62]], s * 0.05);
      thickLine(ctx, [[s * 0.32, s * 0.66], [s * 0.82, s * 0.38]], s * 0.05);
    },
  },
  {
    id: 'house',
    name: 'House',
    collection: 'Objects',
    draw(ctx, s) {
      poly(ctx, [[s * 0.5, s * 0.16], [s * 0.86, s * 0.46], [s * 0.14, s * 0.46]]);
      ctx.fillRect(s * 0.22, s * 0.46, s * 0.56, s * 0.4);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(s * 0.44, s * 0.6, s * 0.14, s * 0.26);
      ctx.restore();
    },
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    collection: 'Objects',
    draw(ctx, s) {
      // hull
      poly(ctx, [[s * 0.16, s * 0.72], [s * 0.84, s * 0.72], [s * 0.72, s * 0.86], [s * 0.28, s * 0.86]]);
      // mast
      thickLine(ctx, [[s * 0.5, s * 0.7], [s * 0.5, s * 0.14]], s * 0.025);
      // sails
      poly(ctx, [[s * 0.5, s * 0.18], [s * 0.5, s * 0.66], [s * 0.2, s * 0.66]]);
      poly(ctx, [[s * 0.56, s * 0.26], [s * 0.56, s * 0.66], [s * 0.8, s * 0.66]]);
    },
  },
];

// ===========================================================================
// BORDERS
// ===========================================================================

const borders: LibraryStamp[] = [
  {
    id: 'border-scallop',
    name: 'Scallop strip',
    collection: 'Borders',
    draw(ctx, s) {
      const n = 5;
      const w = s / n;
      for (let i = 0; i < n; i++) {
        disc(ctx, w * (i + 0.5), s * 0.5, w * 0.46);
      }
      ctx.fillRect(0, s * 0.5, s, s * 0.14);
    },
  },
  {
    id: 'border-dots',
    name: 'Dot rule',
    collection: 'Borders',
    draw(ctx, s) {
      const n = 6;
      const w = s / n;
      for (let i = 0; i < n; i++) {
        disc(ctx, w * (i + 0.5), s * 0.5, s * 0.07);
      }
      ctx.fillRect(0, s * 0.46, s, s * 0.08);
    },
  },
  {
    id: 'border-zigzag',
    name: 'Zigzag',
    collection: 'Borders',
    draw(ctx, s) {
      const pts: [number, number][] = [];
      const n = 6;
      for (let i = 0; i <= n; i++) {
        pts.push([s * (i / n), i % 2 ? s * 0.68 : s * 0.32]);
      }
      thickLine(ctx, pts, s * 0.1);
    },
  },
  {
    id: 'border-diamonds',
    name: 'Diamond run',
    collection: 'Borders',
    draw(ctx, s) {
      const n = 4;
      const w = s / n;
      for (let i = 0; i < n; i++) {
        const cx = w * (i + 0.5);
        poly(ctx, [[cx, s * 0.24], [cx + w * 0.36, s * 0.5], [cx, s * 0.76], [cx - w * 0.36, s * 0.5]]);
      }
    },
  },
  {
    id: 'border-vine',
    name: 'Vine',
    collection: 'Borders',
    draw(ctx, s) {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.5);
      ctx.bezierCurveTo(s * 0.25, s * 0.18, s * 0.25, s * 0.82, s * 0.5, s * 0.5);
      ctx.bezierCurveTo(s * 0.75, s * 0.18, s * 0.75, s * 0.82, s, s * 0.5);
      ctx.lineWidth = s * 0.06;
      ctx.lineCap = 'round';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
      petal(ctx, s * 0.25, s * 0.3, s * 0.18, s * 0.07, 0);
      petal(ctx, s * 0.75, s * 0.7, s * 0.18, s * 0.07, Math.PI);
    },
  },
  {
    id: 'corner',
    name: 'Corner',
    collection: 'Borders',
    draw(ctx, s) {
      thickLine(ctx, [[s * 0.12, s * 0.88], [s * 0.12, s * 0.12], [s * 0.88, s * 0.12]], s * 0.08);
      // inner flourish
      ctx.save();
      ctx.lineWidth = s * 0.05;
      ctx.lineCap = 'round';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(s * 0.4, s * 0.4, s * 0.24, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
      disc(ctx, s * 0.4, s * 0.16, s * 0.05);
      disc(ctx, s * 0.16, s * 0.4, s * 0.05);
    },
  },
  {
    id: 'divider',
    name: 'Divider',
    collection: 'Borders',
    draw(ctx, s) {
      ctx.fillRect(s * 0.04, s * 0.47, s * 0.32, s * 0.06);
      ctx.fillRect(s * 0.64, s * 0.47, s * 0.32, s * 0.06);
      // center diamond
      poly(ctx, [[s * 0.5, s * 0.3], [s * 0.64, s * 0.5], [s * 0.5, s * 0.7], [s * 0.36, s * 0.5]]);
      disc(ctx, s * 0.5, s * 0.5, s * 0.05);
    },
  },
];

// ===========================================================================
// EXPORTS
// ===========================================================================

export const COLLECTIONS: string[] = [
  'Botanical',
  'Celestial',
  'Geometric',
  'Folk',
  'Seasonal',
  'Objects',
  'Borders',
];

export const ALL_STAMPS: LibraryStamp[] = [
  ...botanical,
  ...celestial,
  ...geometric,
  ...folk,
  ...seasonal,
  ...objects,
  ...borders,
];

// Back-compat aliases for earlier importers.
export const STARTER_STAMPS = ALL_STAMPS;
export const STARTER_COLLECTIONS = COLLECTIONS;
