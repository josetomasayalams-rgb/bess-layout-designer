/**
 * Phase 12B — Protective behavioral invariants for {@link useProjectStore}.
 *
 * Why this exists
 * ---------------
 * Companion to `projectStore.contract.test.ts` (commit phase12b.0a, which
 * pins the public surface — action names, state field names, exported types).
 * This file pins the **behavior** that the slice extraction must preserve:
 *
 *   1. History depth invariant — `place 3 → undo 2 → redo 1` produces a
 *      deterministic `(placedEquipment, past, future)` triple.
 *   2. Slice isolation — a polygon-mode action does not delete committed
 *      equipment; a layout-edit selection action does not mutate `polygon`
 *      or `cableRoutes`.
 *   3. Cross-slice read — `placeEquipmentAt` consumes anchor seeded by the
 *      polygon-drawing flow, proving that slices may read each other's
 *      state today and must continue to after slicing.
 *
 * After Phase 12B splits `projectStore.ts` into per-domain slices, these
 * invariants will only stay green if the slice composition preserves:
 *   - the `recordHistory` ordering inside `placeEquipmentAt` and friends,
 *   - the "write only my slice, read any slice" rule documented in
 *     `docs/phase-12-architect-plan.md` § Appendix A (12B row),
 *   - the `anchor` cross-slice read inside `placeEquipmentAt`.
 *
 * Scope discipline
 * ----------------
 * This test exercises the **current production behavior** of
 * `projectStore.ts` at HEAD `77355dd`. Where the implementation does
 * MORE than its name suggests (e.g. `startDrawingPolygon` also resets
 * `layoutEdit`, `previewTerrain`, etc.), the tests document the actual
 * scope of the reset and only assert the genuine slice-isolation invariant
 * (committed equipment is not deleted). They do NOT pretend the action is
 * pure to its name.
 *
 * No store internals are imported (no `recordHistory`, no `snapshotOf`,
 * no `HISTORY_LIMIT`). Only the public `useProjectStore` is used. This
 * lets the slice extraction commits move these helpers freely without
 * invalidating the test.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { CableRoute } from "@/types/cable";
import type { LngLat } from "@/types/geometry";

const specId = equipmentCatalog[0].id;

/**
 * Reset to a clean state. Mirrors the helper in `projectStore.test.ts`
 * verbatim so both test files exercise the same baseline. Zustand's
 * `setState` shallow-merges, so omitted keys keep their store defaults.
 */
function resetStore() {
  useProjectStore.setState({
    anchor: null,
    polygon: [],
    repairZone: [],
    previewTerrain: null,
    mapViewCenter: { lng: -70.6483, lat: -33.4569 },
    placedEquipment: [],
    interactionMode: "select",
    pendingPlacementSpecId: null,
    selectedEquipmentId: null,
    selectedCaseStudyId: null,
    lastToolResult: null,
    lastRepairResult: null,
    layoutEdit: {
      selectedIds: [],
      selectionPolygon: [],
      draftPlacedEquipment: null,
      lastValidationAt: null,
    },
    terrainFitPreview: {
      draftPlacedEquipment: null,
      result: null,
    },
    cableRoutes: [],
    accessRoads: [],
    fireSafetyZones: [],
    past: [],
    future: [],
  });
}

/** Place N pieces of equipment via the real `setPlacementSpec` →
 *  `placeEquipmentAt` action pair, just like `projectStore.test.ts`. */
function place(count: number) {
  for (let index = 0; index < count; index++) {
    useProjectStore.getState().setPlacementSpec(specId);
    useProjectStore
      .getState()
      .placeEquipmentAt({ lng: -70 + index * 0.001, lat: -33 });
  }
}

describe("projectStore — Phase 12B history invariants", () => {
  beforeEach(resetStore);

  it("place 3 → undo 2 → redo 1 yields the documented (placed, past, future) sequence", () => {
    // Baseline.
    expect(useProjectStore.getState().placedEquipment).toHaveLength(0);
    expect(useProjectStore.getState().past).toHaveLength(0);
    expect(useProjectStore.getState().future).toHaveLength(0);

    // place 3 — every `placeEquipmentAt` records history once.
    // `setPlacementSpec` itself does NOT call `recordHistory`
    // (verified by reading projectStore.ts line 451-458); only the
    // three `placeEquipmentAt` calls do. Hence past = 3.
    place(3);
    expect(useProjectStore.getState().placedEquipment).toHaveLength(3);
    expect(useProjectStore.getState().past).toHaveLength(3);
    expect(useProjectStore.getState().future).toHaveLength(0);

    // undo #1: pop past → push current to future → restore snapshot.
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(2);
    expect(useProjectStore.getState().past).toHaveLength(2);
    expect(useProjectStore.getState().future).toHaveLength(1);

    // undo #2.
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(1);
    expect(useProjectStore.getState().past).toHaveLength(1);
    expect(useProjectStore.getState().future).toHaveLength(2);

    // redo #1: pop future → push current to past → restore.
    useProjectStore.getState().redo();
    expect(useProjectStore.getState().placedEquipment).toHaveLength(2);
    expect(useProjectStore.getState().past).toHaveLength(2);
    expect(useProjectStore.getState().future).toHaveLength(1);
  });
});

