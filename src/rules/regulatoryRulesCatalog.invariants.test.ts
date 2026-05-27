/**
 * Invariantes globales del catálogo regulatorio.
 *
 * Estos tests no validan reglas individuales; verifican propiedades
 * que TODO el catálogo debe cumplir para mantener la defensibilidad
 * del MVP (matriz L1–L7, severityCeiling).
 *
 * Si una regla viola un invariante el fix correcto es ajustar la
 * regla, no relajar el invariante.
 */

import { describe, expect, it } from "vitest";
import { regulatoryRulesCatalog } from "@/rules/regulatoryRulesCatalog";
import {
  effectiveSeverity,
  maxSeverityForLevel,
  strongestCitedLevel,
} from "@/rules/severityCeiling";
import { findDocument } from "@/data/documentRegistry";
import { EVIDENCE_NONE } from "@/types/evidence";

describe("regulatoryRulesCatalog — invariants", () => {
  it("every rule's effective severity respects its level ceiling", () => {
    const SEVERITY_RANK = {
      blocking: 0,
      warning: 1,
      info: 2,
      checklist: 3,
      out_of_scope: 4,
    } as const;

    for (const rule of regulatoryRulesCatalog) {
      const level = strongestCitedLevel(rule.evidence);
      if (!level) continue; // procedural rule, no ceiling
      const ceiling = maxSeverityForLevel(level);
      const { severity } = effectiveSeverity(rule);
      expect(
        SEVERITY_RANK[severity] >= SEVERITY_RANK[ceiling],
        `${rule.id}: effective ${severity} stricter than ceiling ${ceiling} (level ${level})`
      ).toBe(true);
    }
  });

  it("no rule emits effective 'blocking' without L1 + documented evidence", () => {
    for (const rule of regulatoryRulesCatalog) {
      const { severity } = effectiveSeverity(rule);
      if (severity !== "blocking") continue;
      const hasL1Documented = rule.evidence.some((ref) => {
        if (!ref.documentId || ref.documentId === EVIDENCE_NONE) {
          // EVIDENCE_NONE + 'derived' is the only legitimate
          // procedural-blocking path (geometry, collision).
          return ref.confidence === "derived";
        }
        const entry = findDocument(ref.documentId);
        return (
          entry?.level === "L1_oem_exact_equipment" &&
          ref.confidence === "documented"
        );
      });
      expect(
        hasL1Documented,
        `${rule.id}: effective severity is 'blocking' without L1+documented (or derived procedural) evidence`
      ).toBe(true);
    }
  });

  it("every rule cites at least one evidence reference", () => {
    for (const rule of regulatoryRulesCatalog) {
      expect(
        rule.evidence.length,
        `${rule.id}: evidence array is empty`
      ).toBeGreaterThan(0);
    }
  });

  it("every cited documentId either is EVIDENCE_NONE or exists in the registry", () => {
    for (const rule of regulatoryRulesCatalog) {
      for (const ref of rule.evidence) {
        if (!ref.documentId || ref.documentId === EVIDENCE_NONE) continue;
        expect(
          findDocument(ref.documentId),
          `${rule.id}: cites unknown document ${ref.documentId}`
        ).toBeDefined();
      }
    }
  });

  it("rule ids are unique", () => {
    const ids = regulatoryRulesCatalog.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
