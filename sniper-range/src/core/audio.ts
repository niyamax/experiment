import { clamp } from './math';

const SPEED_OF_SOUND = 343; // m/s — impacts downrange arrive late

/**
 * Every sound here is synthesised at runtime; the game ships no audio files.
 * Impacts are delayed and low-passed by distance so a 140 m bottle sounds
 * like a 140 m bottle.
 */
export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private windGain: GainNode | null = null;
  muted = false;

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    this.master = master;

    // one shared noise buffer, reused by every grain
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.startWind();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.85;
  }

  private get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private ready(): boolean {
    return !!this.ctx && !!this.master && !!this.noise;
  }

  private noiseSource(at: number, dur: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    src.playbackRate.value = 0.8 + Math.random() * 0.5;
    src.start(at, Math.random() * 1.5, dur + 0.05);
    return src;
  }

  private env(at: number, peak: number, attack: number, decay: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    return g;
  }

  private tone(
    at: number,
    type: OscillatorType,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), at + dur);
    const g = this.env(at, peak, 0.004, dur);
    osc.connect(g).connect(this.master!);
    osc.start(at);
    osc.stop(at + dur + 0.08);
  }

  /** Distance shaping shared by every downrange impact. */
  private downrange(dist: number) {
    const delay = clamp(dist / SPEED_OF_SOUND, 0, 1.2);
    const atten = 1 / (1 + dist * 0.022);
    const cutoff = 16000 / (1 + dist * 0.05);
    return { at: this.t + delay, atten, cutoff: clamp(cutoff, 500, 16000) };
  }

  // ── weapon ──────────────────────────────────────────────────────────

  shot() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const at = this.t;

    // sharp crack
    const crack = this.noiseSource(at, 0.3);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const cg = this.env(at, 0.9, 0.001, 0.16);
    crack.connect(hp).connect(cg).connect(this.master!);

    // body thump
    const body = this.noiseSource(at, 0.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, at);
    lp.frequency.exponentialRampToValueAtTime(160, at + 0.35);
    const bg = this.env(at, 0.85, 0.004, 0.34);
    body.connect(lp).connect(bg).connect(this.master!);

    this.tone(at, 'sine', 190, 42, 0.24, 0.7);

    // canyon slap-back
    for (let i = 0; i < 3; i++) {
      const d = at + 0.22 + i * 0.19;
      const echo = this.noiseSource(d, 0.4);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 900 - i * 220;
      const g = this.env(d, 0.16 / (i + 1), 0.02, 0.3 + i * 0.1);
      echo.connect(f).connect(g).connect(this.master!);
    }
  }

  dryFire() {
    if (!this.ready()) return;
    this.tone(this.t, 'square', 2200, 400, 0.04, 0.12);
  }

  boltCycle() {
    if (!this.ready()) return;
    const at = this.t;
    this.click(at, 0.16, 1700);
    this.click(at + 0.16, 0.2, 900);
    this.click(at + 0.34, 0.18, 1300);
  }

  reload() {
    if (!this.ready()) return;
    const at = this.t;
    for (let i = 0; i < 5; i++) this.click(at + 0.12 + i * 0.16, 0.13, 1500 + i * 90);
    this.click(at + 1.0, 0.24, 700);
  }

  private click(at: number, peak: number, freq: number) {
    const ctx = this.ctx!;
    const src = this.noiseSource(at, 0.07);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 1.6;
    const g = this.env(at, peak, 0.001, 0.055);
    src.connect(bp).connect(g).connect(this.master!);
  }

  // ── impacts ─────────────────────────────────────────────────────────

  glass(dist: number) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const { at, atten, cutoff } = this.downrange(dist);

    const burst = this.noiseSource(at, 0.5);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const g = this.env(at, 0.5 * atten, 0.002, 0.42);
    burst.connect(hp).connect(lp).connect(g).connect(this.master!);

    // shard partials
    for (let i = 0; i < 7; i++) {
      const d = at + Math.random() * 0.3;
      const f = 2400 + Math.random() * 4200;
      this.tone(d, 'triangle', f, f * 0.55, 0.12 + Math.random() * 0.2, 0.1 * atten);
    }
  }

  metal(dist: number) {
    if (!this.ready()) return;
    const { at, atten } = this.downrange(dist);
    const base = 900 + Math.random() * 500;
    this.tone(at, 'square', base, base * 0.7, 0.3, 0.22 * atten);
    this.tone(at, 'sine', base * 2.41, base * 1.8, 0.42, 0.14 * atten);
  }

  clayBreak(dist: number) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const { at, atten, cutoff } = this.downrange(dist);
    const src = this.noiseSource(at, 0.3);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(2600, cutoff);
    bp.Q.value = 0.7;
    const g = this.env(at, 0.5 * atten, 0.002, 0.24);
    src.connect(bp).connect(g).connect(this.master!);
  }

  explode(dist: number) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const { at, atten } = this.downrange(dist);
    const src = this.noiseSource(at, 1.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(2200, at);
    lp.frequency.exponentialRampToValueAtTime(120, at + 0.9);
    const g = this.env(at, 1.0 * atten, 0.008, 0.95);
    src.connect(lp).connect(g).connect(this.master!);
    this.tone(at, 'sine', 120, 28, 0.7, 0.9 * atten);
  }

  dirt(dist: number) {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const { at, atten, cutoff } = this.downrange(dist);
    const src = this.noiseSource(at, 0.3);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(700, cutoff);
    const g = this.env(at, 0.42 * atten, 0.004, 0.26);
    src.connect(lp).connect(g).connect(this.master!);
  }

  ricochet(dist: number) {
    if (!this.ready()) return;
    const { at, atten } = this.downrange(dist);
    const f = 1800 + Math.random() * 1400;
    this.tone(at, 'sawtooth', f, f * 0.18, 0.5, 0.13 * atten);
  }

  // ── ui ──────────────────────────────────────────────────────────────

  ui() {
    if (!this.ready()) return;
    this.tone(this.t, 'triangle', 640, 900, 0.08, 0.15);
  }

  chime(step: number) {
    if (!this.ready()) return;
    const scale = [523.25, 659.25, 783.99, 1046.5];
    this.tone(this.t, 'triangle', scale[step % scale.length], scale[step % scale.length], 0.28, 0.16);
  }

  buzzer() {
    if (!this.ready()) return;
    const at = this.t;
    this.tone(at, 'sawtooth', 180, 120, 0.5, 0.22);
    this.tone(at + 0.28, 'sawtooth', 130, 80, 0.7, 0.22);
  }

  // ── ambience ────────────────────────────────────────────────────────

  private startWind() {
    if (!this.ready()) return;
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 240;
    bp.Q.value = 0.4;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    src.connect(lp).connect(bp).connect(g).connect(this.master!);
    src.start();
    this.windGain = g;

    // slow gusting
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();
  }

  setWindStrength(mps: number) {
    if (this.windGain) this.windGain.gain.value = 0.03 + Math.abs(mps) * 0.006;
  }
}

export const audio = new Audio();
