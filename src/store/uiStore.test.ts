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
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: true,
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

  it("can explicitly collapse the left sidebar for the published demo", () => {
    useUiStore.getState().setLeftSidebarCollapsed(true);

    expect(useUiStore.getState().leftSidebarCollapsed).toBe(true);
  });
});

describe("uiStore theme", () => {
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
    useUiStore.setState({ theme: "dark" });
    document.documentElement.className = "";
  });

  it("defaults to dark", () => {
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("setTheme persists to localStorage and applies the class to <html>", () => {
    useUiStore.getState().setTheme("light");
    expect(useUiStore.getState().theme).toBe("light");
    expect(storage.get("bess-layout-theme")).toBe("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme flips between dark and light", () => {
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("light");
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("hydrateTheme restores the stored preference", () => {
    useUiStore.getState().setTheme("light");
    useUiStore.setState({ theme: "dark" });
    useUiStore.getState().hydrateTheme();
    expect(useUiStore.getState().theme).toBe("light");
  });
});

describe("uiStore initial defaults", () => {
  beforeEach(() => {
    useUiStore.setState({
      leftSidebarCollapsed: false,
      rightSidebarCollapsed: true,
    });
  });

  it("collapses the right sidebar and keeps the left sidebar open on open", () => {
    expect(useUiStore.getState().rightSidebarCollapsed).toBe(true);
    expect(useUiStore.getState().leftSidebarCollapsed).toBe(false);
  });

  it("enables the grid and measurement layers by default", () => {
    expect(defaultLayerVisibility.grid).toBe(true);
    expect(defaultLayerVisibility.measurements).toBe(true);
  });
});
