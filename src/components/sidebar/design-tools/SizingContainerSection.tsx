"use client";

import { useMemo } from "react";
import { LayoutGrid, Wand2, CheckCircle2, AlertTriangle } from "lucide-react";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import {
  formatAreaM2,
  formatLength,
  formatNumber,
} from "@/lib/units/formatUnits";
import { GridShapePicker } from "./GridShapePicker";
import type { Locale } from "@/lib/i18n";
import type { PreliminaryLayoutResult } from "@/lib/layout/preliminaryLayoutGenerator";

export interface SizingContainerSectionProps {
  batteryContainerSpecId: string;
  setBatteryContainerSpecId: (id: string) => void;
  pcsSpecId: string;
  setPcsSpecId: (id: string) => void;
  batteryContainerCount: number;
  setBatteryContainerCount: (count: number) => void;
  containersPerPcs: number;
  setContainersPerPcs: (ratio: number) => void;

  safeContainers: number;
  pcsCount: number;
  blockCount: number;
  safePerPcs: number;

  effectiveColumns: number;
  effectiveRows: number;
  emptyCells: number;
  shapeOptions: Array<{ columns: number; rows: number; shape: string }>;
  setSelectedColumns: (cols: number) => void;

  rules: {
    bessToBess_m: number;
    bessToPropertyLine_m: number;
  };

  onGenerate: () => void;
  onRegularize: () => void;
  hasTerrainPolygon: boolean;

  lastToolResult: PreliminaryLayoutResult | null;

  isEs: boolean;
  locale: Locale;
}

function statusClass(status: "success" | "error") {
  if (status === "success") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  return "border-rose-500/40 bg-rose-500/10 text-rose-100";
}

