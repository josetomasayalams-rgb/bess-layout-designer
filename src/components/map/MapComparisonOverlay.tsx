"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import type { ComparisonSlot, LayoutAlternative } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import {
  computeAlternativeMetrics,
  type AlternativeMetrics,
} from "@/lib/layout/layoutComparison";
import { useBaseMapStyle } from "./hooks/useBaseMapStyle";
import {
  formatApparentPowerMva,
  formatAreaM2,
  formatEnergyMWh,
  formatNumber,
} from "@/lib/units/formatUnits";
import { ComparisonMap } from "./ComparisonMap";

const ACCENTS: Record<ComparisonSlot, string> = {
  A: "#f59e0b", // amber
  B: "#a78bfa", // violet
};

type Side = {
  slot: ComparisonSlot;
  alternative: LayoutAlternative | null;
  metrics: AlternativeMetrics | null;
};

export function MapComparisonOverlay() {
  const open = useUiStore((s) => s.mapComparisonOpen);
  const setOpen = useUiStore((s) => s.setMapComparisonOpen);
  const locale = useUiStore((s) => s.locale);
  const comparison = useProjectStore((s) => s.comparison);
  const isEs = locale === "es";

  // Resolve the base-map style once and share it across both maps so premium
  // providers (Google/MapTiler) are not fetched twice per open.
  const { resolvedBaseMap } = useBaseMapStyle(locale);

  // Escape closes the overlay so the user is never trapped behind it.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  const sides = useMemo<Side[]>(
    () =>
      (["A", "B"] as ComparisonSlot[]).map((slot) => {
        const alternative = comparison[slot];
        return {
          slot,
          alternative,
          metrics: alternative
            ? computeAlternativeMetrics(
                alternative.placedEquipment,
                alternative.polygon,
                alternative.anchor
              )
            : null,
        };
      }),
    [comparison]
  );

  if (!open) return null;

  const metricRow = (label: string, value: string) => (
    <div className="flex items-center justify-between gap-2 border-t border-slate-800 py-0.5">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-100">{value}</span>
    </div>
  );

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-slate-950/95 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-100">
          {isEs ? "Comparación en mapa" : "Map comparison"}
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={isEs ? "Cerrar comparación" : "Close comparison"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-400 hover:text-rose-200"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Side-by-side */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-px bg-slate-800 lg:grid-cols-2">
        {sides.map(({ slot, alternative, metrics }) => (
          <div key={slot} className="relative flex min-h-[240px] flex-col bg-slate-950">
            <div
              className="flex items-center gap-2 px-3 py-1.5"
              style={{ borderBottom: `2px solid ${ACCENTS[slot]}` }}
            >
              <span
                className="inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold text-slate-950"
                style={{ backgroundColor: ACCENTS[slot] }}
              >
                {slot}
              </span>
              <span className="text-[12px] font-semibold text-slate-200">
                {isEs ? "Alternativa" : "Alternative"} {slot}
              </span>
            </div>

            <div className="relative min-h-0 flex-1">
              {alternative ? (
                <ComparisonMap
                  anchor={alternative.anchor}
                  polygon={alternative.polygon}
                  placedEquipment={alternative.placedEquipment}
                  accentColor={ACCENTS[slot]}
                  mapStyle={resolvedBaseMap.style}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-center text-[11px] text-slate-500">
                  {isEs
                    ? "Alternativa no capturada. Captúrala desde el comparador de alternativas."
                    : "Alternative not captured. Capture it from the alternatives comparator."}
                </div>
              )}
            </div>

            {metrics ? (
              <div className="border-t border-slate-800 bg-slate-950/90 px-3 py-1.5 text-[10px]">
                {metricRow(
                  isEs ? "Equipos" : "Equipment",
                  formatNumber(metrics.equipmentCount, 0, locale)
                )}
                {metricRow("BESS", formatNumber(metrics.batteryCount, 0, locale))}
                {metricRow("PCS", formatNumber(metrics.pcsCount, 0, locale))}
                {metricRow(
                  isEs ? "Energía" : "Energy",
                  formatEnergyMWh(metrics.energyMwh, { digits: 1, locale })
                )}
                {metricRow(
                  isEs ? "Potencia" : "Power",
                  formatApparentPowerMva(metrics.powerMva, { digits: 1, locale })
                )}
                {metricRow(
                  isEs ? "Área layout" : "Layout area",
                  formatAreaM2(metrics.boundingAreaM2, { digits: 0, locale })
                )}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="border-t border-slate-800 px-3 py-1.5 text-[9px] leading-snug text-slate-500">
        {isEs
          ? "Vista preliminar de comparación. Cada mapa ajusta su cámara al terreno capturado."
          : "Preliminary comparison view. Each map fits its camera to the captured site."}
      </p>
    </div>
  );
}
