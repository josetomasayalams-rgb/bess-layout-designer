import React from "react";
import type { SmartSiteFitOverrides } from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import { getContainersPerPcsForDuration } from "@/lib/layout/smartSiteFit/smartSiteFitPresets";
import {
  deriveEquipmentCountsFromPowerEnergy,
  estimatePowerEnergyFromCounts,
} from "@/lib/layout/smartSiteFit/smartSiteFitSizing";
import { NumberField } from "@/components/ui/NumberField";
import { Sliders, RefreshCw, X, Check, AlertTriangle } from "lucide-react";

interface MicroAdjustPanelProps {
  overrides: SmartSiteFitOverrides;
  isDirty: boolean;
  onUpdateOverrides: (overrides: Partial<SmartSiteFitOverrides>) => void;
  onRecalculate: () => void;
  onApply: () => void;
  onDiscard: () => void;
  locale: "es" | "en";
  /** Current counts/duration of the selected alternative, used as defaults. */
  currentBessCount?: number;
  currentPcsCount?: number;
  currentDurationHours?: number;
}

const DURATION_OPTIONS = [2, 4, 8, 16] as const;

export function MicroAdjustPanel({
  overrides,
  isDirty,
  onUpdateOverrides,
  onRecalculate,
  onApply,
  onDiscard,
  locale,
  currentBessCount,
  currentPcsCount,
  currentDurationHours,
}: MicroAdjustPanelProps) {
  const isEs = locale === "es";

  // Spacing defaults if not overridden
  const bessToBess = overrides.bessToBess_m ?? 3.0;
  const bessToPcs = overrides.bessToPcs_m ?? 3.0;
  const boundaryMargin = overrides.boundaryMargin_m ?? 4.0;
  const pcsToPcs = overrides.pcsToPcs_m ?? 3.0;

  // Capacity micro-adjustments are now driven by approximate power/energy.
  // The engine still consumes BESS/PCS counts, so each edit re-derives them
  // via deriveEquipmentCountsFromPowerEnergy and stores both into overrides.
  const durationHours = overrides.durationHours ?? currentDurationHours ?? 4;

  // Seed the MW/MWh inputs from the selected alternative when the user has
  // not edited them yet. Counts → approximate power/energy.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const seeded = estimatePowerEnergyFromCounts({
    bessCount: currentBessCount ?? 0,
    pcsCount: currentPcsCount ?? 0,
  });
  const targetPowerMW = overrides.targetPowerMW ?? round2(seeded.powerMW);
  const targetEnergyMWh = overrides.targetEnergyMWh ?? round2(seeded.energyMWh);

  // Live derivation used both for informational display and for the warnings.
  const derived = deriveEquipmentCountsFromPowerEnergy({
    targetPowerMW: targetPowerMW > 0 ? targetPowerMW : undefined,
    targetEnergyMWh: targetEnergyMWh > 0 ? targetEnergyMWh : undefined,
    durationHours,
  });

  // Re-derive counts whenever any of MW / MWh / duration changes and persist
  // both the user-facing targets and the engine-facing counts.
  const applyTargets = (powerMW: number, energyMWh: number, duration: number) => {
    const result = deriveEquipmentCountsFromPowerEnergy({
      targetPowerMW: powerMW > 0 ? powerMW : undefined,
      targetEnergyMWh: energyMWh > 0 ? energyMWh : undefined,
      durationHours: duration,
    });
    onUpdateOverrides({
      targetPowerMW: powerMW,
      targetEnergyMWh: energyMWh,
      durationHours: duration,
      bessCount: result.bessCount,
      pcsCount: result.pcsCount,
    });
  };

  const handlePowerChange = (value: number) => {
    applyTargets(value, targetEnergyMWh, durationHours);
  };
  const handleEnergyChange = (value: number) => {
    applyTargets(targetPowerMW, value, durationHours);
  };
  const handleDurationChange = (d: number) => {
    applyTargets(targetPowerMW, targetEnergyMWh, d);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <Sliders className="h-4 w-4 text-cyan-400" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          {isEs ? "Ajustes de capacidad y distancias" : "Capacity and Spacing Adjustments"}
        </h4>
      </div>

      {/* Capacity adjustments: approximate target power, energy and duration. */}
      <div className="space-y-3 border-b border-slate-800 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400" htmlFor="micro-target-power">
              {isEs ? "Potencia objetivo aprox. (MW)" : "Approx. target power (MW)"}
            </label>
            <NumberField
              id="micro-target-power"
              aria-label={isEs ? "Potencia objetivo aproximada en MW" : "Approximate target power in MW"}
              value={targetPowerMW}
              onChange={handlePowerChange}
              min={0}
              step={1}
              className="w-full rounded border border-slate-800 bg-slate-950 p-1 text-[11px] font-mono text-slate-350 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] text-slate-400" htmlFor="micro-target-energy">
              {isEs ? "Energía objetivo aprox. (MWh)" : "Approx. target energy (MWh)"}
            </label>
            <NumberField
              id="micro-target-energy"
              aria-label={isEs ? "Energía objetivo aproximada en MWh" : "Approximate target energy in MWh"}
              value={targetEnergyMWh}
              onChange={handleEnergyChange}
              min={0}
              step={1}
              className="w-full rounded border border-slate-800 bg-slate-950 p-1 text-[11px] font-mono text-slate-350 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1">
          <span className="block text-[11px] text-slate-400">
            {isEs ? "Duración de diseño" : "Design duration"}
          </span>
          <div className="grid grid-cols-4 gap-1">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDurationChange(d)}
                className={`rounded-md py-1.5 text-[10px] font-semibold ${
                  durationHours === d
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {d}h ({getContainersPerPcsForDuration(d)}:1)
              </button>
            ))}
          </div>
        </div>

        {/* Informational result: derived equipment counts (not an input). */}
        <div className="rounded-md border border-slate-800 bg-slate-950/60 p-2 text-[10px] leading-snug text-slate-400">
          <span className="font-semibold text-slate-300">
            {isEs ? "Equipos estimados (preliminar): " : "Estimated equipment (preliminary): "}
          </span>
          <span className="font-mono text-cyan-300">
            {derived.bessCount} {isEs ? "BESS" : "BESS"} · {derived.pcsCount} PCS/MV
          </span>
          <span className="block text-slate-500">
            {isEs
              ? `≈ ${derived.effectivePowerMW.toFixed(0)} MW · ${derived.effectiveEnergyMWh.toFixed(0)} MWh`
              : `≈ ${derived.effectivePowerMW.toFixed(0)} MW · ${derived.effectiveEnergyMWh.toFixed(0)} MWh`}
          </span>
        </div>

        {derived.warnings.map((w) => (
          <div
            key={w.id}
            className="flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] leading-snug text-amber-300/90"
          >
            <AlertTriangle className="mt-px h-3 w-3 shrink-0 text-amber-400" />
            <span>{w.message}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {/* Layout Shape Selector */}
        <div className="space-y-1">
          <label className="block text-[11px] text-slate-400">
            {isEs ? "Forma del layout" : "Layout shape"}
          </label>
          <select
            value={overrides.preferredShapeKind ?? "auto"}
            onChange={(e) =>
              onUpdateOverrides({
                preferredShapeKind: e.target.value as SmartSiteFitOverrides["preferredShapeKind"],
              })
            }
            className="w-full rounded border border-slate-800 bg-slate-950 p-1 text-[11px] text-slate-350 focus:border-cyan-500 focus:outline-none"
          >
            <option value="auto">
              {isEs ? "Automática recomendada" : "Automatic (recommended)"}
            </option>
            <option value="single_row">{isEs ? "Fila Única" : "Single Row"}</option>
            <option value="two_row_block">{isEs ? "Dos Hileras" : "Two Rows"}</option>
            <option value="compact_grid">{isEs ? "Compacta" : "Compact Grid"}</option>
            <option value="wide_grid">{isEs ? "Ancha" : "Wide Grid"}</option>
            <option value="deep_grid">{isEs ? "Profunda" : "Deep Grid"}</option>
            <option value="multi_block">{isEs ? "Multibloque" : "Multi-block"}</option>
            <option value="split_blocks">{isEs ? "Bloques Separados" : "Split Blocks"}</option>
          </select>
        </div>

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
            : "Adjustments have changed. Click Recalculate to update the sizing preview."}
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