export function SizingContainerSection({
  batteryContainerSpecId,
  setBatteryContainerSpecId,
  pcsSpecId,
  setPcsSpecId,
  batteryContainerCount,
  setBatteryContainerCount,
  containersPerPcs,
  setContainersPerPcs,
  safeContainers,
  pcsCount,
  blockCount,
  safePerPcs,
  effectiveColumns,
  effectiveRows,
  emptyCells,
  shapeOptions,
  setSelectedColumns,
  rules,
  onGenerate,
  onRegularize,
  hasTerrainPolygon,
  lastToolResult,
  isEs,
  locale,
}: SizingContainerSectionProps) {
  const batteryOptions = useMemo(
    () => equipmentCatalog.filter((spec) => spec.type === "battery_container"),
    []
  );
  const pcsOptions = useMemo(
    () => equipmentCatalog.filter((spec) => spec.type === "pcs_mv_station"),
    []
  );

  const inputClass =
    "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100";
  const numberInputClass =
    "mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100";

  return (
    <div className="space-y-3">
      {/* ── Sizing by container count ───────────────────────────── */}
      <div className="space-y-2 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-2">
        <div className="flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-200">
            {isEs
              ? "Dimensionamiento por contenedores"
              : "Sizing by container count"}
          </span>
        </div>
        <p className="text-[10px] leading-snug text-slate-500">
          {isEs
            ? "Define el número de contenedores y elige una forma de grilla; los PCS se agregan automáticamente. Con un terreno dibujado, Generar centra la grilla y ajusta su orientación o forma si no cabe."
            : "Set the container count and pick a grid shape; PCS units are added automatically. With a drawn site, Generate centers the grid and adjusts its orientation or shape if it does not fit."}
        </p>

        <label className="block text-[11px] text-slate-500">
          BESS
          <select
            value={batteryContainerSpecId}
            onChange={(event) => setBatteryContainerSpecId(event.target.value)}
            className={inputClass}
          >
            {batteryOptions.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.manufacturer} {spec.model}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[11px] text-slate-500">
          PCS / MV
          <select
            value={pcsSpecId}
            onChange={(event) => setPcsSpecId(event.target.value)}
            className={inputClass}
          >
            {pcsOptions.map((spec) => (
              <option key={spec.id} value={spec.id}>
                {spec.manufacturer} {spec.model}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-500">
            {isEs ? "N° contenedores BESS" : "BESS containers"}
            <input
              type="number"
              min={0}
              value={batteryContainerCount}
              onChange={(event) =>
                setBatteryContainerCount(Number(event.target.value))
              }
              className={numberInputClass}
            />
          </label>
          <label className="text-[11px] text-slate-500">
            {isEs ? "Contenedores / PCS" : "Containers / PCS"}
            <input
              type="number"
              min={1}
              value={containersPerPcs}
              onChange={(event) =>
                setContainersPerPcs(Number(event.target.value))
              }
              className={numberInputClass}
            />
          </label>
        </div>

        {/* Derived quantities */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[10px]">
          <div>
            <div className="text-slate-500">BESS</div>
            <div className="mt-1 font-mono text-slate-100">
              {formatNumber(safeContainers, 0, locale)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{isEs ? "PCS" : "PCS"}</div>
            <div className="mt-1 font-mono text-slate-100">
              {formatNumber(pcsCount, 0, locale)}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{isEs ? "Bloques" : "Blocks"}</div>
            <div className="mt-1 font-mono text-slate-100">
              {formatNumber(blockCount, 0, locale)}
            </div>
          </div>
        </div>

        {/* Grid shape picker */}
        <GridShapePicker
          blockCount={blockCount}
          safePerPcs={safePerPcs}
          effectiveColumns={effectiveColumns}
          effectiveRows={effectiveRows}
          emptyCells={emptyCells}
          shapeOptions={shapeOptions}
          setSelectedColumns={setSelectedColumns}
          isEs={isEs}
          locale={locale}
        />

        {/* Spacing reference */}
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-[10px]">
          <div>
            <div className="text-slate-500">BESS-BESS</div>
            <div className="mt-1 font-mono text-slate-100">
              {formatLength(rules.bessToBess_m, { digits: 1, locale })}
            </div>
          </div>
          <div>
            <div className="text-slate-500">{isEs ? "Borde" : "Boundary"}</div>
            <div className="mt-1 font-mono text-slate-100">
              {formatLength(rules.bessToPropertyLine_m, { digits: 1, locale })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 hover:border-cyan-300"
          >
            <Wand2 className="h-4 w-4" aria-hidden="true" />
            {isEs ? "Generar" : "Generate"}
          </button>
          <button
            type="button"
            onClick={onRegularize}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:border-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {isEs ? "Regularizar" : "Regularize"}
          </button>
        </div>

        {!hasTerrainPolygon ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-100">
            {isEs
              ? "Regularizar requiere un polígono de terreno. Generar puede usarse sin terreno."
              : "Regularization needs a site polygon. Generate can be used without one."}
          </p>
        ) : null}

        {lastToolResult ? (
          <div
            className={`rounded-md border p-2 text-[10px] leading-snug ${statusClass(
              lastToolResult.status
            )}`}
          >
            <div className="mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-wide">
              {lastToolResult.status === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {lastToolResult.status}
            </div>
            <div>{lastToolResult.message}</div>
            {lastToolResult.diagnostics.layoutAreaM2 ? (
              <div className="mt-1 font-mono">
                {formatAreaM2(lastToolResult.diagnostics.layoutAreaM2, {
                  digits: 1,
                  locale,
                })}{" "}
                · {formatNumber(lastToolResult.placed.length, 0, locale)}{" "}
                {isEs ? "equipos" : "items"}
              </div>
            ) : null}
            {lastToolResult.diagnostics.gridColumns &&
            lastToolResult.diagnostics.gridRows ? (
              <div className="mt-1 font-mono text-cyan-100/80">
                {isEs ? "Grilla aplicada" : "Applied grid"}: {lastToolResult.diagnostics.gridColumns}×
                {lastToolResult.diagnostics.gridRows}
                {lastToolResult.diagnostics.orientationDeg
                  ? ` · ${lastToolResult.diagnostics.orientationDeg}°`
                  : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
