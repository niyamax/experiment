// Export the open canvas (all impressions over paper) to a PNG download.
// Computes a tight bounding box around placed impressions with a margin.

import { store } from '../core/store';

export function exportCanvasPNG(filename = 'stamp-print.png') {
  const imps = store.get().impressions;
  if (imps.length === 0) return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const i of imps) {
    const half = Math.max(i.w, i.h) / 2;
    minX = Math.min(minX, i.x - half);
    minY = Math.min(minY, i.y - half);
    maxX = Math.max(maxX, i.x + half);
    maxY = Math.max(maxY, i.y + half);
  }
  const margin = 60;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  const w = Math.max(1, Math.round(maxX - minX));
  const h = Math.max(1, Math.round(maxY - minY));
  const out = document.createElement('canvas');
  const scale = Math.min(2, 2400 / Math.max(w, h));
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  const ctx = out.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(0, 0, w, h);

  for (const i of imps) {
    ctx.save();
    ctx.translate(i.x - minX, i.y - minY);
    ctx.rotate(i.rotation);
    ctx.drawImage(i.raster, -i.w / 2, -i.h / 2, i.w, i.h);
    ctx.restore();
  }

  downloadCanvasPNG(out, filename);
}

/** Download any canvas as a PNG file. */
export function downloadCanvasPNG(canvas: HTMLCanvasElement, filename = 'stamp.png') {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
