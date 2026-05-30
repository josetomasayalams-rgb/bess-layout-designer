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
});
