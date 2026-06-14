// Builds the application shell: the workbench top bar, the contextual side
// panel (which changes per mode), and the open canvas. Wires modes together.

import { SceneCanvas } from '../canvas/sceneCanvas';
import { attachController } from '../canvas/controller';
import { PALETTE, store } from '../core/store';
import type { Mode } from '../core/types';
import { studio } from '../engine/studio';
import { ALL_STAMPS, COLLECTIONS } from '../data/library';
import type { LibraryStamp } from '../core/types';
import { CarveView, GOUGES } from './carveView';
import { exportCanvasPNG, downloadCanvasPNG } from './export';
import { isMuted, setMuted } from './sound';
import { fillVisibleRegion, renderSeamlessTile } from '../engine/tiling';
import type { TileLayout } from '../core/types';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'carve', label: 'Carve', hint: 'Gouge your block' },
  { id: 'press', label: 'Press', hint: 'Stamp the canvas' },
  { id: 'library', label: 'Library', hint: 'Pick a motif' },
  { id: 'pattern', label: 'Pattern', hint: 'Fill seamlessly' },
];

export function mountApp(root: HTMLElement) {
  root.innerHTML = '';

  // Delightful first run: load a beautiful motif so the very first press
  // already looks hand-cut (rather than a blank/solid block).
  const seed = ALL_STAMPS.find((s) => s.id === 'fern') ?? ALL_STAMPS.find((s) => s.id === 'leaf');
  if (seed) studio.block.loadStamp(seed);

  const shell = el('div', 'shell');

  // ---- top bar -------------------------------------------------------------
  const top = el('header', 'topbar');
  const brand = el('div', 'brand');
  brand.innerHTML = `<span class="brand-mark">◣◥</span><span class="brand-name">STAMP</span>`;
  const tabs = el('nav', 'tabs');
  const tabEls = new Map<Mode, HTMLButtonElement>();
  for (const m of MODES) {
    const b = document.createElement('button');
    b.className = 'tab';
    b.innerHTML = `<span class="tab-label">${m.label}</span><span class="tab-hint">${m.hint}</span>`;
    b.onclick = () => store.set({ mode: m.id });
    tabs.appendChild(b);
    tabEls.set(m.id, b);
  }
  const actions = el('div', 'top-actions');
  const muteBtn = button('♪', 'icon-btn', () => {
    setMuted(!isMuted());
    muteBtn.classList.toggle('off', isMuted());
  });
  muteBtn.title = 'Toggle sound';
  const exportBtn = button('Export PNG', 'ghost-btn', () => exportCanvasPNG());
  actions.append(muteBtn, exportBtn);
  top.append(brand, tabs, actions);

  // ---- body: side panel + canvas ------------------------------------------
  const body = el('div', 'body');
  const panel = el('aside', 'panel');
  const stage = el('main', 'stage');
  body.append(panel, stage);

  shell.append(top, body);
  root.appendChild(shell);

  // canvas
  const scene = new SceneCanvas(stage);
  attachController(scene);
  scene.resetView();

  // floating canvas controls
  const zoomDock = el('div', 'zoom-dock');
  zoomDock.append(
    button('–', 'round-btn', () => scene.zoomAt(scene.width / 2, scene.height / 2, 0.85)),
    button('Reset', 'pill-btn', () => scene.resetView()),
    button('+', 'round-btn', () => scene.zoomAt(scene.width / 2, scene.height / 2, 1.18)),
  );
  stage.appendChild(zoomDock);

  // ---- empty-canvas onboarding hint ---------------------------------------
  const onboard = el('div', 'onboard');
  onboard.innerHTML =
    `<div class="onboard-card">` +
    `<div class="onboard-title">Press your first stamp</div>` +
    `<div class="onboard-hint">Click anywhere to press · drag to repeat · ` +
    `Space to pan · scroll to zoom</div>` +
    `</div>`;
  stage.appendChild(onboard);
  const syncOnboard = () => {
    const empty = store.get().impressions.length === 0;
    onboard.classList.toggle('hidden', !empty);
  };
  syncOnboard();
  store.subscribe(syncOnboard);

  // subtle "stamp down" feedback whenever a fresh impression lands
  let lastImpCount = store.get().impressions.length;
  let flashTimer = 0;
  store.subscribe((s) => {
    if (s.impressions.length > lastImpCount) {
      stage.classList.remove('pressed');
      // force reflow so the animation can retrigger on rapid presses
      void stage.offsetWidth;
      stage.classList.add('pressed');
      clearTimeout(flashTimer);
      flashTimer = window.setTimeout(() => stage.classList.remove('pressed'), 180);
    }
    lastImpCount = s.impressions.length;
  });

  // ---- keyboard shortcuts --------------------------------------------------
  const MODE_KEYS: Record<string, Mode> = {
    Digit1: 'carve',
    Digit2: 'press',
    Digit3: 'library',
    Digit4: 'pattern',
  };
  window.addEventListener('keydown', (e) => {
    if (isTypingTarget(e)) return;

    // mode switching: 1/2/3/4
    const m = MODE_KEYS[e.code];
    if (m) {
      store.set({ mode: m });
      e.preventDefault();
      return;
    }

    // undo: Cmd/Ctrl+Z — carve block in carve mode, else pop last impression
    if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
      if (store.get().mode === 'carve') studio.block.undo();
      else studio.undoLast();
      e.preventDefault();
      return;
    }

    // Backspace / Delete: pop last impression
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (studio.undoLast()) e.preventDefault();
      return;
    }

    // R: re-ink
    if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey) {
      studio.reink();
      e.preventDefault();
    }
  });

  const carveView = new CarveView();

  // ---- panel rendering -----------------------------------------------------
  function renderPanel() {
    const mode = store.get().mode;
    panel.innerHTML = '';
    if (mode === 'carve') renderCarve(panel, carveView);
    else if (mode === 'press') renderPress(panel);
    else if (mode === 'library') renderLibrary(panel);
    else if (mode === 'pattern') renderPattern(panel);
  }

  store.subscribe((s) => {
    for (const [id, b] of tabEls) b.classList.toggle('active', id === s.mode);
  });

  let lastMode: Mode | null = null;
  let lastInk = '';
  store.subscribe((s) => {
    if (s.mode !== lastMode) {
      lastMode = s.mode;
      renderPanel();
    }
    if (s.ink.color !== lastInk) {
      lastInk = s.ink.color;
      carveView.refreshInk();
    }
  });

  // initial paint
  for (const [id, b] of tabEls) b.classList.toggle('active', id === store.get().mode);
  renderPanel();
}

