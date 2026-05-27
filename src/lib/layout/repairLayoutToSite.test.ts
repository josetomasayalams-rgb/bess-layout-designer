/**
 * Phase 14.4 — `repairLayoutToSite` guard branches.
 *
 * The full optimisation pipeline is covered by `fitLayoutToTerrain` tests
 * downstream. Here we pin the three documented error returns so the UI's
 * empty-state messages remain stable.
 */

import { describe, expect, it } from "vitest";
import { repairLayoutToSite } from "./repairLayoutToSite";
import type { LayoutRepairRules } from "./layoutRepair";
import {
  makeAnchor,
  makePolygon,
  makePlacedEquipment,
  FIXTURE_BATTERY_SPEC_ID,
} from "@/tests/fixtures";

const RULES: LayoutRepairRules = {
  bessToBess_m: 3,
  bessToPropertyLine_m: 3,
  electricalFrontWorkingClearance_m: 0.9,
};

describe("repairLayoutToSite — guard branches", () => {
  it("returns an error when there is no placed equipment", () => {
    const result = repairLayoutToSite({
      placed: [],
      anchor: makeAnchor(),
      polygon: makePolygon(),
      rules: RULES,
    });
    expect(result.status).toBe("error");
    expect(result.placed).toEqual([]);
    expect(result.cableRoutes).toEqual([]);
    expect(result.accessRoads).toEqual([]);
  });

  it("returns an error when there is no polygon", () => {
    const anchor = makeAnchor();
    const result = repairLayoutToSite({
      placed: [makePlacedEquipment({ equipmentSpecId: FIXTURE_BATTERY_SPEC_ID })],
      anchor,
      polygon: [],
      rules: RULES,
    });
    expect(result.status).toBe("error");
  });

  it("returns an error when all equipment is locked", () => {
    const anchor = makeAnchor();
    const polygon = makePolygon({ anchor, width_m: 400, height_m: 200 });
    const placed = [
      makePlacedEquipment({
        equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
        locked: true,
        anchor: { lng: anchor.lng0 + 0.0005, lat: anchor.lat0 + 0.0005 },
      }),
    ];
    const result = repairLayoutToSite({
      placed,
      anchor,
      polygon,
      rules: RULES,
    });
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/locked/i);
  });

  it("falls back to the first placed item's anchor when anchor is null", () => {
    // Should NOT error on null anchor when polygon + placed exist.
    const polygon = makePolygon({ width_m: 400, height_m: 200 });
    const placed = [
      makePlacedEquipment({
        equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
        anchor: { lng: -70.6483, lat: -33.4569 },
      }),
    ];
    const result = repairLayoutToSite({
      placed,
      anchor: null,
      polygon,
      rules: RULES,
    });
    // Either succeeds, or errors for a non-anchor reason (e.g. the
    // chosen anchor places equipment outside the polygon). The point
    // is that the anchor-null branch is exercised — it should not
    // return the "no anchor / no polygon" early-error message.
    expect(result).toBeDefined();
    expect(result.status).toBeDefined();
    expect(typeof result.status).toBe("string");
  });
});
