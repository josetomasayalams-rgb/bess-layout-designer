"use client";

import { X } from "lucide-react";
import { formatNumber } from "@/lib/layout/projectMetrics";
import {
  formatAreaM2,
  formatEnergyMWh,
  formatLength,
  formatPowerMW,
} from "@/lib/units/formatUnits";
import type { BessModel } from "@/types/bess";

export function BessModelDetails({
  model,
  locale,
  onClose,
}: {
  model: BessModel;
  locale: "es" | "en";
  onClose: () => void;
}) {
  const isEs = locale === "es";
  const rows = [
    ["Fabricante", model.manufacturer],
    [isEs ? "Modelo" : "Model", model.product],
    [isEs ? "Energía" : "Energy", model.energyMWh === null ? "-" : formatEnergyMWh(model.energyMWh, { digits: 4, locale })],
    [isEs ? "Potencia" : "Power", model.powerMW === null ? "-" : formatPowerMW(model.powerMW, { digits: 4, locale })],
    [isEs ? "Duración" : "Duration", model.durationHours === null ? "-" : `${formatNumber(model.durationHours, 2)} h`],
    [isEs ? "Dimensiones" : "Dimensions", `${formatLength(model.lengthM, { digits: 2, locale })} x ${formatLength(model.widthM, { digits: 2, locale })} x ${formatLength(model.heightM, { digits: 2, locale })}`],
    [isEs ? "Peso" : "Weight", model.weightT === null ? "-" : `${model.weightT} t`],
    [isEs ? "Química" : "Chemistry", model.chemistry ?? "-"],
    [isEs ? "Área" : "Area", formatAreaM2(model.areaM2, { digits: 2, locale })],
    [isEs ? "Volumen" : "Volume", `${formatNumber(model.volumeM3, 2)} m³`],
    ["MWh/m²", model.energyDensityMWhPerM2 ?? "-"],
    ["MWh/m³", model.energyDensityMWhPerM3 ?? "-"],
    ["MW/m²", model.powerDensityMWPerM2 ?? "-"],
    ["t/MWh", model.weightPerMWh ?? "-"],
    ["m²/MWh", model.areaPerMWh ?? "-"],
    [
      isEs ? "Formato" : "Format",
      model.containerFormat === "custom"
        ? isEs
          ? "Formato propio"
          : "Custom"
        : `${formatLength(model.lengthM, { digits: 2, locale })} class`,
    ],
    [isEs ? "Dato" : "Data", model.dataConfidence],
    [isEs ? "Fuente" : "Source", model.source],
  ];

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-slate-950 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-50">
            {model.manufacturer} {model.product}
          </h3>
          <p className="mt-1 text-[11px] text-slate-500">{model.notes}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-700 p-1 text-slate-300 hover:border-slate-500"
          title={isEs ? "Cerrar ficha" : "Close details"}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <dl className="space-y-1.5 text-[11px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-slate-800/70 pb-1 last:border-0">
            <dt className="text-slate-500">{label}</dt>
            <dd className="max-w-[60%] text-right font-mono text-slate-100">{String(value)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 space-y-1.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
          {isEs ? "Advertencias" : "Warnings"}
        </div>
        {model.warnings.slice(0, 6).map((warning) => (
          <p
            key={warning}
            className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] leading-snug text-amber-100"
          >
            {warning}
          </p>
        ))}
      </div>
    </div>
  );
}
