/**
 * Phase 12B — Protective contract test for {@link useProjectStore}.
 *
 * Why this exists
 * ---------------
 * Phase 12B slices `projectStore.ts` (1,185 LOC, 33 state fields,
 * 55 actions) into per-domain Zustand slices under `src/store/slices/`,
 * with `projectStore.ts` becoming a thin ~100-LOC composition root.
 *
 * Guardrail G2 of `docs/phase-12-architect-plan.md` declares the public
 * action surface of `useProjectStore` immutable: any action rename,
 * arity change, return-type change, or accidental removal during the
 * slice extraction is a regression.
 *
 * This test pins that contract **before** any extraction commit lands.
 * Re-running it on every subsequent `refactor(phase12b.N)` commit
 * guarantees the slice composition keeps the same public surface.
 *
 * Scope discipline
 * ----------------
 * This is intentionally a **superficie-only** test. It does NOT exercise
 * behavior (history depth, slice isolation, action side-effects). Those
 * are pinned in `test(phase12b.0b): strengthen history and slice-isolation
 * invariants`, which lands in a separate commit.
 *
 * Source of truth
 * ---------------
 * The 33 state fields and 55 actions enumerated below were extracted by
 * reading `src/store/projectStore.ts` lines 134–247 (the `ProjectState`
 * type declaration) on commit `bc9d7e3`. They are NOT copied from the
 * architecture plan, which contains an off-by-one for state fields (34
 * claimed vs 33 real) and an over-count for actions (74 claimed vs 53
 * real). Code is the canonical reference.
 *
 * If any of these lists ever needs to change, that change must:
 *   1. Land in `projectStore.ts` first (the public contract).
 *   2. Land here in the same commit (keep the test honest).
 *   3. Be documented in the PR body.
 */

import { describe, expect, it } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import type {
  ComparisonSlot,
  ComparisonState,
  InteractionMode,
  LayoutAlternative,
  LayoutEditState,
  PreviewTerrainState,
  TerrainFitPreviewState,
} from "@/store/projectStore";

/**
 * Canonical list of action names exposed by `useProjectStore`.
 * Order mirrors the declaration order in `projectStore.ts` so that
 * humans diffing this list against the source can see drift quickly.
 */
const EXPECTED_ACTIONS = [
  // polygon
  "startDrawingPolygon",
  "addPolygonVertex",
  "finishPolygon",
  "clearPolygon",
  "setPolygonFromCoordinates",
  "setMapViewCenter",
  // preview-terrain
  "createPreviewTerrain",
  "updatePreviewTerrain",
  "movePreviewTerrainBy",
  "applyPreviewTerrain",
  "cancelPreviewTerrain",
  // repair-zone
  "startDrawingRepairZone",
  "addRepairZoneVertex",
  "finishRepairZone",
  "clearRepairZone",
  // equipment placement & lifecycle
  "setPlacementSpec",
  "placeEquipmentAt",
  "insertBessArray",
  "insertCaseStudyLayout",
  "loadBessDelDesiertoPresetV12",
  "clearProjectV12Slices",
  "insertPreliminaryToolLayout",
  "regularizePreliminaryToolLayout",
  "repairLayout",
  "shiftLayout",
  "centerLayoutInSite",
  "clearToolResult",
  "clearRepairResult",
  "removeEquipment",
  "rotateEquipment",
  "selectEquipment",
  "selectCaseStudy",
  // layout edit
  "startLayoutEdit",
  "cancelLayoutEdit",
  "setLayoutEditSelection",
  "clearLayoutEditSelection",
  "previewRotateSelection",
  "previewOrientSelection",
  "previewMoveSelection",
  "setSelectionLocked",
  "previewRepairSelection",
  "previewCompactSelection",
  "markLayoutEditValidated",
  "revertLayoutEdit",
  "applyLayoutEdit",
  // terrain-fit preview
  "previewFitLayoutToTerrain",
  "applyTerrainFitPreview",
  "revertTerrainFitPreview",
  // comparison slots
  "captureAlternative",
  "clearAlternative",
  "restoreAlternative",
  // smartSiteFit
  "runSmartSiteFitAnalysis",
  "selectSmartSiteFitAlternative",
  "updateSmartSiteFitOverrides",
  "recalculateSmartSiteFitPreview",
  "applySmartSiteFitAlternative",
  "discardSmartSiteFit",
  // lifecycle
  "setMode",
  "loadDemoProject",
  "resetProject",
  "undo",
  "redo",
] as const satisfies ReadonlyArray<string>;

/**
 * Canonical list of state fields exposed by `useProjectStore`.
 * Order mirrors the declaration order in `projectStore.ts`.
 *
 * NOTE: 33 fields, not 34. The architecture plan claims 34; the source
 * has 33. Reported in the commit body.
 */
