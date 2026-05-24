"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Loader2, MapPinned } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { downloadTechnicalReportPdf } from "@/lib/report/downloadTechnicalReport";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";

export function TechnicalReportPanel() {
  const [includeGeocoding, setIncludeGeocoding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const blocks = useProjectStore((s) => s.blocks);
  const conversionStations = useProjectStore((s) => s.conversionStations);
  const mvFeeders = useProjectStore((s) => s.mvFeeders);

  const canGenerate = polygon.length >= 3;
  const hasTechnicalArchitecture =
    conversionStations.length > 0 || mvFeeders.length > 0 || blocks.length > 0;

  const reportPreviewText = useMemo(() => {
    const parts = [
      `${polygon.length} ${isEs ? "vértices" : "vertices"}`,
      `${placed.length} ${isEs ? "equipos" : "equipment"}`,
    ];
    if (hasTechnicalArchitecture) {
      parts.push(
        `${conversionStations.length} ${isEs ? "estaciones" : "stations"}`,
        `${mvFeeders.length} feeders`
      );
    }
    return parts.join(" · ");
  }, [
    conversionStations.length,
    hasTechnicalArchitecture,
    isEs,
    mvFeeders.length,
    placed.length,
    polygon.length,
  ]);

  const handleGenerate = async () => {
    if (!canGenerate || isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      await downloadTechnicalReportPdf({
        locale,
        includeGeocoding,
        onStatus: setStatus,
      });
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : isEs
            ? "No se pudo generar el PDF. Revisa la consola para más detalle."
            : "Could not generate the PDF. Check the console for details."
      );
      setStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <div>
            <div className="text-xs font-medium text-slate-100">
              {isEs ? "Reporte PDF técnico" : "Technical PDF report"}
            </div>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {isEs
                ? "Genera un reporte preliminar con portada, coordenadas, mapa, diagrama del layout, arquitectura eléctrica, matriz normativa, trazabilidad y exclusiones."
                : "Generates a preliminary report with cover, coordinates, map, layout diagram, electrical architecture, regulatory matrix, traceability and exclusions."}
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/50 px-2.5 py-2 text-[11px] text-slate-400">
          <MapPinned className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
          {reportPreviewText}
        </div>
      </div>

      <label className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] leading-snug text-slate-300">
        <input
          type="checkbox"
          checked={includeGeocoding}
          onChange={(event) => setIncludeGeocoding(event.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-600 bg-slate-950"
        />
        <span>
          {isEs
            ? "Identificar lugar con geocoding opcional de OpenStreetMap/Nominatim. Si falla o no hay internet, el reporte usa solo coordenadas."
            : "Resolve place with optional OpenStreetMap/Nominatim geocoding. If it fails or is offline, the report uses coordinates only."}
        </span>
      </label>

      <Button
        variant="primary"
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {isGenerating
          ? isEs
            ? "Generando..."
            : "Generating..."
          : isEs
            ? "Descargar reporte PDF"
            : "Download PDF report"}
      </Button>

      {!canGenerate ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-100">
          {isEs
            ? "Dibuja o aplica un terreno antes de generar el reporte."
            : "Draw or apply a terrain before generating the report."}
        </p>
      ) : null}
      {status ? <p className="text-[11px] text-slate-400">{status}</p> : null}
      {error ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-[11px] text-rose-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
