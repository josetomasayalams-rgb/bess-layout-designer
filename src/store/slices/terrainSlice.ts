/**
 * terrainSlice — parametric-terrain preview + terrain-fit preview.
 *
 * Second slice extracted in Phase 12B (commit `phase12b.4`). Combines
 * two related but technically distinct concerns:
 *
 *   1. Preview terrain (5 actions, owned by `previewTerrain`).
 *      Lifecycle: createPreviewTerrain → updatePreviewTerrain ×N →
 *      movePreviewTerrainBy ×N → applyPreviewTerrain (commits into
 *      `polygon` + `anchor`) | cancelPreviewTerrain.
 *
 *   2. Terrain-fit preview (3 actions, owned by `terrainFitPreview`).
 *      Lifecycle: previewFitLayoutToTerrain → applyTerrainFitPreview
 *      (commits into `placedEquipment` + `cableRoutes` + `accessRoads`)
 *      | revertTerrainFitPreview.
 *
 * Both lifecycles produce ephemeral previews that the user can either
 * commit into the project (via apply) or discard (via cancel/revert).
 * Co-locating them keeps the cross-action invariants (e.g. starting one
 * preview resets the other) explicit at one site.
 *
 * Cross-slice writes (verified verbatim against the originals)
 * ------------------------------------------------------------
 *   - createPreviewTerrain: writes to `previewTerrain`, `interactionMode`,
 *     `pendingPlacementSpecId`, `layoutEdit`, `terrainFitPreview`.
 *   - applyPreviewTerrain (with `recordHistory`): writes to `polygon`,
 *     `anchor`, `previewTerrain`, `interactionMode`,
 *     `pendingPlacementSpecId`, `selectedEquipmentId`, `layoutEdit`,
 *     `terrainFitPreview`.
 *   - previewFitLayoutToTerrain: writes to `lastRepairResult`,
 *     `terrainFitPreview`, `interactionMode`, `pendingPlacementSpecId`,
 *     `selectedEquipmentId`, `layoutEdit`.
 *   - applyTerrainFitPreview (with `recordHistory`): writes to
 *     `placedEquipment`, `cableRoutes`, `accessRoads`,
 *     `selectedEquipmentId`, `pendingPlacementSpecId`, `interactionMode`,
 *     `layoutEdit`, `terrainFitPreview`.
 *
 * The full `ProjectState`-typed `set` accepts these cross-slice partial
 * writes safely. Behavior is byte-equivalent to the pre-extraction
 * code at HEAD `ca6ab48`.
 *
 * Cross-slice reads
 * -----------------
 *   - createPreviewTerrain reads `state.mapViewCenter` (polygonSlice),
 *     `state.polygon` (polygonSlice), `state.anchor` (polygonSlice),
 *     with DEFAULT_CONCEPTUAL_LAYOUT_POINT as the final fallback.
 *   - previewFitLayoutToTerrain reads `state.placedEquipment`,
 *     `state.anchor`, `state.polygon`, `state.fireSafetyZones`,
 *     `state.poi`.
 *
 * Slice factory signature
 * -----------------------
 * Plain function with explicit `StoreApi<ProjectState>` types, same
 * pattern as `polygonSlice.ts`. `get` is required here because several
 * preview actions read upstream state; in contrast to polygonSlice
 * which only used `set`.
 *
 * Import discipline
 * -----------------
 * Imports from external (`zustand`, `@/lib/layout/fitLayoutToTerrain`,
 * `@/lib/terrain/parametricTerrain`) plus `../projectStore.types` and
 * `../projectStore.history`. Does NOT import from `../projectStore`.
 */

