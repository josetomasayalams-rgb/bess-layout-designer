import { describe, expect, it } from "vitest";
import { toLngLat } from "@/lib/geometry/projection";
import type { PlacedEquipment } from "@/types/equipment";
import type { ProjectAnchor } from "@/types/geometry";
import { buildReportData } from "./buildReportData";
import {
  bessDelDesiertoAuxiliaryServices,
  bessDelDesiertoBlocks,
  bessDelDesiertoConversionStations,
  bessDelDesiertoLossEstimates,
  bessDelDesiertoMainTransformer,
  bessDelDesiertoMVBuses,
  bessDelDesiertoMVFeeders,
  bessDelDesiertoOperationalLimits,
  bessDelDesiertoPOI,
  bessDelDesiertoPPC,
} from "@/data/projectCaseStudies";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { PHASE_8_ELECTRICAL_RULE_IDS } from "@/rules/regulatoryRulesCatalog";

const anchor: ProjectAnchor = { lng0: -70.2, lat0: -24.1 };

function point(x_m: number, y_m: number) {
  return toLngLat({ x_m, y_m }, anchor);
}

function makePlacedEquipment(): PlacedEquipment[] {
  const containers: PlacedEquipment[] = Array.from({ length: 320 }, (_, index) => ({
    id: `bess-${index + 1}`,
    equipmentSpecId: "sungrow-st2752ux-us",
    anchor: point((index % 32) * 14, Math.floor(index / 32) * 8),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  }));

  const stations: PlacedEquipment[] = Array.from({ length: 40 }, (_, index) => ({
    id: `pcs-${index + 1}`,
    equipmentSpecId: "sungrow-sc5000ud-mv-us-p3",
    anchor: point((index % 10) * 48, 120 + Math.floor(index / 10) * 18),
    rotation_deg: 0,
    sourceReliability: "certified_data",
  }));

  return [...containers, ...stations];
}

// Integrated AC units (no separate PCS/MV station). Tesla Megapack 2 XL 4h =
// 3.916 MWh / 0.979 MVA per unit; the PCS/inverter lives inside the unit.
function makeTeslaLayout(count: number): PlacedEquipment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `mp-${index + 1}`,
    equipmentSpecId: "bess-tesla-megapack-2xl-4h",
    anchor: point((index % 10) * 12, Math.floor(index / 10) * 5),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption" as const,
  }));
}

function baseReportArgs() {
  return {
    projectName: "BESS del Desierto",
    appVersion: "test",
    locale: "es" as const,
    polygon: [
      point(-80, -80),
      point(540, -80),
      point(540, 260),
      point(-80, 260),
    ],
    anchor,
    placed: makePlacedEquipment(),
    designTargets: {},
    blocks: [],
    conversionStations: [],
    mvFeeders: [],
    mvBuses: [],
    poi: null,
    mainTransformer: null,
    auxiliaryServices: null,
    ppc: null,
    operationalLimits: null,
    lossEstimates: [],
    assumptions: [],
    inconsistencies: [],
    pendingData: [],
    regulatoryEvaluation: null,
    caseStudy: null,
    mapCapture: null,
    geocode: null,
  };
}

