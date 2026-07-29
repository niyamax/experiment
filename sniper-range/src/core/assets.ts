/**
 * Optional art. The game is fully playable with nothing in `public/assets/` —
 * every slot has a procedural fallback. Drop a matching PNG in and the renderer
 * uses it on the next load. See ASSETS.md for dimensions and prompts.
 *
 * Only slots the renderer actually consumes are listed here; the rifle, hands
 * and scope stay vector because their parts animate independently.
 */
export const ASSET_SLOTS = {
  /** 180° desert panorama, bottom edge on the horizon. */
  skyline: 'art/skyline.png',
  /** Shooting bench, front elevation, standing on its own base. */
  bench: 'art/bench.png',
  bottle: 'art/bottle.png',
  bottleGold: 'art/bottle-gold.png',
  can: 'art/can.png',
  clay: 'art/clay.png',
  tnt: 'art/tnt.png',
  barrel: 'art/barrel.png',
  /** Foreground rail the shooter is braced on, spanning the frame. */
  rail: 'art/rail.png',
} as const;

export type AssetKey = keyof typeof ASSET_SLOTS;

export type AssetTable = Partial<Record<AssetKey, HTMLImageElement>>;

function tryLoad(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadAssets(): Promise<AssetTable> {
  const keys = Object.keys(ASSET_SLOTS) as AssetKey[];
  const imgs = await Promise.all(keys.map((k) => tryLoad(ASSET_SLOTS[k])));
  const table: AssetTable = {};
  keys.forEach((k, i) => {
    const img = imgs[i];
    if (img) table[k] = img;
  });
  return table;
}
