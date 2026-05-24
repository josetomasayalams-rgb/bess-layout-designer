import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_UNIT_SYSTEM, type UnitSystemId } from "@/data/unitSystem";

/** 2D = top-down flat view; iso = isometric view with 3D equipment volumes. */
export type MapViewMode = "2d" | "iso";

export type LayerVisibility = {
  terrain: boolean;
  terrainFill: boolean;
  terrainOutline: boolean;
  bessContainers: boolean;
  pcs: boolean;
  transformers: boolean;
  buffers: boolean;
  restrictedAreas: boolean;
  collisions: boolean;
  outOfBounds: boolean;
  labels: boolean;
  grid: boolean;
  measurements: boolean;
  mvInfrastructure: boolean;
  cableRoutes: boolean;
  accessRoads: boolean;
  threeD: boolean;
  shadows: boolean;
  baseMap: boolean;
};

export type LayerId = keyof LayerVisibility;
export type LayerPresetId =
  | "fullView"
  | "cleanView"
  | "technicalView"
  | "presentation3DView"
  | "equipmentOnlyView"
  | "terrainOnlyView";

export const defaultLayerVisibility: LayerVisibility = {
  terrain: true,
  terrainFill: true,
  terrainOutline: true,
  bessContainers: true,
  pcs: true,
  transformers: true,
  buffers: true,
  restrictedAreas: true,
  collisions: true,
  outOfBounds: true,
  labels: true,
  grid: false,
  measurements: false,
  mvInfrastructure: true,
  cableRoutes: true,
  accessRoads: true,
  threeD: true,
  shadows: true,
  baseMap: true,
};

const LAYER_PRESETS: Record<
  LayerPresetId,
  { viewMode?: MapViewMode; layers: LayerVisibility }
> = {
  fullView: { layers: defaultLayerVisibility },
  cleanView: {
    viewMode: "2d",
    layers: {
      ...defaultLayerVisibility,
      buffers: false,
      restrictedAreas: false,
      collisions: false,
      outOfBounds: false,
      labels: false,
      grid: false,
      measurements: false,
      mvInfrastructure: false,
      cableRoutes: false,
      accessRoads: false,
      threeD: false,
    },
  },
  technicalView: {
    layers: {
      ...defaultLayerVisibility,
      grid: true,
      measurements: true,
      mvInfrastructure: true,
      cableRoutes: true,
      accessRoads: true,
      threeD: false,
    },
  },
  presentation3DView: {
    viewMode: "iso",
    layers: {
      ...defaultLayerVisibility,
      buffers: false,
      restrictedAreas: false,
      collisions: false,
      outOfBounds: false,
      grid: false,
      measurements: false,
      mvInfrastructure: true,
      cableRoutes: true,
      accessRoads: true,
      threeD: true,
      shadows: true,
    },
  },
  equipmentOnlyView: {
    viewMode: "2d",
    layers: {
      ...defaultLayerVisibility,
      terrain: false,
      terrainFill: false,
      terrainOutline: false,
      buffers: false,
      restrictedAreas: false,
      collisions: false,
      outOfBounds: false,
      labels: false,
      grid: false,
      measurements: false,
      mvInfrastructure: false,
      cableRoutes: false,
      accessRoads: false,
      threeD: false,
      baseMap: false,
    },
  },
  terrainOnlyView: {
    viewMode: "2d",
    layers: {
      ...defaultLayerVisibility,
      bessContainers: false,
      pcs: false,
      transformers: false,
      buffers: false,
      restrictedAreas: false,
      collisions: false,
      outOfBounds: false,
      labels: false,
      grid: false,
      measurements: false,
      mvInfrastructure: false,
      cableRoutes: false,
      accessRoads: true,
      threeD: false,
    },
  },
};