// ---- panel builders --------------------------------------------------------

function renderCarve(panel: HTMLElement, carveView: CarveView) {
  panel.append(panelTitle('Carve', 'Drag to gouge. Raised areas print.'));
  panel.appendChild(carveView.el);

  const tools = el('div', 'tool-grid');
  for (const t of GOUGES) {
    const b = document.createElement('button');
    b.className = 'tool-btn';
    b.textContent = t.label;
    b.onclick = () => {
      store.set({ tool: t });
      syncTools();
    };
    b.dataset.tool = t.id;
    tools.appendChild(b);
  }
  panel.appendChild(label('Tools'));
  panel.appendChild(tools);
  function syncTools() {
    tools.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.tool === store.get().tool.id);
    });
  }
  syncTools();

  panel.appendChild(label('Ink'));
  panel.appendChild(swatches());

  const row = el('div', 'btn-row');
  row.append(
    button('Undo', 'ghost-btn', () => studio.block.undo()),
    button('Fill', 'ghost-btn', () => studio.block.fillRaised()),
    button('Clear', 'ghost-btn', () => studio.block.clear()),
  );
  panel.appendChild(row);

  panel.appendChild(
    button('Press this →', 'primary-btn', () => store.set({ mode: 'press' })),
  );
}

function renderPress(panel: HTMLElement) {
  panel.append(panelTitle('Press', 'Click the canvas to stamp. Drag to repeat.'));
  panel.appendChild(label('Ink'));
  panel.appendChild(swatches());

  panel.appendChild(label('Stamp size'));
  panel.appendChild(
    slider(80, 420, store.get().pressSize, (v) => store.set({ pressSize: v })),
  );

  panel.appendChild(label('Ink level'));
  const inkRow = el('div', 'ink-meter-row');
  const meter = el('div', 'ink-meter');
  const fill = el('div', 'ink-meter-fill');
  meter.appendChild(fill);
  const reink = button('Re-ink', 'ghost-btn', () => studio.reink());
  inkRow.append(meter, reink);
  panel.appendChild(inkRow);
  const syncMeter = () => (fill.style.width = `${Math.round(store.get().ink.level * 100)}%`);
  syncMeter();
  store.subscribe(syncMeter);

  const row = el('div', 'btn-row');
  const undoBtn = button('Undo press', 'ghost-btn', () => studio.undoLast());
  row.append(
    undoBtn,
    button('Edit block', 'ghost-btn', () => store.set({ mode: 'carve' })),
  );
  panel.appendChild(row);
  // disable Undo press when there's nothing to undo
  const syncUndo = () => {
    undoBtn.disabled = store.get().impressions.length === 0;
  };
  syncUndo();
  store.subscribe(syncUndo);

  const row2 = el('div', 'btn-row');
  row2.append(
    button('Clear canvas', 'ghost-btn', () => store.update((s) => (s.impressions = []))),
  );
  panel.appendChild(row2);
  panel.appendChild(button('Export PNG', 'primary-btn', () => exportCanvasPNG()));
}

