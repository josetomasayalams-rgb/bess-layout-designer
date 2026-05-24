import { describe, expect, it } from "vitest";
import { documentRegistry } from "@/data/documentRegistry";
import { EVIDENCE_NONE } from "@/types/evidence";
import {
  getRegulatoryRule,
  regulatoryRulesByCategory,
  regulatoryRulesByProfile,
  regulatoryRulesByStatus,
  regulatoryRulesCatalog,
} from "@/rules/regulatoryRulesCatalog";

const documentIds = new Set(documentRegistry.map((document) => document.id));
const primaryDocumentIds = new Set(
  documentRegistry.filter((document) => document.isPrimary).map((document) => document.id)
);

describe("regulatoryRulesCatalog", () => {
  it("contains the candidate rule matrix for Phase 9", () => {
    expect(regulatoryRulesCatalog.length).toBeGreaterThanOrEqual(50);
    expect(getRegulatoryRule("RULE-SEC-001")?.status).toBe("pending_validation");
    expect(getRegulatoryRule("RULE-ELEC-003")?.status).toBe("implemented");
    expect(getRegulatoryRule("RULE-FIRE-001")?.description).toContain(
      "not be presented as Chilean legal approval"
    );
  });

  it("uses unique stable IDs", () => {
    const ids = regulatoryRulesCatalog.map((rule) => rule.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps every rule classified and evidenced", () => {
    for (const rule of regulatoryRulesCatalog) {
      expect(rule.category).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(rule.status).toBeTruthy();
      expect(rule.priority).toMatch(/^P[1-4]$/);
      expect(rule.evidence.length).toBeGreaterThan(0);
      expect(rule.appliesToProfiles.length).toBeGreaterThan(0);
    }
  });

  it("does not cite unknown documents", () => {
    const citedIds = regulatoryRulesCatalog.flatMap((rule) =>
      rule.evidence.map((evidence) => evidence.documentId)
    );

    for (const documentId of citedIds) {
      if (documentId === EVIDENCE_NONE) continue;
      expect(documentIds.has(documentId), documentId).toBe(true);
    }
  });

  it("uses primary documents for documented evidence", () => {
    const documentedEvidence = regulatoryRulesCatalog.flatMap((rule) =>
      rule.evidence.filter((evidence) => evidence.confidence === "documented")
    );

    expect(documentedEvidence.length).toBeGreaterThan(0);
    for (const evidence of documentedEvidence) {
      expect(evidence.documentId).not.toBe(EVIDENCE_NONE);
      expect(primaryDocumentIds.has(evidence.documentId), evidence.documentId).toBe(true);
    }
  });

  it("keeps Chilean normative rules pending or manual until human PDF reading", () => {
    const chileNormativeRules = regulatoryRulesCatalog.filter((rule) =>
      ["regulatory_sec", "regulatory_cne_cen", "regulatory_territorial", "regulatory_environmental"].includes(
        rule.category
      )
    );

    expect(chileNormativeRules.length).toBeGreaterThan(20);
    expect(
      chileNormativeRules.every((rule) =>
        ["pending_validation", "manual_check", "out_of_scope"].includes(rule.status)
      )
    ).toBe(true);
  });

  it("provides query helpers by category, profile and status", () => {
    expect(regulatoryRulesByCategory("regulatory_sec").length).toBeGreaterThanOrEqual(10);
    expect(regulatoryRulesByProfile("chile-utility-predesign").length).toBeGreaterThan(30);
    expect(regulatoryRulesByStatus("implemented").map((rule) => rule.id)).toContain(
      "RULE-ELEC-004"
    );
  });
});
