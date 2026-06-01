import { describe, expect, it } from "vitest";
import { buildManualSungrowLayout, buildManualTeslaLayout } from "./smartSiteFitManual";

describe("buildManualSungrowLayout", () => {
  it("should successfully build a basic 4h layout (ratio 8:1)", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 8,
      pcsCount: 2,
    });

    expect(result.items).toHaveLength(18); // 16 BESS + 2 PCS

    const bessItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-st2752ux-us");
    const pcsItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");

    expect(bessItems).toHaveLength(16);
    expect(pcsItems).toHaveLength(2);
    expect(result.meta.bessCount).toBe(16);
    expect(result.meta.pcsCount).toBe(2);
  });

  it("should successfully build a basic 2h layout (ratio 4:1)", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 4,
      pcsCount: 3,
    });

    expect(result.items).toHaveLength(15); // 12 BESS + 3 PCS

    const bessItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-st2752ux-us");
    const pcsItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");

    expect(bessItems).toHaveLength(12);
    expect(pcsItems).toHaveLength(3);
  });

  it("should successfully build a basic 8h layout (ratio 16:1)", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 16,
      pcsCount: 1,
    });

    expect(result.items).toHaveLength(17); // 16 BESS + 1 PCS

    const bessItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-st2752ux-us");
    const pcsItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");

    expect(bessItems).toHaveLength(16);
    expect(pcsItems).toHaveLength(1);
  });

  it("should successfully build a basic 16h layout (ratio 32:1)", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 32,
      pcsCount: 1,
    });

    expect(result.items).toHaveLength(33); // 32 BESS + 1 PCS

    const bessItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-st2752ux-us");
    const pcsItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");

    expect(bessItems).toHaveLength(32);
    expect(pcsItems).toHaveLength(1);
  });

  it("should respect containersWide and containersLong grid parameters", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 8,
      pcsCount: 1,
      containersWide: 4,
      containersLong: 2,
    });

    const bessItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-st2752ux-us");
    const pcsItem = result.items.find((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");

    expect(bessItems).toHaveLength(8);
    expect(pcsItem).toBeDefined();

    // Verify PCS is close to block (BESS right edge is around ~20-25m from origin, PCS should be nearby)
    // Centroid of all is at (0,0). So BESS coords range and PCS coord range should be tight
    const xCoords = result.items.map((i) => i.x_m);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    
    // Total block width is W_bess (~46m) + bessToPcs (3m) + pcsLength (~6m) = ~55m
    // The center-to-center span from first BESS to PCS is ~47.7m
    expect(maxX - minX).toBeCloseTo(47.719, 1);
  });

  it("should arrange blocks into distinct groups", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 4,
      pcsCount: 4,
      groupCount: 2,
      rowsPerGroup: 2,
      groupSeparation_m: 10.0,
      rowSeparation_m: 8.0,
    });

    // 4 blocks in a 2x2 grid
    // Col 0, Row 0; Col 1, Row 0; Col 0, Row 1; Col 1, Row 1
    expect(result.items).toHaveLength(20); // 16 BESS + 4 PCS
    expect(result.meta.groupCount).toBe(2);
    expect(result.meta.rowsPerGroup).toBe(2);

    // Verify spacing between groups (blockCol = 0 vs blockCol = 1) is larger than internal separations
    const pcsItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");
    expect(pcsItems).toHaveLength(4);
  });

  it("should gracefully normalize invalid or negative input values", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 8,
      pcsCount: 1,
      containersWide: 0,
      containersLong: -5,
      groupCount: 0,
      rowsPerGroup: -1,
    });

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.meta.containersWide).toBe(1);
    expect(result.meta.containersLong).toBe(8);
    expect(result.meta.groupCount).toBe(1);
    expect(result.meta.rowsPerGroup).toBe(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("should not create separate external transformers", () => {
    const result = buildManualSungrowLayout({
      containersPerPcs: 8,
      pcsCount: 2,
    });

    // Verify no transformers exist in the spec IDs
    const transformers = result.items.filter((item) => item.equipmentSpecId.includes("transformer"));
    expect(transformers).toHaveLength(0);

    // PCS is present and is the SC5000UD station
    const pcsItems = result.items.filter((item) => item.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");
    expect(pcsItems).toHaveLength(2);
  });
});

