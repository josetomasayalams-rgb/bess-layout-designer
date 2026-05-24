"use client";

import {
  AlertTriangle,
  BatteryCharging,
  Grid3X3,
  Map,
  Zap,
} from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { formatNumber, getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor, scenarioStatusLabel } from "@/lib/i18n";
import {
  formatApparentPowerMva,
  formatAreaM2,
  formatEnergyMWh,
  formatRatioAsPercentage,
} from "@/lib/units/formatUnits";

export function ProjectSummaryPanel() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const locale = useUiStore((s) => s.locale);

  const metrics = getProjectMetrics(polygon, placed, anchor);
  const { summary, siteArea } = metrics;
  const t = copyFor(locale);

  const cards = [
    {
      label: t.results.availableArea,
      value: siteArea ? formatNumber(siteArea.area_ha, 3) : "-",
      unit: "ha",
      icon: Map,
      accent: "text-cyan-300",
    },
    {
      label: t.results.apparentPower,
      value: formatNumber(summary.total_apparent_power_mva, 2),
      unit: "MVA",
      icon: Zap,
      accent: "text-sky-300",
    },
    {
      label: t.results.energyDcBol,
      value: formatNumber(summary.total_energy_mwh_dc_bol, 2),
      unit: "MWh",
      icon: BatteryCharging,
      accent: "text-emerald-300",
    },
    {
      label: t.results.constraintState,
      value: metrics.errors.length ? String(metrics.errors.length) : "OK",
      unit: metrics.errors.length ? t.results.errors : "",
      icon: AlertTriangle,
      accent: metrics.errors.length ? "text-rose-300" : "text-emerald-300",
    },
  ];

  return (
    <section className="border-b border-slate-800 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            {t.results.title}
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {t.results.description}
          </p>
        </div>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300">
          {scenarioStatusLabel(metrics.status, locale)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between">
                <Icon className={`h-4 w-4 ${card.accent}`} aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  {card.unit}
                </span>
              </div>
              <div className="font-mono text-lg font-semibold text-slate-50">
                {card.value}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">
                {card.label}
              </div>
            </div>
          );
        })}
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        {[
          [t.results.batteryContainers, String(summary.battery_container_count)],
          [t.results.pcsStations, String(summary.pcs_count)],
          [
            t.results.grossDuration,
            summary.duration_hours_gross === null
              ? "-"
              : `${formatNumber(summary.duration_hours_gross, 2)} h`,
          ],
          [
            t.results.occupiedArea,
            formatAreaM2(summary.occupied_area_m2, { digits: 1, locale }),
          ],
          [
            t.results.occupationRatio,
            summary.occupation_ratio === null
              ? "-"
              : formatRatioAsPercentage(summary.occupation_ratio, {
                  digits: 2,
                  locale,
                }),
          ],
          [
            t.results.energyDensity,
            metrics.energyDensity === null
              ? "-"
              : `${formatEnergyMWh(metrics.energyDensity, {
                  digits: 1,
                  locale,
                })}/ha`,
          ],
          [
            t.results.powerDensity,
            metrics.powerDensity === null
              ? "-"
              : `${formatApparentPowerMva(metrics.powerDensity, {
                  digits: 2,
                  locale,
                })}/ha`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-2 last:border-b-0"
          >
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-mono text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-200">
          <Grid3X3 className="h-4 w-4 text-cyan-300" aria-hidden="true" />
          {t.results.scenarioSummary}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            metrics.hasTerrain
              ? t.results.terrainDefined
              : t.results.terrainMissing,
            metrics.hasLayout ? t.results.layoutCalculated : t.results.noLayout,
            metrics.errors.length
              ? t.results.reviewRequired
              : t.results.noBlockingErrors,
          ].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-snug text-slate-500">
        {t.results.note}
      </p>
    </section>
  );
}
