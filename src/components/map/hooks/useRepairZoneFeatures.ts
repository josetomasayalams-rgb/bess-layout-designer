import { useMemo } from "react";
import type { LngLat } from "@/types/geometry";
import {
  polygonToFeature,
  polygonToLineFeature,
  polygonVerticesToFeature,
} from "@/lib/layout/mapFeatures";

export function useRepairZoneFeatures(repairZone: LngLat[], interactionMode: string) {
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

  return {
    repairZoneFc,
    repairZoneLineFc,
    repairZoneVerticesFc,
    showRepairZoneOverlay,
  };
}
