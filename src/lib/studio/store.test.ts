import { describe, expect, it, beforeEach } from "vitest";
import { useStudioStore } from "./store";
import type { ShapeLayer } from "./types";

function makeShape(id: string, x = 0): ShapeLayer {
  return { id, type: "shape", shape: "rect", fill: "#ff0000", x, y: 0, width: 100, height: 100, rotation: 0, opacity: 1 };
}

beforeEach(() => {
  useStudioStore.setState({
    designId: null,
    canvas: { width: 1080, height: 1080, layers: [] },
    selectedLayerId: null,
    history: [{ width: 1080, height: 1080, layers: [] }],
    cursor: 0,
  });
});

describe("useStudioStore", () => {
  it("adding a layer commits history and selects it", () => {
    useStudioStore.getState().addLayer(makeShape("a"));

    const state = useStudioStore.getState();
    expect(state.canvas.layers).toHaveLength(1);
    expect(state.selectedLayerId).toBe("a");
    expect(state.history).toHaveLength(2);
    expect(state.cursor).toBe(1);
  });

  it("live updates mutate the canvas without growing history", () => {
    useStudioStore.getState().addLayer(makeShape("a"));
    const historyLengthAfterAdd = useStudioStore.getState().history.length;

    useStudioStore.getState().updateLayerLive("a", { x: 50 });
    useStudioStore.getState().updateLayerLive("a", { x: 75 });

    const state = useStudioStore.getState();
    expect(state.canvas.layers[0].x).toBe(75);
    expect(state.history).toHaveLength(historyLengthAfterAdd);
  });

  it("commitLayerChange records exactly one history entry regardless of prior live updates", () => {
    useStudioStore.getState().addLayer(makeShape("a"));
    useStudioStore.getState().updateLayerLive("a", { x: 50 });
    useStudioStore.getState().updateLayerLive("a", { x: 75 });
    useStudioStore.getState().commitLayerChange("a", { x: 75 });

    const state = useStudioStore.getState();
    expect(state.history).toHaveLength(3);
    expect(state.canUndo()).toBe(true);
    expect(state.canRedo()).toBe(false);
  });

  it("undo restores the previous snapshot and redo restores the undone one", () => {
    useStudioStore.getState().addLayer(makeShape("a"));
    useStudioStore.getState().addLayer(makeShape("b"));
    expect(useStudioStore.getState().canvas.layers).toHaveLength(2);

    useStudioStore.getState().undo();
    expect(useStudioStore.getState().canvas.layers).toHaveLength(1);
    expect(useStudioStore.getState().canvas.layers[0].id).toBe("a");

    useStudioStore.getState().redo();
    expect(useStudioStore.getState().canvas.layers).toHaveLength(2);
  });

  it("a new commit after undo discards the redo branch", () => {
    useStudioStore.getState().addLayer(makeShape("a"));
    useStudioStore.getState().addLayer(makeShape("b"));
    useStudioStore.getState().undo();

    useStudioStore.getState().addLayer(makeShape("c"));

    const state = useStudioStore.getState();
    expect(state.canvas.layers.map((l) => l.id)).toEqual(["a", "c"]);
    expect(state.canRedo()).toBe(false);
  });

  it("removeLayer clears selection if the removed layer was selected", () => {
    useStudioStore.getState().addLayer(makeShape("a"));
    useStudioStore.getState().removeLayer("a");

    const state = useStudioStore.getState();
    expect(state.canvas.layers).toHaveLength(0);
    expect(state.selectedLayerId).toBeNull();
  });

  it("undo/redo are no-ops at the boundaries", () => {
    useStudioStore.getState().undo();
    expect(useStudioStore.getState().cursor).toBe(0);

    useStudioStore.getState().redo();
    expect(useStudioStore.getState().cursor).toBe(0);
  });
});
