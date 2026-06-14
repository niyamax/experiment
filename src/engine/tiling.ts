// Seamless tiling: lays the current block down as a clean, regular repeat
// across the visible canvas region. This is STAMP's signature "one motif ->
// flawless seamless repeat" feature.
//
// All layouts produce impressions via studio.makeImpression and push them into
// the store in one update. Unlike free Press mode, Pattern mode aims to look
// CLEAN/regular: jitter defaults to near-zero.

import { store } from '../core/store';
import type { Impression, TileLayout } from '../core/types';
import { studio } from './studio';

export interface FillOptions {
  /** centre-to-centre spacing of lattice points, in world units */
  spacing: number;
  /** stamp size in world units */
  tileSize: number;
  /** small position wobble, in world units (default ~0 — keep it regular) */
  jitter?: number;
}

interface WorldRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Visible world rectangle, replicating sceneCanvas.screenToWorld:
 *   worldX = viewport.x + screenX / zoom
 * A margin (in world units) extends the rect so the fill covers past the edges.
 */
function visibleWorldRect(margin: number): WorldRect {
  const v = store.get().viewport;
  const scene = document.querySelector<HTMLElement>('.scene');
  // fall back to a sane default size if the scene isn't mounted yet
  const w = scene ? scene.getBoundingClientRect().width : 1200;
  const h = scene ? scene.getBoundingClientRect().height : 800;
  const minX = v.x - margin;
  const minY = v.y - margin;
  const maxX = v.x + w / v.zoom + margin;
  const maxY = v.y + h / v.zoom + margin;
  return { minX, minY, maxX, maxY };
}

function jitterAmt(j: number | undefined): number {
  if (!j) return 0;
  return (Math.random() - 0.5) * 2 * j;
}

/**
 * Horizontally + vertically flip a raster into a fresh offscreen canvas. We
 * bake the flip into the bitmap because Impression has no flip flags (and we
 * must not change the type or sceneCanvas).
 */
function flipRaster(src: HTMLCanvasElement, flipX: boolean, flipY: boolean): HTMLCanvasElement {
  if (!flipX && !flipY) return src;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height;
  const ctx = out.getContext('2d')!;
  ctx.translate(flipX ? src.width : 0, flipY ? src.height : 0);
  ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  ctx.drawImage(src, 0, 0);
  return out;
}

/**
 * Generate the impressions for a layout, then push them all in one store
 * update (appends to any existing impressions).
 */
export function fillVisibleRegion(layout: TileLayout, opts: FillOptions): Impression[] {
  if (studio.block.isBlank()) return [];
  const spacing = Math.max(8, opts.spacing);
  const tileSize = Math.max(8, opts.tileSize);
  const jitter = opts.jitter ?? 0;
  const margin = tileSize;
  const rect = visibleWorldRect(margin);

  const out: Impression[] = [];

  const place = (
    x: number,
    y: number,
    flipX = false,
    flipY = false,
    rotation: number | null = null,
  ) => {
    const imp = studio.makeImpression(
      x + jitterAmt(jitter),
      y + jitterAmt(jitter),
      tileSize,
    );
    if (!imp) return;
    if (flipX || flipY) imp.raster = flipRaster(imp.raster, flipX, flipY);
    if (rotation !== null) imp.rotation = rotation;
    out.push(imp);
  };

  if (layout === 'radial') {
    fillRadial(rect, spacing, place);
  } else {
    fillLattice(layout, rect, spacing, place);
  }

  if (out.length) {
    store.update((s) => {
      for (const imp of out) s.impressions.push(imp);
    });
  }
  return out;
}

type PlaceFn = (
  x: number,
  y: number,
  flipX?: boolean,
  flipY?: boolean,
  rotation?: number | null,
) => void;

function fillLattice(
  layout: TileLayout,
  rect: WorldRect,
  spacing: number,
  place: PlaceFn,
) {
  const half = spacing / 2;
  // column / row indices spanning the rect (with one extra ring of slack)
  const c0 = Math.floor(rect.minX / spacing) - 1;
  const c1 = Math.ceil(rect.maxX / spacing) + 1;
  const r0 = Math.floor(rect.minY / spacing) - 1;
  const r1 = Math.ceil(rect.maxY / spacing) + 1;

  for (let c = c0; c <= c1; c++) {
    for (let r = r0; r <= r1; r++) {
      let x = c * spacing;
      let y = r * spacing;

      // half-drop: every other COLUMN offset vertically by half a tile
      if (layout === 'half-drop' && (c & 1) !== 0) y += half;
      // brick: every other ROW offset horizontally by half a tile
      if (layout === 'brick' && (r & 1) !== 0) x += half;

      // mirror: checkerboard of horizontally/vertically flipped copies
      let flipX = false;
      let flipY = false;
      if (layout === 'mirror') {
        flipX = (c & 1) !== 0;
        flipY = (r & 1) !== 0;
      }

      place(x, y, flipX, flipY, null);
    }
  }
}

