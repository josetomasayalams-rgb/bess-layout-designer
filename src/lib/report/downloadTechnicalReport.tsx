"use client";

import { pdf } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { ReportDocument } from "@/components/report/ReportDocument";
import {
  bessDelDesiertoPendingDataV12,
  getProjectCaseStudy,
} from "@/data/projectCaseStudies";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { buildReportData } from "@/lib/report/buildReportData";
import { captureMapImage } from "@/lib/report/captureMap";
import { reverseGeocode } from "@/lib/report/reverseGeocode";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import type { LngLat } from "@/types/geometry";

export type TechnicalReportDownloadOptions = {
  locale: "en" | "es";
  includeGeocoding?: boolean;
  onStatus?: (message: string) => void;
};

function centroidOf(polygon: LngLat[]): LngLat | null {
  if (polygon.length === 0) return null;
  const sum = polygon.reduce(
    (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
    { lng: 0, lat: 0 }
  );
  return { lng: sum.lng / polygon.length, lat: sum.lat / polygon.length };
}

function safeFilePart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function statusText(locale: "en" | "es", es: string, en: string): string {
  return locale === "es" ? es : en;
}

export async function downloadTechnicalReportPdf({
  locale,
  includeGeocoding = false,
  onStatus,
}: TechnicalReportDownloadOptions): Promise<void> {
  const project = useProjectStore.getState();
  const regulatory = useRegulatoryStore.getState();
  const isEs = locale === "es";

  if (project.polygon.length < 3) {
    throw new Error(
      statusText(locale, "Dibuja o aplica un terreno antes de generar el reporte.", "Draw or apply a terrain before generating the report.")
    );
  }

  onStatus?.(statusText(locale, "Capturando mapa...", "Capturing map..."));
  const mapCapture = await captureMapImage();
  const centroid = centroidOf(project.polygon);

  onStatus?.(
    includeGeocoding
      ? statusText(locale, "Consultando ubicación...", "Resolving location...")
      : statusText(locale, "Armando reporte...", "Building report...")
  );
  const geocode =
    includeGeocoding && centroid
      ? await reverseGeocode(centroid, { locale: isEs ? "es" : "en" })
      : null;

  const physicalValidation = validateBessLayout({
    placed: project.placedEquipment,
    polygon: project.polygon,
    anchor: project.anchor,
    profile: getRegulatoryProfile(regulatory.activeProfileId),
    context: regulatory.context,
  });
  const electricalValidation = validateElectricalTopology({
    blocks: project.blocks,
    conversionStations: project.conversionStations,
    mvFeeders: project.mvFeeders,
    mvBuses: project.mvBuses,
    poi: project.poi,
  });
  const regulatoryEvaluation = runRegulatoryEvaluation({
    profileId: regulatory.activeRuleProfileId,
    layoutValidation: physicalValidation,
    electricalValidation,
    blocks: project.blocks,
    conversionStations: project.conversionStations,
    mvFeeders: project.mvFeeders,
    mvBuses: project.mvBuses,
    poi: project.poi,
    inconsistencies: project.inconsistencies,
  });

  const caseStudy = project.selectedCaseStudyId
    ? getProjectCaseStudy(project.selectedCaseStudyId)
    : null;
  const hasTechnicalArchitecture =
    project.conversionStations.length > 0 ||
    project.mvFeeders.length > 0 ||
    project.blocks.length > 0;
  const pendingData =
    project.inconsistencies.length > 0 ||
    project.assumptionsV2.length > 0 ||
    hasTechnicalArchitecture
      ? bessDelDesiertoPendingDataV12
      : caseStudy?.pendingData ?? [];

  const data = buildReportData({
    projectName: caseStudy?.projectName,
    appVersion: "1.0.0-rc.1",
    locale,
    polygon: project.polygon,
    anchor: project.anchor,
    placed: project.placedEquipment,
    designTargets: project.designTargets,
    blocks: project.blocks,
    conversionStations: project.conversionStations,
    mvFeeders: project.mvFeeders,
    mvBuses: project.mvBuses,
    poi: project.poi,
    mainTransformer: project.mainTransformer,
    auxiliaryServices: project.auxiliaryServices,
    ppc: project.ppc,
    operationalLimits: project.operationalLimits,
    lossEstimates: project.lossEstimates,
    assumptions: project.assumptionsV2,
    inconsistencies: project.inconsistencies,
    pendingData,
    regulatoryEvaluation,
    caseStudy,
    mapCapture,
    geocode,
  });

  onStatus?.(statusText(locale, "Generando PDF...", "Rendering PDF..."));
  const blob = await pdf(<ReportDocument data={data} />).toBlob();
  const filename = `${safeFilePart(data.metadata.projectName || "bess-report")}-${data.metadata.reportId}.pdf`;
  saveAs(blob, filename);
  onStatus?.(statusText(locale, "Reporte descargado.", "Report downloaded."));
}
