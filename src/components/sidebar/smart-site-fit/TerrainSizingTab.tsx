import React, { useState } from "react";
import type {
  SmartSiteFitInput,
  SmartSiteFitResult,
  SmartSiteFitOverrides,
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
import { Map } from "lucide-react";

interface TerrainSizingTabProps {
  hasPolygon: boolean;
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

export function TerrainSizingTab({
  hasPolygon,
  result,
  selectedAlternativeId,
  overrides,
  isDirty,
  onRunAnalysis,
  onSelectAlternative,
  onUpdateOverrides,
  onRecalculate,
  onApply,
  onDiscard,
  locale,
}: TerrainSizingTabProps) {
  const isEs = locale === "es";

  const [duration, setDuration] = useState<number>(4);
  const [presetId, setPresetId] = useState<string>(getDefaultSmartSiteFitPreset().id);

  const preset = getSmartSiteFitPresetById(presetId);
  const integrated = isIntegratedPreset(preset);
  const durationOptions = preset.supportedDurations ?? [2, 4, 8, 16];

  const handlePresetChange = (id: string) => {
    setPresetId(id);
    // Snap to the new system's default duration if it does not support the
    // currently selected one, so the form never holds an invalid configuration.
    const next = getSmartSiteFitPresetById(id);
    const supported = next.supportedDurations ?? [2, 4, 8, 16];
    if (!supported.includes(duration)) {
      setDuration(next.defaultDurationHours);
    }
    // Switching the system invalidates any current preview.
    onDiscard();
  };

  const handleAnalyze = () => {
    onRunAnalysis({
      mode: "terrain",
      durationHours: duration,
      strategy: "balanced", // Start with balanced as default, candidates for all strategies will be generated
      presetId,
    });
  };

  const selectedAlternative = result?.candidates.find(
    (c) => c.id === selectedAlternativeId
  );

  const selectedSummary = selectedAlternative
    ? summarizePlacedEquipment(selectedAlternative.placedEquipment)
    : undefined;
  const selectedBessCount = selectedSummary?.bessCount;
  const selectedPcsCount = selectedSummary?.pcsCount;

  if (!hasPolygon) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center">
        <Map className="h-8 w-8 text-slate-655 text-slate-500 mb-2" />
        <p className="text-xs text-slate-400 leading-relaxed max-w-[200px]">
          {isEs
            ? "Por favor dibuje un polígono en el mapa antes de ejecutar el dimensionamiento inteligente por terreno."
            : "Please draw a terrain polygon on the map before running terrain smart sizing."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!result ? (
        <div className="space-y-3">
          {/* BESS system selector */}
          <BessSystemSelector
            presetId={presetId}
            onChange={handlePresetChange}
            locale={locale}
          />

          <div className="space-y-1">
            <span className="block text-[11px] text-slate-405 text-slate-500">
              {isEs ? "Equipos predefinidos" : "Default Equipment"}
            </span>
            <div className="rounded-md border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-300">
              {preset.name}
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              {integrated
                ? isEs
                  ? "Sistema integrado (AC); el transformador MT externo no está modelado y debe ser definido por ingeniería. No se crean PCS ni transformadores adicionales."
                  : "Integrated AC system; the external MV transformer is not modeled and must be defined by engineering. No separate PCS or transformers are created."
                : isEs
                ? "El PCS integra transformador BT/MT; no se crean transformadores adicionales."
                : "PCS integrates LV/MV transformer; no separate transformers will be created."}
            </p>
          </div>

          <div className="space-y-1">
            <span className="block text-[11px] text-slate-400">
              {isEs ? "Duración de diseño" : "Design Duration"}
            </span>
            <div
              className={`grid gap-1 ${
                durationOptions.length <= 2 ? "grid-cols-2" : "grid-cols-4"
              }`}
            >
              {durationOptions.map((hrs) => (
                <button
                  key={hrs}
                  type="button"
                  onClick={() => setDuration(hrs)}
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
            onClick={handleAnalyze}
            className="mt-4 flex w-full justify-center rounded-md bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-cyan-500"
          >
            {isEs ? "Analizar terreno" : "Analyze terrain"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2">
            <h5 className="text-xs font-bold text-slate-400">
              {isEs ? "Alternativas de distribución" : "Layout Alternatives"}
            </h5>
            <button
              onClick={onDiscard}
              className="text-[11px] text-slate-500 hover:text-slate-350"
            >
              {isEs ? "Nueva búsqueda" : "New search"}
            </button>
          </div>

          <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
            {result.candidates.map((candidate) => (
              <AlternativeCard
                key={candidate.id}
                candidate={candidate}
                isSelected={candidate.id === selectedAlternativeId}
                onSelect={() => onSelectAlternative(candidate.id)}
                locale={locale}
              />
            ))}
          </div>

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
