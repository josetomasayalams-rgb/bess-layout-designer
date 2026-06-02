/**
 * ReportDocument — PDF react-pdf con estilo paper técnico.
 *
 * Componentes: <Document>, <Page>, <View>, <Text>, <Image>, <Svg>.
 * No usa Tailwind: estilos en `reportStyles.ts`.
 *
 * Information architecture: a cover + 5 body sections + 2 annexes. Several
 * legacy sections are grouped onto merged pages via `SectionPage embedded`
 * (their content is unchanged; they render as sub-blocks):
 *   1  Resumen ejecutivo
 *   2  Sitio y layout                         (Location + Layout)
 *   3  Configuración BESS y arquitectura      (Design + Electrical)
 *   4  Hallazgos y validación normativa       (Regulatory + Traceability)
 *   5  Alcance, exclusiones y próximos estudios
 *   A1 Anexo: tabla completa de reglas
 *   A2 Anexo técnico                          (Preliminary electrical checks + Engineering annex)
 */

import { Document } from "@react-pdf/renderer";
// Side-effect import: registers the self-hosted Inter brand face before any
// page renders. Must precede the section imports that consume the fonts.
import "./registerReportFonts";
import type { TechnicalReportData } from "@/lib/report/buildReportData";
import { SectionPage } from "./pdfPrimitives";
import { CoverPage } from "./pdfChrome";
import {
  ElectricalSection,
  PreliminaryElectricalChecksSection,
  RegulatorySection,
} from "./pdfElectricalRegulatorySections";
import {
  DesignSection,
  ExecutiveSection,
  LayoutSection,
  LocationSection,
} from "./pdfProjectSections";
import {
  EngineeringAnnexSection,
  RegulatoryAnnexSection,
  ScopeSection,
  TraceabilitySection,
} from "./pdfTraceabilityScopeSections";

type Props = { data: TechnicalReportData };

// ──────────────────────────────────────────────────────────────────
// Merged pages — group related sections under one page header.
// ──────────────────────────────────────────────────────────────────

function SiteAndLayoutSection({ data }: Props) {
  return (
    <SectionPage data={data} number="2" title="Sitio y layout">
      <LocationSection data={data} embedded />
      <LayoutSection data={data} embedded />
    </SectionPage>
  );
}

function ConfigurationAndElectricalSection({ data }: Props) {
  return (
    <SectionPage
      data={data}
      number="3"
      title="Configuración BESS y arquitectura eléctrica"
    >
      <DesignSection data={data} embedded />
      <ElectricalSection data={data} embedded />
    </SectionPage>
  );
}

function FindingsSection({ data }: Props) {
  return (
    <SectionPage data={data} number="4" title="Hallazgos y validación normativa">
      <RegulatorySection data={data} embedded />
      <TraceabilitySection data={data} embedded />
    </SectionPage>
  );
}

function TechnicalAnnexSection({ data }: Props) {
  return (
    <SectionPage
      data={data}
      number="A2"
      title="Anexo técnico: validaciones eléctricas y referencias"
    >
      <PreliminaryElectricalChecksSection data={data} embedded />
      <EngineeringAnnexSection data={data} embedded />
    </SectionPage>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main document
// ──────────────────────────────────────────────────────────────────

export function ReportDocument({ data }: Props) {
  return (
    <Document
      title={data.metadata.title}
      author="BESS Layout Designer"
      subject={data.metadata.projectName}
      creationDate={new Date()}
    >
      <CoverPage data={data} />
      <ExecutiveSection data={data} />
      <SiteAndLayoutSection data={data} />
      <ConfigurationAndElectricalSection data={data} />
      <FindingsSection data={data} />
      <ScopeSection data={data} />
      <RegulatoryAnnexSection data={data} />
      <TechnicalAnnexSection data={data} />
    </Document>
  );
}