import type { StoreApi } from "zustand";
import type { LngLat } from "@/types/geometry";
import { fitLayoutToTerrain } from "@/lib/layout/fitLayoutToTerrain";
import {
  generateParametricTerrain,
  rotateParametricTerrainPreview,
  translateParametricTerrainPreview,
  type ParametricTerrainInput,
} from "@/lib/terrain/parametricTerrain";
import type { LayoutRepairRules } from "@/lib/layout/layoutRepair";
import {
  DEFAULT_CONCEPTUAL_LAYOUT_POINT,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type PreviewTerrainState,
  type ProjectState,
  type TerrainFitPreviewState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type TerrainSlice = {
  previewTerrain: PreviewTerrainState;
  terrainFitPreview: TerrainFitPreviewState;

  // Parametric-terrain preview lifecycle
  createPreviewTerrain: (
    input: Omit<ParametricTerrainInput, "center"> & { center?: LngLat | null }
  ) => void;
  updatePreviewTerrain: (
    input: Partial<Omit<ParametricTerrainInput, "center">>
  ) => void;
  movePreviewTerrainBy: (delta: { x_m: number; y_m: number }) => void;
  applyPreviewTerrain: () => void;
  cancelPreviewTerrain: () => void;

  // Terrain-fit preview lifecycle
  previewFitLayoutToTerrain: (rules: LayoutRepairRules) => void;
  applyTerrainFitPreview: () => void;
  revertTerrainFitPreview: () => void;
};

export function createTerrainSlice(
  set: StoreApi<ProjectState>["setState"],
): TerrainSlice {
  return {
    previewTerrain: null,
    terrainFitPreview: emptyTerrainFitPreviewState,

    createPreviewTerrain: (input) =>
      set((state) => {
        const center =
          input.center ??
          state.mapViewCenter ??
          (state.polygon[0]
            ? state.polygon[0]
            : state.anchor
              ? { lng: state.anchor.lng0, lat: state.anchor.lat0 }
              : DEFAULT_CONCEPTUAL_LAYOUT_POINT);
        return {
          previewTerrain: generateParametricTerrain({ ...input, center }),
          interactionMode: "select",
          pendingPlacementSpecId: null,
          layoutEdit: emptyLayoutEditState,
          terrainFitPreview: emptyTerrainFitPreviewState,
        };
      }),

    updatePreviewTerrain: (input) =>
      set((state) => {
        if (!state.previewTerrain) return {};
        const isRotationOnly =
          input.rotationDeg !== undefined &&
          input.shape === undefined &&
          input.sizingMode === undefined &&
          input.areaHa === undefined &&
          input.lengthM === undefined &&
          input.widthM === undefined &&
          input.aspectRatio === undefined &&
          input.vertexCount === undefined;

        if (isRotationOnly) {
          return {
            previewTerrain: rotateParametricTerrainPreview(
              state.previewTerrain,
              input.rotationDeg as number
            ),
          };
        }

        return {
          previewTerrain: generateParametricTerrain({
            shape: input.shape ?? state.previewTerrain.shape,
            sizingMode: input.sizingMode ?? state.previewTerrain.sizingMode,
            center: state.previewTerrain.center,
            areaHa: input.areaHa ?? state.previewTerrain.areaHa,
            lengthM: input.lengthM ?? state.previewTerrain.lengthM,
            widthM: input.widthM ?? state.previewTerrain.widthM,
            aspectRatio: input.aspectRatio ?? state.previewTerrain.aspectRatio,
            vertexCount: input.vertexCount ?? state.previewTerrain.vertexCount,
            rotationDeg: input.rotationDeg ?? state.previewTerrain.rotationDeg,
          }),
        };
      }),

    movePreviewTerrainBy: (delta) =>
      set((state) => {
        if (!state.previewTerrain) return {};
        return {
          previewTerrain: translateParametricTerrainPreview(
            state.previewTerrain,
            delta
          ),
        };
      }),

    applyPreviewTerrain: () =>
      set((state) => {
        if (!state.previewTerrain) return {};
        return {
          ...recordHistory(state),
          polygon: state.previewTerrain.polygon,
          anchor: {
            lng0: state.previewTerrain.center.lng,
            lat0: state.previewTerrain.center.lat,
          },
          previewTerrain: null,
          interactionMode: "select",
          pendingPlacementSpecId: null,
          selectedEquipmentId: null,
          layoutEdit: emptyLayoutEditState,
          terrainFitPreview: emptyTerrainFitPreviewState,
        };
      }),

    cancelPreviewTerrain: () => set({ previewTerrain: null }),

    previewFitLayoutToTerrain: (rules) =>
      set((state) => {
        const result = fitLayoutToTerrain({
          placed: state.placedEquipment,
          anchor: state.anchor,
          polygon: state.polygon,
          rules,
          blockedAreas: state.fireSafetyZones.map((zone) => zone.polygon),
          poiExists: state.poi !== null,
        });

        if (result.status === "error") {
          return {
            lastRepairResult: null,
            terrainFitPreview: {
              draftPlacedEquipment: null,
              result,
            },
          };
        }

        return {
          interactionMode: "select",
          pendingPlacementSpecId: null,
          selectedEquipmentId: null,
          layoutEdit: emptyLayoutEditState,
          terrainFitPreview: {
            draftPlacedEquipment: result.placed,
            result,
          },
        };
      }),

    applyTerrainFitPreview: () =>
      set((state) => {
        if (!state.terrainFitPreview.draftPlacedEquipment) return {};
        const result = state.terrainFitPreview.result;
        return {
          ...recordHistory(state),
          placedEquipment: state.terrainFitPreview.draftPlacedEquipment,
          cableRoutes: result?.cableRoutes ?? [],
          accessRoads: result?.accessRoads ?? [],
          selectedEquipmentId: null,
          pendingPlacementSpecId: null,
          interactionMode: "select",
          layoutEdit: emptyLayoutEditState,
          terrainFitPreview: emptyTerrainFitPreviewState,
        };
      }),

    revertTerrainFitPreview: () =>
      set({
        terrainFitPreview: emptyTerrainFitPreviewState,
      }),
  };
}