/**
 * Radial: concentric rings around the view centre, each copy rotated to face
 * outward. Ring spacing = `spacing`; the count per ring scales with radius so
 * the density stays roughly even.
 */
function fillRadial(rect: WorldRect, spacing: number, place: PlaceFn) {
  const cx = (rect.minX + rect.maxX) / 2;
  const cy = (rect.minY + rect.maxY) / 2;
  const maxR = Math.hypot(rect.maxX - cx, rect.maxY - cy);

  // centre stamp
  place(cx, cy, false, false, 0);

  for (let radius = spacing; radius <= maxR; radius += spacing) {
    const circ = 2 * Math.PI * radius;
    const count = Math.max(4, Math.round(circ / spacing));
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const x = cx + Math.cos(ang) * radius;
      const y = cy + Math.sin(ang) * radius;
      // rotate to face outward (raster's "up" points away from centre)
      place(x, y, false, false, ang + Math.PI / 2);
    }
  }
}

/**
 * Render ONE wrap-around seamless tile of the current motif, suitable for
 * export as a repeating texture. The motif is drawn plus its edge-wrapped
 * copies (offset by ±tileSize in x/y) and clipped to the tile, so the pattern
 * is genuinely seamless for grid / half-drop / brick.
 *
 * Returns a transparent-background tile canvas. Mirror/radial fall back to the
 * grid wrap (they are layouts of the open canvas, not single repeat units).
 */
export function renderSeamlessTile(tileSize: number, layout: TileLayout): HTMLCanvasElement {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.max(64, Math.round(tileSize * dpr));
  const tile = document.createElement('canvas');
  tile.width = px;
  tile.height = px;
  const ctx = tile.getContext('2d')!;

  // a single clean impression of the motif at full ink (no wobble for tiling)
  const motif = studio.makeImpression(0, 0, tileSize);
  if (!motif) return tile;
  motif.rotation = 0;

  // motif placement(s) within the tile, in tile-fraction coordinates.
  // each entry is the centre of one copy of the motif.
  const centres: { fx: number; fy: number; flipX: boolean; flipY: boolean }[] = [];
  if (layout === 'half-drop') {
    // two columns: second column dropped by half
    centres.push({ fx: 0.25, fy: 0.25, flipX: false, flipY: false });
    centres.push({ fx: 0.75, fy: 0.75, flipX: false, flipY: false });
  } else if (layout === 'brick') {
    // two rows: second row shifted by half
    centres.push({ fx: 0.25, fy: 0.25, flipX: false, flipY: false });
    centres.push({ fx: 0.75, fy: 0.75, flipX: false, flipY: false });
  } else if (layout === 'mirror') {
    centres.push({ fx: 0.25, fy: 0.25, flipX: false, flipY: false });
    centres.push({ fx: 0.75, fy: 0.25, flipX: true, flipY: false });
    centres.push({ fx: 0.25, fy: 0.75, flipX: false, flipY: true });
    centres.push({ fx: 0.75, fy: 0.75, flipX: true, flipY: true });
  } else {
    // grid (and radial fallback): single centred motif filling the tile
    centres.push({ fx: 0.5, fy: 0.5, flipX: false, flipY: false });
  }

  // size of each motif copy within the tile
  const copyScale = layout === 'grid' || layout === 'radial' ? 1 : 0.5;
  const copyPx = px * copyScale;

  // draw each copy plus its 8-neighbour wraps, clipped to the tile.
  for (const c of centres) {
    const raster = flipRaster(motif.raster, c.flipX, c.flipY);
    const baseX = c.fx * px;
    const baseY = c.fy * px;
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const x = baseX + ox * px;
        const y = baseY + oy * px;
        ctx.drawImage(raster, x - copyPx / 2, y - copyPx / 2, copyPx, copyPx);
      }
    }
  }

  return tile;
}