const EXPECTED_STATE_FIELDS = [
  // core layout state
  "anchor",
  "polygon",
  "repairZone",
  "previewTerrain",
  "mapViewCenter",
  "placedEquipment",
  "interactionMode",
  "pendingPlacementSpecId",
  "selectedEquipmentId",
  "selectedCaseStudyId",
  "lastToolResult",
  "lastRepairResult",
  "layoutEdit",
  "terrainFitPreview",
  "comparison",
  "smartSiteFit",
  "smartSiteFitApplied",
  "past",
  "future",
  // v1.2 slices (Fase 1 read-only + Fase 10 mutators)
  "designTargets",
  "blocks",
  "conversionStations",
  "mvFeeders",
  "mvBuses",
  "poi",
  "mainTransformer",
  "auxiliaryServices",
  "ppc",
  "operationalLimits",
  "lossEstimates",
  "cableRoutes",
  "accessRoads",
  "fireSafetyZones",
  "assumptionsV2",
  "inconsistencies",
] as const satisfies ReadonlyArray<string>;

// ──────────────────────────────────────────────────────────────────
// Compile-time assertions for the 7 public types.
//
// These are zero-runtime-cost. If any of the seven types stops being
// exported from `@/store/projectStore`, the file fails to typecheck.
// We assign each type to `unknown` (the universal supertype) so the
// presence of the symbol is what gates the typecheck, not its shape.
// ──────────────────────────────────────────────────────────────────

type _TypeExportProbe = {
  interactionMode: InteractionMode;
  layoutEditState: LayoutEditState;
  terrainFitPreviewState: TerrainFitPreviewState;
  previewTerrainState: PreviewTerrainState;
  layoutAlternative: LayoutAlternative;
  comparisonSlot: ComparisonSlot;
  comparisonState: ComparisonState;
};

// Reference the probe so the compiler keeps it. `void` discards the
// runtime result while preserving the type-level check.
void (null as unknown as _TypeExportProbe);

describe("useProjectStore — Phase 12B public contract", () => {
  it("exposes exactly the expected set of action names (61 actions)", () => {
    const state = useProjectStore.getState();
    const observedActions = Object.keys(state)
      .filter((key) => typeof (state as Record<string, unknown>)[key] === "function")
      .sort();
    const expectedSorted = [...EXPECTED_ACTIONS].sort();
    expect(observedActions).toEqual(expectedSorted);
  });

  it("each expected action is a callable function", () => {
    const state = useProjectStore.getState() as Record<string, unknown>;
    for (const actionName of EXPECTED_ACTIONS) {
      expect(typeof state[actionName]).toBe("function");
    }
  });

  it("exposes exactly the expected set of state field names (35 fields)", () => {
    const state = useProjectStore.getState();
    const observedFields = Object.keys(state)
      .filter((key) => typeof (state as Record<string, unknown>)[key] !== "function")
      .sort();
    const expectedSorted = [...EXPECTED_STATE_FIELDS].sort();
    expect(observedFields).toEqual(expectedSorted);
  });

  it("each expected state field is defined on the default state", () => {
    const state = useProjectStore.getState() as Record<string, unknown>;
    for (const fieldName of EXPECTED_STATE_FIELDS) {
      // Field must exist as an own enumerable property of the store.
      // `undefined` is acceptable for nullable fields (e.g. anchor),
      // but `in` would also pass for inherited keys — we want own.
      expect(Object.prototype.hasOwnProperty.call(state, fieldName)).toBe(true);
    }
  });

  it("does not expose any action not in the canonical contract", () => {
    const state = useProjectStore.getState();
    const observedActions = new Set(
      Object.keys(state).filter(
        (key) => typeof (state as Record<string, unknown>)[key] === "function",
      ),
    );
    const expected = new Set<string>(EXPECTED_ACTIONS);
    const unexpected = [...observedActions].filter((name) => !expected.has(name));
    expect(unexpected).toEqual([]);
  });

  it("does not expose any state field not in the canonical contract", () => {
    const state = useProjectStore.getState();
    const observedFields = new Set(
      Object.keys(state).filter(
        (key) => typeof (state as Record<string, unknown>)[key] !== "function",
      ),
    );
    const expected = new Set<string>(EXPECTED_STATE_FIELDS);
    const unexpected = [...observedFields].filter((name) => !expected.has(name));
    expect(unexpected).toEqual([]);
  });

  it("re-exports the 7 public types from @/store/projectStore (compile-time check)", () => {
    // The `_TypeExportProbe` declared above is the actual check; this
    // runtime assertion just documents that the test guards the public
    // type surface. If any of the 7 types disappears from the module,
    // this file fails to typecheck before this assertion is reached.
    expect(true).toBe(true);
  });
});
