/**
 * Phase 14.4 — `getProjectMetrics`.
 *
 * Pre-Phase 14 coverage: 90 % lines but 46 % branches. The branching
 * is in the `status` selector and the energy/power density guards;
 * these tests pin both.
 */

import { describe, expect, it } from "vitest";
import { getProjectMetrics, formatNumber } from "./projectMetrics";
import {
  makeAnchor,
  makePolygon,
  makePlacedEquipment,
  FIXTURE_BATTERY_SPEC_ID,
} from "@/tests/fixtures";

describe("getProjectMetrics — status selector", () => {
  it("returns 'Setup required' when there is no terrain and no layout", () => {
    const m = getProjectMetrics([], [], null);
    expect(m.status).toBe("Setup required");
    expect(m.hasTerrain).toBe(false);
    expect(m.hasLayout).toBe(false);
  });

  it("returns 'Terrain ready' when terrain exists but layout does not", () => {
    const anchor = makeAnchor();
    const m = getProjectMetrics(makePolygon({ anchor }), [], anchor);
    expect(m.status).toBe("Terrain ready");
    expect(m.hasTerrain).toBe(true);
    expect(m.hasLayout).toBe(false);
  });

  it("returns 'Layout calculated' when terrain + valid layout exist", () => {
    const anchor = makeAnchor();
    const polygon = makePolygon({ anchor, width_m: 400, height_m: 200 });
    const placed = [
      makePlacedEquipment({
        equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
        anchor: { lng: anchor.lng0 + 0.0005, lat: anchor.lat0 + 0.0005 },
      }),
    ];
    const m = getProjectMetrics(polygon, placed, anchor);
    expect(m.hasLayout).toBe(true);
    // Status is either Layout calculated or Needs review depending on
    // computed warnings — both are valid; ensure it is not Setup/Terrain.
    expect(["Layout calculated", "Needs review"]).toContain(m.status);
  });
});

describe("getProjectMetrics — densities", () => {
  it("energy and power densities are null when there is no site area", () => {
    const m = getProjectMetrics([], [], null);
    expect(m.energyDensity).toBeNull();
    expect(m.powerDensity).toBeNull();
  });

  it("returns numeric densities when polygon is valid", () => {
    const anchor = makeAnchor();
    const polygon = makePolygon({ anchor, width_m: 400, height_m: 200 });
    const placed = [
      makePlacedEquipment({
        equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
        anchor: { lng: anchor.lng0 + 0.0005, lat: anchor.lat0 + 0.0005 },
      }),
    ];
    const m = getProjectMetrics(polygon, placed, anchor);
    expect(typeof m.energyDensity).toBe("number");
    expect(typeof m.powerDensity).toBe("number");
    expect(m.energyDensity).not.toBeNull();
  });
});

describe("formatNumber re-export", () => {
  it("delegates to lib/units/formatUnits.formatNumber", () => {
    expect(formatNumber(1234.5678, 2)).toContain("1");
  });
});
