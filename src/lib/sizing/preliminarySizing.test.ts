import { describe, expect, it } from "vitest";
import { bessDelDesiertoCaseStudy } from "@/data/projectCaseStudies";
import { calculateCaseStudySizing } from "@/lib/sizing/preliminarySizing";

describe("calculateCaseStudySizing", () => {
  it("summarizes the BESS del Desierto block architecture", () => {
    const result = calculateCaseStudySizing(bessDelDesiertoCaseStudy);

    expect(result.totalBessContainers).toBe(320);
    expect(result.totalPcsOrMvCenters).toBe(40);
    expect(result.installedApparentPowerMva).toBe(200);
    expect(result.declaredProjectEnergyMWh).toBe(800);
    expect(result.totalNominalEnergyMWhDc).toBeCloseTo(880.80384, 5);
    expect(result.calculatedDurationFromDeclaredEnergyHours).toBe(4);
    expect(result.calculatedDurationFromDcEnergyHours).toBeCloseTo(4.404, 3);
    expect(result.approximateCRateFromDeclaredEnergy).toBe(0.25);
  });
});
