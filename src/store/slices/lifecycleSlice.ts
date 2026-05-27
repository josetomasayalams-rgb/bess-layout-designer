/**
 * lifecycleSlice — interaction mode, demo/reset, and undo/redo lifecycle.
 *
 * Final slice extracted in Phase 12B. This file owns lifecycle state
 * and actions only; projectStore.ts remains the composition root.
 *
 * Import discipline: imports only external dependencies,
 * `../projectStore.types`, and `../projectStore.history`. It does not
 * import from `../projectStore`.
 */

import type { StoreApi } from "zustand";
import { createDemoProject } from "@/lib/layout/demoProject";
import {
  emptyComparison,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";
import {
  HISTORY_LIMIT,
  recordHistory,
  snapshotOf,
} from "../projectStore.history";

export type LifecycleSlice = {
  interactionMode: ProjectState["interactionMode"];
  past: ProjectState["past"];
  future: ProjectState["future"];

  setMode: ProjectState["setMode"];
  loadDemoProject: ProjectState["loadDemoProject"];
  resetProject: ProjectState["resetProject"];
  undo: ProjectState["undo"];
  redo: ProjectState["redo"];
};

export function createLifecycleSlice(
  set: StoreApi<ProjectState>["setState"],
  get: StoreApi<ProjectState>["getState"],
): LifecycleSlice {
  return {
    interactionMode: "select",
    past: [],
    future: [],

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
  };
}
