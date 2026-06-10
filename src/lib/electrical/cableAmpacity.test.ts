import { describe, expect, it } from "vitest";
import {
  deriveCorrectedAmpacity,
  MV_REFERENCE_CABLE_AMPACITY_A,
  MV_REFERENCE_DERATING,
  NEXANS_NA2XS2Y_630_BASE_A,
  mvReferenceCableAmpacity,
} from "@/lib/electrical/cableAmpacity";

describe("cableAmpacity — IEC 60287 derating", () => {
  it("applies the product of derating factors to the base ampacity", () => {
    expect(deriveCorrectedAmpacity(577, { ambient: 1, grouping: 0.8, soil: 1 })).toBeCloseTo(
      461.6,
      1
    );
    expect(deriveCorrectedAmpacity(845, { ambient: 0.9, grouping: 0.85, soil: 0.95 })).toBeCloseTo(
      614.1,
      1
    );
  });

  it("a unit derating returns the base unchanged", () => {
    expect(deriveCorrectedAmpacity(500, { ambient: 1, grouping: 1, soil: 1 })).toBe(500);
  });

  it("the MV reference ampacity is the derived value, not a bare assumption", () => {
    const expected = Math.round(
      deriveCorrectedAmpacity(
        NEXANS_NA2XS2Y_630_BASE_A.buriedDirectTrefoil20C,
        MV_REFERENCE_DERATING
      )
    );
    expect(MV_REFERENCE_CABLE_AMPACITY_A).toBe(expected);
    expect(MV_REFERENCE_CABLE_AMPACITY_A).toBe(462);
  });

  it("stays within ~1% of the prior 460 A conservative screening value", () => {
    expect(Math.abs(MV_REFERENCE_CABLE_AMPACITY_A - 460) / 460).toBeLessThan(0.01);
  });

  it("the reference value is classified as derived and the base as documented", () => {
    expect(mvReferenceCableAmpacity.referenceAmpacityA.evidence[0].confidence).toBe("derived");
    expect(mvReferenceCableAmpacity.referenceAmpacityA.value).toBe(MV_REFERENCE_CABLE_AMPACITY_A);
    expect(mvReferenceCableAmpacity.baseAmpacityA.evidence[0].confidence).toBe("documented");
    expect(mvReferenceCableAmpacity.baseAmpacityA.evidence[0].documentId).toBe(
      "NEXANS-NA2XS2Y-19-33"
    );
  });
});
