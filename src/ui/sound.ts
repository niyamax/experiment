// Lightweight procedural sound — the ka-chunk of a press and the scrape of a
// carve — synthesized with the Web Audio API (no asset files). Muteable.

let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}
export function isMuted() {
  return muted;
}

/** The satisfying thud of pressing a block. `gain` scales loudness. */
export function playPress(gain = 1) {
  if (muted) return;
  try {
    const a = ac();
    const t = a.currentTime;
    // low thud
    const osc = a.createOscillator();
    const og = a.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.5 * gain, t + 0.006);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(og).connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.22);

    // paper/ink noise transient
    const dur = 0.09;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const noise = a.createBufferSource();
    noise.buffer = buf;
    const ng = a.createGain();
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    ng.gain.setValueAtTime(0.18 * gain, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    noise.connect(hp).connect(ng).connect(a.destination);
    noise.start(t);
  } catch {
    /* audio not available */
  }
}

/** A short dry scrape for carving. */
export function playScrape(intensity = 1) {
  if (muted) return;
  try {
    const a = ac();
    const t = a.currentTime;
    const dur = 0.05;
    const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * 0.6;
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200 + Math.random() * 800;
    bp.Q.value = 0.7;
    const g = a.createGain();
    g.gain.setValueAtTime(0.05 * intensity, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(a.destination);
    src.start(t);
  } catch {
    /* ignore */
  }
}
