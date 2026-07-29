import { audio } from '../core/audio';
import { clamp, mulberry32 } from '../core/math';
import { Camera, EYE_HEIGHT } from './camera';
import { Shot, driftAt } from './ballistics';
import { Particles } from './particles';
import { HAZARD_PENALTY, TNT_RADIUS, Target, type Motion, type TargetKind } from './targets';
import { BENCH_TOP, World } from './world';

export type Phase = 'menu' | 'playing' | 'paused' | 'over';
export type Tone = 'good' | 'bad' | 'neutral';

export interface Hooks {
  toast(text: string, tone: Tone): void;
  phaseChanged(phase: Phase): void;
}

export const BOLT_TIME = 0.62;
export const RELOAD_TIME = 2.1;
export const MAG_SIZE = 5;
const START_TIME = 45;
const WAVE_BONUS = 12;
const HIT_BONUS = 0.6;
/** Angular forgiveness on hits, in radians — keeps touch aiming fair. */
const AIM_ASSIST = 0.0009;

export interface RunStats {
  score: number;
  bestStreak: number;
  shots: number;
  hits: number;
  longest: number;
  wave: number;
}

export class Game {
  phase: Phase = 'menu';
  world = new World();
  cam = new Camera();
  particles = new Particles();
  targets: Target[] = [];
  shots: Shot[] = [];

  score = 0;
  combo = 0;
  bestStreak = 0;
  shotsFired = 0;
  hits = 0;
  longest = 0;
  wave = 1;
  timeLeft = START_TIME;

  ammo = MAG_SIZE;
  boltTimer = 0;
  reloadTimer = 0;
  /** 0..1 recoil envelope for the rifle art. */
  recoil = 0;
  flash = 0;

  /** Target currently under the reticle, if any. */
  aimed: Target | null = null;
  aimedRange = 0;

  private killsThisWave = 0;
  private quota = 8;
  private rnd = mulberry32(1337);
  private slots = new Set<string>();
  private clayTimer = 6;
  private time = 0;

  constructor(private hooks: Hooks) {}

  // ── lifecycle ───────────────────────────────────────────────────────

  start() {
    this.world = new World((Math.random() * 1e9) | 0);
    this.rnd = mulberry32((Math.random() * 1e9) | 0);
    this.targets.length = 0;
    this.shots.length = 0;
    this.particles.clear();
    this.slots.clear();

    this.score = 0;
    this.combo = 0;
    this.bestStreak = 0;
    this.shotsFired = 0;
    this.hits = 0;
    this.longest = 0;
    this.wave = 1;
    this.quota = 8;
    this.killsThisWave = 0;
    this.timeLeft = START_TIME;
    this.ammo = MAG_SIZE;
    this.boltTimer = 0;
    this.reloadTimer = 0;
    this.recoil = 0;
    this.clayTimer = 5;
    this.cam.reset();
    this.rollWind();

    this.setPhase('playing');
    this.fillField();
    this.hooks.toast('Range hot', 'good');
  }

  private setPhase(p: Phase) {
    if (this.phase === p) return;
    this.phase = p;
    this.hooks.phaseChanged(p);
  }

  pause() {
    if (this.phase === 'playing') this.setPhase('paused');
  }

  resume() {
    if (this.phase === 'paused') this.setPhase('playing');
  }

  abandon() {
    this.setPhase('menu');
  }

  stats(): RunStats {
    return {
      score: Math.round(this.score),
      bestStreak: this.bestStreak,
      shots: this.shotsFired,
      hits: this.hits,
      longest: this.longest,
      wave: this.wave,
    };
  }

  private rollWind() {
    const w = (this.rnd() * 2 - 1) * (2 + this.wave * 0.9);
    this.world.wind = clamp(w, -9, 9);
    audio.setWindStrength(this.world.wind);
  }

  // ── spawning ────────────────────────────────────────────────────────

  private get activeMax() {
    return Math.min(4 + Math.floor(this.wave * 0.8), 9);
  }

