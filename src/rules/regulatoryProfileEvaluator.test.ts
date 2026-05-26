import { describe, it, expect } from "vitest";
import {
  evaluateRegulatoryProfile,
  runRegulatoryEvaluation,
  type EvaluatedRuleEntry,
} from "@/rules/regulatoryProfileEvaluator";
import {
  bessDelDesiertoPresetV12,
} from "@/data/projectCaseStudies/bessDelDesiertoPresetV12";
import { regulatoryRulesCatalog } from "@/rules/regulatoryRulesCatalog";
import { findDocument } from "@/data/documentRegistry";

describe("evaluateRegulatoryProfile — chile-utility-predesign", () => {
  const result = evaluateRegulatoryProfile({
    profileId: "chile-utility-predesign",
    physicalIssues: [],
    electricalIssues: [],
    evaluatedAt: "2026-05-23T00:00:00.000Z",
  });

  it("returns a deterministic evaluatedAt when provided", () => {
    expect(result.evaluatedAt).toBe("2026-05-23T00:00:00.000Z");
  });

  it("has the right profile id", () => {
    expect(result.profileId).toBe("chile-utility-predesign");
    expect(result.profileName).toContain("utility-scale");
  });

  it("includes at least one rule of each populated category", () => {
    const catalogCats = new Set(
      regulatoryRulesCatalog
        .filter((r) => r.appliesToProfiles.includes("chile-utility-predesign"))
        .map((r) => r.category)
    );
    for (const cat of catalogCats) {
      expect(result.byCategory[cat].length).toBeGreaterThan(0);
    }
  });

  it("totals add up to the number of rules in the profile", () => {
    const sum =
      result.totals.pass +
      result.totals.violation +
      result.totals.manualCheck +
      result.totals.pending +
      result.totals.notEvaluable +
      result.totals.outOfScope;
    expect(sum).toBe(result.rules.length);
  });

  it("electrical rules are 'not_evaluable' when no architecture is supplied", () => {
    const electrical = result.byCategory.electrical;
    const implementedElec = electrical.filter((r) =>
      regulatoryRulesCatalog.find((c) => c.id === r.ruleId)?.status === "implemented"
    );
    for (const r of implementedElec) {
      expect(r.outcome).toBe("not_evaluable");
    }
  });

  it("document_registry_refs only contains registered ids", () => {
    for (const id of result.documentRegistryRefs) {
      expect(findDocument(id)).toBeDefined();
    }
  });

  it("manual_check rules are reported as manual_check", () => {
    const manual = result.rules.filter((r) => r.outcome === "manual_check");
    for (const r of manual) {
      const def = regulatoryRulesCatalog.find((c) => c.id === r.ruleId);
      expect(def?.status === "manual_check" || def?.status === "not_automatable").toBe(true);
    }
  });
});

describe("evaluateRegulatoryProfile — with BESS del Desierto architecture", () => {
  const preset = bessDelDesiertoPresetV12;

  it("electrical rules become 'pass' when no electrical violations exist", () => {
    const result = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      blocks: preset.blocks,
      conversionStations: preset.conversionStations,
      mvFeeders: preset.mvFeeders,
      mvBuses: preset.mvBuses,
      poi: preset.poi,
      inconsistencies: [],
      electricalIssues: [],
    });

    const implementedElec = result.byCategory.electrical.filter((entry) => {
      const def = regulatoryRulesCatalog.find((c) => c.id === entry.ruleId);
      return def?.status === "implemented";
    });
    for (const entry of implementedElec) {
      expect(entry.outcome).not.toBe("not_evaluable");
    }
  });

  it("document_registry_refs of preset profile evaluation include known ids", () => {
    const result = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      blocks: preset.blocks,
      conversionStations: preset.conversionStations,
      mvFeeders: preset.mvFeeders,
      mvBuses: preset.mvBuses,
      poi: preset.poi,
    });
    expect(result.documentRegistryRefs.length).toBeGreaterThan(0);
    for (const id of result.documentRegistryRefs) {
      expect(findDocument(id)).toBeDefined();
    }
  });
});

describe("evaluateRegulatoryProfile — error handling", () => {
  it("throws on unknown profile", () => {
    expect(() =>
      // @ts-expect-error testing runtime guard
      evaluateRegulatoryProfile({ profileId: "unknown-profile" })
    ).toThrow();
  });
});

