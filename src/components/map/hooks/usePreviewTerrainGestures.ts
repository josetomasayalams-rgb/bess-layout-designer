import { useState, useRef, useCallback } from "react";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import { toLocal } from "@/lib/geometry/projection";
import type { LngLat } from "@/types/geometry";
import { normalizeRotation, shortestDeltaDeg } from "../BessMap.geometry";

export interface PreviewTerrainData {
  polygon: LngLat[];
  center: LngLat;
  areaHa: number;
  lengthM: number;
  widthM: number;
  rotationDeg: number;
}

interface UsePreviewTerrainGesturesParams {
  previewTerrain: PreviewTerrainData | null;
  interactionMode: string;
  isLayoutEditMode: boolean;
  mapRef: React.RefObject<MapRef | null>;
  updatePreviewTerrain: (data: { rotationDeg: number }) => void;
  movePreviewTerrainBy: (offset: { x_m: number; y_m: number }) => void;
}

export function usePreviewTerrainGestures({
  previewTerrain,
  interactionMode,
  isLayoutEditMode,
  mapRef,
  updatePreviewTerrain,
  movePreviewTerrainBy,
}: UsePreviewTerrainGesturesParams) {
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

  const handlePreviewTerrainMouseDown = useCallback(
    (event: MapMouseEvent): boolean => {
      if (!previewTerrain) return false;
      if (
        interactionMode === "draw-site" ||
        interactionMode === "draw-repair-zone" ||
        interactionMode === "place-equipment" ||
        isLayoutEditMode
      ) {
        return false;
      }
      if (event.originalEvent.button !== 0) return false;
      const map = mapRef.current?.getMap();
      if (!map) return false;

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
        return true;
      }

      const features = map.queryRenderedFeatures(event.point, {
        layers: ["terrain-preview-fill"],
      });
      if (features.length === 0) return false;
      setPreviewTerrainDrag({
        last: { lng: event.lngLat.lng, lat: event.lngLat.lat },
        moved: false,
      });
      return true;
    },
    [previewTerrain, interactionMode, isLayoutEditMode, mapRef]
  );

  const handlePreviewTerrainMouseMove = useCallback(
    (event: MapMouseEvent): boolean => {
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
        return true;
      }

      if (previewTerrainDrag && previewTerrain) {
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
        return true;
      }

      return false;
    },
    [previewTerrainRotate, previewTerrainDrag, previewTerrain, updatePreviewTerrain, movePreviewTerrainBy]
  );

  const handlePreviewTerrainMouseUp = useCallback((): boolean => {
    if (previewTerrainRotate) {
      suppressPreviewTerrainClickRef.current = previewTerrainRotate.moved;
      setPreviewTerrainRotate(null);
      return true;
    }
    if (previewTerrainDrag) {
      suppressPreviewTerrainClickRef.current = previewTerrainDrag.moved;
      setPreviewTerrainDrag(null);
      return true;
    }
    return false;
  }, [previewTerrainRotate, previewTerrainDrag]);

  return {
    previewTerrainDrag,
    previewTerrainRotate,
    suppressPreviewTerrainClickRef,
    handlePreviewTerrainMouseDown,
    handlePreviewTerrainMouseMove,
    handlePreviewTerrainMouseUp,
  };
}
