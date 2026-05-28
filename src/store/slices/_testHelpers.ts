/**
 * Phase 14.2 — shared helpers for slice tests.
 *
 * Test-only utilities (kept under `slices/` so they live next to the
 * tests that consume them). NOT imported by any production code.
 */

import { useProjectStore } from "@/store/projectStore";
import { DEFAULT_CONCEPTUAL_LAYOUT_POINT } from "@/store/projectStore.types";

/**
 * Reset `useProjectStore` to the documented empty baseline. Mirrors the
 * pattern in `projectStore.test.ts` so test files stay byte-equivalent
 * in shape.
 *
 * `setState` with a partial replaces the listed fields only — actions
 * are preserved.
 */
export function resetProjectStore(): void {
  useProjectStore.setState({
    anchor: null,
    polygon: [],
    repairZone: [],
    previewTerrain: null,
    mapViewCenter: DEFAULT_CONCEPTUAL_LAYOUT_POINT,
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
    comparison: { A: null, B: null },
    cableRoutes: [],
    accessRoads: [],
    fireSafetyZones: [],
    past: [],
    future: [],
  });
}
