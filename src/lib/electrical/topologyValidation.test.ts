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
      // Fase 8 — preliminary electrical checks (defensible scope)
      "RULE-ELEC-007",
      "RULE-ELEC-008",
      "RULE-ELEC-009",
      "RULE-ELEC-013",
      "RULE-ELEC-014",
      "RULE-ELEC-015",
      "RULE-ELEC-016",
      "RULE-ELEC-017",
    ]);
    expect(result.criticalCount).toBe(0);
    // After confining BESS del Desierto specifics, the topology emits a
    // reference_only warning so the preset cannot be silently treated as
    // a universal rule. We still expect no critical issues.
    const nonPresetIssues = result.issues.filter(
      (i) => i.id !== "rule-elec-bess-del-desierto-preset-in-use"
    );
    expect(nonPresetIssues).toEqual([]);
  });

  it("flags blocks with more than 8 containers per conversion station as warning", () => {
    const input = presetInput();
    input.blocks[0] = {
      ...input.blocks[0],
      containerIds: [...input.blocks[0].containerIds, "extra-container"],
    } satisfies BESSBlock;

    const result = validateElectricalTopology(input);

    expect(result.warningCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-001-block-container-count")).toBe(true);
  });

  it("flags feeders with more than 4 stations as warning", () => {
    const input = presetInput();
    input.mvFeeders[0] = {
      ...input.mvFeeders[0],
      conversionStationIds: [
        ...input.mvFeeders[0].conversionStationIds,
        input.mvFeeders[1].conversionStationIds[0],
      ],
    } satisfies MVFeeder;

    const result = validateElectricalTopology(input);

    expect(result.warningCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-002-feeder-station-count")).toBe(true);
  });

  it("flags PCS DC ranges outside the preliminary container range as warning", () => {
    const input = presetInput();
    const station: ConversionStation = {
      ...input.conversionStations[0],
      pcsModules: input.conversionStations[0].pcsModules.map((pcs, index) =>
        index === 0 ? { ...pcs, dcVoltageRangeV: [1000, 1500] } : pcs
      ),
    };
    input.conversionStations[0] = station;

    const result = validateElectricalTopology(input);

    expect(result.warningCount).toBeGreaterThan(0);
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

  it("flags feeder power overload when aggregate MVA exceeds feeder rating", () => {
    const input = presetInput();
    input.mvFeeders[0] = {
      ...input.mvFeeders[0],
      ratedPowerMVA: 2,
    };

    const result = validateElectricalTopology(input);

    expect(result.criticalCount).toBeGreaterThan(0);
    expect(hasIssue(result, "rule-elec-006-feeder-power-overload")).toBe(true);
  });

  it("does not flag PCS LV voltage when it matches transformer LV", () => {
    const input = presetInput();
    input.conversionStations[0].pcsModules[0] = {
      ...input.conversionStations[0].pcsModules[0],
      nominalAcVoltageV: 900,
    };
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-004-pcs-transformer-lv-mismatch")).toBe(false);
  });

  it("flags warning when transformer is missing", () => {
    const input = presetInput();
    // @ts-expect-error test simulation of missing property
    input.conversionStations[0].blockTransformer = null;
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-missing-transformer")).toBe(true);
  });

  it("flags warning when voltage is missing or zero", () => {
    const input = presetInput();
    input.conversionStations[0].blockTransformer.lvVoltageKv.value = 0;
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-missing-transformer-lv")).toBe(true);
  });

  it("flags voltage contradiction when PCS configuration does not align with datasheet specs", () => {
    const input = presetInput();
    // The catalog's knownVoltageContradictions is keyed on the PCS spec
    // model "SC5000UD-MV" (an alias). The preset PCS modules carry a
    // descriptive model string ("SC5000UD-MV (PCS module)") that does
    // not match either id or alias, so the contradiction check would
    // not resolve a spec. Align the model so the check fires.
    for (const station of input.conversionStations) {
      for (const pcs of station.pcsModules) {
        pcs.model = "SC5000UD-MV";
      }
    }
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-pcs-transformer-voltage-contradiction")).toBe(true);
  });

  it("verifies 8:1 and 4:1 ratios are reported as warnings with reference_only basis", () => {
    const input = presetInput();
    input.blocks[0] = {
      ...input.blocks[0],
      containerIds: [...input.blocks[0].containerIds, "extra-container-9"],
    };
    const result = validateElectricalTopology(input);
    const containerCountIssue = result.issues.find(i => i.id.startsWith("rule-elec-001-block-container-count"));
    expect(containerCountIssue).toBeDefined();
    expect(containerCountIssue!.severity).toBe("warning");
    expect(containerCountIssue!.basis).toBe("reference_only");
  });

  it("flags block ratio preset mismatch when block has different container ratio", () => {
    const input = presetInput();
    input.blocks[0] = {
      ...input.blocks[0],
      containerIds: input.blocks[0].containerIds.slice(0, 7),
    };
    const result = validateElectricalTopology(input);
    expect(hasIssue(result, "rule-elec-block-ratio-preset-mismatch")).toBe(true);
  });

  it("verifies validation does not modify any MW/MWh metrics", () => {
    const input = presetInput();
    const beforeSum = input.conversionStations.reduce((acc, c) => acc + c.ratedPowerMVA.value, 0);
    const result = validateElectricalTopology(input);
    const afterSum = input.conversionStations.reduce((acc, c) => acc + c.ratedPowerMVA.value, 0);
    expect(beforeSum).toBe(afterSum);
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
