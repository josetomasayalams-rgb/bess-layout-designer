"use client";

import { formatNumber } from "@/lib/layout/projectMetrics";
import type { BessModel } from "@/types/bess";

function value(value: number | string | null): string {
  if (value === null) return "-";
  if (typeof value === "number") return formatNumber(value, value >= 10 ? 1 : 3);
  return value;
}

export function BessModelComparator({
  models,
  locale,
}: {
  models: BessModel[];
  locale: "es" | "en";
}) {
  const isEs = locale === "es";
  if (models.length < 2) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-[11px] text-slate-500">
        {isEs
          ? "Selecciona 2 a 4 modelos para comparar alternativas."
          : "Select 2 to 4 models to compare alternatives."}
      </div>
    );
  }

  const metrics: [string, (model: BessModel) => number | string | null][] = [
    ["MWh", (model) => model.energyMWh],
    ["MW", (model) => model.powerMW],
    [isEs ? "Duracion h" : "Duration h", (model) => model.durationHours],
    ["L x W x H (m)", (model) => `${model.lengthM} x ${model.widthM} x ${model.heightM}`],
    ["t", (model) => model.weightT],
    [isEs ? "Quimica" : "Chemistry", (model) => model.chemistry],
    ["MWh/m²", (model) => model.energyDensityMWhPerM2],
    ["MWh/m³", (model) => model.energyDensityMWhPerM3],
    ["MW/m²", (model) => model.powerDensityMWPerM2],
    ["t/MWh", (model) => model.weightPerMWh],
    ["m²/MWh", (model) => model.areaPerMWh],
    [isEs ? "Unid. 100 MWh" : "Units 100 MWh", (model) => model.energyMWh === null ? null : Math.ceil(100 / model.energyMWh)],
    [isEs ? "Area 100 MWh" : "Area 100 MWh", (model) => model.energyMWh === null ? null : Math.ceil(100 / model.energyMWh) * model.areaM2],
    [isEs ? "Peso 100 MWh" : "Weight 100 MWh", (model) => model.energyMWh === null || model.weightT === null ? null : Math.ceil(100 / model.energyMWh) * model.weightT],
  ];

  const bestEnergy = [...models].sort(
    (a, b) => (b.energyDensityMWhPerM2 ?? -1) - (a.energyDensityMWhPerM2 ?? -1)
  )[0];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200">
        {isEs ? "Comparador" : "Comparator"}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-[10px]">
          <thead className="text-slate-500">
            <tr>
              <th className="py-1 pr-2">{isEs ? "Metrica" : "Metric"}</th>
              {models.map((model) => (
                <th key={model.id} className="py-1 pr-2">
                  {model.manufacturer}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(([label, getter]) => (
              <tr key={label} className="border-t border-slate-800/70">
                <td className="py-1 pr-2 text-slate-500">{label}</td>
                {models.map((model) => (
                  <td key={model.id} className="py-1 pr-2 font-mono text-slate-100">
                    {value(getter(model))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] text-cyan-100">
        {isEs ? "Mayor MWh/m² en esta seleccion" : "Highest MWh/m² in this selection"}:{" "}
        {bestEnergy.manufacturer} {bestEnergy.product}
      </p>
    </div>
  );
}
