import { describe, expect, it } from "vitest";
import {
  cableRouteCorridorFeatures,
  cableRouteLineFeatures,
} from "@/lib/layout/cableRoutes";
import type { CableRoute } from "@/types/cable";
import type { ProjectAnchor } from "@/types/geometry";

const anchor: ProjectAnchor = { lng0: -70, lat0: -23 };

const route: CableRoute = {
  id: "route-mt-01",
  voltageLevel: "MT",
  voltageKv: 33,
  fromEntityId: "station-pb01",
  toEntityId: "bus-bp5",
  path: [
    { x_m: 0, y_m: 0 },
    { x_m: 30, y_m: 0 },
    { x_m: 30, y_m: 20 },
  ],
  corridorWidth_m: 3,
  cableType: "Conceptual 18/33 kV",
};

describe("cable route map features", () => {
  it("creates one line feature per route", () => {
    const fc = cableRouteLineFeatures([route], anchor);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0].geometry.coordinates).toHaveLength(3);
    expect(fc.features[0].properties.estimatedLengthM).toBe(50);
  });

  it("creates one corridor polygon per route segment", () => {
    const fc = cableRouteCorridorFeatures([route], anchor);
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].geometry.coordinates[0]).toHaveLength(5);
    expect(fc.features[0].properties.corridorWidthM).toBe(3);
  });

  it("returns empty collections without an anchor", () => {
    expect(cableRouteLineFeatures([route], null).features).toEqual([]);
    expect(cableRouteCorridorFeatures([route], null).features).toEqual([]);
  });
});
