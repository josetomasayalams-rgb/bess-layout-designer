import React from "react";
import type { SmartSiteFitCandidate } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import { strategyLabel, explainAlternative } from "@/lib/layout/smartSiteFit/smartSiteFitExplain";
import { DEFAULT_PERFORMANCE_BUDGET } from "@/lib/layout/smartSiteFit/smartSiteFitPerformance";
import { summarizePlacedEquipment } from "@/lib/layout/smartSiteFit/smartSiteFitSizing";
import { AlertTriangle, Info, Check, Layers } from "lucide-react";

interface AlternativeCardProps {
  candidate: SmartSiteFitCandidate;
  isSelected: boolean;
  onSelect: () => void;
  onApply?: () => void;
  locale: "es" | "en";
}

export function AlternativeCard({
  candidate,
  isSelected,
  onSelect,
  onApply,
  locale,
}: AlternativeCardProps) {
  const isEs = locale === "es";

  // Architecture-agnostic: correct for Sungrow (separate BESS + PCS) and for
  // integrated presets (units carry their own inverter, pcsCount === 0).
  const summary = summarizePlacedEquipment(candidate.placedEquipment);
  const bessCount = summary.bessCount;
  const pcsCount = summary.pcsCount;
  const isIntegrated = pcsCount === 0 && bessCount > 0;

  const totalMW = parseFloat(summary.powerMW.toFixed(1));
  const totalMWh = parseFloat(summary.energyMWh.toFixed(2));
  const duration = totalMW > 0 ? parseFloat((totalMWh / totalMW).toFixed(1)) : 0;
  const ratio = pcsCount > 0 ? parseFloat((bessCount / pcsCount).toFixed(1)) : 0;

  const explanation = explainAlternative(candidate, locale);

  // Giant layouts render a simplified (aggregated) map preview to stay fluid;
  // applying still places the full equipment list.
  const totalEquipment = candidate.placedEquipment.length;
  const previewSimplified =
    totalEquipment > DEFAULT_PERFORMANCE_BUDGET.maxPreviewFeaturesBeforeSimplification;

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-lg border p-3 transition-all ${
        isSelected
          ? "border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-950/20"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60"
      }`}
    >
      {isSelected && (
        <div className="absolute right-2 top-2 rounded-full bg-cyan-500 p-0.5 text-slate-950">
          <Check className="h-3 w-3" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-200">
          {strategyLabel(candidate.strategy, locale)}
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
            candidate.score.total >= 80
              ? "bg-emerald-500/10 text-emerald-300"
              : candidate.score.total >= 50
              ? "bg-amber-500/10 text-amber-300"
              : "bg-rose-500/10 text-rose-300"
          }`}
        >
          {isEs ? "Puntaje" : "Score"}: {candidate.score.total}/100
        </span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 border-y border-slate-800/60 py-2 text-[11px]">
        <div>
          <span className="block text-[10px] text-slate-500">
            {isIntegrated ? (isEs ? "Unidades" : "Units") : "BESS"}
          </span>
          <span className="font-mono font-bold text-slate-350">{bessCount} u.</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">
            {isIntegrated ? (isEs ? "PCS" : "PCS") : "PCS/MV"}
          </span>
          <span className="font-mono font-bold text-slate-350">
            {isIntegrated ? (isEs ? "Integrado" : "Integrated") : `${pcsCount} u.`}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">
            {isIntegrated ? (isEs ? "Arquitectura" : "Architecture") : "Ratio"}
          </span>
          <span className="font-mono font-bold text-slate-350">
            {isIntegrated ? (isEs ? "Integrada" : "Integrated") : `${ratio}:1`}
          </span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">
            {isEs ? "Potencia" : "Power"}
          </span>
          <span className="font-mono font-bold text-cyan-300">{totalMW} MW</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">
            {isEs ? "Energía" : "Energy"}
          </span>
          <span className="font-mono font-bold text-cyan-300">{totalMWh} MWh</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">
            {isEs ? "Duración" : "Duration"}
          </span>
          <span className="font-mono font-bold text-cyan-300">{duration}h</span>
        </div>
      </div>

      {candidate.shape && (
        <div className="mt-2 flex items-center justify-between text-[10px]">
          <div>
            <span className="text-slate-500">{isEs ? "Forma: " : "Shape: "}</span>
            <span className="rounded bg-slate-850 px-1.5 py-0.5 text-cyan-300 font-medium font-mono text-[9.5px]">
              {candidate.shape.label}
            </span>
          </div>
          {candidate.score.siteUtilizationPct != null && (
            <div>
              <span className="text-slate-500">{isEs ? "Ocupación: " : "Occupancy: "}</span>
              <span className="font-mono font-bold text-slate-350">
                {candidate.score.siteUtilizationPct}%
              </span>
            </div>
          )}
        </div>
      )}

      {(candidate.score.terrainFit != null || candidate.score.pcsIntegration != null) && (
        <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
          {candidate.score.terrainFit != null && (
            <span>
              {isEs ? "Ajuste terreno" : "Terrain fit"}:{" "}
              <span className="font-mono text-slate-350">{candidate.score.terrainFit}/10</span>
            </span>
          )}
          {candidate.score.pcsIntegration != null && (
            <span>
              {isEs ? "Integración PCS" : "PCS integration"}:{" "}
              <span className="font-mono text-slate-350">{candidate.score.pcsIntegration}/10</span>
            </span>
          )}
        </div>
      )}

      <p className="mt-2 text-[10px] leading-relaxed text-slate-400 font-sans">
        {explanation}
      </p>

      {previewSimplified && (
        <div className="mt-2 flex items-start gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/10 p-2 text-[9.5px] leading-snug text-cyan-200/90">
          <Layers className="mt-px h-3 w-3 shrink-0 text-cyan-400" />
          <span>
            {isEs
              ? `Preview simplificado por rendimiento: ${totalEquipment} equipos agrupados visualmente. Aplicar generará el layout completo.`
              : `Simplified preview for performance: ${totalEquipment} units grouped visually. Applying generates the full layout.`}
          </span>
        </div>
      )}

      {candidate.warnings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {candidate.warnings.slice(0, 3).map((w) => (
            <li
              key={w.id}
              className="flex items-start gap-1 text-[9.5px] leading-snug text-slate-400"
            >
              <AlertTriangle
                className={`mt-px h-3 w-3 shrink-0 ${
                  w.severity === "error"
                    ? "text-rose-500/80"
                    : w.severity === "warning"
                    ? "text-amber-500/80"
                    : "text-cyan-500/80"
                }`}
              />
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500/80" />
          {candidate.warnings.length} {isEs ? "alertas" : "warnings"}
        </span>
        <span className="flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-cyan-500/80" />
          {candidate.assumptions.length} {isEs ? "supuestos" : "assumptions"}
        </span>
      </div>

      {isSelected && onApply && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onApply();
          }}
          className="mt-3 flex w-full justify-center rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
        >
          {isEs ? "Aplicar alternativa" : "Apply alternative"}
        </button>
      )}
    </div>
  );
}
