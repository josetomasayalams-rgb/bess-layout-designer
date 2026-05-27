"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  registerMapRefForReport,
  unregisterMapRefForReport,
} from "@/lib/report/captureMap";
import {
  Eraser,
  LocateFixed,
  MousePointer2,
  SquarePen,
  X,
} from "lucide-react";
import {
  Map,
  Source,
  Layer,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FilterSpecification } from "maplibre-gl";
import { equipmentCatalog, is3DCapable } from "@/data/equipmentCatalog";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useBaseMapStyle } from "./hooks/useBaseMapStyle";
import { useMapLifecycle } from "./hooks/useMapLifecycle";
import { resolveEquipment3DVisualProfile } from "@/data/equipment3dVisualProfiles";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor } from "@/lib/i18n";
import {
  formatApparentPowerMva,
  formatEnergyMWh,
  formatLength,
  formatMassTonnes,
} from "@/lib/units/formatUnits";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import {
  accessRoadCorridorFeatures,
  accessRoadLineFeatures,
} from "@/lib/layout/accessRoads";
import {
  cableRouteCorridorFeatures,
  cableRouteLineFeatures,
} from "@/lib/layout/cableRoutes";
import {
  generateConceptualPhysicalInfrastructure,
  layoutZoneFeatures,
  layoutZoneLabelFeatures,
} from "@/lib/layout/physicalInfrastructure";
import { CoordinateSearch } from "@/components/map/CoordinateSearch";
import { BaseMapSelector } from "@/components/map/BaseMapSelector";
import { LayerManagerPanel } from "@/components/map/LayerManagerPanel";
import { LayoutEditToolbar } from "@/components/map/LayoutEditToolbar";
import { OrientationCube } from "@/components/map/OrientationCube";
import { selectEquipmentWithinPolygon } from "@/lib/layout/layoutEditing";
import {
  polygonToFeature,
  polygonToLineFeature,
  polygonVerticesToFeature,
  equipmentToFeatures,
  equipment3DDetailFeatures,
  equipment3DLabelFeatures,
  gridLineFeatures,
  measurementLabelFeatures,
  regulatoryBufferFeatures,
  warningMarkerFeatures,
} from "@/lib/layout/mapFeatures";
import { INITIAL_VIEW, BLANK_BASE_MAP_STYLE, LAYOUT_MOVE_STEP_M } from "./BessMap.constants";
import { normalizeRotation, shortestDeltaDeg } from "./BessMap.geometry";

