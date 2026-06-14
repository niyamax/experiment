// Pointer + keyboard control for the open canvas. Handles panning (space-drag,
// middle/right drag), wheel zoom, and — in press mode — placing impressions.
// Carve-mode interaction lives in the carve view; this just owns the surface.

import { store } from '../core/store';
import { studio } from '../engine/studio';
import { playPress } from '../ui/sound';
import type { SceneCanvas } from './sceneCanvas';

export function attachController(scene: SceneCanvas) {
  const el = scene.el;
  let spaceDown = false;
  let panning = false;
  let lastX = 0;
  let lastY = 0;
  let pressing = false;
  let lastPressX = 0;
  let lastPressY = 0;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isTyping(e)) {
      spaceDown = true;
      el.style.cursor = 'grab';
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      spaceDown = false;
      el.style.cursor = '';
    }
  });

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const usePan = spaceDown || e.button === 1 || e.button === 2;
    if (usePan) {
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.style.cursor = 'grabbing';
      return;
    }
    if (store.get().mode === 'press' && e.button === 0) {
      pressing = true;
      const r = el.getBoundingClientRect();
      const w = scene.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      const size = store.get().pressSize;
      const placed = studio.pressAt(w.x, w.y, size);
      if (placed) playPress();
      lastPressX = w.x;
      lastPressY = w.y;
    }
  });

  const updatePreview = (e: PointerEvent) => {
    if (store.get().mode !== 'press' || spaceDown || panning) {
      scene.setPreview(null);
      return;
    }
    const r = el.getBoundingClientRect();
    const w = scene.screenToWorld(e.clientX - r.left, e.clientY - r.top);
    const size = store.get().pressSize;
    const raster = studio.previewImpression(size);
    if (!raster) {
      scene.setPreview(null);
      return;
    }
    scene.setPreview({ x: w.x, y: w.y, w: size, h: size, raster });
  };

  el.addEventListener('pointermove', (e) => {
    if (panning) {
      scene.panBy(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      return;
    }
    if (pressing && store.get().mode === 'press') {
      // drag to repeat-stamp along a path, spaced out
      const r = el.getBoundingClientRect();
      const w = scene.screenToWorld(e.clientX - r.left, e.clientY - r.top);
      const size = store.get().pressSize;
      const dist = Math.hypot(w.x - lastPressX, w.y - lastPressY);
      if (dist > size * 0.9) {
        const placed = studio.pressAt(w.x, w.y, size);
        if (placed) playPress(0.4);
        lastPressX = w.x;
        lastPressY = w.y;
      }
    }
    updatePreview(e);
  });

  el.addEventListener('pointerleave', () => scene.setPreview(null));

  const endPointer = (e: PointerEvent) => {
    if (panning) {
      panning = false;
      el.style.cursor = spaceDown ? 'grab' : '';
    }
    pressing = false;
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };
  el.addEventListener('pointerup', endPointer);
  el.addEventListener('pointercancel', endPointer);
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  // hide the ghost whenever we leave press mode
  store.subscribe(() => {
    if (store.get().mode !== 'press') scene.setPreview(null);
  });

  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const sx = e.clientX - r.left;
      const sy = e.clientY - r.top;
      if (e.ctrlKey) {
        // pinch-zoom (trackpad)
        scene.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.01));
      } else if (e.shiftKey) {
        scene.panBy(-e.deltaY, 0);
      } else {
        // plain wheel = zoom for a canvas-first feel
        scene.zoomAt(sx, sy, Math.exp(-e.deltaY * 0.0015));
      }
    },
    { passive: false },
  );
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
