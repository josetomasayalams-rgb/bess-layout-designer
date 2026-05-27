import { useState, useCallback, type MutableRefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

export function useMapLifecycle(
  mapRef: MutableRefObject<MapRef | null>,
  setMapViewCenter: (center: { lng: number; lat: number }) => void,
  setMapError: (error: string | null) => void
) {
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  const updateMapCenterFromInstance = useCallback(() => {
    const center = mapRef.current?.getMap().getCenter();
    if (!center) return;
    setMapViewCenter({ lng: center.lng, lat: center.lat });
  }, [mapRef, setMapViewCenter]);

  const handleLoad = useCallback(() => {
    setIsMapLoaded(true);
    setMapError(null);
    updateMapCenterFromInstance();
  }, [setMapError, updateMapCenterFromInstance]);

  const handleError = useCallback(
    (event: { error?: { message?: string } }) => {
      const message = event.error?.message ?? "Map rendering failed";
      if (message.includes("Failed to fetch")) return;
      setMapError(message);
    },
    [setMapError]
  );

  return {
    isMapLoaded,
    setIsMapLoaded,
    updateMapCenterFromInstance,
    handleLoad,
    handleError,
  };
}
