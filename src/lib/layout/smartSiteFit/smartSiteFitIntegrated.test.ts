import { describe, expect, it } from "vitest";
import { runSmartSiteFit } from "./smartSiteFitEngine";
import { generateIntegratedCandidates } from "./smartSiteFitIntegratedCandidates";
import { summarizePlacedEquipment } from "./smartSiteFitSizing";
import { TESLA_MEGAPACK_2XL_PRESET } from "./smartSiteFitPresets";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLocal } from "@/lib/geometry/projection";
import type { LngLat, ProjectAnchor } from "@/types/geometry";

const specById = new Map(equipmentCatalog.map((s) => [s.id, s]));
const PCS_TYPE = "pcs_mv_station";

// A generous ~2 km × 2 km terrain so large integrated layouts fit.
const polygon: LngLat[] = [
  { lng: -70.01, lat: -33.01 },
  { lng: -69.99, lat: -33.01 },
  { lng: -69.99, lat: -32.99 },
  { lng: -70.01, lat: -32.99 },
];
const anchor: ProjectAnchor = { lng0: -70.01, lat0: -33.01 };

describe("SmartSiteFit integrated architecture (Tesla Megapack)", () => {
  it("never creates a separate PCS or transformer in the layout", () => {
    const localPolygon = polygon.map((p) => toLocal(p, anchor));
    const candidates = generateIntegratedCandidates(
      localPolygon,
      anchor,
      4,
      "balanced",
      TESLA_MEGAPACK_2XL_PRESET,
      undefined,
      50,
      200
    );
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      for (const item of c.placedEquipment) {
        const spec = specById.get(item.equipmentSpecId);
        // Only integrated battery units; no PCS/MV stations, no transformers.
        expect(spec?.type).toBe("battery_container");
        expect(item.equipmentSpecId).toContain("tesla-megapack");
      }
    }
  });

  it("target sizing reaches the requested power with integrated units only", () => {
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      anchor,
      targetMW: 50,
      targetMWh: 200,
      durationHours: 4,
      strategy: "balanced",
      presetId: TESLA_MEGAPACK_2XL_PRESET.id,
    });

    expect(result.success).toBe(true);
    expect(result.selected).not.toBeNull();

    const placed = result.selected!.placedEquipment;
    const pcsCount = placed.filter(
      (e) => specById.get(e.equipmentSpecId)?.type === PCS_TYPE
    ).length;
    expect(pcsCount).toBe(0);

    const summary = summarizePlacedEquipment(placed);
    // Enough integrated units to meet the requested power (preliminary, rounds up).
    expect(summary.powerMW).toBeGreaterThanOrEqual(50);
    expect(summary.energyMWh).toBeGreaterThan(0);
  });

  it("surfaces the external-transformer warning for integrated presets", () => {
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      anchor,
      targetMW: 20,
      targetMWh: 80,
      durationHours: 4,
      strategy: "balanced",
      presetId: TESLA_MEGAPACK_2XL_PRESET.id,
    });
    const ids = result.warnings.map((w) => w.id);
    expect(ids).toContain("integrated-external-transformer");
  });

  it("Sungrow remains unaffected (default preset still builds BESS + PCS)", () => {
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      anchor,
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });
    const placed = result.selected!.placedEquipment;
    const pcsCount = placed.filter(
      (e) => specById.get(e.equipmentSpecId)?.type === PCS_TYPE
    ).length;
    expect(pcsCount).toBeGreaterThan(0);
  });

  it("assigns a distinct block id per grid row (not one shared block)", () => {
    const localPolygon = polygon.map((p) => toLocal(p, anchor));
    const candidates = generateIntegratedCandidates(
      localPolygon,
      anchor,
      4,
      "balanced",
      TESLA_MEGAPACK_2XL_PRESET,
      undefined,
      50,
      200
    );
    const multiRow = candidates.find((c) => (c.shape?.rows ?? 0) > 1);
    expect(multiRow).toBeDefined();

    const blockIds = new Set(multiRow!.placedEquipment.map((e) => e.blockId));
    // One block id per populated row, never a single "integrated-block".
    expect(blockIds.size).toBe(multiRow!.shape?.rows);
    expect(blockIds.has("integrated-block")).toBe(false);

    for (const item of multiRow!.placedEquipment) {
      expect(item.blockId).toMatch(/^integrated-row-\d+$/);
      expect(item.groupId).toBe(item.blockId);
      expect(item.blockId).toBe(`integrated-row-${item.blockIndex}`);
    }
  });

  it("honors an explicit single_row shape preference", () => {
    const localPolygon = polygon.map((p) => toLocal(p, anchor));
    const candidates = generateIntegratedCandidates(
      localPolygon,
      anchor,
      4,
      "balanced",
      TESLA_MEGAPACK_2XL_PRESET,
      { preferredShapeKind: "single_row" },
      5,
      20
    );
    expect(candidates.length).toBeGreaterThan(0);
    for (const c of candidates) {
      expect(c.shape?.kind).toBe("single_row");
      expect(c.shape?.rows).toBe(1);
      // A single row collapses to exactly one block.
      const blockIds = new Set(c.placedEquipment.map((e) => e.blockId));
      expect(blockIds.size).toBe(1);
    }
  });

  it("expresses wider grids with more columns than deeper grids for the same target", () => {
    const localPolygon = polygon.map((p) => toLocal(p, anchor));
    const wide = generateIntegratedCandidates(
      localPolygon,
      anchor,
      4,
      "balanced",
      TESLA_MEGAPACK_2XL_PRESET,
      { preferredShapeKind: "wide_grid" },
      60,
      300
    );
    const deep = generateIntegratedCandidates(
      localPolygon,
      anchor,
      4,
      "balanced",
      TESLA_MEGAPACK_2XL_PRESET,
      { preferredShapeKind: "deep_grid" },
      60,
      300
    );
    expect(wide.length).toBeGreaterThan(0);
    expect(deep.length).toBeGreaterThan(0);
    const wideCols = wide[0]?.shape?.columns ?? 0;
    const deepCols = deep[0]?.shape?.columns ?? 0;
    expect(wideCols).toBeGreaterThan(deepCols);
  });
});
