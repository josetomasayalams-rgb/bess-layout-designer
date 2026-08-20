import { describe, expect, it } from "vitest";
import { createDemoProject, createPublishedDemoProject } from "./demoProject";
import { computeSummary } from "./summaryCalculations";
import { computeWarnings } from "./spacingRules";

describe("createDemoProject", () => {
  it("creates a usable starter BESS layout", () => {
    const demo = createDemoProject();
    const summary = computeSummary(demo.placedEquipment, null);
    const warnings = computeWarnings(
      demo.placedEquipment,
      demo.polygon,
      demo.anchor
    );

    expect(demo.polygon).toHaveLength(4);
    expect(summary.battery_container_count).toBe(16);
    expect(summary.pcs_count).toBe(2);
    expect(summary.total_apparent_power_mva).toBe(10);
    expect(summary.total_energy_mwh_dc_bol).toBeCloseTo(44.032, 6);
    expect(warnings.filter((warning) => warning.severity === "error")).toEqual(
      []
    );
  });

  it("creates the shareable 320-container / 40-PCS 5x8 showcase", () => {
    const demo = createPublishedDemoProject();
    const summary = computeSummary(demo.placedEquipment, null);

    expect(demo.polygon).toHaveLength(4);
    expect(summary.battery_container_count).toBe(320);
    expect(summary.pcs_count).toBe(40);
    expect(demo.lastToolResult.diagnostics.gridColumns).toBe(5);
    expect(demo.lastToolResult.diagnostics.gridRows).toBe(8);
    expect(demo.lastToolResult.diagnostics.terrainFitApplied).toBe(true);
    expect(demo.projectName).toContain("200 MW / 800 MWh");
  });
});
