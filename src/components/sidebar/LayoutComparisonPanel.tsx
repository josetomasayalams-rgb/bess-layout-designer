"use client";

import { useMemo } from "react";
import { Camera, GitCompare, Maximize2, RotateCcw, Trash2 } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import type { ComparisonSlot, LayoutAlternative } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import {
  computeAlternativeMetrics,
  recommendAlternative,
  type AlternativeMetrics,
} from "@/lib/layout/layoutComparison";
import {
  formatApparentPowerMva,
  formatAreaM2,
  formatEnergyMWh,
  formatNumber,
} from "@/lib/units/formatUnits";

const SLOTS: ComparisonSlot[] = ["A", "B"];

function lowerWins(a: number, b: number): ComparisonSlot | null {
  if (a < b) return "A";
  if (b < a) return "B";
  return null;
}

export function LayoutComparisonPanel() {
  const comparison = useProjectStore((s) => s.comparison);
  const placedCount = useProjectStore((s) => s.placedEquipment.length);
  const captureAlternative = useProjectStore((s) => s.captureAlternative);
  const clearAlternative = useProjectStore((s) => s.clearAlternative);
  const restoreAlternative = useProjectStore((s) => s.restoreAlternative);
  const setMapComparisonOpen = useUiStore((s) => s.setMapComparisonOpen);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const capturedCount = (comparison.A ? 1 : 0) + (comparison.B ? 1 : 0);

  const metricsA = useMemo<AlternativeMetrics | null>(
    () =>
      comparison.A
        ? computeAlternativeMetrics(
            comparison.A.placedEquipment,
            comparison.A.polygon,
            comparison.A.anchor
          )
        : null,
    [comparison.A]
  );
  const metricsB = useMemo<AlternativeMetrics | null>(
    () =>
      comparison.B
        ? computeAlternativeMetrics(
            comparison.B.placedEquipment,
            comparison.B.polygon,
            comparison.B.anchor
          )
        : null,
    [comparison.B]
  );

  const recommendation =
    metricsA && metricsB ? recommendAlternative(metricsA, metricsB) : null;

  const reasonText = (reason: string): string => {
    if (reason === "compliant") {
      return isEs ? "cumple sin conflictos" : "compliant, no conflicts";
    }
    if (reason === "fewer-issues") {
      return isEs ? "tiene menos conflictos" : "has fewer conflicts";
    }
    if (reason === "more-compact") {
      return isEs ? "layout más compacto" : "more compact layout";
    }
    return isEs ? "equivalentes" : "equivalent";
  };

  const captureTime = (alternative: LayoutAlternative): string =>
    new Date(alternative.capturedAt).toLocaleTimeString(
      isEs ? "es-CL" : "en-US",
      { hour: "2-digit", minute: "2-digit" }
    );

  const numericRows =
    metricsA && metricsB
      ? [
          {
            label: isEs ? "Equipos" : "Equipment",
            a: formatNumber(metricsA.equipmentCount, 0, locale),
            b: formatNumber(metricsB.equipmentCount, 0, locale),
            winner: null as ComparisonSlot | null,
          },
          {
            label: "BESS",
            a: formatNumber(metricsA.batteryCount, 0, locale),
            b: formatNumber(metricsB.batteryCount, 0, locale),
            winner: null as ComparisonSlot | null,
          },
          {
            label: "PCS",
            a: formatNumber(metricsA.pcsCount, 0, locale),
            b: formatNumber(metricsB.pcsCount, 0, locale),
            winner: null as ComparisonSlot | null,
          },
          {
            label: isEs ? "Energía" : "Energy",
            a: formatEnergyMWh(metricsA.energyMwh, { digits: 1, locale }),
            b: formatEnergyMWh(metricsB.energyMwh, { digits: 1, locale }),
            winner: null as ComparisonSlot | null,
          },
          {
            label: isEs ? "Potencia" : "Power",
            a: formatApparentPowerMva(metricsA.powerMva, { digits: 1, locale }),
            b: formatApparentPowerMva(metricsB.powerMva, { digits: 1, locale }),
            winner: null as ComparisonSlot | null,
          },
          {
            label: isEs ? "Área layout" : "Layout area",
            a: formatAreaM2(metricsA.boundingAreaM2, { digits: 0, locale }),
            b: formatAreaM2(metricsB.boundingAreaM2, { digits: 0, locale }),
            winner: lowerWins(
              metricsA.boundingAreaM2,
              metricsB.boundingAreaM2
            ),
          },
          {
            label: isEs ? "Colisiones" : "Collisions",
            a: formatNumber(metricsA.collisionCount, 0, locale),
            b: formatNumber(metricsB.collisionCount, 0, locale),
            winner: lowerWins(
              metricsA.collisionCount,
              metricsB.collisionCount
            ),
          },
          {
            label: isEs ? "Fuera del terreno" : "Outside site",
            a: formatNumber(metricsA.outOfBoundsCount, 0, locale),
            b: formatNumber(metricsB.outOfBoundsCount, 0, locale),
            winner: lowerWins(
              metricsA.outOfBoundsCount,
              metricsB.outOfBoundsCount
            ),
          },
        ]
      : [];

  return (
    <CollapsibleSection
      icon={GitCompare}
      iconColor="text-violet-300"
      title={isEs ? "Comparador de alternativas" : "Alternatives comparator"}
      description={
        isEs
          ? "Guarda dos versiones del layout y compáralas técnicamente."
          : "Save two layout versions and compare them technically."
      }
    >
      <div className="space-y-2">
        {/* Guided capture status + map comparison entry point */}
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-1.5">
          <div className="flex items-center gap-2 text-[10px]">
            {SLOTS.map((slot) => {
              const done = comparison[slot] !== null;
              return (
                <span
                  key={slot}
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium ${
                    done
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-700 bg-slate-900 text-slate-500"
                  }`}
                >
                  <span className="font-bold">{slot}</span>
                  {done
                    ? isEs
                      ? "guardado"
                      : "saved"
                    : isEs
                      ? "pendiente"
                      : "pending"}
                </span>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setMapComparisonOpen(true)}
            disabled={capturedCount === 0}
            className="inline-flex items-center gap-1 rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-1 text-[10px] font-medium text-cyan-100 hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Maximize2 className="h-3 w-3" aria-hidden="true" />
            {isEs ? "Comparar en mapa" : "Compare on map"}
          </button>
        </div>

        {SLOTS.map((slot) => {
          const alternative = comparison[slot];
          return (
            <div
              key={slot}
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-200">
                  {isEs ? "Alternativa" : "Alternative"} {slot}
                </span>
                {alternative ? (
                  <span className="font-mono text-[10px] text-slate-500">
                    {captureTime(alternative)}
                  </span>
                ) : null}
              </div>

              {alternative ? (
                <>
                  <div className="mt-1 font-mono text-[10px] text-slate-400">
                    {formatNumber(
                      alternative.placedEquipment.length,
                      0,
                      locale
                    )}{" "}
                    {isEs ? "equipos capturados" : "captured items"}
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => restoreAlternative(slot)}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-violet-400/40 bg-violet-400/10 px-1.5 py-1 text-[10px] font-medium text-violet-100 hover:border-violet-300"
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      {isEs ? "Restaurar" : "Restore"}
                    </button>
                    <button
                      type="button"
                      onClick={() => captureAlternative(slot)}
                      disabled={placedCount === 0}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-300 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Camera className="h-3 w-3" aria-hidden="true" />
                      {isEs ? "Recapturar" : "Recapture"}
                    </button>
                    <button
                      type="button"
                      onClick={() => clearAlternative(slot)}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-1 text-[10px] text-slate-300 hover:border-rose-400 hover:text-rose-200"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      {isEs ? "Borrar" : "Clear"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => captureAlternative(slot)}
                  disabled={placedCount === 0}
                  className="mt-1.5 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-violet-400/40 bg-violet-400/10 px-2 py-1.5 text-[11px] font-medium text-violet-100 hover:border-violet-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  {isEs ? "Capturar layout actual" : "Capture current layout"}
                </button>
              )}
            </div>
          );
        })}

        {placedCount === 0 && !comparison.A && !comparison.B ? (
          <p className="rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-[10px] leading-snug text-slate-500">
            {isEs
              ? "Genera o coloca equipos para poder capturar una alternativa."
              : "Generate or place equipment before capturing an alternative."}
          </p>
        ) : null}

        {metricsA && metricsB ? (
          <div className="space-y-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5 p-2">
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 text-[10px]">
              <div className="font-semibold uppercase tracking-wide text-violet-200">
                {isEs ? "Métrica" : "Metric"}
              </div>
              <div className="w-12 text-right font-semibold text-violet-200">
                A
              </div>
              <div className="w-12 text-right font-semibold text-violet-200">
                B
              </div>

              {numericRows.map((row) => (
                <div key={row.label} className="contents">
                  <div className="border-t border-slate-800 py-1 text-slate-400">
                    {row.label}
                  </div>
                  <div
                    className={`border-t border-slate-800 py-1 text-right font-mono ${
                      row.winner === "A"
                        ? "text-emerald-300"
                        : row.winner === "B"
                          ? "text-slate-500"
                          : "text-slate-200"
                    }`}
                  >
                    {row.a}
                  </div>
                  <div
                    className={`border-t border-slate-800 py-1 text-right font-mono ${
                      row.winner === "B"
                        ? "text-emerald-300"
                        : row.winner === "A"
                          ? "text-slate-500"
                          : "text-slate-200"
                    }`}
                  >
                    {row.b}
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-800 py-1 text-slate-400">
                {isEs ? "Estado" : "Status"}
              </div>
              <div
                className={`border-t border-slate-800 py-1 text-right font-mono ${
                  metricsA.compliant ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {metricsA.compliant
                  ? isEs
                    ? "OK"
                    : "OK"
                  : isEs
                    ? "Ajustar"
                    : "Adjust"}
              </div>
              <div
                className={`border-t border-slate-800 py-1 text-right font-mono ${
                  metricsB.compliant ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {metricsB.compliant
                  ? isEs
                    ? "OK"
                    : "OK"
                  : isEs
                    ? "Ajustar"
                    : "Adjust"}
              </div>
            </div>

            {recommendation ? (
              <div className="rounded-md border border-violet-400/30 bg-violet-400/10 px-2 py-1 text-[10px] leading-snug text-violet-100">
                {recommendation.slot
                  ? isEs
                    ? `Sugerida: Alternativa ${recommendation.slot} — ${reasonText(
                        recommendation.reason
                      )}.`
                    : `Suggested: Alternative ${recommendation.slot} — ${reasonText(
                        recommendation.reason
                      )}.`
                  : isEs
                    ? "Ambas alternativas son equivalentes."
                    : "Both alternatives are equivalent."}
              </div>
            ) : null}

            <p className="text-[9px] leading-snug text-slate-500">
              {isEs
                ? "Comparación preliminar. Área layout = caja envolvente del conjunto."
                : "Preliminary comparison. Layout area = bounding box of the set."}
            </p>
          </div>
        ) : null}
      </div>
    </CollapsibleSection>
  );
}
