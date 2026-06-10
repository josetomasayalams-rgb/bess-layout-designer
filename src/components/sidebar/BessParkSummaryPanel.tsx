"use client";

import { equipmentCatalog } from "@/data/equipmentCatalog";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { getRegulatoryProfile } from "@/rules/regulatoryProfileMetadata";
import { computeBessParkSummary } from "@/lib/bessCalculations";
import { formatNumber, getProjectMetrics } from "@/lib/layout/projectMetrics";
import { copyFor, scenarioStatusLabel } from "@/lib/i18n";
import {
  formatAreaM2,
  formatEnergyMWh,
  formatPowerMW,
} from "@/lib/units/formatUnits";
import { Badge } from "@/components/ui/Badge";

/**
 * Panel canónico de resumen del proyecto. Las métricas críticas
 * (MVA, MWh, área, ocupación, estado) viven en la MetricBar superior;
 * este panel entrega el desglose técnico que no cabe en el strip.
 */
export function BessParkSummaryPanel() {
  const polygon = useProjectStore((s) => s.polygon);
  const placed = useProjectStore((s) => s.placedEquipment);
  const anchor = useProjectStore((s) => s.anchor);
  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";
  const t = copyFor(locale);
  const profile = getRegulatoryProfile(activeProfileId);

  const metrics = getProjectMetrics(polygon, placed, anchor);
  const { summary: layoutSummary, siteArea } = metrics;
  const park = computeBessParkSummary(
    placed,
    equipmentCatalog,
    siteArea?.area_m2 ?? null,
    {
      regulatoryBufferM: profile.rules.bessToBess_m,
      maintenanceBufferM: profile.rules.maintenanceAisle_m,
    }
  );

  const rows: [string, string][] = [
    [
      isEs ? "Contenedores batería" : "Battery containers",
      String(layoutSummary.battery_container_count),
    ],
    [
      isEs ? "PCS / estaciones MV" : "PCS / MV stations",
      String(layoutSummary.pcs_count),
    ],
    [
      isEs ? "Peso total" : "Total weight",
      `${formatNumber(park.totalWeightT, 1)} t`,
    ],
    [
      isEs ? "Duración bruta" : "Gross duration",
      layoutSummary.duration_hours_gross === null
        ? "—"
        : `${formatNumber(layoutSummary.duration_hours_gross, 2)} h`,
    ],
    [
      isEs ? "Área física" : "Physical area",
      formatAreaM2(park.footprintAreaM2, { digits: 1, locale }),
    ],
    [
      isEs ? "Área con buffer normativo" : "Area with regulatory buffer",
      formatAreaM2(park.regulatoryAreaM2, { digits: 1, locale }),
    ],
    [
      isEs ? "Área con pasillos" : "Área with aisles",
      formatAreaM2(park.maintenanceAreaM2, { digits: 1, locale }),
    ],
    [
      "MWh/ha",
      park.layoutEnergyDensityMWhPerHa === null
        ? "—"
        : `${formatEnergyMWh(park.layoutEnergyDensityMWhPerHa, {
            digits: 2,
            locale,
          })}/ha`,
    ],
    [
      "MW/ha",
      park.layoutPowerDensityMWPerHa === null
        ? "—"
        : `${formatPowerMW(park.layoutPowerDensityMWPerHa, {
            digits: 2,
            locale,
          })}/ha`,
    ],
    [
      "t/MWh",
      park.weightPerMWhProject === null
        ? "—"
        : `${formatNumber(park.weightPerMWhProject, 2)} t/MWh`,
    ],
    [
      "m²/MWh",
      park.areaPerMWhProject === null
        ? "—"
        : `${formatNumber(park.areaPerMWhProject, 2)} m²/MWh`,
    ],
    [
      isEs ? "Química predominante" : "Predominant chemistry",
      park.predominantChemistry ?? "—",
    ],
    [
      isEs ? "Mayor aporte energía" : "Top energy model",
      park.topEnergyModel ?? "—",
    ],
  ];

  return (
    <section className="border-b border-slate-800 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">
            {isEs ? "Resumen del proyecto" : "Project summary"}
          </h2>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
            {isEs
              ? "Balance técnico en tiempo real. Las métricas críticas están en la barra superior."
              : "Live technical balance. Critical metrics are shown in the top bar."}
          </p>
        </div>
        <Badge
          variant={
            metrics.errors.length
              ? "critical"
              : metrics.hasLayout
                ? "compliant"
                : "neutral"
          }
        >
          {scenarioStatusLabel(metrics.status, locale)}
        </Badge>
      </div>

      <dl className="space-y-2 text-xs">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 border-b border-slate-800/70 pb-2 last:border-b-0"
          >
            <dt className="text-slate-500">{label}</dt>
            <dd className="max-w-[55%] text-right font-mono text-slate-100">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {Object.keys(park.byManufacturer).length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {Object.entries(park.byManufacturer).map(([manufacturer, count]) => (
            <span
              key={manufacturer}
              className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"
            >
              {manufacturer}: {count}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-1.5">
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

      {park.warnings.map((warning) => (
        <p
          key={warning}
          className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-100"
        >
          {warning}
        </p>
      ))}

      <p className="mt-3 text-[10px] leading-snug text-slate-500">
        {t.results.note}
      </p>
    </section>
  );
}