let libraryFilter = 'All';

function renderLibrary(panel: HTMLElement) {
  panel.append(panelTitle('Library', 'Load a hand-cut motif onto your block.'));

  // collection filter chips
  const chips = el('div', 'chip-row');
  const grid = el('div', 'stamp-grid');

  function makeCell(s: LibraryStamp): HTMLButtonElement {
    const b = document.createElement('button');
    b.className = 'stamp-cell';
    const c = document.createElement('canvas');
    c.width = c.height = 72;
    const cx = c.getContext('2d')!;
    cx.fillStyle = '#1f1b17';
    s.draw(cx, 72);
    b.appendChild(c);
    const cap = el('span', 'stamp-cap');
    cap.textContent = s.name;
    b.appendChild(cap);
    b.title = `${s.name} · ${s.collection}`;
    b.onclick = () => {
      studio.block.loadStamp(s);
      store.set({ mode: 'press' });
    };
    return b;
  }

  function fillGrid() {
    grid.innerHTML = '';
    const list = libraryFilter === 'All'
      ? ALL_STAMPS
      : ALL_STAMPS.filter((s) => s.collection === libraryFilter);
    for (const s of list) grid.appendChild(makeCell(s));
  }

  for (const name of ['All', ...COLLECTIONS]) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = name;
    chip.classList.toggle('active', name === libraryFilter);
    chip.onclick = () => {
      libraryFilter = name;
      chips.querySelectorAll('.chip').forEach((c) =>
        c.classList.toggle('active', c.textContent === libraryFilter),
      );
      fillGrid();
    };
    chips.appendChild(chip);
  }

  panel.appendChild(chips);
  fillGrid();
  panel.appendChild(grid);
}

const LAYOUTS: { id: TileLayout; label: string }[] = [
  { id: 'grid', label: 'Grid' },
  { id: 'half-drop', label: 'Half-drop' },
  { id: 'brick', label: 'Brick' },
  { id: 'mirror', label: 'Mirror' },
  { id: 'radial', label: 'Radial' },
];

// spacing slider value is a multiple of tile size (0.6 – 1.4)
let patternSpacingMul = 1;

