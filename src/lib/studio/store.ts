import { create } from "zustand";
import type { CanvasSnapshot, Layer } from "./types";
import { EMPTY_CANVAS } from "./types";

const MAX_HISTORY = 100;

interface EditorState {
  designId: string | null;
  canvas: CanvasSnapshot;
  selectedLayerId: string | null;

  /** Committed snapshots for undo/redo. `history[cursor]` is always equal to `canvas`. */
  history: CanvasSnapshot[];
  cursor: number;

  loadDesign: (designId: string, canvas: CanvasSnapshot) => void;
  selectLayer: (id: string | null) => void;

  addLayer: (layer: Layer) => void;
  removeLayer: (id: string) => void;

  /** Applies a patch without touching history — for continuous drag/resize gestures. */
  updateLayerLive: (id: string, patch: Partial<Layer>) => void;
  /** Commits the current live state (or an optional final patch) as one history entry. */
  commitLayerChange: (id: string, patch?: Partial<Layer>) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function applyPatch(layer: Layer, patch: Partial<Layer>): Layer {
  return { ...layer, ...patch } as Layer;
}

function pushHistory(history: CanvasSnapshot[], cursor: number, snapshot: CanvasSnapshot) {
  const truncated = history.slice(0, cursor + 1);
  const next = [...truncated, snapshot].slice(-MAX_HISTORY);
  return { history: next, cursor: next.length - 1 };
}

export const useStudioStore = create<EditorState>((set, get) => ({
  designId: null,
  canvas: EMPTY_CANVAS,
  selectedLayerId: null,
  history: [EMPTY_CANVAS],
  cursor: 0,

  loadDesign: (designId, canvas) => set({ designId, canvas, history: [canvas], cursor: 0, selectedLayerId: null }),

  selectLayer: (id) => set({ selectedLayerId: id }),

  addLayer: (layer) => {
    const canvas = { ...get().canvas, layers: [...get().canvas.layers, layer] };
    const { history, cursor } = pushHistory(get().history, get().cursor, canvas);
    set({ canvas, history, cursor, selectedLayerId: layer.id });
  },

  removeLayer: (id) => {
    const canvas = { ...get().canvas, layers: get().canvas.layers.filter((l) => l.id !== id) };
    const { history, cursor } = pushHistory(get().history, get().cursor, canvas);
    const selectedLayerId = get().selectedLayerId === id ? null : get().selectedLayerId;
    set({ canvas, history, cursor, selectedLayerId });
  },

  updateLayerLive: (id, patch) => {
    const canvas = {
      ...get().canvas,
      layers: get().canvas.layers.map((l) => (l.id === id ? applyPatch(l, patch) : l)),
    };
    set({ canvas });
  },

  commitLayerChange: (id, patch) => {
    const canvas = {
      ...get().canvas,
      layers: get().canvas.layers.map((l) => (l.id === id && patch ? applyPatch(l, patch) : l)),
    };
    const { history, cursor } = pushHistory(get().history, get().cursor, canvas);
    set({ canvas, history, cursor });
  },

  undo: () => {
    const { history, cursor } = get();
    if (cursor <= 0) return;
    set({ cursor: cursor - 1, canvas: history[cursor - 1] });
  },

  redo: () => {
    const { history, cursor } = get();
    if (cursor >= history.length - 1) return;
    set({ cursor: cursor + 1, canvas: history[cursor + 1] });
  },

  canUndo: () => get().cursor > 0,
  canRedo: () => get().cursor < get().history.length - 1,
}));

export function createLayerId(): string {
  return crypto.randomUUID();
}
