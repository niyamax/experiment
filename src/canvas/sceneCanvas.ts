// The open, infinite canvas — the Figma-like surface. Owns the camera
// (pan/zoom), draws the paper + impressions, and exposes world<->screen
// transforms. Input handling for specific modes is attached externally.

import { store } from '../core/store';
import type { Impression, Viewport } from '../core/types';

export class SceneCanvas {
  readonly el: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);
  private raf = 0;
  private dirty = true;
  private paperPattern: CanvasPattern | null = null;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('canvas');
    this.el.className = 'scene';
    parent.appendChild(this.el);
    this.ctx = this.el.getContext('2d')!;
    this.makePaper();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    store.subscribe(() => this.invalidate());
    this.loop();
  }

  invalidate() {
    this.dirty = true;
  }

  private resize() {
    const r = this.el.parentElement!.getBoundingClientRect();
    this.el.width = Math.floor(r.width * this.dpr);
    this.el.height = Math.floor(r.height * this.dpr);
    this.el.style.width = r.width + 'px';
    this.el.style.height = r.height + 'px';
    this.dirty = true;
  }

  get width() {
    return this.el.width / this.dpr;
  }
  get height() {
    return this.el.height / this.dpr;
  }

  // ---- transforms ----------------------------------------------------------

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const v = store.get().viewport;
    return { x: v.x + sx / v.zoom, y: v.y + sy / v.zoom };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const v = store.get().viewport;
    return { x: (wx - v.x) * v.zoom, y: (wy - v.y) * v.zoom };
  }

  panBy(dxScreen: number, dyScreen: number) {
    const v = store.get().viewport;
    store.set({ viewport: { ...v, x: v.x - dxScreen / v.zoom, y: v.y - dyScreen / v.zoom } });
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const v = store.get().viewport;
    const zoom = clamp(v.zoom * factor, 0.15, 6);
    // keep the world point under the cursor fixed
    const wx = v.x + sx / v.zoom;
    const wy = v.y + sy / v.zoom;
    const nx = wx - sx / zoom;
    const ny = wy - sy / zoom;
    store.set({ viewport: { x: nx, y: ny, zoom } });
  }

  resetView() {
    store.set({ viewport: { x: -this.width / 2, y: -this.height / 2, zoom: 1 } });
  }

  // ---- rendering -----------------------------------------------------------

  private loop = () => {
    if (this.dirty) {
      this.render();
      this.dirty = false;
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private render() {
    const { ctx } = this;
    const v = store.get().viewport;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    ctx.clearRect(0, 0, this.width, this.height);

    // paper field
    ctx.fillStyle = this.paperPattern ?? '#f4efe6';
    ctx.fillRect(0, 0, this.width, this.height);

    // vignette for warmth
    const g = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      Math.min(this.width, this.height) * 0.2,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.75,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(60,40,20,0.06)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

    // impressions
    ctx.imageSmoothingEnabled = true;
    for (const imp of store.get().impressions) {
      this.drawImpression(ctx, imp, v);
    }
    ctx.restore();
  }

  private drawImpression(ctx: CanvasRenderingContext2D, imp: Impression, v: Viewport) {
    const s = this.worldToScreen(imp.x, imp.y);
    const drawW = imp.w * v.zoom;
    const drawH = imp.h * v.zoom;
    // cull off-screen
    if (
      s.x + drawW < -50 ||
      s.y + drawH < -50 ||
      s.x - drawW > this.width + 50 ||
      s.y - drawH > this.height + 50
    ) {
      return;
    }
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(imp.rotation);
    ctx.globalAlpha = 1;
    ctx.drawImage(imp.raster, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
  }

  private makePaper() {
    const size = 160;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const p = c.getContext('2d')!;
    p.fillStyle = '#f4efe6';
    p.fillRect(0, 0, size, size);
    // subtle fiber speckle
    const img = p.getImageData(0, 0, size, size);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n * 0.9, 0, 255);
    }
    p.putImageData(img, 0, 0);
    this.paperPattern = this.ctx.createPattern(c, 'repeat');
  }
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}
