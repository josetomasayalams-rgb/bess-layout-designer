import React, { useState } from "react";
import type {
  SmartSiteFitInput,
  SmartSiteFitResult,
  SmartSiteFitOverrides,
  SmartSiteFitStrategy,
} from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import {
  getDefaultSmartSiteFitPreset,
  getSmartSiteFitPresetById,
  getContainersPerPcsForDuration,
  isIntegratedPreset,
} from "@/lib/layout/smartSiteFit/smartSiteFitPresets";
import { summarizePlacedEquipment } from "@/lib/layout/smartSiteFit/smartSiteFitSizing";
import { AlternativeCard } from "./AlternativeCard";
import { MicroAdjustPanel } from "./MicroAdjustPanel";
import { BessSystemSelector } from "./BessSystemSelector";

interface TargetSizingTabProps {
  result: SmartSiteFitResult | null;
  selectedAlternativeId: string | null;
  overrides: SmartSiteFitOverrides;
  isDirty: boolean;
  onRunAnalysis: (input: SmartSiteFitInput) => void;
  onSelectAlternative: (id: string) => void;
  onUpdateOverrides: (overrides: Partial<SmartSiteFitOverrides>) => void;
  onRecalculate: () => void;
  onApply: () => void;
  onDiscard: () => void;
  locale: "es" | "en";
}

