import { useEffect, useCallback } from "react";
import type { MapRef } from "react-map-gl/maplibre";
import type { LngLat } from "@/types/geometry";
import { INITIAL_VIEW } from "../BessMap.constants";

interface UseMapCameraParams {
  mapRef: React.RefObject<MapRef | null>;
  polygon: LngLat[];
  isMapLoaded: boolean;
  interactionMode: string;
  setSearchedPoint: (coords: { lat: number; lng: number } | null) => void;
}

export function useMapCamera({
  mapRef,
  polygon,
  isMapLoaded,
  interactionMode,
  setSearchedPoint,
}: UseMapCameraParams) {
  const fitToPolygon = useCallback(
    (duration = 600) => {
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
    },
    [isMapLoaded, polygon, mapRef]
  );

  useEffect(() => {
    if (interactionMode === "draw-site" || interactionMode === "draw-repair-zone")
      return;
    fitToPolygon();
  }, [interactionMode, fitToPolygon]);

  const centerMap = useCallback(() => {
    if (polygon.length >= 3) {
      fitToPolygon(500);
      return;
    }
    mapRef.current?.getMap().flyTo({
      center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
      zoom: INITIAL_VIEW.zoom,
      duration: 500,
    });
  }, [polygon, fitToPolygon, mapRef]);

  const searchCoordinates = useCallback(
    (coordinates: { lat: number; lng: number }) => {
      setSearchedPoint(coordinates);
      mapRef.current?.getMap().flyTo({
        center: [coordinates.lng, coordinates.lat],
        zoom: 17,
        duration: 700,
      });
    },
    [setSearchedPoint, mapRef]
  );

  return {
    fitToPolygon,
    centerMap,
    searchCoordinates,
  };
}
