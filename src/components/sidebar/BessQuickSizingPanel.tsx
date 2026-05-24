"use client";

import { useMemo, useState } from "react";
import { Calculator, Grid3X3, Plus } from "lucide-react";
import { bessModels } from "@/data/bessModels";
import { useProjectStore } from "@/store/projectStore";
import { useRegulatoryStore } from "@/store/regulatoryStore";
import { useUiStore } from "@/store/uiStore";
import { getRegulatoryProfile } from "@/rules/bessRegulatoryProfiles";
import { calculateQuickSizing } from "@/lib/bessCalculations";
import { computeArchitectureSizing } from "@/lib/sizing/architectureSizing";
import {
  formatAreaM2,
  formatApparentPowerMva,
  formatEnergyMWh,
  formatLength,
  formatMassTonnes,
  formatNumber,
  formatPowerMW,
  formatPercentage,
} from "@/lib/units/formatUnits";
import { Badge } from "@/components/ui/Badge";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { BessSizingMode } from "@/types/bess";

export function BessQuickSizingPanel() {
  const [targetEnergyMWh, setTargetEnergyMWh] = useState(100);
  const [targetPowerMW, setTargetPowerMW] = useState(25);
  const [availableAreaHa, setAvailableAreaHa] = useState(1.5);
  const [modelId, setModelId] = useState("sungrow-powertitan-st6900ux-4h");
  const [mode, setMode] = useState<BessSizingMode>("compact");
  const activeProfileId = useRegulatoryStore((s) => s.activeProfileId);
  const insertBessArray = useProjectStore((s) => s.insertBessArray);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";
  const profile = getRegulatoryProfile(activeProfileId);
  const separationM = profile.rules.bessToBess_m;

  const result = useMemo(
    () =>
      calculateQuickSizing(
        {
          targetEnergyMWh,
          targetPowerMW,
          availableAreaM2: availableAreaHa > 0 ? availableAreaHa * 10000 : null,
          modelId,
          separationM,
          mode,
        },
        bessModels
      ),
    [availableAreaHa, mode, modelId, separationM, targetEnergyMWh, targetPowerMW]
  );

  const architectureResult = useMemo(
    () =>
      computeArchitectureSizing({
        targetPowerMW,
        targetUsableEnergyMWh: targetEnergyMWh,
      }),
    [targetEnergyMWh, targetPowerMW]
  );

  return (
    <CollapsibleSection
      icon={Calculator}
      title={isEs ? "Dimensionamiento rapido" : "Quick sizing"}
      description={
        isEs
          ? "Calcula unidades, sobredimensionamiento, area preliminar y peso usando el modelo seleccionado."
          : "Calculates units, oversizing, preliminary area and weight from the selected model."
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
        <label className="text-[11px] text-slate-500">
          MWh
          <input
            type="number"
            min={1}
            value={targetEnergyMWh}
            onChange={(event) => setTargetEnergyMWh(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100"
          />
        </label>
        <label className="text-[11px] text-slate-500">
          MW
          <input
            type="number"
            min={1}
            value={targetPowerMW}
            onChange={(event) => setTargetPowerMW(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100"
          />
        </label>
        <label className="text-[11px] text-slate-500">
          {isEs ? "Area ha" : "Area ha"}
          <input
            type="number"
            min={0}
            step={0.1}
            value={availableAreaHa}
            onChange={(event) => setAvailableAreaHa(Number(event.target.value))}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-xs text-slate-100"
          />
        </label>
        <label className="text-[11px] text-slate-500">
          {isEs ? "Modo" : "Mode"}
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as BessSizingMode)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            <option value="compact">{isEs ? "Compacto" : "Compact"}</option>
            <option value="regular">{isEs ? "Regular" : "Regular"}</option>
            <option value="wide_aisles">{isEs ? "Pasillos anchos" : "Wide aisles"}</option>
            <option value="maintenance_priority">{isEs ? "Mantenimiento" : "Maintenance"}</option>
          </select>
        </label>
      </div>

      <label className="mt-2 block text-[11px] text-slate-500">
        {isEs ? "Modelo preferido" : "Preferred model"}
        <select
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
        >
          {bessModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.manufacturer} - {model.product}
            </option>
          ))}
        </select>
      </label>

      {result ? (
        <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-100">
            <Grid3X3 className="h-4 w-4 text-cyan-300" />
            {result.rows} x {result.columns} · {result.requiredUnits}{" "}
            {isEs ? "unidades" : "units"}
          </div>
          <dl className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <dt className="text-slate-500">MWh</dt>
              <dd className="font-mono text-slate-100">
                {formatEnergyMWh(result.installedEnergyMWh, {
                  digits: 2,
                  locale,
                })}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">MW</dt>
              <dd className="font-mono text-slate-100">
                {result.installedPowerMW === null
                  ? "-"
                  : formatPowerMW(result.installedPowerMW, {
                      digits: 2,
                      locale,
                    })}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{isEs ? "Area layout" : "Layout area"}</dt>
              <dd className="font-mono text-slate-100">
                {formatAreaM2(result.layoutAreaM2, { digits: 1, locale })}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{isEs ? "Peso" : "Weight"}</dt>
              <dd className="font-mono text-slate-100">
                {result.totalWeightT === null
                  ? "-"
                  : formatMassTonnes(result.totalWeightT * 1000, {
                      digits: 1,
                      locale,
                    })}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-[10px] text-slate-500">
            {isEs ? "Separacion activa" : "Active spacing"}:{" "}
            {formatLength(separationM, { digits: 1, locale })} ·{" "}
            {isEs ? "Sobredim. energia" : "Energy oversize"}{" "}
            {formatPercentage(result.energyOversizePercent, {
              digits: 1,
              locale,
            })}
          </p>

          <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/60 p-2.5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-medium text-slate-200">
                {isEs ? "Arquitectura MW/MWh" : "MW/MWh architecture"}
              </p>
              <Badge variant="certified" className="normal-case tracking-normal">
                DOC-1129 + datasheets
              </Badge>
            </div>
            <dl className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <dt className="text-slate-500">{isEs ? "Bruta" : "Gross"}</dt>
                <dd className="font-mono text-slate-100">
                  {formatEnergyMWh(architectureResult.grossEnergyMWh, {
                    digits: 1,
                    locale,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{isEs ? "Usable" : "Usable"}</dt>
                <dd className="font-mono text-slate-100">
                  {formatEnergyMWh(architectureResult.usableEnergyMWh, {
                    digits: 1,
                    locale,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">
                  {isEs ? "Comercial" : "Commercial"}
                </dt>
                <dd className="font-mono text-slate-100">
                  {architectureResult.commercialEnergyMWh === null
                    ? "-"
                    : formatEnergyMWh(architectureResult.commercialEnergyMWh, {
                        digits: 1,
                        locale,
                      })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">BESS</dt>
                <dd className="font-mono text-slate-100">
                  {architectureResult.containers}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">PCS/Trafo</dt>
                <dd className="font-mono text-slate-100">
                  {architectureResult.stations}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Feeders</dt>
                <dd className="font-mono text-slate-100">
                  {architectureResult.feeders}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{isEs ? "Pot. inst." : "Inst. power"}</dt>
                <dd className="font-mono text-slate-100">
                  {formatApparentPowerMva(architectureResult.installedPowerMVA, {
                    digits: 1,
                    locale,
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{isEs ? "Duracion" : "Duration"}</dt>
                <dd className="font-mono text-slate-100">
                  {Number.isFinite(architectureResult.durationHoursFromUsable)
                    ? `${formatNumber(
                        architectureResult.durationHoursFromUsable,
                        2,
                        locale
                      )} h`
                    : "-"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">{isEs ? "Factor" : "Factor"}</dt>
                <dd className="font-mono text-slate-100">
                  {formatPercentage(architectureResult.resolved.usableFactor * 100, {
                    digits: 1,
                    locale,
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[10px] leading-snug text-slate-500">
              {isEs
                ? "Sizing preliminar basado en ST2752UX y SC5000UD-MV; no reemplaza validacion electrica de detalle."
                : "Preliminary sizing based on ST2752UX and SC5000UD-MV; not a detailed electrical validation."}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              insertBessArray({
                modelId: result.model.id,
                quantity: result.requiredUnits,
                rows: result.rows,
                columns: result.columns,
                separationM,
                orientationDeg: 0,
              })
            }
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-100 hover:border-emerald-300"
          >
            <Plus className="h-4 w-4" />
            {isEs ? "Insertar arreglo en mapa" : "Insert array on map"}
          </button>
          {result.warnings.slice(0, 3).map((warning) => (
            <p key={warning} className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
