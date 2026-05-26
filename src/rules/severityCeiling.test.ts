import { describe, expect, it } from "vitest";
import {
  effectiveSeverity,
  maxSeverityForConfidence,
  maxSeverityForLevel,
  strongestCitedLevel,
  strongestConfidence,
} from "@/rules/severityCeiling";
import { EVIDENCE_NONE } from "@/types/evidence";
import type { RegulatoryRuleDefinition } from "@/rules/types";

const baseRule = (
  overrides: Partial<RegulatoryRuleDefinition>
): RegulatoryRuleDefinition => ({
  id: "TEST-RULE",
  category: "physical_layout",
  severity: "blocking",
  title: "Test rule",
  description: "Synthetic rule used by severityCeiling tests.",
  automation: "yes",
  status: "implemented",
  priority: "P1",
  evidence: [],
  appliesToProfiles: ["chile-utility-predesign"],
  ...overrides,
});

describe("severityCeiling — maxSeverityForLevel", () => {
  it("L1 keeps blocking", () => {
    expect(maxSeverityForLevel("L1_oem_exact_equipment")).toBe("blocking");
  });
  it("L2/L3/L4/L6 cap at warning", () => {
    expect(maxSeverityForLevel("L2_oem_same_family")).toBe("warning");
    expect(maxSeverityForLevel("L3_standard_or_official")).toBe("warning");
    expect(maxSeverityForLevel("L4_public_project_or_authority")).toBe("warning");
    expect(maxSeverityForLevel("L6_inferred_assumption")).toBe("warning");
  });
  it("L5 caps at info", () => {
    expect(maxSeverityForLevel("L5_whitepaper_brochure")).toBe("info");
  });
  it("L7 caps at checklist", () => {
    expect(maxSeverityForLevel("L7_unverifiable_pending")).toBe("checklist");
  });
});

describe("severityCeiling — maxSeverityForConfidence", () => {
  it("documented / derived carry no ceiling", () => {
    expect(maxSeverityForConfidence("documented")).toBeNull();
    expect(maxSeverityForConfidence("derived")).toBeNull();
  });
  it("inferred / assumption cap at warning", () => {
    expect(maxSeverityForConfidence("inferred")).toBe("warning");
    expect(maxSeverityForConfidence("assumption")).toBe("warning");
  });
  it("missing caps at checklist", () => {
    expect(maxSeverityForConfidence("missing")).toBe("checklist");
  });
});

describe("severityCeiling — strongest helpers", () => {
  it("strongestCitedLevel ignores EVIDENCE_NONE", () => {
    const lvl = strongestCitedLevel([
      { documentId: EVIDENCE_NONE, confidence: "derived" },
    ]);
    expect(lvl).toBeNull();
  });

  it("strongestCitedLevel picks the lowest L number among cited docs", () => {
    const lvl = strongestCitedLevel([
      { documentId: "SUNGROW-PT2-WP-2024", confidence: "inferred" }, // L5
      { documentId: "SUNGROW-ST2752UX-V15", confidence: "documented" }, // L1
    ]);
    expect(lvl).toBe("L1_oem_exact_equipment");
  });

  it("strongestCitedLevel ignores unknown documentIds", () => {
    const lvl = strongestCitedLevel([
      { documentId: "DOES-NOT-EXIST", confidence: "documented" },
    ]);
    expect(lvl).toBeNull();
  });

  it("strongestConfidence picks the strictest confidence", () => {
    expect(
      strongestConfidence([
        { documentId: EVIDENCE_NONE, confidence: "missing" },
        { documentId: EVIDENCE_NONE, confidence: "documented" },
      ])
    ).toBe("documented");
  });
});

describe("severityCeiling — effectiveSeverity", () => {
  it("procedural rule (derived only) keeps declared blocking", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "blocking",
        evidence: [{ documentId: EVIDENCE_NONE, confidence: "derived" }],
      })
    );
    expect(result.severity).toBe("blocking");
    expect(result.cappedBy).toBeNull();
  });

  it("L1 + documented allows blocking", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "blocking",
        evidence: [
          { documentId: "SUNGROW-ST2752UX-V15", confidence: "documented" },
        ],
      })
    );
    expect(result.severity).toBe("blocking");
    expect(result.cappedBy).toBeNull();
  });

  it("L5 whitepaper caps blocking to info", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "blocking",
        evidence: [
          { documentId: "SUNGROW-PT2-WP-2024", confidence: "documented" },
        ],
      })
    );
    expect(result.severity).toBe("info");
    expect(result.cappedBy?.by).toBe("document_level");
  });

  it("L7 internal summary caps blocking to checklist", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "blocking",
        evidence: [
          { documentId: "INT-Normativa-BESS-Utility-Chile", confidence: "documented" },
        ],
      })
    );
    expect(result.severity).toBe("checklist");
    expect(result.cappedBy?.by).toBe("document_level");
  });

  it("L3 standard with confidence missing caps blocking to checklist", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "blocking",
        evidence: [{ documentId: "SEC-RGR-06-2024", confidence: "missing" }],
      })
    );
    expect(result.severity).toBe("checklist");
    // The confidence ceiling kicks in (more restrictive than the L3 ceiling).
    expect(result.cappedBy?.by).toBe("confidence");
  });

  it("L1 with confidence inferred caps blocking to warning", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "blocking",
        evidence: [
          { documentId: "SUNGROW-ST2752UX-V15", confidence: "inferred" },
        ],
      })
    );
    expect(result.severity).toBe("warning");
    expect(result.cappedBy?.by).toBe("confidence");
  });

  it("declared severity already softer than ceiling is not raised", () => {
    const result = effectiveSeverity(
      baseRule({
        severity: "info",
        evidence: [
          { documentId: "SUNGROW-ST2752UX-V15", confidence: "documented" },
        ],
      })
    );
    expect(result.severity).toBe("info");
    expect(result.cappedBy).toBeNull();
  });
});
