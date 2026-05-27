import { useCallback } from "react";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type { ProjectAnchor, LngLat } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { selectEquipmentWithinPolygon } from "@/lib/layout/layoutEditing";
import { useDrawModeHandlers } from "./useDrawModeHandlers";
import { usePreviewTerrainGestures, type PreviewTerrainData } from "./usePreviewTerrainGestures";
import { useLayoutEditGestures } from "./useLayoutEditGestures";

interface UseMapInteractionRouterParams {
  mapRef: React.RefObject<MapRef | null>;
  interactionMode: string;
  isLayoutEditMode: boolean;
  layoutEdit: {
    selectedIds: string[];
    selectionPolygon: LngLat[];
  };
  displayedPlaced: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  previewTerrain: PreviewTerrainData | null;
  updatePreviewTerrain: (data: { rotationDeg: number }) => void;
  movePreviewTerrainBy: (offset: { x_m: number; y_m: number }) => void;
  previewMoveSelection: (offset: { x_m: number; y_m: number }) => void;
  setLayoutEditSelection: (ids: string[], polygon: LngLat[]) => void;
  selectEquipment: (id: string | null) => void;
}

export function useMapInteractionRouter({
  mapRef,
  interactionMode,
  isLayoutEditMode,
  layoutEdit,
  displayedPlaced,
  anchor,
  previewTerrain,
  updatePreviewTerrain,
  movePreviewTerrainBy,
  previewMoveSelection,
  setLayoutEditSelection,
  selectEquipment,
}: UseMapInteractionRouterParams) {
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

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
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
    },
    [
      suppressPreviewTerrainClickRef,
      suppressLayoutEditClickRef,
      handleDrawingClick,
      interactionMode,
      isLayoutEditMode,
      layoutEdit.selectedIds,
      layoutEdit.selectionPolygon,
      setLayoutEditSelection,
      displayedPlaced,
      anchor,
      selectEquipment,
      mapRef,
    ]
  );

  const handleMouseDown = useCallback(
    (event: MapMouseEvent) => {
      if (handlePreviewTerrainMouseDown(event)) return;
      handleLayoutEditMouseDown(event);
    },
    [handlePreviewTerrainMouseDown, handleLayoutEditMouseDown]
  );

  const handleMouseMove = useCallback(
    (event: MapMouseEvent) => {
      if (handlePreviewTerrainMouseMove(event)) return;
      handleLayoutEditMouseMove(event);
    },
    [handlePreviewTerrainMouseMove, handleLayoutEditMouseMove]
  );

  const handleMouseUp = useCallback(() => {
    if (handlePreviewTerrainMouseUp()) return;
    handleLayoutEditMouseUp();
  }, [handlePreviewTerrainMouseUp, handleLayoutEditMouseUp]);

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

  return {
    handleClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    cursor,
    // Return refs and flags if needed for layers or panels
    previewTerrainDrag,
    previewTerrainRotate,
  };
}
