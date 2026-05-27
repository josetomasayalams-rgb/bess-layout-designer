import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";

interface PolygonTerrainLayersProps {
  layerVisibility: {
    grid: boolean;
    terrain: boolean;
    terrainFill: boolean;
    terrainOutline: boolean;
    measurements: boolean;
    labels: boolean;
  };
  showRepairZoneOverlay: boolean;
  gridFc: FeatureCollection;
  polygonFc: FeatureCollection;
  polygonLineFc: FeatureCollection;
  polygonVerticesFc: FeatureCollection;
  measurementFc: FeatureCollection;
  previewTerrainFc: FeatureCollection;
  previewTerrainLineFc: FeatureCollection;
  previewTerrainVerticesFc: FeatureCollection;
  previewTerrainCenterFc: FeatureCollection;
  previewTerrainRotationHandleFc: FeatureCollection;
  repairZoneFc: FeatureCollection;
  repairZoneLineFc: FeatureCollection;
  repairZoneVerticesFc: FeatureCollection;
}

export function PolygonTerrainLayers({
  layerVisibility,
  showRepairZoneOverlay,
  gridFc,
  polygonFc,
  polygonLineFc,
  polygonVerticesFc,
  measurementFc,
  previewTerrainFc,
  previewTerrainLineFc,
  previewTerrainVerticesFc,
  previewTerrainCenterFc,
  previewTerrainRotationHandleFc,
  repairZoneFc,
  repairZoneLineFc,
  repairZoneVerticesFc,
}: PolygonTerrainLayersProps) {
  return (
    <>
      <Source id="layout-grid" type="geojson" data={gridFc}>
        <Layer
          id="layout-grid-lines"
          type="line"
          layout={{
            visibility: layerVisibility.grid ? "visible" : "none",
          }}
          paint={{
            "line-color": "#38bdf8",
            "line-width": 0.7,
            "line-opacity": 0.26,
          }}
        />
      </Source>

      <Source id="site-polygon" type="geojson" data={polygonFc}>
        <Layer
          id="site-polygon-fill"
          type="fill"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.terrainFill
                ? "visible"
                : "none",
          }}
          paint={{ "fill-color": "#10b981", "fill-opacity": 0.18 }}
        />
      </Source>

      <Source id="site-polygon-line" type="geojson" data={polygonLineFc}>
        <Layer
          id="site-polygon-stroke"
          type="line"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.terrainOutline
                ? "visible"
                : "none",
          }}
          paint={{ "line-color": "#10b981", "line-width": 2 }}
        />
      </Source>

      <Source id="terrain-measurements" type="geojson" data={measurementFc}>
        <Layer
          id="terrain-measurement-labels"
          type="symbol"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.measurements
                ? "visible"
                : "none",
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-allow-overlap": true,
            "text-anchor": "center",
          }}
          paint={{
            "text-color": "#f8fafc",
            "text-halo-color": "#020617",
            "text-halo-width": 1.5,
          }}
        />
      </Source>

      <Source id="site-polygon-vertices" type="geojson" data={polygonVerticesFc}>
        <Layer
          id="site-polygon-vertex-points"
          type="circle"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.terrainOutline
                ? "visible"
                : "none",
          }}
          paint={{
            "circle-radius": 5,
            "circle-color": "#10b981",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
      </Source>

      <Source id="terrain-preview" type="geojson" data={previewTerrainFc}>
        <Layer
          id="terrain-preview-fill"
          type="fill"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.terrainFill
                ? "visible"
                : "none",
          }}
          paint={{ "fill-color": "#38bdf8", "fill-opacity": 0.14 }}
        />
      </Source>

      <Source id="terrain-preview-line" type="geojson" data={previewTerrainLineFc}>
        <Layer
          id="terrain-preview-stroke"
          type="line"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.terrainOutline
                ? "visible"
                : "none",
          }}
          paint={{
            "line-color": "#67e8f9",
            "line-width": 2,
            "line-dasharray": [2, 1.5],
          }}
        />
      </Source>

      <Source id="terrain-preview-vertices" type="geojson" data={previewTerrainVerticesFc}>
        <Layer
          id="terrain-preview-vertex-points"
          type="circle"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.terrainOutline
                ? "visible"
                : "none",
          }}
          paint={{
            "circle-radius": 5,
            "circle-color": "#67e8f9",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
      </Source>

      <Source id="terrain-preview-center" type="geojson" data={previewTerrainCenterFc}>
        <Layer
          id="terrain-preview-center-dot"
          type="circle"
          layout={{
            visibility: layerVisibility.terrain ? "visible" : "none",
          }}
          paint={{
            "circle-radius": 4,
            "circle-color": "#f8fafc",
            "circle-stroke-color": "#0891b2",
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="terrain-preview-label"
          type="symbol"
          layout={{
            visibility:
              layerVisibility.terrain && layerVisibility.labels
                ? "visible"
                : "none",
            "text-field": ["get", "label"],
            "text-size": 11,
            "text-offset": [0, -1.8],
            "text-anchor": "bottom",
            "text-allow-overlap": true,
          }}
          paint={{
            "text-color": "#ecfeff",
            "text-halo-color": "#020617",
            "text-halo-width": 1.5,
          }}
        />
      </Source>

      <Source id="terrain-preview-rotation" type="geojson" data={previewTerrainRotationHandleFc}>
        <Layer
          id="terrain-preview-rotation-line"
          type="line"
          filter={["==", ["get", "kind"], "rotation-line"]}
          layout={{
            visibility: layerVisibility.terrain ? "visible" : "none",
          }}
          paint={{
            "line-color": "#facc15",
            "line-width": 1.5,
            "line-dasharray": [2, 1.5],
          }}
        />
        <Layer
          id="terrain-preview-rotation-handle"
          type="circle"
          filter={["==", ["get", "kind"], "rotation-handle"]}
          layout={{
            visibility: layerVisibility.terrain ? "visible" : "none",
          }}
          paint={{
            "circle-radius": 7,
            "circle-color": "#facc15",
            "circle-stroke-color": "#020617",
            "circle-stroke-width": 2,
          }}
        />
      </Source>

      <Source id="repair-zone" type="geojson" data={repairZoneFc}>
        <Layer
          id="repair-zone-fill"
          type="fill"
          layout={{
            visibility: showRepairZoneOverlay ? "visible" : "none",
          }}
          paint={{ "fill-color": "#f59e0b", "fill-opacity": 0.16 }}
        />
      </Source>

      <Source id="repair-zone-line" type="geojson" data={repairZoneLineFc}>
        <Layer
          id="repair-zone-stroke"
          type="line"
          layout={{
            visibility: showRepairZoneOverlay ? "visible" : "none",
          }}
          paint={{
            "line-color": "#f59e0b",
            "line-width": 2,
            "line-dasharray": [2, 1.5],
          }}
        />
      </Source>

      <Source id="repair-zone-vertices" type="geojson" data={repairZoneVerticesFc}>
        <Layer
          id="repair-zone-vertex-points"
          type="circle"
          layout={{
            visibility: showRepairZoneOverlay ? "visible" : "none",
          }}
          paint={{
            "circle-radius": 5,
            "circle-color": "#f59e0b",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          }}
        />
      </Source>
    </>
  );
}
