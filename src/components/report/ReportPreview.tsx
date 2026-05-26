"use client";

import { useEffect, useState } from "react";
import { 
  X, 
  Download, 
  Loader2, 
  FileText, 
  Map, 
  ShieldAlert, 
  ListChecks, 
  Activity, 
  BookOpen, 
  Compass,
  AlertTriangle,
  type LucideIcon
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { buildReportData, documentTitle, type TechnicalReportData } from "@/lib/report/buildReportData";
import { captureMapImage } from "@/lib/report/captureMap";
import { reverseGeocode } from "@/lib/report/reverseGeocode";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { validateBessLayout } from "@/rules/bessValidationEngine";
import { validateElectricalTopology } from "@/lib/electrical/topologyValidation";
import { runRegulatoryEvaluation } from "@/rules/regulatoryProfileEvaluator";
import { downloadTechnicalReportPdf } from "@/lib/report/downloadTechnicalReport";
import { getProjectCaseStudy, bessDelDesiertoPendingDataV12 } from "@/data/projectCaseStudies";
import { svgPolygonPath } from "@/lib/report/buildSiteSvg";
import type { LngLat } from "@/types/geometry";

type ReportPreviewProps = {
  isOpen: boolean;
  onClose: () => void;
  includeGeocoding: boolean;
};

type SectionId =
  | "cover"
  | "executive"
  | "location"
  | "design"
  | "layout"
  | "electrical"
  | "electricalPrelim"
  | "regulatory"
  | "traceability"
  | "scope"
  | "annex";

function centroidOf(polygon: LngLat[]): LngLat | null {
  if (polygon.length === 0) return null;
  const sum = polygon.reduce(
    (acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }),
    { lng: 0, lat: 0 }
  );
  return { lng: sum.lng / polygon.length, lat: sum.lat / polygon.length };
}

