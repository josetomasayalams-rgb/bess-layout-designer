import { describe, expect, it } from "vitest";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLngLat } from "@/lib/geometry/projection";
import type { ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { runSmartRepair } from "./smartRepairIntegration";

const anchor: ProjectAnchor = { lng0: -70.6, lat0: -33.45 };

const batterySpec = equipmentCatalog.find((spec) => spec.type === "battery_container");
const pcsSpec = equipmentCatalog.find((spec) => spec.type === "pcs_mv_station");
if (!batterySpec || !pcsSpec) throw new Error("Missing test equipment specs");
const batterySpecId = batterySpec.id;
const pcsSpecId = pcsSpec.id;

function battery(id: string, xM: number, yM: number, blockId?: string): PlacedEquipment {
  return {
    id,
    equipmentSpecId: batterySpecId,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
    blockId,
  };
}

function pcs(id: string, xM: number, yM: number, blockId?: string): PlacedEquipment {
  return {
    id,
    equipmentSpecId: pcsSpecId,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
    blockId,
  };
}

describe("runSmartRepair", () => {
  it("adds Reparacion Inteligente diagnostics and reduces cable-equipment interferences", () => {
    const placed = [
      { ...pcs("b1-pcs", 10, 10, "block-1"), locked: true },
      pcs("b2-pcs", 40, 30, "block-2"),
      battery("b2-bess", 40, 10, "block-2"),
    ];

    const result = runSmartRepair({
      placed,
      anchor,
      polygon: [],
      rules: {
        bessToBess_m: 3,
        bessToPropertyLine_m: 3,
        electricalFrontWorkingClearance_m: 0.9,
      },
    });

    expect(result.diagnostics.smartRepair).toBeDefined();
    expect(result.diagnostics.smartRepair?.cableEquipmentBefore).toBeGreaterThan(0);
    expect(result.diagnostics.smartRepair?.cableEquipmentAfter).toBe(0);
    expect(result.diagnostics.smartRepair?.autoRepairableResolved).toBeGreaterThan(0);
    expect(result.diagnostics.smartRepair?.notAutoRepairable.length).toBeGreaterThan(0);
  });
});
