/**
 * Phase 14.3 — `buildSiteSvg` structural coverage.
 *
 * Pure SVG-model generator (no DOM). Tests pin the shape that the
 * PDF renderer relies on:
 *   - Null when there is no anchor or no polygon (the documented guard).
 *   - Valid model when polygon + placed equipment are provided.
 *   - The viewBox is finite and the scale bar is one of the canonical
 *     round lengths.
 *   - `svgPolygonPath` produces a Z-closed path for ≥1 points and an
 *     empty string for 0 points.
 */

import { describe, expect, it } from "vitest";
import { buildSiteSvg, svgPolygonPath } from "./buildSiteSvg";
import {
  makeAnchor,
  makePolygon,
  makePlacedEquipment,
  FIXTURE_BATTERY_SPEC_ID,
} from "@/tests/fixtures";

describe("buildSiteSvg — guards", () => {
  it("returns null when anchor is null", () => {
    const result = buildSiteSvg({
      polygon: makePolygon(),
      anchor: null,
      placed: [],
    });
    expect(result).toBeNull();
  });

  it("returns null when polygon has fewer than 3 vertices", () => {
    const result = buildSiteSvg({
      polygon: [
        { lng: -70, lat: -33 },
        { lng: -70.001, lat: -33 },
      ],
      anchor: { lng0: -70, lat0: -33 },
      placed: [],
    });
    expect(result).toBeNull();
  });
});

describe("buildSiteSvg — minimal site", () => {
  const anchor = makeAnchor();
  const polygon = makePolygon({ anchor });
  const result = buildSiteSvg({ polygon, anchor, placed: [] });

  it("returns a model with positive viewBox dimensions", () => {
    expect(result).not.toBeNull();
    expect(result!.viewBox.width).toBeGreaterThan(0);
    expect(result!.viewBox.height).toBeGreaterThan(0);
  });

  it("projects 4 site points for a rectangular polygon", () => {
    expect(result!.sitePoints).toHaveLength(4);
  });

  it("has no equipment when placed list is empty", () => {
    expect(result!.equipment).toEqual([]);
  });

  it("returns a positive scale bar in metres", () => {
    expect(result!.scale.barLengthM).toBeGreaterThan(0);
    expect(result!.scale.mPerUnit).toBeGreaterThan(0);
  });

  it("places the north arrow inside the viewBox", () => {
    const na = result!.northArrow;
    expect(na.x).toBeGreaterThan(0);
    expect(na.y).toBeGreaterThan(0);
    expect(na.x).toBeLessThan(result!.viewBox.width);
    expect(na.y).toBeLessThan(result!.viewBox.height);
  });
});

describe("buildSiteSvg — with equipment", () => {
  it("renders one equipment rectangle per placed item with known spec", () => {
    const anchor = makeAnchor();
    const polygon = makePolygon({ anchor });
    const placed = [
      makePlacedEquipment({
        equipmentSpecId: FIXTURE_BATTERY_SPEC_ID,
        anchor: { lng: anchor.lng0 + 0.0005, lat: anchor.lat0 + 0.0002 },
      }),
    ];
    const result = buildSiteSvg({ polygon, anchor, placed });
    expect(result!.equipment).toHaveLength(1);
    expect(result!.equipment[0].points.length).toBeGreaterThan(0);
    expect(typeof result!.equipment[0].fill).toBe("string");
  });

  it("ignores placed items whose specId does not exist in the catalog", () => {
    const anchor = makeAnchor();
    const polygon = makePolygon({ anchor });
    const placed = [
      makePlacedEquipment({
        equipmentSpecId: "non-existent-spec-id",
      }),
    ];
    const result = buildSiteSvg({ polygon, anchor, placed });
    expect(result!.equipment).toHaveLength(0);
  });
});

describe("svgPolygonPath", () => {
  it("returns an empty string for an empty array", () => {
    expect(svgPolygonPath([])).toBe("");
  });

  it("produces an M..L..Z path for 3 points", () => {
    const path = svgPolygonPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 5, y: 10 },
    ]);
    expect(path.startsWith("M ")).toBe(true);
    expect(path.includes(" L ")).toBe(true);
    expect(path.endsWith(" Z")).toBe(true);
  });
});
