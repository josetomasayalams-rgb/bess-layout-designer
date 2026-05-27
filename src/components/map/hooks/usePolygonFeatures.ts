import { useMemo } from "react";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import {
  polygonToFeature,
  polygonToLineFeature,
  polygonVerticesToFeature,
  measurementLabelFeatures,
} from "@/lib/layout/mapFeatures";

export function usePolygonFeatures(polygon: LngLat[], anchor: ProjectAnchor | null) {
  const polygonFc = useMemo(() => polygonToFeature(polygon), [polygon]);
  const polygonLineFc = useMemo(() => polygonToLineFeature(polygon), [polygon]);
  const polygonVerticesFc = useMemo(
    () => polygonVerticesToFeature(polygon),
    [polygon]
  );
  const measurementFc = useMemo(
    () => measurementLabelFeatures(polygon, anchor),
    [polygon, anchor]
  );

  return {
    polygonFc,
    polygonLineFc,
    polygonVerticesFc,
    measurementFc,
  };
}
