"use client";

import { BatteryCharging, GitCompareArrows, Info, MapPinPlus } from "lucide-react";
import { bessEquipmentSpecId } from "@/lib/bessCalculations";
import { formatNumber } from "@/lib/layout/projectMetrics";
import {
  formatEnergyMWh,
  formatLength,
  formatPowerMW,
} from "@/lib/units/formatUnits";
import type { BessModel } from "@/types/bess";

export function BessModelCard({
  model,
  isActive,
  isCompared,
  locale,
  onInsert,
  onDetails,
  onCompare,
}: {
  model: BessModel;
  isActive: boolean;
  isCompared: boolean;
  locale: "es" | "en";
  onInsert: (specId: string) => void;
  onDetails: (model: BessModel) => void;
  onCompare: (modelId: string) => void;
}) {
  const isEs = locale === "es";
  const formatClass =
    model.containerFormat === "custom"
      ? isEs
        ? "formato propio"
        : "custom format"
      : `${formatLength(model.lengthM, { digits: 2, locale })} class`;
  return (
    <article
      className={`rounded-lg border p-3 ${
        isActive ? "border-emerald-400 bg-emerald-400/10" : "border-slate-800 bg-slate-900/70"
      }`}
    >
      <div className="flex items-start gap-2">
        <BatteryCharging className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-slate-100">
            {model.manufacturer} {model.product}
          </h3>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {formatClass} · {model.chemistry ?? "chemistry n/a"} ·{" "}
            {model.dataConfidence}
          </p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <dt className="text-slate-500">MWh</dt>
          <dd className="font-mono text-slate-100">
            {model.energyMWh === null
              ? "-"
              : formatEnergyMWh(model.energyMWh, { digits: 2, locale })}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">MW</dt>
          <dd className="font-mono text-slate-100">
            {model.powerMW === null
              ? "-"
              : formatPowerMW(model.powerMW, { digits: 2, locale })}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">{isEs ? "Dur." : "Dur."}</dt>
          <dd className="font-mono text-slate-100">
            {model.durationHours === null ? "-" : `${formatNumber(model.durationHours, 2)} h`}
          </dd>
        </div>
      </dl>

      <div className="mt-2 text-[11px] text-slate-500">
        {formatNumber(model.lengthM, 2)} x {formatNumber(model.widthM, 2)} x{" "}
        {formatNumber(model.heightM, 2)} m · {model.weightT ?? "-"} t ·{" "}
        {model.energyDensityMWhPerM2 ?? "-"} MWh/m²
      </div>

      {model.warnings.length ? (
        <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
          {model.warnings[0]}
        </div>
      ) : null}

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <button
          type="button"
          onClick={() => onDetails(model)}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-[11px] text-slate-100 hover:border-slate-500"
        >
          <Info className="h-3.5 w-3.5" />
          {isEs ? "Ficha" : "Details"}
        </button>
        <button
          type="button"
          onClick={() => onInsert(bessEquipmentSpecId(model.id))}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-100 hover:border-emerald-300"
        >
          <MapPinPlus className="h-3.5 w-3.5" />
          {isEs ? "Mapa" : "Map"}
        </button>
        <button
          type="button"
          onClick={() => onCompare(model.id)}
          className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-[11px] ${
            isCompared
              ? "border-cyan-400 bg-cyan-400/10 text-cyan-100"
              : "border-slate-700 text-slate-100 hover:border-slate-500"
          }`}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {isEs ? "Comp." : "Comp."}
        </button>
      </div>
    </article>
  );
}
