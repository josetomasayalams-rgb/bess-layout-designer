import { create } from "zustand";
import { nanoid } from "nanoid";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import {
  bessDelDesiertoPresetV12,
  getProjectCaseStudy,
} from "@/data/projectCaseStudies";
import { createDemoProject } from "@/lib/layout/demoProject";
import { generateBessArray } from "@/lib/bessArrayGenerator";
import {
  generateCaseStudyConceptualLayout,
  generatedCaseStudyGroupPrefix,
} from "@/lib/layout/caseStudyLayoutGenerator";
import {
  generatePreliminaryLayout,
  PRELIMINARY_TOOL_GROUP_PREFIX,
  type PreliminaryLayoutRequest,
  type PreliminaryLayoutResult,
} from "@/lib/layout/preliminaryLayoutGenerator";
import {
  repairLayout as runLayoutRepair,
  type LayoutRepairRules,
  type LayoutRepairResult,
} from "@/lib/layout/layoutRepair";
import {
  fitLayoutToTerrain,
  type TerrainFitResult,
} from "@/lib/layout/fitLayoutToTerrain";
import {
  generateParametricTerrain,
  rotateParametricTerrainPreview,
  translateParametricTerrainPreview,
  type ParametricTerrainInput,
  type ParametricTerrainPreview,
} from "@/lib/terrain/parametricTerrain";
import {
  moveSelectedEquipment,
  orientSelectedEquipment,
  rotateSelectedEquipment,
  setEquipmentLock,
} from "@/lib/layout/layoutEditing";
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
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";
import type { FireSafetyZone } from "@/types/safety";
import type {
  DocumentInconsistency,
  ProjectAssumption,
  ProjectDesignTargets,
} from "@/types/project";

export type InteractionMode =
  | "select"
  | "draw-site"
  | "place-equipment"
  | "draw-repair-zone"
  | "edit-layout";

const DEFAULT_CONCEPTUAL_LAYOUT_POINT: LngLat = {
  lng: -70.6483,
  lat: -33.4569,
};

/** How many undo steps (and redo steps) are remembered. */
const HISTORY_LIMIT = 5;