export function BessMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState(false);
  const [searchedPoint, setSearchedPoint] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const polygon = useProjectStore((s) => s.polygon);
  const repairZone = useProjectStore((s) => s.repairZone);
  const previewTerrain = useProjectStore((s) => s.previewTerrain);
  const placed = useProjectStore((s) => s.placedEquipment);
  const layoutEdit = useProjectStore((s) => s.layoutEdit);
  const terrainFitPreview = useProjectStore((s) => s.terrainFitPreview);
  const anchor = useProjectStore((s) => s.anchor);
  const interactionMode = useProjectStore((s) => s.interactionMode);
  const selectedEquipmentId = useProjectStore((s) => s.selectedEquipmentId);
  const lastRepairResult = useProjectStore((s) => s.lastRepairResult);
  const storedCableRoutes = useProjectStore((s) => s.cableRoutes);
  const storedAccessRoads = useProjectStore((s) => s.accessRoads);
  const poi = useProjectStore((s) => s.poi);

  const addPolygonVertex = useProjectStore((s) => s.addPolygonVertex);
  const addRepairZoneVertex = useProjectStore((s) => s.addRepairZoneVertex);
  const placeEquipmentAt = useProjectStore((s) => s.placeEquipmentAt);
  const selectEquipment = useProjectStore((s) => s.selectEquipment);
  const setMapViewCenter = useProjectStore((s) => s.setMapViewCenter);
  const movePreviewTerrainBy = useProjectStore((s) => s.movePreviewTerrainBy);
  const updatePreviewTerrain = useProjectStore((s) => s.updatePreviewTerrain);
  const startLayoutEdit = useProjectStore((s) => s.startLayoutEdit);
  const cancelLayoutEdit = useProjectStore((s) => s.cancelLayoutEdit);
  const setLayoutEditSelection = useProjectStore((s) => s.setLayoutEditSelection);
  const clearLayoutEditSelection = useProjectStore((s) => s.clearLayoutEditSelection);
  const previewRotateSelection = useProjectStore((s) => s.previewRotateSelection);
  const previewOrientSelection = useProjectStore((s) => s.previewOrientSelection);
  const previewRepairSelection = useProjectStore((s) => s.previewRepairSelection);
  const previewCompactSelection = useProjectStore(
    (s) => s.previewCompactSelection
  );
  const markLayoutEditValidated = useProjectStore((s) => s.markLayoutEditValidated);
  const revertLayoutEdit = useProjectStore((s) => s.revertLayoutEdit);
  const applyLayoutEdit = useProjectStore((s) => s.applyLayoutEdit);
  const previewMoveSelection = useProjectStore((s) => s.previewMoveSelection);
  const setSelectionLocked = useProjectStore((s) => s.setSelectionLocked);
  const startDrawingPolygon = useProjectStore((s) => s.startDrawingPolygon);
  const finishPolygon = useProjectStore((s) => s.finishPolygon);
  const clearPolygon = useProjectStore((s) => s.clearPolygon);
  const setPlacementSpec = useProjectStore((s) => s.setPlacementSpec);
  const locale = useUiStore((s) => s.locale);

  const {
    baseMapStyleId,
    setBaseMapStyleId,
    resolvedBaseMap,
    mapError,
    setMapError,
  } = useBaseMapStyle(locale);

  const {
    isMapLoaded,
    updateMapCenterFromInstance,
    handleLoad,
    handleError,
  } = useMapLifecycle(mapRef, setMapViewCenter, setMapError);

  const viewMode = useUiStore((s) => s.viewMode);
  const layerVisibility = useUiStore((s) => s.layerVisibility);
  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const profile = getRegulatoryProfile(activeProfileId);
  const [previewTerrainDrag, setPreviewTerrainDrag] = useState<{
    last: { lng: number; lat: number };
    moved: boolean;
  } | null>(null);
  const [previewTerrainRotate, setPreviewTerrainRotate] = useState<{
    startAngleDeg: number;
    startRotationDeg: number;
    moved: boolean;
  } | null>(null);
  const suppressPreviewTerrainClickRef = useRef(false);
  const suppressLayoutEditClickRef = useRef(false);
  const [layoutMoveDrag, setLayoutMoveDrag] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const isLayoutEditMode = interactionMode === "edit-layout";
  const displayedPlaced = isLayoutEditMode
    ? layoutEdit.draftPlacedEquipment ?? placed
    : terrainFitPreview.draftPlacedEquipment ?? placed;
  const hasLayoutDraft = layoutEdit.draftPlacedEquipment !== null;
  const hasTerrainFitDraft = terrainFitPreview.draftPlacedEquipment !== null;
  const lockedSelectedCount = useMemo(() => {
    const ids = new Set(layoutEdit.selectedIds);
    return displayedPlaced.filter((item) => ids.has(item.id) && item.locked)
      .length;
  }, [displayedPlaced, layoutEdit.selectedIds]);
  const non3DCount = useMemo(() => {
    let count = 0;
    for (const item of displayedPlaced) {
      const spec = equipmentCatalog.find((s) => s.id === item.equipmentSpecId);
      if (!spec || !is3DCapable(spec)) count += 1;
    }
    return count;
  }, [displayedPlaced]);

  // Escape clears the layout-edit selection (selection + lasso polygon) while
  // staying inside edit mode. Ignored when typing in inputs / textareas.
  // Fase 11 — registra el mapRef en el módulo de captura para que el reporte
  // pueda obtener una imagen PNG de la vista actual.
  useEffect(() => {
    registerMapRefForReport(mapRef);
    return () => unregisterMapRefForReport();
  }, []);

  useEffect(() => {
    if (!isLayoutEditMode) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (
        layoutEdit.selectedIds.length === 0 &&
        layoutEdit.selectionPolygon.length === 0
      ) {
        return;
      }
      event.preventDefault();
      clearLayoutEditSelection();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    isLayoutEditMode,
    layoutEdit.selectedIds.length,
    layoutEdit.selectionPolygon.length,
    clearLayoutEditSelection,
  ]);

  const polygonFc = useMemo(() => polygonToFeature(polygon), [polygon]);
  const polygonLineFc = useMemo(() => polygonToLineFeature(polygon), [polygon]);
  const polygonVerticesFc = useMemo(
    () => polygonVerticesToFeature(polygon),
    [polygon]
  );
  const previewTerrainFc = useMemo(
    () => polygonToFeature(previewTerrain?.polygon ?? []),
    [previewTerrain]
  );
  const previewTerrainLineFc = useMemo(
    () => polygonToLineFeature(previewTerrain?.polygon ?? []),
    [previewTerrain]
  );
  const previewTerrainVerticesFc = useMemo(
    () => polygonVerticesToFeature(previewTerrain?.polygon ?? []),
    [previewTerrain]
  );
  const previewTerrainCenterFc = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: previewTerrain
        ? [
            {
              type: "Feature" as const,
              properties: {
                label: `${previewTerrain.areaHa.toFixed(1)} ha · ${Math.round(
                  previewTerrain.lengthM
                )} m x ${Math.round(previewTerrain.widthM)} m · ${Math.round(
                  previewTerrain.rotationDeg
                )}°`,
              },
              geometry: {
                type: "Point" as const,
                coordinates: [
                  previewTerrain.center.lng,
                  previewTerrain.center.lat,
                ],
              },
            },
          ]
        : [],
    }),
    [previewTerrain]
  );
  const previewTerrainRotationHandleFc = useMemo(() => {
    if (!previewTerrain) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const terrainAnchor = {
      lng0: previewTerrain.center.lng,
      lat0: previewTerrain.center.lat,
    };
    const localVertices = previewTerrain.polygon.map((point) =>
      toLocal(point, terrainAnchor)
    );
    const radiusM =
      Math.max(
        40,
        ...localVertices.map((point) => Math.hypot(point.x_m, point.y_m))
      ) + 28;
    const angleRad = ((previewTerrain.rotationDeg - 90) * Math.PI) / 180;
    const handle = toLngLat(
      {
        x_m: Math.cos(angleRad) * radiusM,
        y_m: Math.sin(angleRad) * radiusM,
      },
      terrainAnchor
    );

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { kind: "rotation-line" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [previewTerrain.center.lng, previewTerrain.center.lat],
              [handle.lng, handle.lat],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: { kind: "rotation-handle" },
          geometry: {
            type: "Point" as const,
            coordinates: [handle.lng, handle.lat],
          },
        },
      ],
    };
  }, [previewTerrain]);
  const repairZoneFc = useMemo(() => polygonToFeature(repairZone), [repairZone]);
  const repairZoneLineFc = useMemo(
    () => polygonToLineFeature(repairZone),
    [repairZone]
  );
  const repairZoneVerticesFc = useMemo(
    () => polygonVerticesToFeature(repairZone),
    [repairZone]
  );
  const showRepairZoneOverlay =
    interactionMode === "draw-repair-zone" || repairZone.length > 0;
  const equipmentFc = useMemo(
    () =>
      equipmentToFeatures(
        displayedPlaced,
        anchor,
        selectedEquipmentId,
        layoutEdit.selectedIds,
        hasLayoutDraft
          ? layoutEdit.selectedIds
          : hasTerrainFitDraft
            ? displayedPlaced.map((item) => item.id)
            : []
      ),
    [
      displayedPlaced,
      anchor,
      selectedEquipmentId,
      layoutEdit.selectedIds,
      hasLayoutDraft,
      hasTerrainFitDraft,
    ]
  );
  const equipment3DDetailsFc = useMemo(
    () => equipment3DDetailFeatures(displayedPlaced, anchor),
    [displayedPlaced, anchor]
  );
  const equipment3DLabelsFc = useMemo(
    () => equipment3DLabelFeatures(displayedPlaced, anchor),
    [displayedPlaced, anchor]
  );
  const selectedSpec = useMemo(() => {
    const selected = displayedPlaced.find((item) => item.id === selectedEquipmentId);
    return selected
      ? equipmentCatalog.find((item) => item.id === selected.equipmentSpecId)
      : null;
  }, [displayedPlaced, selectedEquipmentId]);
  const selectedVisualProfile = useMemo(
    () => resolveEquipment3DVisualProfile(selectedSpec),
    [selectedSpec]
  );
  const metrics = getProjectMetrics(polygon, displayedPlaced, anchor);
  const bufferFc = useMemo(
    () => regulatoryBufferFeatures(displayedPlaced, anchor, profile),
    [displayedPlaced, anchor, profile]
  );
  const conceptualInfrastructure = useMemo(
    () =>
      generateConceptualPhysicalInfrastructure({
        placed: displayedPlaced,
        anchor,
        polygon,
        hasPoi: !!poi,
      }),
    [displayedPlaced, anchor, polygon, poi]
  );
  const previewCableRoutes = terrainFitPreview.result?.cableRoutes ?? [];
  const previewAccessRoads = terrainFitPreview.result?.accessRoads ?? [];
  const renderedCableRoutes =
    hasTerrainFitDraft && previewCableRoutes.length > 0
      ? previewCableRoutes
      : storedCableRoutes.length > 0
      ? storedCableRoutes
      : conceptualInfrastructure.cableRoutes;
  const renderedAccessRoads =
    hasTerrainFitDraft && previewAccessRoads.length > 0
      ? previewAccessRoads
      : storedAccessRoads.length > 0
      ? storedAccessRoads
      : conceptualInfrastructure.accessRoads;
  const layoutZoneFc = useMemo(
    () => layoutZoneFeatures(conceptualInfrastructure.layoutZones, anchor),
    [conceptualInfrastructure.layoutZones, anchor]
  );
  const layoutZoneLabelFc = useMemo(
    () => layoutZoneLabelFeatures(conceptualInfrastructure.layoutZones, anchor),
    [conceptualInfrastructure.layoutZones, anchor]
  );
  const cableRouteCorridorFc = useMemo(
    () => cableRouteCorridorFeatures(renderedCableRoutes, anchor),
    [renderedCableRoutes, anchor]
  );
  const cableRouteLineFc = useMemo(
    () => cableRouteLineFeatures(renderedCableRoutes, anchor),
    [renderedCableRoutes, anchor]
  );
  const accessRoadCorridorFc = useMemo(
    () => accessRoadCorridorFeatures(renderedAccessRoads, anchor),
    [renderedAccessRoads, anchor]
  );
  const accessRoadLineFc = useMemo(
    () => accessRoadLineFeatures(renderedAccessRoads, anchor),
    [renderedAccessRoads, anchor]
  );
  const gridFc = useMemo(
    () => gridLineFeatures({ polygon, placed: displayedPlaced, anchor }),
    [polygon, displayedPlaced, anchor]
  );
  const warningMarkerFc = useMemo(
    () => warningMarkerFeatures(metrics.warnings, displayedPlaced),
    [metrics.warnings, displayedPlaced]
  );
  const measurementFc = useMemo(
    () => measurementLabelFeatures(polygon, anchor),
    [polygon, anchor]
  );
  const selectionFc = useMemo(
    () => polygonToFeature(layoutEdit.selectionPolygon),
    [layoutEdit.selectionPolygon]
  );
  const selectionLineFc = useMemo(
    () => polygonToLineFeature(layoutEdit.selectionPolygon),
    [layoutEdit.selectionPolygon]
  );
  const selectionVerticesFc = useMemo(
    () => polygonVerticesToFeature(layoutEdit.selectionPolygon),
    [layoutEdit.selectionPolygon]
  );
  const searchedPointFc = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: searchedPoint
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "Point" as const,
                coordinates: [searchedPoint.lng, searchedPoint.lat],
              },
            },
          ]
        : [],
    }),
    [searchedPoint]
  );
  const t = copyFor(locale);
  const mapStyle = layerVisibility.baseMap
    ? resolvedBaseMap.style
    : BLANK_BASE_MAP_STYLE;
  const equipmentVisibleTypes = useMemo(() => {
    const types: string[] = [];
    if (layerVisibility.bessContainers) types.push("battery_container");
    if (layerVisibility.pcs) types.push("pcs_mv_station");
    if (layerVisibility.transformers) types.push("mv_transformer");
    return types;
  }, [
    layerVisibility.bessContainers,
    layerVisibility.pcs,
    layerVisibility.transformers,
  ]);
  const equipmentTypeFilter = useMemo<FilterSpecification>(
    () =>
      (equipmentVisibleTypes.length > 0
        ? ["match", ["get", "type"], equipmentVisibleTypes, true, false]
        : ["==", ["get", "type"], "__hidden__"]) as unknown as FilterSpecification,
    [equipmentVisibleTypes]
  );
  const equipmentAnd3DFilter = useMemo<FilterSpecification>(
    () =>
      ["all", equipmentTypeFilter, ["==", ["get", "has3D"], true]] as unknown as FilterSpecification,
    [equipmentTypeFilter]
  );
  const equipmentLockedFilter = useMemo<FilterSpecification>(
    () =>
      ["all", equipmentTypeFilter, ["==", ["get", "locked"], true]] as unknown as FilterSpecification,
    [equipmentTypeFilter]
  );
  const threeDVisible = viewMode === "iso" && layerVisibility.threeD;

  const fitToPolygon = (duration = 600) => {
    if (!isMapLoaded) return;
    if (polygon.length < 3) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    const lngs = polygon.map((p) => p.lng);
    const lats = polygon.map((p) => p.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 90, duration }
    );
  };

  useEffect(() => {
    if (interactionMode === "draw-site" || interactionMode === "draw-repair-zone")
      return;
    fitToPolygon();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionMode, isMapLoaded, polygon]);

  const centerMap = () => {
    if (polygon.length >= 3) {
      fitToPolygon(500);
      return;
    }
    mapRef.current?.getMap().flyTo({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      duration: 500,
    });
  };

  const searchCoordinates = (coordinates: { lat: number; lng: number }) => {
    setSearchedPoint(coordinates);
    mapRef.current?.getMap().flyTo({
      center: [coordinates.lng, coordinates.lat],
      zoom: 17,
      duration: 700,
    });
  };

  const handleClick = (e: MapMouseEvent) => {
    if (suppressPreviewTerrainClickRef.current) {
      suppressPreviewTerrainClickRef.current = false;
      return;
    }
    if (suppressLayoutEditClickRef.current) {
      suppressLayoutEditClickRef.current = false;
      return;
    }
    const { lng, lat } = e.lngLat;
    if (interactionMode === "draw-site") {
      addPolygonVertex({ lng, lat });
      return;
    }
    if (interactionMode === "draw-repair-zone") {
      addRepairZoneVertex({ lng, lat });
      return;
    }
    if (interactionMode === "place-equipment") {
      placeEquipmentAt({ lng, lat });
      return;
    }
    if (isLayoutEditMode) {
      // Direct click-select on an equipment hit: bypass the lasso entirely.
      // Shift toggles the id in the selection; a plain click replaces it.
      const map = mapRef.current?.getMap();
      const hit = map
        ? (map.queryRenderedFeatures(e.point, { layers: ["equipment-fill"] })[0]
            ?.properties?.id as string | undefined)
        : undefined;
      if (hit) {
        const shiftHeld = e.originalEvent.shiftKey;
        let nextIds: string[];
        if (shiftHeld) {
          const set = new Set(layoutEdit.selectedIds);
          if (set.has(hit)) set.delete(hit);
          else set.add(hit);
          nextIds = Array.from(set);
        } else {
          nextIds = [hit];
        }
        setLayoutEditSelection(nextIds, []);
        return;
      }
      // Click on empty space: lasso vertex (existing behaviour).
      const nextPolygon = [...layoutEdit.selectionPolygon, { lng, lat }];
      const selectedIds =
        nextPolygon.length >= 3
          ? selectEquipmentWithinPolygon({
              placed: displayedPlaced,
              anchor,
              polygon: nextPolygon,
            })
          : [];
      setLayoutEditSelection(selectedIds, nextPolygon);
      return;
    }
    const map = mapRef.current?.getMap();
    if (!map) return;
    const features = map.queryRenderedFeatures(e.point, {
      layers: ["equipment-fill"],
    });
    if (features.length > 0) {
      const id = features[0].properties?.id as string | undefined;
      if (id) selectEquipment(id);
    } else {
      selectEquipment(null);
    }
  };

  const handleMouseDown = (event: MapMouseEvent) => {
    if (isLayoutEditMode) {
      if (event.originalEvent.button !== 0) return;
      if (layoutEdit.selectedIds.length === 0) return;
      const map = mapRef.current?.getMap();
      if (!map) return;
      const features = map.queryRenderedFeatures(event.point, {
        layers: ["equipment-fill"],
      });
      const hitId = features[0]?.properties?.id as string | undefined;
      if (hitId && layoutEdit.selectedIds.includes(hitId)) {
        setLayoutMoveDrag({ lng: event.lngLat.lng, lat: event.lngLat.lat });
      }
      return;
    }
    if (!previewTerrain) return;
    if (
      interactionMode === "draw-site" ||
      interactionMode === "draw-repair-zone" ||
      interactionMode === "place-equipment" ||
      isLayoutEditMode
    ) {
      return;
    }
    if (event.originalEvent.button !== 0) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    const handleFeatures = map.queryRenderedFeatures(event.point, {
      layers: ["terrain-preview-rotation-handle"],
    });
    if (handleFeatures.length > 0) {
      const terrainAnchor = {
        lng0: previewTerrain.center.lng,
        lat0: previewTerrain.center.lat,
      };
      const local = toLocal(
        { lng: event.lngLat.lng, lat: event.lngLat.lat },
        terrainAnchor
      );
      setPreviewTerrainRotate({
        startAngleDeg: (Math.atan2(local.y_m, local.x_m) * 180) / Math.PI,
        startRotationDeg: previewTerrain.rotationDeg,
        moved: false,
      });
      return;
    }

    const features = map.queryRenderedFeatures(event.point, {
      layers: ["terrain-preview-fill"],
    });
    if (features.length === 0) return;
    setPreviewTerrainDrag({
      last: { lng: event.lngLat.lng, lat: event.lngLat.lat },
      moved: false,
    });
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    if (layoutMoveDrag) {
      if (!anchor) return;
      const previous = toLocal(layoutMoveDrag, anchor);
      const next = toLocal(
        { lng: event.lngLat.lng, lat: event.lngLat.lat },
        anchor
      );
      previewMoveSelection({
        x_m: next.x_m - previous.x_m,
        y_m: next.y_m - previous.y_m,
      });
      setLayoutMoveDrag({ lng: event.lngLat.lng, lat: event.lngLat.lat });
      return;
    }
    if (previewTerrainRotate && previewTerrain) {
      const terrainAnchor = {
        lng0: previewTerrain.center.lng,
        lat0: previewTerrain.center.lat,
      };
      const local = toLocal(
        { lng: event.lngLat.lng, lat: event.lngLat.lat },
        terrainAnchor
      );
      const currentAngleDeg = (Math.atan2(local.y_m, local.x_m) * 180) / Math.PI;
      const deltaDeg = shortestDeltaDeg(
        previewTerrainRotate.startAngleDeg,
        currentAngleDeg
      );
      updatePreviewTerrain({
        rotationDeg: normalizeRotation(
          previewTerrainRotate.startRotationDeg + deltaDeg
        ),
      });
      setPreviewTerrainRotate((current) =>
        current ? { ...current, moved: true } : current
      );
      return;
    }

    if (!previewTerrainDrag || !previewTerrain) return;
    const terrainAnchor = {
      lng0: previewTerrain.center.lng,
      lat0: previewTerrain.center.lat,
    };
    const previous = toLocal(previewTerrainDrag.last, terrainAnchor);
    const next = toLocal(
      { lng: event.lngLat.lng, lat: event.lngLat.lat },
      terrainAnchor
    );
    movePreviewTerrainBy({
      x_m: next.x_m - previous.x_m,
      y_m: next.y_m - previous.y_m,
    });
    setPreviewTerrainDrag({
      last: { lng: event.lngLat.lng, lat: event.lngLat.lat },
      moved: true,
    });
  };

  const handleMouseUp = () => {
    if (layoutMoveDrag) {
      suppressLayoutEditClickRef.current = true;
      setLayoutMoveDrag(null);
      return;
    }
    if (previewTerrainRotate) {
      suppressPreviewTerrainClickRef.current = previewTerrainRotate.moved;
      setPreviewTerrainRotate(null);
      return;
    }
    if (!previewTerrainDrag) return;
    suppressPreviewTerrainClickRef.current = previewTerrainDrag.moved;
    setPreviewTerrainDrag(null);
  };

  const cursor = layoutMoveDrag
    ? "grabbing"
    : interactionMode === "draw-site" ||
    interactionMode === "place-equipment" ||
    interactionMode === "draw-repair-zone" ||
    isLayoutEditMode
      ? "crosshair"
      : previewTerrainDrag
        ? "grabbing"
        : previewTerrainRotate
          ? "grabbing"
        : previewTerrain
          ? "grab"
          : "grab";

  const floatingButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 bg-slate-950/90 text-slate-200 shadow-lg backdrop-blur transition hover:border-cyan-400 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="relative h-full w-full bg-slate-950">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMoveEnd={updateMapCenterFromInstance}
        onLoad={handleLoad}
        onError={handleError}
        cursor={cursor}
        dragPan={!previewTerrain && !isLayoutEditMode}
      >
        <Source id="layout-grid" type="geojson" data={gridFc}>
          <Layer
            id="layout-grid-lines"
            type="line"
            layout={{
              visibility: layerVisibility.grid ? "visible" : "none",
            }}
            paint={{
              "line-color": "#38bdf8",
              "line-width": 0.7,
              "line-opacity": 0.26,
            }}
          />
        </Source>

        <Source id="site-polygon" type="geojson" data={polygonFc}>
          <Layer
            id="site-polygon-fill"
            type="fill"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.terrainFill
                  ? "visible"
                  : "none",
            }}
            paint={{ "fill-color": "#10b981", "fill-opacity": 0.18 }}
          />
        </Source>

        <Source id="site-polygon-line" type="geojson" data={polygonLineFc}>
          <Layer
            id="site-polygon-stroke"
            type="line"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.terrainOutline
                  ? "visible"
                  : "none",
            }}
            paint={{ "line-color": "#10b981", "line-width": 2 }}
          />
        </Source>

        <Source id="terrain-measurements" type="geojson" data={measurementFc}>
          <Layer
            id="terrain-measurement-labels"
            type="symbol"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.measurements
                  ? "visible"
                  : "none",
              "text-field": ["get", "label"],
              "text-size": 11,
              "text-allow-overlap": true,
              "text-anchor": "center",
            }}
            paint={{
              "text-color": "#f8fafc",
              "text-halo-color": "#020617",
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        <Source
          id="site-polygon-vertices"
          type="geojson"
          data={polygonVerticesFc}
        >
          <Layer
            id="site-polygon-vertex-points"
            type="circle"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.terrainOutline
                  ? "visible"
                  : "none",
            }}
            paint={{
              "circle-radius": 5,
              "circle-color": "#10b981",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source id="terrain-preview" type="geojson" data={previewTerrainFc}>
          <Layer
            id="terrain-preview-fill"
            type="fill"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.terrainFill
                  ? "visible"
                  : "none",
            }}
            paint={{ "fill-color": "#38bdf8", "fill-opacity": 0.14 }}
          />
        </Source>

        <Source id="terrain-preview-line" type="geojson" data={previewTerrainLineFc}>
          <Layer
            id="terrain-preview-stroke"
            type="line"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.terrainOutline
                  ? "visible"
                  : "none",
            }}
            paint={{
              "line-color": "#67e8f9",
              "line-width": 2,
              "line-dasharray": [2, 1.5],
            }}
          />
        </Source>

        <Source
          id="terrain-preview-vertices"
          type="geojson"
          data={previewTerrainVerticesFc}
        >
          <Layer
            id="terrain-preview-vertex-points"
            type="circle"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.terrainOutline
                  ? "visible"
                  : "none",
            }}
            paint={{
              "circle-radius": 5,
              "circle-color": "#67e8f9",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source
          id="terrain-preview-center"
          type="geojson"
          data={previewTerrainCenterFc}
        >
          <Layer
            id="terrain-preview-center-dot"
            type="circle"
            layout={{
              visibility: layerVisibility.terrain ? "visible" : "none",
            }}
            paint={{
              "circle-radius": 4,
              "circle-color": "#f8fafc",
              "circle-stroke-color": "#0891b2",
              "circle-stroke-width": 2,
            }}
          />
          <Layer
            id="terrain-preview-label"
            type="symbol"
            layout={{
              visibility:
                layerVisibility.terrain && layerVisibility.labels
                  ? "visible"
                  : "none",
              "text-field": ["get", "label"],
              "text-size": 11,
              "text-offset": [0, -1.8],
              "text-anchor": "bottom",
              "text-allow-overlap": true,
            }}
            paint={{
              "text-color": "#ecfeff",
              "text-halo-color": "#020617",
              "text-halo-width": 1.5,
            }}
          />
        </Source>

        <Source
          id="terrain-preview-rotation"
          type="geojson"
          data={previewTerrainRotationHandleFc}
        >
          <Layer
            id="terrain-preview-rotation-line"
            type="line"
            filter={["==", ["get", "kind"], "rotation-line"]}
            layout={{
              visibility: layerVisibility.terrain ? "visible" : "none",
            }}
            paint={{
              "line-color": "#facc15",
              "line-width": 1.5,
              "line-dasharray": [2, 1.5],
            }}
          />
          <Layer
            id="terrain-preview-rotation-handle"
            type="circle"
            filter={["==", ["get", "kind"], "rotation-handle"]}
            layout={{
              visibility: layerVisibility.terrain ? "visible" : "none",
            }}
            paint={{
              "circle-radius": 7,
              "circle-color": "#facc15",
              "circle-stroke-color": "#020617",
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source id="repair-zone" type="geojson" data={repairZoneFc}>
          <Layer
            id="repair-zone-fill"
            type="fill"
            layout={{
              visibility: showRepairZoneOverlay ? "visible" : "none",
            }}
            paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.16 }}
          />
        </Source>

        <Source id="repair-zone-line" type="geojson" data={repairZoneLineFc}>
          <Layer
            id="repair-zone-stroke"
            type="line"
            layout={{
              visibility: showRepairZoneOverlay ? "visible" : "none",
            }}
            paint={{
              "line-color": "#f59e0b",
              "line-width": 2,
              "line-dasharray": [2, 1.5],
            }}
          />
        </Source>

        <Source id="layout-edit-selection" type="geojson" data={selectionFc}>
          <Layer
            id="layout-edit-selection-fill"
            type="fill"
            paint={{
              "fill-color": "#06b6d4",
              "fill-opacity": isLayoutEditMode ? 0.12 : 0,
            }}
          />
          <Layer
            id="layout-edit-selection-line"
            type="line"
            paint={{
              "line-color": "#22d3ee",
              "line-width": 2,
              "line-dasharray": [2, 1.5],
              "line-opacity": isLayoutEditMode ? 0.9 : 0,
            }}
          />
        </Source>

        <Source id="layout-edit-selection-line" type="geojson" data={selectionLineFc}>
          <Layer
            id="layout-edit-selection-open-line"
            type="line"
            paint={{
              "line-color": "#22d3ee",
              "line-width": 2,
              "line-dasharray": [2, 1.5],
              "line-opacity": isLayoutEditMode ? 0.9 : 0,
            }}
          />
        </Source>

        <Source
          id="layout-edit-selection-vertices"
          type="geojson"
          data={selectionVerticesFc}
        >
          <Layer
            id="layout-edit-selection-vertex-points"
            type="circle"
            paint={{
              "circle-radius": 5,
              "circle-color": "#22d3ee",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
              "circle-opacity": isLayoutEditMode ? 1 : 0,
            }}
          />
        </Source>

        <Source
          id="repair-zone-vertices"
          type="geojson"
          data={repairZoneVerticesFc}
        >
          <Layer
            id="repair-zone-vertex-points"
            type="circle"
            layout={{
              visibility: showRepairZoneOverlay ? "visible" : "none",
            }}
            paint={{
              "circle-radius": 5,
              "circle-color": "#f59e0b",
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source id="access-road-corridors" type="geojson" data={accessRoadCorridorFc}>
          <Layer
            id="access-road-corridor-fill"
            type="fill"
            layout={{
              visibility: layerVisibility.accessRoads ? "visible" : "none",
            }}
            paint={{
              "fill-color": "#475569",
              "fill-opacity": 0.34,
            }}
          />
          <Layer
            id="access-road-corridor-outline"
            type="line"
            layout={{
              visibility: layerVisibility.accessRoads ? "visible" : "none",
            }}
            paint={{
              "line-color": "#94a3b8",
              "line-width": 1,
              "line-opacity": 0.75,
            }}
          />
        </Source>

        <Source id="access-road-lines" type="geojson" data={accessRoadLineFc}>
          <Layer
            id="access-road-center-lines"
            type="line"
            layout={{
              visibility: layerVisibility.accessRoads ? "visible" : "none",
            }}
            paint={{
              "line-color": "#cbd5e1",
              "line-width": 1.5,
              "line-dasharray": [3, 2],
              "line-opacity": 0.8,
            }}
          />
        </Source>

        <Source id="mv-layout-zones" type="geojson" data={layoutZoneFc}>
          <Layer
            id="mv-layout-zone-fill"
            type="fill"
            layout={{
              visibility: layerVisibility.mvInfrastructure ? "visible" : "none",
            }}
            paint={{
              "fill-color": [
                "match",
                ["get", "type"],
                "mv_yard",
                "#a855f7",
                "poi_yard",
                "#f59e0b",
                "#64748b",
              ],
              "fill-opacity": 0.2,
            }}
          />
          <Layer
            id="mv-layout-zone-outline"
            type="line"
            layout={{
              visibility: layerVisibility.mvInfrastructure ? "visible" : "none",
            }}
            paint={{
              "line-color": [
                "match",
                ["get", "type"],
                "mv_yard",
                "#d8b4fe",
                "poi_yard",
                "#fbbf24",
                "#cbd5e1",
              ],
              "line-width": 1.8,
              "line-dasharray": [2, 1.5],
            }}
          />
        </Source>

        <Source id="mv-layout-zone-labels" type="geojson" data={layoutZoneLabelFc}>
          <Layer
            id="mv-layout-zone-label-text"
            type="symbol"
            layout={{
              visibility:
                layerVisibility.mvInfrastructure && layerVisibility.labels
                  ? "visible"
                  : "none",
              "text-field": ["get", "label"],
              "text-size": 11,
              "text-allow-overlap": true,
              "text-anchor": "center",
            }}
            paint={{
              "text-color": "#f8fafc",
              "text-halo-color": "#020617",
              "text-halo-width": 1.4,
            }}
          />
        </Source>

        <Source id="cable-route-corridors" type="geojson" data={cableRouteCorridorFc}>
          <Layer
            id="cable-route-corridor-fill"
            type="fill"
            layout={{
              visibility: layerVisibility.cableRoutes ? "visible" : "none",
            }}
            paint={{
              "fill-color": "#f97316",
              "fill-opacity": 0.13,
            }}
          />
        </Source>

        <Source id="cable-route-lines" type="geojson" data={cableRouteLineFc}>
          <Layer
            id="cable-route-center-lines"
            type="line"
            layout={{
              visibility: layerVisibility.cableRoutes ? "visible" : "none",
            }}
            paint={{
              "line-color": "#fb923c",
              "line-width": 2,
              "line-opacity": 0.86,
            }}
          />
        </Source>

        <Source id="regulatory-buffers" type="geojson" data={bufferFc}>
          <Layer
            id="regulatory-buffer-fill"
            type="fill"
            layout={{
              visibility: layerVisibility.buffers ? "visible" : "none",
            }}
            paint={{
              "fill-color": [
                "match",
                ["get", "bufferType"],
                "normative_separation",
                "#38bdf8",
                "maintenance_aisle",
                "#22c55e",
                "#64748b",
              ],
              "fill-opacity": [
                "match",
                ["get", "bufferType"],
                "normative_separation",
                0.09,
                "maintenance_aisle",
                0.12,
                0.08,
              ],
            }}
          />
          <Layer
            id="regulatory-buffer-outline"
            type="line"
            layout={{
              visibility: layerVisibility.buffers ? "visible" : "none",
            }}
            paint={{
              "line-color": [
                "match",
                ["get", "bufferType"],
                "normative_separation",
                "#38bdf8",
                "maintenance_aisle",
                "#22c55e",
                "#64748b",
              ],
              "line-width": 1,
              "line-dasharray": [2, 2],
              "line-opacity": 0.65,
            }}
          />
        </Source>

        <Source id="equipment" type="geojson" data={equipmentFc}>
          <Layer
            id="equipment-fill"
            type="fill"
            filter={equipmentTypeFilter}
            paint={{
              "fill-color": [
                "case",
                ["==", ["get", "draftEdited"], true],
                "#f97316",
                ["==", ["get", "massSelected"], true],
                "#0891b2",
                [
                  "match",
                  ["get", "type"],
                  "battery_container",
                  "#2563eb",
                  "pcs_mv_station",
                  "#f59e0b",
                  "#6b7280",
                ],
              ],
              "fill-opacity": [
                "case",
                ["==", ["get", "selected"], true],
                0.85,
                0.6,
              ],
            }}
          />
          <Layer
            id="equipment-outline"
            type="line"
            filter={equipmentTypeFilter}
            paint={{
              "line-color": [
                "case",
                ["==", ["get", "draftEdited"], true],
                "#fed7aa",
                ["==", ["get", "selected"], true],
                "#22d3ee",
                "#111827",
              ],
              "line-width": [
                "case",
                ["==", ["get", "selected"], true],
                3,
                ["==", ["get", "draftEdited"], true],
                3,
                1,
              ],
            }}
          />
          <Layer
            id="equipment-locked-outline"
            type="line"
            filter={equipmentLockedFilter}
            paint={{
              "line-color": "#fbbf24",
              "line-width": 2,
              "line-dasharray": [2, 1.5],
            }}
          />
          <Layer
            id="equipment-labels"
            type="symbol"
            filter={equipmentTypeFilter}
            layout={{
              visibility:
                viewMode === "iso" || !layerVisibility.labels
                  ? "none"
                  : "visible",
              "text-field": ["get", "label"],
              "text-size": 10,
              "text-max-width": 12,
              "text-allow-overlap": false,
            }}
            paint={{
              "text-color": "#e5e7eb",
              "text-halo-color": "#020617",
              "text-halo-width": 1.2,
            }}
          />
          <Layer
            id="equipment-3d-body"
            type="fill-extrusion"
            filter={equipmentAnd3DFilter}
            layout={{ visibility: threeDVisible ? "visible" : "none" }}
            paint={{
              "fill-extrusion-color": [
                "match",
                ["get", "visualProfile"],
                "sungrow_container_v1",
                "#d8dde4",
                "sungrow_pcs_v1",
                "#a8b0ba",
                "#94a3b8",
              ],
              "fill-extrusion-height": ["get", "heightM"],
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.95,
              "fill-extrusion-vertical-gradient": layerVisibility.shadows,
            }}
          />
          <Layer
            id="equipment-3d-roof"
            type="fill-extrusion"
            filter={equipmentAnd3DFilter}
            layout={{ visibility: threeDVisible ? "visible" : "none" }}
            paint={{
              "fill-extrusion-color": [
                "match",
                ["get", "visualProfile"],
                "sungrow_container_v1",
                "#eef2f7",
                "sungrow_pcs_v1",
                "#cbd5e1",
                "#3a4252",
              ],
              "fill-extrusion-height": ["get", "heightM"],
              "fill-extrusion-base": [
                "max",
                0,
                ["-", ["get", "heightM"], 0.18],
              ],
              "fill-extrusion-opacity": 1,
            }}
          />
        </Source>

        <Source
          id="equipment-3d-details"
          type="geojson"
          data={equipment3DDetailsFc}
        >
          <Layer
            id="equipment-3d-detail-extrusions"
            type="fill-extrusion"
            filter={equipmentTypeFilter}
            layout={{ visibility: threeDVisible ? "visible" : "none" }}
            paint={{
              "fill-extrusion-color": ["get", "color"],
              "fill-extrusion-height": ["get", "topM"],
              "fill-extrusion-base": ["get", "baseM"],
              "fill-extrusion-opacity": 0.98,
              "fill-extrusion-vertical-gradient": false,
            }}
          />
        </Source>

        <Source
          id="equipment-3d-brand-labels"
          type="geojson"
          data={equipment3DLabelsFc}
        >
          <Layer
            id="equipment-3d-brand-labels"
            type="symbol"
            filter={equipmentTypeFilter}
            layout={{
              visibility:
                threeDVisible && layerVisibility.labels ? "visible" : "none",
              "text-field": ["get", "label"],
              "text-size": 20,
              "text-letter-spacing": 0.12,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
              "text-rotation-alignment": "map",
              "text-pitch-alignment": "map",
              "text-rotate": ["get", "rotationDeg"],
              "text-offset": [0, 0],
            }}
            paint={{
              "text-color": ["get", "color"],
              "text-halo-color": "#0f5f99",
              "text-halo-width": 2.2,
            }}
          />
        </Source>

        <Source id="layout-warning-markers" type="geojson" data={warningMarkerFc}>
          <Layer
            id="layout-collision-markers"
            type="circle"
            filter={["==", ["get", "warningType"], "collision"]}
            layout={{
              visibility: layerVisibility.collisions ? "visible" : "none",
            }}
            paint={{
              "circle-radius": 9,
              "circle-color": "#ef4444",
              "circle-opacity": 0.85,
              "circle-stroke-color": "#fee2e2",
              "circle-stroke-width": 2,
            }}
          />
          <Layer
            id="layout-out-of-bounds-markers"
            type="circle"
            filter={["==", ["get", "warningType"], "outOfBounds"]}
            layout={{
              visibility: layerVisibility.outOfBounds ? "visible" : "none",
            }}
            paint={{
              "circle-radius": 8,
              "circle-color": "#60a5fa",
              "circle-opacity": 0.9,
              "circle-stroke-color": "#dbeafe",
              "circle-stroke-width": 2,
            }}
          />
        </Source>

        <Source
          id="coordinate-search-point"
          type="geojson"
          data={searchedPointFc}
        >
          <Layer
            id="coordinate-search-halo"
            type="circle"
            paint={{
              "circle-radius": 13,
              "circle-color": "#facc15",
              "circle-opacity": 0.22,
              "circle-stroke-color": "#facc15",
              "circle-stroke-width": 1,
            }}
          />
          <Layer
            id="coordinate-search-dot"
            type="circle"
            paint={{
              "circle-radius": 5,
              "circle-color": "#facc15",
              "circle-stroke-color": "#020617",
              "circle-stroke-width": 2,
            }}
          />
        </Source>
      </Map>

      <LayerManagerPanel
        isOpen={isLayerPanelOpen}
        onToggle={() => setIsLayerPanelOpen((current) => !current)}
        onClose={() => setIsLayerPanelOpen(false)}
        locale={locale}
      />

      <div className="absolute left-4 top-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          className={floatingButton}
          onClick={() =>
            interactionMode === "draw-site"
              ? finishPolygon()
              : startDrawingPolygon()
          }
          title={
            interactionMode === "draw-site"
              ? t.map.finishTitle
              : metrics.hasTerrain
                ? t.map.redrawTitle
                : t.map.drawTitle
          }
        >
          {interactionMode === "draw-site" ? (
            <MousePointer2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <SquarePen className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className={floatingButton}
          onClick={() => clearPolygon()}
          disabled={polygon.length === 0}
          title={t.map.clearTitle}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={floatingButton}
          onClick={centerMap}
          title={t.map.centerTitle}
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={`${floatingButton} ${
            isLayoutEditMode ? "border-cyan-400 bg-cyan-950 text-cyan-100" : ""
          }`}
          onClick={() => (isLayoutEditMode ? cancelLayoutEdit() : startLayoutEdit())}
          disabled={displayedPlaced.length === 0}
          title={
            isLayoutEditMode
              ? locale === "es"
                ? "Salir de edición de layout"
                : "Exit layout edit"
              : locale === "es"
                ? "Editar layout por selección por puntos"
                : "Edit layout with point selection"
          }
        >
          {isLayoutEditMode ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <MousePointer2 className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        {interactionMode === "place-equipment" ? (
          <button
            type="button"
            className={floatingButton}
            onClick={() => setPlacementSpec(null)}
            title={t.map.stopPlacementTitle}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="absolute left-16 right-4 top-4 z-10 flex flex-wrap items-start gap-2 sm:right-auto">
        <CoordinateSearch
          placeholder={t.map.coordinateSearchPlaceholder}
          submitTitle={t.map.coordinateSearchTitle}
          invalidMessage={t.map.invalidCoordinates}
          onSearch={searchCoordinates}
        />
      </div>

      {resolvedBaseMap.provider === "google" ? (
        <div
          className="absolute bottom-2 right-3 z-10 rounded-sm bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-900 shadow-sm"
          aria-label="Google Maps"
        >
          Google Maps
        </div>
      ) : null}

      {mapError ? (
        <div className="absolute left-16 top-20 z-10 max-w-md rounded border border-amber-700 bg-zinc-950/95 p-3 text-xs leading-relaxed text-amber-100 shadow-xl">
          <div className="mb-1 font-semibold uppercase tracking-wider text-amber-300">
            {t.map.unavailableTitle}
          </div>
          <div>
            {mapError.includes("WebGL")
              ? t.map.webglUnavailable
              : mapError}
          </div>
        </div>
      ) : null}

      {isLayoutEditMode ? (
        <LayoutEditToolbar
          locale={locale}
          selectedCount={layoutEdit.selectedIds.length}
          lockedCount={lockedSelectedCount}
          hasDraft={hasLayoutDraft}
          warningCount={metrics.warnings.filter((item) => item.severity === "warn").length}
          errorCount={metrics.errors.length}
          isValidated={layoutEdit.lastValidationAt !== null}
          repairMessage={lastRepairResult?.message ?? null}
          selectionPointCount={layoutEdit.selectionPolygon.length}
          onRotateCw={() => previewRotateSelection(90)}
          onRotateCcw={() => previewRotateSelection(-90)}
          onRotate180={() => previewRotateSelection(180)}
          onHorizontal={() => previewOrientSelection(0)}
          onVertical={() => previewOrientSelection(90)}
          onMoveUp={() => previewMoveSelection({ x_m: 0, y_m: LAYOUT_MOVE_STEP_M })}
          onMoveDown={() => previewMoveSelection({ x_m: 0, y_m: -LAYOUT_MOVE_STEP_M })}
          onMoveLeft={() => previewMoveSelection({ x_m: -LAYOUT_MOVE_STEP_M, y_m: 0 })}
          onMoveRight={() => previewMoveSelection({ x_m: LAYOUT_MOVE_STEP_M, y_m: 0 })}
          onToggleLock={() =>
            setSelectionLocked(
              lockedSelectedCount < layoutEdit.selectedIds.length
            )
          }
          onRepair={() => previewRepairSelection(profile.rules)}
          onCompact={() => previewCompactSelection(profile.rules)}
          onValidate={markLayoutEditValidated}
          onRevert={revertLayoutEdit}
          onApply={applyLayoutEdit}
          onClearSelection={clearLayoutEditSelection}
        />
      ) : null}

      <div className="absolute bottom-10 right-3 z-10 flex flex-col items-end gap-2">
        {viewMode === "iso" && non3DCount > 0 ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-100 shadow-lg backdrop-blur">
            {locale === "es"
              ? `${non3DCount} equipo(s) sin datos 3D · vista plana`
              : `${non3DCount} item(s) without 3D data · flat view`}
          </div>
        ) : null}
        <OrientationCube
          mapRef={mapRef}
          isMapLoaded={isMapLoaded}
          locale={locale}
        />
        <BaseMapSelector
          value={baseMapStyleId}
          onChange={setBaseMapStyleId}
          labels={t.map.baseMapStyles}
          unavailableLabel={t.map.mapTilerKeyRequired}
        />
      </div>

      {selectedSpec ? (
        <div className="absolute bottom-10 left-4 z-10 w-[min(360px,calc(100%-32px))] rounded-lg border border-slate-700 bg-slate-950/92 p-3 text-xs text-slate-200 shadow-xl backdrop-blur">
          <div className="mb-2 font-semibold text-slate-50">
            {selectedSpec.manufacturer} {selectedSpec.model}
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <dt className="text-slate-500">MWh</dt>
            <dd className="text-right font-mono">
              {selectedSpec.electrical?.energy_mwh_dc_bol
                ? formatEnergyMWh(selectedSpec.electrical.energy_mwh_dc_bol, {
                    digits: 2,
                    locale,
                  })
                : "-"}
            </dd>
            <dt className="text-slate-500">MW</dt>
            <dd className="text-right font-mono">
              {selectedSpec.electrical?.apparent_power_mva
                ? formatApparentPowerMva(
                    selectedSpec.electrical.apparent_power_mva,
                    { digits: 2, locale }
                  )
                : "-"}
            </dd>
            <dt className="text-slate-500">{locale === "es" ? "Dimensiones" : "Dimensions"}</dt>
            <dd className="text-right font-mono">
              {formatLength(selectedSpec.footprint.length_m, {
                digits: 2,
                locale,
              })} x{" "}
              {formatLength(selectedSpec.footprint.width_m, {
                digits: 2,
                locale,
              })}
            </dd>
            {selectedSpec.footprint.height_m ? (
              <>
                <dt className="text-slate-500">
                  {locale === "es" ? "Alto" : "Height"}
                </dt>
                <dd className="text-right font-mono">
                  {formatLength(selectedSpec.footprint.height_m, {
                    digits: 2,
                    locale,
                  })}
                </dd>
              </>
            ) : null}
            <dt className="text-slate-500">{locale === "es" ? "Peso" : "Weight"}</dt>
            <dd className="text-right font-mono">
              {selectedSpec.mass
                ? formatMassTonnes(selectedSpec.mass.weight_kg, {
                    digits: 1,
                    locale,
                  })
                : "-"}
            </dd>
            <dt className="text-slate-500">{locale === "es" ? "Dato" : "Data"}</dt>
            <dd className="text-right font-mono">{selectedSpec.source.reliability}</dd>
            {selectedVisualProfile && is3DCapable(selectedSpec) ? (
              <>
                <dt className="text-slate-500">
                  {locale === "es" ? "Perfil 3D" : "3D profile"}
                </dt>
                <dd className="text-right font-mono">
                  {selectedVisualProfile.displayName}
                </dd>
              </>
            ) : null}
          </dl>
          {selectedVisualProfile && is3DCapable(selectedSpec) ? (
            <p className="mt-2 rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 text-[10px] leading-snug text-cyan-100">
              {locale === "es"
                ? "Contenedor BESS renderizado a escala real segun datasheet."
                : "BESS container rendered at real scale from datasheet data."}
            </p>
          ) : null}
          <p className="mt-2 text-[10px] leading-snug text-slate-500">
            {selectedSpec.source.notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}
