import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import type { FilterSpecification } from "maplibre-gl";

interface EquipmentSelectionOverlayLayersProps {
  layerVisibility: {
    accessRoads: boolean;
    mvInfrastructure: boolean;
    cableRoutes: boolean;
    buffers: boolean;
    labels: boolean;
    collisions: boolean;
    outOfBounds: boolean;
    shadows?: boolean;
  };
  viewMode: string;
  isLayoutEditMode: boolean;
  threeDVisible: boolean;
  equipmentTypeFilter: FilterSpecification;
  equipmentAnd3DFilter: FilterSpecification;
  equipmentLockedFilter: FilterSpecification;
  selectionFc: FeatureCollection;
  selectionLineFc: FeatureCollection;
  selectionVerticesFc: FeatureCollection;
  accessRoadCorridorFc: FeatureCollection;
  accessRoadLineFc: FeatureCollection;
  layoutZoneFc: FeatureCollection;
  layoutZoneLabelFc: FeatureCollection;
  cableRouteCorridorFc: FeatureCollection;
  cableRouteLineFc: FeatureCollection;
  bufferFc: FeatureCollection;
  equipmentFc: FeatureCollection;
  equipment3DDetailsFc: FeatureCollection;
  equipment3DLabelsFc: FeatureCollection;
  warningMarkerFc: FeatureCollection;
  searchedPointFc: FeatureCollection;
}