export function ReportPreview({ isOpen, onClose, includeGeocoding }: ReportPreviewProps) {
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const [reportData, setReportData] = useState<TechnicalReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("cover");

  // Load and assemble report data asynchronously
  useEffect(() => {
    if (!isOpen) return;
    
    async function loadData() {
      setLoading(true);
      try {
        const project = useProjectStore.getState();
        const regulatory = useRegulatoryStore.getState();
        const currentLocale = useUiStore.getState().locale;
        const isEsLocale = currentLocale === "es";

        // Capture map image from canvas
        let mapCapture = null;
        try {
          mapCapture = await captureMapImage();
        } catch (e) {
          console.error("Map capture failed in preview:", e);
        }

        // Resolve reverse geocoding via Nominatim
        const centroid = centroidOf(project.polygon);
        let geocode = null;
        if (includeGeocoding && centroid) {
          try {
            geocode = await reverseGeocode(centroid, { locale: isEsLocale ? "es" : "en" });
          } catch (e) {
            console.error("Geocoding failed in preview:", e);
          }
        }

        // Validate physical BESS layout constraints
        const physicalValidation = validateBessLayout({
          placed: project.placedEquipment,
          polygon: project.polygon,
          anchor: project.anchor,
          profile: getRegulatoryProfile(regulatory.activeProfileId),
          context: regulatory.context,
        });

        // Validate electrical BESS network constraints
        const electricalValidation = validateElectricalTopology({
          blocks: project.blocks,
          conversionStations: project.conversionStations,
          mvFeeders: project.mvFeeders,
          mvBuses: project.mvBuses,
          poi: project.poi,
        });

        // Run full regulatory evaluation profile engine
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

        const assembled = buildReportData({
          projectName: caseStudy?.projectName,
          appVersion: "0.1.0",
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

        setReportData(assembled);
      } catch (err) {
        console.error("Failed to assemble report preview data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isOpen, includeGeocoding, locale]);

  // Handle ESC key to close preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (isPdfGenerating) return;
    setIsPdfGenerating(true);
    try {
      await downloadTechnicalReportPdf({
        locale,
        includeGeocoding,
      });
    } catch (e) {
      console.error("Error exporting PDF:", e);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  const sectionsList: { id: SectionId; label: string; icon: LucideIcon }[] = [
    { id: "cover", label: isEs ? "Portada" : "Cover Page", icon: FileText },
    { id: "executive", label: isEs ? "1. Resumen Ejecutivo" : "1. Executive Summary", icon: Activity },
    { id: "location", label: isEs ? "2. Sitio y Ubicación" : "2. Site & Location", icon: Map },
    { id: "design", label: isEs ? "3. Parámetros BESS" : "3. BESS Parameters", icon: Compass },
    { id: "layout", label: isEs ? "4. Layout Físico" : "4. Physical Layout", icon: FileText },
    { id: "electrical", label: isEs ? "5. Arquitectura Eléctrica" : "5. Electrical Architecture", icon: Activity },
    { id: "electricalPrelim", label: isEs ? "5b. Validaciones Eléctricas Preliminares" : "5b. Preliminary Electrical Checks", icon: Activity },
    { id: "regulatory", label: isEs ? "6. Validación Normativa" : "6. Regulatory Validation", icon: ListChecks },
    { id: "traceability", label: isEs ? "7. Alertas y Pendientes" : "7. Alerts & Pending Data", icon: ShieldAlert },
    { id: "scope", label: isEs ? "8. Alcance y Exclusiones" : "8. Scope & Exclusions", icon: BookOpen },
    { id: "annex", label: isEs ? "Anexo: Matriz de Reglas" : "Annex: Rules Table", icon: ListChecks },
  ];

  // Jump to specific section element in main scroll container
  const navigateToSection = (id: SectionId) => {
    setActiveSection(id);
    const element = document.getElementById(`preview-sec-${id}`);
    if (element) {
      if (typeof element.scrollIntoView === "function") {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const outcomeColors = (outcome: string) => {
    switch (outcome) {
      case "pass":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "violation":
        return "bg-rose-500/10 text-rose-700 border-rose-500/20";
      case "manual_check":
        return "bg-amber-500/10 text-amber-700 border-amber-500/20";
      case "pending_validation":
        return "bg-indigo-500/10 text-indigo-700 border-indigo-500/20";
      default:
        return "bg-slate-500/10 text-slate-700 border-slate-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/98 text-slate-100 font-sans backdrop-blur-md overflow-hidden">
      {/* Top Header Controls Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-300" />
          <h1 className="text-sm font-semibold tracking-wide text-slate-100">
            {isEs ? "Vista Previa de Reporte Técnico" : "Technical Report Print Preview"}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleDownload}
            disabled={loading || isPdfGenerating}
            className="flex items-center gap-1.5 rounded bg-violet-600 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white hover:bg-violet-500 active:scale-95 disabled:bg-slate-800 disabled:text-slate-500 transition-all cursor-pointer shadow-md"
          >
            {isPdfGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isEs ? "Descargar PDF" : "Download PDF"}
          </button>
          
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded border border-slate-800 bg-slate-900/60 p-1.5 text-slate-400 hover:border-slate-700 hover:text-slate-100 active:scale-95 cursor-pointer transition-all"
            title={isEs ? "Cerrar vista previa (Esc)" : "Close preview (Esc)"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Split Layout container */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Table of Contents Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-slate-900 bg-slate-900/20 p-4 lg:flex lg:flex-col overflow-y-auto">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isEs ? "Índice de Secciones" : "Table of Contents"}
          </h2>
          <nav className="flex flex-col gap-1.5">
            {sectionsList.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => navigateToSection(sec.id)}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs font-medium transition-all cursor-pointer ${
                    isActive 
                      ? "bg-violet-600/10 text-violet-300 border-l-2 border-violet-500 font-semibold" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-violet-400" : "text-slate-500"}`} />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Reader Area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 px-4 py-8 md:px-8 flex justify-center scroll-smooth">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-10 w-10 animate-spin text-violet-500 mb-3" />
              <p className="text-xs font-medium animate-pulse">
                {isEs ? "Generando vista previa del documento..." : "Assembling document preview..."}
              </p>
            </div>
          ) : reportData ? (
            <div className="w-full max-w-[800px] flex flex-col gap-10">
              {/* PAGE 1: COVER (PORTADA) */}
              <div id="preview-sec-cover" className="min-h-[1000px] w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif relative flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 font-sans">
                    BESS PRELIMINARY PREDESIGN · DOSSIER
                  </span>
                  <div className="h-1 bg-violet-600 mt-2 mb-6" />
                  
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-2 leading-tight">
                    {reportData.metadata.title}
                  </h1>
                  <h2 className="text-lg text-slate-600 mb-8 font-sans font-medium">
                    {reportData.metadata.projectName}
                  </h2>

                  <div className="flex flex-wrap gap-2 mb-8 font-sans">
                    <span className={`px-2.5 py-0.5 rounded text-[9.5px] uppercase font-bold tracking-wider ${
                      reportData.consistencyAlerts.filter((a) => a.severity === "critical").length > 0 
                        ? "bg-rose-100 text-rose-800" 
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {reportData.consistencyAlerts.filter((a) => a.severity === "critical").length > 0 
                        ? (isEs ? "Alertas críticas detectadas" : "Critical alerts active")
                        : (isEs ? "Esquema Consistente" : "Consistent Schema")}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[9.5px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700">
                      {isEs ? "KPIs: " : "KPIs: "}{reportData.reportKpis.source === "documented_targets" ? "Targets" : "Inventory"}
                    </span>
                  </div>

                  {/* Document metadata block */}
                  <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-200 py-6 mb-8 font-sans text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">{isEs ? "ID del Reporte" : "Report ID"}</span>
                      <span className="font-mono text-slate-900 font-medium block mt-1">{reportData.metadata.reportId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">{isEs ? "Generado el" : "Generated At"}</span>
                      <span className="text-slate-900 font-medium block mt-1">{new Date(reportData.metadata.generatedAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">{isEs ? "Versión Software" : "Software Version"}</span>
                      <span className="text-slate-900 font-medium block mt-1">{reportData.metadata.appVersion}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">{isEs ? "Versión Esquema" : "Schema Version"}</span>
                      <span className="text-slate-900 font-medium block mt-1">v{reportData.metadata.schemaVersion}</span>
                    </div>
                  </div>

                  {/* Geocoding localization info */}
                  {reportData.location.describedPlace && (
                    <div className="mb-10 font-sans">
                      <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[9px]">{isEs ? "Ubicación Geográfica" : "Geographical Location"}</span>
                      <span className="text-slate-800 font-medium block text-sm mt-1">{reportData.location.describedPlace}</span>
                      {reportData.location.formats && (
                        <span className="font-mono text-[10.5px] text-slate-500 block mt-1">
                          {reportData.location.formats.dms.lat} · {reportData.location.formats.dms.lng} · {reportData.location.formats.utm.formatted}
                        </span>
                      )}
                    </div>
                  )}

                  {/* KPI Grid Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans">
                    {[
                      { label: isEs ? "Potencia POI" : "POI Power", value: reportData.reportKpis.poiPowerMW !== null ? `${reportData.reportKpis.poiPowerMW} MW` : "—" },
                      { label: isEs ? "Energía Com." : "Comm. Energy", value: reportData.reportKpis.commercialEnergyMWh !== null ? `${reportData.reportKpis.commercialEnergyMWh} MWh` : "—" },
                      { label: isEs ? "Energía Bruta" : "Gross Energy", value: `${reportData.reportKpis.grossEnergyMWh.toFixed(1)} MWh` },
                      { label: isEs ? "Autonomía" : "Duration", value: reportData.reportKpis.durationHours !== null ? `${reportData.reportKpis.durationHours.toFixed(1)} h` : "—" },
                      { label: isEs ? "Contenedores" : "Containers", value: reportData.reportKpis.containers },
                      { label: isEs ? "Estaciones PCS" : "PCS Stations", value: reportData.reportKpis.stations },
                      { label: isEs ? "Alimentadores" : "MV Feeders", value: reportData.reportKpis.feeders },
                      { label: isEs ? "Potencia Inst." : "Inst. Power", value: `${reportData.reportKpis.installedPowerMVA} MVA` },
                    ].map((kpi, idx) => (
                      <div key={idx} className="border border-slate-200 bg-slate-50/50 rounded p-2.5 text-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{kpi.label}</span>
                        <span className="text-sm font-bold text-slate-900 block mt-1">{kpi.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 font-sans text-[8.5px] leading-relaxed text-slate-400 text-center uppercase tracking-wide">
                  {reportData.metadata.disclaimer}
                </div>
              </div>

              {/* SECTION 1: EXECUTIVE SUMMARY */}
              <div id="preview-sec-executive" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">1.</span>
                  {isEs ? "Resumen Técnico Ejecutivo" : "Technical Executive Summary"}
                </h2>
                
                <p className="text-sm leading-relaxed mb-6">
                  {isEs 
                    ? "Este informe de predimensionamiento técnico describe la arquitectura física y eléctrica del sistema de almacenamiento de energía por baterías (BESS) preliminar del proyecto. Incluye la estimación de capacidad bruta, cantidad de estaciones inversoras, alimentadores de media tensión y validación regulatoria contra el perfil seleccionado."
                    : "This technical predesign report summarizes the physical and electrical architecture of the preliminary Battery Energy Storage System (BESS) project. It includes the gross capacity estimation, quantity of PCS stations, MV collector circuits, and regulatory validations against the active compliance profile."}
                </p>

                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Resumen General" : "Overall Metrics"}</h3>
                <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded p-4 mb-6 font-sans text-xs bg-slate-50/30">
                  {[
                    { label: isEs ? "Estado del Layout" : "Layout Status", value: reportData.consistencyAlerts.filter((a) => a.severity === "critical").length > 0 ? (isEs ? "Requiere Revisión" : "Needs Review") : (isEs ? "Consistente" : "Consistent") },
                    { label: isEs ? "Fuente de Métricas" : "Metrics Source", value: reportData.reportKpis.source === "documented_targets" ? "Targets" : "Layout Inventory" },
                    { label: isEs ? "Contenedores / Estaciones" : "Containers / Stations", value: `${reportData.reportKpis.containers} / ${reportData.reportKpis.stations}` },
                    { label: isEs ? "Energía Bruta / Usable" : "Gross / Usable Energy", value: `${reportData.reportKpis.grossEnergyMWh.toFixed(1)} / ${reportData.reportKpis.usableEnergyMWh.toFixed(1)} MWh` },
                    { label: isEs ? "Potencia Nominal Planta" : "Plant Rated Power", value: `${reportData.reportKpis.installedPowerMVA} MVA` },
                    { label: isEs ? "Violaciones de Reglas" : "Rule Violations", value: reportData.regulatoryEvaluation ? `${reportData.regulatoryEvaluation.totals.violation}` : "—" },
                  ].map((row, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-200 last:border-0">
                      <span className="text-slate-400 font-semibold">{row.label}:</span>
                      <span className="font-bold text-slate-800 font-mono">{row.value}</span>
                    </div>
                  ))}
                </div>

                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Alertas de Consistencia" : "Consistency Alerts"}</h3>
                <div className="flex flex-col gap-3 font-sans">
                  {reportData.consistencyAlerts.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-3">
                      {isEs ? "No se encontraron contradicciones internas en los datos." : "No internal contradictions found in the data metrics."}
                    </p>
                  ) : (
                    reportData.consistencyAlerts.map((alert) => (
                      <div key={alert.id} className={`border-l-4 rounded p-3 text-xs ${
                        alert.severity === "critical" 
                          ? "bg-rose-50 border-rose-500 text-rose-900" 
                          : "bg-amber-50 border-amber-500 text-amber-900"
                      }`}>
                        <div className="font-bold uppercase mb-1">{alert.id} · {alert.title}</div>
                        <div className="mb-2 leading-relaxed">{alert.message}</div>
                        <div className="text-[10.5px] opacity-75 font-medium"><span className="underline">{isEs ? "Acción:" : "Action:"}</span> {alert.recommendation}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECTION 2: SITE & LOCATION */}
              <div id="preview-sec-location" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">2.</span>
                  {isEs ? "Sitio y Ubicación" : "Site & Location"}
                </h2>

                <p className="text-sm leading-relaxed mb-6">
                  {isEs
                    ? "Los siguientes datos territoriales y geográficos se calculan a partir del polígono de trabajo dibujado. La referencia geodésica espacial corresponde al datum WGS84."
                    : "The following territorial and geographical attributes are computed directly from the drawn site polygon coordinates. Space coordinates datum is WGS84."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs mb-8">
                  <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] block mb-2">{isEs ? "Métricas de Superficie" : "Surface Metrics"}</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Área del Terreno" : "Site Area"}:</span><span className="font-mono font-bold">{reportData.siteMetrics.areaM2.toLocaleString(isEs ? "es-CL" : "en-US", { maximumFractionDigits: 0 })} m²</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Área en Hectáreas" : "Area in Hectares"}:</span><span className="font-mono font-bold">{reportData.siteMetrics.areaHa.toFixed(3)} ha</span></div>
                      {reportData.siteMetrics.bbox && (
                        <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Dimensiones Envolventes" : "Bounding Box"}:</span><span className="font-mono font-bold">{reportData.siteMetrics.bbox.widthM.toFixed(1)} m × {reportData.siteMetrics.bbox.heightM.toFixed(1)} m</span></div>
                      )}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded p-4 bg-slate-50/50">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] block mb-2">{isEs ? "Coordenadas del Centroide" : "Centroid Coordinates"}</span>
                    {reportData.location.formats ? (
                      <div className="space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Lat / Lng Decimal" : "Lat / Lng Decimal"}:</span><span className="font-mono font-bold">{Number(reportData.location.formats.decimal.lat).toFixed(5)}, {Number(reportData.location.formats.decimal.lng).toFixed(5)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Lat / Lng GMS" : "Lat / Lng DMS"}:</span><span className="font-mono font-bold">{reportData.location.formats.dms.lat}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Longitud GMS" : "Longitude DMS"}:</span><span className="font-mono font-bold">{reportData.location.formats.dms.lng}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">{isEs ? "UTM (WGS84)" : "UTM (WGS84)"}:</span><span className="font-mono font-bold">{reportData.location.formats.utm.formatted}</span></div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">{isEs ? "Sin coordenadas" : "No coordinates"}</span>
                    )}
                  </div>
                </div>

                {/* Map Capture Preview */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 font-sans">{isEs ? "Captura Cartográfica" : "Map View Capture"}</h3>
                {reportData.mapCapture ? (
                  <div className="border border-slate-200 rounded p-1 bg-slate-50 flex flex-col items-center">
                    {/*
                      El preview usa la imagen dinámica capturada del mapa para el reporte PDF.
                      Se preserva <img> para no distorsionar el renderizado ni depender de optimización externa.
                    */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={reportData.mapCapture.dataUrl} 
                      alt="Map capture preview" 
                      className="w-full h-auto max-h-[300px] object-contain rounded"
                    />
                    <div className="text-[10px] text-slate-400 font-sans mt-1.5 text-center leading-relaxed">
                      {isEs ? "Captura referencial del visor geográfico" : "Cartographical view capture reference"} (Zoom {reportData.mapCapture.view.zoom.toFixed(1)} · Lat {reportData.mapCapture.view.lat.toFixed(4)} · Lng {reportData.mapCapture.view.lng.toFixed(4)})
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-4 font-sans">
                    {isEs ? "Captura de mapa satelital no disponible en esta sesión (WebGL inhabilitado)." : "Satellite map view capture unavailable (WebGL context disabled)."}
                  </p>
                )}
              </div>

              {/* SECTION 3: BESS PARAMETERS */}
              <div id="preview-sec-design" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">3.</span>
                  {isEs ? "Parámetros Principales del BESS" : "BESS Main Parameters"}
                </h2>

                <p className="text-sm leading-relaxed mb-6">
                  {isEs
                    ? "Los siguientes parámetros del sistema definen la capacidad comercial de diseño eléctrico del BESS y la arquitectura física derivada para cumplir con el dimensionamiento."
                    : "The following system sizing parameters define the electrical BESS commercial capacity targets and the physical layout structure required to satisfy sizing."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs border border-slate-200 rounded p-4 mb-6 bg-slate-50/20">
                  <div>
                    <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[9.5px] border-b border-slate-200 pb-1 mb-2">{isEs ? "Objetivos de Diseño" : "Design Sizing Targets"}</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Potencia POI" : "POI Power"}:</span><span className="font-mono font-bold">{reportData.reportKpis.poiPowerMW !== null ? `${reportData.reportKpis.poiPowerMW} MW` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Energía Comercial" : "Commercial Energy"}:</span><span className="font-mono font-bold">{reportData.reportKpis.commercialEnergyMWh !== null ? `${reportData.reportKpis.commercialEnergyMWh} MWh` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Autonomía de Planta" : "Plant Duration"}:</span><span className="font-mono font-bold">{reportData.reportKpis.durationHours !== null ? `${reportData.reportKpis.durationHours.toFixed(2)} h` : "—"}</span></div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[9.5px] border-b border-slate-200 pb-1 mb-2">{isEs ? "Arquitectura Derivada" : "Derived Architecture"}</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Contenedores calculados" : "Target Containers"}:</span><span className="font-mono font-bold">{reportData.sizingFromTargets.containers} u.</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Contenedores en mapa" : "Containers in Layout"}:</span><span className="font-mono font-bold">{reportData.reportKpis.containers} u.</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Energía Bruta DC BOL" : "Gross DC BOL Energy"}:</span><span className="font-mono font-bold">{reportData.reportKpis.grossEnergyMWh.toFixed(2)} MWh</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Energía Usable Real" : "Usable Energy (BOL)"}:</span><span className="font-mono font-bold">{reportData.reportKpis.usableEnergyMWh.toFixed(2)} MWh</span></div>
                    </div>
                  </div>
                </div>

                {/* Sizing calculation notes and alerts */}
                {reportData.sizingFromTargets.warnings && reportData.sizingFromTargets.warnings.length > 0 && (
                  <div className="font-sans text-xs">
                    <h4 className="font-bold text-slate-600 mb-1">{isEs ? "Notas del cálculo aritmético:" : "Sizing engine logic logs:"}</h4>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500">
                      {reportData.sizingFromTargets.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* SECTION 4: PHYSICAL LAYOUT */}
              <div id="preview-sec-layout" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">4.</span>
                  {isEs ? "Layout Físico y Equipamiento" : "Physical Layout & Equipment Inventory"}
                </h2>

                <p className="text-sm leading-relaxed mb-6">
                  {isEs
                    ? "Diagrama esquemático vectorial bidimensional (norte arriba) calculado a partir de las coordenadas de los equipos colocados. La barra indica la escala métrica."
                    : "Schematic vector 2D layout (North oriented) derived from local coordinates of placed equipment. Scale is displayed in meters."}
                </p>

                {/* Render inline SVG Layout Schematic */}
                {reportData.siteSvg ? (
                  <div className="border border-slate-200 rounded p-4 bg-slate-50/50 flex flex-col items-center mb-8">
                    <svg
                      viewBox={`${reportData.siteSvg.viewBox.x} ${reportData.siteSvg.viewBox.y} ${reportData.siteSvg.viewBox.width} ${reportData.siteSvg.viewBox.height}`}
                      className="w-full h-auto max-h-[350px]"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Site boundary path */}
                      <path
                        d={svgPolygonPath(reportData.siteSvg.sitePoints)}
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="#ecfeff"
                        fillOpacity={0.4}
                      />
                      {/* Placed equipment polygons */}
                      {reportData.siteSvg.equipment.map((eq, idx) => (
                        <polygon
                          key={`eq-${idx}`}
                          points={eq.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
                          fill={eq.fill}
                          stroke={eq.stroke}
                          strokeWidth={0.5}
                          fillOpacity={0.8}
                        />
                      ))}
                      {/* Scale bar */}
                      <line
                        x1={20}
                        y1={reportData.siteSvg.viewBox.height - 25}
                        x2={20 + reportData.siteSvg.scale.barLengthUnits}
                        y2={reportData.siteSvg.viewBox.height - 25}
                        stroke="#1e293b"
                        strokeWidth={2}
                      />
                      <text
                        x={20}
                        y={reportData.siteSvg.viewBox.height - 12}
                        fontFamily="monospace"
                        fontSize="10"
                        fill="#1e293b"
                      >
                        {reportData.siteSvg.scale.barLengthM} m
                      </text>
                      {/* Simple North Indicator arrow */}
                      <polygon
                        points={`${reportData.siteSvg.northArrow.x},${reportData.siteSvg.northArrow.y - reportData.siteSvg.northArrow.size} ${reportData.siteSvg.northArrow.x - reportData.siteSvg.northArrow.size * 0.5},${reportData.siteSvg.northArrow.y + reportData.siteSvg.northArrow.size * 0.5} ${reportData.siteSvg.northArrow.x + reportData.siteSvg.northArrow.size * 0.5},${reportData.siteSvg.northArrow.y + reportData.siteSvg.northArrow.size * 0.5}`}
                        fill="#06b6d4"
                      />
                      <text
                        x={reportData.siteSvg.northArrow.x}
                        y={reportData.siteSvg.northArrow.y + reportData.siteSvg.northArrow.size * 1.5}
                        fontFamily="sans-serif"
                        fontWeight="bold"
                        fontSize="9"
                        textAnchor="middle"
                        fill="#1e293b"
                      >
                        N
                      </text>
                    </svg>
                    <div className="text-[10px] text-slate-400 font-sans mt-2 text-center">
                      {isEs ? "Esquema vectorial local de emplazamiento" : "Emplacement local vector schematic"}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-4 font-sans mb-8">
                    {isEs ? "No hay dibujo de terreno definido." : "No terrain polygon defined."}
                  </p>
                )}

                {/* Inventory Table */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5 font-sans">{isEs ? "Inventario Físico de Equipos" : "Physical Equipment Inventory"}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full font-sans text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                        <th className="py-2 pr-2">{isEs ? "Tipo" : "Type"}</th>
                        <th className="py-2 pr-2">{isEs ? "Fabricante / Modelo" : "Manufacturer / Model"}</th>
                        <th className="py-2 pr-2 text-right">{isEs ? "Cant." : "Qty"}</th>
                        <th className="py-2 pr-2 text-right">{isEs ? "Dim. (L x A) m" : "Dim. (L x W) m"}</th>
                        <th className="py-2 text-right">{isEs ? "Peso Unit." : "Unit Weight"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.equipmentInventory.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="py-2 pr-2 text-slate-500">{row.type}</td>
                          <td className="py-2 pr-2 font-medium text-slate-900">{row.manufacturer} {row.model}</td>
                          <td className="py-2 pr-2 text-right font-mono font-semibold">{row.count}</td>
                          <td className="py-2 pr-2 text-right font-mono text-slate-600">{row.lengthM.toFixed(1)} × {row.widthM.toFixed(1)}</td>
                          <td className="py-2 text-right font-mono text-slate-600">{row.weightKg ? `${(row.weightKg/1000).toFixed(1)} t` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 5: ELECTRICAL ARCHITECTURE */}
              <div id="preview-sec-electrical" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">5.</span>
                  {isEs ? "Arquitectura Eléctrica Preliminar" : "Preliminary Electrical Architecture"}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-xs mb-8">
                  <div className="border border-slate-200 rounded p-4 bg-slate-50/30">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] block mb-2">{isEs ? "Resumen de Conexión" : "Electrical Connection Slices"}</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Bloques de Batería" : "BESS Logic Blocks"}:</span><span className="font-mono font-bold">{reportData.electrical.blocks} u.</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Estaciones PCS" : "PCS Stations"}:</span><span className="font-mono font-bold">{reportData.reportKpis.stations} u.</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Alimentadores de MT" : "MV Feeders"}:</span><span className="font-mono font-bold">{reportData.reportKpis.feeders} u.</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Punto de Conexión" : "POI Bus"}:</span><span className="font-bold text-slate-800">{reportData.electrical.poi ? `${reportData.electrical.poi.busName} (${reportData.electrical.poi.voltageKv} kV)` : "—"}</span></div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded p-4 bg-slate-50/30">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] block mb-2">{isEs ? "Transformador Principal y PPC" : "Main Transformer & PPC"}</span>
                    <div className="space-y-1.5">
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Potencia Principal" : "Main Tx Rating"}:</span><span className="font-mono font-bold">{reportData.electrical.mainTransformer ? `${reportData.electrical.mainTransformer.ratedPowerMVA.value} MVA` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Tensiones Tx Principal" : "Main Tx Voltages"}:</span><span className="font-mono font-bold">{reportData.electrical.mainTransformer ? `${reportData.electrical.mainTransformer.windings.hvKv} / ${reportData.electrical.mainTransformer.windings.mv1Kv} kV` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">{isEs ? "Controlador (PPC)" : "PPC Brand"}:</span><span className="font-bold text-slate-850">{reportData.electrical.ppc ? `${reportData.electrical.ppc.manufacturer} ${reportData.electrical.ppc.productName || ""}` : "—"}</span></div>
                    </div>
                  </div>
                </div>

                {/* Stations list table */}
                {reportData.electrical.stationRows && reportData.electrical.stationRows.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Detalle de Centros de Transformación" : "Power Conversion Station Breakdown"}</h3>
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full font-sans text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                            <th className="py-2 pr-2">ID</th>
                            <th className="py-2 pr-2">{isEs ? "Modelo" : "Model"}</th>
                            <th className="py-2 pr-2 text-right">MVA</th>
                            <th className="py-2 pr-2 text-right">{isEs ? "Feeder MT" : "Feeder"}</th>
                            <th className="py-2 text-right">{isEs ? "Contenedores" : "Containers"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.electrical.stationRows.slice(0, 15).map((r, idx) => (
                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                              <td className="py-2 pr-2 font-mono font-semibold text-slate-700">{r.id}</td>
                              <td className="py-2 pr-2 text-slate-800">{r.manufacturer} {r.model}</td>
                              <td className="py-2 pr-2 text-right font-mono">{r.ratedMVA.toFixed(1)}</td>
                              <td className="py-2 pr-2 text-right font-mono font-semibold text-violet-750">{r.feederId || "—"}</td>
                              <td className="py-2 text-right font-mono font-bold text-slate-650">{r.containerCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {reportData.electrical.stationRows.length > 15 && (
                        <p className="text-[10px] text-slate-400 italic mt-1 font-sans">
                          * {isEs ? `Mostrando primeras 15 estaciones de ${reportData.electrical.stationRows.length} totales.` : `Showing first 15 conversion skids of ${reportData.electrical.stationRows.length} total.`}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Auxiliary Services balance */}
                {reportData.electrical.auxiliaryServices && (
                  <div className="mb-6 font-sans text-xs">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Consumos de Servicios Auxiliares (SSAA)" : "Auxiliary Services Consumption (SSAA)"}</h3>
                    <div className="grid grid-cols-2 gap-4 border border-slate-200 rounded p-3 bg-slate-50/30">
                      <div><span className="text-slate-400">{isEs ? "Fijo Planta" : "Fixed Plant Base"}:</span> <span className="font-mono font-bold">{reportData.electrical.auxiliaryServices.plantFixedKw?.value || 0} kW</span></div>
                      <div><span className="text-slate-400">{isEs ? "Consumo / Estación" : "Cons. per PCS Station"}:</span> <span className="font-mono font-bold">{reportData.electrical.auxiliaryServices.perConversionStationKw?.value || 0} kW</span></div>
                      {reportData.electrical.auxiliaryServices.modeSpecific?.discharge && (
                        <div className="col-span-2 flex justify-between border-t border-slate-200 pt-2 mt-1">
                          <span className="text-slate-500 font-bold">{isEs ? "SSAA en descarga máxima (PMAX)" : "SSAA in peak discharge (PMAX)"}:</span>
                          <span className="font-mono font-bold text-violet-700">{reportData.electrical.auxiliaryServices.modeSpecific.discharge.value.toFixed(3)} MW</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 5b: PRELIMINARY ELECTRICAL CHECKS (Fase 9) */}
              <div id="preview-sec-electricalPrelim" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">5b.</span>
                  {isEs ? "Validaciones Eléctricas Preliminares" : "Preliminary Electrical Checks"}
                </h2>

                <div className="mb-4 rounded border border-amber-300/60 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900 font-sans">
                  {isEs
                    ? "Estimaciones preliminares de referencia. No reemplazan estudios eléctricos de detalle: flujo de potencia, cortocircuito, coordinación de protecciones, armónicos, estabilidad RMS/EMT, arc-flash, calidad de potencia en el PCC ni coordinación de aislamiento. Esos estudios quedan listados como exclusiones en §8."
                    : "Reference-only preliminary estimates. They do not replace detailed electrical studies: load flow, short circuit, protection coordination, harmonics, RMS/EMT stability, arc flash, power quality at the PCC, or insulation coordination. Those studies are listed as exclusions in §8."}
                </div>

                {reportData.preliminaryElectricalChecks.checks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-3 font-sans">
                    {isEs
                      ? "No hay reglas eléctricas preliminares evaluadas. Cargue la arquitectura v1.2 (preset BESS del Desierto o equivalente) y un perfil regulatorio activo."
                      : "No preliminary electrical rules evaluated. Load the v1.2 architecture (BESS del Desierto preset or equivalent) and activate a regulatory profile."}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5 font-sans text-center text-xs">
                      {[
                        { label: isEs ? "REGLAS" : "RULES", value: reportData.preliminaryElectricalChecks.checks.length, color: "text-slate-700 bg-slate-50 border-slate-200" },
                        { label: "PASS", value: reportData.preliminaryElectricalChecks.totals.pass, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                        { label: "VIOLATION", value: reportData.preliminaryElectricalChecks.totals.violation, color: "text-rose-700 bg-rose-50 border-rose-200" },
                        { label: "N/A", value: reportData.preliminaryElectricalChecks.totals.notEvaluable, color: "text-slate-700 bg-slate-50 border-slate-200" },
                        { label: "PENDING", value: reportData.preliminaryElectricalChecks.totals.pendingValidation, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
                        { label: isEs ? "ACOTADAS" : "CAPPED", value: reportData.preliminaryElectricalChecks.checks.filter((c) => c.severityCappedBy !== null).length, color: "text-violet-700 bg-violet-50 border-violet-200" },
                      ].map((item, idx) => (
                        <div key={idx} className={`border rounded p-2.5 ${item.color}`}>
                          <span className="text-[9px] font-bold block opacity-75">{item.label}</span>
                          <span className="text-base font-extrabold block mt-0.5 font-mono">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full font-sans text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[8.5px] font-bold">
                            <th className="py-2 pr-2">ID</th>
                            <th className="py-2 pr-2">{isEs ? "Check" : "Check"}</th>
                            <th className="py-2 pr-2">{isEs ? "Sev. efectiva" : "Effective sev."}</th>
                            <th className="py-2 pr-2">{isEs ? "Nivel" : "Level"}</th>
                            <th className="py-2 pr-2">Outcome</th>
                            <th className="py-2">{isEs ? "Fuente / nota" : "Source / note"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.preliminaryElectricalChecks.checks.map((c) => {
                            const sevColor =
                              c.effectiveSeverity === "blocking"
                                ? "bg-rose-100 text-rose-800"
                                : c.effectiveSeverity === "warning"
                                  ? "bg-amber-100 text-amber-800"
                                  : c.effectiveSeverity === "info"
                                    ? "bg-sky-100 text-sky-800"
                                    : c.effectiveSeverity === "checklist"
                                      ? "bg-violet-100 text-violet-800"
                                      : "bg-slate-100 text-slate-600";
                            const outcomeColor =
                              c.outcome === "pass"
                                ? "bg-emerald-100 text-emerald-800"
                                : c.outcome === "violation"
                                  ? "bg-rose-100 text-rose-800"
                                  : c.outcome === "not_evaluable"
                                    ? "bg-slate-100 text-slate-600"
                                    : "bg-indigo-100 text-indigo-800";
                            return (
                              <tr key={c.ruleId} className="border-b border-slate-100 last:border-0 align-top">
                                <td className="py-2 pr-2 font-mono text-[9.5px] text-slate-700 font-bold whitespace-nowrap">{c.ruleId}</td>
                                <td className="py-2 pr-2 text-slate-800 leading-snug">
                                  <div className="font-medium">{c.title}</div>
                                  {c.violations.length > 0 ? (
                                    <ul className="mt-1 text-[10px] text-rose-700">
                                      {c.violations.slice(0, 2).map((v, i) => (
                                        <li key={i}>· {v.message}</li>
                                      ))}
                                    </ul>
                                  ) : null}
                                  {c.severityCappedBy ? (
                                    <div className="mt-1 text-[10px] text-violet-700">
                                      {isEs ? "Severidad acotada" : "Severity capped"}: {c.severityCappedBy.from} → {c.effectiveSeverity} ({c.severityCappedBy.by === "document_level" ? (isEs ? "nivel" : "level") : (isEs ? "confianza" : "confidence")})
                                    </div>
                                  ) : null}
                                </td>
                                <td className="py-2 pr-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${sevColor}`}>
                                    {c.effectiveSeverity}
                                  </span>
                                </td>
                                <td className="py-2 pr-2 font-mono text-[9.5px] text-slate-600">
                                  {c.documentLevel ? c.documentLevel.split("_")[0] : "—"}
                                </td>
                                <td className="py-2 pr-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${outcomeColor}`}>
                                    {c.outcome === "not_evaluable" ? "N/A" : c.outcome === "pending_validation" ? "PEND" : c.outcome.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2 text-[10px] text-slate-500 italic leading-normal">
                                  {c.citation ?? "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="mt-4 text-[10.5px] text-slate-500 italic leading-snug font-sans">
                      {isEs
                        ? "Severidad efectiva = severidad declarada acotada por nivel documental L1–L7 y confianza de evidencia. Una regla nunca puede ser más estricta que su mejor evidencia."
                        : "Effective severity = declared severity bounded by document level L1–L7 and evidence confidence. A rule cannot be stricter than its strongest evidence."}
                    </p>
                  </>
                )}
              </div>

              {/* SECTION 6: REGULATORY VALIDATION */}
              <div id="preview-sec-regulatory" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">6.</span>
                  {isEs ? "Validación Normativa Resumida" : "Regulatory Compliance Assessment"}
                </h2>

                {reportData.regulatoryEvaluation ? (
                  <>
                    <p className="text-sm leading-relaxed mb-6">
                      {isEs 
                        ? `Resultado global de la evaluación normativa del layout. Perfil activo: `
                        : `Overall outcome of layout regulatory compliance review. Active profile: `}
                      <strong className="font-sans">{reportData.regulatoryEvaluation.profileName}</strong>.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 font-sans text-center text-xs">
                      {[
                        { label: "PASS", value: reportData.regulatoryEvaluation.totals.pass, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                        { label: "VIOLATION", value: reportData.regulatoryEvaluation.totals.violation, color: "text-rose-700 bg-rose-50 border-rose-200" },
                        { label: "MANUAL", value: reportData.regulatoryEvaluation.totals.manualCheck, color: "text-amber-700 bg-amber-50 border-amber-200" },
                        { label: "PENDING", value: reportData.regulatoryEvaluation.totals.pending, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
                      ].map((item, idx) => (
                        <div key={idx} className={`border rounded p-2.5 ${item.color}`}>
                          <span className="text-[9px] font-bold block opacity-75">{item.label}</span>
                          <span className="text-base font-extrabold block mt-0.5 font-mono">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Critical rules list */}
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5 font-sans">{isEs ? "Reglas Críticas / Violaciones" : "Actionable / Violated Rules"}</h3>
                    <div className="flex flex-col gap-2 font-sans">
                      {reportData.regulatoryEvaluation.rules.filter((r) => r.outcome === "violation").length === 0 ? (
                        <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-3">
                          {isEs ? "Ninguna regla está en violación en este layout." : "No rule violations detected in this layout."}
                        </p>
                      ) : (
                        reportData.regulatoryEvaluation.rules
                          .filter((r) => r.outcome === "violation")
                          .slice(0, 10)
                          .map((rule, idx) => {
                            const mainCite = rule.evidence.find((e) => e.documentId && e.documentId !== "__none__");
                            return (
                              <div key={idx} className="border border-slate-200 rounded p-3 bg-slate-50/50 text-xs">
                                <div className="flex justify-between items-start gap-2 mb-1.5">
                                  <span className="font-mono text-slate-500 text-[10px] font-semibold">{rule.ruleId}</span>
                                  <span className="px-2 py-0.5 rounded text-[8.5px] font-bold bg-rose-100 text-rose-800 uppercase border border-rose-250">
                                    VIOLATION
                                  </span>
                                </div>
                                <div className="font-bold text-slate-900 text-[12px] leading-snug mb-1">{rule.title}</div>
                                <div className="text-slate-600 mb-2 leading-relaxed">{rule.description}</div>
                                {mainCite && (
                                  <div className="text-[10px] text-slate-400 font-medium italic border-t border-slate-100 pt-1">
                                    {isEs ? "Fuente:" : "Source:"} {documentTitle(mainCite.documentId)} {mainCite.page ? `· p.${mainCite.page}` : ""} {mainCite.section ? `· §${mainCite.section}` : ""}
                                  </div>
                                )}
                              </div>
                            );
                          })
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-4 font-sans">
                    {isEs ? "Evaluación regulatoria no disponible." : "Regulatory evaluation not active."}
                  </p>
                )}
              </div>

              {/* SECTION 7: TRACEABILITY & ALERTS */}
              <div id="preview-sec-traceability" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">7.</span>
                  {isEs ? "Alertas Críticas y Pendientes Técnicos" : "Project Assumptions & Inconsistencies"}
                </h2>

                {/* Inconsistencies */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Inconsistencias Documentales Detectadas" : "Document Inconsistencies"}</h3>
                <div className="flex flex-col gap-3 font-sans mb-8">
                  {reportData.inconsistencies.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-3">
                      {isEs ? "Sin contradicciones documentales registradas." : "No document inconsistencies registered."}
                    </p>
                  ) : (
                    reportData.inconsistencies.map((inc) => (
                      <div key={inc.id} className="border border-rose-250 bg-rose-50/30 rounded p-3 text-xs">
                        <div className="font-bold text-rose-900 mb-1.5 uppercase text-[10.5px]">{inc.id} · {inc.topic}</div>
                        <div className="space-y-1.5 mb-2.5">
                          {inc.conflictingValues.map((cv, i) => (
                            <div key={i} className="flex flex-col border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                              <span className="font-mono text-slate-850 font-bold">· {cv.value}</span>
                              <span className="text-[10px] text-slate-400 italic">
                                ({documentTitle(cv.evidence.documentId)} {cv.evidence.page ? `· p.${cv.evidence.page}` : ""})
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="font-semibold text-slate-800 border-t border-slate-200/50 pt-2">
                          <span className="underline">{isEs ? "Recomendación:" : "Recommendation:"}</span> {inc.recommendation}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Assumptions */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Supuestos Críticos del Proyecto" : "Project Critical Assumptions"}</h3>
                <div className="overflow-x-auto mb-8">
                  <table className="w-full font-sans text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                        <th className="py-2 pr-2">ID</th>
                        <th className="py-2 pr-2">{isEs ? "Descripción" : "Description"}</th>
                        <th className="py-2 pr-2">{isEs ? "Riesgo" : "Risk"}</th>
                        <th className="py-2 text-right">{isEs ? "Línea Base IFC" : "Must Verify IFC"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.assumptions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 italic">
                            {isEs ? "Sin supuestos declarados." : "No assumptions declared."}
                          </td>
                        </tr>
                      ) : (
                        reportData.assumptions.map((a, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                            <td className="py-2 pr-2 font-mono text-slate-550 font-semibold">{a.id}</td>
                            <td className="py-2 pr-2 text-slate-800 font-medium">{a.description}</td>
                            <td className="py-2 pr-2">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                a.risk === "high" ? "bg-rose-100 text-rose-800" : a.risk === "medium" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-650"
                              }`}>{a.risk}</span>
                            </td>
                            <td className="py-2 text-right font-mono text-slate-500">{a.mustVerifyBeforeIFC ? "SI" : "—"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 8: SCOPE & EXCLUSIONS */}
              <div id="preview-sec-scope" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">8.</span>
                  {isEs ? "Alcance, Exclusiones y Próximos Estudios" : "Scope, Exclusions & Next Steps"}
                </h2>

                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 font-sans">{isEs ? "Exclusiones de Ingeniería de Detalle" : "Detail Engineering Exclusions"}</h3>
                <div className="space-y-3 font-sans text-xs mb-8">
                  {reportData.exclusions.map((ex, idx) => (
                    <div key={idx} className="flex gap-2 bg-slate-50 border border-slate-250 p-2.5 rounded">
                      <span className="font-extrabold text-slate-800 font-mono text-[9px] shrink-0 uppercase border border-slate-300 rounded px-1.5 h-fit bg-white">
                        {ex.id || `EXC-${idx}`}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 mb-0.5">{ex.scope}</div>
                        <div className="text-slate-500 leading-normal mb-1">{ex.reason}</div>
                        <div className="text-[10px] text-violet-650 font-bold uppercase tracking-wider">
                          {isEs ? "Fase Requerida:" : "Required Phase:"} {ex.futureStage}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preliminary Roads & Cable Routes (Phase 6) */}
                {reportData.infrastructure ? (
                  <div className="mb-8 mt-6">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 font-sans">
                      {isEs ? "Caminos y Corredores MT Preliminares" : "Preliminary Roads & MV Corridors"}
                    </h3>
                    <p className="text-slate-650 text-xs leading-normal mb-3 font-sans">
                      {isEs
                        ? "El trazado físico de accesos y canalizaciones es conceptual. A continuación se detallan las métricas y exclusiones de infraestructura calculadas:"
                        : "The physical routing of access roads and cable trenches is conceptual. Calculated infrastructure metrics and exclusions are detailed below:"}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-900 mb-4 font-sans text-xs">
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-center">
                        <div className="text-slate-400 font-medium mb-1">{isEs ? "Bloques" : "Blocks"}</div>
                        <div className="font-mono font-bold text-sm text-slate-800">{reportData.infrastructure.blocksCount}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-center">
                        <div className="text-slate-400 font-medium mb-1">{isEs ? "Rutas MT" : "MV Routes"}</div>
                        <div className="font-mono font-bold text-sm text-slate-800">{reportData.infrastructure.cableRoutesCount}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-center">
                        <div className="text-slate-400 font-medium mb-1">{isEs ? "Caminos" : "Access Roads"}</div>
                        <div className="font-mono font-bold text-sm text-slate-800">{reportData.infrastructure.accessRoadsCount}</div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-center">
                        <div className="text-slate-400 font-medium mb-1">{isEs ? "Longitud MT" : "Total MV Length"}</div>
                        <div className="font-mono font-bold text-sm text-slate-800">{reportData.infrastructure.totalCableLengthM} m</div>
                      </div>
                    </div>
                    {reportData.infrastructure.warnings.length > 0 ? (
                      <div className="space-y-2 mt-3 font-sans text-xs">
                        {reportData.infrastructure.warnings.map((w, idx) => (
                          <div key={idx} className="flex gap-2 bg-amber-50 border border-amber-200/50 p-2.5 rounded text-amber-800">
                            <span className="font-bold font-mono text-[10px] shrink-0 uppercase border border-amber-300 rounded px-1.5 h-fit bg-white">
                              INFO
                            </span>
                            <div className="leading-normal">{w}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Technical Disclaimers */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 font-sans mt-8">
                  {isEs ? "Advertencias y Limitaciones Técnicas del MVP" : "MVP Warnings & Technical Limitations"}
                </h3>
                <div className="space-y-3 font-sans text-xs mb-8">
                  {reportData.disclaimers.map((disc, idx) => (
                    <div key={idx} className="flex gap-2.5 bg-slate-900/40 border border-slate-800 p-3 rounded-md text-slate-350">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-200 mb-1">{disc.title}</div>
                        <div className="text-slate-400 leading-normal">{disc.text}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Engineering Checklist */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5 font-sans">{isEs ? "Checklist de Cierre de Diseño" : "Design Validation Checklist"}</h3>
                <div className="overflow-x-auto mb-8">
                  <table className="w-full font-sans text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                        <th className="py-2 pr-2">{isEs ? "Tema" : "Topic"}</th>
                        <th className="py-2 pr-2">{isEs ? "Descripción técnica" : "Description"}</th>
                        <th className="py-2 text-right">{isEs ? "Obligatorio" : "Required"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.engineeringChecklist.map((c, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="py-2 pr-2 font-bold text-slate-800">{c.topic}</td>
                          <td className="py-2 pr-2 text-slate-500 leading-normal">{c.description}</td>
                          <td className="py-2 text-right font-mono font-semibold text-slate-600">{c.required ? "SI" : "NO"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cited References */}
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2.5 font-sans">{isEs ? "Referencias Creadas en el Reporte" : "Registry Documents Cited"}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full font-sans text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[9px] font-bold">
                        <th className="py-2 pr-2">ID</th>
                        <th className="py-2 pr-2">{isEs ? "Título del Documento" : "Document Title"}</th>
                        <th className="py-2 pr-2">{isEs ? "Fuente" : "Source"}</th>
                        <th className="py-2 text-right">{isEs ? "Versión" : "Version"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.documentReferences.map((doc, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="py-2 pr-2 font-mono text-[9.5px] text-slate-600 font-semibold">{doc.id}</td>
                          <td className="py-2 pr-2 text-slate-800 font-medium leading-normal">{doc.title}</td>
                          <td className="py-2 pr-2 text-slate-500 font-mono text-[10px]">{doc.source}</td>
                          <td className="py-2 text-right font-mono text-slate-550">{doc.version || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ANNEX: DETAILED RULES MATRIX TABLE */}
              <div id="preview-sec-annex" className="w-full bg-white text-slate-900 border border-slate-200 shadow-2xl p-10 md:p-14 rounded-md font-serif">
                <h2 className="text-xl font-bold border-b border-slate-200 pb-2 mb-4 font-sans tracking-wide text-slate-800">
                  <span className="text-slate-400 mr-2">A1.</span>
                  {isEs ? "Anexo: Matriz Completa de Reglas" : "Annex: Full Compliance Matrix"}
                </h2>

                {reportData.regulatoryEvaluation ? (
                  <>
                    <p className="text-sm leading-relaxed mb-6 font-serif">
                      {isEs
                        ? "Esta sección presenta el registro completo de evaluación para todas las reglas cargadas en el perfil:"
                        : "This section contains the full validation logs of all evaluation checks loaded inside the profile:"}{" "}
                      <strong className="font-sans">{reportData.regulatoryEvaluation.profileName}</strong>.
                    </p>

                    <div className="overflow-x-auto">
                      <table className="w-full font-sans text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-400 uppercase tracking-wider text-[8px] font-bold">
                            <th className="py-2 pr-2">Outcome</th>
                            <th className="py-2 pr-2">ID</th>
                            <th className="py-2 pr-2">{isEs ? "Título de Regla" : "Rule Title"}</th>
                            <th className="py-2">{isEs ? "Referencia / Fuente" : "Regulatory Source"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.regulatoryEvaluation.rules.map((rule, idx) => {
                            const mainCite = rule.evidence.find((e) => e.documentId && e.documentId !== "__none__");
                            return (
                              <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                                <td className="py-2 pr-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase border ${outcomeColors(rule.outcome)}`}>
                                    {rule.outcome === "manual_check" ? "MANUAL" : rule.outcome === "pending_validation" ? "PENDING" : rule.outcome.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2 pr-2 font-mono text-[9px] text-slate-650 font-bold">{rule.ruleId}</td>
                                <td className="py-2 pr-2 font-medium text-slate-900 leading-snug">{rule.title}</td>
                                <td className="py-2 text-slate-450 italic text-[10px] leading-normal">
                                  {mainCite 
                                    ? `${documentTitle(mainCite.documentId)}${mainCite.page ? ` · p.${mainCite.page}` : ""}`
                                    : "—"
                                  }
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded p-4 font-sans">
                    {isEs ? "Evaluación regulatoria no disponible." : "Regulatory evaluation not active."}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-rose-400">
              <ShieldAlert className="h-10 w-10 mb-3" />
              <p className="text-xs font-semibold">
                {isEs ? "Error al cargar la información del reporte." : "Could not load report preview data."}
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
