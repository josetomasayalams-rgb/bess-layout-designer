import { describe, expect, it } from "vitest";
import { buildSizingSnapshot } from "./sizingSnapshot";
import type { PlacedEquipment } from "@/types/equipment";

const BESS_ID = "sungrow-st2752ux-us"; // 2.752 MWh DC BOL
const PCS_ID = "sungrow-sc5000ud-mv-us-p3"; // 5 MVA

function place(specId: string, i: number): PlacedEquipment {
  return {
    id: `${specId}-${i}`,
    equipmentSpecId: specId,
    anchor: { lng: -70, lat: -33 },
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
  };
}

const ARGS = {
  id: "snap1",
  name: "Caso A",
  createdAt: "2026-06-03T12:00:00.000Z",
  strategy: "balanced",
  mode: "target",
  score: 82.4,
};

describe("buildSizingSnapshot", () => {
  it("derives energy, power and counts from the placed equipment", () => {
    const placed = [place(BESS_ID, 0), place(BESS_ID, 1), place(PCS_ID, 0)];
    const snap = buildSizingSnapshot({ ...ARGS, placedEquipment: placed });

    expect(snap.bessCount).toBe(2);
    expect(snap.pcsCount).toBe(1);
    expect(snap.energyMWh).toBe(5.504); // 2 × 2.752
    expect(snap.powerMW).toBe(5); // 1 × 5 MVA
  });

  it("computes durationHours as energy / power", () => {
    const placed = [place(BESS_ID, 0), place(BESS_ID, 1), place(PCS_ID, 0)];
    const snap = buildSizingSnapshot({ ...ARGS, placedEquipment: placed });
    expect(snap.durationHours).toBeCloseTo(5.504 / 5, 3);
  });

  it("returns null duration when there is no power", () => {
    const placed = [place(BESS_ID, 0)];
    const snap = buildSizingSnapshot({ ...ARGS, placedEquipment: placed });
    expect(snap.powerMW).toBe(0);
    expect(snap.durationHours).toBeNull();
  });

  it("carries the SmartSiteFit metadata and marks the snapshot preliminary", () => {
    const snap = buildSizingSnapshot({ ...ARGS, placedEquipment: [place(PCS_ID, 0)] });
    expect(snap.id).toBe("snap1");
    expect(snap.name).toBe("Caso A");
    expect(snap.strategy).toBe("balanced");
    expect(snap.mode).toBe("target");
    expect(snap.score).toBe(82.4);
    expect(snap.classification).toBe("preliminary_assumption");
  });
});
