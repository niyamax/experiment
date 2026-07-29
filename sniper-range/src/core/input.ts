/**
 * Aim + trigger input. Desktop uses pointer lock (raw mouse deltas); touch
 * uses drag-to-aim with tap-to-fire. Both funnel into the same accumulators
 * which the game drains once per frame.
 */
export class Input {
  /** Unconsumed aim movement, in screen pixels. */
  dx = 0;
  dy = 0;
  /** Pending trigger pulls. */
  fireQueue = 0;
  /** Pending magnification cycles. */
  zoomQueue = 0;
  reloadQueue = 0;
  pausePressed = false;
  holdBreath = false;
  locked = false;

  private keys = new Set<string>();
  private dragId: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private downAt = 0;
  private travel = 0;
  private finePointer = false;
  private enabled = false;

  onLockChange: ((locked: boolean) => void) | null = null;
  onFirstGesture: (() => void) | null = null;
  private gestureSeen = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.finePointer = window.matchMedia('(pointer: fine)').matches;

    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', this.onWheel, { passive: false });

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('pointerlockchange', this.onLockToggle);
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.holdBreath = false;
    });
  }

  /** Input only steers the rifle while a run is live. */
  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) this.releaseLock();
  }

  requestLock() {
    if (!this.finePointer || this.locked) return;
    void this.canvas.requestPointerLock?.();
  }

  releaseLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  /** Called once per frame; returns and clears accumulated look delta. */
  drainLook() {
    const out = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return out;
  }

  drainFire() {
    const n = this.fireQueue;
    this.fireQueue = 0;
    return n;
  }

  drainZoom() {
    const n = this.zoomQueue;
    this.zoomQueue = 0;
    return n;
  }

  drainReload() {
    const n = this.reloadQueue;
    this.reloadQueue = 0;
    return n > 0;
  }

  drainPause() {
    const p = this.pausePressed;
    this.pausePressed = false;
    return p;
  }

  /** Keyboard nudge, in pixels for this frame. */
  keyboardAim(dt: number) {
    const speed = 620 * dt;
    let ax = 0;
    let ay = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) ax -= speed;
    if (this.keys.has('d') || this.keys.has('arrowright')) ax += speed;
    if (this.keys.has('w') || this.keys.has('arrowup')) ay -= speed;
    if (this.keys.has('s') || this.keys.has('arrowdown')) ay += speed;
    return { ax, ay };
  }

  private gesture() {
    if (this.gestureSeen) return;
    this.gestureSeen = true;
    this.onFirstGesture?.();
  }

  private onDown = (e: PointerEvent) => {
    this.gesture();
    if (!this.enabled) return;

    if (this.finePointer) {
      if (!this.locked) {
        this.requestLock();
        return; // the click that grabs the pointer should not fire
      }
      if (e.button === 0) this.fireQueue++;
      if (e.button === 2) this.zoomQueue++;
      return;
    }

    if (this.dragId !== null) return;
    this.dragId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.downAt = performance.now();
    this.travel = 0;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onMove = (e: PointerEvent) => {
    if (!this.enabled) return;

    if (this.locked) {
      this.dx += e.movementX;
      this.dy += e.movementY;
      return;
    }
    if (this.dragId !== e.pointerId) return;
    const mx = e.clientX - this.lastX;
    const my = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.travel += Math.hypot(mx, my);
    // touch drags the scene, so the reticle moves opposite the finger
    this.dx -= mx;
    this.dy -= my;
  };

  private onUp = (e: PointerEvent) => {
    if (this.dragId !== e.pointerId) return;
    this.dragId = null;
    if (this.canvas.hasPointerCapture(e.pointerId))
      this.canvas.releasePointerCapture(e.pointerId);
    if (!this.enabled) return;
    const held = performance.now() - this.downAt;
    if (held < 280 && this.travel < 14) this.fireQueue++;
  };

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    this.zoomQueue += e.deltaY < 0 ? 1 : -1;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.gesture();
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'arrowup' || k === 'arrowdown') e.preventDefault();
    if (this.keys.has(k)) return; // ignore auto-repeat for edge actions
    this.keys.add(k);

    if (!this.enabled) return;
    if (k === ' ') this.fireQueue++;
    else if (k === 'r') this.reloadQueue++;
    else if (k === 'z' || k === 'e') this.zoomQueue++;
    else if (k === 'escape' || k === 'p') this.pausePressed = true;
    else if (k === 'shift') this.holdBreath = true;
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    this.keys.delete(k);
    if (k === 'shift') this.holdBreath = false;
  };

  private onLockToggle = () => {
    this.locked = document.pointerLockElement === this.canvas;
    this.onLockChange?.(this.locked);
  };
}
