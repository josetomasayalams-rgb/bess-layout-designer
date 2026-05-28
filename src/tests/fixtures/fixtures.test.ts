/**
 * Phase 14.1 — Sanity tests for fixture builders.
 *
 * These tests are intentionally narrow: they guard the public shape of
 * the fixtures so that downstream tests in 14.2–14.8 can rely on them.
 * Not a regression suite for the underlying domain types.
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_ANCHOR,
  FIXTURE_BATTERY_SPEC_ID,
  FIXTURE_PCS_SPEC_ID,
  bessDelDesiertoPreset,
  largeSyntheticSitePreset,
  makeAnchor,
  makeBuildReportDataArgs,
  makeEmptyPolygon,
  makePlacedEquipment,
  makePlacedEquipmentRow,
  makePolygon,
  makeRectanglePolygon,
  makeRegulatoryProfile,
  minimalSitePreset,
  resetPlacedEquipmentIds,
} from "./index";

beforeEach(() => {
  resetPlacedEquipmentIds();
});

describe("makeAnchor", () => {
  it("defaults to Santiago", () => {
    expect(makeAnchor()).toEqual(DEFAULT_ANCHOR);
  });

  it("applies overrides", () => {
    const a = makeAnchor({ lng0: 10, lat0: -20 });
    expect(a).toEqual({ lng0: 10, lat0: -20 });
  });
});

describe("makePolygon", () => {
  it("returns 4 vertices by default (open ring)", () => {
    const p = makePolygon();
    expect(p).toHaveLength(4);
  });

  it("optionally closes the ring", () => {
    const p = makeRectanglePolygon({ closed: true });
    expect(p).toHaveLength(5);
    expect(p[0]).toEqual(p[4]);
  });

  it("returns an empty array for empty polygon", () => {
    expect(makeEmptyPolygon()).toEqual([]);
  });

  it("origin equals anchor for a default rect", () => {
    const a = makeAnchor();
    const p = makePolygon({ anchor: a });
    expect(p[0]).toEqual({ lng: a.lng0, lat: a.lat0 });
  });
});

describe("makePlacedEquipment", () => {
  it("produces a placed item with required fields", () => {
    const eq = makePlacedEquipment();
    expect(eq.id).toMatch(/^eq-/);
    expect(eq.equipmentSpecId).toBe(FIXTURE_BATTERY_SPEC_ID);
    expect(eq.rotation_deg).toBe(0);
    expect(eq.sourceReliability).toBe("certified_data");
  });

  it("respects overrides without leaking optional fields", () => {
    const eq = makePlacedEquipment({
      id: "fixed-1",
      equipmentSpecId: FIXTURE_PCS_SPEC_ID,
      rotation_deg: 45,
      locked: true,
    });
    expect(eq.id).toBe("fixed-1");
    expect(eq.equipmentSpecId).toBe(FIXTURE_PCS_SPEC_ID);
    expect(eq.rotation_deg).toBe(45);
    expect(eq.locked).toBe(true);
    expect(eq.groupId).toBeUndefined();
  });

  it("makePlacedEquipmentRow generates n distinct items", () => {
    const row = makePlacedEquipmentRow(3);
    expect(row).toHaveLength(3);
    const ids = new Set(row.map((r) => r.id));
    expect(ids.size).toBe(3);
  });
});

describe("makeRegulatoryProfile", () => {
  it("returns a profile with default empty ruleIds", () => {
    const p = makeRegulatoryProfile();
    expect(p.id).toBe("chile-utility-predesign");
    expect(p.ruleIds).toEqual([]);
  });
});

describe("makeBuildReportDataArgs", () => {
  it("returns valid args with all electrical slices nulled", () => {
    const a = makeBuildReportDataArgs();
    expect(a.locale).toBe("es");
    expect(a.polygon).toHaveLength(4);
    expect(a.placed).toEqual([]);
    expect(a.poi).toBeNull();
    expect(a.mainTransformer).toBeNull();
  });
});

describe("presets", () => {
  it("minimalSitePreset has anchor + 4-vertex polygon + 2 placed", () => {
    const p = minimalSitePreset();
    expect(p.polygon).toHaveLength(4);
    expect(p.placed).toHaveLength(2);
  });

  it("largeSyntheticSitePreset produces requested count", () => {
    const p = largeSyntheticSitePreset({ count: 7 });
    expect(p.placed).toHaveLength(7);
  });

  it("bessDelDesiertoPreset returns the real case study", () => {
    const cs = bessDelDesiertoPreset();
    expect(cs).toBeDefined();
    expect(cs.id).toBeDefined();
  });
});
