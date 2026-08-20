/**
 * equipmentSlice — equipment placement and basic equipment selection.
 *
 * Extracted as Phase 12B.6a to keep placement core separate from bulk
 * layout tools, V1.2 electrical architecture loaders, layout-edit,
 * comparison, and lifecycle actions.
 *
 * Import discipline: this slice imports only external dependencies,
 * `../projectStore.types`, and `../projectStore.history`. It does not
 * import from `../projectStore`.
 */

import { nanoid } from "nanoid";
import type { StoreApi } from "zustand";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import {
  bessDelDesiertoPresetV12,
  getProjectCaseStudy,
} from "@/data/projectCaseStudies";
import { generateBessArray } from "@/lib/bessArrayGenerator";
import {
  generateCaseStudyConceptualLayout,
  generatedCaseStudyGroupPrefix,
} from "@/lib/layout/caseStudyLayoutGenerator";
import {
  generatePreliminaryLayout,
  PRELIMINARY_TOOL_GROUP_PREFIX,
} from "@/lib/layout/preliminaryLayoutGenerator";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import { runSmartRepair } from "@/lib/layout/smartRepairIntegration";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import type { LngLat, LocalPoint } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import {
  DEFAULT_CONCEPTUAL_LAYOUT_POINT,
  emptyLayoutEditState,
  emptyTerrainFitPreviewState,
  type ProjectState,
} from "../projectStore.types";
import { recordHistory } from "../projectStore.history";

export type EquipmentSlice = {
  placedEquipment: PlacedEquipment[];
  pendingPlacementSpecId: string | null;
  selectedEquipmentId: string | null;
  selectedCaseStudyId: string | null;
  lastToolResult: ProjectState["lastToolResult"];
  lastRepairResult: ProjectState["lastRepairResult"];
  cableRoutes: ProjectState["cableRoutes"];
  accessRoads: ProjectState["accessRoads"];
  fireSafetyZones: ProjectState["fireSafetyZones"];
  designTargets: ProjectState["designTargets"];
  blocks: ProjectState["blocks"];
  conversionStations: ProjectState["conversionStations"];
  mvFeeders: ProjectState["mvFeeders"];
  mvBuses: ProjectState["mvBuses"];
  poi: ProjectState["poi"];
  mainTransformer: ProjectState["mainTransformer"];
  auxiliaryServices: ProjectState["auxiliaryServices"];
  ppc: ProjectState["ppc"];
  operationalLimits: ProjectState["operationalLimits"];
  lossEstimates: ProjectState["lossEstimates"];
  assumptionsV2: ProjectState["assumptionsV2"];
  inconsistencies: ProjectState["inconsistencies"];

  setPlacementSpec: (specId: string | null) => void;
  placeEquipmentAt: (p: LngLat) => void;
  insertBessArray: ProjectState["insertBessArray"];
  insertCaseStudyLayout: ProjectState["insertCaseStudyLayout"];
  loadBessDelDesiertoPresetV12: ProjectState["loadBessDelDesiertoPresetV12"];
  clearProjectV12Slices: ProjectState["clearProjectV12Slices"];
  insertPreliminaryToolLayout: ProjectState["insertPreliminaryToolLayout"];
  regularizePreliminaryToolLayout: ProjectState["regularizePreliminaryToolLayout"];
  repairLayout: ProjectState["repairLayout"];
  shiftLayout: ProjectState["shiftLayout"];
  centerLayoutInSite: ProjectState["centerLayoutInSite"];
  clearToolResult: () => void;
  clearRepairResult: () => void;
  removeEquipment: (id: string) => void;
  rotateEquipment: (id: string, deltaDeg: number) => void;
  selectEquipment: (id: string | null) => void;
  selectCaseStudy: (id: string | null) => void;
};

function localCentroid(points: LocalPoint[]): LocalPoint {
  if (points.length === 0) return { x_m: 0, y_m: 0 };
  const sum = points.reduce(
    (acc, p) => ({ x_m: acc.x_m + p.x_m, y_m: acc.y_m + p.y_m }),
    { x_m: 0, y_m: 0 }
  );
  return { x_m: sum.x_m / points.length, y_m: sum.y_m / points.length };
}

export function createEquipmentSlice(
  set: StoreApi<ProjectState>["setState"],
  get: StoreApi<ProjectState>["getState"],
): EquipmentSlice {
  return {
    placedEquipment: [],
    pendingPlacementSpecId: null,
    selectedEquipmentId: null,
    selectedCaseStudyId: null,
    lastToolResult: null,
    lastRepairResult: null,
    cableRoutes: [],
    accessRoads: [],
    fireSafetyZones: [],

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
      const hasTerrainPolygon = polygon.length >= 3;
      const result = generatePreliminaryLayout({
        ...input,
        anchor: resolvedAnchor,
        startPoint,
        polygon: hasTerrainPolygon ? polygon : undefined,
        fitInsidePolygon: hasTerrainPolygon,
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
      const result = runSmartRepair({
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

      const infrastructure = generateConceptualPhysicalInfrastructure({
        placed: result.placed,
        anchor,
        polygon,
      });

      set((state) => ({
        ...recordHistory(state),
        placedEquipment: result.placed,
        cableRoutes: infrastructure.cableRoutes,
        accessRoads: infrastructure.accessRoads,
        interactionMode: "select",
        pendingPlacementSpecId: null,
        selectedEquipmentId: null,
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
        lastRepairResult: result,
      }));
    },

    shiftLayout: (dxM, dyM) => {
      const { anchor, placedEquipment } = get();
      if (!anchor || placedEquipment.length === 0) return;
      const shifted = placedEquipment.map((item) => {
        if (item.locked) return item;
        const local = toLocal(item.anchor, anchor);
        return {
          ...item,
          anchor: toLngLat({ x_m: local.x_m + dxM, y_m: local.y_m + dyM }, anchor),
        };
      });
      set((state) => ({
        ...recordHistory(state),
        placedEquipment: shifted,
        cableRoutes: [],
        accessRoads: [],
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
      }));
    },

    centerLayoutInSite: () => {
      const { anchor, polygon, placedEquipment } = get();
      if (!anchor || polygon.length < 3 || placedEquipment.length === 0) return;
      const movers = placedEquipment.filter((item) => !item.locked);
      if (movers.length === 0) return;
      const polyLocal = polygon.map((p) => toLocal(p, anchor));
      const polyCenter = localCentroid(polyLocal);
      const layoutCenter = localCentroid(movers.map((item) => toLocal(item.anchor, anchor)));
      const dxM = polyCenter.x_m - layoutCenter.x_m;
      const dyM = polyCenter.y_m - layoutCenter.y_m;
      const shifted = placedEquipment.map((item) => {
        if (item.locked) return item;
        const local = toLocal(item.anchor, anchor);
        return {
          ...item,
          anchor: toLngLat({ x_m: local.x_m + dxM, y_m: local.y_m + dyM }, anchor),
        };
      });
      set((state) => ({
        ...recordHistory(state),
        placedEquipment: shifted,
        cableRoutes: [],
        accessRoads: [],
        previewTerrain: null,
        layoutEdit: emptyLayoutEditState,
        terrainFitPreview: emptyTerrainFitPreviewState,
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
  };
}