describe("buildManualTeslaLayout", () => {
  it("should successfully build a 2h Tesla layout", () => {
    const result = buildManualTeslaLayout({
      bessCount: 10,
      durationHours: 2,
    });

    expect(result.items).toHaveLength(10);
    expect(result.meta.bessCount).toBe(10);
    expect(result.meta.pcsCount).toBe(0);
    expect(result.meta.architecture).toBe("integrated");

    // All items should be Megapack 2 XL 2h
    const megapacks = result.items.filter((item) => item.equipmentSpecId === "bess-tesla-megapack-2xl-2h");
    expect(megapacks).toHaveLength(10);
  });

  it("should successfully build a 4h Tesla layout", () => {
    const result = buildManualTeslaLayout({
      bessCount: 15,
      durationHours: 4,
    });

    expect(result.items).toHaveLength(15);
    expect(result.meta.bessCount).toBe(15);
    expect(result.meta.pcsCount).toBe(0);

    // All items should be Megapack 2 XL 4h
    const megapacks = result.items.filter((item) => item.equipmentSpecId === "bess-tesla-megapack-2xl-4h");
    expect(megapacks).toHaveLength(15);
  });

  it("should respect grid dimensions and arrange in blocks", () => {
    const result = buildManualTeslaLayout({
      bessCount: 8,
      durationHours: 4,
      containersWide: 4,
      containersLong: 2,
      groupCount: 1,
      rowsPerGroup: 1,
    });

    expect(result.items).toHaveLength(8);
    expect(result.meta.containersWide).toBe(4);
    expect(result.meta.containersLong).toBe(2);
    expect(result.meta.groupCount).toBe(1);
    expect(result.meta.rowsPerGroup).toBe(1);

    // Centroid of all is at (0,0)
    // The width of the block is 4 * (8.8 + 3.0) - 3.0 = 44.2m
    // The height of the block is 2 * (1.65 + 3.0) - 3.0 = 6.3m
    // Span from min to max coordinates
    const xCoords = result.items.map((i) => i.x_m);
    const yCoords = result.items.map((i) => i.y_m);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    // Center-to-center span along X: 3 * (8.8 + 3.0) = 35.4m
    expect(maxX - minX).toBeCloseTo(35.4, 1);
    // Center-to-center span along Y: 1 * (1.65 + 3.0) = 4.65m
    expect(maxY - minY).toBeCloseTo(4.65, 1);
  });

  it("should divide blocks using groupCount", () => {
    const result = buildManualTeslaLayout({
      bessCount: 8,
      durationHours: 4,
      containersWide: 2,
      containersLong: 2,
      groupCount: 2,
      rowsPerGroup: 1,
      groupSeparation_m: 10.0,
    });

    expect(result.items).toHaveLength(8);
    expect(result.meta.groupCount).toBe(2);
    expect(result.meta.rowsPerGroup).toBe(1);

    // Two blocks horizontally. Block capacity is 2x2 = 4 containers.
    // Block 0: items with blockIndex 0 (4 items)
    // Block 1: items with blockIndex 1 (4 items)
    const block0 = result.items.filter((item) => item.blockIndex === 0);
    const block1 = result.items.filter((item) => item.blockIndex === 1);

    expect(block0).toHaveLength(4);
    expect(block1).toHaveLength(4);
  });

  it("should normalize invalid arguments and auto-increase layout capacity if needed", () => {
    const result = buildManualTeslaLayout({
      bessCount: 12,
      durationHours: 4,
      containersWide: 0,
      groupCount: -1,
      containersLong: 2,
      rowsPerGroup: 1, // capacity of 1x1 block of 1x2 BESS = 2 BESS, but we need 12
    });

    expect(result.items).toHaveLength(12);
    expect(result.meta.containersWide).toBe(1); // normalized
    expect(result.meta.groupCount).toBe(1); // normalized
    expect(result.meta.containersLong).toBe(2);
    // Capacity check should increase rowsPerGroup to 6 blocks to fit 12 BESS
    expect(result.meta.rowsPerGroup).toBe(6);

    const warnIds = result.warnings.map((w) => w.id);
    expect(warnIds).toContain("manual-layout-adjusted-counts");
  });

  it("should include external-transformer and integrated warnings", () => {
    const result = buildManualTeslaLayout({
      bessCount: 4,
      durationHours: 4,
    });

    const warnIds = result.warnings.map((w) => w.id);
    expect(warnIds).toContain("integrated-external-transformer");
    expect(warnIds).toContain("integrated-no-separate-pcs");
  });

  it("should set certified_data assumptions for Tesla", () => {
    const result = buildManualTeslaLayout({
      bessCount: 4,
      durationHours: 4,
    });

    const bessAss = result.assumptions.find((a) => a.id === "bess-model");
    const pcsAss = result.assumptions.find((a) => a.id === "pcs-model");

    expect(bessAss).toBeDefined();
    expect(bessAss?.value).toBe("bess-tesla-megapack-2xl-4h");
    expect(bessAss?.classification).toBe("certified_data");

    expect(pcsAss).toBeDefined();
    expect(pcsAss?.value).toBe("integrated");
    expect(pcsAss?.classification).toBe("certified_data");
  });
});

