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
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { equipmentCatalog, is3DCapable } from "@/data/equipmentCatalog";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useBaseMapStyle } from "./hooks/useBaseMapStyle";
import { useMapLifecycle } from "./hooks/useMapLifecycle";
import { usePolygonFeatures } from "./hooks/usePolygonFeatures";
import { useRepairZoneFeatures } from "./hooks/useRepairZoneFeatures";
import { usePreviewTerrainFeatures } from "./hooks/usePreviewTerrainFeatures";
import { useEquipmentFeatures } from "./hooks/useEquipmentFeatures";
import { useSelectionFeatures } from "./hooks/useSelectionFeatures";
import { useLayoutInfrastructureFeatures } from "./hooks/useLayoutInfrastructureFeatures";
import { useOverlayFeatures } from "./hooks/useOverlayFeatures";
import { useMapCamera } from "./hooks/useMapCamera";
import { useDrawModeHandlers } from "./hooks/useDrawModeHandlers";
import { usePreviewTerrainGestures } from "./hooks/usePreviewTerrainGestures";
import { useLayoutEditGestures } from "./hooks/useLayoutEditGestures";
import { PolygonTerrainLayers } from "./layers/PolygonTerrainLayers";
import { EquipmentSelectionOverlayLayers } from "./layers/EquipmentSelectionOverlayLayers";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor } from "@/lib/i18n";
import {
  formatApparentPowerMva,
  formatEnergyMWh,
  formatLength,
  formatMassTonnes,
} from "@/lib/units/formatUnits";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";

import { CoordinateSearch } from "@/components/map/CoordinateSearch";
import { BaseMapSelector } from "@/components/map/BaseMapSelector";
import { LayerManagerPanel } from "@/components/map/LayerManagerPanel";
import { LayoutEditToolbar } from "@/components/map/LayoutEditToolbar";
import { OrientationCube } from "@/components/map/OrientationCube";
import { selectEquipmentWithinPolygon } from "@/lib/layout/layoutEditing";

