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
 * What does NOT live here (intentional, per phase12b.1–12b.3 scope)
 * ----------------------------------------------------------------
 *   - `HISTORY_LIMIT`, `snapshotOf`, `recordHistory` → moved to
 *     `projectStore.history.ts` in `phase12b.2`.
 *   - `DEFAULT_CONCEPTUAL_LAYOUT_POINT` → moved here in `phase12b.3`
 *     so both `polygonSlice` (initial `mapViewCenter`) and the still-
 *     in-store actions that fall back to this point can share one
 *     source without creating an import cycle.
 *   - `ProjectState`, `ProjectSliceCreator` → moved here in
 *     `phase12b.3` to support typed slice factories such as
 *     `createPolygonSlice`.
 */

import type { StateCreator } from "zustand";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";
import type { TerrainFitResult } from "@/lib/layout/fitLayoutToTerrain";
import type {
  ParametricTerrainInput,
  ParametricTerrainPreview,
} from "@/lib/terrain/parametricTerrain";
import type {
  PreliminaryLayoutRequest,
  PreliminaryLayoutResult,
} from "@/lib/layout/preliminaryLayoutGenerator";
import type { LayoutRepairResult, LayoutRepairRules } from "@/lib/layout/layoutRepair";
import type { BessArrayInput } from "@/types/bess";
import type {
  AuxiliaryServices,
  BESSBlock,
  ConversionStation,
  LossEstimate,
  MainTransformer,
  MVBus,
  MVFeeder,
  OperationalLimits,
  POI,
  PPC,
} from "@/types/electrical";
import type { FireSafetyZone } from "@/types/safety";
import type {
  DocumentInconsistency,
  ProjectAssumption,
  ProjectDesignTargets,
} from "@/types/project";
import type {
  SmartSiteFitInput,
  SmartSiteFitResult,
  SmartSiteFitOverrides,
  SmartSiteFitMode,
  SmartSiteFitStrategy,
  SmartSiteFitAssumption,
  SmartSiteFitLayoutMode,
  SmartSiteFitManualLayoutSpec,
} from "@/lib/layout/smartSiteFit/smartSiteFitTypes";

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

export type SmartSiteFitPreviewState = {
  result: SmartSiteFitResult | null;
  selectedAlternativeId: string | null;
  overrides: SmartSiteFitOverrides;
  dirty: boolean;
  lastRunInput: SmartSiteFitInput | null;
  lastRunAt: string | null;
};

export type SmartSiteFitAppliedMetadata = {
  mode: SmartSiteFitMode;
  strategy: SmartSiteFitStrategy;
  score: number;
  bessCount: number;
  pcsCount: number;
  ratio: number;
  assumptions: SmartSiteFitAssumption[];
  appliedAt: string;
  layoutMode?: SmartSiteFitLayoutMode;
  manualLayoutSpec?: SmartSiteFitManualLayoutSpec;
};

export type SmartSiteFitApplyResult = {
  success: boolean;
  message: string;
  placedCount: number;
};

export const emptySmartSiteFitPreviewState: SmartSiteFitPreviewState = {
  result: null,
  selectedAlternativeId: null,
  overrides: {},
  dirty: false,
  lastRunInput: null,
  lastRunAt: null,
};

/**
 * Default map view center for projects that have not yet drawn a
 * polygon (Santiago, Chile). Used as the initial value of
 * `mapViewCenter` and as a fallback by actions that resolve to a
 * map point when `state.mapViewCenter` is null.
 */
export const DEFAULT_CONCEPTUAL_LAYOUT_POINT: LngLat = {
  lng: -70.6483,
  lat: -33.4569,
};

// ──────────────────────────────────────────────────────────────────
// Full ProjectState shape — single source of truth for every slice.
//
// Moved here in `phase12b.3` so that:
//   - each per-domain slice factory can be typed as
//     `ProjectSliceCreator<MySlice>` and read/write the full state
//     via `set` / `get` without re-declaring the shape;
//   - the slice files compose into a single `useProjectStore` whose
//     runtime surface is byte-equivalent to the pre-12B store.
// No action implementations or state-default values move with this
// declaration — those still live inside `projectStore.ts`'s
// `create<ProjectState>((set, get) => ({ ... }))` call.
// ──────────────────────────────────────────────────────────────────

