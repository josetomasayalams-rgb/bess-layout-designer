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
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import {
  resolveContainersPerPcs,
  resolveSeparatePcsEquipment,
} from "@/lib/layout/smartSiteFit/smartSiteFitEquipmentResolution";
import {
  buildManualSungrowLayout,
  buildManualTeslaLayout,
} from "@/lib/layout/smartSiteFit/smartSiteFitManual";

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

  const preset = React.useMemo(
    () => getSmartSiteFitPresetById(presetId),
    [presetId]
  );
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

  const livePreview = React.useMemo(() => {
    if (layoutMode !== "manual") return null;

    try {
      const isTesla = isIntegratedPreset(preset);
      let resultItems = [];
      let bessCount = 0;
      let pcsCount = 0;

      if (!isTesla) {
        // Sungrow / separate PCS
        const eq = resolveSeparatePcsEquipment(preset, duration);
        const bessPerPcs = resolveContainersPerPcs(preset, duration);

        pcsCount = Math.ceil(targetMW / eq.powerPerPcsMW);
        if (pcsCount <= 0) pcsCount = 1;
        bessCount = pcsCount * bessPerPcs;
        const containersPerPcs = Math.ceil(bessCount / pcsCount);

        const manualResult = buildManualSungrowLayout({
          containersPerPcs,
          pcsCount,
          containersWide,
          groupCount,
          orientationDeg,
          colGroupSize,
          rowGroupSize,
          colGroupSeparation_m: colGroupSeparation,
          rowGroupSeparation_m: rowGroupSeparation,
          // Spacing defaults used by engine:
          bessToBess_m: overrides.bessToBess_m ?? 3.0,
          bessToPcs_m: overrides.bessToPcs_m ?? 3.0,
          pcsToPcs_m: overrides.pcsToPcs_m ?? 3.0,
          groupSeparation_m: overrides.groupSeparation_m ?? 6.0,
          rowSeparation_m: overrides.rowSeparation_m ?? 6.0,
        });
        resultItems = manualResult.items;
      } else {
        // Tesla / Integrated
        const unitMWh = duration === 2 ? 3.854 : 3.916;
        bessCount = Math.ceil(targetMWh / unitMWh);
        if (bessCount <= 0) bessCount = 1;

        const manualResult = buildManualTeslaLayout({
          bessCount,
          durationHours: duration,
          containersWide,
          groupCount,
          orientationDeg,
          colGroupSize,
          rowGroupSize,
          colGroupSeparation_m: colGroupSeparation,
          rowGroupSeparation_m: rowGroupSeparation,
          // Spacing defaults used by engine:
          bessToBess_m: overrides.bessToBess_m ?? 3.0,
          groupSeparation_m: overrides.groupSeparation_m ?? 6.0,
          rowSeparation_m: overrides.rowSeparation_m ?? 6.0,
        });
        resultItems = manualResult.items;
      }

      // Convert items to PlacedEquipment
      const dummyAnchor = anchor || { lng0: -70.64827, lat0: -33.45694 }; // Santiago de Chile default if no anchor
      const placedEquipment = resultItems.map((item, idx) => {
        const lngLat = toLngLat({ x_m: item.x_m, y_m: item.y_m }, dummyAnchor);
        return {
          id: `live-mock-${item.equipmentSpecId}-${item.blockIndex}-${idx}`,
          equipmentSpecId: item.equipmentSpecId,
          anchor: lngLat,
          rotation_deg: orientationDeg,
          groupId: `group-${item.blockIndex}`,
          blockId: `block-${item.blockIndex}`,
          classification: "preliminary_assumption" as const,
          sourceReliability: "preliminary_assumption" as const,
          blockIndex: item.blockIndex,
        };
      });

      const mockCandidate = {
        id: "live-manual-alternative",
        strategy: strategy,
        placedEquipment,
        score: {
          total: 100,
          insidePolygon: 100,
          noCollisions: 100,
          boundaryMargin: 100,
          siteUtilization: 100,
          rowRegularity: 100,
          corridorEfficiency: 100,
          ratioCompliance: 100,
        },
        warnings: [],
        assumptions: [],
      };

      // Calculate footprint envelope in meters
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      for (const item of resultItems) {
        const isPcs = item.equipmentSpecId.includes("pcs");
        const isTesla = item.equipmentSpecId.includes("tesla");
        const length = isPcs ? 6.058 : (isTesla ? 8.8 : 9.34);
        const width = isPcs ? 2.438 : (isTesla ? 1.65 : 1.73);

        const x0 = item.x_m - length / 2;
        const x1 = item.x_m + length / 2;
        const y0 = item.y_m - width / 2;
        const y1 = item.y_m + width / 2;

        if (x0 < minX) minX = x0;
        if (x1 > maxX) maxX = x1;
        if (y0 < minY) minY = y0;
        if (y1 > maxY) maxY = y1;
      }

      const layoutWidthM = resultItems.length > 0 ? maxX - minX : 0;
      const layoutHeightM = resultItems.length > 0 ? maxY - minY : 0;

      return {
        preview: buildSmartSiteFitPreview(mockCandidate, { polygon, anchor: dummyAnchor }),
        bessCount,
        pcsCount,
        layoutWidthM,
        layoutHeightM,
      };
    } catch (err) {
      console.error("Failed to generate live manual preview:", err);
      return null;
    }
  }, [
    layoutMode,
    preset,
    duration,
    targetMW,
    targetMWh,
    containersWide,
    groupCount,
    orientationDeg,
    colGroupSize,
    rowGroupSize,
    colGroupSeparation,
    rowGroupSeparation,
    overrides,
    polygon,
    anchor,
    strategy,
  ]);

  const selectedDimensions = React.useMemo(() => {
    if (!selectedAlternative) return null;
    const placed = selectedAlternative.placedEquipment;
    if (placed.length === 0) return null;

    const resolvedAnchor = anchor || { lng0: placed[0].anchor.lng, lat0: placed[0].anchor.lat };

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const item of placed) {
      const isPcs = item.equipmentSpecId.includes("pcs");
      const isTesla = item.equipmentSpecId.includes("tesla");
      const length = isPcs ? 6.058 : (isTesla ? 8.8 : 9.34);
      const width = isPcs ? 2.438 : (isTesla ? 1.65 : 1.73);

      const local = toLocal(item.anchor, resolvedAnchor);
      const x0 = local.x_m - length / 2;
      const x1 = local.x_m + length / 2;
      const y0 = local.y_m - width / 2;
      const y1 = local.y_m + width / 2;

      if (x0 < minX) minX = x0;
      if (x1 > maxX) maxX = x1;
      if (y0 < minY) minY = y0;
      if (y1 > maxY) maxY = y1;
    }

    return {
      widthM: maxX - minX,
      heightM: maxY - minY,
    };
  }, [selectedAlternative, anchor]);

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

              {/* Live manual layout preview */}
              {livePreview && livePreview.preview && livePreview.preview.blocks.length > 0 && (
                <div className="mt-3.5 border-t border-slate-800/60 pt-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-slate-500">
                      {isEs ? "Esquema del bloque (Vista previa)" : "Block Diagram (Live Preview)"}
                    </span>
                    <span className="font-mono text-cyan-400 text-[10px]">
                      {livePreview.bessCount} BESS {livePreview.pcsCount > 0 ? `· ${livePreview.pcsCount} PCS` : ""}
                    </span>
                  </div>
                  <div className="rounded border border-slate-900 bg-slate-950/80 p-2.5 flex flex-col items-center justify-center gap-2.5 shadow-sm">
                    <svg
                      viewBox={`-8 -8 ${livePreview.preview.width + 20} ${livePreview.preview.height + 20}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="h-32 w-full transition-all duration-300 rounded bg-slate-950 border border-slate-900 shadow-inner"
                      role="img"
                      aria-label={isEs ? "Visor preliminar de layout manual" : "Preliminary manual layout schematic"}
                    >
                      <defs>
                        <linearGradient id="live-bess-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.7" />
                        </linearGradient>
                        <linearGradient id="live-pcs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
                        </linearGradient>
                        <pattern id="live-grid-bg" width="6" height="6" patternUnits="userSpaceOnUse">
                          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.15" />
                        </pattern>
                      </defs>

                      {/* Grid Background */}
                      <rect x="-8" y="-8" width={livePreview.preview.width + 20} height={livePreview.preview.height + 20} fill="url(#live-grid-bg)" />

                      {/* Site Outline */}
                      {livePreview.preview.site && (
                        <polygon
                          points={livePreview.preview.site.points.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="rgba(15, 23, 42, 0.3)"
                          stroke="rgba(148, 163, 184, 0.4)"
                          strokeWidth={0.5}
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Blocks */}
                      {livePreview.preview.blocks.map((b, i) => {
                        const isPcs = b.kind === "pcs";
                        const rx = 0.2;
                        const ry = 0.2;
                        return (
                          <g key={i}>
                            {/* Shadow/Glow */}
                            <rect
                              x={b.x}
                              y={b.y}
                              width={Math.max(b.w, 0.4)}
                              height={Math.max(b.h, 0.4)}
                              fill={isPcs ? "rgba(245, 158, 11, 0.15)" : "rgba(6, 182, 212, 0.12)"}
                              rx={rx}
                              ry={ry}
                              filter="blur(0.5px)"
                            />
                            {/* Main Container */}
                            <rect
                              x={b.x}
                              y={b.y}
                              width={Math.max(b.w, 0.4)}
                              height={Math.max(b.h, 0.4)}
                              fill={isPcs ? "url(#live-pcs-grad)" : "url(#live-bess-grad)"}
                              stroke={isPcs ? "rgba(245, 158, 11, 0.85)" : "rgba(34, 211, 238, 0.8)"}
                              strokeWidth={0.25}
                              rx={rx}
                              ry={ry}
                            />
                            {/* Compartment subdivisions */}
                            {!isPcs && b.w > b.h && (
                              <g opacity={0.35}>
                                {Array.from({ length: 4 }).map((_, idx) => {
                                  const lineX = b.x + (b.w / 5) * (idx + 1);
                                  return (
                                    <line
                                      key={idx}
                                      x1={lineX}
                                      y1={b.y + 0.2}
                                      x2={lineX}
                                      y2={b.y + b.h - 0.2}
                                      stroke="#0f172a"
                                      strokeWidth={0.12}
                                    />
                                  );
                                })}
                              </g>
                            )}
                            {!isPcs && b.h > b.w && (
                              <g opacity={0.35}>
                                {Array.from({ length: 4 }).map((_, idx) => {
                                  const lineY = b.y + (b.h / 5) * (idx + 1);
                                  return (
                                    <line
                                      key={idx}
                                      x1={b.x + 0.2}
                                      y1={lineY}
                                      x2={b.x + b.w - 0.2}
                                      y2={lineY}
                                      stroke="#0f172a"
                                      strokeWidth={0.12}
                                    />
                                  );
                                })}
                              </g>
                            )}
                            {/* Transformer Line Indicator for PCS */}
                            {isPcs && (
                              <g opacity={0.65}>
                                <circle
                                  cx={b.x + b.w / 2}
                                  cy={b.y + b.h / 2}
                                  r={Math.min(b.w, b.h) / 3.5}
                                  fill="none"
                                  stroke="#78350f"
                                  strokeWidth={0.2}
                                />
                                <line
                                  x1={b.x + b.w / 2}
                                  y1={b.y + b.h / 2 - Math.min(b.w, b.h) / 4}
                                  x2={b.x + b.w / 2}
                                  y2={b.y + b.h / 2 + Math.min(b.w, b.h) / 4}
                                  stroke="#78350f"
                                  strokeWidth={0.2}
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Dimension Lines */}
                      {livePreview.layoutWidthM > 0 && (
                        <g>
                          <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth="0.3" fill="none">
                            <line x1={0} y1={livePreview.preview.height + 4} x2={livePreview.preview.width} y2={livePreview.preview.height + 4} />
                            <line x1={0} y1={livePreview.preview.height + 3} x2={0} y2={livePreview.preview.height + 5} />
                            <line x1={livePreview.preview.width} y1={livePreview.preview.height + 3} x2={livePreview.preview.width} y2={livePreview.preview.height + 5} />
                            <line x1={0} y1={livePreview.preview.height} x2={0} y2={livePreview.preview.height + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                            <line x1={livePreview.preview.width} y1={livePreview.preview.height} x2={livePreview.preview.width} y2={livePreview.preview.height + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                          </g>
                          <text
                            x={livePreview.preview.width / 2}
                            y={livePreview.preview.height + 8.5}
                            fill="#22d3ee"
                            fontSize="3"
                            fontFamily="ui-monospace, monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {`${livePreview.layoutWidthM.toFixed(1)} m`}
                          </text>
                        </g>
                      )}

                      {livePreview.layoutHeightM > 0 && (
                        <g>
                          <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth="0.3" fill="none">
                            <line x1={livePreview.preview.width + 4} y1={0} x2={livePreview.preview.width + 4} y2={livePreview.preview.height} />
                            <line x1={livePreview.preview.width + 3} y1={0} x2={livePreview.preview.width + 5} y2={0} />
                            <line x1={livePreview.preview.width + 3} y1={livePreview.preview.height} x2={livePreview.preview.width + 5} y2={livePreview.preview.height} />
                            <line x1={livePreview.preview.width} y1={0} x2={livePreview.preview.width + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                            <line x1={livePreview.preview.width} y1={livePreview.preview.height} x2={livePreview.preview.width + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                          </g>
                          <text
                            x={livePreview.preview.width + 7.5}
                            y={livePreview.preview.height / 2}
                            fill="#22d3ee"
                            fontSize="3"
                            fontFamily="ui-monospace, monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            transform={`rotate(90, ${livePreview.preview.width + 7.5}, ${livePreview.preview.height / 2})`}
                          >
                            {`${livePreview.layoutHeightM.toFixed(1)} m`}
                          </text>
                        </g>
                      )}
                    </svg>

                    <div className="w-full grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-900 pt-2 font-sans">
                      <div className="flex justify-between bg-slate-900/40 p-1.5 rounded">
                        <span className="text-slate-500">{isEs ? "Dimensiones:" : "Footprint:"}</span>
                        <span className="font-semibold font-mono text-slate-200">
                          {livePreview.layoutWidthM.toFixed(1)}m × {livePreview.layoutHeightM.toFixed(1)}m
                        </span>
                      </div>
                      <div className="flex justify-between bg-slate-900/40 p-1.5 rounded">
                        <span className="text-slate-500">{isEs ? "Área estimada:" : "Est. Área:"}</span>
                        <span className="font-semibold font-mono text-slate-200">
                          {(livePreview.layoutWidthM * livePreview.layoutHeightM).toLocaleString(undefined, { maximumFractionDigits: 0 })} m²
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-center gap-4 text-[9px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-cyan-400/80"></span>
                        {isEs ? "Contenedores BESS" : "BESS Enclosures"}
                      </span>
                      {livePreview.pcsCount > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-400/90"></span>
                          {isEs ? "Estación PCS/MV" : "PCS/MV Station"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  {isEs ? "Vista previa de la disposición manual" : "Manual Layout Preview"}
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
                  <div className="rounded border border-slate-900 bg-slate-950/80 p-2.5 flex flex-col items-center justify-center gap-2.5 shadow-sm">
                    <svg
                      viewBox={`-8 -8 ${preview.width + 20} ${preview.height + 20}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="h-32 w-full transition-all duration-300 rounded bg-slate-950 border border-slate-900 shadow-inner"
                      role="img"
                      aria-label={isEs ? "Visor de layout manual" : "Manual layout schematic"}
                    >
                      <defs>
                        <linearGradient id="result-bess-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                          <stop offset="100%" stopColor="#0891b2" stopOpacity="0.7" />
                        </linearGradient>
                        <linearGradient id="result-pcs-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
                          <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
                        </linearGradient>
                        <pattern id="result-grid-bg" width="6" height="6" patternUnits="userSpaceOnUse">
                          <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(51, 65, 85, 0.25)" strokeWidth="0.15" />
                        </pattern>
                      </defs>

                      {/* Grid Background */}
                      <rect x="-8" y="-8" width={preview.width + 20} height={preview.height + 20} fill="url(#result-grid-bg)" />

                      {/* Site Outline */}
                      {preview.site && (
                        <polygon
                          points={preview.site.points.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="rgba(15, 23, 42, 0.3)"
                          stroke="rgba(148, 163, 184, 0.4)"
                          strokeWidth={0.5}
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Blocks */}
                      {preview.blocks.map((b, i) => {
                        const isPcs = b.kind === "pcs";
                        const rx = 0.2;
                        const ry = 0.2;
                        return (
                          <g key={i}>
                            {/* Shadow/Glow */}
                            <rect
                              x={b.x}
                              y={b.y}
                              width={Math.max(b.w, 0.4)}
                              height={Math.max(b.h, 0.4)}
                              fill={isPcs ? "rgba(245, 158, 11, 0.15)" : "rgba(6, 182, 212, 0.12)"}
                              rx={rx}
                              ry={ry}
                              filter="blur(0.5px)"
                            />
                            {/* Main Container */}
                            <rect
                              x={b.x}
                              y={b.y}
                              width={Math.max(b.w, 0.4)}
                              height={Math.max(b.h, 0.4)}
                              fill={isPcs ? "url(#result-pcs-grad)" : "url(#result-bess-grad)"}
                              stroke={isPcs ? "rgba(245, 158, 11, 0.85)" : "rgba(34, 211, 238, 0.8)"}
                              strokeWidth={0.25}
                              rx={rx}
                              ry={ry}
                            />
                            {/* Compartment subdivisions */}
                            {!isPcs && b.w > b.h && (
                              <g opacity={0.35}>
                                {Array.from({ length: 4 }).map((_, idx) => {
                                  const lineX = b.x + (b.w / 5) * (idx + 1);
                                  return (
                                    <line
                                      key={idx}
                                      x1={lineX}
                                      y1={b.y + 0.2}
                                      x2={lineX}
                                      y2={b.y + b.h - 0.2}
                                      stroke="#0f172a"
                                      strokeWidth={0.12}
                                    />
                                  );
                                })}
                              </g>
                            )}
                            {!isPcs && b.h > b.w && (
                              <g opacity={0.35}>
                                {Array.from({ length: 4 }).map((_, idx) => {
                                  const lineY = b.y + (b.h / 5) * (idx + 1);
                                  return (
                                    <line
                                      key={idx}
                                      x1={b.x + 0.2}
                                      y1={lineY}
                                      x2={b.x + b.w - 0.2}
                                      y2={lineY}
                                      stroke="#0f172a"
                                      strokeWidth={0.12}
                                    />
                                  );
                                })}
                              </g>
                            )}
                            {/* Transformer Line Indicator for PCS */}
                            {isPcs && (
                              <g opacity={0.65}>
                                <circle
                                  cx={b.x + b.w / 2}
                                  cy={b.y + b.h / 2}
                                  r={Math.min(b.w, b.h) / 3.5}
                                  fill="none"
                                  stroke="#78350f"
                                  strokeWidth={0.2}
                                />
                                <line
                                  x1={b.x + b.w / 2}
                                  y1={b.y + b.h / 2 - Math.min(b.w, b.h) / 4}
                                  x2={b.x + b.w / 2}
                                  y2={b.y + b.h / 2 + Math.min(b.w, b.h) / 4}
                                  stroke="#78350f"
                                  strokeWidth={0.2}
                                />
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Dimension Lines */}
                      {selectedDimensions && selectedDimensions.widthM > 0 && (
                        <g>
                          <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth="0.3" fill="none">
                            <line x1={0} y1={preview.height + 4} x2={preview.width} y2={preview.height + 4} />
                            <line x1={0} y1={preview.height + 3} x2={0} y2={preview.height + 5} />
                            <line x1={preview.width} y1={preview.height + 3} x2={preview.width} y2={preview.height + 5} />
                            <line x1={0} y1={preview.height} x2={0} y2={preview.height + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                            <line x1={preview.width} y1={preview.height} x2={preview.width} y2={preview.height + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                          </g>
                          <text
                            x={preview.width / 2}
                            y={preview.height + 8.5}
                            fill="#22d3ee"
                            fontSize="3"
                            fontFamily="ui-monospace, monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {`${selectedDimensions.widthM.toFixed(1)} m`}
                          </text>
                        </g>
                      )}

                      {selectedDimensions && selectedDimensions.heightM > 0 && (
                        <g>
                          <g stroke="rgba(148, 163, 184, 0.4)" strokeWidth="0.3" fill="none">
                            <line x1={preview.width + 4} y1={0} x2={preview.width + 4} y2={preview.height} />
                            <line x1={preview.width + 3} y1={0} x2={preview.width + 5} y2={0} />
                            <line x1={preview.width + 3} y1={preview.height} x2={preview.width + 5} y2={preview.height} />
                            <line x1={preview.width} y1={0} x2={preview.width + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                            <line x1={preview.width} y1={preview.height} x2={preview.width + 3.5} strokeDasharray="1 1" strokeWidth="0.15" />
                          </g>
                          <text
                            x={preview.width + 7.5}
                            y={preview.height / 2}
                            fill="#22d3ee"
                            fontSize="3"
                            fontFamily="ui-monospace, monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                            transform={`rotate(90, ${preview.width + 7.5}, ${preview.height / 2})`}
                          >
                            {`${selectedDimensions.heightM.toFixed(1)} m`}
                          </text>
                        </g>
                      )}
                    </svg>

                    {selectedDimensions && (
                      <div className="w-full grid grid-cols-2 gap-2 text-[10px] text-slate-400 border-t border-slate-900 pt-2 font-sans">
                        <div className="flex justify-between bg-slate-900/40 p-1.5 rounded">
                          <span className="text-slate-500">{isEs ? "Dimensiones:" : "Footprint:"}</span>
                          <span className="font-semibold font-mono text-slate-200">
                            {selectedDimensions.widthM.toFixed(1)}m × {selectedDimensions.heightM.toFixed(1)}m
                          </span>
                        </div>
                        <div className="flex justify-between bg-slate-900/40 p-1.5 rounded">
                          <span className="text-slate-500">{isEs ? "Área estimada:" : "Est. Área:"}</span>
                          <span className="font-semibold font-mono text-slate-200">
                            {(selectedDimensions.widthM * selectedDimensions.heightM).toLocaleString(undefined, { maximumFractionDigits: 0 })} m²
                          </span>
                        </div>
                      </div>
                    )}

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
