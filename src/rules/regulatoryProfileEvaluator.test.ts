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