export type ProjectState = {
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  repairZone: LngLat[];
  previewTerrain: PreviewTerrainState;
  mapViewCenter: LngLat | null;
  placedEquipment: PlacedEquipment[];
  interactionMode: InteractionMode;
  pendingPlacementSpecId: string | null;
  selectedEquipmentId: string | null;
  selectedCaseStudyId: string | null;
  lastToolResult: PreliminaryLayoutResult | null;
  lastRepairResult: LayoutRepairResult | null;
  layoutEdit: LayoutEditState;
  terrainFitPreview: TerrainFitPreviewState;
  comparison: ComparisonState;
  smartSiteFit: SmartSiteFitPreviewState;
  smartSiteFitApplied: SmartSiteFitAppliedMetadata | null;
  past: ProjectSnapshot[];
  future: ProjectSnapshot[];
  /**
   * Free-text project name (metadata). Entered in the terrain-sizing panel
   * and threaded into the technical report header. Intentionally NOT part of
   * `ProjectSnapshot` — undo/redo never restore it; `resetProject` clears it.
   */
  projectName: string;

  // ──────────────────────────────────────────────────────────────────
  // Fase 1 — slices nuevos para arquitectura eléctrica y trazabilidad.
  // Por ahora son read-only desde el store (no hay acciones de mutación).
  // Las acciones se añadirán en fases siguientes cuando exista UI para ellas.
  // ──────────────────────────────────────────────────────────────────
  designTargets: ProjectDesignTargets;
  blocks: BESSBlock[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses: MVBus[];
  poi: POI | null;
  mainTransformer: MainTransformer | null;
  auxiliaryServices: AuxiliaryServices | null;
  ppc: PPC | null;
  operationalLimits: OperationalLimits | null;
  lossEstimates: LossEstimate[];
  cableRoutes: CableRoute[];
  accessRoads: AccessRoad[];
  fireSafetyZones: FireSafetyZone[];
  assumptionsV2: ProjectAssumption[];
  inconsistencies: DocumentInconsistency[];

  startDrawingPolygon: () => void;
  addPolygonVertex: (p: LngLat) => void;
  finishPolygon: () => void;
  clearPolygon: () => void;
  setPolygonFromCoordinates: (vertices: LngLat[]) => void;
  setMapViewCenter: (center: LngLat) => void;
  createPreviewTerrain: (
    input: Omit<ParametricTerrainInput, "center"> & { center?: LngLat | null }
  ) => void;
  updatePreviewTerrain: (
    input: Partial<Omit<ParametricTerrainInput, "center">>
  ) => void;
  movePreviewTerrainBy: (delta: { x_m: number; y_m: number }) => void;
  applyPreviewTerrain: () => void;
  cancelPreviewTerrain: () => void;

  startDrawingRepairZone: () => void;
  addRepairZoneVertex: (p: LngLat) => void;
  finishRepairZone: () => void;
  clearRepairZone: () => void;

  setPlacementSpec: (specId: string | null) => void;
  placeEquipmentAt: (p: LngLat) => void;
  insertBessArray: (input: Omit<BessArrayInput, "startPoint">) => void;
  insertCaseStudyLayout: (caseStudyId: string) => void;
  /**
   * Fase 10 — Pobla los slices v1.2 (mvBuses, mvFeeders, conversionStations,
   * poi, mainTransformer, auxiliaryServices, ppc, operationalLimits,
   * lossEstimates, inconsistencies, blocks) desde el preset evidenciado.
   *
   * No coloca equipos físicos en el mapa: para eso usar `insertCaseStudyLayout`.
   * Estas dos acciones pueden coexistir; cada una opera sobre slices distintos.
   */
  loadBessDelDesiertoPresetV12: () => void;
  /** Limpia los slices v1.2 sin afectar el layout físico. */
  clearProjectV12Slices: () => void;
  insertPreliminaryToolLayout: (
    input: Omit<PreliminaryLayoutRequest, "anchor" | "startPoint" | "polygon" | "fitInsidePolygon">
  ) => void;
  regularizePreliminaryToolLayout: (
    input: Omit<PreliminaryLayoutRequest, "anchor" | "startPoint" | "polygon" | "fitInsidePolygon">
  ) => void;
  repairLayout: (rules: LayoutRepairRules) => void;
  /** Shifts all non-locked placed equipment by (dxM, dyM) meters in local ENU coords. */
  shiftLayout: (dxM: number, dyM: number) => void;
  /** Centers all non-locked placed equipment on the polygon centroid. Requires polygon >= 3 vertices. */
  centerLayoutInSite: () => void;
  clearToolResult: () => void;
  clearRepairResult: () => void;
  removeEquipment: (id: string) => void;
  rotateEquipment: (id: string, deltaDeg: number) => void;
  selectEquipment: (id: string | null) => void;
  selectCaseStudy: (id: string | null) => void;
  startLayoutEdit: () => void;
  cancelLayoutEdit: () => void;
  setLayoutEditSelection: (ids: string[], selectionPolygon: LngLat[]) => void;
  clearLayoutEditSelection: () => void;
  previewRotateSelection: (deltaDeg: number) => void;
  previewOrientSelection: (rotationDeg: number) => void;
  previewMoveSelection: (delta: { x_m: number; y_m: number }) => void;
  setSelectionLocked: (locked: boolean) => void;
  previewRepairSelection: (rules: LayoutRepairRules) => void;
  previewCompactSelection: (rules: LayoutRepairRules) => void;
  markLayoutEditValidated: () => void;
  revertLayoutEdit: () => void;
  applyLayoutEdit: () => void;
  previewFitLayoutToTerrain: (rules: LayoutRepairRules) => void;
  applyTerrainFitPreview: () => void;
  revertTerrainFitPreview: () => void;
  captureAlternative: (slot: ComparisonSlot) => void;
  clearAlternative: (slot: ComparisonSlot) => void;
  restoreAlternative: (slot: ComparisonSlot) => void;

  runSmartSiteFitAnalysis: (input: SmartSiteFitInput) => void;
  selectSmartSiteFitAlternative: (alternativeId: string) => void;
  updateSmartSiteFitOverrides: (
    overrides: Partial<SmartSiteFitOverrides>
  ) => void;
  recalculateSmartSiteFitPreview: () => void;
  applySmartSiteFitAlternative: () => SmartSiteFitApplyResult;
  discardSmartSiteFit: () => void;

  setMode: (mode: InteractionMode) => void;
  /** Sets the free-text project-name metadata field. */
  setProjectName: (name: string) => void;
  loadDemoProject: () => void;
  resetProject: () => void;
  undo: () => void;
  redo: () => void;
};

/**
 * Canonical Zustand `StateCreator` alias for per-domain slices.
 * Every slice factory under `src/store/slices/` is typed as
 * `ProjectSliceCreator<MySlice>` so that `set` / `get` see the full
 * `ProjectState` and the spread of slice outputs in `projectStore.ts`
 * builds a valid composed store.
 */
export type ProjectSliceCreator<TSlice> = StateCreator<
  ProjectState,
  [],
  [],
  TSlice
>;
