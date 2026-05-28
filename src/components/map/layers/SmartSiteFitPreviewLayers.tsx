import React from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";

interface SmartSiteFitPreviewLayersProps {
  bessFc: FeatureCollection;
  pcsFc: FeatureCollection;
  visible?: boolean;
}

export function SmartSiteFitPreviewLayers({
  bessFc,
  pcsFc,
  visible = true,
}: SmartSiteFitPreviewLayersProps) {
  if (!visible) return null;

  return (
    <>
      {/* BESS Preview Source & Layers */}
      <Source id="smart-site-fit-preview-bess-source" type="geojson" data={bessFc}>
        <Layer
          id="smart-site-fit-preview-bess-fill"
          type="fill"
          paint={{
            "fill-color": "#0284c7", // light-mid blue
            "fill-opacity": 0.38,
          }}
        />
        <Layer
          id="smart-site-fit-preview-bess-outline"
          type="line"
          paint={{
            "line-color": "#38bdf8", // light blue
            "line-width": 1.5,
            "line-dasharray": [3, 2],
            "line-opacity": 0.75,
          }}
        />
      </Source>

      {/* PCS Preview Source & Layers */}
      <Source id="smart-site-fit-preview-pcs-source" type="geojson" data={pcsFc}>
        <Layer
          id="smart-site-fit-preview-pcs-fill"
          type="fill"
          paint={{
            "fill-color": "#ea580c", // mid orange
            "fill-opacity": 0.38,
          }}
        />
        <Layer
          id="smart-site-fit-preview-pcs-outline"
          type="line"
          paint={{
            "line-color": "#fb923c", // light orange
            "line-width": 1.5,
            "line-dasharray": [3, 2],
            "line-opacity": 0.75,
          }}
        />
      </Source>
    </>
  );
}
