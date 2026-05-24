import { describe, it, expect } from "vitest";
import { polygonAreaFromLngLat } from "./area";

describe("polygonAreaFromLngLat", () => {
  it("returns null for polygons with fewer than 3 vertices", () => {
    expect(polygonAreaFromLngLat([])).toBeNull();
    expect(polygonAreaFromLngLat([{ lng: 0, lat: 0 }, { lng: 1, lat: 1 }])).toBeNull();
  });

  it("computes positive area for a small square near the equator", () => {
    const polygon = [
      { lng: 0, lat: 0 },
      { lng: 0.001, lat: 0 },
      { lng: 0.001, lat: 0.001 },
      { lng: 0, lat: 0.001 },
    ];
    const result = polygonAreaFromLngLat(polygon);
    expect(result).not.toBeNull();
    expect(result!.area_m2).toBeGreaterThan(10000);
    expect(result!.area_m2).toBeLessThan(15000);
    expect(result!.area_ha).toBeCloseTo(result!.area_m2 / 10000, 8);
  });
});
