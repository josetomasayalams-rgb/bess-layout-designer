"use client";

import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { formatNumber, getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor } from "@/lib/i18n";
import { formatRatioAsPercentage } from "@/lib/units/formatUnits";
import { cn } from "@/lib/utils";

/**
 * Strip de métricas críticas siempre visible bajo el header.
 * Mantiene MVA, MWh, área, ocupación y estado a la vista sin scroll.
 */
export function MetricBar() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const locale = useUiStore((s) => s.locale);

  const metrics = getProjectMetrics(polygon, placed, anchor);
  const { summary, siteArea } = metrics;
  const t = copyFor(locale);
  const errorCount = metrics.errors.length;

  const items = [
    {
      label: t.results.apparentPower,
      value: formatNumber(summary.total_apparent_power_mva, 2),
      unit: "MVA",
    },
    {
      label: t.results.energyDcBol,
      value: formatNumber(summary.total_energy_mwh_dc_bol, 2),
      unit: "MWh",
    },
    {
      label: t.results.availableArea,
      value: siteArea ? formatNumber(siteArea.area_ha, 3) : "—",
      unit: "ha",
    },
    {
      label: t.results.occupationRatio,
      value:
        summary.occupation_ratio === null
          ? "—"
          : formatRatioAsPercentage(summary.occupation_ratio, {
              digits: 1,
              locale,
            }),
      unit: "",
    },
  ];

  return (
    <div className="flex items-stretch divide-x divide-slate-800 overflow-x-auto border-b border-slate-800 bg-slate-950">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-[128px] flex-1 flex-col gap-0.5 px-4 py-2"
        >
          <span className="truncate text-[11px] uppercase tracking-wide text-slate-500">
            {item.label}
          </span>
          <span className="font-mono text-base font-semibold tabular-nums text-slate-50">
            {item.value}
            {item.unit ? (
              <span className="ml-1 text-[11px] font-normal text-slate-500">
                {item.unit}
              </span>
            ) : null}
          </span>
        </div>
      ))}
      <div
        className={cn(
          "flex min-w-[128px] flex-1 flex-col gap-0.5 px-4 py-2",
          errorCount > 0 && "bg-rose-500/10"
        )}
      >
        <span className="truncate text-[11px] uppercase tracking-wide text-slate-500">
          {t.results.constraintState}
        </span>
        <span
          className={cn(
            "font-mono text-base font-semibold tabular-nums",
            errorCount > 0 ? "text-rose-300" : "text-emerald-300"
          )}
        >
          {errorCount > 0
            ? `${errorCount} ${t.results.errors}`
            : t.results.ok}
        </span>
      </div>
    </div>
  );
}
