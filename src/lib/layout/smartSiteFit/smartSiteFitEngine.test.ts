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

  it("should run target sizing mode successfully", () => {
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(result.selected).not.toBeNull();
    expect(result.candidates.length).toBe(1); // Target mode returns single choice
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