describe("runRegulatoryEvaluation — convenience wrapper", () => {
  it("returns a structurally identical evaluation when no validators are passed", () => {
    const result = runRegulatoryEvaluation({
      profileId: "chile-utility-predesign",
      evaluatedAt: "2026-05-23T00:00:00.000Z",
    });
    expect(result.profileId).toBe("chile-utility-predesign");
    expect(result.evaluatedAt).toBe("2026-05-23T00:00:00.000Z");
    expect(result.rules.length).toBeGreaterThan(0);
  });
});

describe("evaluateRegulatoryProfile — outcome distribution", () => {
  it("BESS del Desierto reference profile evaluates without crashing", () => {
    const r = evaluateRegulatoryProfile({
      profileId: "bess-del-desierto-reference",
    });
    expect(r.profileId).toBe("bess-del-desierto-reference");
  });

  it("PMGD predesign profile evaluates without crashing", () => {
    const r = evaluateRegulatoryProfile({
      profileId: "chile-pmgd-predesign",
    });
    expect(r.profileId).toBe("chile-pmgd-predesign");
  });

  it("international fire reference profile evaluates without crashing", () => {
    const r = evaluateRegulatoryProfile({
      profileId: "international-fire-reference",
    });
    expect(r.profileId).toBe("international-fire-reference");
  });

  it("each evaluated rule entry preserves the appParameter from the catalog (when present)", () => {
    const r = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
    });
    const sample: EvaluatedRuleEntry | undefined = r.rules.find(
      (entry) => entry.appParameter
    );
    expect(sample).toBeDefined();
    expect(typeof sample!.appParameter).toBe("string");
  });
});

describe("evaluateRegulatoryProfile — newly automated physical rules", () => {
  it("evaluates RULE-PHYS-003, RULE-PHYS-004, and RULE-PHYS-005 when physical issues are provided", () => {
    const result = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      physicalIssues: [
        {
          id: "issue-bess-bess",
          severity: "critical",
          ruleId: "bess_to_bess_spacing",
          ruleLabel: "BESS to BESS separation",
          objectAId: "bess-1",
          objectBId: "bess-2",
          measured_m: 1.5,
          required_m: 3.0,
          source: "test source",
          message: "BESS 1 is 1.5m from BESS 2.",
          recommendation: "Increase spacing",
          basis: "conservative_criterion",
        },
        {
          id: "issue-pcs-clearance",
          severity: "critical",
          ruleId: "electrical_front_working_clearance",
          ruleLabel: "Electrical equipment working clearance",
          objectAId: "pcs-1",
          objectBId: "bess-1",
          measured_m: 0.5,
          required_m: 0.9,
          source: "test source",
          message: "PCS 1 is 0.5m from BESS 1.",
          recommendation: "Increase clearance",
          basis: "conservative_criterion",
        },
        {
          id: "issue-bess-property",
          severity: "critical",
          ruleId: "bess_to_property_line",
          ruleLabel: "BESS to property line",
          objectAId: "bess-1",
          measured_m: 2.0,
          required_m: 3.0,
          source: "test source",
          message: "BESS 1 is 2.0m from property line.",
          recommendation: "Move BESS farther",
          basis: "conservative_criterion",
        },
      ],
    });

    const rule3 = result.rules.find((r) => r.ruleId === "RULE-PHYS-003");
    expect(rule3).toBeDefined();
    expect(rule3!.outcome).toBe("violation");
    expect(rule3!.violations.length).toBe(1);
    expect(rule3!.violations[0].measured_m).toBe(1.5);

    const rule4 = result.rules.find((r) => r.ruleId === "RULE-PHYS-004");
    expect(rule4).toBeDefined();
    expect(rule4!.outcome).toBe("violation");
    expect(rule4!.violations.length).toBe(1);

    const rule5 = result.rules.find((r) => r.ruleId === "RULE-PHYS-005");
    expect(rule5).toBeDefined();
    expect(rule5!.outcome).toBe("violation");
    expect(rule5!.violations.length).toBe(1);
    expect(rule5!.violations[0].measured_m).toBe(2.0);
  });
});

