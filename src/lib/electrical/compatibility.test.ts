import { describe, expect, it } from "vitest";
import {
  bessDelDesiertoBlocks,
  bessDelDesiertoCaseStudy,
  bessDelDesiertoConversionStations,
  bessDelDesiertoInconsistencies,
  bessDelDesiertoMVBuses,
  bessDelDesiertoMVFeeders,
  bessDelDesiertoPOI,
} from "@/data/projectCaseStudies";
import {
  evaluateCaseStudyCompatibility,
  evaluateProjectElectricalArchitecture,
} from "@/lib/electrical/compatibility";
import { calculateCaseStudySizing } from "@/lib/sizing/preliminarySizing";

describe("evaluateCaseStudyCompatibility", () => {
  it("keeps the known voltage contradiction visible", () => {
    const sizing = calculateCaseStudySizing(bessDelDesiertoCaseStudy);
    const issues = evaluateCaseStudyCompatibility(bessDelDesiertoCaseStudy, sizing);

    expect(issues.some((issue) => issue.id === "dc-voltage-range-compatible")).toBe(true);
    expect(issues.some((issue) => issue.id === "voltage-contradiction-pcs-transformer")).toBe(true);
    expect(issues.some((issue) => issue.id === "dc-energy-not-ac-usable")).toBe(true);
  });

  it("can evaluate the V12 electrical architecture and document inconsistencies together", () => {
    const issues = evaluateProjectElectricalArchitecture({
      blocks: bessDelDesiertoBlocks,
      conversionStations: bessDelDesiertoConversionStations,
      mvFeeders: bessDelDesiertoMVFeeders,
      mvBuses: bessDelDesiertoMVBuses,
      poi: bessDelDesiertoPOI,
      inconsistencies: bessDelDesiertoInconsistencies,
    });

    expect(issues.some((issue) => issue.severity === "critical")).toBe(false);
    expect(issues.some((issue) => issue.id === "doc-inconsistency-inc-001")).toBe(true);
    expect(issues.some((issue) => issue.id === "doc-inconsistency-inc-004")).toBe(true);
  });
});
