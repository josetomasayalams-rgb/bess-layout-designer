/**
 * Report Design Upgrade — guards for the executive/visual redesign of the
 * preliminary technical PDF.
 *
 * These tests pin the behaviours the redesign introduced:
 *   - exclusions are grouped into thematic categories for the body;
 *   - recommended next steps always close with detail-engineering;
 *   - the executive result sentence stays in preliminary language (no
 *     "garantizado/óptimo/perfecto/definitivo");
 *   - outcome/severity labels are translated to Spanish;
 *   - no report component source ships the U+2192 arrow glyph, which the
 *     standard react-pdf font set cannot encode (renders as a notdef box).
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { toLngLat } from "@/lib/geometry/projection";
import type { ProjectAnchor } from "@/types/geometry";
import { buildReportData } from "@/lib/report/buildReportData";
import {
  buildNextSteps,
  groupExclusions,
  maturityLevel,
  resultSentence,
} from "./pdfFormatters";
import { OUTCOME_LABEL, SEVERITY_LABEL } from "./pdfSeverityMaps";

function buildData() {
  const anchor: ProjectAnchor = { lng0: -70.2, lat0: -24.1 };
  return buildReportData({
    projectName: "redesign-test",
    appVersion: "redesign-test",
    locale: "es",
    polygon: [
      toLngLat({ x_m: 0, y_m: 0 }, anchor),
      toLngLat({ x_m: 100, y_m: 0 }, anchor),
      toLngLat({ x_m: 100, y_m: 100 }, anchor),
      toLngLat({ x_m: 0, y_m: 100 }, anchor),
    ],
    anchor,
    placed: [],
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
  });
}

describe("groupExclusions", () => {
  it("groups the default exclusions into thematic categories", () => {
    const data = buildData();
    const groups = groupExclusions(data.exclusions);
    expect(groups.length).toBeGreaterThan(0);
    // No empty groups are emitted.
    for (const g of groups) {
      expect(g.items.length).toBeGreaterThan(0);
      expect(typeof g.category).toBe("string");
    }
    // The default exclusion set is electrical-heavy, so that category exists.
    const categories = groups.map((g) => g.category);
    expect(categories).toContain("Estudios eléctricos");
  });

  it("preserves every exclusion across all groups (none dropped)", () => {
    const data = buildData();
    const groups = groupExclusions(data.exclusions);
    const grouped = groups.reduce((acc, g) => acc + g.items.length, 0);
    expect(grouped).toBe(data.exclusions.length);
  });
});

describe("buildNextSteps", () => {
  it("always closes with the detail-engineering step", () => {
    const data = buildData();
    const steps = buildNextSteps(data);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[steps.length - 1].toLowerCase()).toContain("ingeniería de detalle");
  });
});

describe("resultSentence / maturityLevel", () => {
  it("uses preliminary language without guarantee words", () => {
    const data = buildData();
    const sentence = resultSentence(data).toLowerCase();
    for (const banned of ["garantiz", "óptimo", "optimo", "perfecto", "definitivo"]) {
      expect(sentence).not.toContain(banned);
    }
    expect(sentence).toContain("preliminar");
  });

  it("never declares detail engineering as resolved", () => {
    const data = buildData();
    const m = maturityLevel(data);
    expect(["Prefactibilidad", "Prediseño preliminar"]).toContain(m.label);
  });
});

describe("Spanish severity / outcome labels", () => {
  it("translates outcome codes to Spanish", () => {
    expect(OUTCOME_LABEL.pass.label).toBe("Sin inconformidades");
    expect(OUTCOME_LABEL.violation.label).toBe("Inconformidad");
    expect(OUTCOME_LABEL.pending_validation.label).toBe("Pendiente");
    expect(OUTCOME_LABEL.manual_check.label).toBe("Revisión");
  });

  it("translates severity codes to Spanish", () => {
    expect(SEVERITY_LABEL.blocking).toBe("Bloqueante");
    expect(SEVERITY_LABEL.warning).toBe("Aviso");
  });
});

describe("PDF font safety — no unencodable arrow glyph", () => {
  it("no report component source contains the U+2192 arrow", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(here).filter(
      (f) => /^pdf.*\.tsx?$/.test(f) && !f.includes(".test."),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const content = readFileSync(join(here, f), "utf8");
      expect(content.includes("→"), `${f} contains U+2192`).toBe(false);
      expect(content.includes("￾"), `${f} contains notdef`).toBe(false);
    }
  });
});
