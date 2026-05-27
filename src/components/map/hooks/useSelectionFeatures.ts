import { useMemo } from "react";
import type { LngLat } from "@/types/geometry";
import {
  polygonToFeature,
  polygonToLineFeature,
  polygonVerticesToFeature,
} from "@/lib/layout/mapFeatures";

export function useSelectionFeatures(selectionPolygon: LngLat[]) {
  const selectionFc = useMemo(
    () => polygonToFeature(selectionPolygon),
    [selectionPolygon]
  );
  const selectionLineFc = useMemo(
    () => polygonToLineFeature(selectionPolygon),
    [selectionPolygon]
  );
  const selectionVerticesFc = useMemo(
    () => polygonVerticesToFeature(selectionPolygon),
    [selectionPolygon]
  );

  return {
    selectionFc,
    selectionLineFc,
    selectionVerticesFc,
  };
}
