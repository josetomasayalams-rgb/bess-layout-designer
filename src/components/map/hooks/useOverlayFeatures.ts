import { useMemo } from "react";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type { LayoutWarning } from "@/lib/layout/spacingRules";
import {
  gridLineFeatures,
  warningMarkerFeatures,
} from "@/lib/layout/mapFeatures";

interface UseOverlayFeaturesParams {
  polygon: LngLat[];
  displayedPlaced: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  warnings: LayoutWarning[];
  searchedPoint: LngLat | null;
}

export function useOverlayFeatures({
  polygon,
  displayedPlaced,
  anchor,
  warnings,
  searchedPoint,
}: UseOverlayFeaturesParams) {
  const gridFc = useMemo(
    () => gridLineFeatures({ polygon, placed: displayedPlaced, anchor }),
    [polygon, displayedPlaced, anchor]
  );

  const warningMarkerFc = useMemo(
    () => warningMarkerFeatures(warnings, displayedPlaced),
    [warnings, displayedPlaced]
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

  return {
    gridFc,
    warningMarkerFc,
    searchedPointFc,
  };
}
