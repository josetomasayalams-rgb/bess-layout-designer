import { describe, expect, it } from "vitest";
import {
  bessDelDesiertoBlocks,
  bessDelDesiertoConversionStations,
  bessDelDesiertoInconsistencies,
  bessDelDesiertoMVBuses,
  bessDelDesiertoMVFeeders,
  bessDelDesiertoPOI,
} from "@/data/projectCaseStudies";
import type { BESSBlock, ConversionStation, MVFeeder } from "@/types/electrical";
import {
  documentInconsistenciesToElectricalIssues,
  validateElectricalTopology,
} from "@/lib/electrical/topologyValidation";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function presetInput() {
  return {
    blocks: clone(bessDelDesiertoBlocks),
    conversionStations: clone(bessDelDesiertoConversionStations),
    mvFeeders: clone(bessDelDesiertoMVFeeders),
    mvBuses: clone(bessDelDesiertoMVBuses),
    poi: clone(bessDelDesiertoPOI),
  };
}

function hasIssue(result: ReturnType<typeof validateElectricalTopology>, prefix: string): boolean {
  return result.issues.some((issue) => issue.id.startsWith(prefix));
}

describe("validateElectricalTopology", () => {
  it("accepts the BESS del Desierto V12 topology without critical issues", () => {
    const result = validateElectricalTopology(presetInput());

    expect(result.checkedRules).toEqual([
      "RULE-ELEC-001",
      "RULE-ELEC-002",
      "RULE-ELEC-003",
      "RULE-ELEC-004",
      "RULE-ELEC-005",
      "RULE-ELEC-006",
    ]);
    expect(result.criticalCount).toBe(0);
    expect(result.issues).toEqual([]);
  });

  it("flags blocks with more than 8 containers per conversion station", () => {
    const input = presetInput();
    input.blocks[0] = {
      ...input.blocks[0],
      containerIds: [...input.blocks[0].containerIds, "extra-container"],
    } satisfies BESSBlock;

    const result = validateElectricalTopology(input);

    expect(result.criticalCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-001-block-container-count")).toBe(true);
  });

  it("flags feeders with more than 4 stations", () => {
    const input = presetInput();
    input.mvFeeders[0] = {
      ...input.mvFeeders[0],
      conversionStationIds: [
        ...input.mvFeeders[0].conversionStationIds,
        input.mvFeeders[1].conversionStationIds[0],
      ],
    } satisfies MVFeeder;

    const result = validateElectricalTopology(input);

    expect(result.criticalCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-002-feeder-station-count")).toBe(true);
  });

  it("flags PCS DC ranges outside the preliminary container range", () => {
    const input = presetInput();
    const station: ConversionStation = {
      ...input.conversionStations[0],
      pcsModules: input.conversionStations[0].pcsModules.map((pcs, index) =>
        index === 0 ? { ...pcs, dcVoltageRangeV: [1000, 1500] } : pcs
      ),
    };
    input.conversionStations[0] = station;

    const result = validateElectricalTopology(input);

    expect(result.criticalCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-003-pcs-dc-range-mismatch")).toBe(true);
  });

  it("flags PCS LV voltage mismatches against the block transformer", () => {
    const input = presetInput();
    const station: ConversionStation = {
      ...input.conversionStations[0],
      pcsModules: input.conversionStations[0].pcsModules.map((pcs, index) =>
        index === 0 ? { ...pcs, nominalAcVoltageV: 690 } : pcs
      ),
    };
    input.conversionStations[0] = station;

    const result = validateElectricalTopology(input);

    expect(result.criticalCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-004-pcs-transformer-lv-mismatch")).toBe(true);
  });

  it("flags collector voltage mismatches across feeders and POI", () => {
    const input = presetInput();
    input.mvFeeders[0] = { ...input.mvFeeders[0], nominalVoltageKv: 23 };
    input.poi = { ...input.poi, voltageKv: 220 };

    const result = validateElectricalTopology(input);

    expect(result.warningCount).toBeGreaterThanOrEqual(2);
    expect(hasIssue(result, "rule-elec-005-feeder-collector-voltage")).toBe(true);
    expect(hasIssue(result, "rule-elec-006-poi-voltage-mismatch")).toBe(true);
  });
});

describe("documentInconsistenciesToElectricalIssues", () => {
  it("keeps INC-001 to INC-004 visible as pending validation warnings", () => {
    const issues = documentInconsistenciesToElectricalIssues(
      bessDelDesiertoInconsistencies
    );

    expect(issues).toHaveLength(4);
    expect(issues.map((issue) => issue.id)).toEqual([
      "doc-inconsistency-inc-001",
      "doc-inconsistency-inc-002",
      "doc-inconsistency-inc-003",
      "doc-inconsistency-inc-004",
    ]);
    expect(issues.every((issue) => issue.severity === "warning")).toBe(true);
    expect(issues.every((issue) => issue.basis === "pending_validation")).toBe(true);
  });
});
