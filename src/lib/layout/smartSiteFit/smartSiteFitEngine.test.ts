import { describe, expect, it } from "vitest";
import { runSmartSiteFit } from "./smartSiteFitEngine";
import type { LngLat } from "@/types/geometry";

describe("SmartSiteFit Engine", () => {
  const polygon: LngLat[] = [
    { lng: -70.001, lat: -33.001 },
    { lng: -69.999, lat: -33.001 },
    { lng: -69.999, lat: -32.999 },
    { lng: -70.001, lat: -32.999 },
  ];

  it("should fail gracefully with warning if polygon is missing", () => {
    const result = runSmartSiteFit({
      mode: "terrain",
      durationHours: 4,
    });
    expect(result.success).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].id).toBe("missing-polygon");
  });

  it("should fail gracefully with warning if polygon is too small / invalid", () => {
    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: [{ lng: -70, lat: -33 }],
      durationHours: 4,
    });
    expect(result.success).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].id).toBe("invalid-polygon");
  });

  it("should run target sizing mode successfully and produce correct BESS to PCS ratios", () => {
    const result8 = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });

    expect(result8.success).toBe(true);
    expect(result8.fallbackUsed).toBe(false);
    expect(result8.selected).not.toBeNull();
    const bess8 = result8.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;
    const pcs8 = result8.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3").length;
    expect(bess8 / pcs8).toBe(16);

    const result16 = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 5,
      targetMWh: 80,
      durationHours: 16,
      strategy: "balanced",
    });

    expect(result16.success).toBe(true);
    const bess16 = result16.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;
    const pcs16 = result16.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3").length;
    expect(bess16 / pcs16).toBe(32);
  });

  it("should run terrain sizing mode successfully", () => {
    const result = runSmartSiteFit({
      mode: "terrain",
      polygon,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(result.selected).not.toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeLessThanOrEqual(3); // Up to 3 alternatives
  });
});
