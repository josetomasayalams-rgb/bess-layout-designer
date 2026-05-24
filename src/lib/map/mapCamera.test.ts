import { describe, expect, it, vi } from "vitest";
import {
  ISO_PITCH_DEG,
  bearingForDirection,
  resetView,
  setEastView,
  setIsoView,
  setNorthView,
  setSouthView,
  setTopView,
  setWestView,
  type CameraMap,
} from "@/lib/map/mapCamera";

describe("bearingForDirection", () => {
  it("maps compass directions to the expected map bearings", () => {
    expect(bearingForDirection("north")).toBe(0);
    expect(bearingForDirection("east")).toBe(90);
    expect(bearingForDirection("south")).toBe(180);
    expect(bearingForDirection("west")).toBe(270);
  });
});

describe("camera helpers", () => {
  it("compass helpers ease the bearing without touching the pitch", () => {
    const cases: Array<[(map: CameraMap) => void, number]> = [
      [setNorthView, 0],
      [setEastView, 90],
      [setSouthView, 180],
      [setWestView, 270],
    ];
    for (const [helper, bearing] of cases) {
      const easeTo = vi.fn();
      helper({ easeTo });
      const arg = easeTo.mock.calls[0][0];
      expect(arg.bearing).toBe(bearing);
      expect(arg.pitch).toBeUndefined();
      expect(arg.duration).toBeGreaterThan(0);
    }
  });

  it("setTopView eases pitch to 0 and leaves bearing untouched", () => {
    const easeTo = vi.fn();
    setTopView({ easeTo });
    const arg = easeTo.mock.calls[0][0];
    expect(arg.pitch).toBe(0);
    expect(arg.bearing).toBeUndefined();
  });

  it("setIsoView eases pitch to the isometric tilt", () => {
    const easeTo = vi.fn();
    setIsoView({ easeTo });
    const arg = easeTo.mock.calls[0][0];
    expect(arg.pitch).toBe(ISO_PITCH_DEG);
    expect(arg.bearing).toBeUndefined();
  });

  it("resetView returns to north-up and top-down", () => {
    const easeTo = vi.fn();
    resetView({ easeTo });
    expect(easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ bearing: 0, pitch: 0 })
    );
  });
});
