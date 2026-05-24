import type {
  ElectricalCompatibilityIssue,
  PcsSpec,
  PreliminarySizingResult,
  ProjectCaseStudy,
} from "@/types/technical";
import type { DocumentInconsistency } from "@/types/project";
import {
  documentInconsistenciesToElectricalIssues,
  validateElectricalTopology,
  type ElectricalTopologyInput,
} from "@/lib/electrical/topologyValidation";

function issue(args: ElectricalCompatibilityIssue): ElectricalCompatibilityIssue {
  return args;
}

function rangesCompatible(
  inner: { min: number; max: number },
  outer: { min: number; max: number }
): boolean {
  return inner.min >= outer.min && inner.max <= outer.max;
}

function near(a: number, b: number, tolerancePct = 2): boolean {
  if (b === 0) return a === 0;
  return Math.abs(a - b) / Math.abs(b) <= tolerancePct / 100;
}

function voltageContradictionIssue(pcs: PcsSpec): ElectricalCompatibilityIssue | null {
  const contradiction = pcs.knownVoltageContradictions;
  if (!contradiction) return null;
  return issue({
    id: "voltage-contradiction-pcs-transformer",
    severity: "warning",
    message: `Voltage data conflict: datasheet reports ${contradiction.datasheetLvKv}/${contradiction.datasheetMvKv} kV while project reports ${contradiction.projectReportedLvKv}/${contradiction.projectReportedMvKv} kV.`,
    recommendation:
      "Confirm the project-specific PCS/MV transformer configuration before using voltage values for design decisions.",
    basis: "pending_validation",
    affectedIds: [pcs.id],
  });
}

