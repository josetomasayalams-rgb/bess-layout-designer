import React, { useState } from "react";
import type {
  SmartSiteFitInput,
  SmartSiteFitResult,
  SmartSiteFitOverrides,
  SmartSiteFitStrategy,
} from "@/lib/layout/smartSiteFit/smartSiteFitTypes";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import {
  getDefaultSmartSiteFitPreset,
  getSmartSiteFitPresetById,
  getContainersPerPcsForDuration,
  isIntegratedPreset,
} from "@/lib/layout/smartSiteFit/smartSiteFitPresets";
import { summarizePlacedEquipment } from "@/lib/layout/smartSiteFit/smartSiteFitSizing";
import { buildSmartSiteFitPreview } from "@/lib/layout/smartSiteFit/smartSiteFitPreview";
import { AlternativeCard } from "./AlternativeCard";
import { MicroAdjustPanel } from "./MicroAdjustPanel";
import { BessSystemSelector } from "./BessSystemSelector";
import { NumberField } from "@/components/ui/NumberField";
import { Loader2 } from "lucide-react";

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
  /** Site polygon, passed to each preview for the optional site outline. */
  polygon?: LngLat[];
  /** Local frame origin for previews. */
  anchor?: ProjectAnchor;
}

export function TargetSizingTab({
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
  polygon,
  anchor,
}: TargetSizingTabProps) {
  const isEs = locale === "es";

  const [targetMW, setTargetMW] = useState<number>(30);
  const [targetMWh, setTargetMWh] = useState<number>(120);
  const [duration, setDuration] = useState<number>(4);
  const [strategy, setStrategy] = useState<SmartSiteFitStrategy>("balanced");
  const [presetId, setPresetId] = useState<string>(getDefaultSmartSiteFitPreset().id);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<"auto" | "manual">("auto");
  const [containersWide, setContainersWide] = useState<number>(4);
  const [groupCount, setGroupCount] = useState<number>(1);
  const [orientationDeg, setOrientationDeg] = useState<number>(0);
  const [colGroupSize, setColGroupSize] = useState<number>(0);
  const [rowGroupSize, setRowGroupSize] = useState<number>(0);
  const [colGroupSeparation, setColGroupSeparation] = useState<number>(6.0);
  const [rowGroupSeparation, setRowGroupSeparation] = useState<number>(6.0);

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
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    window.setTimeout(() => {
      onRunAnalysis({
        mode: "target",
        targetMW,
        targetMWh,
        durationHours: duration,
        strategy,
        presetId,
        overrides: {
          layoutMode,
          containersWide: layoutMode === "manual" ? containersWide : undefined,
          groupCount: layoutMode === "manual" ? groupCount : undefined,
          orientationDeg: layoutMode === "manual" ? orientationDeg : undefined,
          colGroupSize: layoutMode === "manual" ? colGroupSize : undefined,
          rowGroupSize: layoutMode === "manual" ? rowGroupSize : undefined,
          colGroupSeparation_m: layoutMode === "manual" ? colGroupSeparation : undefined,
          rowGroupSeparation_m: layoutMode === "manual" ? rowGroupSeparation : undefined,
        },
      });
      setIsAnalyzing(false);
    }, 0);
  };

  const handleDurationChange = (hrs: number) => {
    setDuration(hrs);
    // Automatically update MWh based on MW * duration for helper guidance
    setTargetMWh(targetMW * hrs);
  };

  const selectedAlternative = result?.candidates.find(
    (c) => c.id === selectedAlternativeId
  );

  const preview = React.useMemo(() => {
    if (!selectedAlternative) return null;
    return buildSmartSiteFitPreview(selectedAlternative, { polygon, anchor });
  }, [selectedAlternative, polygon, anchor]);

  const selectedSummary = selectedAlternative
    ? summarizePlacedEquipment(selectedAlternative.placedEquipment)
    : undefined;
  const selectedBessCount = selectedSummary?.bessCount ?? 0;
  const selectedPcsCount = selectedSummary?.pcsCount ?? 0;

  return (
    <div className="space-y-4">
      {!result ? (
        isAnalyzing ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-slate-800 bg-slate-900/40 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-300">
                {isEs ? "Analizando opciones de layout…" : "Analyzing layout options…"}
              </p>
              <p className="text-[10px] text-slate-500">
                {isEs
                  ? "Generando alternativas según la forma del terreno."
                  : "Generating alternatives from the terrain shape."}
              </p>
            </div>
          </div>
        ) : (
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
              <NumberField
                id="target-mw"
                value={targetMW}
                min={1}
                integer
                onChange={(val) => {
                  setTargetMW(val);
                  setTargetMWh(val * duration);
                }}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
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
              <NumberField
                id="target-mwh"
                value={targetMWh}
                min={1}
                integer
                onChange={(val) => setTargetMWh(val)}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Layout Mode Select */}
            <div className="space-y-1">
              <label htmlFor="layout-mode" className="block text-[11px] text-slate-400">
                {isEs ? "Configuración de layout" : "Layout Configuration"}
              </label>
              <select
                id="layout-mode"
                value={layoutMode}
                onChange={(e) => setLayoutMode(e.target.value as "auto" | "manual")}
                className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="auto">
                  {isEs ? "Automática (Calculador)" : "Automatic (Calculator)"}
                </option>
                <option value="manual">
                  {isEs ? "Manual (Personalizada)" : "Manual (Custom)"}
                </option>
              </select>
            </div>
          </div>

          {layoutMode === "auto" ? (
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
          ) : (
            <div className="space-y-2 rounded-md border border-slate-850 bg-slate-950/40 p-2.5">
              <div className="grid grid-cols-3 gap-2">
                {/* Containers Wide */}
                <div className="space-y-1">
                  <label htmlFor="manual-wide" className="block text-[10px] text-slate-400">
                    {isEs ? "Ancho BESS" : "BESS Columns"}
                  </label>
                  <NumberField
                    id="manual-wide"
                    value={containersWide}
                    min={1}
                    integer
                    onChange={(val) => setContainersWide(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Group Count */}
                <div className="space-y-1">
                  <label htmlFor="manual-groups" className="block text-[10px] text-slate-400">
                    {isEs ? "Bloques Horiz." : "Block Cols"}
                  </label>
                  <NumberField
                    id="manual-groups"
                    value={groupCount}
                    min={1}
                    integer
                    onChange={(val) => setGroupCount(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Orientation Deg */}
                <div className="space-y-1">
                  <label htmlFor="manual-angle" className="block text-[10px] text-slate-400">
                    {isEs ? "Orientación (°)" : "Orientation (°)"}
                  </label>
                  <NumberField
                    id="manual-angle"
                    value={orientationDeg}
                    onChange={(val) => setOrientationDeg(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Sub-group separations columns/rows */}
              <div className="grid grid-cols-2 gap-2 border-t border-slate-800/40 pt-2">
                <div className="space-y-1">
                  <label htmlFor="manual-col-group" className="block text-[10px] text-slate-400">
                    {isEs ? "Separar cols. (cada N)" : "Separate cols (every N)"}
                  </label>
                  <NumberField
                    id="manual-col-group"
                    value={colGroupSize}
                    min={0}
                    integer
                    onChange={(val) => setColGroupSize(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="manual-col-sep" className="block text-[10px] text-slate-400">
                    {isEs ? "Sep. columnas (m)" : "Col Separation (m)"}
                  </label>
                  <NumberField
                    id="manual-col-sep"
                    value={colGroupSeparation}
                    min={0}
                    onChange={(val) => setColGroupSeparation(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="manual-row-group" className="block text-[10px] text-slate-400">
                    {isEs ? "Separar filas (cada N)" : "Separate rows (every N)"}
                  </label>
                  <NumberField
                    id="manual-row-group"
                    value={rowGroupSize}
                    min={0}
                    integer
                    onChange={(val) => setRowGroupSize(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="manual-row-sep" className="block text-[10px] text-slate-400">
                    {isEs ? "Sep. filas (m)" : "Row Separation (m)"}
                  </label>
                  <NumberField
                    id="manual-row-sep"
                    value={rowGroupSeparation}
                    min={0}
                    onChange={(val) => setRowGroupSeparation(val)}
                    className="w-full rounded border border-slate-800 bg-slate-900 p-1 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

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
        )
      ) : (
        <div className="space-y-4">
          {overrides.layoutMode === "manual" ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <h5 className="text-xs font-bold text-slate-200">
                  {isEs ? "Vista Previa de Layout Manual" : "Manual Layout Preview"}
                </h5>
                <button
                  onClick={onDiscard}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                >
                  {isEs ? "Nueva búsqueda/Parámetros" : "New search/Parameters"}
                </button>
              </div>

              <div className="rounded-md border border-cyan-500/25 bg-cyan-500/5 p-2.5 text-xs text-slate-350 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-cyan-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  {isEs ? "Vista previa activa en el mapa" : "Active preview on the map"}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {isEs
                    ? "El diseño manual se proyecta en el mapa con contornos celestes segmentados. Modifica las dimensiones con los controles de abajo. Haz clic en 'Recalcular' para refrescar el mapa, o 'Aplicar' para consolidar."
                    : "The manual design is projected on the map with dashed light blue outlines. Adjust distances using the controls below. Click 'Recalculate' to refresh the map, or 'Apply' to commit."}
                </p>
              </div>

              {/* Schematic SVG Visor (Preview block diagram) */}
              {preview && preview.blocks.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-slate-500">
                      {isEs ? "Esquema del bloque" : "Block Diagram"}
                    </span>
                    <span className="font-mono text-cyan-400">
                      {selectedBessCount} BESS {selectedPcsCount > 0 ? `· ${selectedPcsCount} PCS` : ""}
                    </span>
                  </div>
                  <div className="rounded border border-slate-900 bg-slate-950/80 p-2 flex flex-col items-center justify-center gap-2">
                    <svg
                      viewBox={`0 0 ${preview.width} ${preview.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="h-24 w-full transition-all duration-300"
                      role="img"
                      aria-label={isEs ? "Visor de layout manual" : "Manual layout schematic"}
                    >
                      {preview.site && (
                        <polygon
                          points={preview.site.points.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="rgb(71 85 105 / 0.7)"
                          strokeWidth={0.6}
                          strokeDasharray="2 1.5"
                        />
                      )}
                      {preview.blocks.map((b, i) => (
                        <rect
                          key={i}
                          x={b.x}
                          y={b.y}
                          width={Math.max(b.w, 0.4)}
                          height={Math.max(b.h, 0.4)}
                          fill={b.kind === "pcs" ? "rgb(251 191 36 / 0.9)" : "rgb(34 211 238 / 0.75)"}
                          rx={0.2}
                          ry={0.2}
                        />
                      ))}
                    </svg>

                    <div className="flex justify-center gap-4 text-[9px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-cyan-400/80"></span>
                        {isEs ? "Contenedores BESS" : "BESS Enclosures"}
                      </span>
                      {selectedPcsCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400/90"></span>
                          {isEs ? "Estación PCS/MV" : "PCS/MV Station"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <h5 className="text-xs font-bold text-slate-400">
                  {isEs ? "Alternativas de layout" : "Layout Alternatives"}
                </h5>
                <button
                  onClick={onDiscard}
                  className="text-[11px] text-slate-500 hover:text-slate-350"
                >
                  {isEs ? "Nueva búsqueda" : "New search"}
                </button>
              </div>

              {result.candidates.length > 0 ? (
                <>
                  <p className="text-[10px] text-slate-500">
                    {isEs
                      ? `${result.candidates.length} alternativas — selecciona una para ajustarla y aplicarla.`
                      : `${result.candidates.length} alternatives — select one to adjust and apply.`}
                  </p>
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {result.candidates.map((candidate) => (
                      <AlternativeCard
                        key={candidate.id}
                        candidate={candidate}
                        isSelected={candidate.id === selectedAlternativeId}
                        onSelect={() => onSelectAlternative(candidate.id)}
                        locale={locale}
                        polygon={polygon}
                        anchor={anchor}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-500">
                  {isEs ? "No se generaron alternativas válidas." : "No valid alternatives generated."}
                </p>
              )}
            </>
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
