import { useState, useRef, useCallback } from "react";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type { ProjectAnchor } from "@/types/geometry";
import { toLocal } from "@/lib/geometry/projection";

interface UseLayoutEditGesturesParams {
  isLayoutEditMode: boolean;
  layoutEditSelectedIds: string[];
  mapRef: React.RefObject<MapRef | null>;
  anchor: ProjectAnchor | null;
  previewMoveSelection: (offset: { x_m: number; y_m: number }) => void;
}

export function useLayoutEditGestures({
  isLayoutEditMode,
  layoutEditSelectedIds,
  mapRef,
  anchor,
  previewMoveSelection,
}: UseLayoutEditGesturesParams) {
  const [layoutMoveDrag, setLayoutMoveDrag] = useState<{
    lng: number;
    lat: number;
  } | null>(null);

  const suppressLayoutEditClickRef = useRef(false);

  const handleLayoutEditMouseDown = useCallback(
    (event: MapMouseEvent): boolean => {
      if (!isLayoutEditMode) return false;
      if (event.originalEvent.button !== 0) return false;
      if (layoutEditSelectedIds.length === 0) return false;
      const map = mapRef.current?.getMap();
      if (!map) return false;

      const features = map.queryRenderedFeatures(event.point, {
        layers: ["equipment-fill"],
      });
      const hitId = features[0]?.properties?.id as string | undefined;
      if (hitId && layoutEditSelectedIds.includes(hitId)) {
        setLayoutMoveDrag({ lng: event.lngLat.lng, lat: event.lngLat.lat });
        return true;
      }
      return false;
    },
    [isLayoutEditMode, layoutEditSelectedIds, mapRef]
  );

  const handleLayoutEditMouseMove = useCallback(
    (event: MapMouseEvent): boolean => {
      if (!layoutMoveDrag) return false;
      if (!anchor) return false;

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
      return true;
    },
    [layoutMoveDrag, anchor, previewMoveSelection]
  );

  const handleLayoutEditMouseUp = useCallback((): boolean => {
    if (layoutMoveDrag) {
      suppressLayoutEditClickRef.current = true;
      setLayoutMoveDrag(null);
      return true;
    }
    return false;
  }, [layoutMoveDrag]);

  return {
    layoutMoveDrag,
    suppressLayoutEditClickRef,
    handleLayoutEditMouseDown,
    handleLayoutEditMouseMove,
    handleLayoutEditMouseUp,
  };
}
