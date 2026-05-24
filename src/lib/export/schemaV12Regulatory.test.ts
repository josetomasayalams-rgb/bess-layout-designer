import { describe, it, expect } from "vitest";
import {
  buildExportedProject,
  projectRegulatoryEvaluation,
} from "@/lib/export/exportJson";
import { evaluateRegulatoryProfile } from "@/rules/regulatoryProfileEvaluator";

const baseArgs = {
  anchor: null,
  polygon: [],
  placed: [],
  summary: {
    battery_container_count: 0,
    pcs_count: 0,
    total_apparent_power_mva: 0,
    total_energy_mwh_dc_bol: 0,
    duration_hours_gross: null,
    site_area: null,
    occupied_area_m2: 0,
    occupation_ratio: null,
  },
  warnings: [],
};

describe("buildExportedProject — regulatory_evaluation", () => {
  it("includes regulatory_evaluation when supplied", () => {
    const evaluation = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      evaluatedAt: "2026-05-23T00:00:00.000Z",
    });
    const out = buildExportedProject({
      ...baseArgs,
      v12: { regulatoryEvaluation: evaluation },
    });
    expect(out.regulatory_evaluation).toBeDefined();
    expect(out.regulatory_evaluation!.profile_id).toBe("chile-utility-predesign");
    expect(out.regulatory_evaluation!.rules.length).toBeGreaterThan(0);
    // Document refs auto-merged from evaluation.
    expect(out.document_registry_refs?.length).toBeGreaterThan(0);
  });

  it("merges document_registry_refs from the project and the evaluation", () => {
    const evaluation = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
    });
    const out = buildExportedProject({
      ...baseArgs,
      v12: {
        regulatoryEvaluation: evaluation,
        documentRegistryRefs: ["SEC-RGR-06-2024"],
      },
    });
    expect(out.document_registry_refs).toContain("SEC-RGR-06-2024");
    expect(new Set(out.document_registry_refs).size).toBe(
      out.document_registry_refs!.length
    );
  });

  it("omits regulatory_evaluation when not supplied", () => {
    const out = buildExportedProject(baseArgs);
    expect(out.regulatory_evaluation).toBeUndefined();
  });
});

describe("projectRegulatoryEvaluation projection", () => {
  it("projects a flat JSON-ready shape", () => {
    const evaluation = evaluateRegulatoryProfile({
      profileId: "chile-utility-predesign",
      evaluatedAt: "2026-05-23T00:00:00.000Z",
    });
    const flat = projectRegulatoryEvaluation(evaluation);
    expect(flat.profile_id).toBe("chile-utility-predesign");
    expect(flat.evaluated_at).toBe("2026-05-23T00:00:00.000Z");
    expect(flat.totals).toBeDefined();
    expect(typeof flat.totals.pass).toBe("number");
    expect(typeof flat.totals.violation).toBe("number");
    expect(Array.isArray(flat.rules)).toBe(true);
    expect(Array.isArray(flat.document_registry_refs)).toBe(true);
    expect(JSON.stringify(flat).length).toBeGreaterThan(100);
  });
});
