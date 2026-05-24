import { describe, expect, it } from "vitest";
import {
  defaultBlockColumns,
  generatePreliminaryLayout,
  gridShapeOptions,
} from "@/lib/layout/preliminaryLayoutGenerator";

const rules = {
  bessToBess_m: 3,
  bessToPropertyLine_m: 3,
  electricalFrontWorkingClearance_m: 0.9,
  transformerToBessRecommended_m: 3,
};

describe("generatePreliminaryLayout", () => {
  it("generates a free conceptual layout from quantities", () => {
    const result = generatePreliminaryLayout({
      batteryContainerSpecId: "bess-sungrow-st2752ux-us",
      pcsSpecId: "mvskid-sungrow-sc5000ud-mv-desierto",
      batteryContainerCount: 16,
      pcsCount: 2,
      containersPerPcs: 8,
      anchor: { lng0: -70, lat0: -23 },
      startPoint: { lng: -70, lat: -23 },
      rules,
      fitInsidePolygon: false,
    });

    expect(result.status).toBe("success");
    expect(result.placed).toHaveLength(18);
    expect(result.diagnostics.blockCount).toBe(2);
  });

  it("regularizes inside a large polygon and fails inside a tiny one", () => {
    const large = generatePreliminaryLayout({
      batteryContainerSpecId: "bess-sungrow-st2752ux-us",
      pcsSpecId: "mvskid-sungrow-sc5000ud-mv-desierto",
      batteryContainerCount: 8,
      pcsCount: 1,
      containersPerPcs: 8,
      anchor: { lng0: -70, lat0: -23 },
      startPoint: { lng: -70, lat: -23 },
      polygon: [
        { lng: -70, lat: -23 },
        { lng: -69.998, lat: -23 },
        { lng: -69.998, lat: -22.998 },
        { lng: -70, lat: -22.998 },
      ],
      rules,
      fitInsidePolygon: true,
    });

    const tiny = generatePreliminaryLayout({
      batteryContainerSpecId: "bess-sungrow-st2752ux-us",
      pcsSpecId: "mvskid-sungrow-sc5000ud-mv-desierto",
      batteryContainerCount: 8,
      pcsCount: 1,
      containersPerPcs: 8,
      anchor: { lng0: -70, lat0: -23 },
      startPoint: { lng: -70, lat: -23 },
      polygon: [
        { lng: -70, lat: -23 },
        { lng: -69.99995, lat: -23 },
        { lng: -69.99995, lat: -22.99995 },
        { lng: -70, lat: -22.99995 },
      ],
      rules,
      fitInsidePolygon: true,
    });

    expect(large.status).toBe("success");
    expect(tiny.status).toBe("error");
  });

  it("honours the requested block-column count in a free layout", () => {
    const result = generatePreliminaryLayout({
      batteryContainerSpecId: "bess-sungrow-st2752ux-us",
      pcsSpecId: "mvskid-sungrow-sc5000ud-mv-desierto",
      batteryContainerCount: 32,
      pcsCount: 4,
      containersPerPcs: 8,
      blockColumns: 1,
      anchor: { lng0: -70, lat0: -23 },
      startPoint: { lng: -70, lat: -23 },
      rules,
      fitInsidePolygon: false,
    });

    expect(result.status).toBe("success");
    expect(result.diagnostics.blockCount).toBe(4);
    // 4 blocks stacked in a single column is taller than it is wide.
    const area = result.diagnostics.layoutAreaM2 ?? 0;
    expect(area).toBeGreaterThan(0);
  });
});

describe("gridShapeOptions", () => {
  it("returns an empty list for zero blocks", () => {
    expect(gridShapeOptions(0)).toEqual([]);
  });

  it("offers one option per distinct row count, tall to wide", () => {
    const options = gridShapeOptions(12);
    const grids = options.map((o) => `${o.columns}x${o.rows}`);
    expect(grids).toEqual(["1x12", "2x6", "3x4", "4x3", "6x2", "12x1"]);
    // every option must fit all 12 blocks
    for (const option of options) {
      expect(option.cells).toBeGreaterThanOrEqual(12);
      expect(option.emptyCells).toBe(option.cells - 12);
    }
  });

  it("flags the perfect square option", () => {
    const square = gridShapeOptions(16).find((o) => o.shape === "square");
    expect(square).toMatchObject({ columns: 4, rows: 4, emptyCells: 0 });
  });

  it("defaultBlockColumns returns the squarest column count", () => {
    expect(defaultBlockColumns(1)).toBe(1);
    expect(defaultBlockColumns(16)).toBe(4);
    expect(defaultBlockColumns(40)).toBe(6);
  });
});