  private fillField() {
    let guard = 40;
    while (this.countScoring() < this.activeMax && guard-- > 0) this.spawnOne();
    if (this.wave >= 2) {
      const hazards = this.targets.filter((t) => t.kind === 'hazard' && !t.dead).length;
      for (let i = hazards; i < Math.min(2, this.wave - 1); i++) this.spawnHazard();
    }
  }

  private countScoring() {
    let n = 0;
    for (const t of this.targets) if (!t.dead && t.kind !== 'hazard') n++;
    return n;
  }

  private pickSlot(): { x: number; z: number; key: string } | null {
    const benches = this.world.benches;
    for (let attempt = 0; attempt < 24; attempt++) {
      const bi = (this.rnd() * benches.length) | 0;
      const b = benches[bi];
      const si = (this.rnd() * b.slots.length) | 0;
      const key = `${bi}:${si}`;
      if (this.slots.has(key)) continue;
      this.slots.add(key);
      return { x: b.x + b.slots[si], z: b.z, key };
    }
    return null;
  }

  private spawnOne() {
    const slot = this.pickSlot();
    if (!slot) return;

    const r = this.rnd();
    const w = this.wave;
    let kind: TargetKind = 'bottle';
    if (r < 0.06 + w * 0.012) kind = 'gold';
    else if (r < 0.14 + w * 0.02) kind = 'tnt';
    else if (r < 0.42) kind = 'can';

    const moves = this.rnd() < clamp(0.12 + w * 0.06, 0, 0.55);
    const motion: Motion = moves ? 'slide' : 'static';

    const t = new Target(kind, motion, slot.x, BENCH_TOP + 0.1, slot.z);
    (t as Target & { slotKey?: string }).slotKey = slot.key;
    if (moves) {
      t.amp = 0.5 + this.rnd() * 0.5;
      t.vx = (this.rnd() < 0.5 ? -1 : 1) * (0.35 + this.rnd() * 0.5 + w * 0.04);
    }
    this.targets.push(t);
  }

  private spawnHazard() {
    const benches = this.world.benches;
    const b = benches[(this.rnd() * benches.length) | 0];
    const side = this.rnd() < 0.5 ? -1 : 1;
    const t = new Target('hazard', 'static', b.x + side * (b.half + 0.9), 0, b.z + 0.6);
    this.targets.push(t);
  }

  private launchClay() {
    const side = this.rnd() < 0.5 ? -1 : 1;
    const z = 34 + this.rnd() * 30;
    const t = new Target('clay', 'fly', side * (z * 0.35), 0.9, z);
    t.vx = -side * (5 + this.rnd() * 4);
    t.vy = 5.5 + this.rnd() * 2.5;
    t.vz = (this.rnd() - 0.5) * 3;
    this.targets.push(t);
    audio.chime(0);
  }

  private releaseSlot(t: Target) {
    const key = (t as Target & { slotKey?: string }).slotKey;
    if (key) this.slots.delete(key);
  }

  // ── input actions ───────────────────────────────────────────────────

  canFire() {
    return (
      this.phase === 'playing' &&
      this.ammo > 0 &&
      this.boltTimer <= 0 &&
      this.reloadTimer <= 0
    );
  }

  fire() {
    if (this.phase !== 'playing') return;
    if (this.reloadTimer > 0) return;
    if (this.ammo <= 0) {
      audio.dryFire();
      this.reload();
      return;
    }
    if (this.boltTimer > 0) return;

    this.ammo--;
    this.shotsFired++;
    this.boltTimer = BOLT_TIME;
    this.recoil = 1;
    this.flash = 1;
    this.cam.fire();
    audio.shot();
    audio.boltCycle();

    const dir = this.cam.forward();
    const origin: [number, number, number] = [0, EYE_HEIGHT - 0.04, 0.35];
    this.shots.push(new Shot(origin, dir, this.world.wind));
  }

  reload() {
    if (this.phase !== 'playing') return;
    if (this.reloadTimer > 0 || this.ammo === MAG_SIZE) return;
    this.reloadTimer = RELOAD_TIME;
    audio.reload();
  }

