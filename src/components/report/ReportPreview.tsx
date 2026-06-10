"use client";

import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { PDFViewer } from "@react-pdf/renderer";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import {
  buildReportData,
  type TechnicalReportData,
} from "@/lib/report/buildReportData";
import { captureMapImage } from "@/lib/report/captureMap";
import { reverseGeocode } from "@/lib/report/reverseGeocode";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { feederLengthsFromLayout } from "@/lib/electrical/feederLengths";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { downloadTechnicalReportPdf } from "@/lib/report/downloadTechnicalReport";
import { getProjectCaseStudy } from "@/data/projectCaseStudies";
import { resolveReportPendingData } from "@/lib/report/resolveReportPendingData";
import { ReportDocument } from "./ReportDocument";
import type { LngLat } from "@/types/geometry";

type ReportPreviewProps = {
  isOpen: boolean;
  onClose: () => void;
  includeGeocoding: boolean;
};

function centroidOf(polygon: LngLat[]): LngLat | null {
  if (polygon.length === 0) return null;
  const sum = polygon.reduce(
    (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
    { lng: 0, lat: 0 }
  );
  return { lng: sum.lng / polygon.length, lat: sum.lat / polygon.length };
}

/**
 * In-app report preview. Renders the SAME `<ReportDocument>` that the export
 * produces, inside react-pdf's `<PDFViewer>`, so the preview is a true WYSIWYG
 * proof of the downloaded PDF (no separate HTML re-implementation that could
 * drift on palette, copy, order or pagination). The surrounding modal chrome
 * (header, download, close) is the only app-specific UI.
 */
export function ReportPreview({
  isOpen,
  onClose,
  includeGeocoding,
}: ReportPreviewProps) {
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const showFmGlobal = useRegulatoryStore((s) => s.showFmGlobal);
  const showSecOnly = useRegulatoryStore((s) => s.showSecOnly);
  const showTerritorial = useRegulatoryStore((s) => s.showTerritorial);

  const [reportData, setReportData] = useState<TechnicalReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Assemble the report data once the modal opens. This mirrors the export
  // path's assembly (see downloadTechnicalReport); both route pending data
  // through resolveReportPendingData so a case study's data never leaks.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        const project = useProjectStore.getState();
        const regulatory = useRegulatoryStore.getState();
        const currentLocale = useUiStore.getState().locale;
        const isEsLocale = currentLocale === "es";

        let mapCapture = null;
        try {
          mapCapture = await captureMapImage();
        } catch (e) {
          console.error("Map capture failed in preview:", e);
        }

        const centroid = centroidOf(project.polygon);
        let geocode = null;
        if (includeGeocoding && centroid) {
          try {
            geocode = await reverseGeocode(centroid, {
              locale: isEsLocale ? "es" : "en",
            });
          } catch (e) {
            console.error("Geocoding failed in preview:", e);
          }
        }

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
          auxiliaryServices: project.auxiliaryServices,
          operationalLimits: project.operationalLimits,
          ppc: project.ppc,
          feederLengthsM: feederLengthsFromLayout({
            placed: project.placedEquipment,
            anchor: project.anchor,
            polygon: project.polygon,
            hasPoi: !!project.poi,
            mvFeeders: project.mvFeeders,
          }),
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
          showFmGlobal,
          showSecOnly,
          showTerritorial,
        });

        const caseStudy = project.selectedCaseStudyId
          ? getProjectCaseStudy(project.selectedCaseStudyId)
          : null;
        const pendingData = resolveReportPendingData(
          project.selectedCaseStudyId,
          caseStudy
        );

        const assembled = buildReportData({
          projectName: project.projectName?.trim() || caseStudy?.projectName,
          appVersion: "1.0.0-rc.1",
          locale: currentLocale,
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

        if (!cancelled) setReportData(assembled);
      } catch (err) {
        console.error("Failed to assemble report preview data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [isOpen, includeGeocoding, showFmGlobal, showSecOnly, showTerritorial]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleDownload() {
    setIsPdfGenerating(true);
    try {
      await downloadTechnicalReportPdf({ locale, includeGeocoding });
    } catch (e) {
      console.error("PDF download failed:", e);
    } finally {
      setIsPdfGenerating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-slate-100">
          {isEs ? "Vista previa del reporte técnico" : "Technical Report Preview"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={isPdfGenerating || loading || !reportData}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {isPdfGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isEs ? "Descargar PDF" : "Download PDF"}
          </button>
          <button
            type="button"
            onClick={onClose}
            title={isEs ? "Cerrar vista previa (Esc)" : "Close preview (Esc)"}
            className="inline-flex items-center justify-center rounded-md p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden bg-slate-800">
        {loading || !reportData ? (
          <div className="flex h-full items-center justify-center gap-3 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">
              {isEs
                ? "Generando vista previa del documento…"
                : "Assembling document preview…"}
            </span>
          </div>
        ) : (
          <PDFViewer
            showToolbar
            style={{ width: "100%", height: "100%", border: "none" }}
          >
            <ReportDocument data={reportData} />
          </PDFViewer>
        )}
      </div>
    </div>
  );
}
