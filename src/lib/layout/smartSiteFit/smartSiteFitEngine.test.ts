import { describe, expect, it } from "vitest";
import { runSmartSiteFit } from "./smartSiteFitEngine";
import type { LngLat } from "@/types/geometry";

describe("SmartSiteFit Engine", () => {
  const polygon: LngLat[] = [
    { lng: -70.001, lat: -33.001 },
    { lng: -69.999, lat: -33.001 },
    { lng: -69.999, lat: -32.999 },
    { lng: -70.001, lat: -32.999 },
  ];

  it("should fail gracefully with warning if polygon is missing", () => {
    const result = runSmartSiteFit({
      mode: "terrain",
      durationHours: 4,
    });
    expect(result.success).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].id).toBe("missing-polygon");
  });

  it("should fail gracefully with warning if polygon is too small / invalid", () => {
    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: [{ lng: -70, lat: -33 }],
      durationHours: 4,
    });
    expect(result.success).toBe(false);
    expect(result.fallbackUsed).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].id).toBe("invalid-polygon");
  });

  it("should run target sizing mode successfully and produce correct BESS to PCS ratios", () => {
    const result8 = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 5,
      targetMWh: 40,
      durationHours: 8,
      strategy: "balanced",
    });

    expect(result8.success).toBe(true);
    expect(result8.fallbackUsed).toBe(false);
    expect(result8.selected).not.toBeNull();
    const bess8 = result8.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;
    const pcs8 = result8.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3").length;
    expect(bess8 / pcs8).toBe(16);

    const result16 = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 5,
      targetMWh: 80,
      durationHours: 16,
      strategy: "balanced",
    });

    expect(result16.success).toBe(true);
    const bess16 = result16.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;
    const pcs16 = result16.selected!.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3").length;
    expect(bess16 / pcs16).toBe(32);
  });

  it("should surface multiple distinct target-mode alternatives (R5 diversity), best leading", () => {
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 50,
      targetMWh: 200,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.selected).not.toBeNull();

    // Was always a single alternative before R5; now 8–12 are offered. This
    // terrain is roomy enough that the floor (8) is comfortably met.
    expect(result.candidates.length).toBeGreaterThanOrEqual(8);
    expect(result.candidates.length).toBeLessThanOrEqual(12);

    // The pre-selected alternative is the first (best-scoring) candidate.
    expect(result.candidates[0].id).toBe(result.selected!.id);

    // Alternatives are genuinely distinct layout families, not near-duplicates.
    const families = result.candidates.map((c) => c.shape?.kind);
    expect(new Set(families).size).toBeGreaterThan(1);
  });

  it("should run terrain sizing mode successfully", () => {
    const result = runSmartSiteFit({
      mode: "terrain",
      polygon,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.fallbackUsed).toBe(false);
    expect(result.selected).not.toBeNull();
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.candidates.length).toBeLessThanOrEqual(3); // Up to 3 alternatives
  });

  it("should produce distinct alternatives (different sizes) on a large terrain", () => {
    // ~250 m square — large enough for the three strategies to diverge.
    const largeSquare: LngLat[] = [
      { lng: -70.00135, lat: -33.00112 },
      { lng: -69.99865, lat: -33.00112 },
      { lng: -69.99865, lat: -32.99888 },
      { lng: -70.00135, lat: -32.99888 },
    ];

    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: largeSquare,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.candidates.length).toBeGreaterThanOrEqual(2);

    // Every returned alternative must have a distinct BESS/PCS size combination.
    const sizeKeys = result.candidates.map((c) => {
      const bess = c.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;
      const pcs = c.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3").length;
      return `${bess}-${pcs}`;
    });
    expect(new Set(sizeKeys).size).toBe(sizeKeys.length);
  }, 20000);

  it("should degrade gracefully on a tiny terrain (reduced capacity, no crash)", () => {
    // ~30 m square — only a small capacity should fit.
    const tinySquare: LngLat[] = [
      { lng: -70.00016, lat: -33.000135 },
      { lng: -69.99984, lat: -33.000135 },
      { lng: -69.99984, lat: -32.999865 },
      { lng: -70.00016, lat: -32.999865 },
    ];

    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: tinySquare,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    if (result.selected) {
      const bess = result.selected.placedEquipment.filter(
        (e) => e.equipmentSpecId === "sungrow-st2752ux-us"
      ).length;
      // A 30 m site cannot hold a large park; capacity must stay small.
      expect(bess).toBeLessThan(40);
    } else {
      expect(result.fallbackUsed).toBe(true);
    }
  }, 20000);

  it("should avoid a single absurd row for a large 320 BESS / 40 PCS park and keep PCS near their clusters", () => {
    // 4h => 8:1 ratio. 40 PCS * 5 MW = 200 MW, 320 BESS * 2.752 = ~880 MWh.
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      targetMW: 200,
      targetMWh: 880,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.selected).not.toBeNull();
    const selected = result.selected!;

    const bess = selected.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us");
    const pcs = selected.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");
    expect(bess.length / pcs.length).toBe(8);
    expect(pcs.length).toBeGreaterThanOrEqual(40);

    // Must not collapse into a single long row.
    expect(selected.shape?.kind).not.toBe("single_row");

    // Each PCS must share a block with BESS (integrated cluster, not a detached wall).
    for (const p of pcs) {
      expect(p.blockId).toBeDefined();
      const sameBlockBess = bess.filter((b) => b.blockId === p.blockId);
      expect(sameBlockBess.length).toBeGreaterThan(0);
    }
  }, 30000);

  const countBess = (c: { placedEquipment: { equipmentSpecId: string }[] }) =>
    c.placedEquipment.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;

  it("should group terrain alternatives by strategy and rank compact densest", () => {
    // ~250 m square — large enough for three distinct strategies.
    const largeSquare: LngLat[] = [
      { lng: -70.00135, lat: -33.00112 },
      { lng: -69.99865, lat: -33.00112 },
      { lng: -69.99865, lat: -32.99888 },
      { lng: -70.00135, lat: -32.99888 },
    ];

    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: largeSquare,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    expect(result.candidates.length).toBe(3);

    // One alternative per strategy id (grouped, not top-3 global of one strategy).
    const strategies = new Set(result.candidates.map((c) => c.strategy));
    expect(strategies.has("max_capacity")).toBe(true);
    expect(strategies.has("balanced")).toBe(true);
    expect(strategies.has("conservative")).toBe(true);

    const byStrategy = (s: string) => result.candidates.find((c) => c.strategy === s)!;
    const compact = countBess(byStrategy("max_capacity"));
    const balanced = countBess(byStrategy("balanced"));
    const conservative = countBess(byStrategy("conservative"));

    // Compact packs the densest, conservative the loosest, balanced in between.
    expect(compact).toBeGreaterThan(balanced);
    expect(balanced).toBeGreaterThan(conservative);
  }, 30000);

  it("should explain when a small terrain admits fewer than three distinct alternatives", () => {
    // ~30 m square — strategies collapse to one or two distinct sizes.
    const tinySquare: LngLat[] = [
      { lng: -70.00016, lat: -33.000135 },
      { lng: -69.99984, lat: -33.000135 },
      { lng: -69.99984, lat: -32.999865 },
      { lng: -70.00016, lat: -32.999865 },
    ];

    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: tinySquare,
      durationHours: 4,
      strategy: "balanced",
    });

    expect(result.success).toBe(true);
    if (result.candidates.length < 3) {
      expect(
        result.warnings.some((w) => w.id === "limited-terrain-alternatives")
      ).toBe(true);
    }
  }, 20000);

  it("should honor bessCount / pcsCount overrides when recalculating a terrain alternative", () => {
    const largeSquare: LngLat[] = [
      { lng: -70.00135, lat: -33.00112 },
      { lng: -69.99865, lat: -33.00112 },
      { lng: -69.99865, lat: -32.99888 },
      { lng: -70.00135, lat: -32.99888 },
    ];

    // pcsCount pins the block count: 4h => 8:1, so 5 PCS => 40 BESS.
    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: largeSquare,
      durationHours: 4,
      strategy: "balanced",
      overrides: { pcsCount: 5 },
    });

    expect(result.success).toBe(true);
    expect(result.selected).not.toBeNull();
    const pcs = result.selected!.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3"
    ).length;
    const bess = countBess(result.selected!);
    expect(pcs).toBe(5);
    expect(bess).toBe(40);
  }, 20000);
});
