import { describe, expect, it } from "vitest";
import {
  generateConceptualPhysicalInfrastructure,
  layoutZoneFeatures,
  layoutZoneLabelFeatures,
} from "@/lib/layout/physicalInfrastructure";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import { toLngLat } from "@/lib/geometry/projection";

const anchor: ProjectAnchor = { lng0: -70, lat0: -23 };

function equipment(
  id: string,
  equipmentSpecId: string,
  x_m: number,
  y_m: number
): PlacedEquipment {
  return {
    id,
    equipmentSpecId,
    anchor: toLngLat({ x_m, y_m }, anchor),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  };
}

describe("generateConceptualPhysicalInfrastructure", () => {
  it("creates MV yard, POI yard and routes for PCS/MV stations", () => {
    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [],
      placed: [
        equipment("bess-01", "sungrow-st2752ux-us", 0, 0),
        equipment("pcs-01", "sungrow-sc5000ud-mv-us-p3", 30, 0),
        equipment("pcs-02", "sungrow-sc5000ud-mv-us-p3", 30, 25),
      ],
    });

    expect(result.layoutZones.map((zone) => zone.type)).toEqual([
      "mv_yard",
      "poi_yard",
    ]);
    expect(result.cableRoutes).toHaveLength(3);
    expect(result.accessRoads).toHaveLength(1);
    expect(result.diagnostics).toMatchObject({
      stationCount: 2,
      cableRouteCount: 3,
      generatedMvYard: true,
      generatedPoiYard: true,
    });
  });

  it("creates only an access road when no PCS/MV station exists", () => {
    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [
        { lng: -70, lat: -23 },
        { lng: -69.999, lat: -23 },
        { lng: -69.999, lat: -22.999 },
        { lng: -70, lat: -22.999 },
      ],
      placed: [equipment("bess-01", "sungrow-st2752ux-us", 0, 0)],
    });

    expect(result.layoutZones).toEqual([]);
    expect(result.cableRoutes).toEqual([]);
    expect(result.accessRoads).toHaveLength(1);
    expect(result.accessRoads[0].type).toBe("perimeter");
  });

  it("converts zones to polygon and label features", () => {
    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [],
      placed: [equipment("pcs-01", "sungrow-sc5000ud-mv-us-p3", 30, 0)],
    });

    const polygons = layoutZoneFeatures(result.layoutZones, anchor);
    const labels = layoutZoneLabelFeatures(result.layoutZones, anchor);
    expect(polygons.features).toHaveLength(2);
    expect(labels.features).toHaveLength(2);
    expect(labels.features[0].properties.label).toContain("Sectioning");
  });
});
