import { describe, it, expect } from "vitest";
import {
  pendingDatasheetItems,
  pendingItemsBlocking,
  pendingItemsForValue,
} from "@/data/pendingDatasheetItems";

describe("pendingDatasheetItems", () => {
  it("registers a non-empty, structurally valid list of items", () => {
    expect(pendingDatasheetItems.length).toBeGreaterThan(0);
    for (const item of pendingDatasheetItems) {
      expect(item.id).toMatch(/^PEND-/);
      expect(item.equipment).not.toBe("");
      expect(item.title).not.toBe("");
      expect(item.reason).not.toBe("");
      expect(item.blocksValues.length + item.blocksFeatures.length).toBeGreaterThan(0);
    }
  });

  it("has unique IDs", () => {
    const ids = pendingDatasheetItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the critical items called out in plan §614", () => {
    const ids = new Set(pendingDatasheetItems.map((i) => i.id));
    // Each represents one of the eight datasheet gaps identified in the plan.
    expect(ids.has("PEND-ST2752-LAYOUT-GUIDE")).toBe(true);
    expect(ids.has("PEND-ST2752-UL9540A-REPORT")).toBe(true);
    expect(ids.has("PEND-SC5000-MANUAL")).toBe(true);
    expect(ids.has("PEND-PROJECT-CAD-LAYOUT")).toBe(true);
    expect(ids.has("PEND-FIRE-PROJECT-CRITERIA")).toBe(true);
    expect(ids.has("PEND-SSAA-BREAKDOWN")).toBe(true);
    expect(ids.has("PEND-CABLE-SCHEDULE")).toBe(true);
    expect(ids.has("PEND-SWITCHGEAR-REAL")).toBe(true);
  });

  it("pendingItemsBlocking returns items that mention the feature substring", () => {
    const layoutBlockers = pendingItemsBlocking("Optimized auto-layout");
    expect(layoutBlockers.length).toBeGreaterThan(0);
    expect(layoutBlockers.every((i) =>
      i.blocksFeatures.some((f) => /Optimized auto-layout/i.test(f))
    )).toBe(true);
  });

  it("pendingItemsForValue returns items that mention the value substring", () => {
    const trafoBlockers = pendingItemsForValue("transformerCatalog");
    expect(trafoBlockers.length).toBeGreaterThan(0);
  });
});
