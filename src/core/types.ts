// Shared types and contracts for STAMP.
// The "block" is a square alpha mask: opaque pixels are RAISED (they print),
// transparent pixels are CARVED AWAY (they leave the paper showing).

export type Mode = 'carve' | 'press' | 'library' | 'pattern';

export type ToolKind = 'carve' | 'restore';

export interface Tool {
  id: string;
  label: string;
  kind: ToolKind;
  /** base radius of the cut, in block pixels */
  size: number;
  /** softness of the cut edge, 0..1 (0 = crisp, 1 = very ragged/soft) */
  rough: number;
}

/** A placed impression on the open canvas, in world coordinates. */
export interface Impression {
  id: string;
  x: number;
  y: number;
  rotation: number; // radians
  scale: number;
  /** pre-rendered impression bitmap (ink + imperfection already baked in) */
  raster: HTMLCanvasElement;
  w: number;
  h: number;
}

/** Camera over the infinite canvas. */
export interface Viewport {
  /** world coordinate shown at the top-left of the viewport */
  x: number;
  y: number;
  zoom: number;
}

export interface InkState {
  color: string;
  /** 0..1 — how much ink is loaded on the block right now */
  level: number;
}

export type TileLayout = 'grid' | 'half-drop' | 'brick' | 'mirror' | 'radial';

/** A library stamp definition: draws a raised motif into a mask context. */
export interface LibraryStamp {
  id: string;
  name: string;
  collection: string;
  /** draws the motif as solid black onto a size×size canvas context */
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}