describe("buildReportData — report KPI synchronization", () => {
  it("derives non-zero executive KPIs from physical layout inventory", () => {
    const data = buildReportData(baseReportArgs());

    expect(data.reportKpis.source).toBe("layout_inventory");
    expect(data.reportKpis.containers).toBe(320);
    expect(data.reportKpis.stations).toBe(40);
    expect(data.reportKpis.feeders).toBe(10);
    expect(data.reportKpis.blocks).toBe(40);
    expect(data.reportKpis.installedPowerMVA).toBe(200);
    expect(data.reportKpis.grossEnergyMWh).toBeCloseTo(880.64, 3);
    expect(data.reportKpis.usableEnergyMWh).toBeGreaterThan(790);
    expect(data.reportKpis.durationHours).toBeGreaterThan(3.9);
    expect(data.sizingFromTargets.containers).toBe(320);
    expect(data.sizingFromTargets.stations).toBe(40);
    expect(data.sizingFromTargets.feeders).toBe(10);
    // Separate-PCS Sungrow layout must never be flagged as integrated.
    expect(data.reportKpis.isIntegrated).toBe(false);
    expect(data.reportKpis.integratedUnitCount).toBe(0);
  });

  it("adds explicit alerts when layout exists but electrical architecture is not persisted", () => {
    const data = buildReportData(baseReportArgs());
    const ids = data.consistencyAlerts.map((alert) => alert.id);

    expect(ids).toContain("RPT-SYNC-001");
    expect(ids).toContain("RPT-SYNC-003");
    expect(ids).toContain("RPT-SYNC-004");
    expect(data.consistencyAlerts.some((alert) => alert.severity === "critical")).toBe(true);
  });

  it("ships an empty Fase 9 electrical block when no regulatory evaluation is provided", () => {
    const data = buildReportData(baseReportArgs());
    expect(data.preliminaryElectricalChecks.checks).toEqual([]);
    expect(data.preliminaryElectricalChecks.totals).toEqual({
      pass: 0,
      violation: 0,
      notEvaluable: 0,
      pendingValidation: 0,
      other: 0,
    });
    expect(data.preliminaryElectricalChecks.hasSeverityCaps).toBe(false);
  });

  it("keeps the equipment inventory aligned with the report KPIs", () => {
    const data = buildReportData(baseReportArgs());
    const bess = data.equipmentInventory.find((row) => row.type === "battery_container");
    const pcs = data.equipmentInventory.find((row) => row.type === "pcs_mv_station");

    expect(bess?.count).toBe(data.reportKpis.containers);
    expect(pcs?.count).toBe(data.reportKpis.stations);
    expect(data.electrical.stationRows[0]?.ratedMVA).toBeCloseTo(5, 3);
    expect(data.electrical.stationRows[0]?.containerCount).toBe(8);
  });
});

describe("buildReportData — Fase 9 preliminary electrical block", () => {
  function presetReportArgs() {
    return {
      ...baseReportArgs(),
      blocks: bessDelDesiertoBlocks,
      conversionStations: bessDelDesiertoConversionStations,
      mvFeeders: bessDelDesiertoMVFeeders,
      mvBuses: bessDelDesiertoMVBuses,
      poi: bessDelDesiertoPOI,
      mainTransformer: bessDelDesiertoMainTransformer,
      auxiliaryServices: bessDelDesiertoAuxiliaryServices,
      ppc: bessDelDesiertoPPC,
      operationalLimits: bessDelDesiertoOperationalLimits,
      lossEstimates: bessDelDesiertoLossEstimates,
    };
  }

  function presetWithEvaluation() {
    const args = presetReportArgs();
    const electrical = validateElectricalTopology({
      blocks: args.blocks,
      conversionStations: args.conversionStations,
      mvFeeders: args.mvFeeders,
      mvBuses: args.mvBuses,
      poi: args.poi,
      auxiliaryServices: args.auxiliaryServices,
      operationalLimits: args.operationalLimits,
      ppc: args.ppc,
    });
    const evaluation = runRegulatoryEvaluation({
      profileId: "chile-utility-predesign",
      electricalValidation: electrical,
      blocks: args.blocks,
      conversionStations: args.conversionStations,
      mvFeeders: args.mvFeeders,
      mvBuses: args.mvBuses,
      poi: args.poi,
      inconsistencies: [],
    });
    return { args: { ...args, regulatoryEvaluation: evaluation }, evaluation };
  }

  it("populates the Fase 9 block with all 8 Phase 8 rules when the architecture is loaded", () => {
    const { args } = presetWithEvaluation();
    const data = buildReportData(args);
    const block = data.preliminaryElectricalChecks;

    const ids = block.checks.map((c) => c.ruleId);
    for (const expected of PHASE_8_ELECTRICAL_RULE_IDS) {
      expect(ids, `missing ${expected}`).toContain(expected);
    }
    expect(block.checks).toHaveLength(PHASE_8_ELECTRICAL_RULE_IDS.length);
    // Ordering must be deterministic by ruleId so the PDF is stable.
    expect(ids).toEqual([...ids].sort());
  });

  it("exposes effective severity, document level and citation for each rule", () => {
    const { args } = presetWithEvaluation();
    const data = buildReportData(args);
    for (const c of data.preliminaryElectricalChecks.checks) {
      expect(c.effectiveSeverity).toMatch(
        /^(blocking|warning|info|checklist|out_of_scope)$/
      );
      expect(c.declaredSeverity).toMatch(
        /^(blocking|warning|info|checklist|out_of_scope)$/
      );
      // The block is non-certifying by construction: no rule can carry
      // `blocking` effective severity because none of the Phase 8 evidence
      // chain reaches L1+documented. This is the defensibility invariant.
      expect(c.effectiveSeverity).not.toBe("blocking");
      expect(c.outcome).not.toBe("out_of_scope");
    }
  });

  it("counts pass/violation/notEvaluable/pendingValidation consistently with the checks list", () => {
    const { args } = presetWithEvaluation();
    const data = buildReportData(args);
    const block = data.preliminaryElectricalChecks;
    const sum =
      block.totals.pass +
      block.totals.violation +
      block.totals.notEvaluable +
      block.totals.pendingValidation +
      block.totals.other;
    expect(sum).toBe(block.checks.length);
  });

  it("flags severity caps when an evidence chain forces the matrix to lower the declared severity", () => {
    const { args, evaluation } = presetWithEvaluation();
    const data = buildReportData(args);
    const block = data.preliminaryElectricalChecks;
    const cappedInBlock = block.checks.filter((c) => c.severityCappedBy !== null);
    const cappedInEvaluation = evaluation.byCategory.electrical.filter(
      (e) =>
        PHASE_8_ELECTRICAL_RULE_IDS.includes(
          e.ruleId as (typeof PHASE_8_ELECTRICAL_RULE_IDS)[number]
        ) && e.severityCappedBy !== null
    );
    expect(block.hasSeverityCaps).toBe(cappedInBlock.length > 0);
    expect(cappedInBlock.length).toBe(cappedInEvaluation.length);
  });
});

