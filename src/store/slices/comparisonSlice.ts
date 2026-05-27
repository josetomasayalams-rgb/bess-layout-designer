/**
 * comparisonSlice — captured layout alternatives.
 *
 * Extracted in Phase 12B.8. This slice owns only comparison state and
 * alternative capture/clear/restore actions; lifecycle stays in the
 * projectStore composition root.
 *
 * Import discipline: imports only external dependencies,
 * `../projectStore.types`, and `../projectStore.history`. It does not
 * import from `../projectStore`.
 */

import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";
import {
  emptyComparison,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type ComparisonSlice = {
  comparison: ProjectState["comparison"];

  captureAlternative: ProjectState["captureAlternative"];
  clearAlternative: ProjectState["clearAlternative"];
  restoreAlternative: ProjectState["restoreAlternative"];
};

export function createComparisonSlice(
  set: StoreApi<ProjectState>["setState"],
): ComparisonSlice {
  return {
    comparison: emptyComparison,

    captureAlternative: (slot) =>
      set((state) => ({
        comparison: {
          ...state.comparison,
          [slot]: {
            id: nanoid(8),
            capturedAt: new Date().toISOString(),
            anchor: state.anchor,
            polygon: state.polygon,
            placedEquipment: state.placedEquipment,
          },
        },
      })),

    clearAlternative: (slot) =>
      set((state) => ({
        comparison: { ...state.comparison, [slot]: null },
      })),

    restoreAlternative: (slot) =>
      set((state) => {
        const alternative = state.comparison[slot];
        if (!alternative) return {};
        return {
          ...recordHistory(state),
          anchor: alternative.anchor,
          polygon: alternative.polygon,
          placedEquipment: alternative.placedEquipment,
          cableRoutes: [],
          accessRoads: [],
          previewTerrain: null,
          interactionMode: "select",
          pendingPlacementSpecId: null,
          selectedEquipmentId: null,
          layoutEdit: emptyLayoutEditState,
          terrainFitPreview: emptyTerrainFitPreviewState,
        };
      }),
  };
}