type UiState = {
  locale: Locale;
  unitSystem: UnitSystemId;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  viewMode: MapViewMode;
  layerVisibility: LayerVisibility;
  hydrateLocale: () => void;
  hydrateLayerVisibility: () => void;
  setLocale: (locale: Locale) => void;
  setUnitSystem: (unitSystem: UnitSystemId) => void;
  toggleLocale: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setViewMode: (mode: MapViewMode) => void;
  toggleViewMode: () => void;
  toggleLayer: (layerId: LayerId) => void;
  setLayerVisibility: (layerId: LayerId, visible: boolean) => void;
  applyLayerPreset: (presetId: LayerPresetId) => void;
  resetLayerVisibility: () => void;
};

const LAYER_STORAGE_KEY = "bess-layout-layer-visibility";

function storedLocale(): Locale | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const stored = window.localStorage.getItem("bess-layout-locale");
  return stored === "es" || stored === "en" ? stored : null;
}

function saveLayerVisibility(layerVisibility: LayerVisibility) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(LAYER_STORAGE_KEY, JSON.stringify(layerVisibility));
}

function storedLayerVisibility(): LayerVisibility | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    const stored = window.localStorage.getItem(LAYER_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<LayerVisibility>;
    return { ...defaultLayerVisibility, ...parsed };
  } catch {
    return null;
  }
}

export const useUiStore = create<UiState>((set, get) => ({
  locale: "en",
  unitSystem: DEFAULT_UNIT_SYSTEM,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: false,
  viewMode: "2d",
  layerVisibility: defaultLayerVisibility,
  hydrateLocale: () => {
    const locale = storedLocale();
    if (locale) set({ locale });
  },
  hydrateLayerVisibility: () => {
    const layerVisibility = storedLayerVisibility();
    if (layerVisibility) set({ layerVisibility });
  },
  setLocale: (locale) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem("bess-layout-locale", locale);
    }
    set({ locale });
  },
  setUnitSystem: (unitSystem) => set({ unitSystem }),
  toggleLocale: () => {
    const next = get().locale === "en" ? "es" : "en";
    get().setLocale(next);
  },
  toggleLeftSidebar: () =>
    set((state) => ({ leftSidebarCollapsed: !state.leftSidebarCollapsed })),
  toggleRightSidebar: () =>
    set((state) => ({ rightSidebarCollapsed: !state.rightSidebarCollapsed })),
  setViewMode: (mode) =>
    set((state) => {
      const layerVisibility =
        mode === "iso"
          ? { ...state.layerVisibility, threeD: true }
          : state.layerVisibility;
      if (mode === "iso") saveLayerVisibility(layerVisibility);
      return { viewMode: mode, layerVisibility };
    }),
  toggleViewMode: () =>
    set((state) => {
      const viewMode = state.viewMode === "2d" ? "iso" : "2d";
      const layerVisibility =
        viewMode === "iso"
          ? { ...state.layerVisibility, threeD: true }
          : state.layerVisibility;
      if (viewMode === "iso") saveLayerVisibility(layerVisibility);
      return { viewMode, layerVisibility };
    }),
  toggleLayer: (layerId) =>
    get().setLayerVisibility(layerId, !get().layerVisibility[layerId]),
  setLayerVisibility: (layerId, visible) =>
    set((state) => {
      const layerVisibility = { ...state.layerVisibility, [layerId]: visible };
      const viewMode = layerId === "threeD" && visible ? "iso" : state.viewMode;
      saveLayerVisibility(layerVisibility);
      return { layerVisibility, viewMode };
    }),
  applyLayerPreset: (presetId) =>
    set(() => {
      const preset = LAYER_PRESETS[presetId];
      saveLayerVisibility(preset.layers);
      return {
        layerVisibility: preset.layers,
        ...(preset.viewMode ? { viewMode: preset.viewMode } : {}),
      };
    }),
  resetLayerVisibility: () =>
    set(() => {
      saveLayerVisibility(defaultLayerVisibility);
      return { layerVisibility: defaultLayerVisibility };
    }),
}));