export function TargetSizingTab({
  result,
  selectedAlternativeId,
  overrides,
  isDirty,
  onRunAnalysis,
  onUpdateOverrides,
  onRecalculate,
  onApply,
  onDiscard,
  locale,
}: TargetSizingTabProps) {
  const isEs = locale === "es";

  const [targetMW, setTargetMW] = useState<number>(30);
  const [targetMWh, setTargetMWh] = useState<number>(120);
  const [duration, setDuration] = useState<number>(4);
  const [strategy, setStrategy] = useState<SmartSiteFitStrategy>("balanced");
  const [presetId, setPresetId] = useState<string>(getDefaultSmartSiteFitPreset().id);

  const preset = getSmartSiteFitPresetById(presetId);
  const integrated = isIntegratedPreset(preset);
  const durationOptions = preset.supportedDurations ?? [2, 4, 8, 16];

  const handlePresetChange = (id: string) => {
    setPresetId(id);
    // If the new system does not support the current duration, snap to its
    // default so the form never holds an unsupported configuration.
    const next = getSmartSiteFitPresetById(id);
    const supported = next.supportedDurations ?? [2, 4, 8, 16];
    if (!supported.includes(duration)) {
      const fallback = next.defaultDurationHours;
      setDuration(fallback);
      setTargetMWh(targetMW * fallback);
    }
    // Switching the system invalidates any current preview.
    onDiscard();
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    onRunAnalysis({
      mode: "target",
      targetMW,
      targetMWh,
      durationHours: duration,
      strategy,
      presetId,
    });
  };

  const handleDurationChange = (hrs: number) => {
    setDuration(hrs);
    // Automatically update MWh based on MW * duration for helper guidance
    setTargetMWh(targetMW * hrs);
  };

  const selectedAlternative = result?.candidates.find(
    (c) => c.id === selectedAlternativeId
  );

  const selectedSummary = selectedAlternative
    ? summarizePlacedEquipment(selectedAlternative.placedEquipment)
    : undefined;
  const selectedBessCount = selectedSummary?.bessCount;
  const selectedPcsCount = selectedSummary?.pcsCount;

  return (
    <div className="space-y-4">
      {!result ? (
        <form onSubmit={handleCalculate} className="space-y-3">
          {/* BESS system selector */}
          <BessSystemSelector
            presetId={presetId}
            onChange={handlePresetChange}
            locale={locale}
          />

          <div className="grid grid-cols-2 gap-3">
            {/* Target Power MW */}
            <div className="space-y-1">
              <label htmlFor="target-mw" className="block text-[11px] text-slate-400">
                {isEs ? "Potencia objetivo (MW)" : "Target Power (MW)"}
              </label>
              <input
                id="target-mw"
                type="number"
                min="1"
                value={targetMW}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 0);
                  setTargetMW(val);
                  setTargetMWh(val * duration);
                }}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            {/* Duration select */}
            <div className="space-y-1">
              <label htmlFor="target-duration" className="block text-[11px] text-slate-400">
                {isEs ? "Duración" : "Duration"}
              </label>
              <div
                id="target-duration"
                className={`grid gap-1 ${
                  durationOptions.length <= 2 ? "grid-cols-2" : "grid-cols-4"
                }`}
              >
                {durationOptions.map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => handleDurationChange(hrs)}
                    className={`rounded-md py-1.5 text-[10px] font-semibold ${
                      duration === hrs
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {integrated
                      ? `${hrs}h`
                      : `${hrs}h (${getContainersPerPcsForDuration(hrs)}:1)`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Target Energy MWh */}
            <div className="space-y-1">
              <label htmlFor="target-mwh" className="block text-[11px] text-slate-400">
                {isEs ? "Energía objetivo (MWh)" : "Target Energy (MWh)"}
              </label>
              <input
                id="target-mwh"
                type="number"
                min="1"
                value={targetMWh}
                onChange={(e) =>
                  setTargetMWh(Math.max(1, parseInt(e.target.value) || 0))
                }
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                required
              />
            </div>

            {/* Strategy Select */}
            <div className="space-y-1">
              <label htmlFor="target-strategy" className="block text-[11px] text-slate-400">
                {isEs ? "Estrategia de diseño" : "Design Strategy"}
              </label>
              <select
                id="target-strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as SmartSiteFitStrategy)}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="max_capacity">
                  {isEs ? "Compacta" : "Compact"}
                </option>
                <option value="balanced">{isEs ? "Balanceada" : "Balanced"}</option>
                <option value="conservative">
                  {isEs ? "Conservadora" : "Conservative"}
                </option>
              </select>
            </div>
          </div>

          {!integrated && (duration === 8 || duration === 16) && (
            <div className="rounded-md border border-slate-800 bg-slate-950 p-2 text-[10px] text-slate-400 leading-tight space-y-1">
              <p>
                {isEs
                  ? "Las configuraciones de 8h y 16h se calculan por extensión proporcional del patrón BESS/PCS. Deben validarse con fabricante o EPC antes de uso de ingeniería."
                  : "The 8h and 16h configurations are calculated by proportional extension of the BESS/PCS pattern. They must be validated with the manufacturer or EPC before engineering use."}
              </p>
              <p className="text-slate-500 font-medium">
                {isEs
                  ? "El resultado es un predimensionamiento preliminar. No representa ingeniería de detalle."
                  : "The result is a preliminary pre-dimensioning. It does not represent detailed engineering."}
              </p>
            </div>
          )}

          <button
            type="submit"
            className="mt-4 flex w-full justify-center rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            {isEs ? "Calcular alternativa" : "Calculate alternative"}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <h5 className="text-xs font-bold text-slate-400">
              {isEs ? "Alternativa generada" : "Generated Alternative"}
            </h5>
            <button
              onClick={onDiscard}
              className="text-[11px] text-slate-500 hover:text-slate-350"
            >
              {isEs ? "Nueva búsqueda" : "New search"}
            </button>
          </div>

          {selectedAlternative ? (
            <AlternativeCard
              candidate={selectedAlternative}
              isSelected={true}
              onSelect={() => {}}
              locale={locale}
            />
          ) : (
            <p className="text-xs text-slate-500">
              {isEs ? "No se generaron alternativas válidas." : "No valid alternatives generated."}
            </p>
          )}

          {selectedAlternative && (
            <MicroAdjustPanel
              overrides={overrides}
              isDirty={isDirty}
              onUpdateOverrides={onUpdateOverrides}
              onRecalculate={onRecalculate}
              onApply={onApply}
              onDiscard={onDiscard}
              locale={locale}
              preset={preset}
              currentBessCount={selectedBessCount}
              currentPcsCount={selectedPcsCount}
              currentDurationHours={duration}
            />
          )}
        </div>
      )}
    </div>
  );
}
