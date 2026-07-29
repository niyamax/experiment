import { TAU, clamp } from '../core/math';

export type ParticleKind = 'shard' | 'dust' | 'smoke' | 'spark' | 'ring' | 'text' | 'ember';

export interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  rot: number;
  vrot: number;
  r: number;
  g: number;
  b: number;
  a: number;
  grav: number;
  drag: number;
  bounce: boolean;
  text?: string;
}

const MAX = 900;

export class Particles {
  list: Particle[] = [];

  clear() {
    this.list.length = 0;
  }

  private push(p: Particle) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push(p);
  }

  update(dt: number, wind: number) {
    const list = this.list;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      p.vy -= p.grav * dt;
      p.vx += wind * 0.06 * dt * (p.kind === 'smoke' || p.kind === 'dust' ? 6 : 1);
      const d = Math.exp(-p.drag * dt);
      p.vx *= d;
      p.vy *= d;
      p.vz *= d;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.vrot * dt;
      if (p.bounce && p.y < 0.02) {
        p.y = 0.02;
        p.vy = Math.abs(p.vy) * 0.34;
        p.vx *= 0.6;
        p.vz *= 0.6;
        p.vrot *= 0.5;
        if (Math.abs(p.vy) < 0.35) p.bounce = false;
      }
    }
  }

  private base(kind: ParticleKind, x: number, y: number, z: number): Particle {
    return {
      kind,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 1,
      maxLife: 1,
      size: 0.03,
      rot: 0,
      vrot: 0,
      r: 220,
      g: 220,
      b: 220,
      a: 1,
      grav: 9.81,
      drag: 0.2,
      bounce: false,
    };
  }

  glassBurst(x: number, y: number, z: number, tint: [number, number, number], count = 22) {
    for (let i = 0; i < count; i++) {
      const p = this.base('shard', x, y, z);
      const a = Math.random() * TAU;
      const sp = 1.2 + Math.random() * 4.4;
      p.vx = Math.cos(a) * sp * 0.8;
      p.vy = 0.6 + Math.random() * 3.4;
      p.vz = Math.sin(a) * sp * 0.5 - 0.6;
      p.size = 0.009 + Math.random() * 0.019;
      p.life = p.maxLife = 1.5 + Math.random() * 1.4;
      p.rot = Math.random() * TAU;
      p.vrot = (Math.random() - 0.5) * 16;
      p.r = tint[0];
      p.g = tint[1];
      p.b = tint[2];
      p.drag = 0.55;
      p.bounce = true;
      this.push(p);
    }
    // fine glass mist
    for (let i = 0; i < 10; i++) {
      const p = this.base('dust', x, y, z);
      const a = Math.random() * TAU;
      p.vx = Math.cos(a) * (0.4 + Math.random());
      p.vy = 0.5 + Math.random() * 1.2;
      p.vz = Math.sin(a) * 0.4;
      p.size = 0.05 + Math.random() * 0.09;
      p.life = p.maxLife = 0.7 + Math.random() * 0.6;
      p.grav = 1.2;
      p.drag = 1.6;
      p.r = 235;
      p.g = 240;
      p.b = 238;
      p.a = 0.55;
      this.push(p);
    }
  }

  dustPuff(x: number, y: number, z: number, power = 1) {
    for (let i = 0; i < 14; i++) {
      const p = this.base('dust', x, y, z);
      const a = Math.random() * TAU;
      p.vx = Math.cos(a) * (0.5 + Math.random() * 1.6) * power;
      p.vy = (0.9 + Math.random() * 2.2) * power;
      p.vz = Math.sin(a) * (0.3 + Math.random()) * power;
      p.size = (0.07 + Math.random() * 0.16) * power;
      p.life = p.maxLife = 0.9 + Math.random() * 0.9;
      p.grav = 1.6;
      p.drag = 1.1;
      p.r = 198;
      p.g = 170;
      p.b = 126;
      p.a = 0.72;
      this.push(p);
    }
    for (let i = 0; i < 5; i++) {
      const p = this.base('shard', x, y, z);
      const a = Math.random() * TAU;
      p.vx = Math.cos(a) * 2.4 * power;
      p.vy = 1.5 + Math.random() * 3 * power;
      p.vz = Math.sin(a) * 1.6 * power;
      p.size = 0.014 + Math.random() * 0.022;
      p.life = p.maxLife = 0.8 + Math.random() * 0.5;
      p.r = 150;
      p.g = 122;
      p.b = 88;
      p.drag = 0.3;
      this.push(p);
    }
  }

  sparks(x: number, y: number, z: number, count = 12) {
    for (let i = 0; i < count; i++) {
      const p = this.base('spark', x, y, z);
      const a = Math.random() * TAU;
      const sp = 2 + Math.random() * 6;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.random() * sp;
      p.vz = Math.sin(a) * sp * 0.4;
      p.size = 0.01 + Math.random() * 0.012;
      p.life = p.maxLife = 0.25 + Math.random() * 0.35;
      p.r = 255;
      p.g = 210 + Math.random() * 40;
      p.b = 120;
      p.drag = 1.2;
      this.push(p);
    }
  }

  smoke(x: number, y: number, z: number, count = 8, scale = 1) {
    for (let i = 0; i < count; i++) {
      const p = this.base('smoke', x, y, z);
      p.vx = (Math.random() - 0.5) * 0.7;
      p.vy = 0.5 + Math.random() * 1.1;
      p.vz = (Math.random() - 0.5) * 0.5;
      p.size = (0.16 + Math.random() * 0.3) * scale;
      p.life = p.maxLife = 1.6 + Math.random() * 1.8;
      p.grav = -0.35;
      p.drag = 0.9;
      p.r = 96;
      p.g = 88;
      p.b = 80;
      p.a = 0.42;
      this.push(p);
    }
  }

  fireball(x: number, y: number, z: number) {
    for (let i = 0; i < 22; i++) {
      const p = this.base('ember', x, y, z);
      const a = Math.random() * TAU;
      const sp = 2 + Math.random() * 7;
      p.vx = Math.cos(a) * sp;
      p.vy = 1 + Math.random() * 6;
      p.vz = Math.sin(a) * sp * 0.5;
      p.size = 0.09 + Math.random() * 0.24;
      p.life = p.maxLife = 0.4 + Math.random() * 0.55;
      p.grav = 2;
      p.drag = 1.4;
      p.r = 255;
      p.g = 170;
      p.b = 60;
      this.push(p);
    }
    this.smoke(x, y, z, 16, 2.4);
    this.ring(x, y, z, 4.4);
  }

  ring(x: number, y: number, z: number, radius: number) {
    const p = this.base('ring', x, y, z);
    p.size = radius;
    p.life = p.maxLife = 0.5;
    p.grav = 0;
    p.drag = 0;
    p.r = 255;
    p.g = 236;
    p.b = 200;
    this.push(p);
  }

  scorePop(x: number, y: number, z: number, text: string, tint: [number, number, number]) {
    const p = this.base('text', x, y, z);
    p.text = text;
    p.vy = 1.1;
    p.life = p.maxLife = 1.15;
    p.grav = 0;
    p.drag = 1.2;
    p.r = tint[0];
    p.g = tint[1];
    p.b = tint[2];
    this.push(p);
  }

  /** Normalised remaining life, 0..1. */
  static fade(p: Particle) {
    return clamp(p.life / p.maxLife, 0, 1);
  }
}
