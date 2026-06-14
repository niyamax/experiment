// Builds the application shell: the workbench top bar, the contextual side
// panel (which changes per mode), and the open canvas. Wires modes together.

import { SceneCanvas } from '../canvas/sceneCanvas';
import { attachController } from '../canvas/controller';
import { PALETTE, store } from '../core/store';
import type { Mode } from '../core/types';
import { studio } from '../engine/studio';
import { STARTER_STAMPS } from '../data/library';
import { CarveView, GOUGES } from './carveView';
import { exportCanvasPNG } from './export';
import { isMuted, setMuted } from './sound';

const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'carve', label: 'Carve', hint: 'Gouge your block' },
  { id: 'press', label: 'Press', hint: 'Stamp the canvas' },
  { id: 'library', label: 'Library', hint: 'Pick a motif' },
  { id: 'pattern', label: 'Pattern', hint: 'Fill seamlessly' },
];

export function mountApp(root: HTMLElement) {
  root.innerHTML = '';
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
  row.append(
    button('Edit block', 'ghost-btn', () => store.set({ mode: 'carve' })),
    button('Clear canvas', 'ghost-btn', () => store.update((s) => (s.impressions = []))),
  );
  panel.appendChild(row);
  panel.appendChild(button('Export PNG', 'primary-btn', () => exportCanvasPNG()));
}

function renderLibrary(panel: HTMLElement) {
  panel.append(panelTitle('Library', 'Load a motif onto your block.'));
  const grid = el('div', 'stamp-grid');
  for (const s of STARTER_STAMPS) {
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
    b.onclick = () => {
      studio.block.loadStamp(s);
      store.set({ mode: 'press' });
    };
    grid.appendChild(b);
  }
  panel.appendChild(grid);
  panel.appendChild(note('More collections arrive with the Library module.'));
}

function renderPattern(panel: HTMLElement) {
  panel.append(panelTitle('Pattern', 'Fill the view with a seamless repeat.'));
  panel.appendChild(note('The Pattern module wires up seamless tiling here.'));
  panel.appendChild(button('Back to press', 'ghost-btn', () => store.set({ mode: 'press' })));
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
