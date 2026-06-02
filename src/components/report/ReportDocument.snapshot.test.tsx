/**
 * Phase 12A — Protective structural snapshot for {@link ReportDocument}.
 *
 * Why this exists
 * ---------------
 * Phase 12A decomposes the 1,480-LOC `ReportDocument.tsx` monolith into
 * per-section files under `src/components/report/sections/`. The refactor
 * must preserve byte-equivalent PDF output: same number of pages, same
 * ordered sequence of `<SectionPage number="…" title="…">`, no insertion,
 * no removal, no reorder.
 *
 * This test pins that contract **before** any extraction commit lands.
 * If extraction accidentally drops `PreliminaryElectricalChecksSection`,
 * inserts a duplicate, swaps page 6 with page 7, or renames a title, the
 * suite fails loudly.
 *
 * Strategy
 * --------
 * No PDF bytes are rendered. We invoke `ReportDocument({ data })` to obtain
 * the `<Document>` React element, walk its children (one per page), and
 * invoke each child functional component as a plain function. The result
 * is either:
 *   - a `<Page>` element (CoverPage)
 *   - a `<SectionPage data number title>…</SectionPage>` element
 * We extract `number` / `title` from props and assert the full ordered
 * sequence.
 *
 * This is safe because `ReportDocument.tsx` uses zero React hooks (verified
 * pre-Phase-12). Calling these functional components outside React's
 * lifecycle is therefore deterministic and side-effect free.
 *
 * The contract pinned here intentionally does NOT depend on:
 *   - the magnitude of placed equipment
 *   - locale (titles are hard-coded Spanish in the PDF)
 *   - regulatory evaluation outcomes
 *   - case-study presence
 * It depends only on the structural skeleton of the document.
 */

import React from "react";
import { describe, expect, it } from "vitest";
import { toLngLat } from "@/lib/geometry/projection";
import type { ProjectAnchor } from "@/types/geometry";
import { buildReportData } from "@/lib/report/buildReportData";
import { ReportDocument } from "./ReportDocument";

type SectionDescriptor = {
  /** `number` prop of `<SectionPage>`. Cover page has none. */
  number?: string;
  /** `title` prop of `<SectionPage>`. Cover page has none. */
  title?: string;
};

/**
 * Frozen expected sequence as of merge commit `c8bf0e2` (pre-Phase 12A).
 * Order matches `ReportDocument.tsx` lines 1463–1473.
 */
const EXPECTED_SECTION_SEQUENCE: ReadonlyArray<SectionDescriptor> = Object.freeze([
  // Cover page — <Page> directly, no SectionPage wrapper, no number/title.
  {},
  { number: "1", title: "Resumen ejecutivo" },
  // 2 merges Location + Layout; 3 merges Design + Electrical; 4 merges
  // Regulatory + Traceability; A2 merges the preliminary electrical checks
  // (formerly 5b) + the engineering annex. Grouped sections render embedded.
  { number: "2", title: "Sitio y layout" },
  { number: "3", title: "Configuración BESS y arquitectura eléctrica" },
  { number: "4", title: "Hallazgos y validación normativa" },
  { number: "5", title: "Alcance, exclusiones y próximos estudios" },
  { number: "A1", title: "Anexo: tabla completa de reglas" },
  { number: "A2", title: "Anexo técnico: validaciones eléctricas y referencias" },
]);

/**
 * Build a minimal valid `TechnicalReportData`. We do not need realistic
 * engineering values — the structural skeleton of `<Document>` does not
 * depend on the magnitude of inputs.
 */
function buildMinimalReportData() {
  const anchor: ProjectAnchor = { lng0: -70.2, lat0: -24.1 };
  return buildReportData({
    projectName: "phase12a-protective-snapshot",
    appVersion: "phase12a-test",
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

type ChildElement = React.ReactElement<Record<string, unknown>>;

function getDocumentChildren(): ChildElement[] {
  const data = buildMinimalReportData();
  const documentElement = ReportDocument({ data }) as React.ReactElement<{
    children: React.ReactNode;
  }>;
  return React.Children.toArray(documentElement.props.children).filter(
    (child): child is ChildElement =>
      typeof child === "object" && child !== null && "type" in child,
  );
}

function describeChild(child: ChildElement): SectionDescriptor {
  // `child.type` is the functional component (CoverPage, ExecutiveSection, …).
  // We invoke it with its props to obtain its rendered element, then inspect
  // either the <SectionPage> or <Page> props for `number` / `title`.
  const Component = child.type as React.FC<Record<string, unknown>>;
  const rendered = Component(child.props) as React.ReactElement<{
    number?: string;
    title?: string;
  }> | null | undefined;
  if (!rendered || typeof rendered !== "object") {
    return {};
  }
  const props = rendered.props ?? {};
  const descriptor: SectionDescriptor = {};
  if (typeof props.number === "string") descriptor.number = props.number;
  if (typeof props.title === "string") descriptor.title = props.title;
  return descriptor;
}

describe("ReportDocument — Phase 12A protective structural snapshot", () => {
  it("renders exactly 8 pages (cover + 5 body sections + 2 annexes)", () => {
    const children = getDocumentChildren();
    expect(children.length).toBe(EXPECTED_SECTION_SEQUENCE.length);
  });

  it("preserves the exact ordered sequence of section numbers and titles", () => {
    const children = getDocumentChildren();
    const observed = children.map(describeChild);
    expect(observed).toEqual(EXPECTED_SECTION_SEQUENCE);
  });

  it("groups findings + regulatory validation into body section 4", () => {
    const children = getDocumentChildren();
    const fourth = describeChild(children[4]);
    expect(fourth.number).toBe("4");
    expect(fourth.title).toBe("Hallazgos y validación normativa");
  });

  it("includes the technical annex (A2) as the final page", () => {
    const children = getDocumentChildren();
    const last = describeChild(children[children.length - 1]);
    expect(last.number).toBe("A2");
    expect(last.title).toBe("Anexo técnico: validaciones eléctricas y referencias");
  });
});
