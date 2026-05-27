/**
 * projectStore.types — public types and type-tied constants for the
 * project store, extracted from `projectStore.ts` in Phase 12B.
 *
 * Why this exists
 * ---------------
 * Phase 12B (`docs/phase-12-architect-plan.md`) decomposes the
 * 1,185-LOC `projectStore.ts` monolith into per-domain Zustand slices
 * under `src/store/slices/`. The first extraction (this commit,
 * `phase12b.1`) pulls out the type declarations so that:
 *
 *   - Future slice files can import the types without pulling in the
 *     entire composition root.
 *   - The upcoming `projectStore.history.ts` helper (commit
 *     `phase12b.2`) can consume `ProjectSnapshot` without a circular
 *     dependency back into `projectStore.ts`.
 *
 * All seven **public** types continue to be re-exported from
 * `@/store/projectStore` (see `projectStore.ts`) so that every existing
 * consumer (`src/components/**`, `src/lib/**`, `src/tests/**`) keeps
 * the same import path. This file is byte-equivalent in semantics to
 * lines 66–132 of `projectStore.ts` at merge commit `a5afadc`.
 *
 * What lives here
 * ---------------
 * Public types (re-exported via `projectStore.ts`):
 *   - InteractionMode
 *   - LayoutEditState
 *   - TerrainFitPreviewState
 *   - PreviewTerrainState
 *   - LayoutAlternative
 *   - ComparisonSlot
 *   - ComparisonState
 *
 * Internal type (exported for future `projectStore.history.ts`):
 *   - ProjectSnapshot
 *
 * Empty-state runtime constants (consumed by `projectStore.ts` action
 * implementations; kept here so the type and its canonical empty value
 * are co-located):
 *   - emptyLayoutEditState
 *   - emptyTerrainFitPreviewState
 *   - emptyComparison
 *
 * What does NOT live here (intentional, per phase12b.1 scope)
 * ----------------------------------------------------------
 *   - `HISTORY_LIMIT`, `snapshotOf`, `recordHistory` → moving in
 *     `phase12b.2: extract projectStore history helpers`.
 *   - `DEFAULT_CONCEPTUAL_LAYOUT_POINT` → not a type, stays in
 *     `projectStore.ts` near its only consumer (the default state).
 *   - `ProjectState`, `ProjectSliceCreator` → introduced when slices
 *     start being extracted (phase12b.3+).
 */

import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";
import type { TerrainFitResult } from "@/lib/layout/fitLayoutToTerrain";
import type { ParametricTerrainPreview } from "@/lib/terrain/parametricTerrain";

export type InteractionMode =
  | "select"
  | "draw-site"
  | "place-equipment"
  | "draw-repair-zone"
  | "edit-layout";

/** Snapshot of undoable project content (UI selection is not tracked). */
export type ProjectSnapshot = {
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  placedEquipment: PlacedEquipment[];
  cableRoutes: CableRoute[];
  accessRoads: AccessRoad[];
};

export type LayoutEditState = {
  selectedIds: string[];
  selectionPolygon: LngLat[];
  draftPlacedEquipment: PlacedEquipment[] | null;
  lastValidationAt: string | null;
};

export const emptyLayoutEditState: LayoutEditState = {
  selectedIds: [],
  selectionPolygon: [],
  draftPlacedEquipment: null,
  lastValidationAt: null,
};

export type TerrainFitPreviewState = {
  draftPlacedEquipment: PlacedEquipment[] | null;
  result: TerrainFitResult | null;
};

export const emptyTerrainFitPreviewState: TerrainFitPreviewState = {
  draftPlacedEquipment: null,
  result: null,
};

export type PreviewTerrainState = ParametricTerrainPreview | null;

/** A captured layout snapshot used by the A/B alternatives comparator. */
export type LayoutAlternative = {
  id: string;
  capturedAt: string;
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  placedEquipment: PlacedEquipment[];
};

export type ComparisonSlot = "A" | "B";

export type ComparisonState = {
  A: LayoutAlternative | null;
  B: LayoutAlternative | null;
};

export const emptyComparison: ComparisonState = { A: null, B: null };
