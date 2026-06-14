// The carving block. A square offscreen canvas used as an alpha mask:
//   opaque (black) pixels = RAISED -> they print
//   transparent pixels   = CARVED -> they leave paper showing
//
// Tools paint into this mask. Carving erases (destination-out); restoring
// paints back. Library stamps replace the whole mask with a motif.

import type { LibraryStamp, Tool } from '../core/types';

export class Block {
  readonly size: number;
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private history: ImageData[] = [];
  private historyLimit = 24;
  private version = 0;

  constructor(size: number) {
    this.size = size;
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.fillRaised();
  }

  /** current revision counter, so views can detect changes cheaply */
  get rev(): number {
    return this.version;
  }

  private touched() {
    this.version++;
  }

  /** Reset the block to a fully raised (solid) surface. */
  fillRaised(): void {
    this.snapshot();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.size, this.size);
    this.touched();
  }

  /** Carve away everything (blank block). */
  clear(): void {
    this.snapshot();
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.touched();
  }

  /** Replace the mask with a library motif (raised motif on a carved ground). */
  loadStamp(stamp: LibraryStamp): void {
    this.snapshot();
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.save();
    this.ctx.fillStyle = '#000';
    stamp.draw(this.ctx, this.size);
    this.ctx.restore();
    this.touched();
  }

  /**
   * Apply a tool stamp at a point. `pressure` 0..1 scales the radius.
   * Carving uses destination-out (erases the mask); restore paints back.
   */
  dab(x: number, y: number, tool: Tool, pressure = 1): void {
    const r = Math.max(1, tool.size * (0.55 + 0.65 * pressure));
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = tool.kind === 'carve' ? 'destination-out' : 'source-over';

    // a soft, slightly irregular round nib
    const grd = ctx.createRadialGradient(x, y, r * (1 - tool.rough), x, y, r);
    const inner = tool.kind === 'carve' ? 'rgba(0,0,0,1)' : 'rgba(0,0,0,1)';
    const outer = 'rgba(0,0,0,0)';
    grd.addColorStop(0, inner);
    grd.addColorStop(1, outer);
    ctx.fillStyle = tool.kind === 'carve' ? grd : '#000';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    this.touched();
  }

  /** Stroke a line of dabs between two points for smooth carving. */
  stroke(x0: number, y0: number, x1: number, y1: number, tool: Tool, pressure = 1): void {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(1, tool.size * 0.22);
    const n = Math.max(1, Math.round(dist / step));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.dab(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, tool, pressure);
    }
  }

  // ---- history -------------------------------------------------------------

  /** Take an undo snapshot. Call before a discrete edit (or stroke start). */
  snapshot(): void {
    try {
      const data = this.ctx.getImageData(0, 0, this.size, this.size);
      this.history.push(data);
      if (this.history.length > this.historyLimit) this.history.shift();
    } catch {
      /* ignore (e.g. tainted canvas) */
    }
  }

  undo(): void {
    const prev = this.history.pop();
    if (!prev) return;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.putImageData(prev, 0, 0);
    this.touched();
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  /** Is the block essentially blank (nothing would print)? */
  isBlank(): boolean {
    const { data } = this.ctx.getImageData(0, 0, this.size, this.size);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 8) return false;
    }
    return true;
  }
}