export function EquipmentSelectionOverlayLayers({
  layerVisibility,
  viewMode,
  isLayoutEditMode,
  threeDVisible,
  equipmentTypeFilter,
  equipmentAnd3DFilter,
  equipmentLockedFilter,
  selectionFc,
  selectionLineFc,
  selectionVerticesFc,
  accessRoadCorridorFc,
  accessRoadLineFc,
  layoutZoneFc,
  layoutZoneLabelFc,
  cableRouteCorridorFc,
  cableRouteLineFc,
  bufferFc,
  equipmentFc,
  equipment3DDetailsFc,
  equipment3DLabelsFc,
  warningMarkerFc,
  searchedPointFc,
}: EquipmentSelectionOverlayLayersProps) {
  return (
    <>
      <Source id="layout-edit-selection" type="geojson" data={selectionFc}>
        <Layer
          id="layout-edit-selection-fill"
          type="fill"
          paint={{
            "fill-color": "#06b6d4",
            "fill-opacity": isLayoutEditMode ? 0.12 : 0,
          }}
        />
        <Layer
          id="layout-edit-selection-line"
          type="line"
          paint={{
            "line-color": "#22d3ee",
            "line-width": 2,
            "line-dasharray": [2, 1.5],
            "line-opacity": isLayoutEditMode ? 0.9 : 0,
          }}
        />
      </Source>

      <Source id="layout-edit-selection-line" type="geojson" data={selectionLineFc}>
        <Layer
          id="layout-edit-selection-open-line"
          type="line"
          paint={{
            "line-color": "#22d3ee",
            "line-width": 2,
            "line-dasharray": [2, 1.5],
            "line-opacity": isLayoutEditMode ? 0.9 : 0,
          }}
        />
      </Source>

      <Source
        id="layout-edit-selection-vertices"
        type="geojson"
        data={selectionVerticesFc}
      >
        <Layer
          id="layout-edit-selection-vertex-points"
          type="circle"
          paint={{
            "circle-radius": 5,
            "circle-color": "#22d3ee",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-opacity": isLayoutEditMode ? 1 : 0,
          }}
        />
      </Source>

      <Source id="access-road-corridors" type="geojson" data={accessRoadCorridorFc}>
        <Layer
          id="access-road-corridor-fill"
          type="fill"
          layout={{
            visibility: layerVisibility.accessRoads ? "visible" : "none",
          }}
          paint={{
            "fill-color": "#475569",
            "fill-opacity": 0.34,
          }}
        />
        <Layer
          id="access-road-corridor-outline"
          type="line"
          layout={{
            visibility: layerVisibility.accessRoads ? "visible" : "none",
          }}
          paint={{
            "line-color": "#94a3b8",
            "line-width": 1,
            "line-opacity": 0.75,
          }}
        />
      </Source>

      <Source id="access-road-lines" type="geojson" data={accessRoadLineFc}>
        <Layer
          id="access-road-center-lines"
          type="line"
          layout={{
            visibility: layerVisibility.accessRoads ? "visible" : "none",
          }}
          paint={{
            "line-color": "#cbd5e1",
            "line-width": 1.5,
            "line-dasharray": [3, 2],
            "line-opacity": 0.8,
          }}
        />
      </Source>

      <Source id="mv-layout-zones" type="geojson" data={layoutZoneFc}>
        <Layer
          id="mv-layout-zone-fill"
          type="fill"
          layout={{
            visibility: layerVisibility.mvInfrastructure ? "visible" : "none",
          }}
          paint={{
            "fill-color": [
              "match",
              ["get", "type"],
              "mv_yard",
              "#a855f7",
              "poi_yard",
              "#f59e0b",
              "#64748b",
            ],
            "fill-opacity": 0.2,
          }}
        />
        <Layer
          id="mv-layout-zone-outline"
          type="line"
          layout={{
            visibility: layerVisibility.mvInfrastructure ? "visible" : "none",
          }}
          paint={{
            "line-color": [
              "match",
              ["get", "type"],
              "mv_yard",
              "#d8b4fe",
              "poi_yard",
              "#fbbf24",
              "#cbd5e1",
            ],
            "line-width": 1.8,
            "line-dasharray": [2, 1.5],
          }}
        />
      </Source>

      <Source id="mv-layout-zone-labels" type="geojson" data={layoutZoneLabelFc}>
        <Layer
          id="mv-layout-zone-label-text"
          type="symbol"
          layout={{
            visibility:
              layerVisibility.mvInfrastructure && layerVisibility.labels
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
            "text-halo-width": 1.4,
          }}
        />
      </Source>

      <Source id="cable-route-corridors" type="geojson" data={cableRouteCorridorFc}>
        <Layer
          id="cable-route-corridor-fill"
          type="fill"
          layout={{
            visibility: layerVisibility.cableRoutes ? "visible" : "none",
          }}
          paint={{
            "fill-color": "#f97316",
            "fill-opacity": 0.13,
          }}
        />
      </Source>

      <Source id="cable-route-lines" type="geojson" data={cableRouteLineFc}>
        <Layer
          id="cable-route-center-lines"
          type="line"
          layout={{
            visibility: layerVisibility.cableRoutes ? "visible" : "none",
          }}
          paint={{
            "line-color": "#fb923c",
            "line-width": 2,
            "line-opacity": 0.86,
          }}
        />
      </Source>

      <Source id="regulatory-buffers" type="geojson" data={bufferFc}>
        <Layer
          id="regulatory-buffer-fill"
          type="fill"
          layout={{
            visibility: layerVisibility.buffers ? "visible" : "none",
          }}
          paint={{
            "fill-color": [
              "match",
              ["get", "bufferType"],
              "normative_separation",
              "#38bdf8",
              "maintenance_aisle",
              "#22c55e",
              "#64748b",
            ],
            "fill-opacity": [
              "match",
              ["get", "bufferType"],
              "normative_separation",
              0.09,
              "maintenance_aisle",
              0.12,
              0.08,
            ],
          }}
        />
        <Layer
          id="regulatory-buffer-outline"
          type="line"
          layout={{
            visibility: layerVisibility.buffers ? "visible" : "none",
          }}
          paint={{
            "line-color": [
              "match",
              ["get", "bufferType"],
              "normative_separation",
              "#38bdf8",
              "maintenance_aisle",
              "#22c55e",
              "#64748b",
            ],
            "line-width": 1,
            "line-dasharray": [2, 2],
            "line-opacity": 0.65,
          }}
        />
      </Source>

      <Source id="equipment" type="geojson" data={equipmentFc}>
        <Layer
          id="equipment-fill"
          type="fill"
          filter={equipmentTypeFilter}
          paint={{
            "fill-color": [
              "case",
              ["==", ["get", "draftEdited"], true],
              "#f97316",
              ["==", ["get", "massSelected"], true],
              "#0891b2",
              [
                "match",
                ["get", "type"],
                "battery_container",
                "#2563eb",
                "pcs_mv_station",
                "#f59e0b",
                "#6b7280",
              ],
            ],
            "fill-opacity": [
              "case",
              ["==", ["get", "selected"], true],
              0.85,
              0.6,
            ],
          }}
        />
        <Layer
          id="equipment-outline"
          type="line"
          filter={equipmentTypeFilter}
          paint={{
            "line-color": [
              "case",
              ["==", ["get", "draftEdited"], true],
              "#fed7aa",
              ["==", ["get", "selected"], true],
              "#22d3ee",
              "#111827",
            ],
            "line-width": [
              "case",
              ["==", ["get", "selected"], true],
              3,
              ["==", ["get", "draftEdited"], true],
              3,
              1,
            ],
          }}
        />
        <Layer
          id="equipment-locked-outline"
          type="line"
          filter={equipmentLockedFilter}
          paint={{
            "line-color": "#fbbf24",
            "line-width": 2,
            "line-dasharray": [2, 1.5],
          }}
        />
        <Layer
          id="equipment-labels"
          type="symbol"
          filter={equipmentTypeFilter}
          layout={{
            visibility:
              viewMode === "iso" || !layerVisibility.labels
                ? "none"
                : "visible",
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-max-width": 12,
            "text-allow-overlap": false,
          }}
          paint={{
            "text-color": "#e5e7eb",
            "text-halo-color": "#020617",
            "text-halo-width": 1.2,
          }}
        />
        <Layer
          id="equipment-3d-body"
          type="fill-extrusion"
          filter={equipmentAnd3DFilter}
          layout={{ visibility: threeDVisible ? "visible" : "none" }}
          paint={{
            "fill-extrusion-color": [
              "match",
              ["get", "visualProfile"],
              "sungrow_container_v1",
              "#d8dde4",
              "sungrow_pcs_v1",
              "#a8b0ba",
              "tesla_megapack_v1",
              "#c8ccd2",
              "#94a3b8",
            ],
            "fill-extrusion-height": ["get", "heightM"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.95,
            "fill-extrusion-vertical-gradient": layerVisibility.shadows ?? false,
          }}
        />
        <Layer
          id="equipment-3d-roof"
          type="fill-extrusion"
          filter={equipmentAnd3DFilter}
          layout={{ visibility: threeDVisible ? "visible" : "none" }}
          paint={{
            "fill-extrusion-color": [
              "match",
              ["get", "visualProfile"],
              "sungrow_container_v1",
              "#eef2f7",
              "sungrow_pcs_v1",
              "#cbd5e1",
              "tesla_megapack_v1",
              "#e2e6ea",
              "#3a4252",
            ],
            "fill-extrusion-height": ["get", "heightM"],
            "fill-extrusion-base": [
              "max",
              0,
              ["-", ["get", "heightM"], 0.18],
            ],
            "fill-extrusion-opacity": 1,
          }}
        />
      </Source>

      <Source
        id="equipment-3d-details"
        type="geojson"
        data={equipment3DDetailsFc}
      >
        <Layer
          id="equipment-3d-detail-extrusions"
          type="fill-extrusion"
          filter={equipmentTypeFilter}
          layout={{ visibility: threeDVisible ? "visible" : "none" }}
          paint={{
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["get", "topM"],
            "fill-extrusion-base": ["get", "baseM"],
            "fill-extrusion-opacity": 0.98,
            "fill-extrusion-vertical-gradient": false,
          }}
        />
      </Source>

      <Source
        id="equipment-3d-brand-labels"
        type="geojson"
        data={equipment3DLabelsFc}
      >
        <Layer
          id="equipment-3d-brand-labels"
          type="symbol"
          filter={equipmentTypeFilter}
          layout={{
            visibility:
              threeDVisible && layerVisibility.labels ? "visible" : "none",
            "text-field": ["get", "label"],
            "text-size": 20,
            "text-letter-spacing": 0.12,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-rotation-alignment": "map",
            "text-pitch-alignment": "map",
            "text-rotate": ["get", "rotationDeg"],
            "text-offset": [0, 0],
          }}
          paint={{
            "text-color": ["get", "color"],
            "text-halo-color": "#0f5f99",
            "text-halo-width": 2.2,
          }}
        />
      </Source>

      <Source id="layout-warning-markers" type="geojson" data={warningMarkerFc}>
        <Layer
          id="layout-collision-markers"
          type="circle"
          filter={["==", ["get", "warningType"], "collision"]}
          layout={{
            visibility: layerVisibility.collisions ? "visible" : "none",
          }}
          paint={{
            "circle-radius": 9,
            "circle-color": "#ef4444",
            "circle-opacity": 0.85,
            "circle-stroke-color": "#fee2e2",
            "circle-stroke-width": 2,
          }}
        />
        <Layer
          id="layout-out-of-bounds-markers"
          type="circle"
          filter={["==", ["get", "warningType"], "outOfBounds"]}
          layout={{
            visibility: layerVisibility.outOfBounds ? "visible" : "none",
          }}
          paint={{
            "circle-radius": 8,
            "circle-color": "#60a5fa",
            "circle-opacity": 0.9,
            "circle-stroke-color": "#dbeafe",
            "circle-stroke-width": 2,
          }}
        />
      </Source>

      <Source
        id="coordinate-search-point"
        type="geojson"
        data={searchedPointFc}
      >
        <Layer
          id="coordinate-search-halo"
          type="circle"
          paint={{
            "circle-radius": 13,
            "circle-color": "#facc15",
            "circle-opacity": 0.22,
            "circle-stroke-color": "#facc15",
            "circle-stroke-width": 1,
          }}
        />
        <Layer
          id="coordinate-search-dot"
          type="circle"
          paint={{
            "circle-radius": 5,
            "circle-color": "#facc15",
            "circle-stroke-color": "#020617",
            "circle-stroke-width": 2,
          }}
        />
      </Source>
    </>
  );
}
