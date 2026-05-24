import { describe, it, expect } from "vitest";
import {
  asAssumption,
  asDerived,
  asDocumented,
  asInferred,
  asMissing,
  bestConfidence,
  EVIDENCE_NONE,
  type EvidenceRef,
} from "./evidence";

describe("evidence helpers", () => {
  it("asAssumption marks confidence and uses sentinel id", () => {
    const v = asAssumption(200, "default target MW", "MW");
    expect(v.value).toBe(200);
    expect(v.unit).toBe("MW");
    expect(v.evidence).toHaveLength(1);
    expect(v.evidence[0].confidence).toBe("assumption");
    expect(v.evidence[0].documentId).toBe(EVIDENCE_NONE);
    expect(v.evidence[0].note).toBe("default target MW");
  });

  it("asDerived marks confidence as derived and records formula in note", () => {
    const v = asDerived(0.9083, "800 / 880.80384", "");
    expect(v.evidence[0].confidence).toBe("derived");
    expect(v.evidence[0].note).toBe("800 / 880.80384");
  });

  it("asInferred marks confidence as inferred", () => {
    const v = asInferred(4, "Pattern of 4 stations per feeder from unifilar p.13");
    expect(v.evidence[0].confidence).toBe("inferred");
  });

  it("asDocumented forces confidence to documented", () => {
    const v = asDocumented(
      200,
      { documentId: "PROJ-BESS-DESIERTO-1129", page: 6, section: "Resumen ejecutivo" },
      "MW"
    );
    expect(v.value).toBe(200);
    expect(v.evidence[0].confidence).toBe("documented");
    expect(v.evidence[0].documentId).toBe("PROJ-BESS-DESIERTO-1129");
    expect(v.evidence[0].page).toBe(6);
  });

  it("asMissing flags mustVerifyBeforeIFC", () => {
    const v = asMissing(0, "Container dimensions pending datasheet");
    expect(v.value).toBe(0);
    expect(v.evidence[0].confidence).toBe("missing");
    expect(v.mustVerifyBeforeIFC).toBe(true);
  });
});

describe("bestConfidence", () => {
  it("returns missing for empty list", () => {
    expect(bestConfidence([])).toBe("missing");
  });

  it("prefers documented over derived", () => {
    const refs: EvidenceRef[] = [
      { documentId: "__none__", confidence: "derived" },
      { documentId: "DOC-A", confidence: "documented" },
    ];
    expect(bestConfidence(refs)).toBe("documented");
  });

  it("prefers derived over inferred", () => {
    const refs: EvidenceRef[] = [
      { documentId: "__none__", confidence: "inferred" },
      { documentId: "__none__", confidence: "derived" },
    ];
    expect(bestConfidence(refs)).toBe("derived");
  });

  it("returns missing when all are missing", () => {
    const refs: EvidenceRef[] = [
      { documentId: "__none__", confidence: "missing" },
      { documentId: "__none__", confidence: "missing" },
    ];
    expect(bestConfidence(refs)).toBe("missing");
  });

  it("falls back to assumption when no stronger evidence is present", () => {
    const refs: EvidenceRef[] = [
      { documentId: "__none__", confidence: "assumption" },
    ];
    expect(bestConfidence(refs)).toBe("assumption");
  });
});
