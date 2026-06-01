import { describe, expect, it } from "vitest";
import { generateCandidates } from "./smartSiteFitCandidates";
import type { SmartSiteFitPreset } from "./smartSiteFitTypes";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";

/**
 * W29 — a second separate-PCS preset must honor its OWN equipment ids and
 * BESS/PCS ratio instead of silently placing Sungrow equipment.
 *
 * The synthetic preset (custom ids + custom ratioByDuration) is passed straight
 * to the candidate generator because the public engine only resolves the bundled
 * presets by id. With 10 MW target and a 5:1 ratio at 4h, every candidate must
 * carry 2 PCS + 10 BESS of the preset's own specs.
 */
describe("SmartSiteFit preset-driven separate-PCS (W29)", () => {
  const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };
  const largeSquare: LocalPoint[] = [
    { x_m: -150, y_m: -150 },
    { x_m: 150, y_m: -150 },
    { x_m: 150, y_m: 150 },
    { x_m: -150, y_m: 150 },
  ];

  const customPreset: SmartSiteFitPreset = {
    id: "acme-separate-pcs",
    name: "ACME BESS + PCS",
    bessSpecId: "acme-bess-3000",
    pcsSpecId: "acme-pcs-6000",
    bessPerPcs2h: 3,
    bessPerPcs4h: 5,
    defaultDurationHours: 4,
    dataClassification: "preliminary_assumption",
    notes: "Synthetic 2nd separate-PCS preset for testing preset-driven resolution.",
    supportedDurations: [2, 4],
    architecture: "bess_plus_pcs",
    ratioByDuration: { 2: 3, 4: 5 },
    // Intentionally no separatePcsTransformerNote.
  };

  // generateCandidates(polygon, anchor, durationHours, strategy, overrides,
  //   targetMW, targetMWh, maxCandidates, budget, deadlineAt, preset)
  const run = () =>
    generateCandidates(
      largeSquare,
      anchor,
      4,
      "balanced",
      undefined,
      10,
      undefined,
      40,
      undefined,
      undefined,
      customPreset
    );

  it("places the preset's own equipment ids, never Sungrow ids", () => {
    const candidates = run();
    expect(candidates.length).toBeGreaterThan(0);
    const ids = new Set(candidates[0].placedEquipment.map((e) => e.equipmentSpecId));
    expect(ids.has("acme-bess-3000")).toBe(true);
    expect(ids.has("acme-pcs-6000")).toBe(true);
    for (const id of ids) {
      expect(id.startsWith("sungrow-")).toBe(false);
    }
  });

  it("honors the preset's own BESS/PCS ratio (5:1 at 4h, not Sungrow's 8:1)", () => {
    const candidates = run();
    expect(candidates.length).toBeGreaterThan(0);
    const c = candidates[0];
    const bessCount = c.placedEquipment.filter(
      (e) => e.equipmentSpecId === "acme-bess-3000"
    ).length;
    const pcsCount = c.placedEquipment.filter(
      (e) => e.equipmentSpecId === "acme-pcs-6000"
    ).length;
    expect(pcsCount).toBeGreaterThan(0);
    expect(bessCount / pcsCount).toBe(5);
  });

  it("carries the preset's ids and ratio in the candidate assumptions", () => {
    const a = run()[0].assumptions;
    expect(a.find((x) => x.id === "bess-model")?.value).toBe("acme-bess-3000");
    expect(a.find((x) => x.id === "pcs-model")?.value).toBe("acme-pcs-6000");
    expect(a.find((x) => x.id === "bess-pcs-ratio")?.value).toBe("5:1");
  });

  it("does not leak the Sungrow transformer note for a preset without one", () => {
    const messages = run()[0].warnings.map((w) => w.message).join(" | ");
    expect(messages).not.toContain("SC5000UD-MV");
  });
});
