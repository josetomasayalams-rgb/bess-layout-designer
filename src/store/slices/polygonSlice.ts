/**
 * polygonSlice — site-polygon drawing and map view center.
 *
 * First slice extracted in Phase 12B (commit `phase12b.3`). Establishes
 * the pattern for the remaining slices (terrain, repair-zone, equipment,
 * layout-edit, comparison, lifecycle):
 *
 *   - One file per functional group under `src/store/slices/`.
 *   - Each slice exposes its `SliceShape` type (state + actions) and a
 *     `createXxxSlice` factory.
 *   - Factory signature: `(set, get): SliceShape` where `set`/`get` are
 *     `StoreApi<ProjectState>['setState' | 'getState']`. This keeps the
 *     outer `create<ProjectState>((set, get) => ({ ... }))` call in
 *     `projectStore.ts` byte-equivalent in shape — the inner creator
 *     just spreads `...createPolygonSlice(set, get)` instead of
 *     declaring the polygon state inline.
 *   - Slice writes touch fields owned by OTHER slices (e.g.
 *     `startDrawingPolygon` also resets `layoutEdit` and
 *     `previewTerrain`); the `ProjectState`-typed `set` accepts these
 *     cross-slice partial writes safely. This is intentional and
 *     documented in `projectStore.history-invariants.test.ts`
 *     (the slice-isolation test asserts that committed equipment is
 *     NOT deleted by `startDrawingPolygon`, but explicitly accepts
 *     the resets of ephemeral state as production behavior).
 *
 * Why a plain factory instead of `ProjectSliceCreator<PolygonSlice>`
 * ----------------------------------------------------------------
 * Zustand's `StateCreator` takes a third `api` argument that the
 * existing `create<ProjectState>((set, get) => ({ ... }))` call in
 * `projectStore.ts` does not currently pass through. Switching to the
 * v5 curried form `create<T>()(creator)` would technically work but
 * triggers stricter return-type inference that would fight the partial
 * spread pattern this commit needs.
 *
 * Using `StoreApi<ProjectState>['setState' | 'getState']` directly is
 * type-safe, requires no change to the outer `create()` call, and is
 * forward-compatible with `ProjectSliceCreator<TSlice>` (which other
 * slices can adopt later if/when the composition root migrates to the
 * curried form).
 *
 * Cross-slice helpers used here
 * -----------------------------
 *   - `recordHistory` from `../projectStore.history` — invoked
 *     verbatim, with the same call-site ordering as the original
 *     inline implementation.
 *   - `emptyLayoutEditState`, `emptyTerrainFitPreviewState`,
 *     `DEFAULT_CONCEPTUAL_LAYOUT_POINT` from `../projectStore.types`.
 *
 * Import discipline
 * -----------------
 * This file imports ONLY from:
 *   - external (`zustand`, `@/types/geometry`)
 *   - `../projectStore.types` (canonical state shape + constants)
 *   - `../projectStore.history` (history helpers)
 * It does NOT import from `../projectStore` (would create a cycle).
 */

import type { StoreApi } from "zustand";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import {
  DEFAULT_CONCEPTUAL_LAYOUT_POINT,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type PolygonSlice = {
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  mapViewCenter: LngLat | null;

  startDrawingPolygon: () => void;
  addPolygonVertex: (p: LngLat) => void;
  finishPolygon: () => void;
  clearPolygon: () => void;
  setPolygonFromCoordinates: (vertices: LngLat[]) => void;
  setMapViewCenter: (center: LngLat) => void;
};

export function createPolygonSlice(
  set: StoreApi<ProjectState>["setState"],
): PolygonSlice {
  return {
    anchor: null,
    polygon: [],
    mapViewCenter: DEFAULT_CONCEPTUAL_LAYOUT_POINT,

    startDrawingPolygon: () =>
      set((state) => ({
        ...recordHistory(state),
        interactionMode: "draw-site",
        polygon: [],
        anchor: null,
        previewTerrain: null,
        selectedEquipmentId: null,
        pendingPlacementSpecId: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      })),

    addPolygonVertex: (p) =>
      set((state) => {
        const anchor = state.anchor ?? { lng0: p.lng, lat0: p.lat };
        return { polygon: [...state.polygon, p], anchor };
      }),

    finishPolygon: () => set({ interactionMode: "select" }),

    clearPolygon: () =>
      set((state) => ({
        ...recordHistory(state),
        polygon: [],
        interactionMode: "select",
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      })),

    setPolygonFromCoordinates: (vertices) =>
      set((state) => {
        // Drop a trailing vertex that merely repeats the first (already-closed
        // input); the working polygon is implicitly closed by the renderer.
        const cleaned = [...vertices];
        if (cleaned.length >= 2) {
          const first = cleaned[0];
          const last = cleaned[cleaned.length - 1];
          if (first.lng === last.lng && first.lat === last.lat) {
            cleaned.pop();
          }
        }
        if (cleaned.length < 3) return {};

        const centroidLng =
          cleaned.reduce((sum, p) => sum + p.lng, 0) / cleaned.length;
        const centroidLat =
          cleaned.reduce((sum, p) => sum + p.lat, 0) / cleaned.length;

        return {
          ...recordHistory(state),
          polygon: cleaned,
          anchor: { lng0: cleaned[0].lng, lat0: cleaned[0].lat },
          mapViewCenter: { lng: centroidLng, lat: centroidLat },
          interactionMode: "select",
          previewTerrain: null,
          selectedEquipmentId: null,
          pendingPlacementSpecId: null,
          layoutEdit: emptyLayoutEditState,
          terrainFitPreview: emptyTerrainFitPreviewState,
        };
      }),

    setMapViewCenter: (center) => set({ mapViewCenter: center }),
  };
}
