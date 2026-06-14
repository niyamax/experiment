// Minimal reactive store. Subsystems subscribe to slices of state and the
// UI re-renders on change. No framework needed.

import type { Impression, InkState, Mode, TileLayout, Tool, Viewport } from './types';

export interface AppState {
  mode: Mode;
  viewport: Viewport;
  impressions: Impression[];
  ink: InkState;
  tool: Tool;
  /** current block resolution (square px) */
  blockSize: number;
  /** stamp size in world units when pressing */
  pressSize: number;
  tileLayout: TileLayout;
  /** ui flag: a press is "armed" and follows the cursor */
  pressArmed: boolean;
}

export const PALETTE: string[] = [
  '#1f1b17', // ink black-brown
  '#c0532b', // terracotta
  '#2f6b5e', // viridian
  '#274b73', // indigo
  '#b8902f', // ochre
  '#8a2f4a', // madder
  '#5a4a8a', // mauve
  '#3b3a36', // soot
];

const DEFAULT_TOOL: Tool = {
  id: 'v-gouge',
  label: 'V-gouge',
  kind: 'carve',
  size: 14,
  rough: 0.35,
};

type Listener = (state: AppState) => void;

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = {
      mode: 'press',
      viewport: { x: -600, y: -400, zoom: 1 },
      impressions: [],
      ink: { color: PALETTE[1], level: 1 },
      tool: DEFAULT_TOOL,
      blockSize: 512,
      pressSize: 220,
      tileLayout: 'grid',
      pressArmed: false,
    };
  }

  get(): AppState {
    return this.state;
  }

  set(patch: Partial<AppState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  /** mutate impressions array in place then notify */
  update(mutator: (s: AppState) => void): void {
    mutator(this.state);
    this.emit();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.state);
  }
}

export const store = new Store();

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
