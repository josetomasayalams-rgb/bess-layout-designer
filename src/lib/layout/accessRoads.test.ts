import { describe, expect, it } from "vitest";
import {
  accessRoadCorridorFeatures,
  accessRoadLineFeatures,
  createPerimeterAccessRoad,
} from "@/lib/layout/accessRoads";
import type { ProjectAnchor } from "@/types/geometry";
import type { AccessRoad } from "@/types/road";

const anchor: ProjectAnchor = { lng0: -70, lat0: -23 };
const polygon = [
  { lng: -70, lat: -23 },
  { lng: -69.999, lat: -23 },
  { lng: -69.999, lat: -22.999 },
  { lng: -70, lat: -22.999 },
];

describe("access road generation and features", () => {
  it("creates a closed perimeter access road from a site polygon", () => {
    const road = createPerimeterAccessRoad({ polygon, anchor, widthM: 6 });
    expect(road).not.toBeNull();
    expect(road?.id).toBe("road-perimeter-01");
    expect(road?.centerLine).toHaveLength(5);
    expect(road?.centerLine[0]).toEqual(road?.centerLine[4]);
  });

  it("creates line and corridor map features", () => {
    const road: AccessRoad = {
      id: "road-01",
      type: "internal",
      centerLine: [
        { x_m: 0, y_m: 0 },
        { x_m: 25, y_m: 0 },
      ],
      width_m: 6,
      surface: "gravel",
    };

    expect(accessRoadLineFeatures([road], anchor).features).toHaveLength(1);
    const corridors = accessRoadCorridorFeatures([road], anchor);
    expect(corridors.features).toHaveLength(1);
    expect(corridors.features[0].properties.widthM).toBe(6);
  });

  it("does not create perimeter roads without a valid polygon", () => {
    expect(createPerimeterAccessRoad({ polygon: [], anchor })).toBeNull();
    expect(createPerimeterAccessRoad({ polygon, anchor: null })).toBeNull();
  });
});