import { INITIAL_VIEW, BLANK_BASE_MAP_STYLE, LAYOUT_MOVE_STEP_M } from "./BessMap.constants";


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

  const isLayoutEditMode = interactionMode === "edit-layout";
  const displayedPlaced = isLayoutEditMode
    ? layoutEdit.draftPlacedEquipment ?? placed
    : terrainFitPreview.draftPlacedEquipment ?? placed;
  const hasLayoutDraft = layoutEdit.draftPlacedEquipment !== null;
  const hasTerrainFitDraft = terrainFitPreview.draftPlacedEquipment !== null;

  const metrics = getProjectMetrics(polygon, displayedPlaced, anchor);

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

  const { polygonFc, polygonLineFc, polygonVerticesFc, measurementFc } =
    usePolygonFeatures(polygon, anchor);

  const { repairZoneFc, repairZoneLineFc, repairZoneVerticesFc, showRepairZoneOverlay } =
    useRepairZoneFeatures(repairZone, interactionMode);

  const {
    previewTerrainFc,
    previewTerrainLineFc,
    previewTerrainVerticesFc,
    previewTerrainCenterFc,
    previewTerrainRotationHandleFc,
  } = usePreviewTerrainFeatures(previewTerrain);

  const {
    equipmentFc,
    equipment3DDetailsFc,
    equipment3DLabelsFc,
    selectedSpec,
    selectedVisualProfile,
    equipmentTypeFilter,
    equipmentAnd3DFilter,
    equipmentLockedFilter,
    threeDVisible,
  } = useEquipmentFeatures({
    displayedPlaced,
    anchor,
    selectedEquipmentId,
    layoutEditSelectedIds: layoutEdit.selectedIds,
    hasLayoutDraft,
    hasTerrainFitDraft,
    layerVisibility,
    viewMode,
  });

  const { selectionFc, selectionLineFc, selectionVerticesFc } =
    useSelectionFeatures(layoutEdit.selectionPolygon);

  const {
    bufferFc,
    layoutZoneFc,
    layoutZoneLabelFc,
    cableRouteCorridorFc,
    cableRouteLineFc,
    accessRoadCorridorFc,
    accessRoadLineFc,
  } = useLayoutInfrastructureFeatures({
    displayedPlaced,
    anchor,
    polygon,
    poi,
    hasTerrainFitDraft,
    previewCableRoutes: terrainFitPreview.result?.cableRoutes ?? [],
    previewAccessRoads: terrainFitPreview.result?.accessRoads ?? [],
    storedCableRoutes,
    storedAccessRoads,
    profile,
  });

  const { gridFc, warningMarkerFc, searchedPointFc } = useOverlayFeatures({
    polygon,
    displayedPlaced,
    anchor,
    warnings: metrics.warnings,
    searchedPoint,
  });

  const { centerMap, searchCoordinates } = useMapCamera({
    mapRef,
    polygon,
    isMapLoaded,
    interactionMode,
    setSearchedPoint,
  });

  const { handleDrawingClick } = useDrawModeHandlers();

  const {
    previewTerrainDrag,
    previewTerrainRotate,
    suppressPreviewTerrainClickRef,
    handlePreviewTerrainMouseDown,
    handlePreviewTerrainMouseMove,
    handlePreviewTerrainMouseUp,
  } = usePreviewTerrainGestures({
    previewTerrain,
    interactionMode,
    isLayoutEditMode,
    mapRef,
    updatePreviewTerrain,
    movePreviewTerrainBy,
  });

  const {
    layoutMoveDrag,
    suppressLayoutEditClickRef,
    handleLayoutEditMouseDown,
    handleLayoutEditMouseMove,
    handleLayoutEditMouseUp,
  } = useLayoutEditGestures({
    isLayoutEditMode,
    layoutEditSelectedIds: layoutEdit.selectedIds,
    mapRef,
    anchor,
    previewMoveSelection,
  });

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





  const t = copyFor(locale);
  const mapStyle = layerVisibility.baseMap
    ? resolvedBaseMap.style
    : BLANK_BASE_MAP_STYLE;




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
    if (handleDrawingClick(lng, lat, interactionMode)) return;
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
    if (handlePreviewTerrainMouseDown(event)) return;
    handleLayoutEditMouseDown(event);
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    if (handlePreviewTerrainMouseMove(event)) return;
    handleLayoutEditMouseMove(event);
  };

  const handleMouseUp = () => {
    if (handlePreviewTerrainMouseUp()) return;
    handleLayoutEditMouseUp();
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
        <PolygonTerrainLayers
          layerVisibility={layerVisibility}
          showRepairZoneOverlay={showRepairZoneOverlay}
          gridFc={gridFc}
          polygonFc={polygonFc}
          polygonLineFc={polygonLineFc}
          polygonVerticesFc={polygonVerticesFc}
          measurementFc={measurementFc}
          previewTerrainFc={previewTerrainFc}
          previewTerrainLineFc={previewTerrainLineFc}
          previewTerrainVerticesFc={previewTerrainVerticesFc}
          previewTerrainCenterFc={previewTerrainCenterFc}
          previewTerrainRotationHandleFc={previewTerrainRotationHandleFc}
          repairZoneFc={repairZoneFc}
          repairZoneLineFc={repairZoneLineFc}
          repairZoneVerticesFc={repairZoneVerticesFc}
        />

        <EquipmentSelectionOverlayLayers
          layerVisibility={layerVisibility}
          viewMode={viewMode}
          isLayoutEditMode={isLayoutEditMode}
          threeDVisible={threeDVisible}
          equipmentTypeFilter={equipmentTypeFilter}
          equipmentAnd3DFilter={equipmentAnd3DFilter}
          equipmentLockedFilter={equipmentLockedFilter}
          selectionFc={selectionFc}
          selectionLineFc={selectionLineFc}
          selectionVerticesFc={selectionVerticesFc}
          accessRoadCorridorFc={accessRoadCorridorFc}
          accessRoadLineFc={accessRoadLineFc}
          layoutZoneFc={layoutZoneFc}
          layoutZoneLabelFc={layoutZoneLabelFc}
          cableRouteCorridorFc={cableRouteCorridorFc}
          cableRouteLineFc={cableRouteLineFc}
          bufferFc={bufferFc}
          equipmentFc={equipmentFc}
          equipment3DDetailsFc={equipment3DDetailsFc}
          equipment3DLabelsFc={equipment3DLabelsFc}
          warningMarkerFc={warningMarkerFc}
          searchedPointFc={searchedPointFc}
        />
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
