import { describe, expect, it } from "vitest";
import { createBessBlockTemplate } from "@/lib/layout/blockTemplates";

const bessFootprint = { length_m: 9.34, width_m: 1.73 };
const stationFootprint = { length_m: 6.058, width_m: 2.438 };

describe("createBessBlockTemplate", () => {
  it("creates a horizontal 8-container block plus one conversion station", () => {
    const template = createBessBlockTemplate({
      bessFootprint,
      stationFootprint,
      containersPerBlock: 8,
      bessSpacingM: 3,
      stationGapM: 6,
      orientation: "horizontal",
    });

    expect(template.orientation).toBe("horizontal");
    expect(template.containerColumns).toBe(4);
    expect(template.containerRows).toBe(2);
    expect(template.items.filter((item) => item.role === "battery_container"))
      .toHaveLength(8);
    expect(template.items.filter((item) => item.role === "conversion_station"))
      .toHaveLength(1);
    expect(template.widthM).toBeGreaterThan(template.heightM);
    expect(template.items.every((item) => item.rotation_deg === 0)).toBe(true);
  });

  it("creates a vertical rotated block without changing item count", () => {
    const horizontal = createBessBlockTemplate({
      bessFootprint,
      stationFootprint,
      containersPerBlock: 8,
      bessSpacingM: 3,
      stationGapM: 6,
      orientation: "horizontal",
    });
    const vertical = createBessBlockTemplate({
      bessFootprint,
      stationFootprint,
      containersPerBlock: 8,
      bessSpacingM: 3,
      stationGapM: 6,
      orientation: "vertical",
    });

    expect(vertical.orientation).toBe("vertical");
    expect(vertical.items).toHaveLength(horizontal.items.length);
    expect(vertical.widthM).toBeCloseTo(horizontal.heightM, 6);
    expect(vertical.heightM).toBeCloseTo(horizontal.widthM, 6);
    expect(vertical.items.every((item) => item.rotation_deg === 90)).toBe(true);
  });

  it("supports partial blocks", () => {
    const template = createBessBlockTemplate({
      bessFootprint,
      stationFootprint,
      containersPerBlock: 3,
      bessSpacingM: 3,
      stationGapM: 6,
    });

    expect(template.items.filter((item) => item.role === "battery_container"))
      .toHaveLength(3);
    expect(template.containerColumns).toBe(3);
    expect(template.containerRows).toBe(1);
  });

  it("throws on invalid equipment dimensions", () => {
    expect(() =>
      createBessBlockTemplate({
        bessFootprint: { length_m: 0, width_m: 1 },
        stationFootprint,
        containersPerBlock: 8,
        bessSpacingM: 3,
        stationGapM: 6,
      })
    ).toThrow("bessFootprint.length_m");
  });
});