describe("buildReportData — integrated (Tesla) architecture KPIs", () => {
  function teslaArgs(count: number) {
    return { ...baseReportArgs(), placed: makeTeslaLayout(count) };
  }

  it("derives non-zero power and duration from integrated units without a separate PCS", () => {
    const data = buildReportData(teslaArgs(10));

    expect(data.reportKpis.stations).toBe(0);
    expect(data.reportKpis.containers).toBe(10);
    expect(data.reportKpis.isIntegrated).toBe(true);
    expect(data.reportKpis.integratedUnitCount).toBe(10);
    // Installed power from integrated unit AC rating (0.979 MVA each), not a PCS.
    expect(data.reportKpis.installedPowerMVA).toBeCloseTo(10 * 0.979, 3);
    expect(data.reportKpis.poiPowerMW).not.toBeNull();
    expect(data.reportKpis.poiPowerMW!).toBeCloseTo(10 * 0.979, 3);
    expect(data.reportKpis.grossEnergyMWh).toBeCloseTo(10 * 3.916, 2);
    // Duration is no longer null (was null pre-fix because installed power was 0).
    expect(data.reportKpis.durationHours).not.toBeNull();
    expect(data.reportKpis.durationHours!).toBeGreaterThan(0);
    // Gross energy / installed power ≈ the 4h unit rating, factor-independent.
    expect(
      data.reportKpis.grossEnergyMWh / data.reportKpis.installedPowerMVA
    ).toBeCloseTo(4, 1);
  });

  it("uses integrated-specific wording for the derived-power alert and skips PCS-only alerts", () => {
    const data = buildReportData(teslaArgs(4));
    const ids = data.consistencyAlerts.map((a) => a.id);
    const sync1 = data.consistencyAlerts.find((a) => a.id === "RPT-SYNC-001");

    expect(sync1).toBeDefined();
    expect(sync1!.message).toContain("unidades integradas");
    // No PCS/MV stations were placed → the PCS-without-architecture alert
    // (RPT-SYNC-004) must not fire for an integrated layout.
    expect(ids).not.toContain("RPT-SYNC-004");
  });
});
