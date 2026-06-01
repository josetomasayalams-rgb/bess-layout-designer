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
    expect(result.accessRoads).toHaveLength(3);
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

  it("handles BESS-PCS blocks with blockId and builds block-level routing", () => {
    const placed: PlacedEquipment[] = [
      {
        id: "b1",
        equipmentSpecId: "sungrow-st2752ux-us",
        anchor: toLngLat({ x_m: 0, y_m: 0 }, anchor),
        rotation_deg: 0,
        sourceReliability: "certified_data",
        blockId: "block-1",
        blockIndex: 0,
        templateId: "bess-del-desierto-reference-8x1",
        classification: "reference_only",
      },
      {
        id: "pcs1",
        equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
        anchor: toLngLat({ x_m: 10, y_m: 0 }, anchor),
        rotation_deg: 0,
        sourceReliability: "certified_data",
        blockId: "block-1",
        blockIndex: 0,
        templateId: "bess-del-desierto-reference-8x1",
        classification: "reference_only",
      },
      {
        id: "b2",
        equipmentSpecId: "sungrow-st2752ux-us",
        anchor: toLngLat({ x_m: 0, y_m: 30 }, anchor),
        rotation_deg: 0,
        sourceReliability: "certified_data",
        blockId: "block-2",
        blockIndex: 1,
        templateId: "bess-del-desierto-reference-8x1",
        classification: "reference_only",
      },
    ];

    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [],
      placed,
      hasPoi: true,
    });

    expect(result.diagnostics.blockCount).toBe(2);
    expect(result.cableRoutes).toHaveLength(3);

    const route1 = result.cableRoutes.find(r => r.fromEntityId === "pcs1");
    expect(route1).toBeDefined();
    expect(route1?.blockId).toBe("block-1");
    expect(route1?.classification).toBe("reference_only");

    const route2 = result.cableRoutes.find(r => r.fromEntityId === "block-2");
    expect(route2).toBeDefined();
    expect(route2?.blockId).toBe("block-2");
    expect(route2?.classification).toBe("reference_only");

    expect(route1?.classification).not.toBe("certified_data");
    expect(result.accessRoads.every(r => r.classification === "preliminary_assumption" || r.classification === "reference_only")).toBe(true);
  });

  it("emits warnings under missing POI/PCC and zero blocks", () => {
    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [],
      placed: [
        equipment("pcs-01", "sungrow-sc5000ud-mv-us-p3", 30, 0),
      ],
      hasPoi: false,
    });

    expect(result.diagnostics.warnings).toBeDefined();
    expect(result.diagnostics.warnings?.some(w => w.includes("PCC/POI"))).toBe(true);
    expect(result.diagnostics.warnings?.some(w => w.includes("bloques de equipos"))).toBe(true);
  });

  it("labels integrated (no-PCS) blocks as low-voltage collectors with an external-transformer note", () => {
    const placed: PlacedEquipment[] = [
      {
        id: "u1",
        equipmentSpecId: "bess-tesla-megapack-2xl-4h",
        anchor: toLngLat({ x_m: 0, y_m: 0 }, anchor),
        rotation_deg: 0,
        sourceReliability: "preliminary_assumption",
        blockId: "integrated-row-0",
        blockIndex: 0,
        classification: "preliminary_assumption",
      },
      {
        id: "u2",
        equipmentSpecId: "bess-tesla-megapack-2xl-4h",
        anchor: toLngLat({ x_m: 12, y_m: 0 }, anchor),
        rotation_deg: 0,
        sourceReliability: "preliminary_assumption",
        blockId: "integrated-row-0",
        blockIndex: 0,
        classification: "preliminary_assumption",
      },
      {
        id: "u3",
        equipmentSpecId: "bess-tesla-megapack-2xl-4h",
        anchor: toLngLat({ x_m: 0, y_m: 12 }, anchor),
        rotation_deg: 0,
        sourceReliability: "preliminary_assumption",
        blockId: "integrated-row-1",
        blockIndex: 1,
        classification: "preliminary_assumption",
      },
    ];

    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [],
      placed,
      hasPoi: true,
    });

    // No PCS station anywhere → low-voltage collector treatment.
    expect(result.diagnostics.stationCount).toBe(0);
    expect(result.diagnostics.blockCount).toBe(2);

    const collectors = result.cableRoutes.filter((r) => r.id !== "route-mt-poi-01");
    expect(collectors).toHaveLength(2);
    for (const route of collectors) {
      expect(route.voltageLevel).toBe("BT");
      expect(route.voltageKv).toBeUndefined();
      expect(route.cableType).toContain("BT");
      expect(
        route.evidence?.some((e) => e.note?.includes("transformador elevador externo"))
      ).toBe(true);
    }

    // The interface → POI tie stays conceptual MV (downstream of the external step-up).
    const poiRoute = result.cableRoutes.find((r) => r.id === "route-mt-poi-01");
    expect(poiRoute?.voltageLevel).toBe("MT");
    expect(poiRoute?.voltageKv).toBe(33);

    // The MV yard is relabeled as an external interface, not a sectioning center.
    const mvYard = result.layoutZones.find((z) => z.type === "mv_yard");
    expect(mvYard?.label).toContain("Interfaz MT");

    // A diagnostics warning surfaces the unmodeled external transformer.
    expect(
      result.diagnostics.warnings?.some((w) => w.includes("transformador elevador externo"))
    ).toBe(true);
  });

  it("keeps Sungrow PCS collectors at medium voltage (regression)", () => {
    const result = generateConceptualPhysicalInfrastructure({
      anchor,
      polygon: [],
      placed: [
        equipment("bess-01", "sungrow-st2752ux-us", 0, 0),
        equipment("pcs-01", "sungrow-sc5000ud-mv-us-p3", 30, 0),
      ],
    });

    const collectors = result.cableRoutes.filter((r) => r.id !== "route-mt-poi-01");
    expect(collectors.length).toBeGreaterThan(0);
    for (const route of collectors) {
      expect(route.voltageLevel).toBe("MT");
      expect(route.voltageKv).toBe(33);
    }
    const mvYard = result.layoutZones.find((z) => z.type === "mv_yard");
    expect(mvYard?.label).toContain("Sectioning");
    expect(
      result.diagnostics.warnings?.some((w) => w.includes("transformador elevador externo"))
    ).toBe(false);
  });
});
