import { describe, expect, it } from "vitest";
import {
  buildProvenanceLegend,
  classifyConfidence,
  classifyEvidence,
  classifyKpiSource,
  presentValue,
  unavailableLabel,
} from "./reportProvenance";
import { EVIDENCE_NONE, type EvidenceRef } from "@/types/evidence";

describe("reportProvenance", () => {
  it("maps evidence confidence to report classification", () => {
    expect(classifyConfidence("documented")).toBe("certified");
    expect(classifyConfidence("derived")).toBe("calculated");
    expect(classifyConfidence("inferred")).toBe("calculated");
    expect(classifyConfidence("assumption")).toBe("preliminary");
    expect(classifyConfidence("missing")).toBe("pending");
  });

  it("classifies a value from its strongest evidence", () => {
    const refs: EvidenceRef[] = [
      { documentId: EVIDENCE_NONE, confidence: "assumption" },
      { documentId: "doc-1", confidence: "documented" },
    ];
    expect(classifyEvidence(refs)).toBe("certified");
    expect(classifyEvidence([])).toBe("pending"); // empty → missing → pending
  });

  it("never presents layout-derived KPIs as certified", () => {
    expect(classifyKpiSource("documented_targets")).toBe("certified");
    expect(classifyKpiSource("layout_inventory")).toBe("calculated");
    expect(classifyKpiSource("mixed")).toBe("calculated");
  });

  it("presents available values and a canonical unavailable label otherwise", () => {
    const fmt = (v: number) => `${v} MW`;
    expect(presentValue(200, fmt, "en")).toEqual({ text: "200 MW", isAvailable: true });
    expect(presentValue(null, fmt, "en")).toEqual({
      text: unavailableLabel("en"),
      isAvailable: false,
    });
    expect(presentValue(undefined, fmt, "es").isAvailable).toBe(false);
    expect(presentValue(Number.NaN, fmt, "en").isAvailable).toBe(false);
  });

  it("has distinct bilingual unavailable labels mentioning detailed engineering", () => {
    expect(unavailableLabel("en")).toMatch(/detailed engineering/i);
    expect(unavailableLabel("es")).toMatch(/ingeniería de detalle/i);
    expect(unavailableLabel("en")).not.toBe(unavailableLabel("es"));
  });

  it("builds an honest legend with only the classifications present, in canonical order", () => {
    const legend = buildProvenanceLegend(["pending", "certified", "certified"], "en");
    expect(legend.map((l) => l.classification)).toEqual(["certified", "pending"]);
    expect(buildProvenanceLegend([], "en")).toEqual([]);
  });
});
