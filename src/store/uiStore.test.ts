import { beforeEach, describe, expect, it } from "vitest";
import { defaultLayerVisibility, useUiStore } from "@/store/uiStore";

const storage = new Map<string, string>();

describe("uiStore layer visibility", () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    useUiStore.setState({
      viewMode: "2d",
      layerVisibility: defaultLayerVisibility,
    });
  });

  it("toggles individual visual layers without changing technical state", () => {
    useUiStore.getState().setLayerVisibility("buffers", false);

    expect(useUiStore.getState().layerVisibility.buffers).toBe(false);
    expect(useUiStore.getState().layerVisibility.bessContainers).toBe(true);
  });

  it("applies presets and switches to ISO for presentation 3D", () => {
    useUiStore.getState().applyLayerPreset("presentation3DView");

    expect(useUiStore.getState().viewMode).toBe("iso");
    expect(useUiStore.getState().layerVisibility.threeD).toBe(true);
    expect(useUiStore.getState().layerVisibility.buffers).toBe(false);
    expect(useUiStore.getState().layerVisibility.collisions).toBe(false);
  });

  it("persists layer visibility in localStorage", () => {
    useUiStore.getState().setLayerVisibility("labels", false);
    useUiStore.setState({ layerVisibility: defaultLayerVisibility });

    useUiStore.getState().hydrateLayerVisibility();

    expect(useUiStore.getState().layerVisibility.labels).toBe(false);
  });
});
