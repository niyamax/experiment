import './style.css';

import { audio } from './core/audio';
import { loadAssets, type AssetTable } from './core/assets';
import { Input } from './core/input';
import { clamp } from './core/math';
import { HIP_FOV, ZOOM_STOPS, makeView } from './game/camera';
import { Game, type Phase } from './game/game';
import { drawScopeChrome, drawVignette, scopeGeom } from './render/optics';
import { drawRifle } from './render/rifle';
import { Scene } from './render/scene';
import { Hud } from './ui/hud';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const canvas = $<HTMLCanvasElement>('stage');
const ctx = canvas.getContext('2d', { alpha: false })!;
const screenMenu = $<HTMLDivElement>('screen-menu');
const screenOver = $<HTMLDivElement>('screen-over');
const screenPause = $<HTMLDivElement>('screen-pause');

const hud = new Hud();
const scene = new Scene();
const input = new Input(canvas);
let assets: AssetTable = {};

const game = new Game({
  toast: (text, tone) => hud.toast(text, tone),
  phaseChanged: (p) => applyPhase(p),
});

// ── viewport ──────────────────────────────────────────────────────────

let W = 0;
let H = 0;
let dpr = 1;
/** Dropped when frames run long, so weak devices stay smooth. */
let renderScale = 1;

function resize() {
  const base = Math.min(2, window.devicePixelRatio || 1);
  dpr = base * renderScale;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.max(1, Math.round(W * dpr));
  canvas.height = Math.max(1, Math.round(H * dpr));
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // HUD elements that must sit clear of the scope need to know where it ends
  const geom = scopeGeom(W, H);
  document.documentElement.style.setProperty(
    '--scope-bottom',
    `${Math.round(geom.cy + geom.r * 1.16)}px`,
  );
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

// ── phase / screens ───────────────────────────────────────────────────

function applyPhase(p: Phase) {
  screenMenu.classList.toggle('hidden', p !== 'menu');
  screenPause.classList.toggle('hidden', p !== 'paused');
  screenOver.classList.toggle('hidden', p !== 'over');
  hud.setLive(p === 'playing' || p === 'paused');
  input.setEnabled(p === 'playing');

  if (p === 'playing') input.requestLock();
  if (p === 'over') fillSummary();
}

function fillSummary() {
  const s = game.stats();
  $('over-score').textContent = String(s.score);
  $('over-streak').textContent = String(s.bestStreak);
  $('over-acc').textContent = `${s.shots ? Math.round((s.hits / s.shots) * 100) : 0}%`;
  $('over-long').textContent = `${s.longest} m`;
  $('over-wave').textContent = String(s.wave);
  $('over-best').textContent = String(Math.max(game.bestScore(), s.score));
}

function beginRun() {
  audio.unlock();
  game.start();
}

$('btn-play').addEventListener('click', beginRun);
$('btn-again').addEventListener('click', beginRun);
$('btn-restart').addEventListener('click', beginRun);
$('btn-reload').addEventListener('click', () => game.reload());
$('btn-quit').addEventListener('click', () => game.pause());
$('btn-resume').addEventListener('click', () => game.resume());
$('btn-abandon').addEventListener('click', () => game.abandon());
$('btn-zoom').addEventListener('click', () => {
  game.cam.zoomIndex = (game.cam.zoomIndex + 1) % ZOOM_STOPS.length;
  audio.ui();
});

input.onFirstGesture = () => audio.unlock();
input.onLockChange = (locked) => {
  if (!locked && game.phase === 'playing') game.pause();
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});

// ── loop ──────────────────────────────────────────────────────────────

let last = performance.now();
let slowFrames = 0;
let attract = 0;

function frame(now: number) {
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;

  step(dt);
  render();

  // adaptive resolution: three seconds of long frames halves the buffer once
  if (dt > 0.032) slowFrames++;
  else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 90 && renderScale > 0.65) {
    renderScale = 0.7;
    slowFrames = 0;
    resize();
  }

  requestAnimationFrame(frame);
}

