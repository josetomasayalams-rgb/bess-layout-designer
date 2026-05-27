import { useMemo } from "react";
import type { LngLat } from "@/types/geometry";
import {
  polygonToFeature,
  polygonToLineFeature,
  polygonVerticesToFeature,
} from "@/lib/layout/mapFeatures";
import { toLocal, toLngLat } from "@/lib/geometry/projection";

export interface PreviewTerrainData {
  polygon: LngLat[];
  center: LngLat;
  areaHa: number;
  lengthM: number;
  widthM: number;
  rotationDeg: number;
}

export function usePreviewTerrainFeatures(previewTerrain: PreviewTerrainData | null) {
  const previewTerrainFc = useMemo(
    () => polygonToFeature(previewTerrain?.polygon ?? []),
    [previewTerrain]
  );
  const previewTerrainLineFc = useMemo(
    () => polygonToLineFeature(previewTerrain?.polygon ?? []),
    [previewTerrain]
  );
  const previewTerrainVerticesFc = useMemo(
    () => polygonVerticesToFeature(previewTerrain?.polygon ?? []),
    [previewTerrain]
  );
  const previewTerrainCenterFc = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: previewTerrain
        ? [
            {
              type: "Feature" as const,
              properties: {
                label: `${previewTerrain.areaHa.toFixed(1)} ha · ${Math.round(
                  previewTerrain.lengthM
                )} m x ${Math.round(previewTerrain.widthM)} m · ${Math.round(
                  previewTerrain.rotationDeg
                )}°`,
              },
              geometry: {
                type: "Point" as const,
                coordinates: [
                  previewTerrain.center.lng,
                  previewTerrain.center.lat,
                ],
              },
            },
          ]
        : [],
    }),
    [previewTerrain]
  );

  const previewTerrainRotationHandleFc = useMemo(() => {
    if (!previewTerrain) {
      return { type: "FeatureCollection" as const, features: [] };
    }
    const terrainAnchor = {
      lng0: previewTerrain.center.lng,
      lat0: previewTerrain.center.lat,
    };
    const localVertices = previewTerrain.polygon.map((point) =>
      toLocal(point, terrainAnchor)
    );
    const radiusM =
      Math.max(
        40,
        ...localVertices.map((point) => Math.hypot(point.x_m, point.y_m))
      ) + 28;
    const angleRad = ((previewTerrain.rotationDeg - 90) * Math.PI) / 180;
    const handle = toLngLat(
      {
        x_m: Math.cos(angleRad) * radiusM,
        y_m: Math.sin(angleRad) * radiusM,
      },
      terrainAnchor
    );

    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: { kind: "rotation-line" },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [previewTerrain.center.lng, previewTerrain.center.lat],
              [handle.lng, handle.lat],
            ],
          },
        },
        {
          type: "Feature" as const,
          properties: { kind: "rotation-handle" },
          geometry: {
            type: "Point" as const,
            coordinates: [handle.lng, handle.lat],
          },
        },
      ],
    };
  }, [previewTerrain]);

  return {
    previewTerrainFc,
    previewTerrainLineFc,
    previewTerrainVerticesFc,
    previewTerrainCenterFc,
    previewTerrainRotationHandleFc,
  };
}
