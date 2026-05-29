/**
 * ReportDocument — PDF react-pdf con estilo paper técnico (Fase 11).
 *
 * Componentes: <Document>, <Page>, <View>, <Text>, <Image>, <Svg>.
 * No usa Tailwind: estilos en `reportStyles.ts`.
 */

import {
  Document,
} from "@react-pdf/renderer";
import type { TechnicalReportData } from "@/lib/report/buildReportData";
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
      <LocationSection data={data} />
      <DesignSection data={data} />
      <LayoutSection data={data} />
      <ElectricalSection data={data} />
      <PreliminaryElectricalChecksSection data={data} />
      <RegulatorySection data={data} />
      <TraceabilitySection data={data} />
      <ScopeSection data={data} />
      <RegulatoryAnnexSection data={data} />
      <EngineeringAnnexSection data={data} />
    </Document>
  );
}