describe("projectStore — Phase 12B slice isolation", () => {
  beforeEach(resetStore);

  it("startDrawingPolygon does NOT delete committed equipment", () => {
    // Place two committed pieces of equipment.
    place(2);
    const committedBefore = useProjectStore.getState().placedEquipment;
    const idsBefore = committedBefore.map((e) => e.id);
    expect(idsBefore).toHaveLength(2);

    // `layoutEdit.selectedIds` is intentionally [] at this point — no
    // selection has been started. This lets us also assert it stays [].
    expect(useProjectStore.getState().layoutEdit.selectedIds).toEqual([]);

    // Trigger polygon-mode entry.
    useProjectStore.getState().startDrawingPolygon();

    // Slice-isolation invariant: committed equipment list is untouched.
    // (Mode, ephemeral preview state, and layoutEdit ARE reset by
    // startDrawingPolygon; that is documented production behavior, not a
    // slice-isolation violation. See projectStore.ts lines 307-318.)
    const committedAfter = useProjectStore.getState().placedEquipment;
    expect(committedAfter).toHaveLength(2);
    expect(committedAfter.map((e) => e.id)).toEqual(idsBefore);

    // The selectedIds field also remains [] because no selection was
    // active before the action. This documents that the action's reset
    // of layoutEdit does not "leak" non-empty selection state.
    expect(useProjectStore.getState().layoutEdit.selectedIds).toEqual([]);
  });

  it("setLayoutEditSelection does NOT mutate polygon or cableRoutes", () => {
    // Set up a non-trivial polygon and a non-empty cableRoutes list so
    // the assertions are meaningful (otherwise [] === [] passes vacuously).
    place(1);
    const id = useProjectStore.getState().placedEquipment[0].id;
    const fixturePolygon: LngLat[] = [
      { lng: -70.001, lat: -33.001 },
      { lng: -69.999, lat: -33.001 },
      { lng: -69.999, lat: -32.999 },
      { lng: -70.001, lat: -32.999 },
    ];
    const fixtureCables: CableRoute[] = [
      {
        id: "fixture-cable-1",
        voltageLevel: "BT",
        fromEntityId: id,
        toEntityId: id,
        path: [
          { x_m: 0, y_m: 0 },
          { x_m: 10, y_m: 0 },
        ],
        corridorWidth_m: 1,
      },
    ];
    useProjectStore.setState({
      polygon: fixturePolygon,
      cableRoutes: fixtureCables,
    });

    const polygonBefore = useProjectStore.getState().polygon;
    const cablesBefore = useProjectStore.getState().cableRoutes;

    // Call setLayoutEditSelection with the real signature
    // (ids: string[], selectionPolygon: LngLat[]) — see projectStore.ts
    // line 786.
    useProjectStore
      .getState()
      .setLayoutEditSelection([id], fixturePolygon);

    // Slice-isolation invariant: polygon and cableRoutes are deeply
    // unchanged by a layout-edit-selection action.
    expect(useProjectStore.getState().polygon).toEqual(polygonBefore);
    expect(useProjectStore.getState().cableRoutes).toEqual(cablesBefore);
  });
});

describe("projectStore — Phase 12B cross-slice read", () => {
  beforeEach(resetStore);

  it("placeEquipmentAt consumes anchor seeded by the polygon-drawing flow", () => {
    // Real polygon-drawing flow: startDrawingPolygon → addPolygonVertex × 4
    // → finishPolygon. The first addPolygonVertex sets `anchor` from the
    // vertex it receives (see projectStore.ts line 320-324). This is
    // exactly the cross-slice read that a future polygonSlice +
    // equipmentSlice composition must preserve.
    useProjectStore.getState().startDrawingPolygon();
    const v1: LngLat = { lng: -70, lat: -33 };
    const v2: LngLat = { lng: -69.999, lat: -33 };
    const v3: LngLat = { lng: -69.999, lat: -32.999 };
    const v4: LngLat = { lng: -70, lat: -32.999 };
    useProjectStore.getState().addPolygonVertex(v1);
    useProjectStore.getState().addPolygonVertex(v2);
    useProjectStore.getState().addPolygonVertex(v3);
    useProjectStore.getState().addPolygonVertex(v4);
    useProjectStore.getState().finishPolygon();

    // Anchor was set to first vertex.
    expect(useProjectStore.getState().anchor).toEqual({
      lng0: v1.lng,
      lat0: v1.lat,
    });
    expect(useProjectStore.getState().polygon).toHaveLength(4);

    // Now place equipment. placeEquipmentAt internally reads `anchor`
    // from get() and preserves it (it only re-seeds anchor when one
    // doesn't yet exist; see projectStore.ts line 461 + 477).
    const placementPoint: LngLat = { lng: -69.9995, lat: -32.9995 };
    useProjectStore.getState().setPlacementSpec(specId);
    useProjectStore.getState().placeEquipmentAt(placementPoint);

    const placed = useProjectStore.getState().placedEquipment;
    expect(placed).toHaveLength(1);
    expect(placed[0].anchor).toEqual(placementPoint);
    expect(placed[0].equipmentSpecId).toBe(specId);

    // The project anchor that was set by the polygon flow is preserved
    // (cross-slice read: equipmentSlice consumed it without overwriting).
    expect(useProjectStore.getState().anchor).toEqual({
      lng0: v1.lng,
      lat0: v1.lat,
    });
  });
});
