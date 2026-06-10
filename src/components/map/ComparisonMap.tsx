"use client";

import { useMemo, type ComponentProps } from "react";
import { Map, Source, Layer } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import {
  polygonToFeature,
  polygonToLineFeature,
  equipmentToFeatures,
} from "@/lib/layout/mapFeatures";
import { INITIAL_VIEW } from "./BessMap.constants";

type MapStyle = ComponentProps<typeof Map>["mapStyle"];

/** Extra geographic margin (~25 m) so equipment footprints near the polygon
 * edge are not clipped at the viewport border. */
const BOUNDS_MARGIN_DEG = 0.00025;

type Bounds = [[number, number], [number, number]];

/**
 * Bounding box of the captured geometry (polygon vertices + equipment
 * anchors). Single points are padded so the camera does not zoom to infinity.
 */
function computeBounds(polygon: LngLat[], placed: PlacedEquipment[]): Bounds | null {
  const points: LngLat[] = [...polygon, ...placed.map((p) => p.anchor)];
  if (points.length === 0) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const p of points) {
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }

  if (minLng === maxLng && minLat === maxLat) {
    const pad = 0.0015;
    return [
      [minLng - pad, minLat - pad],
      [maxLng + pad, maxLat + pad],
    ];
  }
  return [
    [minLng - BOUNDS_MARGIN_DEG, minLat - BOUNDS_MARGIN_DEG],
    [maxLng + BOUNDS_MARGIN_DEG, maxLat + BOUNDS_MARGIN_DEG],
  ];
}

export interface ComparisonMapProps {
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  placedEquipment: PlacedEquipment[];
  /** Accent colour for the site outline (per A/B slot). */
  accentColor: string;
  /** Base-map style, resolved once by the parent and shared across instances. */
  mapStyle: MapStyle;
}

/**
 * Read-only map that renders one captured layout alternative (site polygon +
 * equipment footprints). It shares the project's base-map style but carries no
 * editing, selection, or store coupling — geometry arrives purely via props so
 * two instances can be shown side by side.
 */
export function ComparisonMap({
  anchor,
  polygon,
  placedEquipment,
  accentColor,
  mapStyle,
}: ComparisonMapProps) {
  const polygonFc = useMemo(() => polygonToFeature(polygon), [polygon]);
  const polygonLineFc = useMemo(() => polygonToLineFeature(polygon), [polygon]);
  const equipmentFc = useMemo(
    () => equipmentToFeatures(placedEquipment, anchor, null),
    [placedEquipment, anchor]
  );
  const bounds = useMemo(
    () => computeBounds(polygon, placedEquipment),
    [polygon, placedEquipment]
  );

  const initialViewState = bounds
    ? { bounds, fitBoundsOptions: { padding: 36 } }
    : {
        longitude: INITIAL_VIEW.longitude,
        latitude: INITIAL_VIEW.latitude,
        zoom: INITIAL_VIEW.zoom,
      };

  return (
    <Map
      initialViewState={initialViewState}
      style={{ width: "100%", height: "100%" }}
      mapStyle={mapStyle}
      attributionControl={false}
      dragRotate={false}
    >
      <Source id="cmp-polygon-fill" type="geojson" data={polygonFc}>
        <Layer
          id="cmp-polygon-fill-layer"
          type="fill"
          paint={{ "fill-color": accentColor, "fill-opacity": 0.08 }}
        />
      </Source>
      <Source id="cmp-polygon-line" type="geojson" data={polygonLineFc}>
        <Layer
          id="cmp-polygon-line-layer"
          type="line"
          paint={{ "line-color": accentColor, "line-width": 2 }}
        />
      </Source>
      <Source id="cmp-equipment" type="geojson" data={equipmentFc}>
        <Layer
          id="cmp-equipment-fill"
          type="fill"
          paint={{
            "fill-color": [
              "match",
              ["get", "type"],
              "battery_container",
              "#34d399",
              "pcs_mv_station",
              "#f59e0b",
              "transformer",
              "#60a5fa",
              "#94a3b8",
            ],
            "fill-opacity": 0.85,
          }}
        />
        <Layer
          id="cmp-equipment-outline"
          type="line"
          paint={{ "line-color": "#0f172a", "line-width": 0.5 }}
        />
      </Source>
    </Map>
  );
}