function renderPattern(panel: HTMLElement) {
  panel.append(panelTitle('Pattern', 'Lay your motif down as a flawless seamless repeat.'));

  if (studio.block.isBlank()) {
    panel.appendChild(
      note('Your block is blank. Carve a motif or pick one from the Library before tiling.'),
    );
    const row = el('div', 'btn-row');
    row.append(
      button('Carve', 'ghost-btn', () => store.set({ mode: 'carve' })),
      button('Library', 'ghost-btn', () => store.set({ mode: 'library' })),
    );
    panel.appendChild(row);
    return;
  }

  panel.appendChild(label('Ink'));
  panel.appendChild(swatches());

  // ---- layout chooser ----
  panel.appendChild(label('Layout'));
  const chips = el('div', 'chip-row');
  for (const lay of LAYOUTS) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = lay.label;
    chip.dataset.layout = lay.id;
    chip.classList.toggle('active', lay.id === store.get().tileLayout);
    chip.onclick = () => {
      store.set({ tileLayout: lay.id });
      chips.querySelectorAll<HTMLButtonElement>('.chip').forEach((c) =>
        c.classList.toggle('active', c.dataset.layout === lay.id),
      );
    };
    chips.appendChild(chip);
  }
  panel.appendChild(chips);

  // ---- tile size ----
  panel.appendChild(label('Tile size'));
  panel.appendChild(
    slider(80, 420, store.get().pressSize, (v) => store.set({ pressSize: v })),
  );

  // ---- spacing (multiple of tile size) ----
  panel.appendChild(label('Spacing'));
  panel.appendChild(
    slider(60, 140, Math.round(patternSpacingMul * 100), (v) => {
      patternSpacingMul = v / 100;
    }),
  );

  // ---- primary fill ----
  panel.appendChild(
    button('Fill view', 'primary-btn', () => {
      const tileSize = store.get().pressSize;
      fillVisibleRegion(store.get().tileLayout, {
        spacing: tileSize * patternSpacingMul,
        tileSize,
        jitter: 0,
      });
    }),
  );

  // ---- secondary actions ----
  const row = el('div', 'btn-row');
  row.append(
    button('Clear canvas', 'ghost-btn', () => store.update((s) => (s.impressions = []))),
    button('Export tile', 'ghost-btn', () => {
      const tile = renderSeamlessTile(store.get().pressSize, store.get().tileLayout);
      downloadCanvasPNG(tile, `stamp-tile-${store.get().tileLayout}.png`);
    }),
  );
  panel.appendChild(row);

  panel.appendChild(button('Export PNG', 'ghost-btn', () => exportCanvasPNG()));
}

// ---- small UI helpers ------------------------------------------------------

function swatches(): HTMLElement {
  const wrap = el('div', 'swatches');
  const sync = () => {
    wrap.querySelectorAll<HTMLButtonElement>('.swatch').forEach((b) => {
      b.classList.toggle('active', b.dataset.c === store.get().ink.color);
    });
  };
  for (const c of PALETTE) {
    const b = document.createElement('button');
    b.className = 'swatch';
    b.style.background = c;
    b.dataset.c = c;
    b.onclick = () => {
      store.set({ ink: { ...store.get().ink, color: c } });
      sync();
    };
    wrap.appendChild(b);
  }
  sync();
  return wrap;
}

function panelTitle(title: string, sub: string): HTMLElement {
  const w = el('div', 'panel-head');
  const h = el('h2', 'panel-title');
  h.textContent = title;
  const p = el('p', 'panel-sub');
  p.textContent = sub;
  w.append(h, p);
  return w;
}

function label(text: string): HTMLElement {
  const l = el('div', 'field-label');
  l.textContent = text;
  return l;
}

function note(text: string): HTMLElement {
  const n = el('p', 'panel-note');
  n.textContent = text;
  return n;
}

function slider(min: number, max: number, value: number, on: (v: number) => void): HTMLElement {
  const input = document.createElement('input');
  input.type = 'range';
  input.className = 'slider';
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.oninput = () => on(Number(input.value));
  return input;
}

function button(text: string, cls: string, on: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = text;
  b.onclick = on;
  return b;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}