  // ── simulation ──────────────────────────────────────────────────────

  update(dt: number) {
    if (this.phase !== 'playing') {
      this.particles.update(dt, this.world.wind);
      return;
    }
    this.time += dt;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.endRun();
      return;
    }

    this.boltTimer = Math.max(0, this.boltTimer - dt);
    this.recoil = Math.max(0, this.recoil - dt * 3.4);
    this.flash = Math.max(0, this.flash - dt * 12);

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.ammo = MAG_SIZE;
        this.boltTimer = 0;
      }
    }

    for (const t of this.targets) if (!t.dead) t.update(dt);

    this.clayTimer -= dt;
    if (this.clayTimer <= 0 && this.wave >= 2) {
      this.clayTimer = 7 + this.rnd() * 6 - this.wave * 0.3;
      this.launchClay();
    }

    this.stepShots(dt);
    this.particles.update(dt, this.world.wind);
    this.sweepDead();
    this.fillField();
    this.updateAimed();
  }

  private stepShots(dt: number) {
    const SUB = 6;
    const h = dt / SUB;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      for (let k = 0; k < SUB && s.alive; k++) {
        s.step(h);
        this.testShot(s);
      }
      if (!s.alive || s.t > 2 || s.z > 320) this.shots.splice(i, 1);
    }
  }

  private testShot(s: Shot) {
    // ground first — a round that digs in cannot travel further
    if (s.y <= 0 && s.py > 0) {
      const u = s.py / (s.py - s.y);
      const [hx, , hz] = s.at(u);
      this.particles.dustPuff(hx, 0.02, hz, 1);
      audio.dirt(Math.hypot(hx, hz));
      if (Math.random() < 0.35) audio.ricochet(Math.hypot(hx, hz));
      s.alive = false;
      this.breakCombo();
      return;
    }

    for (const t of this.targets) {
      if (t.dead) continue;
      const u = s.crossesZ(t.z);
      if (u < 0) continue;
      const [px, py] = s.at(u);
      const assist = t.range(EYE_HEIGHT) * AIM_ASSIST;
      const zone = t.hitZone(px, py, assist);
      if (!zone) continue;
      s.alive = false;
      this.resolveHit(t, zone, s.travel);
      return;
    }
  }

  private resolveHit(t: Target, zone: 'neck' | 'body', travel: number) {
    const range = t.range(EYE_HEIGHT);

    if (t.kind === 'hazard') {
      t.dead = true;
      this.score = Math.max(0, this.score + HAZARD_PENALTY);
      this.breakCombo();
      this.cam.shake(0.8);
      this.particles.fireball(t.x, t.centerY, t.z);
      audio.explode(range);
      this.hooks.toast('Hazard! −250', 'bad');
      this.particles.scorePop(t.x, t.y + t.h, t.z, '−250', [220, 80, 64]);
      return;
    }

    this.hits++;
    this.combo++;
    this.bestStreak = Math.max(this.bestStreak, this.combo);
    this.longest = Math.max(this.longest, Math.round(range));
    this.timeLeft = Math.min(this.timeLeft + HIT_BONUS, 99);
    void travel;

    const mult = this.comboMult();
    const distMult = 1 + range / 80;
    const zoneMult = zone === 'neck' ? 1.6 : 1;
    const gained = Math.round(t.points * distMult * mult * zoneMult);
    this.score += gained;

    this.destroy(t, gained, zone === 'neck');
    this.killsThisWave++;
    if (this.killsThisWave >= this.quota) this.nextWave();
  }

  private comboMult() {
    return 1 + Math.min(this.combo - 1, 12) * 0.14;
  }

  private destroy(t: Target, gained: number, neck: boolean, chained = false) {
    if (t.dead) return;
    t.dead = true;
    this.releaseSlot(t);
    const range = t.range(EYE_HEIGHT);
    const cy = t.centerY;

    switch (t.kind) {
      case 'bottle':
        this.particles.glassBurst(t.x, cy, t.z, [150, 190, 130]);
        audio.glass(range);
        break;
      case 'gold':
        this.particles.glassBurst(t.x, cy, t.z, [246, 206, 110], 34);
        this.particles.sparks(t.x, cy, t.z, 18);
        audio.glass(range);
        audio.chime(2);
        break;
      case 'can':
        this.particles.sparks(t.x, cy, t.z, 10);
        this.particles.dustPuff(t.x, cy, t.z, 0.4);
        audio.metal(range);
        break;
      case 'clay':
        this.particles.glassBurst(t.x, cy, t.z, [232, 128, 46], 22);
        audio.clayBreak(range);
        break;
      case 'tnt':
        this.particles.fireball(t.x, cy, t.z);
        this.cam.shake(0.5);
        audio.explode(range);
        this.chain(t);
        break;
      default:
        break;
    }

    const tint: [number, number, number] = neck
      ? [255, 224, 140]
      : chained
        ? [255, 172, 96]
        : [240, 232, 210];
    const label = `${neck ? 'NECK ' : ''}+${gained}`;
    this.particles.scorePop(t.x, t.y + t.h * 1.1, t.z, label, tint);

    if (neck) this.hooks.toast('Neck shot', 'good');
    else if (this.combo > 0 && this.combo % 5 === 0)
      this.hooks.toast(`${this.combo} straight`, 'good');
  }

  /** TNT clears everything nearby, including other sticks. */
  private chain(source: Target) {
    for (const o of this.targets) {
      if (o.dead || o === source) continue;
      const d = Math.hypot(o.x - source.x, o.centerY - source.centerY, o.z - source.z);
      if (d > TNT_RADIUS) continue;
      if (o.kind === 'hazard') {
        this.score = Math.max(0, this.score + HAZARD_PENALTY);
        o.dead = true;
        this.particles.fireball(o.x, o.centerY, o.z);
        this.hooks.toast('Hazard! −250', 'bad');
        continue;
      }
      const gained = Math.round(o.points * 0.6 * this.comboMult());
      this.score += gained;
      this.killsThisWave++;
      this.destroy(o, gained, false, true);
    }
  }

  private breakCombo() {
    if (this.combo >= 5) this.hooks.toast('Streak lost', 'bad');
    this.combo = 0;
  }

  private nextWave() {
    this.wave++;
    this.killsThisWave = 0;
    this.quota = 8 + this.wave * 2;
    this.timeLeft = Math.min(this.timeLeft + WAVE_BONUS, 99);
    this.rollWind();
    audio.chime(3);
    this.hooks.toast(`Wave ${this.wave} · +${WAVE_BONUS}s`, 'good');
  }

  private sweepDead() {
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      if (!t.dead) continue;
      this.releaseSlot(t);
      this.targets.splice(i, 1);
    }
  }

  private updateAimed() {
    const [fx, fy, fz] = this.cam.forward();
    let best: Target | null = null;
    let bestAng = this.cam.fovY * 0.5;
    for (const t of this.targets) {
      if (t.dead) continue;
      const dx = t.x;
      const dy = t.centerY - EYE_HEIGHT;
      const dz = t.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      const dot = (dx * fx + dy * fy + dz * fz) / len;
      const ang = Math.acos(clamp(dot, -1, 1));
      if (ang < bestAng) {
        bestAng = ang;
        best = t;
      }
    }
    this.aimed = best;
    this.aimedRange = best ? best.range(EYE_HEIGHT) : 0;
  }

  /** Lateral hold-off, in metres, for the currently ranged target. */
  windHoldMetres() {
    if (!this.aimed) return 0;
    return driftAt(this.aimedRange, this.world.wind);
  }

  private endRun() {
    this.setPhase('over');
    audio.buzzer();
    const best = Number(localStorage.getItem('deadeye.best') ?? 0);
    if (this.score > best) localStorage.setItem('deadeye.best', String(Math.round(this.score)));
  }

  bestScore() {
    return Number(localStorage.getItem('deadeye.best') ?? 0);
  }
}
