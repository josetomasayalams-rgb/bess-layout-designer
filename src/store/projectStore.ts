import { create } from "zustand";
import { nanoid } from "nanoid";
import { createDemoProject } from "@/lib/layout/demoProject";
import { repairLayout as runLayoutRepair } from "@/lib/layout/layoutRepair";
import {
  moveSelectedEquipment,
  orientSelectedEquipment,
  rotateSelectedEquipment,
  setEquipmentLock,
} from "@/lib/layout/layoutEditing";

import {
  emptyComparison,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "./projectStore.types";
import {
  HISTORY_LIMIT,
  recordHistory,
  snapshotOf,
} from "./projectStore.history";
import { createEquipmentSlice } from "./slices/equipmentSlice";
import { createPolygonSlice } from "./slices/polygonSlice";
import { createRepairZoneSlice } from "./slices/repairZoneSlice";
import { createTerrainSlice } from "./slices/terrainSlice";

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
  interactionMode: "select",
  layoutEdit: emptyLayoutEditState,
  comparison: emptyComparison,
  past: [],
  future: [],

  startLayoutEdit: () =>
    set({
      interactionMode: "edit-layout",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      previewTerrain: null,
      terrainFitPreview: emptyTerrainFitPreviewState,
    }),

  cancelLayoutEdit: () =>
    set({
      interactionMode: "select",
      layoutEdit: emptyLayoutEditState,
    }),

  setLayoutEditSelection: (ids, selectionPolygon) =>
    set((state) => ({
      interactionMode: "edit-layout",
      pendingPlacementSpecId: null,
      selectedEquipmentId: ids.length === 1 ? ids[0] : null,
      layoutEdit: {
        selectedIds: ids,
        selectionPolygon,
        draftPlacedEquipment: state.layoutEdit.draftPlacedEquipment,
        lastValidationAt: null,
      },
      lastRepairResult: ids.length === 0 ? state.lastRepairResult : null,
    })),

  clearLayoutEditSelection: () =>
    set((state) => ({
      selectedEquipmentId: null,
      layoutEdit: {
        ...emptyLayoutEditState,
        draftPlacedEquipment: state.layoutEdit.draftPlacedEquipment,
      },
    })),

  previewRotateSelection: (deltaDeg) =>
    set((state) => {
      if (state.layoutEdit.selectedIds.length === 0) return {};
      const source = state.layoutEdit.draftPlacedEquipment ?? state.placedEquipment;
      return {
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: rotateSelectedEquipment(
            source,
            state.layoutEdit.selectedIds,
            deltaDeg
          ),
          lastValidationAt: null,
        },
      };
    }),

  previewOrientSelection: (rotationDeg) =>
    set((state) => {
      if (state.layoutEdit.selectedIds.length === 0) return {};
      const source = state.layoutEdit.draftPlacedEquipment ?? state.placedEquipment;
      return {
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: orientSelectedEquipment(
            source,
            state.layoutEdit.selectedIds,
            rotationDeg
          ),
          lastValidationAt: null,
        },
      };
    }),

  previewMoveSelection: (delta) =>
    set((state) => {
      if (state.layoutEdit.selectedIds.length === 0) return {};
      const source = state.layoutEdit.draftPlacedEquipment ?? state.placedEquipment;
      return {
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: moveSelectedEquipment(
            source,
            state.layoutEdit.selectedIds,
            state.anchor,
            delta
          ),
          lastValidationAt: null,
        },
      };
    }),

  setSelectionLocked: (locked) =>
    set((state) => {
      const ids = state.layoutEdit.selectedIds;
      if (ids.length === 0) return {};
      return {
        ...recordHistory(state),
        placedEquipment: setEquipmentLock(state.placedEquipment, ids, locked),
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: state.layoutEdit.draftPlacedEquipment
            ? setEquipmentLock(state.layoutEdit.draftPlacedEquipment, ids, locked)
            : null,
        },
      };
    }),

  previewRepairSelection: (rules) =>
    set((state) => {
      if (state.layoutEdit.selectedIds.length === 0) return {};
      const source = state.layoutEdit.draftPlacedEquipment ?? state.placedEquipment;
      const hasLasso = state.layoutEdit.selectionPolygon.length >= 3;
      const selectedSet = new Set(state.layoutEdit.selectedIds);
      // Without a lasso polygon (click-selection), freeze everything outside
      // the explicit selection so the engine only relaxes the picked items.
      const lockedIds = Array.from(
        new Set([
          ...source.filter((item) => item.locked).map((item) => item.id),
          ...(hasLasso
            ? []
            : source
                .filter((item) => !selectedSet.has(item.id))
                .map((item) => item.id)),
        ])
      );
      const result = runLayoutRepair({
        placed: source,
        anchor: state.anchor,
        polygon: state.polygon,
        rules,
        repairZone: state.layoutEdit.selectionPolygon,
        lockedIds,
      });

      if (result.status === "error") {
        return { lastRepairResult: result };
      }

      return {
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: result.placed,
          lastValidationAt: null,
        },
        lastRepairResult: result,
      };
    }),

  previewCompactSelection: (rules) =>
    set((state) => {
      if (state.layoutEdit.selectedIds.length === 0) return {};
      const source = state.layoutEdit.draftPlacedEquipment ?? state.placedEquipment;
      const hasLasso = state.layoutEdit.selectionPolygon.length >= 3;
      const selectedSet = new Set(state.layoutEdit.selectedIds);
      const lockedIds = Array.from(
        new Set([
          ...source.filter((item) => item.locked).map((item) => item.id),
          ...(hasLasso
            ? []
            : source
                .filter((item) => !selectedSet.has(item.id))
                .map((item) => item.id)),
        ])
      );
      const result = runLayoutRepair({
        placed: source,
        anchor: state.anchor,
        polygon: state.polygon,
        rules,
        repairZone: state.layoutEdit.selectionPolygon,
        lockedIds,
        compaction: { strengthMPerIter: 0.4, iterations: 120 },
      });

      if (result.status === "error") {
        return { lastRepairResult: result };
      }

      return {
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: result.placed,
          lastValidationAt: null,
        },
        lastRepairResult: result,
      };
    }),

  markLayoutEditValidated: () =>
    set((state) => ({
      layoutEdit: {
        ...state.layoutEdit,
        lastValidationAt: new Date().toISOString(),
      },
    })),

  revertLayoutEdit: () =>
    set((state) => ({
      layoutEdit: {
        ...state.layoutEdit,
        draftPlacedEquipment: null,
        lastValidationAt: null,
      },
      terrainFitPreview: emptyTerrainFitPreviewState,
    })),

  applyLayoutEdit: () =>
    set((state) => {
      if (!state.layoutEdit.draftPlacedEquipment) return {};
      return {
        ...recordHistory(state),
        placedEquipment: state.layoutEdit.draftPlacedEquipment,
        cableRoutes: [],
        accessRoads: [],
        selectedEquipmentId:
          state.layoutEdit.selectedIds.length === 1
            ? state.layoutEdit.selectedIds[0]
            : null,
        layoutEdit: {
          ...state.layoutEdit,
          draftPlacedEquipment: null,
          lastValidationAt: null,
        },
        terrainFitPreview: emptyTerrainFitPreviewState,
      };
    }),

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

  setMode: (mode) =>
    set({
      interactionMode: mode,
      pendingPlacementSpecId: mode === "place-equipment" ? get().pendingPlacementSpecId : null,
      layoutEdit: mode === "edit-layout" ? get().layoutEdit : emptyLayoutEditState,
      terrainFitPreview:
        mode === "edit-layout" ? emptyTerrainFitPreviewState : get().terrainFitPreview,
    }),

  loadDemoProject: () => {
    const demo = createDemoProject();
    set((state) => ({
      ...recordHistory(state),
      anchor: demo.anchor,
      polygon: demo.polygon,
      repairZone: [],
      placedEquipment: demo.placedEquipment,
      cableRoutes: [],
      accessRoads: [],
      previewTerrain: null,
      interactionMode: "select",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      selectedCaseStudyId: null,
      lastToolResult: null,
      lastRepairResult: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
      comparison: emptyComparison,
    }));
  },

  resetProject: () =>
    set((state) => ({
      ...recordHistory(state),
      anchor: null,
      polygon: [],
      repairZone: [],
      previewTerrain: null,
      placedEquipment: [],
      cableRoutes: [],
      accessRoads: [],
      interactionMode: "select",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      selectedCaseStudyId: null,
      lastToolResult: null,
      lastRepairResult: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
      comparison: emptyComparison,
    })),

  undo: () =>
    set((state) => {
      if (state.past.length === 0) return {};
      const previous = state.past[state.past.length - 1];
      return {
        anchor: previous.anchor,
        polygon: previous.polygon,
        placedEquipment: previous.placedEquipment,
        cableRoutes: previous.cableRoutes,
        accessRoads: previous.accessRoads,
        previewTerrain: null,
        past: state.past.slice(0, -1),
        future: [snapshotOf(state), ...state.future].slice(0, HISTORY_LIMIT),
        selectedEquipmentId: null,
        pendingPlacementSpecId: null,
        interactionMode: "select",
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {};
      const next = state.future[0];
      return {
        anchor: next.anchor,
        polygon: next.polygon,
        placedEquipment: next.placedEquipment,
        cableRoutes: next.cableRoutes,
        accessRoads: next.accessRoads,
        previewTerrain: null,
        past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        selectedEquipmentId: null,
        pendingPlacementSpecId: null,
        interactionMode: "select",
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      };
    }),
}));
