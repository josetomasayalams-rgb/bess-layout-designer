import { describe, expect, it } from "vitest";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import {
  DEFAULT_REGULATORY_CONTEXT,
  getRegulatoryProfile,
} from "./bessRegulatoryProfiles";
import { validateBessLayout } from "./bessValidationEngine";
import { toLngLat } from "@/lib/geometry/projection";

const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };
const profile = getRegulatoryProfile("ifc-2024-nfpa-855-conservative");

function battery(id: string, x_m: number, y_m: number): PlacedEquipment {
  return {
    id,
    equipmentSpecId: "sungrow-st2752ux-us",
    anchor: toLngLat({ x_m, y_m }, anchor),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  };
}

function pcs(id: string, x_m: number, y_m: number): PlacedEquipment {
  return {
    id,
    equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
    anchor: toLngLat({ x_m, y_m }, anchor),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  };
}

const polygon = [
  toLngLat({ x_m: -50, y_m: -50 }, anchor),
  toLngLat({ x_m: 50, y_m: -50 }, anchor),
  toLngLat({ x_m: 50, y_m: 50 }, anchor),
  toLngLat({ x_m: -50, y_m: 50 }, anchor),
];

describe("validateBessLayout", () => {
  it("marks BESS spacing as compliant when separation meets conservative rule", () => {
    const result = validateBessLayout({
      placed: [battery("b1", -10, 0), battery("b2", 10, 0)],
      polygon,
      anchor,
      profile,
      context: { ...DEFAULT_REGULATORY_CONTEXT, hasManufacturerManual: true },
    });

    expect(result.criticalCount).toBe(0);
    expect(
      result.compliantItems.some((item) => item.ruleId === "bess_to_bess_spacing")
    ).toBe(true);
  });

  it("marks reduced BESS spacing as critical without validation basis", () => {
    const result = validateBessLayout({
      placed: [battery("b1", 0, 0), battery("b2", 10, 0)],
      polygon,
      anchor,
      profile,
      context: DEFAULT_REGULATORY_CONTEXT,
    });

    expect(result.criticalCount).toBeGreaterThan(0);
    expect(result.projectStatus).toBe("non_compliant");
  });

  it("downgrades reduced BESS spacing to warning with declared validation basis", () => {
    const result = validateBessLayout({
      placed: [battery("b1", 0, 0), battery("b2", 10, 0)],
      polygon,
      anchor,
      profile,
      context: {
        ...DEFAULT_REGULATORY_CONTEXT,
        hasUl9540a: true,
        hasManufacturerManual: true,
      },
    });

    expect(result.criticalCount).toBe(0);
    expect(result.warningCount).toBeGreaterThan(0);
    expect(result.projectStatus).toBe("compliant_with_warnings");
  });

  it("flags BESS too close to site boundary", () => {
    const result = validateBessLayout({
      placed: [battery("b1", 45, 0)],
      polygon,
      anchor,
      profile,
      context: { ...DEFAULT_REGULATORY_CONTEXT, hasManufacturerManual: true },
    });

    expect(
      result.issues.some((item) => item.ruleId === "bess_to_property_line")
    ).toBe(true);
  });

  it("warns when equipment is too far from conceptual vehicle access", () => {
    const largePolygon = [
      toLngLat({ x_m: -200, y_m: -200 }, anchor),
      toLngLat({ x_m: 200, y_m: -200 }, anchor),
      toLngLat({ x_m: 200, y_m: 200 }, anchor),
      toLngLat({ x_m: -200, y_m: 200 }, anchor),
    ];
    const result = validateBessLayout({
      placed: [battery("b1", 0, 0)],
      polygon: largePolygon,
      anchor,
      profile,
      context: { ...DEFAULT_REGULATORY_CONTEXT, hasManufacturerManual: true },
    });

    expect(
      result.issues.some((item) => item.ruleId === "vehicle_access_distance")
    ).toBe(true);
  });

  it("warns when fire setback cannot be evaluated without a site polygon", () => {
    const result = validateBessLayout({
      placed: [battery("b1", 0, 0)],
      polygon: [],
      anchor,
      profile,
      context: { ...DEFAULT_REGULATORY_CONTEXT, hasManufacturerManual: true },
    });

    expect(
      result.issues.some((item) => item.ruleId === "fire_boundary_setback")
    ).toBe(true);
  });

  it("warns when a conceptual cable corridor crosses another equipment footprint", () => {
    const result = validateBessLayout({
      placed: [
        pcs("pcs-01", 0, 0),
        battery("b1", 35, 0),
      ],
      polygon: [],
      anchor,
      profile,
      context: { ...DEFAULT_REGULATORY_CONTEXT, hasManufacturerManual: true },
    });

    expect(
      result.issues.some(
        (item) => item.ruleId === "cable_route_equipment_clearance"
      )
    ).toBe(true);
  });
});