/** Snapshot of undoable project content (UI selection is not tracked). */
type ProjectSnapshot = {
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

const emptyLayoutEditState: LayoutEditState = {
  selectedIds: [],
  selectionPolygon: [],
  draftPlacedEquipment: null,
  lastValidationAt: null,
};

export type TerrainFitPreviewState = {
  draftPlacedEquipment: PlacedEquipment[] | null;
  result: TerrainFitResult | null;
};

const emptyTerrainFitPreviewState: TerrainFitPreviewState = {
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

const emptyComparison: ComparisonState = { A: null, B: null };

type ProjectState = {
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
  past: ProjectSnapshot[];
  future: ProjectSnapshot[];

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

  setMode: (mode: InteractionMode) => void;
  loadDemoProject: () => void;
  resetProject: () => void;
  undo: () => void;
  redo: () => void;
};

function snapshotOf(state: ProjectState): ProjectSnapshot {
  return {
    anchor: state.anchor,
    polygon: state.polygon,
    placedEquipment: state.placedEquipment,
    cableRoutes: state.cableRoutes,
    accessRoads: state.accessRoads,
  };
}

/** Pushes the current state onto the undo stack and clears the redo stack. */
function recordHistory(
  state: ProjectState
): Pick<ProjectState, "past" | "future"> {
  return {
    past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
    future: [],
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
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
  layoutEdit: emptyLayoutEditState,
  terrainFitPreview: emptyTerrainFitPreviewState,
  comparison: emptyComparison,
  past: [],
  future: [],

  // Fase 1 — slices iniciales vacíos. Sin acciones todavía.
  designTargets: {},
  blocks: [],
  conversionStations: [],
  mvFeeders: [],
  mvBuses: [],
  poi: null,
  mainTransformer: null,
  auxiliaryServices: null,
  ppc: null,
  operationalLimits: null,
  lossEstimates: [],
  cableRoutes: [],
  accessRoads: [],
  fireSafetyZones: [],
  assumptionsV2: [],
  inconsistencies: [],

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

  setMapViewCenter: (center) => set({ mapViewCenter: center }),

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

  startDrawingRepairZone: () =>
    set({
      interactionMode: "draw-repair-zone",
      repairZone: [],
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
    }),

  addRepairZoneVertex: (p) =>
    set((state) => ({ repairZone: [...state.repairZone, p] })),

  finishRepairZone: () => set({ interactionMode: "select" }),

  clearRepairZone: () =>
    set((state) => ({
      repairZone: [],
      interactionMode:
        state.interactionMode === "draw-repair-zone"
          ? "select"
          : state.interactionMode,
    })),

  setPlacementSpec: (specId) =>
    set({
      pendingPlacementSpecId: specId,
      interactionMode: specId ? "place-equipment" : "select",
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
    }),

  placeEquipmentAt: (p) => {
    const { pendingPlacementSpecId, anchor } = get();
    if (!pendingPlacementSpecId) return;
    const spec = equipmentCatalog.find((e) => e.id === pendingPlacementSpecId);
    if (!spec) return;
    set((state) => ({
      ...recordHistory(state),
      placedEquipment: [
        ...state.placedEquipment,
        {
          id: nanoid(8),
          equipmentSpecId: pendingPlacementSpecId,
          anchor: p,
          rotation_deg: 0,
          sourceReliability: spec.source.reliability,
        },
      ],
      anchor: anchor ?? { lng0: p.lng, lat0: p.lat },
      cableRoutes: [],
      accessRoads: [],
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
    }));
  },

  insertBessArray: (input) => {
    const { anchor, polygon } = get();
    const startPoint = polygon[0] ?? (anchor ? { lng: anchor.lng0, lat: anchor.lat0 } : null);
    const resolvedAnchor = anchor ?? (startPoint ? { lng0: startPoint.lng, lat0: startPoint.lat } : null);
    if (!startPoint || !resolvedAnchor) return;
    const generated = generateBessArray({ ...input, startPoint }, resolvedAnchor);
    if (generated.length === 0) return;
    set((state) => ({
      ...recordHistory(state),
      anchor: state.anchor ?? resolvedAnchor,
      placedEquipment: [...state.placedEquipment, ...generated],
      cableRoutes: [],
      accessRoads: [],
      interactionMode: "select",
      pendingPlacementSpecId: null,
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
    }));
  },

  insertCaseStudyLayout: (caseStudyId) => {
    const { anchor, polygon } = get();
    const caseStudy = getProjectCaseStudy(caseStudyId);
    const startPoint =
      polygon[0] ??
      (anchor ? { lng: anchor.lng0, lat: anchor.lat0 } : DEFAULT_CONCEPTUAL_LAYOUT_POINT);
    const resolvedAnchor = anchor ?? { lng0: startPoint.lng, lat0: startPoint.lat };
    if (!caseStudy) return;

    const generated = generateCaseStudyConceptualLayout(caseStudy, resolvedAnchor, {
      startPoint,
    });
    if (generated.length === 0) return;

    const groupPrefix = generatedCaseStudyGroupPrefix(caseStudy.id);
    set((state) => ({
      ...recordHistory(state),
      anchor: state.anchor ?? resolvedAnchor,
      placedEquipment: [
        ...state.placedEquipment.filter(
          (item) => !item.groupId?.startsWith(groupPrefix)
        ),
        ...generated,
      ],
      cableRoutes: [],
      accessRoads: [],
      selectedCaseStudyId: caseStudy.id,
      interactionMode: "select",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
    }));
  },

  loadBessDelDesiertoPresetV12: () => {
    const preset = bessDelDesiertoPresetV12;
    set({
      designTargets: preset.designTargets,
      blocks: preset.blocks,
      conversionStations: preset.conversionStations,
      mvFeeders: preset.mvFeeders,
      mvBuses: preset.mvBuses,
      poi: preset.poi,
      mainTransformer: preset.mainTransformer,
      auxiliaryServices: preset.auxiliaryServices,
      ppc: preset.ppc,
      operationalLimits: preset.operationalLimits,
      lossEstimates: preset.lossEstimates,
      inconsistencies: preset.inconsistencies,
      // pendingData V12 vive como ProjectAssumption[]: cada item se anota
      // como assumption visible. El campo PendingDataItem legacy del case
      // study sigue siendo el canónico para el export legacy.
      assumptionsV2: preset.pendingDataV12.map((item) => ({
        id: item.id,
        description: item.topic,
        unit: undefined,
        risk:
          item.priority === "critical"
            ? "high"
            : item.priority === "important"
              ? "medium"
              : "low",
        mustVerifyBeforeIFC: item.priority !== "desirable",
        evidence: [
          {
            documentId: "__none__",
            confidence: "missing",
            note: item.reason,
          },
        ],
      })),
    });
  },

  clearProjectV12Slices: () => {
    set({
      designTargets: {},
      blocks: [],
      conversionStations: [],
      mvFeeders: [],
      mvBuses: [],
      poi: null,
      mainTransformer: null,
      auxiliaryServices: null,
      ppc: null,
      operationalLimits: null,
      lossEstimates: [],
      inconsistencies: [],
      assumptionsV2: [],
    });
  },

  insertPreliminaryToolLayout: (input) => {
    const { anchor, polygon } = get();
    const startPoint =
      polygon[0] ??
      (anchor ? { lng: anchor.lng0, lat: anchor.lat0 } : DEFAULT_CONCEPTUAL_LAYOUT_POINT);
    const resolvedAnchor = anchor ?? { lng0: startPoint.lng, lat0: startPoint.lat };
    const result = generatePreliminaryLayout({
      ...input,
      anchor: resolvedAnchor,
      startPoint,
      fitInsidePolygon: false,
    });

    if (result.status === "error") {
      set({ lastToolResult: result });
      return;
    }

    set((state) => ({
      ...recordHistory(state),
      anchor: state.anchor ?? resolvedAnchor,
      placedEquipment: [
        ...state.placedEquipment.filter(
          (item) => !item.groupId?.startsWith(PRELIMINARY_TOOL_GROUP_PREFIX)
        ),
        ...result.placed,
      ],
      cableRoutes: [],
      accessRoads: [],
      interactionMode: "select",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
      lastToolResult: result,
    }));
  },

  regularizePreliminaryToolLayout: (input) => {
    const { anchor, polygon } = get();
    const startPoint = polygon[0] ?? (anchor ? { lng: anchor.lng0, lat: anchor.lat0 } : null);
    const resolvedAnchor = anchor ?? (startPoint ? { lng0: startPoint.lng, lat0: startPoint.lat } : null);

    if (!startPoint || !resolvedAnchor || polygon.length < 3) {
      set({
        lastToolResult: {
          status: "error",
          message:
            "Draw or select a site polygon before using normative regularization.",
          placed: [],
          diagnostics: {
            batteryContainerCount: input.batteryContainerCount,
            pcsCount: input.pcsCount,
            blockCount: 0,
            containersPerPcs: input.containersPerPcs,
            spacingM: input.rules.bessToBess_m,
            boundarySetbackM: input.rules.bessToPropertyLine_m,
            layoutAreaM2: null,
            candidateCount: 0,
          },
        },
      });
      return;
    }

    const result = generatePreliminaryLayout({
      ...input,
      anchor: resolvedAnchor,
      startPoint,
      polygon,
      fitInsidePolygon: true,
    });

    if (result.status === "error") {
      set({ lastToolResult: result });
      return;
    }

    set((state) => ({
      ...recordHistory(state),
      anchor: state.anchor ?? resolvedAnchor,
      placedEquipment: [
        ...state.placedEquipment.filter(
          (item) => !item.groupId?.startsWith(PRELIMINARY_TOOL_GROUP_PREFIX)
        ),
        ...result.placed,
      ],
      cableRoutes: [],
      accessRoads: [],
      interactionMode: "select",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
      lastToolResult: result,
    }));
  },

  repairLayout: (rules) => {
    const { anchor, polygon, placedEquipment, repairZone } = get();
    const result = runLayoutRepair({
      placed: placedEquipment,
      anchor,
      polygon,
      rules,
      repairZone,
    });

    if (result.status === "error") {
      set({ lastRepairResult: result });
      return;
    }

    set((state) => ({
      ...recordHistory(state),
      placedEquipment: result.placed,
      cableRoutes: [],
      accessRoads: [],
      interactionMode: "select",
      pendingPlacementSpecId: null,
      selectedEquipmentId: null,
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
      lastRepairResult: result,
    }));
  },

  clearToolResult: () => set({ lastToolResult: null }),

  clearRepairResult: () => set({ lastRepairResult: null }),

  removeEquipment: (id) =>
    set((state) => ({
      ...recordHistory(state),
      placedEquipment: state.placedEquipment.filter((e) => e.id !== id),
      cableRoutes: [],
      accessRoads: [],
      selectedEquipmentId:
        state.selectedEquipmentId === id ? null : state.selectedEquipmentId,
      layoutEdit: {
        ...state.layoutEdit,
        selectedIds: state.layoutEdit.selectedIds.filter((item) => item !== id),
        draftPlacedEquipment: state.layoutEdit.draftPlacedEquipment?.filter(
          (item) => item.id !== id
        ) ?? null,
      },
      terrainFitPreview: emptyTerrainFitPreviewState,
      previewTerrain: null,
    })),

  rotateEquipment: (id, deltaDeg) =>
    set((state) => ({
      ...recordHistory(state),
      placedEquipment: state.placedEquipment.map((e) =>
        e.id === id ? { ...e, rotation_deg: (e.rotation_deg + deltaDeg) % 360 } : e
      ),
      cableRoutes: [],
      accessRoads: [],
      previewTerrain: null,
      layoutEdit: emptyLayoutEditState,
      terrainFitPreview: emptyTerrainFitPreviewState,
    })),

  selectEquipment: (id) => set({ selectedEquipmentId: id }),

  selectCaseStudy: (id) => set({ selectedCaseStudyId: id }),

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
