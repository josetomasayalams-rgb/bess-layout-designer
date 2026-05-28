import React from "react";
import type { SmartSiteFitCandidate } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import { strategyLabel, explainAlternative } from "@/lib/layout/smartSiteFit/smartSiteFitExplain";
import { AlertTriangle, Info, Check } from "lucide-react";

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

  const bessCount = candidate.placedEquipment.filter(
    (e) => e.equipmentSpecId === "sungrow-st2752ux-us"
  ).length;
  const pcsCount = candidate.placedEquipment.filter(
    (e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3"
  ).length;

  const totalMW = pcsCount * 5;
  const totalMWh = parseFloat((bessCount * 2.752).toFixed(2));
  const duration = totalMW > 0 ? parseFloat((totalMWh / totalMW).toFixed(1)) : 0;
  const ratio = pcsCount > 0 ? parseFloat((bessCount / pcsCount).toFixed(1)) : 0;

  const explanation = explainAlternative(candidate, locale);

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
          <span className="block text-[10px] text-slate-500">BESS</span>
          <span className="font-mono font-bold text-slate-350">{bessCount} u.</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">PCS/MV</span>
          <span className="font-mono font-bold text-slate-350">{pcsCount} u.</span>
        </div>
        <div>
          <span className="block text-[10px] text-slate-500">Ratio</span>
          <span className="font-mono font-bold text-slate-350">{ratio}:1</span>
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

      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        {explanation}
      </p>

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
