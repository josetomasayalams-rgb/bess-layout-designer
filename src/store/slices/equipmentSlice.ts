/**
 * equipmentSlice — equipment placement and basic equipment selection.
 *
 * Extracted as Phase 12B.6a to keep placement core separate from bulk
 * layout tools, V1.2 electrical architecture loaders, layout-edit,
 * comparison, and lifecycle actions.
 *
 * Import discipline: this slice imports only external dependencies,
 * `../projectStore.types`, and `../projectStore.history`. It does not
 * import from `../projectStore`.
 */

import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { LngLat } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import {
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type EquipmentSlice = {
  placedEquipment: PlacedEquipment[];
  pendingPlacementSpecId: string | null;
  selectedEquipmentId: string | null;
  selectedCaseStudyId: string | null;
  lastToolResult: ProjectState["lastToolResult"];
  lastRepairResult: ProjectState["lastRepairResult"];

  setPlacementSpec: (specId: string | null) => void;
  placeEquipmentAt: (p: LngLat) => void;
  clearToolResult: () => void;
  clearRepairResult: () => void;
  removeEquipment: (id: string) => void;
  rotateEquipment: (id: string, deltaDeg: number) => void;
  selectEquipment: (id: string | null) => void;
  selectCaseStudy: (id: string | null) => void;
};

export function createEquipmentSlice(
  set: StoreApi<ProjectState>["setState"],
  get: StoreApi<ProjectState>["getState"],
): EquipmentSlice {
  return {
    placedEquipment: [],
    pendingPlacementSpecId: null,
    selectedEquipmentId: null,
    selectedCaseStudyId: null,
    lastToolResult: null,
    lastRepairResult: null,

    setPlacementSpec: (specId) =>
      set({
        pendingPlacementSpecId: specId,
        interactionMode: specId ? "place-equipment" : "select",
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      }),

    placeEquipmentAt: (p) => {
      const { pendingPlacementSpecId, anchor } = get();
      if (!pendingPlacementSpecId) return;
      const spec = equipmentCatalog.find((e) => e.id === pendingPlacementSpecId);
      if (!spec) return;
      set((state) => ({
        ...recordHistory(state),
        placedEquipment: [
          ...state.placedEquipment,
          {
            id: nanoid(8),
            equipmentSpecId: pendingPlacementSpecId,
            anchor: p,
            rotation_deg: 0,
            sourceReliability: spec.source.reliability,
          },
        ],
        anchor: anchor ?? { lng0: p.lng, lat0: p.lat },
        cableRoutes: [],
        accessRoads: [],
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      }));
    },

    clearToolResult: () => set({ lastToolResult: null }),

    clearRepairResult: () => set({ lastRepairResult: null }),

    removeEquipment: (id) =>
      set((state) => ({
        ...recordHistory(state),
        placedEquipment: state.placedEquipment.filter((e) => e.id !== id),
        cableRoutes: [],
        accessRoads: [],
        selectedEquipmentId:
          state.selectedEquipmentId === id ? null : state.selectedEquipmentId,
        layoutEdit: {
          ...state.layoutEdit,
          selectedIds: state.layoutEdit.selectedIds.filter((item) => item !== id),
          draftPlacedEquipment: state.layoutEdit.draftPlacedEquipment?.filter(
            (item) => item.id !== id
          ) ?? null,
        },
        terrainFitPreview: emptyTerrainFitPreviewState,
        previewTerrain: null,
      })),

    rotateEquipment: (id, deltaDeg) =>
      set((state) => ({
        ...recordHistory(state),
        placedEquipment: state.placedEquipment.map((e) =>
          e.id === id ? { ...e, rotation_deg: (e.rotation_deg + deltaDeg) % 360 } : e
        ),
        cableRoutes: [],
        accessRoads: [],
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      })),

    selectEquipment: (id) => set({ selectedEquipmentId: id }),

    selectCaseStudy: (id) => set({ selectedCaseStudyId: id }),
  };
}
