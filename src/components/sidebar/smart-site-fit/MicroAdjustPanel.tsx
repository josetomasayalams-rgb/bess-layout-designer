import React from "react";
import type { SmartSiteFitOverrides } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import { Sliders, RefreshCw, X, Check } from "lucide-react";

interface MicroAdjustPanelProps {
  overrides: SmartSiteFitOverrides;
  isDirty: boolean;
  onUpdateOverrides: (overrides: Partial<SmartSiteFitOverrides>) => void;
  onRecalculate: () => void;
  onApply: () => void;
  onDiscard: () => void;
  locale: "es" | "en";
}

export function MicroAdjustPanel({
  overrides,
  isDirty,
  onUpdateOverrides,
  onRecalculate,
  onApply,
  onDiscard,
  locale,
}: MicroAdjustPanelProps) {
  const isEs = locale === "es";

  // Spacing defaults if not overridden
  const bessToBess = overrides.bessToBess_m ?? 3.0;
  const bessToPcs = overrides.bessToPcs_m ?? 3.0;
  const boundaryMargin = overrides.boundaryMargin_m ?? 4.0;
  const pcsToPcs = overrides.pcsToPcs_m ?? 3.0;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Sliders className="h-4 w-4 text-cyan-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          {isEs ? "Ajustes perimetrales y distancias" : "Setbacks and Spacing Adjustments"}
        </h4>
      </div>

      <div className="space-y-3">
        {/* BESS to BESS */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">
              {isEs ? "Separación BESS - BESS" : "BESS - BESS Separation"}
            </span>
            <span className="font-mono font-bold text-cyan-300">{bessToBess}m</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="10.0"
            step="0.5"
            value={bessToBess}
            onChange={(e) =>
              onUpdateOverrides({ bessToBess_m: parseFloat(e.target.value) })
            }
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* BESS to PCS */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">
              {isEs ? "Separación BESS - PCS" : "BESS - PCS Separation"}
            </span>
            <span className="font-mono font-bold text-cyan-300">{bessToPcs}m</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="10.0"
            step="0.5"
            value={bessToPcs}
            onChange={(e) =>
              onUpdateOverrides({ bessToPcs_m: parseFloat(e.target.value) })
            }
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Boundary Margin */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">
              {isEs ? "Margen al deslinde (setback)" : "Boundary Margin (Setback)"}
            </span>
            <span className="font-mono font-bold text-cyan-300">{boundaryMargin}m</span>
          </div>
          <input
            type="range"
            min="3.0"
            max="20.0"
            step="0.5"
            value={boundaryMargin}
            onChange={(e) =>
              onUpdateOverrides({ boundaryMargin_m: parseFloat(e.target.value) })
            }
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* PCS to PCS */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-400">
              {isEs ? "Ancho del corredor MT (PCS - PCS)" : "MV Corridor Width (PCS - PCS)"}
            </span>
            <span className="font-mono font-bold text-cyan-300">{pcsToPcs}m</span>
          </div>
          <input
            type="range"
            min="2.5"
            max="15.0"
            step="0.5"
            value={pcsToPcs}
            onChange={(e) =>
              onUpdateOverrides({ pcsToPcs_m: parseFloat(e.target.value) })
            }
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>

      {isDirty && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-300/90 leading-tight">
          {isEs
            ? "Hay cambios pendientes. Haz clic en Recalcular para actualizar la previsualización."
            : "Spacings have changed. Click Recalculate to update the sizing preview."}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onRecalculate}
          disabled={!isDirty}
          className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold shadow-sm transition-all ${
            isDirty
              ? "bg-amber-600 text-white hover:bg-amber-500"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isDirty ? "animate-spin-slow" : ""}`} />
          {isEs ? "Recalcular" : "Recalculate"}
        </button>

        <button
          onClick={onApply}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-cyan-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500"
        >
          <Check className="h-3.5 w-3.5" />
          {isEs ? "Aplicar" : "Apply"}
        </button>

        <button
          onClick={onDiscard}
          className="flex items-center justify-center gap-1 rounded-md bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          title={isEs ? "Descartar cambios" : "Discard changes"}
        >
          <X className="h-3.5 w-3.5" />
          {isEs ? "Descartar" : "Discard"}
        </button>
      </div>
    </div>
  );
}
