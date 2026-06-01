import { describe, expect, it } from "vitest";
import type {
  SmartSiteFitOverrides,
  SmartSiteFitManualLayoutSpec,
} from "./smartSiteFitTypes";

describe("SmartSiteFit Types and Specifications", () => {
  it("should accept an empty override as valid", () => {
    const overrides: SmartSiteFitOverrides = {};
    expect(overrides).toBeDefined();
    expect(overrides.layoutMode).toBeUndefined();
  });

  it("should accept layoutMode 'auto'", () => {
    const overrides: SmartSiteFitOverrides = {
      layoutMode: "auto",
    };
    expect(overrides.layoutMode).toBe("auto");
  });

  it("should accept layoutMode 'manual'", () => {
    const overrides: SmartSiteFitOverrides = {
      layoutMode: "manual",
    };
    expect(overrides.layoutMode).toBe("manual");
  });

  it("should accept manual overrides with layout parameter keys", () => {
    const overrides: SmartSiteFitOverrides = {
      layoutMode: "manual",
      manualShapeKind: "two_row_block",
      containersWide: 4,
      containersLong: 8,
      rowsPerGroup: 2,
      groupCount: 3,
      groupSeparation_m: 5.5,
      rowSeparation_m: 3.0,
    };

    expect(overrides.manualShapeKind).toBe("two_row_block");
    expect(overrides.containersWide).toBe(4);
    expect(overrides.containersLong).toBe(8);
    expect(overrides.rowsPerGroup).toBe(2);
    expect(overrides.groupCount).toBe(3);
    expect(overrides.groupSeparation_m).toBe(5.5);
    expect(overrides.rowSeparation_m).toBe(3.0);
  });

  it("should construct a SmartSiteFitManualLayoutSpec with partial parameters", () => {
    const spec: SmartSiteFitManualLayoutSpec = {
      shapeKind: "compact_grid",
      containersWide: 10,
      groupCount: 2,
    };

    expect(spec.shapeKind).toBe("compact_grid");
    expect(spec.containersWide).toBe(10);
    expect(spec.groupCount).toBe(2);
    expect(spec.containersLong).toBeUndefined();
    expect(spec.rowsPerGroup).toBeUndefined();
  });

  it("should verify current automatic design strategy does not require manual layout fields", () => {
    // Current auto layout modes should not require manual layout fields and compile cleanly
    const legacyOverrides: SmartSiteFitOverrides = {
      preferredShapeKind: "single_row",
      bessToBess_m: 3,
    };
    expect(legacyOverrides.preferredShapeKind).toBe("single_row");
    expect(legacyOverrides.bessToBess_m).toBe(3);
    expect(legacyOverrides.layoutMode).toBeUndefined();
  });
});
