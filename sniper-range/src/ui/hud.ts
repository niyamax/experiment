import { TAU, clamp } from '../core/math';
import { ZOOM_STOPS, HIP_FOV } from '../game/camera';
import type { Game, Tone } from '../game/game';
import { MAG_SIZE } from '../game/game';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export class Hud {
  private root = $<HTMLDivElement>('hud');
  private timeEl = $<HTMLSpanElement>('hud-time');
  private ammoEl = $<HTMLSpanElement>('hud-ammo');
  private magEl = $<HTMLSpanElement>('hud-mag');
  private scoreEl = $<HTMLDivElement>('hud-score');
  private comboEl = $<HTMLDivElement>('hud-combo');
  private waveEl = $<HTMLElement>('hud-wave');
  private windEl = $<HTMLElement>('hud-wind');
  private zoomEl = $<HTMLElement>('hud-zoom');
  private zoomBtnLabel = $<HTMLElement>('btn-zoom-label');
  private breathEl = $<HTMLElement>('hud-breath');
  private toastEl = $<HTMLDivElement>('toast');
  private radar = $<HTMLCanvasElement>('radar-canvas');
  private radarCtx = this.radar.getContext('2d');

  private pips: HTMLElement[] = [];
  private toastTimer = 0;
  private shownScore = 0;

  constructor() {
    for (let i = 0; i < MAG_SIZE; i++) {
      const b = document.createElement('b');
      this.magEl.appendChild(b);
      this.pips.push(b);
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.radar.width = 124 * dpr;
    this.radar.height = 124 * dpr;
    this.radarCtx?.scale(dpr, dpr);
  }

  setLive(live: boolean) {
    this.root.classList.toggle('live', live);
  }

  toast(text: string, tone: Tone) {
    this.toastEl.textContent = text;
    this.toastEl.className = `toast show ${tone === 'neutral' ? '' : tone}`;
    this.toastTimer = 1.4;
  }

  update(game: Game, dt: number) {
    // time
    const t = Math.ceil(game.timeLeft);
    this.timeEl.innerHTML = `${t}<i>s</i>`;
    this.timeEl.classList.toggle('warn', t <= 10);

    // ammo
    this.ammoEl.innerHTML = `${game.ammo}<i>/${MAG_SIZE}</i>`;
    this.ammoEl.classList.toggle('warn', game.ammo === 0);
    for (let i = 0; i < this.pips.length; i++)
      this.pips[i].classList.toggle('spent', i >= game.ammo);

    // score — rolls up so a big hit reads as a big hit
    this.shownScore += (game.score - this.shownScore) * Math.min(1, dt * 9);
    if (Math.abs(game.score - this.shownScore) < 1) this.shownScore = game.score;
    this.scoreEl.textContent = `Your score: ${Math.round(this.shownScore)}`;

    if (game.combo >= 2) {
      this.comboEl.textContent = `×${(1 + Math.min(game.combo - 1, 12) * 0.14).toFixed(2)} · ${game.combo} straight`;
      this.comboEl.classList.add('on');
    } else {
      this.comboEl.classList.remove('on');
    }

    this.waveEl.textContent = String(game.wave);
    const w = game.world.wind;
    const arrow = w > 0.2 ? '→' : w < -0.2 ? '←' : '·';
    this.windEl.textContent = `${Math.abs(w).toFixed(1)} ${arrow}`;

    const zoomX = HIP_FOV / ZOOM_STOPS[game.cam.zoomIndex];
    const label = `${zoomX.toFixed(zoomX < 10 ? 1 : 0)}×`;
    this.zoomEl.textContent = label;
    this.zoomBtnLabel.textContent = label;

    const breath = clamp(game.cam.breath, 0, 1);
    this.breathEl.style.width = `${breath * 100}%`;
    this.breathEl.classList.toggle('low', breath < 0.3);

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }

    this.drawRadar(game);
  }

  private drawRadar(game: Game) {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const S = 124;
    const c = S / 2;
    ctx.clearRect(0, 0, S, S);

    // sweep cone showing where the scope is pointed
    const yaw = game.cam.aimYaw;
    const half = game.cam.fovY / 2;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(-yaw);
    const cone = ctx.createLinearGradient(0, 0, 0, -c);
    cone.addColorStop(0, 'rgba(180,226,150,0.32)');
    cone.addColorStop(1, 'rgba(180,226,150,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, c - 4, -Math.PI / 2 - Math.max(half, 0.05), -Math.PI / 2 + Math.max(half, 0.05));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // range rings
    ctx.strokeStyle = 'rgba(232,215,180,0.14)';
    ctx.lineWidth = 1;
    for (const f of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(c, c, (c - 5) * f, 0, TAU);
      ctx.stroke();
    }

    const MAX = 170;
    for (const t of game.targets) {
      if (t.dead) continue;
      const d = Math.hypot(t.x, t.z);
      if (d > MAX) continue;
      const ang = Math.atan2(t.x, t.z);
      const rr = (d / MAX) * (c - 6);
      const px = c + Math.sin(ang) * rr;
      const py = c - Math.cos(ang) * rr;
      const size = t.kind === 'hazard' ? 3.4 : t.kind === 'gold' ? 3.6 : 2.6;
      ctx.fillStyle =
        t.kind === 'hazard'
          ? '#4d9bff'
          : t.kind === 'gold'
            ? '#ffd45e'
            : t.kind === 'tnt'
              ? '#ff6a4d'
              : t.kind === 'clay'
                ? '#ff9b3d'
                : '#b9e08a';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, TAU);
      ctx.fill();
    }

    // shooter
    ctx.fillStyle = 'rgba(244,236,220,0.9)';
    ctx.beginPath();
    ctx.arc(c, c, 2.6, 0, TAU);
    ctx.fill();
  }
}
