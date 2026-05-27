/**
 * repairZoneSlice — repair-zone drawing lifecycle.
 *
 * Third slice extracted in Phase 12B. Follows the plain factory pattern
 * established by polygonSlice and terrainSlice, while keeping cross-slice
 * resets byte-equivalent to the original inline implementation.
 *
 * Import discipline: this slice imports only external types and
 * `../projectStore.types`; it does not import from `../projectStore`.
 */

import type { StoreApi } from "zustand";
import type { LngLat } from "@/types/geometry";
import {
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";

export type RepairZoneSlice = {
  repairZone: LngLat[];

  startDrawingRepairZone: () => void;
  addRepairZoneVertex: (p: LngLat) => void;
  finishRepairZone: () => void;
  clearRepairZone: () => void;
};

export function createRepairZoneSlice(
  set: StoreApi<ProjectState>["setState"],
): RepairZoneSlice {
  return {
    repairZone: [],

    startDrawingRepairZone: () =>
      set({
        interactionMode: "draw-repair-zone",
        repairZone: [],
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      }),

    addRepairZoneVertex: (p) =>
      set((state) => ({ repairZone: [...state.repairZone, p] })),

    finishRepairZone: () => set({ interactionMode: "select" }),

    clearRepairZone: () =>
      set((state) => ({
        repairZone: [],
        interactionMode:
          state.interactionMode === "draw-repair-zone"
            ? "select"
            : state.interactionMode,
      })),
  };
}