describe("evaluateRegulatoryProfile — newly automated electrical & detail rules", () => {
  it("evaluates RULE-ELEC-006, RULE-PHYS-009, and RULE-REP-001 correctly", () => {
    const result = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      blocks: [
        {
          id: "b-1",
          conversionStationId: "cs-1",
          containerIds: ["c-1"],
        },
      ],
      conversionStations: [
        {
          id: "cs-1",
          manufacturer: "Sungrow",
          model: "SC5000UD-MV",
          ratedPowerMVA: { value: 5, unit: "MVA", evidence: [] },
          associatedContainerIds: ["c-1"],
          blockTransformer: {
            id: "t-1",
            ratedPowerMVA: { value: 5, unit: "MVA", evidence: [] },
            lvVoltageKv: { value: 0.9, unit: "kV", evidence: [] },
            hvVoltageKv: { value: 33, unit: "kV", evidence: [] },
            vectorGroup: "Dy11",
            cooling: "ONAN",
          },
          pcsModules: [],
        },
      ],
      mvFeeders: [
        {
          id: "f-1",
          nominalVoltageKv: 33,
          conversionStationIds: ["cs-1"],
          cableRouteIds: [],
          mvBusId: "bus-1",
        },
      ],
      physicalIssues: [
        {
          id: "issue-cable-equip",
          severity: "warning",
          ruleId: "cable_route_equipment_clearance",
          ruleLabel: "Cable corridor clear of equipment",
          objectAId: "route-1",
          objectBId: "bess-1",
          source: "test source",
          message: "Cable Route 1 overlaps BESS 1.",
          recommendation: "Re-route corridor",
          basis: "conservative_criterion",
        },
        {
          id: "issue-fire-setback-missing-poly",
          severity: "warning",
          ruleId: "fire_boundary_setback",
          ruleLabel: "Fire setback to site boundary",
          objectAId: "project",
          source: "test source",
          message: "Fire setback cannot be evaluated without polygon.",
          recommendation: "Define polygon",
          basis: "requires_validation",
        },
      ],
      electricalIssues: [
        {
          id: "rule-elec-006-feeder-power-overload-f-1",
          severity: "critical",
          message: "MV feeder f-1 is overloaded.",
          recommendation: "Reduce load",
          basis: "calculated",
          affectedIds: ["f-1"],
        },
      ],
    });

    const rule6 = result.rules.find((r) => r.ruleId === "RULE-ELEC-006");
    expect(rule6).toBeDefined();
    expect(rule6!.outcome).toBe("violation");
    expect(rule6!.violations.length).toBe(1);

    const rule9 = result.rules.find((r) => r.ruleId === "RULE-PHYS-009");
    expect(rule9).toBeDefined();
    expect(rule9!.outcome).toBe("violation");
    expect(rule9!.violations.length).toBe(1);

    const rule5 = result.rules.find((r) => r.ruleId === "RULE-PHYS-005");
    expect(rule5).toBeDefined();
    expect(rule5!.outcome).toBe("violation");
    expect(rule5!.violations.length).toBe(1);

    const ruleRep1 = result.rules.find((r) => r.ruleId === "RULE-REP-001");
    expect(ruleRep1).toBeDefined();
    expect(ruleRep1!.outcome).toBe("pass");
  });
});

describe("runRegulatoryEvaluation — physical validations mapping", () => {
  it("maps equipment_inside_polygon and equipment_collision issues without external norm metadata", () => {
    const result = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      physicalIssues: [
        {
          id: "issue-containment",
          severity: "critical",
          ruleId: "equipment_inside_polygon",
          ruleLabel: "Equipment inside site polygon",
          objectAId: "bess-1",
          source: "Geometric layout check",
          message: "Equipment bess-1 is outside polygon.",
          recommendation: "Reposition the equipment",
          basis: "user_defined",
        },
        {
          id: "issue-collision",
          severity: "critical",
          ruleId: "equipment_collision",
          ruleLabel: "No equipment footprint collisions",
          objectAId: "bess-1",
          objectBId: "bess-2",
          source: "Geometric layout check",
          message: "Footprint collision detected between bess-1 and bess-2.",
          recommendation: "Separate the equipment",
          basis: "user_defined",
        },
      ],
    });

    const rule1 = result.rules.find((r) => r.ruleId === "RULE-PHYS-001");
    expect(rule1).toBeDefined();
    expect(rule1!.outcome).toBe("violation");
    expect(rule1!.violations.length).toBe(1);
    expect(rule1!.violations[0].message).toBe("Equipment bess-1 is outside polygon.");

    const rule2 = result.rules.find((r) => r.ruleId === "RULE-PHYS-002");
    expect(rule2).toBeDefined();
    expect(rule2!.outcome).toBe("violation");
    expect(rule2!.violations.length).toBe(1);
    expect(rule2!.violations[0].message).toBe("Footprint collision detected between bess-1 and bess-2.");
  });
});
