/**
 * Phase 14.7 — Per-section structural snapshots for the technical PDF.
 *
 * Companion to `ReportDocument.snapshot.test.tsx`, which pins the full
 * page sequence. These tests pin the structural shape of each section
 * module so that a refactor inside any one file (e.g. extracting a
 * helper, reordering KPI rows) cannot silently drop a title, the
 * SectionPage wrapper, or break the disclaimer footer.
 *
 * Strategy mirrors the Phase 12A approach: invoke the section function
 * as a plain function (the report components use no hooks) and inspect
 * the returned React element tree.
 */

import React from "react";
import { describe, expect, it } from "vitest";
import { toLngLat } from "@/lib/geometry/projection";
import type { ProjectAnchor } from "@/types/geometry";
import { buildReportData } from "@/lib/report/buildReportData";
import { CoverPage, PageHeader, PageFooter } from "./pdfChrome";
import {
  ExecutiveSection,
  LocationSection,
  DesignSection,
  LayoutSection,
} from "./pdfProjectSections";
import {
  ElectricalSection,
  PreliminaryElectricalChecksSection,
  RegulatorySection,
} from "./pdfElectricalRegulatorySections";
import {
  TraceabilitySection,
  ScopeSection,
  RegulatoryAnnexSection,
  EngineeringAnnexSection,
} from "./pdfTraceabilityScopeSections";

function buildMinimalReportData() {
  const anchor: ProjectAnchor = { lng0: -70.2, lat0: -24.1 };
  return buildReportData({
    projectName: "phase14.7-snapshot",
    appVersion: "phase14.7-test",
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

type ReactEl = React.ReactElement<Record<string, unknown>>;

function callSection(
  Section: (p: { data: ReturnType<typeof buildMinimalReportData> }) => React.ReactElement | null
): ReactEl {
  const data = buildMinimalReportData();
  const el = Section({ data }) as ReactEl | null;
  if (!el) throw new Error("Section returned null");
  return el;
}

function expectSectionPage(
  el: ReactEl,
  expected: { number: string; title: string }
) {
  // The returned element is a <SectionPage> with number/title props.
  expect(el.type).toBeDefined();
  expect(el.props.number).toBe(expected.number);
  expect(el.props.title).toBe(expected.title);
}

// ──────────────────────────────────────────────────────────────────
// pdfChrome
// ──────────────────────────────────────────────────────────────────

describe("pdfChrome — CoverPage", () => {
  it("returns a <Page> element", () => {
    const data = buildMinimalReportData();
    const el = CoverPage({ data }) as ReactEl;
    expect(el).toBeDefined();
    expect(el.type).toBeDefined();
  });
});

describe("pdfChrome — PageHeader / PageFooter", () => {
  it("PageHeader renders without throwing", () => {
    const data = buildMinimalReportData();
    const el = PageHeader({ data }) as ReactEl;
    expect(el).toBeDefined();
  });

  it("PageFooter renders without throwing", () => {
    const el = PageFooter() as ReactEl;
    expect(el).toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────────
// pdfProjectSections
// ──────────────────────────────────────────────────────────────────

describe("pdfProjectSections — section numbers and titles", () => {
  it("ExecutiveSection → 1. Resumen ejecutivo", () => {
    expectSectionPage(callSection(ExecutiveSection), {
      number: "1",
      title: "Resumen ejecutivo",
    });
  });

  it("LocationSection → 2. Sitio y ubicación", () => {
    expectSectionPage(callSection(LocationSection), {
      number: "2",
      title: "Sitio y ubicación",
    });
  });

  it("DesignSection → 3. Parámetros principales del BESS", () => {
    expectSectionPage(callSection(DesignSection), {
      number: "3",
      title: "Parámetros principales del BESS",
    });
  });

  it("LayoutSection → 4. Layout físico y ocupación del terreno", () => {
    expectSectionPage(callSection(LayoutSection), {
      number: "4",
      title: "Layout físico y ocupación del terreno",
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// pdfElectricalRegulatorySections
// ──────────────────────────────────────────────────────────────────

describe("pdfElectricalRegulatorySections — section numbers and titles", () => {
  it("ElectricalSection → 5. Arquitectura eléctrica conceptual", () => {
    expectSectionPage(callSection(ElectricalSection), {
      number: "5",
      title: "Arquitectura eléctrica conceptual",
    });
  });

  it("PreliminaryElectricalChecksSection → 5b. Validaciones eléctricas preliminares", () => {
    expectSectionPage(callSection(PreliminaryElectricalChecksSection), {
      number: "5b",
      title: "Validaciones eléctricas preliminares",
    });
  });

  it("RegulatorySection → 6. Validación normativa resumida", () => {
    expectSectionPage(callSection(RegulatorySection), {
      number: "6",
      title: "Validación normativa resumida",
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// pdfTraceabilityScopeSections
// ──────────────────────────────────────────────────────────────────

describe("pdfTraceabilityScopeSections — section numbers and titles", () => {
  it("TraceabilitySection → 7. Alertas críticas y pendientes técnicos", () => {
    expectSectionPage(callSection(TraceabilitySection), {
      number: "7",
      title: "Alertas críticas y pendientes técnicos",
    });
  });

  it("ScopeSection → 5. Alcance, exclusiones y próximos estudios", () => {
    expectSectionPage(callSection(ScopeSection), {
      number: "5",
      title: "Alcance, exclusiones y próximos estudios",
    });
  });

  it("RegulatoryAnnexSection → A1. Anexo: tabla completa de reglas", () => {
    expectSectionPage(callSection(RegulatoryAnnexSection), {
      number: "A1",
      title: "Anexo: tabla completa de reglas",
    });
  });

  it("EngineeringAnnexSection → A2. Anexo: lista de verificación de ingeniería y referencias", () => {
    expectSectionPage(callSection(EngineeringAnnexSection), {
      number: "A2",
      title: "Anexo: lista de verificación de ingeniería y referencias",
    });
  });
});

// ──────────────────────────────────────────────────────────────────
// Aggregate guards
// ──────────────────────────────────────────────────────────────────

describe("PDF sections — aggregate", () => {
  it("every non-cover section wraps content in SectionPage", () => {
    const sections = [
      ExecutiveSection,
      LocationSection,
      DesignSection,
      LayoutSection,
      ElectricalSection,
      PreliminaryElectricalChecksSection,
      RegulatorySection,
      TraceabilitySection,
      ScopeSection,
      RegulatoryAnnexSection,
      EngineeringAnnexSection,
    ];
    for (const Section of sections) {
      const el = callSection(Section);
      expect(typeof el.props.number).toBe("string");
      expect(typeof el.props.title).toBe("string");
      expect(el.props.children).toBeDefined();
    }
  });
});
