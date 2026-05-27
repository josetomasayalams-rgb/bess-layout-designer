import type { StyleSpecification } from "maplibre-gl";

export const INITIAL_VIEW = {
  longitude: -70.6483,
  latitude: -33.4569,
  zoom: 4.5,
};

export const BLANK_BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "blank-background",
      type: "background",
      paint: { "background-color": "#020617" },
    },
  ],
};

/** Distance (metres) the layout-edit nudge buttons move the selection. */
export const LAYOUT_MOVE_STEP_M = 1;