function step(dt: number) {
  if (game.phase === 'playing') {
    if (input.drainPause()) game.pause();

    const look = input.drainLook();
    const kb = input.keyboardAim(dt);
    game.cam.look(look.dx + kb.ax, look.dy + kb.ay, 1);

    game.cam.cycleZoom(input.drainZoom());
    if (input.drainReload()) game.reload();
    const shots = input.drainFire();
    for (let i = 0; i < shots; i++) game.fire();

    game.cam.update(dt, input.holdBreath);
  } else {
    if (input.drainPause() && game.phase === 'paused') game.resume();
    if (game.phase === 'menu') {
      // slow attract pan so the range is alive behind the title card
      attract += dt;
      game.cam.yaw = Math.sin(attract * 0.11) * 0.24;
      game.cam.pitch = -0.014 + Math.sin(attract * 0.07) * 0.012;
    }
    game.cam.update(dt, false);
  }

  game.update(dt);
  hud.update(game, dt);
}

// ── render ────────────────────────────────────────────────────────────

function render() {
  const geom = scopeGeom(W, H);
  const [sx, sy] = game.cam.shakeOffset();

  const hipView = makeView(W, H, HIP_FOV, geom.cy / H);
  hipView.cx += sx;
  hipView.cy += sy;

  ctx.clearRect(0, 0, W, H);
  scene.draw(ctx, hipView, {
    cam: game.cam,
    world: game.world,
    targets: game.targets,
    particles: game.particles,
    assets,
    time: performance.now() / 1000,
    foreground: true,
  });
  drawVignette(ctx, W, H);

  drawRifle(ctx, W, H, geom, {
    recoil: game.recoil,
    bolt: boltProgress(),
    reload: reloadProgress(),
    swayX: game.cam.swayYaw * 2600 + sx * 0.6,
    swayY: -game.cam.swayPitch * 2600 + sy * 0.6,
    flash: game.flash,
    time: performance.now() / 1000,
  });

  // magnified pass, clipped to the glass
  const scoped = makeView(W, H, game.cam.fovY, geom.cy / H);
  scoped.cx += sx;
  scoped.cy += sy;

  ctx.save();
  ctx.beginPath();
  ctx.arc(geom.cx, geom.cy, geom.r, 0, Math.PI * 2);
  ctx.clip();
  scene.draw(ctx, scoped, {
    cam: game.cam,
    world: game.world,
    targets: game.targets,
    particles: game.particles,
    assets,
    time: performance.now() / 1000,
    foreground: false,
  });
  ctx.restore();

  drawScopeChrome(ctx, geom, scoped.f, {
    flash: game.flash,
    offsetX: 0,
    offsetY: 0,
    rangeTag: game.aimed ? `${Math.round(game.aimedRange)} m` : null,
    windHold: windHoldFraction(scoped.f, geom.r),
    time: performance.now() / 1000,
  });

  if (game.phase === 'playing' && game.ammo === 0 && game.reloadTimer <= 0) {
    lowAmmoWarning(geom);
  }
}

function boltProgress() {
  if (game.reloadTimer > 0) return 0;
  const BOLT = 0.62;
  if (game.boltTimer <= 0) return 0;
  return clamp(1 - game.boltTimer / BOLT, 0, 1);
}

function reloadProgress() {
  if (game.reloadTimer <= 0) return 0;
  return clamp(1 - game.reloadTimer / 2.1, 0, 1);
}

/** Where the round will actually land, sideways, as a fraction of the post. */
function windHoldFraction(f: number, r: number) {
  if (!game.aimed || game.aimedRange < 1) return 0;
  const metres = game.windHoldMetres();
  const px = (metres / game.aimedRange) * f;
  return clamp(px / (r * 0.42), -1, 1);
}

function lowAmmoWarning(geom: { cx: number; cy: number; r: number }) {
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 120);
  ctx.save();
  ctx.font = `700 ${Math.max(12, geom.r * 0.09)}px Impact, "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(216,72,56,${0.55 + pulse * 0.45})`;
  ctx.fillText('RELOAD', geom.cx, geom.cy + geom.r * 0.62);
  ctx.restore();
}

// ── boot ──────────────────────────────────────────────────────────────

loadAssets().then((table) => {
  assets = table;
});

// Handy from the console for tuning and for the screenshot harness.
(window as unknown as { deadEye: Game }).deadEye = game;

applyPhase('menu');
requestAnimationFrame(frame);
