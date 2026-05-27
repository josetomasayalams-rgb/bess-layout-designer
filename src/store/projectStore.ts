import { create } from "zustand";
import { nanoid } from "nanoid";
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
} from "@/lib/layout/preliminaryLayoutGenerator";
import { repairLayout as runLayoutRepair } from "@/lib/layout/layoutRepair";
import {
  moveSelectedEquipment,
  orientSelectedEquipment,
  rotateSelectedEquipment,
  setEquipmentLock,
} from "@/lib/layout/layoutEditing";

import {
  DEFAULT_CONCEPTUAL_LAYOUT_POINT,
  emptyComparison,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "./projectStore.types";
import {
  HISTORY_LIMIT,
  recordHistory,
  snapshotOf,
} from "./projectStore.history";
import { createPolygonSlice } from "./slices/polygonSlice";
import { createRepairZoneSlice } from "./slices/repairZoneSlice";
import { createTerrainSlice } from "./slices/terrainSlice";

// Re-export the 7 public types so consumers continue to import them
// from `@/store/projectStore` unchanged (Phase 12B guardrail D9).
export type {
  ComparisonSlot,
  ComparisonState,
  InteractionMode,
  LayoutAlternative,
  LayoutEditState,
  PreviewTerrainState,
  TerrainFitPreviewState,
} from "./projectStore.types";

export const useProjectStore = create<ProjectState>((set, get) => ({
  ...createPolygonSlice(set),
  ...createTerrainSlice(set),
  ...createRepairZoneSlice(set),
  placedEquipment: [],
  interactionMode: "select",
  pendingPlacementSpecId: null,
  selectedEquipmentId: null,
  selectedCaseStudyId: null,
  lastToolResult: null,
  lastRepairResult: null,
  layoutEdit: emptyLayoutEditState,
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
