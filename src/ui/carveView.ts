// The carving studio: a magnified view of the live block where you drag gouges
// to cut. Opaque = raised (prints), transparent = carved. The checker behind
// makes carved (removed) areas read clearly.

import { store } from '../core/store';
import { studio } from '../engine/studio';
import type { Tool } from '../core/types';
import { playScrape } from './sound';

export const GOUGES: Tool[] = [
  { id: 'v-gouge', label: 'V-gouge', kind: 'carve', size: 12, rough: 0.4 },
  { id: 'u-gouge', label: 'U-gouge', kind: 'carve', size: 22, rough: 0.3 },
  { id: 'liner', label: 'Liner', kind: 'carve', size: 6, rough: 0.5 },
  { id: 'scoop', label: 'Scoop', kind: 'carve', size: 40, rough: 0.25 },
  { id: 'restore', label: 'Patch', kind: 'restore', size: 22, rough: 0.2 },
];

export class CarveView {
  readonly el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private viewSize = 460;
  private drawing = false;
  private lastX = 0;
  private lastY = 0;
  private lastScrape = 0;
  private rev = -1;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'carve-stage';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'carve-canvas';
    this.canvas.width = this.viewSize;
    this.canvas.height = this.viewSize;
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.bind();
    this.tick();
  }

  private bind() {
    const toWorld = (e: PointerEvent) => {
      const r = this.canvas.getBoundingClientRect();
      const bs = studio.block.size;
      return {
        x: ((e.clientX - r.left) / r.width) * bs,
        y: ((e.clientY - r.top) / r.height) * bs,
      };
    };

    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.drawing = true;
      studio.block.snapshot();
      const p = toWorld(e);
      this.lastX = p.x;
      this.lastY = p.y;
      studio.block.dab(p.x, p.y, store.get().tool, pressureOf(e));
      this.rev = -1;
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.drawing) return;
      const p = toWorld(e);
      studio.block.stroke(this.lastX, this.lastY, p.x, p.y, store.get().tool, pressureOf(e));
      this.lastX = p.x;
      this.lastY = p.y;
      this.rev = -1;
      const now = performance.now();
      if (now - this.lastScrape > 55) {
        playScrape(0.8);
        this.lastScrape = now;
      }
    });
    const end = (e: PointerEvent) => {
      this.drawing = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  private tick = () => {
    if (studio.block.rev !== this.rev) {
      this.paint();
      this.rev = studio.block.rev;
    }
    requestAnimationFrame(this.tick);
  };

  private paint() {
    const ctx = this.ctx;
    const n = this.viewSize;
    ctx.clearRect(0, 0, n, n);
    // carved ground (paper) behind
    ctx.fillStyle = '#efe7d8';
    ctx.fillRect(0, 0, n, n);
    // the raised areas shown in the current ink color
    const tint = document.createElement('canvas');
    tint.width = tint.height = n;
    const tctx = tint.getContext('2d')!;
    tctx.drawImage(studio.block.canvas, 0, 0, n, n);
    tctx.globalCompositeOperation = 'source-in';
    tctx.fillStyle = store.get().ink.color;
    tctx.fillRect(0, 0, n, n);
    ctx.drawImage(tint, 0, 0);
  }

  refreshInk() {
    this.rev = -1;
  }
}

function pressureOf(e: PointerEvent): number {
  return e.pressure && e.pressure > 0 ? 0.4 + e.pressure : 1;
}
