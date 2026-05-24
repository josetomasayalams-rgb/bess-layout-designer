import { describe, it, expect } from "vitest";
import { toLocal, toLngLat } from "./projection";

describe("projection", () => {
  const anchor = { lng0: -70.5, lat0: -33.5 };

  it("anchor maps to origin", () => {
    const p = toLocal({ lng: -70.5, lat: -33.5 }, anchor);
    expect(p.x_m).toBeCloseTo(0, 6);
    expect(p.y_m).toBeCloseTo(0, 6);
  });

  it("toLocal then toLngLat is identity", () => {
    const original = { lng: -70.4998, lat: -33.4995 };
    const local = toLocal(original, anchor);
    const back = toLngLat(local, anchor);
    expect(back.lng).toBeCloseTo(original.lng, 8);
    expect(back.lat).toBeCloseTo(original.lat, 8);
  });

  it("100 m north increases latitude by ~1/110540 deg", () => {
    const p = toLngLat({ x_m: 0, y_m: 100 }, anchor);
    expect(p.lat - anchor.lat0).toBeCloseTo(100 / 110540, 6);
  });
});