export function evaluateCaseStudyCompatibility(
  caseStudy: ProjectCaseStudy,
  sizing: PreliminarySizingResult
): ElectricalCompatibilityIssue[] {
  const issues: ElectricalCompatibilityIssue[] = [];
  const bess = caseStudy.equipmentSet.bessContainers[0];
  const pcs = caseStudy.equipmentSet.pcsUnits[0];
  const transformer = caseStudy.equipmentSet.transformers[0];

  if (bess?.dcVoltageRange && pcs?.dcVoltageRange) {
    if (rangesCompatible(bess.dcVoltageRange, pcs.dcVoltageRange)) {
      issues.push(
        issue({
          id: "dc-voltage-range-compatible",
          severity: "info",
          message: `BESS DC voltage range ${bess.dcVoltageRange.min}-${bess.dcVoltageRange.max} V is inside PCS range ${pcs.dcVoltageRange.min}-${pcs.dcVoltageRange.max} V.`,
          recommendation:
            "Keep this as a preliminary compatibility pass and confirm detailed DC limits with vendor configuration.",
          basis: "datasheet",
          affectedIds: [bess.id, pcs.id],
        })
      );
    } else {
      issues.push(
        issue({
          id: "dc-voltage-range-mismatch",
          severity: "critical",
          message: "BESS and PCS DC voltage ranges are not fully compatible.",
          recommendation:
            "Select compatible equipment or obtain a project-specific manufacturer configuration.",
          basis: "datasheet",
          affectedIds: [bess.id, pcs.id],
        })
      );
    }
  } else {
    issues.push(
      issue({
        id: "dc-voltage-range-pending",
        severity: "warning",
        message: "BESS or PCS DC voltage range is missing.",
        recommendation: "Load manufacturer datasheets before validating DC compatibility.",
        basis: "pending_validation",
        affectedIds: [bess?.id ?? "bess", pcs?.id ?? "pcs"],
      })
    );
  }

  if (near(sizing.installedApparentPowerMva, sizing.targetPowerMW)) {
    issues.push(
      issue({
        id: "installed-power-close-to-target",
        severity: "info",
        message: `Installed apparent power is ${sizing.installedApparentPowerMva} MVA against a ${sizing.targetPowerMW} MW project target.`,
        recommendation:
          "Treat MVA-to-MW comparison as conceptual until active power limit and power factor are confirmed.",
        basis: "calculated",
        affectedIds: caseStudy.blockArchitecture.map((block) => block.id),
      })
    );
  } else {
    issues.push(
      issue({
        id: "installed-power-target-gap",
        severity: "warning",
        message: `Installed apparent power ${sizing.installedApparentPowerMva} MVA differs from target ${sizing.targetPowerMW} MW.`,
        recommendation:
          "Review PCS count, active power rating and project target before using the case as a sizing baseline.",
        basis: "calculated",
        affectedIds: caseStudy.blockArchitecture.map((block) => block.id),
      })
    );
  }

  if (sizing.energyOversizeVsDeclaredPct !== null) {
    const severity = sizing.energyOversizeVsDeclaredPct > 15 ? "warning" : "info";
    issues.push(
      issue({
        id: "nominal-dc-energy-vs-declared-energy",
        severity,
        message: `Installed nominal DC energy is ${sizing.totalNominalEnergyMWhDc} MWh versus ${sizing.declaredProjectEnergyMWh} MWh declared (${sizing.energyOversizeVsDeclaredPct}% difference).`,
        recommendation:
          "Keep DC BOL, AC usable and contractual energy as separate fields in reports.",
        basis: "calculated",
        affectedIds: [bess?.id ?? "bess"],
      })
    );
  }

  if (
    sizing.calculatedDurationFromDeclaredEnergyHours !== null &&
    near(sizing.calculatedDurationFromDeclaredEnergyHours, caseStudy.designIntent.targetDurationHours)
  ) {
    issues.push(
      issue({
        id: "declared-duration-compatible",
        severity: "info",
        message: `Declared duration is ${sizing.calculatedDurationFromDeclaredEnergyHours} h from ${sizing.declaredProjectEnergyMWh} MWh / ${sizing.targetPowerMW} MW.`,
        recommendation:
          "Use declared energy duration for conceptual project summary; keep nominal DC duration as separate context.",
        basis: "calculated",
        affectedIds: [caseStudy.id],
      })
    );
  }

  if (sizing.approximateCRateFromDeclaredEnergy !== null) {
    issues.push(
      issue({
        id: "approximate-c-rate",
        severity: "info",
        message: `Approximate C-rate is ${sizing.approximateCRateFromDeclaredEnergy}C using ${sizing.targetPowerMW} MW / ${sizing.declaredProjectEnergyMWh} MWh.`,
        recommendation:
          "Use C-rate only as conceptual screening; final charge/discharge limits depend on vendor curves and operating strategy.",
        basis: "calculated",
        affectedIds: [caseStudy.id],
      })
    );
  }

  const collectorVoltages = new Set(
    caseStudy.blockArchitecture
      .map((block) => block.collectorVoltageKv?.value)
      .filter((value): value is number => value !== undefined)
  );
  if (collectorVoltages.size === 1 && collectorVoltages.has(33)) {
    issues.push(
      issue({
        id: "collector-voltage-reported-33kv",
        severity: "info",
        message: "Block architecture uses reported 33 kV collector voltage.",
        recommendation:
          "Keep 33 kV as project-reported collector voltage; do not extend this to substation design.",
        basis: "reported_project_data",
        affectedIds: caseStudy.blockArchitecture.map((block) => block.id),
      })
    );
  } else {
    issues.push(
      issue({
        id: "collector-voltage-not-evaluable",
        severity: "warning",
        message: "Collector voltage is missing or inconsistent across blocks.",
        recommendation: "Confirm MV collector voltage from the project single-line diagram.",
        basis: "pending_validation",
        affectedIds: caseStudy.blockArchitecture.map((block) => block.id),
      })
    );
  }

  const contradiction = pcs ? voltageContradictionIssue(pcs) : null;
  if (contradiction) issues.push(contradiction);

  issues.push(
    issue({
      id: "mva-mw-conceptual-warning",
      severity: "warning",
      message: "The current sizing compares PCS/MV installed MVA against project MW target.",
      recommendation:
        "Add explicit active power rating or power factor assumptions before treating this as a firm MW validation.",
      basis: "engineering_judgement",
      affectedIds: [pcs?.id ?? "pcs", transformer?.id ?? "transformer"],
    })
  );

  issues.push(
    issue({
      id: "dc-energy-not-ac-usable",
      severity: "warning",
      message: "Nominal DC BOL energy is not the same as AC usable or guaranteed project energy.",
      recommendation:
        "Reports must keep declared 800 MWh separate from calculated nominal DC energy.",
      basis: "engineering_judgement",
      affectedIds: [bess?.id ?? "bess"],
    })
  );

  return issues;
}

export function evaluateProjectElectricalArchitecture(
  input: ElectricalTopologyInput & { inconsistencies?: DocumentInconsistency[] }
): ElectricalCompatibilityIssue[] {
  return [
    ...validateElectricalTopology(input).issues,
    ...documentInconsistenciesToElectricalIssues(input.inconsistencies ?? []),
  ];
}

export {
  documentInconsistenciesToElectricalIssues,
  validateElectricalTopology,
  type ElectricalTopologyInput,
  type ElectricalTopologyLimits,
  type ElectricalTopologyValidationResult,
} from "@/lib/electrical/topologyValidation";
