"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileJson,
  FileText,
  Globe2,
  Loader2,
  Redo2,
  RotateCcw,
  RotateCw,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { computeWarnings } from "@/lib/layout/spacingRules";
import { computeSummary } from "@/lib/layout/summaryCalculations";
import { polygonAreaFromLngLat } from "@/lib/geometry/area";
import { getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor, modeLabel, scenarioStatusLabel } from "@/lib/i18n";
import {
  buildExportedProject,
  downloadExportedProject,
} from "@/lib/export/exportJson";
import { downloadTechnicalReportPdf } from "@/lib/report/downloadTechnicalReport";
import { Button } from "@/components/ui/Button";
import { getProjectCaseStudy } from "@/data/projectCaseStudies";

export function Toolbar() {
  const mode = useProjectStore((s) => s.interactionMode);
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const selectedEquipmentId = useProjectStore((s) => s.selectedEquipmentId);
  const selectedCaseStudyId = useProjectStore((s) => s.selectedCaseStudyId);

  const removeEquipment = useProjectStore((s) => s.removeEquipment);
  const rotateEquipment = useProjectStore((s) => s.rotateEquipment);
  const loadDemoProject = useProjectStore((s) => s.loadDemoProject);
  const resetProject = useProjectStore((s) => s.resetProject);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const locale = useUiStore((s) => s.locale);
  const toggleLocale = useUiStore((s) => s.toggleLocale);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState<"pdf" | "pdf-geocode" | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const metrics = getProjectMetrics(polygon, placed, anchor);
  const t = copyFor(locale);
  const isEs = locale === "es";

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [exportMenuOpen]);

  const handleJsonExport = () => {
    const siteArea = polygonAreaFromLngLat(polygon);
    const summary = computeSummary(placed, siteArea);
    const warnings = computeWarnings(placed, polygon, anchor);
    const caseStudy = selectedCaseStudyId
      ? getProjectCaseStudy(selectedCaseStudyId)
      : null;
    const project = buildExportedProject({
      anchor,
      polygon,
      placed,
      summary,
      warnings,
      caseStudy,
    });
    downloadExportedProject(project);
    setExportMenuOpen(false);
  };

  const handlePdfExport = async (includeGeocoding: boolean) => {
    const mode = includeGeocoding ? "pdf-geocode" : "pdf";
    setExportBusy(mode);
    setExportStatus(null);
    try {
      await downloadTechnicalReportPdf({
        locale,
        includeGeocoding,
        onStatus: setExportStatus,
      });
      setExportMenuOpen(false);
    } catch (err) {
      console.error(err);
      setExportStatus(
        err instanceof Error
          ? err.message
          : isEs
            ? "No se pudo generar el PDF."
            : "Could not generate the PDF."
      );
    } finally {
      setExportBusy(null);
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/98 px-4 py-3 shadow-[0_1px_0_rgba(15,23,42,0.7)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-slate-50">
              {t.appName}
            </div>
            <div className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">
              {t.topbar.subtitle}
            </div>
          </div>
          <div className="hidden h-7 w-px bg-slate-800 sm:block" />
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-300">
            <span
              className={`h-2 w-2 rounded-full ${
                metrics.errors.length > 0
                  ? "bg-rose-400"
                  : metrics.hasLayout
                    ? "bg-emerald-400"
                    : "bg-amber-400"
              }`}
            />
            {scenarioStatusLabel(metrics.status, locale)}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {selectedEquipmentId ? (
            <>
              <Button
                variant="secondary"
                onClick={() => rotateEquipment(selectedEquipmentId, 15)}
                title={t.topbar.rotateCwTitle}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t.topbar.rotateCw}</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => rotateEquipment(selectedEquipmentId, -15)}
                title={t.topbar.rotateCcwTitle}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t.topbar.rotateCcw}</span>
              </Button>
              <Button
                variant="danger"
                onClick={() => removeEquipment(selectedEquipmentId)}
                title={t.topbar.deleteTitle}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t.topbar.delete}</span>
              </Button>
              <div className="hidden h-5 w-px bg-slate-800 sm:block" />
            </>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={!canUndo}
            title={t.topbar.undoTitle}
            aria-label={t.topbar.undoTitle}
          >
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={!canRedo}
            title={t.topbar.redoTitle}
            aria-label={t.topbar.redoTitle}
          >
            <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <div className="hidden h-5 w-px bg-slate-800 sm:block" />
          <div className="relative" ref={exportMenuRef}>
            <Button
              variant="primary"
              onClick={() => setExportMenuOpen((open) => !open)}
              title={t.topbar.exportTitle}
              aria-haspopup="menu"
              aria-expanded={exportMenuOpen}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              {t.topbar.export}
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            {exportMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl shadow-black/40"
              >
                <div className="border-b border-slate-800 px-3 py-2">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {isEs ? "Exportar proyecto" : "Export project"}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {isEs
                      ? "Descarga datos editables o reporte técnico preliminar."
                      : "Download editable data or preliminary technical report."}
                  </div>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleJsonExport}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs text-slate-100 transition hover:bg-slate-900"
                >
                  <FileJson className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                  <span>
                    <span className="block font-medium">
                      {isEs ? "Exportar JSON" : "Export JSON"}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      {isEs
                        ? "Archivo editable con geometría, equipos, resumen y warnings."
                        : "Editable file with geometry, equipment, summary and warnings."}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handlePdfExport(false)}
                  disabled={polygon.length < 3 || exportBusy !== null}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs text-slate-100 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {exportBusy === "pdf" ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-emerald-300" aria-hidden="true" />
                  ) : (
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  )}
                  <span>
                    <span className="block font-medium">
                      {isEs ? "Reporte técnico PDF" : "Technical PDF report"}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      {isEs
                        ? "PDF con mapa, layout, arquitectura, matriz normativa y trazabilidad."
                        : "PDF with map, layout, architecture, regulatory matrix and traceability."}
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handlePdfExport(true)}
                  disabled={polygon.length < 3 || exportBusy !== null}
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-xs text-slate-100 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {exportBusy === "pdf-geocode" ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-emerald-300" aria-hidden="true" />
                  ) : (
                    <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
                  )}
                  <span>
                    <span className="block font-medium">
                      {isEs ? "PDF + ubicación OSM" : "PDF + OSM location"}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                      {isEs
                        ? "Incluye geocoding opcional; si falla, conserva coordenadas."
                        : "Includes optional geocoding; if it fails, coordinates remain."}
                    </span>
                  </span>
                </button>

                {polygon.length < 3 ? (
                  <div className="border-t border-slate-800 px-3 py-2 text-[11px] text-amber-200">
                    {isEs
                      ? "Para PDF primero dibuja o aplica un terreno."
                      : "Draw or apply a terrain before exporting PDF."}
                  </div>
                ) : exportStatus ? (
                  <div className="border-t border-slate-800 px-3 py-2 text-[11px] text-slate-400">
                    {exportStatus}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <Button
            variant="secondary"
            onClick={loadDemoProject}
            title={t.topbar.demoTitle}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t.topbar.demo}
          </Button>
          <Button
            variant="secondary"
            onClick={resetProject}
            title={t.topbar.resetTitle}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {t.topbar.reset}
          </Button>
          <Button variant="ghost" onClick={toggleLocale} title={t.topbar.language}>
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            {locale === "en" ? "ES" : "EN"}
          </Button>
        </div>

        <div className="text-[11px] text-slate-500 lg:w-36 lg:text-right">
          {t.topbar.mode}:{" "}
          <span className="text-slate-200">{modeLabel(mode, locale)}</span>
          {selectedEquipmentId ? (
            <>
              <br className="hidden lg:block" />
              <span className="lg:hidden"> · </span>
              {t.topbar.selected}:{" "}
              <span className="text-slate-200">
                {selectedEquipmentId.slice(0, 6)}
              </span>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
