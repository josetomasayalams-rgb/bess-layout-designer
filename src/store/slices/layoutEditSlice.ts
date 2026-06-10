/**
 * layoutEditSlice — selection previews, lasso repair/compact, and apply.
 *
 * Extracted in Phase 12B.7. This slice owns only the layout-edit state
 * and actions; comparison and lifecycle actions stay in projectStore.ts.
 *
 * Import discipline: imports only external dependencies, lib helpers,
 * `../projectStore.types`, and `../projectStore.history`. It does not
 * import from `../projectStore`.
 */

import type { StoreApi } from "zustand";
import { repairLayout as runLayoutRepair } from "@/lib/layout/layoutRepair";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import { runSmartRepair } from "@/lib/layout/smartRepairIntegration";
import {
  moveSelectedEquipment,
  orientSelectedEquipment,
  rotateSelectedEquipment,
  setEquipmentLock,
} from "@/lib/layout/layoutEditing";
import {
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type LayoutEditSlice = {
  layoutEdit: ProjectState["layoutEdit"];

  startLayoutEdit: ProjectState["startLayoutEdit"];
  cancelLayoutEdit: ProjectState["cancelLayoutEdit"];
  setLayoutEditSelection: ProjectState["setLayoutEditSelection"];
  clearLayoutEditSelection: ProjectState["clearLayoutEditSelection"];
  previewRotateSelection: ProjectState["previewRotateSelection"];
  previewOrientSelection: ProjectState["previewOrientSelection"];
  previewMoveSelection: ProjectState["previewMoveSelection"];
  setSelectionLocked: ProjectState["setSelectionLocked"];
  previewRepairSelection: ProjectState["previewRepairSelection"];
  previewCompactSelection: ProjectState["previewCompactSelection"];
  markLayoutEditValidated: ProjectState["markLayoutEditValidated"];
  revertLayoutEdit: ProjectState["revertLayoutEdit"];
  applyLayoutEdit: ProjectState["applyLayoutEdit"];
};

export function createLayoutEditSlice(
  set: StoreApi<ProjectState>["setState"],
): LayoutEditSlice {
  return {
    layoutEdit: emptyLayoutEditState,

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
        const result = runSmartRepair({
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
        const infrastructure = generateConceptualPhysicalInfrastructure({
          placed: state.layoutEdit.draftPlacedEquipment,
          anchor: state.anchor,
          polygon: state.polygon,
        });
        return {
          ...recordHistory(state),
          placedEquipment: state.layoutEdit.draftPlacedEquipment,
          cableRoutes: infrastructure.cableRoutes,
          accessRoads: infrastructure.accessRoads,
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
  };
}
