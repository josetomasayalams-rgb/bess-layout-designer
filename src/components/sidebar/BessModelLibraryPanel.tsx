"use client";

import { useMemo, useState } from "react";
import { BatteryCharging, Search } from "lucide-react";
import { bessModels } from "@/data/bessModels";
import { useProjectStore } from "@/store/projectStore";
import { useUiStore } from "@/store/uiStore";
import { BessModelCard } from "@/components/sidebar/BessModelCard";
import { BessModelDetails } from "@/components/sidebar/BessModelDetails";
import { BessModelComparator } from "@/components/sidebar/BessModelComparator";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import type { BessModel } from "@/types/bess";

type SortKey = "energy" | "power" | "mwh_m2" | "weight" | "area";

export function BessModelLibraryPanel() {
  const [query, setQuery] = useState("");
  const [manufacturer, setManufacturer] = useState("all");
  const [chemistry, setChemistry] = useState("all");
  const [format, setFormat] = useState("all");
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("mwh_m2");
  const [details, setDetails] = useState<BessModel | null>(null);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const pendingId = useProjectStore((s) => s.pendingPlacementSpecId);
  const setPlacementSpec = useProjectStore((s) => s.setPlacementSpec);
  const locale = useUiStore((s) => s.locale);
  const isEs = locale === "es";

  const manufacturers = useMemo(
    () => Array.from(new Set(bessModels.map((model) => model.manufacturer))).sort(),
    []
  );

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sorted = bessModels.filter((model) => {
      const matchesQuery =
        !normalizedQuery ||
        `${model.manufacturer} ${model.product}`.toLowerCase().includes(normalizedQuery);
      const matchesManufacturer =
        manufacturer === "all" || model.manufacturer === manufacturer;
      const matchesChemistry =
        chemistry === "all" || model.chemistry?.toLowerCase().includes(chemistry);
      const matchesFormat = format === "all" || model.containerFormat === format;
      const matchesConfidence =
        !confirmedOnly ||
        model.dataConfidence === "confirmed" ||
        model.dataConfidence === "calculated";
      return (
        matchesQuery &&
        matchesManufacturer &&
        matchesChemistry &&
        matchesFormat &&
        matchesConfidence
      );
    });

    return sorted.sort((a, b) => {
      const value = (model: BessModel) => {
        if (sortKey === "energy") return model.energyMWh ?? -1;
        if (sortKey === "power") return model.powerMW ?? -1;
        if (sortKey === "weight") return model.weightPerMWh ? -model.weightPerMWh : -999;
        if (sortKey === "area") return model.areaPerMWh ? -model.areaPerMWh : -999;
        return model.energyDensityMWhPerM2 ?? -1;
      };
      return value(b) - value(a);
    });
  }, [chemistry, confirmedOnly, format, manufacturer, query, sortKey]);

  const comparedModels = comparedIds
    .map((id) => bessModels.find((model) => model.id === id))
    .filter((model): model is BessModel => Boolean(model));

  const toggleCompare = (modelId: string) => {
    setComparedIds((current) => {
      if (current.includes(modelId)) return current.filter((id) => id !== modelId);
      return [...current.slice(-3), modelId];
    });
  };

  return (
    <CollapsibleSection
      icon={BatteryCharging}
      iconColor="text-emerald-300"
      title={isEs ? "Biblioteca BESS" : "BESS library"}
      description={
        isEs
          ? "Modelos reales con dimensiones, energia, potencia, peso y densidades."
          : "Real models with dimensions, energy, power, weight and densities."
      }
    >
      <div className="space-y-2">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isEs ? "Buscar modelo" : "Search model"}
            className="w-full rounded-md border border-slate-700 bg-slate-950 py-1.5 pl-7 pr-2 text-xs text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
          <select
            value={manufacturer}
            onChange={(event) => setManufacturer(event.target.value)}
            className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            <option value="all">{isEs ? "Fabricantes" : "Manufacturers"}</option>
            {manufacturers.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={chemistry}
            onChange={(event) => setChemistry(event.target.value)}
            className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            <option value="all">{isEs ? "Quimica" : "Chemistry"}</option>
            <option value="lfp">LFP</option>
            <option value="nmc">NMC</option>
            <option value="lithium-ion">Lithium-ion</option>
          </select>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value)}
            className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            <option value="all">{isEs ? "Formato" : "Format"}</option>
            <option value="20ft">{isEs ? "Clase 6,06 m" : "6.06 m class"}</option>
            <option value="40ft">{isEs ? "Clase 12,19 m" : "12.19 m class"}</option>
            <option value="custom">Custom</option>
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="min-w-0 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
          >
            <option value="mwh_m2">MWh/m²</option>
            <option value="energy">MWh</option>
            <option value="power">MW</option>
            <option value="weight">t/MWh</option>
            <option value="area">m²/MWh</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <input
            type="checkbox"
            checked={confirmedOnly}
            onChange={(event) => setConfirmedOnly(event.target.checked)}
            className="h-3.5 w-3.5 accent-cyan-400"
          />
          {isEs ? "Solo datos confirmados/calculados" : "Confirmed/calculated data only"}
        </label>
      </div>

      {details ? (
        <div className="mt-3">
          <BessModelDetails model={details} locale={locale} onClose={() => setDetails(null)} />
        </div>
      ) : null}

      <div className="mt-3 max-h-[560px] space-y-2 overflow-y-auto pr-1">
        {filtered.map((model) => (
          <BessModelCard
            key={model.id}
            model={model}
            locale={locale}
            isActive={pendingId === `bess-${model.id}`}
            isCompared={comparedIds.includes(model.id)}
            onDetails={setDetails}
            onInsert={(specId) => setPlacementSpec(pendingId === specId ? null : specId)}
            onCompare={toggleCompare}
          />
        ))}
      </div>

      <div className="mt-3">
        <BessModelComparator models={comparedModels} locale={locale} />
      </div>
    </CollapsibleSection>
  );
}
