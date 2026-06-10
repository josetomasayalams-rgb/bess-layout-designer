import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_UNIT_SYSTEM, type UnitSystemId } from "@/data/unitSystem";

/** 2D = top-down flat view; iso = isometric view with 3D equipment volumes. */
export type MapViewMode = "2d" | "iso";

/** UI color theme. The app ships dark by default. */
export type ThemeMode = "dark" | "light";

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
  grid: true,
  measurements: true,
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
  theme: ThemeMode;
  unitSystem: UnitSystemId;
  leftSidebarCollapsed: boolean;
  rightSidebarCollapsed: boolean;
  viewMode: MapViewMode;
  layerVisibility: LayerVisibility;
  /** When true, the full-screen side-by-side map comparison overlay is shown. */
  mapComparisonOpen: boolean;
  hydrateLocale: () => void;
  hydrateTheme: () => void;
  hydrateLayerVisibility: () => void;
  setMapComparisonOpen: (open: boolean) => void;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setUnitSystem: (unitSystem: UnitSystemId) => void;
  toggleLocale: () => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setRightSidebarCollapsed: (collapsed: boolean) => void;
  setViewMode: (mode: MapViewMode) => void;
  toggleViewMode: () => void;
  toggleLayer: (layerId: LayerId) => void;
  setLayerVisibility: (layerId: LayerId, visible: boolean) => void;
  applyLayerPreset: (presetId: LayerPresetId) => void;
  resetLayerVisibility: () => void;
};

const LAYER_STORAGE_KEY = "bess-layout-layer-visibility-v2";
const THEME_STORAGE_KEY = "bess-layout-theme";

function storedLocale(): Locale | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const stored = window.localStorage.getItem("bess-layout-locale");
  return stored === "es" || stored === "en" ? stored : null;
}

function storedTheme(): ThemeMode | null {
  if (typeof window === "undefined" || !window.localStorage) return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

/** Reflect the active theme onto <html> so Tailwind's `dark:` variants apply. */
function applyThemeClass(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
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
  theme: "dark",
  unitSystem: DEFAULT_UNIT_SYSTEM,
  leftSidebarCollapsed: false,
  rightSidebarCollapsed: true,
  viewMode: "2d",
  layerVisibility: defaultLayerVisibility,
  mapComparisonOpen: false,
  setMapComparisonOpen: (open) => set({ mapComparisonOpen: open }),
  hydrateLocale: () => {
    const locale = storedLocale();
    if (locale) set({ locale });
  },
  hydrateTheme: () => {
    const theme = storedTheme() ?? get().theme;
    applyThemeClass(theme);
    set({ theme });
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
  setTheme: (theme) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    applyThemeClass(theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
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
  setRightSidebarCollapsed: (collapsed) =>
    set({ rightSidebarCollapsed: collapsed }),
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
