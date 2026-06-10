import { create } from "zustand";

import { type ProjectState } from "./projectStore.types";
import { createComparisonSlice } from "./slices/comparisonSlice";
import { createEquipmentSlice } from "./slices/equipmentSlice";
import { createLayoutEditSlice } from "./slices/layoutEditSlice";
import { createLifecycleSlice } from "./slices/lifecycleSlice";
import { createPolygonSlice } from "./slices/polygonSlice";
import { createRepairZoneSlice } from "./slices/repairZoneSlice";
import { createTerrainSlice } from "./slices/terrainSlice";
import { createSmartSiteFitSlice } from "./slices/smartSiteFitSlice";
import { createSizingSnapshotSlice } from "./slices/sizingSnapshotSlice";

// Re-export the 7 public types so consumers continue to import them
// from `@/store/projectStore` unchanged (Phase 12B guardrail D9).
export type {
  ComparisonSlot,
  ComparisonState,
  InteractionMode,
  LayoutAlternative,
  LayoutEditState,
  PreviewTerrainState,
  TerrainFitPreviewState,
} from "./projectStore.types";

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...createPolygonSlice(set),
  ...createTerrainSlice(set),
  ...createRepairZoneSlice(set),
  ...createEquipmentSlice(set, get),
  ...createLayoutEditSlice(set),
  ...createComparisonSlice(set),
  ...createLifecycleSlice(set, get),
  ...createSmartSiteFitSlice(set, get),
  ...createSizingSnapshotSlice(set),
}));
